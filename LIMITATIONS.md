# MakeEase limitations and honest claims

## What this repository is

MakeEase in this repository is a local, dependency-free product shell plus a loopback Node adapter. It is suitable for a controlled demo with synthetic data. It is not an internet-facing service, production tenant, payment system, connected support inbox, or autonomous agent.

## The superiority-v1 boundary

`superiority-v1` describes a product surface and an evidence plan, not a claim
that MakeEase is better than all ten researched competitors. The intended
differentiation is narrower: make a small team's support workflow more
reviewable, bounded, and auditable. The ten benchmark lenses and their
demonstrates-now/preview-only/production-proof status are documented in
[`COMPETITOR-V1-PLAN.md`](COMPETITOR-V1-PLAN.md).

The local product can demonstrate a coherent control experience—recipe,
context, deterministic test, review, budget, run history, audit/ledger, retry,
idempotency, and explicit no-side-effect language. It cannot demonstrate a
live connector catalog, support/helpdesk, ecommerce action system, CRM-native
agent, RPA fleet, real model quality, customer ROI, or production operations.
Treat a local control primitive as evidence of design and contract behavior,
not evidence that a competitor category has been surpassed.

## Current limitations

### No live integrations

Connection records and buttons are local preview state. The adapter normalizes integration records to `not_configured`; it cannot authenticate Gmail, Slack, GitHub, Notion, Stripe, or Linear, read a mailbox, save a draft, or verify a provider action.

### No live AI in the browser flow

The browser test path records deterministic local output and explicitly says that no provider was contacted. `lib/ai.js` is a standalone deterministic mock contract; its estimates are demo credits marked `not_charged`, not model usage, quality, calibration, or a bill.

### Approval is not execution

Approving a local item records an internal decision and may settle local demo values. It does not send a message, issue a refund, create a pull request, deploy code, change access, or write to another service. A future production approval must be bound to an exact action and provider receipt; approval alone must never be described as success.

### Demo credits are not money

Displayed plans, limits, reserved/used values, top-ups, and plan switches are local simulation. They are not subscriptions, invoices, payment-provider events, revenue, a customer entitlement, or a promise of capacity. The JSON workspace is mutable and not an append-only financial ledger.

### No production identity or tenancy

The local adapter has no authenticated user/session boundary and uses one loopback demo scope. Browser storage and the JSON file are not encrypted secret storage, row-level tenant isolation, or an audit authority. Do not expose the process to a LAN, port forward, reverse proxy, or shared development machine.

### Local persistence is disposable

Core workflow, run, approval, knowledge, audit, and credit-ledger records use `data/workspace.json` when the loopback adapter is running. Browser-only preferences and the offline fallback use `localStorage`. Both stores can be changed or removed by the local operator. Seeded names, workflows, activity, approvals, connections, and usage are synthetic display records, not customer history or operational evidence.

### API coverage is intentionally bounded

The local adapter exposes health, bootstrap, plans, workspace, workflow/run, retry, approval, knowledge, usage, audit, ledger, export, and explicit sandbox billing routes. It does not implement production authentication, OAuth, checkout, payment webhooks, or live provider actions. The browser can fall back to its local demo when the adapter is unavailable.

### No production operations

The local adapter has a bounded in-process sandbox queue and manual retry record, but there is no durable distributed worker, database migration boundary, provider retry/reconciliation service, secret broker, egress gateway, SLO, backup/restore process, retention job, or incident response system in this repository.

### Comparative proof is not implemented

The ten competitor briefs are research inputs and design benchmarks. There is no
controlled head-to-head usability study, feature-parity inventory, price study,
quality benchmark, or production telemetry that supports a claim of universal
superiority. A local green test suite demonstrates repository invariants only.

## Claims that are allowed in a local demo

- “MakeEase demonstrates a reviewable local workflow experience.”
- “This test is a deterministic sandbox simulation.”
- “The demo shows bounded budgets, evidence-oriented records, review states, and explicit no-side-effect behavior.”
- “The local adapter runs on loopback and persists disposable demo state.”
- “The target launch is approval-first support operations for small B2B SaaS teams.”
- “The superiority-v1 surface demonstrates a narrower governed, reviewable
  support-workflow hypothesis in a local sandbox.”

## Claims that are not allowed yet

- “Gmail is connected,” “a customer was contacted,” “a refund was issued,” or “a deployment completed.”
- “AI accuracy,” “groundedness,” “time saved,” “resolution rate,” “customer ROI,” or “production reliability” based on the fixture or mock output.
- “SOC 2,” “enterprise-ready,” “secure multi-tenant SaaS,” “encrypted secrets,” or “compliant” without the relevant implementation, scope, and evidence.
- “No hallucinations,” “zero risk,” “exactly once,” “fully autonomous,” or “cheapest.”
- “Credits were purchased,” “revenue was recognized,” “a card was charged,” or “a paid plan is active.”
- “All ten competitors are beaten.” Competitor research supports a narrower differentiation around governed, reviewable support work—not universal feature or price superiority.
- “The ten benchmark lenses are complete in production.” Several are only local
  control demonstrations or explicit future targets; the detailed status is in
  [`COMPETITOR-V1-PLAN.md`](COMPETITOR-V1-PLAN.md).

## Minimum production prerequisites

Before a live paid claim, implement and verify authenticated tenancy, durable storage, Gmail OAuth and secret references, a durable execution plane, a real model route and evaluation set, action-scoped approvals, server-owned usage/billing ledgers, verified payment webhooks, audit/export/retention controls, monitoring/backups/recovery, and security testing. See [`COMPETITOR-V1-PLAN.md`](COMPETITOR-V1-PLAN.md), [`LAUNCH-SCOPE.md`](LAUNCH-SCOPE.md), [`ENVIRONMENT.md`](ENVIRONMENT.md), [`ACCEPTANCE-CHECKLIST.md`](ACCEPTANCE-CHECKLIST.md), [`RUNTIME-SECURITY.md`](RUNTIME-SECURITY.md), and [`LEDGER-CONTROLS.md`](LEDGER-CONTROLS.md).
