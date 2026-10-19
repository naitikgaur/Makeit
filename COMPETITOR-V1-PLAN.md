# MakeEase superiority-v1 surface

**Status:** local product and launch documentation; not a competitive certification

`superiority-v1` is the name for a focused product surface and proof plan. It
does not mean that MakeEase is better than every competitor, has feature parity,
or is ready to run a customer's live operations. The defensible v1 hypothesis is
narrower:

> **For a small B2B SaaS team, MakeEase can make reviewable support work easier
> to understand, safer to bound, and easier to audit than a general-purpose or
> opaque automation path.**

The local repository demonstrates the control experience for that hypothesis.
It does not demonstrate live provider quality, customer outcomes, or production
reliability. The ten benchmark lenses below come from the dated competitor
briefs in [`research/competitors/`](research/competitors/) and the decision in
[`COMPETITIVE-DECISION.md`](COMPETITIVE-DECISION.md). They are comparison lenses,
not claims that the referenced products have the same scope or weaknesses.

## Status vocabulary

- **Demonstrates now** means a reviewer can exercise the behavior in the
  loopback adapter, browser demo, or deterministic local contract checks.
- **Preview-only** means a button, label, record, preference, catalog entry, or
  simulation changes local state but does not authenticate, contact, charge, or
  modify an external system.
- **Production proof required** is the implementation and evidence needed before
  the behavior can be sold or described as live. A target is not evidence merely
  because it appears in a roadmap or API contract.

The browser and adapter use the same honest boundary: local sandbox records,
not provider receipts. The standalone AI and executor modules add deterministic
contract evidence for evidence, uncertainty, typed action policy, quarantine,
budgets, retries, receipts, and idempotency; they are not a live model or
connector route.

## Ten competitor benchmark lenses

| # | Reference benchmark | Dimension being tested | What MakeEase demonstrates now | Preview-only or absent now | Production proof required |
| --- | --- | --- | --- | --- | --- |
| 1 | **Zapier** | Progressive-disclosure setup and connector breadth | A small recipe library starts with a bounded job; the workflow studio presents **choose a recipe → set guardrails → test and inspect**. The support recipe is recommended instead of presenting an empty canvas. | There is no app marketplace, OAuth connection, managed credential, trigger catalog, or breadth claim. Connection cards are local previews and remain `not_configured` in the adapter. | Publish typed capability manifests with event semantics, scopes, idempotency, sample payloads, cost, and health; add the first least-privilege connector without turning catalog size into the product promise. |
| 2 | **Make** | Visual composition, inspectable steps, and recovery | Each recipe has named bounded steps, a visible execution blueprint, run history, a linked failed-run retry, and preserved original records. | This is not a general visual canvas: there are no arbitrary branches, iterators, aggregators, schedules, or distributed scenario recovery. | Version typed workflow nodes and immutable revisions; add durable queue/worker recovery, cancellation, retry policy, and step-level receipts before expanding composition. |
| 3 | **n8n** | Technical control, portability, self-hosting, and extensibility | The project is dependency-free Node.js, loopback-only, inspectable in source, persisted in a validated JSON store, and exportable as JSON. The API has bounded payloads and explicit routes. | Local portability is not a self-hosted production edition. There is no custom-node marketplace, arbitrary code step, multi-user deployment, distributed worker topology, or operational support commitment. | Keep an exportable workflow contract; add authenticated tenancy, relational migrations, connector/HTTP/MCP allowlists, isolated workers, secret references, monitoring, and documented deployment support. |
| 4 | **Power Automate** | Governance, approvals, data boundaries, and ecosystem administration | Review policy, safe-mode intent, visible budgets, local audit events, credit-ledger entries, loopback restrictions, security headers, and no-side-effect notices make the intended boundary visible in one surface. | Preferences are not identity, RBAC, DLP, Microsoft 365/Dataverse permissions, SSO, compliance evidence, or tenant isolation. The local adapter has no sign-in. | Resolve user → organization → workspace → environment server-side; implement roles, policy evaluation, connector/data-loss rules, secret vault references, CSRF/session controls, and cross-tenant tests. |
| 5 | **Intercom Fin** | Support lifecycle: context, test, review, handoff, and measurement | The support-first path connects a local reference, bounded test, prepared output, review queue, decision history, run history, and local Insights view. The human decision is explicit. | There is no connected inbox, customer-facing channel, train/test/deploy lifecycle, real handoff, verified resolution, or customer outcome metric. | Ship one scoped Gmail inbox/label path; version and approve policy/context, run a governed model evaluation, save an approved draft only after checks, and measure reviewed outcomes. |
| 6 | **Zendesk** | Support workspace, routing, and agent context | The command center, support recipe, review inbox, evidence card, workflow history, and export give one operator a compact review surface. | MakeEase is not a ticketing/helpdesk replacement and has no omnichannel intake, SLA/skills routing, agent status, macros, or external ticket action. | Integrate the first support source with read scope, deduplication, escalation categories, reviewer roles, durable context, routing policy, and provider readback; keep the wedge narrower than a helpdesk. |
| 7 | **Gorgias** | Ecommerce/CX specialization and irreversible commerce actions | The local support recipe can hold a synthetic refund/escalation policy and make a reviewable internal plan. It never pretends to refund or change an order. | There is no Shopify or other storefront connection, order/customer context, return/refund action, commerce exception queue, or revenue attribution. | Treat CommerceOps as a later package: typed order/refund capabilities, amount and reason limits, exact-payload approval, idempotency, provider readback, reconciliation, and separate finance evidence. |
| 8 | **Lindy** | General AI coworker delegation and write-permission clarity | MakeEase uses named workflows, explicit review, bounded budgets, deterministic local output, and prompt-injection quarantine in the local AI contract instead of claiming an autonomous coworker. | Workers are local configuration records; they do not run in the background. There is no Slack/DM coworker, ad hoc delegation, memory sync, browser automation, or live write permission. | Add a typed action catalog with per-action scopes, data crossings, approval expiry, authenticated approver authority, and an executor identity. Keep unattended work opt-in and separately observable. |
| 9 | **Salesforce Agentforce** | Native actions, testing, deterministic policy, and observability | Provider-neutral local contracts expose evidence, uncertainty, action policy, approval state, deterministic evaluation digests, receipts, audit, ledger, replay metadata, and idempotency checks. | No CRM/Data 360, real model, provider usage, customer data, live action, or independent quality score is present. Local heuristic confidence is explicitly not a probability. | Add a managed model route, prompt/context/model versions, locked clean and red-team evaluations, provider-reported usage, action receipts, and a neutral export format; release only when the gates in [`AI-EVALUATION.md`](AI-EVALUATION.md) pass. |
| 10 | **UiPath** | RPA, durable orchestration, and human/robot execution boundaries | The adapter has a bounded in-process queue, timeout/retry handling, restart recovery for queued/running sandbox records, idempotent mutations, and a clear no-external-action receipt. | There are no robots, desktop/browser control, unattended sessions, BPMN/case orchestration, machine credentials, or kill switch for a live executor. | Build a durable execution plane with isolated workers, leases, pause/cancel/kill controls, executor identity, resource limits, and post-action verification. Prefer typed/API capabilities; classify UI/RPA as a higher-risk later tier. |

### How to read the table

The local column describes observed behavior, not a score. A strong row means
MakeEase has a clear design direction or a small local proof, not that it wins
the competitor's mature category. For example, local run recovery is useful
evidence for the control model, but it is not equivalent to a distributed
worker fleet; a review queue is useful evidence for human control, but it is
not a helpdesk; and a connection preview is not a connection.

## What the local superiority-v1 surface demonstrates

Run the supported path from this directory:

```powershell
npm start
```

Open <http://127.0.0.1:3000/> and use synthetic or redacted text. A reviewer can
exercise the following vertical slice:

1. Open the support-first command center and choose the **Customer support
   triage** recipe.
2. Add a local policy or product reference in **Knowledge**.
3. Configure a workflow with a visible per-run demo-credit cap and human review.
4. Submit a bounded local test and inspect the captured input, deterministic
   output, steps, status, and no-provider/no-side-effect notice.
5. Inspect the **Review queue**, approve or reject internally, and observe the
   reservation/settlement behavior.
6. Open **Run history**, **Insights**, local audit/credit-ledger panels, and the
   JSON export. A failed sandbox record can be retried as a new linked record
   without rewriting the original failure.
7. Open **Connections** and **Plans & usage** to see the preview boundary. The
   catalog and plan buttons are safe local simulations; they do not authorize an
   account, process a payment, or call a provider.

The local adapter also demonstrates bounded JSON validation, atomic persistence,
loopback-only serving, security headers, durable local idempotency records,
approval transitions, audit/ledger evidence, and explicit sandbox billing
simulation routes. These are local control behaviors, not production security,
financial, or tenant guarantees.

## What remains preview-only

The following labels must remain visible in demos, screenshots, and launch
copy:

- **Connections:** Gmail, Slack, GitHub, Notion, Stripe, and Linear records are
  preview cards. They have no OAuth, credentials, account access, network call,
  provider health, or external write.
- **AI/models:** browser and adapter runs are deterministic sandbox output. The
  local AI contract is a mock; no provider key or environment setting makes
  this adapter live. Estimates are demo credits marked not charged.
- **Workers:** a worker is a workflow configuration record, not a background
  agent or hosted execution service.
- **Plans and usage:** plan values, top-ups, reservations, and ledger entries
  are local demo state. No card, subscription, invoice, payment webhook,
  revenue, or entitlement exists.
- **Approvals and evidence:** an approval records an internal decision. It is
  not a Gmail send, refund, deployment, pull request, access change, or
  provider receipt. Local evidence proves what the sandbox recorded only.
- **Identity and storage:** the one demo workspace, owner label, JSON file,
  browser fallback, and local controls are not authenticated tenancy,
  encrypted secret storage, or an append-only production audit authority.

## Local acceptance criteria

Call the superiority-v1 surface ready for a local review only when all of these
are observable:

- the UI loads from `npm start` on loopback and identifies the local adapter or
  browser-only fallback;
- the support recipe can be created/opened, activated or paused, run with a
  visible cap, and inspected from input through output;
- the output identifies deterministic sandbox behavior and says that no AI
  provider or external action was used;
- a review-required run enters the queue, and approve/reject changes only the
  local record while preserving the boundary statement;
- reservations, settlement/release, audit, ledger, and idempotency records are
  inspectable; a failed run retries as a linked new record;
- local references can be added, searched/displayed, and removed without being
  treated as executable instructions;
- connection previews, model labels, plans, top-ups, and usage are visibly
  labeled as simulations or local records;
- export contains the local snapshot and no credential-like values; and
- `npm test` and `npm run smoke` pass with synthetic fixtures only.

These criteria establish a truthful demo. They do not waive the paid-launch
gate in [`ACCEPTANCE-CHECKLIST.md`](ACCEPTANCE-CHECKLIST.md).

## Production path

The shortest credible path is the support wedge, not ten simultaneous parity
projects:

1. **Prove the local control experience.** Keep the recipe, context, review,
   evidence, budget, and no-side-effect language stable. Use the local checks
   as contract evidence, not as customer outcome metrics.
2. **Build the control plane.** Add authenticated org/workspace/environment
   tenancy, durable relational storage, versioned workflow/policy/context
   records, role checks, CSRF/session protections, redacted export, retention,
   and a server-owned audit model.
3. **Add one connector.** Implement least-privilege Gmail OAuth for one inbox or
   label, revoke/disconnect handling, source deduplication, secret references,
   provider health, and a draft-save operation with exact-payload approval and
   provider readback. Keep automatic send disabled.
4. **Add governed execution and AI evidence.** Introduce a durable queue and
   worker recovery model, a managed model route, prompt/context versions,
   locked clean/red-team evaluation sets, bounded retries/timeouts, measured
   usage, and the release thresholds in [`AI-EVALUATION.md`](AI-EVALUATION.md).
5. **Add commercial controls.** Define prepared support review packets as the
   customer unit; implement server-owned reserve/consume/release accounting,
   verified payment webhooks, price-book/version controls, tax/refund/
   chargeback decisions, monitoring, backup/restore, and incident pause.
6. **Earn expansion.** Measure `first_approved_support_draft`, approval/edit/
   reject/escalation rates, latency, provider failures, cost per packet, cap
   hits, pilot conversion, and retention. Add ecommerce, CRM, RPA, or broader
   connector work only after a repeated customer need and an action-specific
   safety/evidence plan.

The detailed product wedge and go/no-go requirements are in
[`LAUNCH-SCOPE.md`](LAUNCH-SCOPE.md). The current repository remains a local
sandbox until those production gates have real implementation and evidence.

## Claim rules

### Allowed now

- “MakeEase demonstrates an approval-first, reviewable local support workflow.”
- “The local surface makes budgets, evidence, review state, audit, and
  no-side-effect behavior visible.”
- “The superiority-v1 hypothesis is narrower governed support work, not overall
  competitor superiority.”

### Not allowed now

- “MakeEase beats Zapier, Make, n8n, Power Automate, Intercom, Zendesk,
  Gorgias, Lindy, Agentforce, or UiPath.”
- “Gmail is connected,” “the model contacted a provider,” “a customer was
  contacted,” “a refund was issued,” or “a deployment completed.”
- “The demo proves AI accuracy, groundedness, savings, ROI, uptime, security,
  compliance, or production reliability.”
- “The catalog, plan, top-up, approval, or local ledger is a live entitlement,
  payment, provider receipt, or financial record.”

For the broader prohibited-claims list, see
[`LIMITATIONS.md`](LIMITATIONS.md). For the demo talk track, see
[`DEMO-SCRIPT.md`](DEMO-SCRIPT.md).
