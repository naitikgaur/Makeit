# MakeEase Platform Roadmap

**Owner's position:** MakeEase should become an operating system for reviewable business work, not a collection of point-to-point automations. The platform kernel owns identity, tenancy, workflow execution, policy, context, model routing, connector contracts, usage, and evidence. Business solutions are installable packages built on that kernel.

**Planning horizon:** 24 months from the MVP baseline

**Audience:** product, platform engineering, security, operations, solution engineering, and ecosystem partners

**Status:** strategic target architecture; the current repository is a local MVP and is not the production topology described below.

---

## 1. Executive strategy

MakeEase has the right product wedge: a workspace where a person can configure a bounded workflow, run it with an explicit budget, inspect the trace, and approve an internal completion. That experience can scale if the platform treats every meaningful operation as a durable, tenant-scoped, policy-checked state transition with an inspectable record.

The company should build a small, opinionated kernel and make everything else replaceable:

1. **Kernel:** control plane, execution plane, connector SDK, AI gateway, policy decision point, usage ledger, audit trail, observability, and tenancy primitives.
2. **Platform services:** identity integrations, billing, knowledge ingestion, search/retrieval, deployment tooling, and marketplace services that consume kernel contracts.
3. **Packaged solutions:** support triage, lead follow-up, weekly briefing, engineering issue assistance, and future vertical or department solutions distributed as versioned packages.

The key strategic boundary is that a workflow package may describe *what* should happen and request capabilities, but it must not bypass the kernel to obtain secrets, call a provider, spend credits, or perform an external side effect. This keeps safety, billing, evidence, and tenant isolation consistent as the catalog grows.

### Outcomes by month 24

- A tenant can install a versioned solution package, connect approved providers, configure policy, and run it without platform engineers changing application code.
- Every run has an immutable workflow revision, input provenance, policy decisions, model/connector calls, usage settlement, approval history, and external-effect receipts where applicable.
- A connector or model provider can be replaced behind a stable capability contract without rewriting workflows or the UI.
- Workloads can move between regions and execution backends without changing control-plane identifiers or business data semantics.
- Enterprise customers can bring their identity provider, retention rules, model provider, keys, network boundary, and audit destination without receiving a fork of the product.

### Non-goals for the kernel

- Do not turn the kernel into a general-purpose arbitrary-code hosting platform in the first 24 months.
- Do not encode every industry's process as a core object. Industry behavior belongs in packages, policy packs, and connector capabilities.
- Do not promise exactly-once effects across external systems. The platform should provide at-least-once delivery, idempotency keys, deduplication, and effect receipts.
- Do not make the browser, local storage, a provider SDK, or one workflow engine the system of record.

---

## 2. What the current project tells us

The MVP is a useful product and contract prototype, but it currently contains two layers that must be deliberately reconciled.

### Existing strengths to preserve

- `ui/api.js` already centralizes API calls, credentials, CSRF headers, idempotency keys, and uncertainty handling for mutating requests.
- The UI is shaped around a server-returned bootstrap and workspace snapshot: workflows, runs, approvals, knowledge, integrations, usage, activity, and ledger.
- `API-CONTRACT.md` defines a useful target surface: authenticated workspace scope, reserved credits before queueing, bounded execution, explicit approvals, sandbox/live modes, Stripe webhook isolation, and secret-free exports.
- `lib/executor.js` already models a bounded run, concurrency limits, timeouts, step traces, model adapters, sandbox versus live modes, and credit settlement.
- `lib/auth.js`, `lib/validation.js`, and `lib/config.js` establish the beginnings of session, input validation, plan, template, and model boundaries.
- The UI intentionally refuses to fabricate provider connections, completed runs, savings, or external side effects. That truthfulness should be a platform invariant, not only a presentation choice.

### Current gaps and contract drift

- The checked-in `server.js` is a local adapter backed by `JsonStore` and `data/workspace.json`. It currently exposes only `/api`, `/api/health`, `/api/plans`, and `/api/workspace` routes; it does not implement the complete surface described by `API-CONTRACT.md`.
- The browser calls authentication, workflow, run, approval, knowledge, billing, and export endpoints that the local adapter does not yet provide. The API contract is therefore a target contract, not evidence of a production implementation.
- The package remains dependency-free and the runtime comments explicitly describe local/demo behavior. That is appropriate for a safe MVP, but JSON-file persistence cannot become the production source of truth for concurrent tenants or workers.
- `lib/executor.js` and `lib/validation.js` point toward a fuller service but are not yet the durable execution and schema infrastructure required for production. The executor references database abstractions that are not part of the current file set.
- `data/workspace.json` contains demo-shaped state. It must remain a fixture or sandbox seed and must never be treated as a tenant database.
- The current browser state is useful for rendering and polling, but all business authority must remain server-side. The client must continue to use cache-only visual state and re-fetch authoritative snapshots.

### Transition rule

Keep the public concepts and shapes that the UI already understands, but put them behind versioned service interfaces and repositories. Introduce the production platform beneath those interfaces rather than rewriting the UI around a database or workflow vendor. During migration, expose the same API vocabulary from an adapter backed by the new control plane, and label sandbox behavior explicitly.

---

## 3. Platform principles

1. **Evidence over implication.** A status is only shown when returned by a service that performed or recorded it. Sandbox, draft, simulated, configured, approved, and completed remain distinct states.
2. **Tenant context is mandatory.** Every request, job, event, secret reference, cache key, metric, trace, and ledger entry carries organization, workspace, and environment context.
3. **The run binds an immutable revision.** Editing a workflow never changes an in-flight or historical run.
4. **Policy is a first-class service.** Authorization, data access, model choice, connector actions, approval requirements, budgets, and retention are decisions, not scattered conditionals.
5. **External effects are explicit.** A side effect requires a declared capability, a policy decision, an idempotency key, and a provider receipt or a recorded failure. Approval is not a claim that a provider write succeeded.
6. **Asynchronous by default.** Any operation that can wait on a provider, human, timer, retry, or queue is a durable state machine, not an in-process promise.
7. **Portable contracts, replaceable implementations.** Provider payloads, queue APIs, vector indexes, and workflow-engine primitives stay behind ports and adapters.
8. **Secure defaults and least privilege.** Packages request capabilities; connections grant narrowly scoped permissions; workers receive short-lived access to references rather than raw secrets.
9. **Metering is not billing.** Usage measurement, credit reservation/settlement, subscription state, invoices, and payment-provider events have separate domains and ledgers.
10. **Build for migration before scale.** Stable IDs, event schemas, outbox delivery, schema versioning, and tenant placement are needed before multi-region scale, even when the first deployment is a single region.

---

## 4. Reference architecture

```text
                    +-------------------------------+
                    |         MakeEase clients      |
                    | Web UI · API · partner tools  |
                    +---------------+---------------+
                                    |
                         versioned API / webhooks
                                    |
          +-------------------------v-------------------------+
          |                    CONTROL PLANE                  |
          | Identity & tenancy · registries · policy ·        |
          | workflow revisions · connections · entitlements · |
          | billing · marketplace · audit · admin             |
          +------------+-------------------+------------------+
                       |                   |
                commands/events       read models/search
                       |                   |
          +------------v-------------------v------------------+
          |                     EVENT / JOB FABRIC             |
          | transactional outbox · queue · scheduler · DLQ    |
          +------------+-------------------+------------------+
                       |                   |
          +------------v---------+ +-------v-----------------+
          |    EXECUTION PLANE   | |       AI PLANE          |
          | orchestrator/state   | | model gateway/router    |
          | machine · step        | | context/retrieval       |
          | workers · approvals  | | guardrails · evals      |
          +------+----------+----+ +-----------+--------------+
                 |          |                  |
        +--------v--+  +----v---------+  +-----v-------------+
        | Connector |  | Policy PDP   |  | Usage/credit      |
        | gateway   |  | + PIP/cache  |  | reservation/ledger |
        +-----+-----+  +--------------+  +-------------------+
              |
    OAuth/API providers, SaaS systems, files, webhooks
```

The control plane is the authoritative configuration and governance system. The execution plane consumes immutable instructions and produces run facts. The AI plane and connector gateway are capability providers, not places where product policy is reimplemented. The event/job fabric is the durability boundary between user requests and work that may outlive an HTTP request.

### 4.1 Control plane

The control plane should be a stateless API tier over a relational source of truth, with read models for high-volume screens and administration. It owns:

| Domain | Kernel responsibility | Key objects |
| --- | --- | --- |
| Identity and membership | Authenticate users through local development auth and production OIDC/SAML; map users to organizations, workspaces, roles, and service principals | `user`, `organization`, `workspace`, `environment`, `membership`, `role`, `service_principal`, `session` |
| Configuration | Store tenant-scoped settings, feature flags, retention, regional placement, and environment mode | `workspace_settings`, `environment_config`, `feature_flag` |
| Workflow registry | Validate, version, publish, activate, pause, and roll back workflow definitions | `workflow`, `workflow_revision`, `workflow_release`, `workflow_trigger` |
| Connection registry | Store provider metadata, scopes, health, consent, and secret references; never raw secret values | `connector`, `connection`, `connection_grant`, `secret_ref`, `sync_cursor` |
| Model registry | Register logical models, provider routes, pricing/rates, availability, data handling, and evaluation status | `model`, `model_route`, `model_rate`, `model_policy`, `model_eval` |
| Policy | Manage organization/workspace/environment policy versions and exceptions | `policy_bundle`, `policy_version`, `policy_binding`, `policy_exception` |
| Human review | Create and decide approval requests with deadlines, actors, evidence links, and idempotent decisions | `approval`, `approval_decision`, `approval_escalation` |
| Entitlements and billing | Determine plan/features/limits and reconcile payment-provider events; do not mix invoice state with usage facts | `plan`, `entitlement`, `subscription`, `invoice_ref`, `billing_event` |
| Marketplace | Catalog packages, versions, publishers, certification, installs, upgrades, and revocations | `publisher`, `package`, `package_version`, `installation`, `review` |
| Evidence | Keep append-only audit and execution references, with redaction and retention policies | `audit_event`, `evidence_ref`, `export_job` |

#### Control-plane API shape

The existing `/api/bootstrap`, `/api/workspace`, `/api/workflows`, `/api/runs`, `/api/approvals`, `/api/knowledge`, `/api/billing`, and `/api/export` vocabulary is a good product-facing starting point. Evolve it as `/api/v1` with these rules:

- Commands return an operation or resource identifier and a durable status; they do not imply that asynchronous work has completed.
- Reads are workspace-scoped by server-derived tenant context, never by an arbitrary client-supplied workspace ID.
- Mutating commands accept an idempotency key and return the prior result for a duplicate key.
- ETags or version numbers protect edits to workflow revisions and settings from lost updates.
- Error codes are stable machine-readable values; messages are user-facing but not contract keys.
- API payloads expose logical IDs and status, not database schema or provider-specific payloads.
- API versions are additive where possible; breaking changes require a new version and a migration window.

### 4.2 Execution plane

The execution plane turns a published workflow revision into a durable run. It should be independently scalable from the control API and should not rely on a web process staying alive.

#### Run lifecycle

```text
accepted -> reserved -> queued -> running ->
  waiting_for_timer / waiting_for_provider / awaiting_approval ->
  completed | rejected | cancelled | failed | dead_lettered
```

Every transition is validated against the state machine and recorded with actor, timestamp, reason, attempt, and correlation ID. A run stores the workflow revision ID, package versions, resolved policy version, model route, connection IDs, input references, output references, usage facts, and step-level evidence. A human decision resumes the same run; it creates no duplicate run.

#### Execution components

- **Ingress and admission:** authenticate the command, resolve tenant and environment, validate the workflow revision, evaluate policy, reserve credits/quotas, and write the run plus outbox event atomically.
- **Scheduler:** handles due timers, webhook events, recurring triggers, backoff, concurrency limits, and tenant fairness.
- **Orchestrator:** owns state transitions and leases. It may initially be a MakeEase service and later use a durable workflow engine, but its interface remains MakeEase's run/step model.
- **Step workers:** execute typed steps such as trigger, retrieve, transform, AI, approval, branch, delay, and connector action. Workers are stateless between leases and can be retried safely.
- **Connector gateway:** validates capability grants, resolves connection secrets, applies provider rate limits, invokes connector adapters, and records normalized receipts.
- **AI gateway:** resolves the approved model route, applies context and policy, calls the provider, normalizes usage, and emits traces and cost facts.
- **Approval service:** presents evidence, enforces approver policy and expiry, and emits a signed/idempotent decision event.
- **Settlement service:** converts reservations into actual usage, releases unused budget, records failures/refunds according to policy, and never lets a client write the ledger.
- **Dead-letter and replay service:** stores terminal failures and permits authorized replay from a known step with a new attempt ID, not an invisible duplicate.

#### Execution guarantees

- At-least-once job delivery.
- Idempotent state transition and side-effect commands.
- Lease expiry and worker heartbeat for crash recovery.
- Per-tenant concurrency, rate, and credit budgets.
- Backpressure before provider limits are exceeded.
- No arbitrary network access from a generic workflow step.
- External action result includes provider, request fingerprint, idempotency key, receipt reference, and redacted response metadata.

### 4.3 Connector SDK and gateway

Connectors are a durable platform surface. A connector is not just an OAuth button; it defines a set of typed capabilities that workflows and packages can request.

#### Connector package contract

Each connector package should declare:

```text
manifest
  id, publisher, version, sdkVersion
  provider, categories, regions, dataClassification
  auth: oauth2 | api_key_ref | service_account | customer_managed
  scopes and consent text
  capabilities:
    triggers: webhook | poll | schedule
    actions: create | update | send | delete | export
    queries: search | get | list
  schemas: input, output, error, cursor, webhook
  effects: read_only | draft | reversible_write | irreversible_write
  limits: rate, payload, timeout, pagination
  idempotency: supported | adapter_dedup | unsupported
  requiredPolicies and optionalPolicies
  healthCheck and sync semantics
```

The SDK should expose a small language-neutral contract even if the first implementation is JavaScript/TypeScript:

- `configure()` validates a connection and returns normalized metadata.
- `subscribe()` and `unsubscribe()` manage triggers.
- `poll()` advances a cursor for providers without webhooks.
- `search()`, `get()`, and `list()` return bounded, typed records with provenance.
- `execute()` accepts a capability name, typed input, idempotency key, timeout, and cancellation signal.
- `health()` reports configuration, authorization, rate, and provider health separately.
- `normalizeError()` maps provider errors to retryable, throttled, unauthorized, invalid, conflict, or permanent classes.

#### Connector isolation and lifecycle

1. Connector code runs outside the control API in a connector runtime with network egress and CPU/memory limits.
2. A connector receives a short-lived capability token or secret reference, not a tenant's whole credential vault.
3. The gateway checks package permissions and policy before dispatch.
4. Connector versions are pinned per workflow revision. Upgrades are opt-in or governed by a compatibility policy.
5. Every connector has a local simulator and contract-test suite. Simulators must be clearly labeled and cannot emit live-success evidence.
6. Provider-specific fields remain in an adapter namespace; the workflow contract uses normalized fields plus an escape hatch for explicitly provider-specific packages.
7. High-risk actions require an approval policy by default, even if the solution package asks for automatic execution.

Start with first-party Gmail, Slack, GitHub, Notion, Stripe, and Linear adapters because they are already represented in the product. Add more providers through the same SDK; do not add one-off calls in solution code.

### 4.4 AI plane

The AI plane is a governed inference and context service, not a model-specific helper inside the executor.

#### Components

- **Model registry and router:** logical model IDs, provider routes, capability metadata, price/rate cards, region, latency, context limits, availability, and fallback policy.
- **Request compiler:** converts a workflow step plus approved context into a normalized request with system instructions, user input, retrieved evidence, output schema, token/output limits, and safety metadata.
- **Context service:** retrieves workspace-approved knowledge with tenant filters, source provenance, freshness, access checks, and bounded context windows. Begin with relational full-text search or a managed search layer; add vector retrieval when evaluation justifies it.
- **Provider adapters:** OpenAI-compatible, Anthropic, and future providers behind one normalized request/response interface. Provider payloads and retries must not leak into workflow definitions.
- **Guardrails:** input/output classification, prompt-injection boundaries, PII/redaction policy, allowed tool/capability set, structured-output validation, and refusal handling.
- **Evaluation service:** golden tasks, regression tests, model/prompt versions, groundedness and policy checks, cost/latency quality curves, and release gates.
- **Usage meter:** provider-reported and estimated token usage normalized into usage facts, then settled into the credit ledger. Rate cards are server-controlled and versioned.
- **Prompt and artifact registry:** versioned prompts, schemas, evaluators, and policy references. A run records exact versions, not only a friendly model label.

#### AI safety and portability decisions

- Workflows request a logical capability such as `summarize.support.v1`, not a vendor model name. The router chooses among allowed models.
- A customer may pin a model route, but the workflow remains valid if the provider is unavailable; the run should fail clearly or use an explicitly approved fallback.
- No model receives raw connection secrets or unrestricted tool access. Tools are capability calls mediated by the connector gateway and policy engine.
- Retrieved context includes source IDs and access decisions so a reviewer can understand why it was used.
- Streaming is an API/UI optimization. Durable run state is written from finalized step events and does not depend on a browser stream.
- Prompts, inputs, and outputs are sensitive data. Redact them in standard logs and apply tenant retention and export controls.

### 4.5 Policy engine

Policy must be centrally explainable and locally enforceable. Use a **policy enforcement point (PEP)** in every command/worker boundary, a **policy decision point (PDP)** with a stable decision API, and policy information points (PIPs) for tenant, membership, connection, data classification, usage, and environment facts.

#### Decision inputs

```text
subject: user | service_principal | package_publisher | worker
tenant: organization, workspace, environment, region
resource: workflow, run, connection, knowledge, package, ledger
action: read | create | execute | approve | connect | send | delete | export
context: data_classification, amount, model, connector, time, risk, budget, source
```

#### Decision outputs

```text
effect: allow | deny | require_approval | allow_with_obligations
policyVersion
reasons[]
obligations: redact, mask, step_up_auth, reviewer_role, max_amount, expiry
constraints: model_set, connector_scope, region, retention
```

The first production version may be a deterministic, versioned evaluator with JSON policy documents and a test harness. Design its decision API and policy language so it can later use a mature policy runtime such as Cedar or OPA without changing callers. Do not allow arbitrary JavaScript expressions from tenants.

#### Policy domains

- Membership and RBAC/ABAC.
- Workflow publish/activate/execute.
- Connector capabilities and OAuth scopes.
- AI model/data handling and geography.
- Approval thresholds and separation of duties.
- Credit, concurrency, and rate budgets.
- Retention, export, deletion, and legal hold.
- Marketplace package trust and installation permissions.

Every deny or approval requirement should be explainable to an administrator without disclosing secrets. Policy changes are versioned, reviewed where required, and attached to runs so history remains reproducible.

### 4.6 Marketplace and package system

The marketplace is the distribution channel for solutions and connectors. It is not a second execution platform.

#### Package types

- **Solution package:** workflows, prompts, policies, forms/UI metadata, knowledge schemas, connector requirements, evaluators, and installation/upgrade migrations.
- **Connector package:** provider adapter, capability schemas, auth configuration, simulator, health checks, and certification metadata.
- **Policy pack:** reusable controls such as approval thresholds, regulated-data restrictions, or department role mappings.
- **Model pack:** logical capability definitions, evaluation suites, and allowed provider routes; never a mechanism to smuggle an unapproved provider.

#### Package manifest requirements

Every package version has an immutable ID, publisher identity, semantic version, SDK compatibility, dependency graph, requested capabilities, data classification, regions, declared side effects, upgrade/migration plan, support lifecycle, and signed artifact digest.

Installation creates a tenant-scoped installation record and grants only the capabilities approved by policy. A package cannot silently add a new connector scope or increase effect risk on upgrade. Existing workflow revisions remain pinned until an administrator accepts the upgrade.

#### Trust and commercial model

Use three trust tiers:

1. **First-party:** MakeEase-owned, continuously tested, eligible for default catalog placement.
2. **Certified partner:** publisher verified, contract-tested, security-reviewed, supported by a defined SLA.
3. **Community/private:** customer or publisher installed, isolated, explicit warnings, no implied MakeEase support.

Build discovery, compatibility, certification, install/upgrade, revocation, and evidence. Buy or integrate payment processing, tax, invoicing, and publisher payouts rather than building financial rails.

### 4.7 Observability and operational evidence

Observability is part of the platform contract because users need to understand a run and operators need to recover it.

#### Correlation and identity

Propagate these IDs in every log, trace, metric exemplar, event, and external call where possible:

`requestId`, `correlationId`, `organizationId`, `workspaceId`, `environmentId`, `workflowId`, `workflowRevisionId`, `runId`, `stepId`, `attemptId`, `connectorId`, `connectionId`, `modelRouteId`, `policyVersion`, `packageVersion`.

#### Three evidence streams

1. **Operational telemetry:** traces, metrics, structured logs, queue depth, worker health, provider latency, rate-limit events, and resource saturation.
2. **Product activity:** user-visible workflow, approval, connection, billing, and configuration activity.
3. **Compliance audit:** append-only actor/action/resource/result/policy/tenant records with retention, export, and legal-hold semantics.

Never rely on a log line as the authoritative product record. The run/event store and audit store are authoritative; telemetry links to them.

#### Initial service objectives

These are planning targets to validate with production load, not claims about the current MVP:

- Control-plane reads/writes: 99.9% monthly availability; p95 under 500 ms for ordinary reads and under 1 s for ordinary commands before queueing.
- Accepted commands: 99.99% durable admission after authentication, policy, and quota checks.
- Execution dispatch: 99% of eligible queued steps start within 30 seconds under stated plan limits.
- Audit completeness: 100% of state transitions and external-effect attempts have durable event IDs.
- Recovery: documented RPO/RTO per tenancy tier, with quarterly restore and replay exercises.

Use OpenTelemetry for traces/metrics/log correlation, a managed log/metric backend, and alerting on SLO burn rates. Do not build a proprietary telemetry stack.

---

## 5. Kernel versus packaged business solutions

The test for kernel ownership is whether the capability is required to enforce trust, isolation, durability, or platform-wide economics. If it is primarily a domain process, it belongs in a package.

| Kernel / platform feature | Packaged business solution |
| --- | --- |
| Organization/workspace/environment hierarchy and tenant isolation | Support triage workspace and support-specific fields |
| Membership, roles, service principals, authentication integration | Sales or support team role presets |
| Workflow definition, immutable revisions, triggers, typed steps, run state machine | “Customer support triage” workflow graph |
| Queueing, scheduling, retries, leases, cancellation, dead-letter, replay | A support escalation schedule or lead follow-up cadence |
| Connector SDK, auth, capability grants, normalized receipts | Gmail support mailbox connector configuration |
| AI gateway, model routing, context provenance, usage metering | Support summarization prompt and response rubric |
| Policy decision API, approval gates, obligations, explanations | “Refund over $X requires finance approval” policy pack |
| Credit reservation/settlement and immutable usage ledger | A solution's recommended budget defaults |
| Audit events, traces, run evidence, export, retention | Solution-specific reporting views and scorecards |
| Package manifest, dependency resolution, signing, install/upgrade | Weekly business briefing package |
| Marketplace discovery, certification, entitlements, revocation | Partner's lead-enrichment package |
| Secrets references, KMS integration, data classification | Provider-specific field mapping |
| Search/retrieval interfaces and source ACLs | Engineering issue knowledge schema |
| Billing events, plans, feature entitlements | Business-tier packaging and onboarding copy |

### Initial solution portfolio

Keep the four current templates as seed packages, not hard-coded kernel behavior:

1. **Customer support triage:** classify, retrieve approved policy, draft response, request review. Start read-only/draft; add send only with connector capability and approval policy.
2. **New lead follow-up:** normalize lead context, retrieve approved messaging guidance, draft alternatives, request review. Treat outbound sending as a separate high-risk action.
3. **Weekly business briefing:** collect configured sources, summarize with provenance, highlight unknowns and open questions. Do not invent revenue or savings when data is absent.
4. **Engineering issue assistant:** retrieve repository/issue context, draft an implementation plan, list verification checks. Pull requests and code changes remain separate actions with stronger policy.

Future packaged tracks can include finance operations, recruiting operations, customer success, and regulated-industry controls. They should share kernel primitives and compete on domain quality, evaluation data, onboarding, and outcomes—not on private forks of the executor.

---

## 6. Canonical domain and contract decisions

These choices should be made before adding a large connector catalog or multiple deployment regions.

### 6.1 Identity and IDs

- Use opaque, globally unique IDs (UUIDv7/ULID-class identifiers) for organizations, workspaces, environments, workflows, revisions, runs, steps, events, connections, and ledger entries. IDs are not user-controlled names and contain no tenant data.
- Every resource has `createdAt`, `updatedAt`, and an actor/source. Time is stored in UTC; schedules retain the IANA timezone and original schedule definition.
- Separate human-readable slugs from immutable IDs. Slugs can change without breaking references.

### 6.2 Workflow and package versioning

- `workflow` is the logical identity; `workflow_revision` is immutable executable configuration; `workflow_release` maps a trigger/environment to a revision.
- A run stores the exact revision, package versions, prompt versions, model route, connector versions, and policy versions it resolved.
- Definitions are typed graphs/state machines, not opaque blobs. Preserve unknown extension fields for forward compatibility, but validate executable fields against a schema version.
- Use additive schema migrations and explicit data migrations. Never make a live run depend on mutable template code.

### 6.3 Event and job semantics

- Persist a domain change and its outbox event in one database transaction.
- Publish events at least once; consumers deduplicate by event ID and handler version.
- Commands are intent; events are facts. Do not reconstruct a fact from a log message.
- Use inbox/deduplication records for provider webhooks and connector actions.
- State transitions are monotonic except for explicitly modeled retry/replay transitions.

### 6.4 Usage and billing

Keep four separate concepts:

1. **Provider usage fact:** tokens, calls, bytes, duration, or connector units reported/estimated by a provider.
2. **Credit reservation:** a hold made before queueing to prevent overspend.
3. **Credit settlement:** actual charge plus release/refund of unused reservation.
4. **Commercial billing:** plan, subscription, invoice, payment, tax, and webhook state.

The credit ledger is append-only and server-managed. A client may request a run or top-up but can never write an amount. Stripe or another payment provider is authoritative for payment events; MakeEase is authoritative for product entitlements after verified reconciliation.

### 6.5 Secrets and data

- Store only secret references and encrypted provider metadata in the application database. Secret values live in a managed KMS/secret store.
- Use envelope encryption, key rotation, access audit, and tenant/customer-managed key hooks for enterprise tiers.
- Tag knowledge, inputs, outputs, and connector records with data classification and retention policy.
- Exports omit secrets and are generated as explicit, audited jobs.
- No provider credential enters a browser payload, workflow definition, prompt, standard log, or marketplace package.

### 6.6 Read models and exports

The UI can retain the current workspace snapshot model for convenience, but the service should assemble it from read models with a consistent `snapshotVersion` and `asOf` timestamp. Large histories, logs, and outputs should be paginated or referenced rather than embedded in every response. Exports are versioned, scoped, redacted, and resumable.

---

## 7. Multi-tenancy and isolation model

### 7.1 Hierarchy

```text
organization (commercial/security boundary)
  └── workspace (business operating context)
        └── environment (sandbox / staging / production / private region)
              ├── workflows and revisions
              ├── connections and secret references
              ├── knowledge and data sources
              ├── runs, approvals, activity, and ledger
              └── policy bindings and entitlements
```

An individual may belong to several organizations and workspaces. A service principal belongs to an organization and is explicitly granted workspace/environment access. A sandbox is an environment with a hard no-side-effects policy, not a separate code path that silently fakes production.

### 7.2 Isolation tiers

Offer progressive isolation without changing resource semantics:

1. **Shared tier:** shared stateless API and worker pools; relational row-level security; per-tenant quotas and encryption context.
2. **Dedicated execution tier:** tenant or group-specific worker pools, queues, network egress, and concurrency budgets.
3. **Private/control boundary tier:** dedicated database/schema or deployment, customer-managed keys, private connectivity, regional placement, and optional customer-run connector workers.

Tenant placement is an explicit control-plane field from the beginning. The first deployment can have one placement, but every data and job record must be movable by reference rather than assuming one global database or queue.

### 7.3 Isolation enforcement

- Resolve tenant context from the authenticated principal and server-side membership, then pass an immutable context object to repositories and workers.
- Enforce row-level security or an equivalent repository guard at the database boundary; application filters alone are insufficient.
- Include tenant IDs in every unique index, cache key, queue partition, object-storage prefix, search filter, and idempotency scope.
- Use per-tenant rate, concurrency, storage, context, and credit budgets to prevent noisy neighbors.
- Test cross-tenant access with adversarial IDs, stale sessions, replayed webhooks, export jobs, failed authorization, and worker retries.
- Never put tenant content in process-global mutable state or shared in-memory caches without tenant keys and bounded TTLs.

### 7.4 Tenant lifecycle

Provisioning, suspension, soft deletion, export, legal hold, retention purge, and restoration are control-plane workflows. Suspension stops new admission and external effects while preserving evidence. Deletion must revoke connections, drain/cancel runs according to policy, delete or tombstone data per retention rules, and leave a minimal compliance record.

---

## 8. Deployment stages and topology

Do not jump directly from a local JSON demo to active-active global infrastructure. Earn complexity through operational evidence.

### Stage 0 — Local product contract (current, months 0–2)

**Topology:** browser + local Node adapter + fixture/JSON persistence; sandbox only.

**Purpose:** validate the user journey and keep the API vocabulary honest.

**Required guardrails:** explicit sandbox labels, no real external writes, no secrets in fixtures, deterministic demo output, bounded test runs, and a contract test suite that distinguishes implemented routes from target routes.

**Exit gate:** the target API is either implemented or clearly returns structured `NOT_IMPLEMENTED`; no UI action silently assumes an unavailable endpoint.

### Stage 1 — Single-region production kernel (months 3–6)

**Topology:** managed relational database, stateless API, managed object storage, durable queue, worker pool, managed secrets/KMS, one region, one deployment cell.

**Capabilities:** real identity/session boundary, organization/workspace/environment tenancy, workflow revisions, transactional outbox, run state machine, idempotency, credit reservation/settlement, approvals, audit events, health/readiness, backups, restore drills, and OpenTelemetry.

**External effects:** first-party connectors begin with read-only and draft capabilities. Live writes are gated and separately observable.

**Exit gate:** two or more independent tenants can run concurrently with no cross-tenant access; a killed worker recovers a run; duplicate commands/webhooks do not double-charge or double-send; restore meets documented RPO/RTO.

### Stage 2 — Production platform and connector SDK (months 7–12)

**Topology:** independently scalable control and execution planes, queue partitions/fairness, connector runtime, AI gateway, managed search/retrieval, private package registry, staging environment, and canary deployment.

**Capabilities:** connector manifest/SDK v1, OAuth and secret references, model registry/router, policy PDP v1, source provenance, structured outputs, provider health, package installation for first-party solutions, and plan entitlements.

**Exit gate:** a new certified connector and a new solution can be installed without changing core runtime code; model routing can change providers without changing workflow definitions; policy simulation catches prohibited actions before activation.

### Stage 3 — Ecosystem and enterprise controls (months 13–18)

**Topology:** regional placement abstraction, dedicated execution pools, partner sandbox, signed package artifacts, private marketplace/catalogs, SSO/SCIM, audit export, customer-managed keys for eligible tiers, and stronger data residency controls.

**Capabilities:** partner SDK, certification pipeline, install/upgrade/rollback, policy packs, workflow promotion between environments, data classification, retention/legal hold, and usage/cost analytics.

**Exit gate:** a partner package can be certified, revoked, and rolled back; enterprise admins can demonstrate who approved a high-risk action and what evidence was used; a tenant can run in a dedicated boundary without a product fork.

### Stage 4 — Resilient multi-region platform (months 19–24)

**Topology:** explicit tenant placement, regional control/read replicas as justified, regional execution pools, replicated object/evidence storage, tested failover, and a documented degraded mode. Active-active is optional, not a milestone by itself.

**Capabilities:** regional routing, disaster recovery, capacity rebalancing, cross-region package/model catalog, automated SLO governance, marketplace commercial operations, and advanced policy simulation.

**Exit gate:** planned and unplanned region-loss exercises meet the tier's RPO/RTO; runs do not silently duplicate external effects during failover; tenant data residency and audit guarantees remain true.

---

## 9. Build-versus-buy boundaries

The rule is to build the MakeEase-specific contract and trust model, and buy commodity infrastructure whose failure modes are already well understood. The platform should own the adapters and operational policy around each bought service.

| Capability | Build | Buy/adopt | Boundary that prevents lock-in |
| --- | --- | --- | --- |
| Control API and domain model | Tenant/workspace/workflow/run/approval/ledger semantics, API versioning, repositories | Web framework and managed compute | Domain services depend on ports; no vendor SDK in domain objects |
| Relational persistence | Schema, migrations, RLS/tenant repository rules, read models | Managed Postgres-compatible database, backups, replicas | SQL/repository interface; IDs and events are vendor-neutral |
| Durable jobs/workflows | MakeEase run/step state model, admission, evidence, idempotency | Managed queue initially; evaluate Temporal/Durable Task-style engine for long waits | `OrchestratorPort` and `ExecutionEvent` contract; engine IDs never leak into API |
| Object/blob storage | Evidence metadata, retention, redaction, export format | S3-compatible managed object storage | `BlobStore` port and content-addressed/evidence refs |
| Identity | Membership/role/tenant mapping, session semantics, authorization integration | OIDC/SAML provider, MFA, SCIM, password breach controls | Stable principal/membership model; IdP subject is an external attribute |
| Secrets and keys | Secret reference lifecycle, access policy, rotation workflow, redaction | Cloud KMS/secret manager, HSM for higher tiers | `SecretProvider` port; applications see handles, not provider objects |
| Payments and tax | Plans, entitlements, credit policy, reconciliation | Stripe or equivalent checkout, invoices, tax, payouts | Webhook adapter emits internal billing facts; no Stripe IDs in product logic |
| AI providers | Normalized AI request, routing, policy, usage, evaluations, context provenance | Model APIs, hosted embeddings/rerankers where appropriate | `ModelProvider` port and logical model IDs |
| Search/retrieval | Source ACLs, chunk/provenance model, retrieval contract, evaluation | Postgres full text/pgvector or managed search as scale demands | `Retriever` port; index is rebuildable from canonical source records |
| Policy runtime | Policy domain, decision API, bindings, explanations, test fixtures | Cedar/OPA-like evaluator when maturity/scale requires | PEP/PDP protocol isolates policy engine and language |
| Telemetry | Semantic conventions, tenant redaction, SLOs, audit schema, run evidence | OpenTelemetry collectors, managed logs/metrics/traces | OTel and internal evidence IDs; no dashboard-specific code in workers |
| Connector hosting | SDK, manifest, capability/effect model, certification, gateway | Sandboxed compute/network primitives | `ConnectorRuntime` port; package cannot access control DB |
| Marketplace finance | Catalog, trust, certification, compatibility, install/upgrade/revoke | Payment rails, tax, payout processing | Internal package/version/install model surrounds vendor commerce events |
| Browser/UI | Workflow and review experience, truthful states, accessibility | Static hosting/CDN, optional component libraries later | UI consumes versioned API/read models only |

Avoid buying a monolithic automation platform as the kernel. It may be useful for customer-specific prototypes or noncritical back-office workflows, but its opaque execution state, tenant model, pricing, and connector semantics would become a rewrite constraint.

---

## 10. Architecture decisions that prevent future rewrites

These are the decisions to record as accepted architecture records before implementation broadens.

### ADR-001: Control and execution planes are separate

The API may accept a command and enqueue work, but it never owns long-running execution. Workers can be scaled, isolated, paused, replayed, and moved independently. A run is a durable domain object, not a request-local promise.

### ADR-002: Workflow definitions are typed, immutable revisions

The logical workflow can be edited; a published revision cannot. A run references a revision and all resolved dependencies. This prevents template edits, prompt edits, connector upgrades, or policy changes from changing history.

### ADR-003: Every provider is behind a capability contract

No UI, solution package, or core service imports Gmail/Slack/OpenAI/Anthropic SDKs directly. Provider adapters implement normalized connector/model ports and retain provider-specific details at the edge.

### ADR-004: Domain events plus transactional outbox are the integration backbone

Database changes and emitted facts commit together. Consumers are at-least-once and deduplicate. This prevents lost queue messages and makes future regions, analytics, and external audit sinks possible.

### ADR-005: Policy decisions are versioned evidence

Every sensitive action records the policy version, inputs that were safe to retain, effect, reasons, and obligations. Authorization cannot be reconstructed from today's policy after the fact.

### ADR-006: Tenant context is a non-optional type

Repository, queue, storage, search, policy, telemetry, and connector interfaces require tenant context. Avoid APIs that accept only a resource ID when the same ID could be looked up outside its tenant.

### ADR-007: Secrets are references, never workflow data

Workflows and prompts use connection IDs/capabilities. Secret resolution occurs in a narrow runtime with audit and short-lived access. This allows KMS, customer-managed keys, and private workers later.

### ADR-008: Usage facts and commercial billing are separate

Provider usage can be corrected or estimated; payment events can be delayed or disputed. Separate ledgers and reconciliation jobs prevent a billing vendor migration from rewriting run accounting.

### ADR-009: External effects use idempotency and receipts

The platform does not claim exactly-once delivery. It passes stable idempotency keys when providers support them, stores deduplication state when they do not, and records a receipt/uncertainty state for every attempt.

### ADR-010: Read models are disposable

Dashboard snapshots, search indexes, analytics tables, and marketplace projections can be rebuilt from canonical records/events. Do not make them the only copy of a workflow, run, audit event, or ledger fact.

### ADR-011: Package installation is a governed deployment

Packages are signed, pinned, permissioned, tested, and upgradeable/rollbackable. A package cannot mutate a tenant merely by being discovered in a catalog.

### ADR-012: Region and environment are explicit dimensions

Store environment and placement even while there is one region and one environment. This avoids embedding production assumptions into IDs, queues, secrets, and retention code.

### ADR-013: API contracts are independent of persistence

Keep the current product vocabulary where useful, but do not expose JSON fixture shape or SQL columns as an API contract. Use schema validation, versioning, pagination, optimistic concurrency, and capability discovery.

### ADR-014: Sandbox is a policy mode, not fake live data

Sandbox uses the same state machine and evidence vocabulary where possible, with a hard no-external-effects policy and explicit simulation markers. It must not fabricate provider health, savings, completed history, or payment success.

---

## 11. 24-month capability roadmap

The roadmap is ordered by dependency, not by the most visible feature. Each quarter has a kernel track and a packaged-solution track. A quarter is complete only when the exit evidence exists; shipping a UI screen alone does not count.

| Period | Kernel/platform capabilities | Packaged solutions and ecosystem | Exit evidence |
| --- | --- | --- | --- |
| **Months 0–3**<br>Q1: Make the contract real | Freeze API v1 vocabulary; introduce tenant-aware domain schema; repository interfaces; migration tooling; local sandbox adapter; workflow/revision/run IDs; explicit `NOT_IMPLEMENTED` responses; contract tests; initial threat model; outbox design | Convert four templates into package manifests and seed data; define solution evaluation rubric; keep all current packages sandbox-only | UI actions map to implemented/declared endpoints; fixture data cannot become production authority; a run references an immutable revision; API and browser tests agree |
| **Months 4–6**<br>Q2: Durable single-region kernel | Managed relational DB; real sessions and membership; org/workspace/environment hierarchy; RLS or equivalent; durable queue; run state machine; idempotent commands; atomic credit reservation; approvals; append-only activity/audit; backups and restore drill; OTel baseline | First-party solution packages installed from an internal registry; support triage and weekly briefing use real knowledge records but no uncontrolled external writes | Two isolated tenants run concurrently; worker restart recovers a run; duplicate run/approval/webhook does not double-charge; restore and cross-tenant tests pass |
| **Months 7–9**<br>Q3: Connector and AI foundations | Connector SDK/manifest v1; connector gateway; secret references; OAuth callback boundary; read/search/list capability types; model registry; normalized AI gateway; token/usage facts; policy PDP v1 and decision explanation | Gmail, Slack, GitHub, Notion, Stripe, and Linear first-party adapters move through contract tests; engineering and lead packages consume logical AI capabilities | A new connector can be added without editing workflow orchestration; a model provider can be swapped behind the gateway; policy decisions appear in run evidence |
| **Months 10–12**<br>Q4: Self-serve production | Approval obligations; connector effect classification; read-only/draft/live action gates; retries/backoff/DLQ; provider rate limits; retrieval provenance; plan entitlements; verified billing webhook reconciliation; staging/canary deployment | Launch private catalog for first-party packages; publish support triage, lead follow-up, weekly briefing, and engineering assistant with clear capability requirements; package upgrades pinned and reversible | A package install grants only declared capabilities; a failed provider call is retryable or terminal by policy; billing cannot mint credits from an unverified event; live action has a receipt or explicit uncertainty |
| **Months 13–15**<br>Q5: Partner platform | Public SDK documentation; partner sandbox; package signing; certification pipeline; policy packs; environment promotion; dedicated worker pools; tenant quotas/fair scheduling; customer audit export | Certified partner connectors and solution packages; private catalogs for larger customers; solution analytics based on real usage and outcomes, not invented savings | Partner can build, test, certify, install, upgrade, and revoke a package without platform code changes; noisy-neighbor and package permission tests pass |
| **Months 16–18**<br>Q6: Enterprise control | OIDC/SAML, MFA/SCIM integration; data classification; retention/legal hold; customer-managed key hooks; regional placement metadata; private connectivity option; advanced policy simulation; model/provider allowlists; disaster-recovery rehearsal | Enterprise policy packs; regulated-data variants of support/engineering packages; BYO model route where supported; private package distribution | Enterprise admin can prove membership, policy, evidence, retention, and approval history; a tenant can use dedicated execution/private connectors without a product fork |
| **Months 19–21**<br>Q7: Regional resilience | Regional execution placement; replicated object/evidence strategy; failover-aware scheduler; capacity rebalancing; replay/compensation tooling; degraded control-plane mode; regional SLO dashboards | Region-aware connector and model availability in package metadata; cross-region package catalog; operational runbooks for high-risk solutions | Region-loss exercise meets the tier's RPO/RTO; failover does not duplicate external effects; tenant residency policy remains enforceable |
| **Months 22–24**<br>Q8: Platform maturity | Marketplace commercial primitives; publisher support/SLA metadata; advanced cost and quality controls; policy what-if analysis; automated package compatibility checks; optional multi-region read scale; platform deprecation policy | Broader department/vertical catalog; revenue-sharing partner program; certified solution scorecards; package lifecycle and migration tooling | Platform can add capabilities through packages, maintain backward-compatible kernel contracts, and retire a provider/package version without rewriting customer workflows |

### Quarterly sequencing constraints

- Do not add arbitrary external writes before durable run state, idempotency, receipts, and approval policy exist.
- Do not open a third-party marketplace before package signing, capability declarations, sandboxing, and revocation exist.
- Do not promise active-active writes before external-effect deduplication, regional data policy, and recovery drills are credible.
- Do not optimize model routing before usage facts, evaluation datasets, and policy constraints are observable.
- Do not make package authors depend on internal database tables or worker engine APIs.

---

## 12. Migration plan from the current MVP

The migration should be incremental and reversible. Preserve the safe browser experience while replacing authorities underneath it.

### Phase A: clarify the seam

1. Treat `API-CONTRACT.md` as the desired v1 contract and add a machine-readable contract test description.
2. Mark the current `server.js`/`JsonStore` adapter as `local-sandbox-v0`; keep it useful for UI development.
3. Add an adapter capability report so the UI can distinguish implemented, unavailable, and sandbox-only operations instead of assuming endpoints exist.
4. Move plan, model, template, and integration definitions from implicit code/fixture assumptions toward registry seed records.

### Phase B: introduce ports without changing the UI vocabulary

1. Create repository ports for workspace, workflow, run, approval, knowledge, connection, usage, activity, and ledger reads/writes.
2. Implement a relational repository behind the same service handlers; retain the JSON adapter for local sandbox tests.
3. Split authentication into identity authentication, membership authorization, and CSRF/session transport. The current local auth helpers can remain a development adapter; production identity should be replaceable.
4. Replace in-process executor assumptions with an `ExecutionPort` that accepts a run ID and lease, emits step events, and supports restart/replay.
5. Keep the client using server snapshots and polling initially; add subscriptions or streaming only as a presentation optimization.

### Phase C: make execution and providers durable

1. Add workflow revisions and bind every queued run to a revision before moving live data.
2. Add transactional outbox, queue worker, idempotency table, usage reservation/settlement, and approval decision records.
3. Move provider calls out of generic workflow code into connector/model adapters.
4. Add policy checks at API admission, worker step dispatch, connector gateway, model gateway, export, and billing boundaries.
5. Keep current sandbox output as a simulator implementing the same normalized AI/connector interfaces; never mix simulator output with live provider evidence.

### Phase D: package and scale

1. Convert the four template definitions into signed first-party solution packages with semantic versions.
2. Add package install/upgrade/rollback and compatibility tests.
3. Add dedicated execution pools, tenant placement, regional metadata, and private connector runtime only after the shared path is observable.
4. Migrate dashboard reads to versioned read models with pagination and `asOf` metadata.
5. Retire the JSON adapter only after export, migration, rollback, and local developer workflows are proven on the relational path.

### What must not be migrated as-is

- `data/workspace.json` demo values must not become seed production history.
- Browser local storage must not become business authority.
- Provider credentials must not be copied into config, fixtures, workflow payloads, or client state.
- A mutable template ID must not stand in for an immutable workflow revision.
- A successful HTTP response must not be interpreted as completed execution when the command is queued.

---

## 13. Operating model and ownership

Platform companies fail when product teams either bypass the kernel or wait for a central team for every domain feature. Use clear ownership:

| Team/capability | Owns | Does not own |
| --- | --- | --- |
| Control plane | tenancy, workflow registry, API, entitlements, package/install records | provider-specific action logic |
| Execution platform | scheduler, orchestrator, workers, retries, leases, run evidence | domain prompts and customer policy exceptions |
| AI platform | model adapters, routing, context, evals, AI usage | arbitrary external side effects |
| Connector platform | SDK, gateway, auth, certification, provider adapters | solution-specific business decisions |
| Trust/policy | PDP, policy schemas, threat model, audit, retention | UI copy or provider SDK implementation |
| Solutions | package workflows, prompts, mappings, evaluation sets, onboarding | direct DB writes, secret access, bypassing policy |
| SRE/platform operations | deployment, SLOs, capacity, incident response, DR | changing product authorization semantics ad hoc |
| Marketplace/ecosystem | catalog, partner lifecycle, certification, commercial operations | running unreviewed package code in the control plane |

Every package team gets a local simulator, contract fixtures, policy test cases, and a production evidence dashboard. Every platform team publishes compatibility and deprecation notices before changing a shared contract.

---

## 14. Risks, decisions to revisit, and review cadence

### Principal risks

- **Premature infrastructure complexity:** active-active regions or a full workflow engine before the run model is stable can slow the product. Keep ports and operational evidence first.
- **Connector sprawl:** one-off integrations can create an unmaintainable support matrix. Enforce the SDK, capability taxonomy, and certification gate.
- **AI cost and quality volatility:** model availability and pricing change quickly. Use logical capabilities, rate-card versions, eval gates, and hard budgets.
- **Policy fragmentation:** solution-specific authorization checks will drift. Require all high-risk actions to go through the PDP and publish policy explanations.
- **Data leakage through context:** retrieval and prompts can cross boundaries if source ACLs are not evaluated at query time. Test access filtering and provenance before expanding knowledge ingestion.
- **Marketplace trust failure:** a package can be technically valid but operationally unsafe. Sign artifacts, declare effects, sandbox execution, provide revocation, and preserve evidence.
- **Billing/usage mismatch:** provider corrections and retries can create disputes. Keep immutable facts, reservations, settlement, and commercial billing separate and reconcile them.
- **Contract drift:** the current UI, `API-CONTRACT.md`, local adapter, and future service can diverge. Run contract tests against every adapter and publish implementation status.

### Architecture review triggers

Revisit the architecture when any of these occur:

- More than one execution backend is needed.
- A customer requires a private network or customer-managed key.
- A provider lacks idempotency for an action the product wants to automate.
- A package requests a new effect class or secret scope.
- A data class or region policy is added.
- Queue depth, provider latency, or tenant contention violates an SLO.
- A model route changes data handling, cost, or evaluation quality.

Hold a monthly platform review for SLOs, incidents, package compatibility, connector health, and cost/quality. Hold a quarterly architecture review for ADRs, deprecations, tenancy tiers, and the next roadmap gate. Require an incident or replay drill at least quarterly once Stage 1 begins.

---

## 15. Definition of platform maturity

MakeEase is operating as a platform company when the following statements are true:

- A new business solution is mostly package work and evaluation work, not a new backend branch.
- A new connector is an SDK implementation with declared capabilities, scopes, tests, health, and receipts—not a button wired directly to a provider.
- A new model provider is an adapter and rate/evaluation entry—not a workflow schema migration.
- An administrator can answer who did what, under which policy, using which package/model/connector versions, with what result and cost.
- A customer can limit, approve, replay, export, suspend, or delete work without an engineer editing a database file.
- A worker crash, provider timeout, duplicate webhook, or regional failure produces a visible state and a recoverable operation rather than an ambiguous success.
- A package can be installed, upgraded, rolled back, disabled, or revoked without corrupting historical runs.
- The kernel remains small enough to explain: identity/tenancy, workflow/run durability, capability execution, policy, evidence, and usage.

That is the operating-system boundary: MakeEase supplies the trusted substrate and lifecycle; solution packages supply the domain-specific way work gets done.
