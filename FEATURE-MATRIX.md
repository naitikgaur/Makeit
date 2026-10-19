# MakeEase feature matrix

This matrix separates what a reviewer can exercise in the checked-in local
sandbox from what the first production launch must provide. “Target” is a
prerequisite, not evidence that the repository implements it. The companion
[`COMPETITOR-V1-PLAN.md`](COMPETITOR-V1-PLAN.md) explains the ten competitor
benchmark lenses and the narrower superiority-v1 claim boundary.

| Capability | Local sandbox now | Production launch target | Status / evidence needed |
| --- | --- | --- | --- |
| Product job | Four local templates and a generic bounded workflow shell | One Gmail support triage → grounded draft → human review flow | Narrow the public surface and validate repeated weekly use |
| Workflow setup | Create/edit local workflow records through the adapter, choose a template/model label, set a demo budget and review flag, activate/pause | Versioned support workflow with immutable revisions, scoped trigger, policy, and publish/pause lifecycle | Durable server authority and contract tests |
| Test execution | Manual deterministic local test; bounded queued run, atomic reservation, persisted status, and retry of failed sandbox runs; output is labeled simulation | Durable queued run with bounded model/connector work, retries, cancellation, and recovery | Queue, worker, run state machine, and operational telemetry |
| AI | `lib/ai.js` provides a deterministic local mock contract; browser output is local simulation | Governed managed model route with provider usage, prompt/version records, evaluation gates, and cost limits | Provider adapter, context service, eval results, and usage settlement |
| Knowledge/context | Add and remove local reference text; browser search/display | Approved policy/product records with provenance, freshness, ACLs, deletion, and bounded retrieval | Durable knowledge store and source-level evidence |
| Review/approval | Local adapter approve/reject decisions settle reserved credits, ledger entries, audit events, and immutable run history; UI says no external effect | Action-scoped approval bound to exact payload, policy/version, approver, expiry, and idempotency key | Authenticated reviewer authority and durable audit receipt |
| Connections | Gmail/Slack/GitHub/Notion/Stripe/Linear preview buttons change local state only | One least-privilege Gmail OAuth connection for one inbox/label; health, disconnect, revoke, and draft-write verification | OAuth, secret broker, connector health, and draft receipt |
| Customer-facing send | Not available; approval is internal completion only | Still not automatic; reviewer sends from Gmail. Draft save is allowed only after verified approval and connection scope | Explicit product policy and provider readback |
| External effects | None; no provider/network action from the UI | No automatic send/refund/deploy/code/access/money action at launch | Side-effect policy tests must remain zero for sandbox |
| Credits/usage | Adapter-owned numbers, atomic reservations, consume/release ledger events, plan switches, and explicit sandbox top-ups; no payment | Customer-visible prepared-thread allowance plus server-managed reservation/consume/release ledger and hard cap | Provider reconciliation and finance controls |
| Billing | Static plan display and local top-up/plan simulation; no card or checkout | Verified payment provider, price book, webhook inbox, invoice/refund/chargeback state, and tax policy | `LEDGER-CONTROLS.md` gates |
| Identity/tenancy | No sign-in in the local adapter; one demo tenant/workspace and loopback-only access | Authenticated org/workspace/environment tenancy, roles, CSRF/session protections, and cross-tenant tests | Production auth and storage boundary |
| Persistence | Core workflow/run/approval/knowledge records use the adapter JSON file; browser `localStorage` is fallback/preview state | Durable relational storage with migrations, transactions, row-level authorization, and backups | PostgreSQL-compatible implementation and restore drill |
| Audit/history | Local activity, persisted run/review history, append-style audit/ledger records, retry lineage, and JSON export; disposable demo state | Append-only, tenant-scoped audit/run evidence with redaction, retention, and export | Immutable event store and audit access controls |
| Cost/risk controls | Visible demo budget and local no-side-effect notice | Preflight estimate, atomic reservation, action/connector budget, hard stop, alerting, and emergency pause | Ledger, policy, and incident tests |
| Export/reset | Export a local workspace JSON; reset browser demo with `window.MakeEase.reset()` | Scoped, redacted, versioned export; documented deletion/retention and recovery | Security review and data lifecycle evidence |
| Operations | One local Node process; loopback health endpoint; serialized JSON writes; bounded sandbox queue; persisted idempotency records; failed-run retry | Separate control/execution planes, durable queue, worker leases, monitoring, SLOs, and replay/dead-letter handling | Production topology and runbooks |
| Security | Input bounds, secret-like field rejection, static path checks, security headers, no external effects | Vault/KMS secret references, egress policy, tenant isolation, threat testing, incident response, and compliance decisions | `RUNTIME-SECURITY.md` production gates |
| Evaluation | Local contract tests and eight synthetic seed cases; no model-quality score | Locked clean/red-team suites, groundedness, approval safety, latency, cost, and regression release gates | `AI-EVALUATION.md` thresholds and reports |

## Reading rule

Only the “Local sandbox now” column describes current repository behavior. The production column is the minimum shape of a credible paid launch. A target row must not be represented in sales copy, pricing, screenshots, or customer commitments until its evidence is recorded.

## Superiority-v1 readout

The local surface is strongest as a **governed review path**, not as a breadth
or parity claim. Across the ten lenses, the repository now gives a reviewer a
consistent pattern:

1. start from a bounded recipe rather than an unconstrained agent;
2. show the intended steps, review policy, and demo budget before a test;
3. keep local context, deterministic output, uncertainty/safety boundaries, and
   the original request together;
4. stop at an explicit internal decision instead of implying a send, refund,
   deployment, or other write;
5. retain run, retry, idempotency, audit, ledger, and export records; and
6. label connections, models, workers, plans, top-ups, and usage as preview or
   sandbox state.

This is the local product's demonstrated differentiation hypothesis. It does
not establish app-catalog breadth, support/helpdesk depth, ecommerce actions,
CRM-native execution, RPA, provider quality, customer savings, or production
reliability. Those remain preview-only or production targets until the evidence
listed in [`ACCEPTANCE-CHECKLIST.md`](ACCEPTANCE-CHECKLIST.md) exists.
