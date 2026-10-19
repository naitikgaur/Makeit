# MakeEase production PostgreSQL schema

Status: design/reference DDL. This file is intentionally non-runtime. It does not change the local adapter, add a dependency, or create a database.

## 1. Scope and design decisions

This schema is for the production service described by `API-CONTRACT.md`. It replaces the local JSON store with PostgreSQL and is designed for PostgreSQL 15 or newer.

The main invariants are:

- An organization is the tenant boundary. Every resolved organization-owned row carries a non-null `organization_id`; the webhook-ingress exception is documented below because provider events can arrive before tenant resolution.
- Tenant-owned foreign keys include `organization_id` as well as the entity ID. A UUID alone is not sufficient to cross-reference another tenant.
- PostgreSQL row-level security (RLS) is enabled and forced on tenant-owned tables. The application role must not own the tables and must not have `BYPASSRLS`.
- The request transaction sets the tenant and user context with `SET LOCAL`; application code never trusts an `organization_id` supplied by a browser.
- Secret material is not stored in PostgreSQL. A secret reference contains an envelope-encrypted locator for a KMS/Vault item, plus non-sensitive metadata and a key version.
- Workflow definitions are immutable after publication. Editing a workflow creates a new version; a run always records the exact version used.
- Runs, credit reservations, consumption, releases, approvals, and webhook processing are idempotent and transactionally recorded.
- Credit and usage records are append-only facts. Summary counters are maintained under a row lock for fast reads and can be rebuilt from the ledger.
- Timestamps are `timestamptz` in UTC. Money is integer minor units (`amount_cents`), and credits/tokens are `bigint`.
- User-visible content may contain sensitive business data. Prompt bodies, provider responses, connector request bodies, and webhook payloads must be redacted or encrypted before being stored; this schema does not make arbitrary JSON safe.

The DDL assumes `pgcrypto` and `citext`. Semantic retrieval also assumes `pgvector` with a standardized 1,536-dimension embedding model. If pgvector is not provisioned, remove the `embedding` column and its index and use the full-text index only.

## 2. What exists in the local demo

| Existing artifact | Observed shape/behavior | Production destination |
| --- | --- | --- |
| `data/workspace.json` | One `demo-workspace` object containing name, `starter` plan, owner display name/role, usage totals, integration display state, workflow summary cards, approval cards, activity text, source summaries, and settings. | `organizations`, `users`, `organization_memberships`, `subscriptions`, `usage_periods`/`credit_ledger_entries`, `connections`, `workflows`/`workflow_versions`, `approvals`, `audit_events`, and `organizations.settings`. |
| `server.js` `JsonStore` | Reads and atomically rewrites one JSON file. `PUT` can replace the whole object and `PATCH` recursively merges arbitrary fields. There is no authenticated tenant context. | Transactional writes to normalized tables. Public writes must be validated command-by-command; no endpoint may merge arbitrary JSON into an organization row. |
| `server.js` legacy API | `GET/PATCH/PUT /api/workspace`, `/api/plans`, and a local health route. | The routes in `API-CONTRACT.md`, scoped by the authenticated session and RLS. |
| `API-CONTRACT.md` | Intended authenticated contract: users, workspace, workflows, queued runs, approvals, knowledge, billing sandbox/live paths, export, CSRF and idempotency. | The tables below preserve its IDs/statuses and snapshot fields while adding durable history and tenant constraints. |
| `lib/config.js` | Plan catalog (`starter`, `growth`, `business`, `enterprise`), templates, model identifiers, and credit rates. | `billing_plans`; workflow templates/model configuration can be seeded as global catalog data or held in a service configuration table. Provider API keys do not belong in this database. |
| `lib/auth.js` | Password hashes and short-lived session/CSRF token hashes are intended; the legacy adapter itself does not enforce them. | `users` and `sessions`. Store only password hashes and token hashes, never raw credentials. |
| `lib/executor.js` | Run statuses, bounded steps, model usage, approval gating, and sandbox/live mode are expected by the executor. | `workflow_runs`, `run_steps`, `ai_decisions`, `approvals`, `usage_events`, and the credit ledger. |

The repository currently contains both this legacy JSON adapter and the newer contract documentation. `lib/validation.js` also references a database module that is not present in the inspected tree. This schema therefore treats `API-CONTRACT.md` as the intended service contract, not as evidence that the current local server has already migrated.

## 3. Reference DDL

The following is a reference migration sequence. In a real deployment, put each logical section in an ordered migration and run it with a migration owner role. The application role should receive only the required table/sequence/function privileges after RLS is installed.

```sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
-- Provision pgvector in the PostgreSQL image/cluster before enabling the line below.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, app
AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = pg_catalog, app
AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = pg_catalog, app
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

-- -------------------------------------------------------------------------
-- Identity and tenants
-- -------------------------------------------------------------------------

CREATE TABLE app.users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             citext NOT NULL UNIQUE,
  display_name      text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 120),
  password_hash     text,
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'invited', 'suspended', 'deleted')),
  email_verified_at timestamptz,
  last_login_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at        timestamptz
);

CREATE TABLE app.organizations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text NOT NULL UNIQUE
                    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  name              text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  description       text NOT NULL DEFAULT '',
  goal              text NOT NULL DEFAULT '',
  timezone          text NOT NULL DEFAULT 'UTC',
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'deleting', 'deleted')),
  is_sandbox        boolean NOT NULL DEFAULT false,
  settings          jsonb NOT NULL DEFAULT '{}'::jsonb
                    CHECK (jsonb_typeof(settings) = 'object'),
  created_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at        timestamptz
);

CREATE TABLE app.organization_memberships (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  role              text NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
  invited_by_user_id uuid,
  joined_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, user_id),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, invited_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

CREATE TABLE app.organization_invitations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  email             citext NOT NULL,
  role              text NOT NULL DEFAULT 'member'
                    CHECK (role IN ('admin', 'member', 'viewer')),
  token_hash        bytea NOT NULL CHECK (octet_length(token_hash) >= 32),
  invited_by_user_id uuid,
  expires_at        timestamptz NOT NULL,
  accepted_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, email) DEFERRABLE INITIALLY IMMEDIATE,
  FOREIGN KEY (organization_id, invited_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

CREATE TABLE app.sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL,
  user_id           uuid NOT NULL,
  token_hash        bytea NOT NULL UNIQUE CHECK (octet_length(token_hash) >= 32),
  csrf_hash         bytea NOT NULL CHECK (octet_length(csrf_hash) >= 32),
  created_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_seen_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at        timestamptz NOT NULL,
  revoked_at        timestamptz,
  user_agent        text,
  ip_address        inet,
  FOREIGN KEY (organization_id, user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- Plans, subscriptions, and secret references
-- -------------------------------------------------------------------------

CREATE TABLE app.billing_plans (
  code              text PRIMARY KEY,
  name              text NOT NULL,
  amount_cents      integer CHECK (amount_cents IS NULL OR amount_cents >= 0),
  currency          char(3) NOT NULL DEFAULT 'USD',
  billing_interval  text NOT NULL CHECK (billing_interval IN ('month', 'custom')),
  included_credits  bigint CHECK (included_credits IS NULL OR included_credits >= 0),
  stripe_price_id   text,
  active            boolean NOT NULL DEFAULT true,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb
                    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at        timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at        timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE app.subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  plan_code             text NOT NULL REFERENCES app.billing_plans(code) ON DELETE RESTRICT,
  billing_provider      text NOT NULL CHECK (billing_provider IN ('stripe', 'sandbox', 'manual')),
  provider_customer_id  text,
  provider_subscription_id text,
  status                text NOT NULL
                        CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'canceled', 'incomplete')),
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean NOT NULL DEFAULT false,
  canceled_at           timestamptz,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  CHECK (current_period_end IS NULL OR current_period_start IS NULL OR current_period_end > current_period_start)
);

CREATE TABLE app.secret_references (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  secret_kind           text NOT NULL CHECK (secret_kind IN ('oauth_bundle', 'api_key', 'credential_bundle', 'webhook_secret')),
  vault_provider        text NOT NULL CHECK (vault_provider IN ('aws_secrets_manager', 'gcp_secret_manager', 'azure_key_vault', 'hashicorp_vault', 'internal_kms')),
  encrypted_locator     bytea NOT NULL CHECK (octet_length(encrypted_locator) > 0),
  encryption_key_version text NOT NULL,
  locator_fingerprint   bytea,
  status                text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'revoked', 'expired', 'destroyed')),
  expires_at            timestamptz,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(metadata) = 'object'),
  created_by_user_id    uuid,
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at            timestamptz,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, created_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

CREATE TABLE app.connections (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  connector_key         text NOT NULL,
  display_name          text NOT NULL,
  account_external_id   text,
  auth_method            text NOT NULL CHECK (auth_method IN ('oauth2', 'api_key', 'service_account', 'none')),
  secret_ref_id         uuid,
  status                text NOT NULL DEFAULT 'not_configured'
                        CHECK (status IN ('not_configured', 'pending', 'active', 'needs_reauth', 'error', 'disabled')),
  scopes                text[] NOT NULL DEFAULT '{}'::text[],
  external_metadata     jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(external_metadata) = 'object'),
  last_connected_at     timestamptz,
  last_checked_at       timestamptz,
  last_error_code       text,
  last_error_message    text,
  created_by_user_id    uuid,
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at            timestamptz,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, secret_ref_id)
    REFERENCES app.secret_references(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

-- -------------------------------------------------------------------------
-- Workflows, immutable versions, and executable steps
-- -------------------------------------------------------------------------

CREATE TABLE app.workflows (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  name                  text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  description           text NOT NULL DEFAULT '',
  status                text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  active_version_id     uuid,
  active_version_workflow_id uuid GENERATED ALWAYS AS (id) STORED,
  created_by_user_id    uuid,
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  archived_at           timestamptz,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, created_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

CREATE TABLE app.workflow_versions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  workflow_id           uuid NOT NULL,
  version_number        integer NOT NULL CHECK (version_number > 0),
  status                text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'retired')),
  template_id           text,
  model_id              text NOT NULL,
  budget_credits        bigint NOT NULL CHECK (budget_credits > 0),
  requires_approval     boolean NOT NULL DEFAULT true,
  definition            jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(definition) = 'object'),
  created_by_user_id    uuid,
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_at          timestamptz,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, workflow_id, id),
  UNIQUE (organization_id, workflow_id, version_number),
  FOREIGN KEY (organization_id, workflow_id)
    REFERENCES app.workflows(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, created_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

ALTER TABLE app.workflows
  ADD CONSTRAINT workflows_active_version_fk
  FOREIGN KEY (organization_id, active_version_workflow_id, active_version_id)
  REFERENCES app.workflow_versions(organization_id, workflow_id, id)
  ON DELETE RESTRICT;

CREATE TABLE app.workflow_version_steps (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  workflow_version_id   uuid NOT NULL,
  step_key              text NOT NULL CHECK (step_key ~ '^[A-Za-z0-9._:-]{1,120}$'),
  position              integer NOT NULL CHECK (position >= 0),
  name                  text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  kind                  text NOT NULL CHECK (kind IN ('model', 'knowledge_search', 'connector_action', 'approval', 'condition', 'transform', 'wait')),
  connector_key         text,
  connection_id         uuid,
  config                jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(config) = 'object'),
  timeout_seconds       integer NOT NULL DEFAULT 120 CHECK (timeout_seconds BETWEEN 1 AND 86400),
  max_attempts          integer NOT NULL DEFAULT 1 CHECK (max_attempts BETWEEN 1 AND 10),
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, workflow_version_id, id),
  UNIQUE (organization_id, workflow_version_id, step_key),
  UNIQUE (organization_id, workflow_version_id, position),
  FOREIGN KEY (organization_id, workflow_version_id)
    REFERENCES app.workflow_versions(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, connection_id)
    REFERENCES app.connections(organization_id, id)
    ON DELETE RESTRICT
);

-- -------------------------------------------------------------------------
-- Runs, step attempts, approvals, and AI decisions
-- -------------------------------------------------------------------------

CREATE TABLE app.workflow_runs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  workflow_id           uuid NOT NULL,
  workflow_version_id   uuid NOT NULL,
  requested_by_user_id  uuid,
  idempotency_key       text NOT NULL CHECK (length(idempotency_key) BETWEEN 4 AND 128),
  status                text NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued', 'running', 'awaiting_approval', 'completed', 'rejected', 'failed', 'cancelled')),
  mode                  text NOT NULL CHECK (mode IN ('sandbox', 'live')),
  model_id              text NOT NULL,
  provider_key          text,
  input_text            text,
  input_json            jsonb,
  output_text           text,
  output_json           jsonb,
  reserved_credits      bigint NOT NULL DEFAULT 0 CHECK (reserved_credits >= 0),
  consumed_credits      bigint NOT NULL DEFAULT 0 CHECK (consumed_credits >= 0),
  error_code            text,
  error_message         text,
  trace_id              uuid,
  queued_at             timestamptz NOT NULL DEFAULT clock_timestamp(),
  started_at             timestamptz,
  completed_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at             timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, id, workflow_version_id),
  UNIQUE (organization_id, idempotency_key),
  CHECK (input_text IS NOT NULL OR input_json IS NOT NULL),
  CHECK (consumed_credits <= reserved_credits),
  FOREIGN KEY (organization_id, workflow_id, workflow_version_id)
    REFERENCES app.workflow_versions(organization_id, workflow_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, requested_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

CREATE TABLE app.run_steps (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  run_id                uuid NOT NULL,
  workflow_version_id   uuid NOT NULL,
  workflow_step_id      uuid,
  step_key              text NOT NULL,
  position              integer NOT NULL CHECK (position >= 0),
  attempt_number        integer NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  name                  text NOT NULL,
  status                text NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued', 'running', 'awaiting_approval', 'completed', 'skipped', 'failed')),
  input_json            jsonb,
  output_json           jsonb,
  detail                text,
  credits               bigint NOT NULL DEFAULT 0 CHECK (credits >= 0),
  error_code            text,
  started_at            timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, run_id, step_key, attempt_number),
  UNIQUE (organization_id, run_id, id),
  FOREIGN KEY (organization_id, run_id, workflow_version_id)
    REFERENCES app.workflow_runs(organization_id, id, workflow_version_id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, workflow_version_id, workflow_step_id)
    REFERENCES app.workflow_version_steps(organization_id, workflow_version_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE app.approvals (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  run_id                uuid NOT NULL,
  run_step_id           uuid,
  title                 text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 240),
  detail                text NOT NULL DEFAULT '',
  status                text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  requested_by_user_id  uuid,
  assigned_to_user_id   uuid,
  decided_by_user_id    uuid,
  requested_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at            timestamptz,
  decided_at            timestamptz,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(metadata) = 'object'),
  created_at             timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at             timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, run_id)
    REFERENCES app.workflow_runs(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, run_id, run_step_id)
    REFERENCES app.run_steps(organization_id, run_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, requested_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, assigned_to_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, decided_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

CREATE TABLE app.approval_decisions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  approval_id           uuid NOT NULL,
  decision              text NOT NULL CHECK (decision IN ('approve', 'reject')),
  decided_by_user_id    uuid NOT NULL,
  reason                text,
  idempotency_key       text,
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, approval_id),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, approval_id)
    REFERENCES app.approvals(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, decided_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

CREATE TABLE app.ai_decisions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  run_id                uuid NOT NULL,
  run_step_id           uuid,
  decision_type         text NOT NULL CHECK (decision_type IN ('classification', 'routing', 'draft', 'tool_selection', 'safety', 'evaluation', 'summary')),
  provider_key          text,
  model_id              text NOT NULL,
  prompt_version        text,
  request_hash          bytea,
  input_tokens          bigint CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens         bigint CHECK (output_tokens IS NULL OR output_tokens >= 0),
  credits               bigint NOT NULL DEFAULT 0 CHECK (credits >= 0),
  latency_ms             integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
  confidence             numeric(5,4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  grounded              boolean,
  safety_result         text,
  result                jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(result) = 'object'),
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, run_id)
    REFERENCES app.workflow_runs(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, run_id, run_step_id)
    REFERENCES app.run_steps(organization_id, run_id, id)
    ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- Knowledge documents, immutable versions, chunks, and embeddings
-- -------------------------------------------------------------------------

CREATE TABLE app.knowledge_documents (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  title                 text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 400),
  source_type           text NOT NULL CHECK (source_type IN ('manual', 'connector', 'upload', 'import')),
  connection_id         uuid,
  external_id           text,
  mime_type             text,
  ingestion_status      text NOT NULL DEFAULT 'ready'
                        CHECK (ingestion_status IN ('pending', 'processing', 'ready', 'failed', 'deleted')),
  current_version_id    uuid,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(metadata) = 'object'),
  created_by_user_id    uuid,
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at            timestamptz,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, connection_id)
    REFERENCES app.connections(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

CREATE TABLE app.knowledge_document_versions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  document_id           uuid NOT NULL,
  version_number        integer NOT NULL CHECK (version_number > 0),
  content_text          text,
  blob_uri              text,
  content_sha256        bytea,
  token_count           bigint CHECK (token_count IS NULL OR token_count >= 0),
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, document_id, id),
  UNIQUE (organization_id, document_id, version_number),
  CHECK (content_text IS NOT NULL OR blob_uri IS NOT NULL),
  FOREIGN KEY (organization_id, document_id)
    REFERENCES app.knowledge_documents(organization_id, id)
    ON DELETE CASCADE
);

ALTER TABLE app.knowledge_documents
  ADD CONSTRAINT knowledge_documents_current_version_fk
  FOREIGN KEY (organization_id, id, current_version_id)
  REFERENCES app.knowledge_document_versions(organization_id, document_id, id)
  ON DELETE RESTRICT;

CREATE TABLE app.knowledge_chunks (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  document_id           uuid NOT NULL,
  document_version_id   uuid NOT NULL,
  ordinal               integer NOT NULL CHECK (ordinal >= 0),
  content               text NOT NULL CHECK (length(content) > 0),
  token_count           integer CHECK (token_count IS NULL OR token_count >= 0),
  embedding_model       text,
  embedding             vector(1536),
  search_vector         tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, content)) STORED,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, document_version_id, ordinal),
  FOREIGN KEY (organization_id, document_id)
    REFERENCES app.knowledge_documents(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, document_id, document_version_id)
    REFERENCES app.knowledge_document_versions(organization_id, document_id, id)
    ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- Connector actions and attempts
-- -------------------------------------------------------------------------

CREATE TABLE app.connector_actions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  connection_id         uuid NOT NULL,
  run_id                uuid NOT NULL,
  run_step_id           uuid,
  action_type           text NOT NULL,
  idempotency_key       text NOT NULL,
  status                text NOT NULL DEFAULT 'planned'
                        CHECK (status IN ('planned', 'awaiting_approval', 'queued', 'running', 'succeeded', 'failed', 'cancelled')),
  target_ref            text,
  request_hash          bytea,
  request_body_redacted jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(request_body_redacted) = 'object'),
  external_action_id    text,
  response_metadata     jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(response_metadata) = 'object'),
  attempt_count         integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at       timestamptz,
  error_code            text,
  error_message         text,
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at          timestamptz,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, run_id, id),
  UNIQUE (organization_id, idempotency_key),
  FOREIGN KEY (organization_id, connection_id)
    REFERENCES app.connections(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, run_id)
    REFERENCES app.workflow_runs(organization_id, id)
    ON DELETE CASCADE,
  FOREIGN KEY (organization_id, run_id, run_step_id)
    REFERENCES app.run_steps(organization_id, run_id, id)
    ON DELETE CASCADE
);

CREATE TABLE app.connector_action_attempts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  connector_action_id  uuid NOT NULL,
  attempt_number        integer NOT NULL CHECK (attempt_number > 0),
  status                text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'cancelled')),
  provider_status_code  integer,
  response_metadata     jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(response_metadata) = 'object'),
  error_code            text,
  error_message         text,
  started_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at          timestamptz,
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, connector_action_id, attempt_number),
  FOREIGN KEY (organization_id, connector_action_id)
    REFERENCES app.connector_actions(organization_id, id)
    ON DELETE CASCADE
);

-- -------------------------------------------------------------------------
-- Usage periods, immutable credit ledger, and provider usage facts
-- -------------------------------------------------------------------------

CREATE TABLE app.usage_periods (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  period_start          timestamptz NOT NULL,
  period_end            timestamptz NOT NULL,
  included_credits      bigint NOT NULL DEFAULT 0 CHECK (included_credits >= 0),
  topup_credits          bigint NOT NULL DEFAULT 0 CHECK (topup_credits >= 0),
  reserved_credits      bigint NOT NULL DEFAULT 0 CHECK (reserved_credits >= 0),
  consumed_credits      bigint NOT NULL DEFAULT 0 CHECK (consumed_credits >= 0),
  status                text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'closed', 'superseded')),
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, period_start),
  CHECK (period_end > period_start),
  CHECK (consumed_credits + reserved_credits <= included_credits + topup_credits)
);

CREATE TABLE app.usage_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  usage_period_id       uuid NOT NULL,
  run_id                uuid,
  ai_decision_id        uuid,
  connector_action_id   uuid,
  event_type            text NOT NULL CHECK (event_type IN ('model_usage', 'connector_call', 'embedding', 'reservation', 'release', 'adjustment')),
  provider_key          text,
  model_id              text,
  input_tokens          bigint CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens         bigint CHECK (output_tokens IS NULL OR output_tokens >= 0),
  credits               bigint NOT NULL DEFAULT 0 CHECK (credits >= 0),
  dimensions            jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(dimensions) = 'object'),
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, usage_period_id)
    REFERENCES app.usage_periods(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, run_id)
    REFERENCES app.workflow_runs(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, ai_decision_id)
    REFERENCES app.ai_decisions(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, connector_action_id)
    REFERENCES app.connector_actions(organization_id, id)
    ON DELETE RESTRICT
);

CREATE TABLE app.credit_ledger_entries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  usage_period_id       uuid NOT NULL,
  run_id                uuid,
  usage_event_id        uuid,
  entry_type            text NOT NULL CHECK (entry_type IN ('subscription_grant', 'topup', 'reservation', 'consumption', 'release', 'refund', 'adjustment')),
  available_delta       bigint NOT NULL DEFAULT 0,
  reserved_delta        bigint NOT NULL DEFAULT 0,
  consumed_delta        bigint NOT NULL DEFAULT 0,
  idempotency_key       text,
  description           text NOT NULL DEFAULT '',
  created_by_user_id    uuid,
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  CHECK (available_delta <> 0 OR reserved_delta <> 0 OR consumed_delta <> 0),
  FOREIGN KEY (organization_id, usage_period_id)
    REFERENCES app.usage_periods(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, run_id)
    REFERENCES app.workflow_runs(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, usage_event_id)
    REFERENCES app.usage_events(organization_id, id)
    ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

-- -------------------------------------------------------------------------
-- Audit, webhook deduplication, and retention controls
-- -------------------------------------------------------------------------

CREATE TABLE app.audit_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  actor_type            text NOT NULL CHECK (actor_type IN ('user', 'service', 'webhook', 'migration')),
  actor_user_id         uuid,
  event_type            text NOT NULL,
  entity_type           text,
  entity_key            text,
  request_id            uuid,
  ip_address            inet,
  user_agent            text,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(metadata) = 'object'),
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, id),
  CHECK ((actor_type = 'user' AND actor_user_id IS NOT NULL) OR actor_type <> 'user'),
  FOREIGN KEY (organization_id, actor_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

-- A webhook may arrive before its tenant is known. Unassigned rows are visible
-- only to the restricted webhook-ingress worker, never to an organization role.
CREATE TABLE app.webhook_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid REFERENCES app.organizations(id) ON DELETE SET NULL,
  provider               text NOT NULL,
  provider_account_ref   text NOT NULL,
  external_event_id     text NOT NULL,
  event_type             text NOT NULL,
  payload_hash           bytea NOT NULL CHECK (octet_length(payload_hash) >= 32),
  redacted_payload       jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(redacted_payload) = 'object'),
  status                text NOT NULL DEFAULT 'received'
                        CHECK (status IN ('received', 'processing', 'processed', 'failed', 'ignored')),
  attempt_count         integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  received_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
  processed_at          timestamptz,
  next_attempt_at       timestamptz,
  last_error_code       text,
  last_error_message    text,
  UNIQUE (provider, provider_account_ref, external_event_id)
);

CREATE TABLE app.retention_policies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  resource              text NOT NULL CHECK (resource IN ('runs', 'run_steps', 'ai_decisions', 'connector_actions', 'usage_events', 'audit_events', 'webhook_events', 'knowledge_documents', 'sessions', 'secret_references')),
  retention_days        integer NOT NULL CHECK (retention_days BETWEEN 1 AND 36500),
  hard_delete           boolean NOT NULL DEFAULT true,
  legal_hold            boolean NOT NULL DEFAULT false,
  updated_by_user_id    uuid,
  created_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (organization_id, resource),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, updated_by_user_id)
    REFERENCES app.organization_memberships(organization_id, user_id)
    ON DELETE RESTRICT
);

CREATE TABLE app.retention_runs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  resource              text NOT NULL,
  cutoff_at             timestamptz NOT NULL,
  status                text NOT NULL DEFAULT 'running'
                        CHECK (status IN ('running', 'completed', 'failed')),
  rows_affected         bigint NOT NULL DEFAULT 0 CHECK (rows_affected >= 0),
  started_at            timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at          timestamptz,
  error_message         text,
  UNIQUE (organization_id, id)
);

-- -------------------------------------------------------------------------
-- Updated-at triggers
-- -------------------------------------------------------------------------

CREATE TRIGGER users_touch_updated_at
  BEFORE UPDATE ON app.users FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER organizations_touch_updated_at
  BEFORE UPDATE ON app.organizations FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER memberships_touch_updated_at
  BEFORE UPDATE ON app.organization_memberships FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER plans_touch_updated_at
  BEFORE UPDATE ON app.billing_plans FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER subscriptions_touch_updated_at
  BEFORE UPDATE ON app.subscriptions FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER connections_touch_updated_at
  BEFORE UPDATE ON app.connections FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER workflows_touch_updated_at
  BEFORE UPDATE ON app.workflows FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER runs_touch_updated_at
  BEFORE UPDATE ON app.workflow_runs FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER approvals_touch_updated_at
  BEFORE UPDATE ON app.approvals FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER usage_periods_touch_updated_at
  BEFORE UPDATE ON app.usage_periods FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER connector_actions_touch_updated_at
  BEFORE UPDATE ON app.connector_actions FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER retention_policies_touch_updated_at
  BEFORE UPDATE ON app.retention_policies FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

COMMIT;
```

### DDL notes and integrity checks

1. `workflow_runs` references `(organization_id, workflow_id, workflow_version_id)` as one composite foreign key. This prevents a version from another workflow or tenant from being attached to a run.
2. `workflows.active_version_id` and `knowledge_documents.current_version_id` use the same composite-reference pattern. The application should also require the target version to be `published` before activating it.
3. `approvals` always belong to a run. The old JSON approval cards have no run IDs, so they cannot be silently promoted to production approvals; the migration plan below preserves them as historical audit records instead.
4. `knowledge_document_versions` keeps source history. `knowledge_chunks` must be replaced as a set when a new document version is indexed. Never mix chunks from two versions in retrieval.
5. `ai_decisions.result` is for bounded, redacted decision output and policy metadata. Do not use it as a place to persist hidden chain-of-thought or raw provider prompts.
6. `connector_actions.request_body_redacted` and `response_metadata` are intentionally named to make redaction part of the write contract. Raw authorization headers, OAuth tokens, and unredacted provider payloads must stay in the connector boundary or an encrypted store with a separate retention policy.
7. `webhook_events` is globally deduplicated by `(provider, provider_account_ref, external_event_id)`. Tenant resolution may happen after ingestion; an unresolved event must not be exposed through an organization API.

## 4. Indexes

These indexes support the API contract, worker queues, retention jobs, and tenant-scoped reads. Every tenant query should include `organization_id` so the leading index column remains selective.

```sql
-- Identity and sessions
CREATE INDEX memberships_user_idx
  ON app.organization_memberships (user_id, status, organization_id);
CREATE INDEX memberships_org_role_idx
  ON app.organization_memberships (organization_id, role, status);
CREATE INDEX invitations_pending_idx
  ON app.organization_invitations (organization_id, expires_at)
  WHERE accepted_at IS NULL;
CREATE INDEX sessions_expiry_idx
  ON app.sessions (expires_at)
  WHERE revoked_at IS NULL;
CREATE INDEX sessions_org_user_idx
  ON app.sessions (organization_id, user_id, expires_at)
  WHERE revoked_at IS NULL;

-- Billing, connections, and secrets
CREATE UNIQUE INDEX subscriptions_one_current_idx
  ON app.subscriptions (organization_id)
  WHERE status IN ('trialing', 'active', 'past_due', 'incomplete');
CREATE INDEX subscriptions_org_period_idx
  ON app.subscriptions (organization_id, current_period_end);
CREATE INDEX connections_org_status_idx
  ON app.connections (organization_id, status, connector_key)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX connections_external_account_idx
  ON app.connections (organization_id, connector_key, account_external_id)
  WHERE account_external_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX secret_references_expiry_idx
  ON app.secret_references (organization_id, expires_at)
  WHERE status = 'active' AND expires_at IS NOT NULL;

-- Workflows, versions, and workers
CREATE INDEX workflows_org_status_idx
  ON app.workflows (organization_id, status, updated_at DESC)
  WHERE archived_at IS NULL;
CREATE INDEX workflow_versions_published_idx
  ON app.workflow_versions (organization_id, workflow_id, published_at DESC)
  WHERE status = 'published';
CREATE INDEX workflow_steps_connection_idx
  ON app.workflow_version_steps (organization_id, connection_id)
  WHERE connection_id IS NOT NULL;
CREATE INDEX runs_org_created_idx
  ON app.workflow_runs (organization_id, created_at DESC);
CREATE INDEX runs_queue_idx
  ON app.workflow_runs (organization_id, queued_at)
  WHERE status IN ('queued', 'running');
CREATE INDEX runs_workflow_status_idx
  ON app.workflow_runs (organization_id, workflow_id, status, created_at DESC);
CREATE INDEX run_steps_run_position_idx
  ON app.run_steps (organization_id, run_id, position, attempt_number);

-- Approvals and AI decisions
CREATE INDEX approvals_pending_idx
  ON app.approvals (organization_id, requested_at)
  WHERE status = 'pending';
CREATE INDEX approvals_assignee_idx
  ON app.approvals (organization_id, assigned_to_user_id, status, requested_at DESC)
  WHERE status = 'pending';
CREATE INDEX ai_decisions_run_idx
  ON app.ai_decisions (organization_id, run_id, created_at);
CREATE INDEX ai_decisions_type_idx
  ON app.ai_decisions (organization_id, decision_type, created_at DESC);

-- Knowledge retrieval
CREATE INDEX knowledge_documents_org_status_idx
  ON app.knowledge_documents (organization_id, ingestion_status, updated_at DESC)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX knowledge_external_source_idx
  ON app.knowledge_documents (organization_id, connection_id, external_id)
  WHERE connection_id IS NOT NULL AND external_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX knowledge_chunks_lexical_idx
  ON app.knowledge_chunks USING gin (search_vector);
CREATE INDEX knowledge_chunks_tenant_idx
  ON app.knowledge_chunks (organization_id, document_version_id, ordinal);
-- Requires pgvector. Filter by organization_id in the query as well.
CREATE INDEX knowledge_chunks_embedding_idx
  ON app.knowledge_chunks USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- Connector actions and credit accounting
CREATE INDEX connector_actions_queue_idx
  ON app.connector_actions (organization_id, next_attempt_at, created_at)
  WHERE status IN ('queued', 'running');
CREATE INDEX connector_actions_run_idx
  ON app.connector_actions (organization_id, run_id, created_at);
CREATE INDEX connector_attempts_action_idx
  ON app.connector_action_attempts (organization_id, connector_action_id, attempt_number);
CREATE UNIQUE INDEX ledger_idempotency_idx
  ON app.credit_ledger_entries (organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX ledger_period_idx
  ON app.credit_ledger_entries (organization_id, usage_period_id, created_at);
CREATE INDEX usage_events_period_idx
  ON app.usage_events (organization_id, usage_period_id, created_at);
CREATE INDEX usage_events_run_idx
  ON app.usage_events (organization_id, run_id, created_at)
  WHERE run_id IS NOT NULL;

-- Audit, webhook deduplication, and retention
CREATE INDEX audit_events_org_time_idx
  ON app.audit_events (organization_id, created_at DESC);
CREATE INDEX audit_events_entity_idx
  ON app.audit_events (organization_id, entity_type, entity_key, created_at DESC);
CREATE INDEX webhook_events_processing_idx
  ON app.webhook_events (status, next_attempt_at, received_at)
  WHERE status IN ('received', 'processing', 'failed');
CREATE INDEX webhook_events_org_time_idx
  ON app.webhook_events (organization_id, received_at DESC)
  WHERE organization_id IS NOT NULL;
CREATE INDEX retention_runs_org_resource_idx
  ON app.retention_runs (organization_id, resource, started_at DESC);
```

### High-volume table strategy

`audit_events`, `usage_events`, `webhook_events`, and optionally `ai_decisions` should be range-partitioned by month once volume justifies it. Partition keys must include the timestamp used by retention jobs, and each partition receives the same RLS policy and tenant-leading indexes. Create future partitions ahead of time plus a monitored default partition; do not allow an unbounded table or an unbounded default partition to become the long-term store.

For a large installation, use a BRIN index on the timestamp in addition to the tenant B-tree, and detach/drop expired partitions only after legal-hold checks. Partitioning is an operational migration and is not required for the first PostgreSQL deployment.

## 5. Tenant isolation and database roles

### Request context

After authenticating the session and checking the user’s membership, the API begins a transaction and sets context locally:

```sql
BEGIN;
SET LOCAL app.organization_id = '00000000-0000-0000-0000-000000000000';
SET LOCAL app.user_id = '00000000-0000-0000-0000-000000000000';
-- All tenant reads/writes occur here.
COMMIT;
```

The actual values are supplied by trusted server code, never copied from a request body. Because the settings are `LOCAL`, a pooled connection cannot retain one tenant’s context for the next request.

### RLS policy installation

Run this after all tenant tables are created. The table owner/migration role must be separate from the API role. The `FORCE` clause also protects against accidental table-owner bypass when maintenance uses the same connection.

```sql
-- Organization has the tenant ID in its primary key rather than a separate
-- organization_id column.
ALTER TABLE app.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY organizations_tenant_isolation ON app.organizations
  USING (id = app.current_organization_id())
  WITH CHECK (id = app.current_organization_id());

ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.users FORCE ROW LEVEL SECURITY;
CREATE POLICY users_current_tenant ON app.users
  USING (
    id = app.current_user_id()
    OR EXISTS (
      SELECT 1
      FROM app.organization_memberships membership
      WHERE membership.organization_id = app.current_organization_id()
        AND membership.user_id = users.id
        AND membership.status IN ('invited', 'active', 'suspended')
    )
  )
  WITH CHECK (id = app.current_user_id());

ALTER TABLE app.billing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_plans_read ON app.billing_plans
  FOR SELECT USING (active = true);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'organization_memberships', 'organization_invitations', 'sessions',
    'subscriptions', 'secret_references', 'connections', 'workflows',
    'workflow_versions', 'workflow_version_steps', 'workflow_runs',
    'run_steps', 'approvals', 'approval_decisions', 'ai_decisions',
    'knowledge_documents', 'knowledge_document_versions', 'knowledge_chunks',
    'connector_actions', 'connector_action_attempts', 'usage_periods',
    'usage_events', 'credit_ledger_entries', 'audit_events',
    'retention_policies', 'retention_runs'
  ] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON app.%I USING (organization_id = app.current_organization_id()) WITH CHECK (organization_id = app.current_organization_id())', table_name);
  END LOOP;
END;
$$;

ALTER TABLE app.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.webhook_events FORCE ROW LEVEL SECURITY;
CREATE POLICY webhook_tenant_isolation ON app.webhook_events
  USING (organization_id IS NOT NULL AND organization_id = app.current_organization_id())
  WITH CHECK (organization_id IS NOT NULL AND organization_id = app.current_organization_id());
```

The dynamic block is a migration convenience, not permission management. Review generated policies in each environment. In particular:

- Registration, login, session revocation, webhook ingestion, and retention workers should use narrow `SECURITY DEFINER` functions or separately scoped service roles. Do not grant the application role `BYPASSRLS`.
- A webhook-ingress function may insert an unassigned `webhook_events` row and resolve it to an organization; organization users cannot read rows while `organization_id` is null.
- Memberships are removed by status (`removed`) rather than physically deleted while actor/history rows reference them. The composite actor foreign keys use `RESTRICT` so a tenant cannot lose referential history accidentally; a controlled anonymization procedure handles a genuine erasure request.
- A worker must load a run under its tenant context before executing it, and must re-check the run/connection/workflow status in the same transaction that claims work.
- The RLS policy is defense in depth. Authorization still checks membership role (`owner`, `admin`, `member`, `viewer`) and operation-specific permissions.
- Composite foreign keys prevent an ID from one tenant being attached to a row in another tenant even if a future query accidentally omits a tenant predicate.
- Exports and administrative support tooling must run through an explicitly audited, short-lived support context. Never expose a global unscoped export endpoint.

## 6. Transaction recipes

### Queue a run and reserve credits atomically

The run endpoint must not create a queued run first and reserve later. In one transaction:

1. Set RLS context and lock the selected open `usage_periods` row with `SELECT ... FOR UPDATE`.
2. Lock the active workflow/version and confirm the version is published, the workflow is active, and the requested budget is within policy.
3. Check `included_credits + topup_credits - reserved_credits - consumed_credits >= budget`.
4. Insert `workflow_runs` with the request idempotency key. If `(organization_id, idempotency_key)` already exists, return the existing run without another reservation.
5. Insert a `credit_ledger_entries` reservation with `available_delta = -budget` and `reserved_delta = budget`.
6. Increment `usage_periods.reserved_credits` and commit. Enqueue only after commit (an outbox table or a queue publisher transaction is preferable when a durable worker is introduced).

The current contract returns `202` for a queued run. The API response must be derived from the committed row, not from an in-memory executor object.

### Complete, reject, or fail a run

Lock the run and usage period. For actual usage `actual` and reserved amount `reserved`:

- Consumption: append a ledger row with `reserved_delta = -actual`, `consumed_delta = actual`; increment `consumed_credits` and decrement `reserved_credits` by `actual`.
- Release: append a second ledger row with `reserved_delta = -(reserved - actual)`, `available_delta = reserved - actual`; decrement `reserved_credits` by the remainder.
- Rejection/failure before model usage: release the full reservation and consume zero.

Update the run and insert `usage_events`/`ai_decisions` in the same transaction. Approval decisions use `SELECT ... FOR UPDATE` on `approvals` and a unique `approval_decisions(organization_id, approval_id)` constraint, so a retry cannot charge twice or execute an approval twice.

### Process connector actions safely

Create one `connector_actions` row per intended external effect before calling a provider. Require approval before moving a row to `queued` when the workflow version requires it. Claim with `FOR UPDATE SKIP LOCKED`, increment `attempt_count`, and write one `connector_action_attempts` row per provider call. The deterministic action idempotency key must be sent to the provider when the provider supports it. A timeout or ambiguous response is `failed`/retryable until reconciled; never blindly repeat an unknown side effect.

## 7. Retention, deletion, and audit rules

Each organization receives default `retention_policies` at creation. Suggested starting defaults (confirm contract and legal requirements before enabling deletion):

| Resource | Suggested default | Deletion behavior |
| --- | ---: | --- |
| `workflow_runs`, `run_steps` | 365 days | Hard-delete only after dependent decisions/actions are retained or redacted. |
| `ai_decisions`, `usage_events` | 365 days | Keep token/credit facts; redact content fields first if policy permits. |
| `connector_actions` | 365 days | Keep action status/idempotency metadata; remove request/response detail. |
| `audit_events` | 730 days | Append-only; legal hold overrides deletion. |
| `webhook_events` | 90 days | Keep hashes/status for dedupe during the window, then delete payload metadata. |
| `knowledge_documents` | Until deleted + 30 days | Soft-delete first, delete versions/chunks/blob objects after the grace period. |
| `sessions` | 30 days after expiry | Revoke immediately on logout/password reset, then purge. |
| `secret_references` | Until revoked + 30 days | Destroy the vault/KMS locator and metadata after connection revocation and any required legal hold. |

Retention workers must:

1. Read policy under the organization context and skip `legal_hold` resources.
2. Record a `retention_runs` row and process bounded batches by primary key/time range.
3. Delete or redact children in foreign-key order, then delete object-storage blobs only after the database commit marks the version deleted.
4. Emit an audit event for policy changes and legal holds, not for each row deleted.
5. Keep webhook payloads redacted; raw provider payloads and signatures are not a long-term application record.

User deletion should anonymize or detach actor identity where audit retention requires the event, while organization deletion should follow a documented export/grace period and then cascade or purge all tenant-owned rows and external secret references.

## 8. Migration from the local JSON demo

This is a one-way, idempotent import into a dedicated sandbox organization unless a real customer has explicitly supplied authoritative data. The JSON file contains presentation fixtures and no OAuth tokens, provider credentials, run inputs, or reliable billing receipts.

### Phase A: freeze and stage

1. Stop writes to the local demo and copy `data/workspace.json` to immutable migration storage. Compute a file hash and record it in the migration log.
2. Parse and validate the snapshot outside the application runtime. Do not use the legacy `PUT`/`PATCH` endpoint as an importer.
3. Generate stable mapping tables in the migration job (`legacy_id -> UUID`) and make every insert idempotent by a deterministic migration key. Do not add those staging tables to the runtime schema unless the migration process needs durable restart state.
4. Decide whether the snapshot is a product fixture or real customer data. The observed `Northstar Ventures` values (`8750` used credits, workflow run counts, integration connected text, and activity timestamps) look like demo content and must not become genuine production analytics.

### Phase B: map authoritative fields

Run each organization import in one transaction with the future tenant context disabled only for the migration role:

1. Insert one `users` row for the owner after collecting a real normalized email. The JSON contains only `Alex Kumar` and a role, so an email/password cannot be inferred. Create a password reset/invitation flow rather than inventing a credential.
2. Insert one `organizations` row with a new UUID and a slug derived from the name. Set `is_sandbox = true` for a demo import. Copy name, description/goal when present, timezone (default `UTC`), and settings (`approvalMode`, `smartRouting`, `weeklyBrief`, `darkMode`) into `organizations.settings` after schema validation.
3. Insert an `owner` membership. Do not infer additional members from UI text.
4. Seed the matching `billing_plans` catalog row and create a `sandbox` subscription only if the import is intentionally a sandbox. For real billing, import only verified provider customer/subscription IDs and webhook history.
5. Create one `usage_periods` row. If `used`/`limit` came from demo fixtures, record them as sandbox metadata or omit them; do not create a fake consumption ledger. For an authoritative source, create a subscription grant ledger entry and separate consumption entries whose sum is independently reconciled.
6. Convert integrations to `connections` with the connector key/name. A JSON `connected: true` flag is not proof of an OAuth grant, so set `status = 'needs_reauth'` (or `not_configured`) and leave `secret_ref_id` null. Only a completed OAuth/API-key migration may create a `secret_references` row, and the encrypted locator is written by the vault integration, never copied from JSON.
7. Convert each workflow card to a `workflows` row and create version 1 with the supported template/model/budget fields. Preserve `active`/`paused`/`draft` status. The JSON `runs` and `credits` are aggregate display fields, not run records; do not fabricate `workflow_runs`, `run_steps`, `ai_decisions`, or credit charges from those totals. If product history must be displayed, retain the aggregates in a clearly labeled `legacy_demo` audit event or migration metadata.
8. The old approval cards have `workflowId`, title/detail, and credits but no run ID, requester, or authoritative charge. Do not insert them into `approvals`; write redacted `audit_events` with `actor_type = 'migration'` and `entity_type = 'legacy_approval'`, or discard them when they are confirmed fixtures. New approvals must always reference a real run.
9. Convert `sources` only when the underlying source content is available. A summary such as `Gmail knowledge · 684 items` is not a document. Create a `knowledge_documents` row only for content that can be hashed, versioned, and indexed; otherwise preserve the summary as migration metadata and mark the connection for re-sync.
10. Convert activity cards to redacted `audit_events` only when their timestamps and actors are reliable. Relative labels such as `4 min ago` and `Yesterday` should not be turned into fabricated event times.

### Phase C: validate and cut over

1. Compare imported organization/membership/workflow/connection/document counts to the source after applying the rules above. Reconcile every imported credit ledger period to `available + reserved + consumed`.
2. Run cross-tenant tests with two organizations: each tenant can select only its own rows, a foreign workflow/version/connection composite FK is rejected, an unscoped query returns no rows under RLS, and a stale pooled connection has no prior tenant context.
3. Validate exports contain no `secret_references.encrypted_locator`, password hash, session hash, raw webhook payload, or unredacted provider data.
4. Start new writes against PostgreSQL, keep the JSON file read-only for rollback/reference, and remove the demo file from any static-serving path. Do not dual-write indefinitely; if a short dual-write period is unavoidable, compare hashes and ledger totals before cutover.
5. Keep a migration audit record with source hash, operator, time, mapping version, skipped fields, and reconciliation result. Never claim the local demo’s synthetic metrics as customer history.

## 9. Assumptions and production gaps

- This document assumes a service will be added around the existing API contract; it does not implement that service or change the current Node/browser runtime.
- The current local adapter has no real authentication, OAuth, billing, queue, provider execution, or database transaction layer. The schema makes those boundaries explicit but does not supply them.
- A secret manager/KMS, object storage for large documents, a durable queue/outbox, provider-specific connector adapters, and Stripe signature verification are external infrastructure responsibilities.
- The embedding dimension is fixed at 1,536 for the initial pgvector index. Changing embedding models requires a new version/index strategy rather than silently mixing dimensions.
- IANA timezone validation, role/permission checks, connector-specific configuration validation, prompt redaction, and provider rate-limit handling remain application/service concerns.
- Audit and billing records should be append-only to the application role. Corrections use compensating entries, never updates or deletes, except for retention/legal-hold workflows executed by a restricted maintenance process.
- The schema uses UUIDs even though the demo uses IDs such as `support`, `approval-1`, and `source-1`; the migration job owns the deterministic mapping and may retain those strings only as non-authoritative `entity_key` metadata.
