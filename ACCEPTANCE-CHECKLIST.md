# MakeEase launch acceptance checklist

Use this checklist to decide what can be demonstrated locally and what must be true before a paid production launch. Mark an item complete only with a linked artifact, test output, or customer evidence.

## A. Local sandbox release check

### Runtime and documentation

- [ ] `node --version` reports a supported Node.js LTS release.
- [ ] `npm start` serves the UI at `http://127.0.0.1:3000/`.
- [ ] `GET /api/health` reports the local adapter, sandbox mode, ready storage, and `externalSideEffects: false`.
- [ ] The server rejects a non-loopback host.
- [ ] The top bar and notices say **Local preview** or equivalent.
- [ ] `README.md`, `SETUP-RUN.md`, `ENVIRONMENT.md`, and `LIMITATIONS.md` agree that the product is local/demo-only.
- [ ] All demo inputs and screenshots use synthetic or redacted content.

### Core local journey

- [ ] The browser opens from the documented command without a 404 bootstrap failure.
- [ ] A reviewer can open the **Customer support triage** workflow (`customer-support-triage`).
- [ ] A reviewer can add and remove a local knowledge record.
- [ ] A reviewer can run a local test with a visible budget limit.
- [ ] The output states that it is a deterministic/local simulation and no provider was contacted.
- [ ] A review-required run appears in **Review queue**.
- [ ] Approving records an internal decision and explicitly says nothing was sent.
- [ ] Rejecting records a rejection and releases the local reserved value in the demo snapshot.
- [ ] Run history shows the input, output, status, local simulation label, and no-side-effect notice.
- [ ] A failed sandbox run exposes a retry action that creates a new linked run without rewriting the original failure.
- [ ] Repeating the same retry idempotency key returns the same retry record without a second reservation.
- [ ] Export produces a local JSON snapshot with no secrets.
- [ ] `window.MakeEase.reset()` clears browser-local changes and reloads the demo.

### Local safety and checks

- [ ] `npm test` passes.
- [ ] `npm run smoke` passes.
- [ ] `node --check` passes for the server, UI, and `lib/` JavaScript files.
- [ ] No real credential or customer data is present in `.env.example`, fixtures, logs, or `data/workspace.json`.
- [ ] A reviewer understands that connection previews, plans, top-ups, approvals, and usage are not live facts.

## B. Paid production launch gate

### Product and customer outcome

- [ ] The first paid workflow is one scoped Gmail inbox/label → triage → grounded draft → human review.
- [ ] ICP, trigger events, exclusions, reviewer role, and escalation categories are documented.
- [ ] Activation is measured as `first_approved_support_draft`, not account creation or connection alone.
- [ ] At least one paid pilot has a baseline for review time, approval/edit/reject/escalation, failure rate, and prepared packets.
- [ ] The pilot buyer explicitly accepts approval-before-send and the emergency pause process.

### Identity, tenancy, and data

- [ ] Authenticated users resolve to organization/workspace/environment context server-side.
- [ ] Cross-tenant read/write, stale session, CSRF, export, webhook, and worker tests pass.
- [ ] Durable relational storage, migrations, transactions, backups, restore, and deletion/retention jobs are operational.
- [ ] Browser payloads and workflow definitions contain only secret references, never secret values.

### Gmail and execution

- [ ] Gmail OAuth requests the smallest practical scope and has tested revoke/disconnect handling.
- [ ] Source thread/message IDs and the latest snapshot are deduplicated.
- [ ] A production run is durable across HTTP disconnect, worker restart, timeout, retry, and provider uncertainty.
- [ ] Model and connector work has bounded time, attempts, output, concurrency, and cost.
- [ ] The system can pause new work by workspace, workflow, connector, and incident.
- [ ] Approved draft-save operations are idempotent, exact-payload bound, and verified by provider readback.
- [ ] Automatic customer-facing send is disabled by policy.

### Approval, evidence, and AI quality

- [ ] Every draft displays source/context provenance, freshness, uncertainty, model/prompt versions, and the policy decision.
- [ ] Approval is bound to the exact action, target, payload, revision, approver, expiry, and idempotency key.
- [ ] An approval cannot be replayed, broadened, or presented as a provider success receipt.
- [ ] Clean and red-team evaluation suites meet the applicable quality, groundedness, injection, approval-bypass, latency, and budget gates in `AI-EVALUATION.md`.
- [ ] Any critical safety regression blocks release and has an owner and remediation record.

### Usage, billing, and operations

- [ ] Customer-facing usage is defined as prepared support review packets, with retry/deduplication/cap rules published.
- [ ] Server-managed reserve/consume/release events reconcile exactly once and remain separate from payment events.
- [ ] A versioned price book maps to provider IDs; browser values cannot grant plans, capacity, or credits.
- [ ] Payment webhooks verify signatures, persist an inbox, handle replay/out-of-order events, and grant entitlements only after verified evidence.
- [ ] Invoice, tax, refund, chargeback, revenue-recognition, and retention decisions are approved for the launch market.
- [ ] Monitoring, alerting, support escalation, incident response, backup restore, and run replay are exercised.
- [ ] Redacted audit/export data can reconstruct what was authorized, what ran, what was reviewed, and what provider receipt/failure occurred.

## Go/no-go rule

The local section may support a sandbox demo when its checks pass. The paid production section is a release gate: one missing P0 identity, tenancy, secret, execution, approval, billing, or evidence control means **do not enable live paid use**. A polished UI or green local smoke test cannot waive a missing production boundary.
