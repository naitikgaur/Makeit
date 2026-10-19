# MakeEase v1 implementation and production handoff

This repository now contains the focused MakeEase v1 product shape:

> **One support request → grounded review packet → human decision → durable evidence.**

The checked-in server remains a loopback sandbox adapter. It is intentionally
safe to run locally and intentionally refuses live provider effects. The code
is organized around the production contract so the remaining live boundaries
can be filled without changing the core product model.

## Implemented in this workspace

### Support review packet

- Support-first browser onboarding and seeded support workflow.
- Structured deterministic packet output with:
  - intent classification;
  - urgency;
  - missing facts;
  - approved-reference grounding;
  - draft-only response text;
  - escalation recommendation;
  - uncertainty and abstention;
  - bounded evidence;
  - stable packet ID and digest.
- Packet records are explicitly marked `draft_only`, `sent: false`,
  `providerContacted: false`, and `externalActionsPerformed: false`.
- Persisted run output uses a bounded packet projection so evidence does not
  make the local JSON store grow without limit.

### Review and accounting

- Review queue and approval decisions are idempotent.
- Approval decisions can include a reviewer reason and edited output.
- Approval is bound to the stored packet record and never sends anything.
- Reserved credits move to used on approval and are released on rejection.
- Packet API routes are available at `GET /api/packets` and
  `GET /api/packets/:id`.
- `/api/connectors` exposes a canonical metadata-only preview catalog.
- Customer-facing plan metadata now describes support review packets,
  reviewer capacity, history, and automatic-send policy.

### Runtime hardening

- Input bounds, unsafe-key rejection, atomic JSON writes, ETags,
  idempotency, bounded output, static-file allowlisting, security headers,
  request timeouts, and loopback-only startup remain enabled.
- Executor receipt retry bounds are corrected.
- Connector risk/effect normalization accepts the authoritative catalog fields.
- The browser uses one consistent budget value in local and adapter-backed
  paths and waits for asynchronous run settlement longer than one event loop
  turn.
- An opt-in `MAKEEASE_AUTH_MODE=required` runtime path provides register,
  login, logout, session-cookie, workspace-bound session, and CSRF checks. Its
  local `data/auth.json` store is a transition/test boundary; production must
  move users, sessions, and memberships into the tenant database.

## Values you must add before a live deployment

Keep these values outside source control and outside browser storage:

```text
DATABASE_URL
SESSION_SECRET
CSRF_SECRET
KMS_KEY_ID
SECRET_STORE_URL
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
GMAIL_REDIRECT_URI
QUEUE_URL
OBJECT_STORAGE_BUCKET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_SUPPORT_PRICE_ID
STRIPE_TEAM_PRICE_ID
```

The placeholders are listed in `.env.example`. Replace each placeholder with a
secret-manager reference or deployment secret. Do not paste real values into
`data/workspace.json`, `README.md`, fixtures, logs, or the UI.

## Live Gmail boundary to implement

The first live connector should expose only:

1. OAuth with a validated state/nonce and the smallest practical read scope.
2. One workspace-owned Gmail inbox or label.
3. Thread/message cursoring and duplicate suppression.
4. Read-only source ingestion into versioned evidence.
5. Exact-payload draft creation after approval.
6. Gmail readback confirming the draft ID and thread ID.
7. Disconnect, revoke, refresh, health, timeout, and reauthorization states.

There must be no send capability in the first live release. A Gmail draft
receipt is not a customer delivery receipt.

## Required production services

The JSON adapter should be replaced by:

- PostgreSQL with organization/workspace authorization and migrations;
- a durable queue with worker leases and restart recovery;
- an outbox for provider-bound commands;
- a secret broker backed by KMS/Vault;
- encrypted object storage for large evidence artifacts;
- append-only audit and usage/ledger tables;
- signed billing webhook ingestion and reconciliation;
- monitoring for stale reservations, duplicate events, failed webhooks,
  unknown provider outcomes, and negative/reconciled balances.

Every run must retain the exact workflow revision, policy/context revision,
model/prompt route, packet digest, reviewer decision, usage settlement, and
provider receipt or explicit unknown outcome.

## Release gates

Do not change the deployment mode from `sandbox` until all of these are true:

- authenticated sessions and workspace membership are enforced;
- CSRF and role checks protect browser writes;
- client-controlled workspace snapshots cannot alter server-owned state;
- PostgreSQL transactions own reservations, approvals, idempotency, and ledger;
- Gmail OAuth is tested for scope, revoke, refresh, and tenant isolation;
- worker recovery and ambiguous provider outcomes are tested;
- model outputs pass structured validation and locked clean/red-team suites;
- billing webhooks are signed, deduplicated, and reconciled;
- exports are authenticated, redacted, encrypted, and audited;
- backups, restore drills, retention, deletion, pause, and incident runbooks
  are operational.

Until those gates are complete, the product copy must continue to say **Local
preview** and the server must continue to report `externalSideEffects: false`.
