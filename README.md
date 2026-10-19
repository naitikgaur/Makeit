# MakeEase v1 launch candidate

MakeEase is a **local sandbox and product-contract prototype** for approval-first support operations. It is useful for product validation, safe workflow demos, and contract work. It is **not a production SaaS deployment and must not be sold as one**.

The launch position is deliberately narrow:

> **Reviewable AI support operations for small B2B SaaS teams.**

The intended production job is to turn an incoming support thread into a policy-grounded triage result, draft reply, and escalation recommendation that a human reviews before any customer-facing action. The repository demonstrates the control experience locally; it does not yet provide the production Gmail, identity, billing, tenancy, or worker infrastructure needed to deliver that job live.

The current launch surface is called **superiority-v1**. This is a narrow
differentiation hypothesis—reviewable support work with visible evidence,
budgets, approvals, and no-side-effect boundaries—not a claim that MakeEase
beats every competitor. The ten benchmark lenses, local evidence, preview-only
states, acceptance criteria, and production path are in
[`COMPETITOR-V1-PLAN.md`](COMPETITOR-V1-PLAN.md).

## Start the local sandbox

### Requirements

- A current Node.js LTS release (Node 20+ recommended).
- No package installation is required; the project is dependency-free.

Check the runtime and start the loopback-only adapter:

```powershell
node --version
npm --version
npm start
```

Open <http://127.0.0.1:3000/>. Stop the process with `Ctrl+C`.

The local adapter serves the browser UI and these local JSON routes:

- `GET /api/health`
- `GET /api/bootstrap`
- `GET /api/plans`
- `GET /api/connectors`, `GET /api/packets`, and `GET /api/packets/:id`
- `GET /api/workspace`
- `PUT`/`PATCH /api/workspace` (validated local adapter contract for workspace profile fields)
- `GET|POST /api/workflows`, `PATCH /api/workflows/:id`, and `POST /api/workflows/:id/run`
- `GET /api/runs`, `GET /api/runs/:id`, and safe `POST /api/runs/:id/retry` for failed sandbox records
- `GET /api/approvals`, `POST /api/approvals/:id/decision`
- `GET /api/usage`, `GET /api/ledger`, `GET /api/audit`, and `GET /api/export`
- `GET|POST /api/knowledge`, `DELETE /api/knowledge/:id`
- Sandbox-only top-up and plan simulation routes under `/api/billing/`

The adapter is intentionally bound to `127.0.0.1` (or another loopback name). It rejects a non-loopback `HOST` because it has no production authentication or tenant boundary.

For an authenticated local deployment rehearsal, set `MAKEEASE_AUTH_MODE=required` before starting. That enables the session-cookie, workspace-bound session, login, registration, and CSRF path; the browser will show the sign-in screen. The local auth JSON is a rehearsal boundary only and must move to the production tenant database before public deployment.

### Browser-only fallback

If the adapter is unavailable, the UI offers **Open browser demo**. It uses a synthetic snapshot and browser `localStorage`; it does not make the product live. A static server can be used when needed:

```powershell
npx --yes serve . -l 8080
```

Then open <http://127.0.0.1:8080/>. Use `npm start` for the supported full local path.

## What the local sandbox demonstrates

- A workspace overview, workflows, review queue, run history, knowledge records, settings, plans, usage, audit history, ledger, and JSON export.
- Four bounded starting templates: customer support triage, new lead follow-up, weekly business briefing, and engineering issue assistant.
- Manual local test runs with deterministic simulated output, durable local-adapter records, idempotency, bounded credit reservations, visible credit limits, and linked retry history for failed sandbox runs.
- Structured support review packets with intent, urgency, missing facts, policy grounding, draft-only output, escalation, uncertainty, evidence, stable digests, and explicit no-send boundaries.
- Internal approval and rejection records. Approval is explicitly **not** a send, refund, deployment, pull request, or other external write.
- Connection previews for Gmail, Slack, GitHub, Notion, Stripe, and Linear. These change a local preview record only; they do not authorize an account or call a provider.
- Local plan switches and top-up simulations. They do not create a subscription, charge a card, or grant a financial entitlement.
- Core workflow/run/approval/knowledge records persist through the local adapter in `data/workspace.json`; browser-only preferences and the offline fallback use `localStorage`.

The standalone `lib/ai.js` module is a deterministic, dependency-free mock boundary documented in `AI-CONTRACT.md`. The current browser flow does not contact that mock as a hosted model, and no provider key enables live behavior in this local adapter.

## Superiority-v1: demonstrated versus preview-only

The local product demonstrates a consistent review path across the ten
benchmark lenses: choose a bounded recipe, add local context, set a visible
demo budget, run a deterministic test, inspect the request/output/steps,
record an internal approval or rejection, and retain run, retry, audit, ledger,
idempotency, and export evidence. The support-first recipe, review inbox,
workflow studio, Insights, and local controls make that path easy to inspect.

The following remain preview-only: Gmail/Slack/GitHub/Notion/Stripe/Linear
connection cards; model/provider labels; worker records; plan and top-up
values; and any approval, credit, audit, or export record as a live provider,
financial, identity, or customer-outcome fact. No connection authorizes an
account, no model call leaves the local boundary, and no approval sends,
refunds, deploys, or changes another service. The browser-only fallback has a
different browser-storage mode and is clearly labeled.

For the exact ten-lens comparison and the local/production acceptance criteria,
see [`COMPETITOR-V1-PLAN.md`](COMPETITOR-V1-PLAN.md). For the feature-by-feature
boundary, see [`FEATURE-MATRIX.md`](FEATURE-MATRIX.md) and
[`LIMITATIONS.md`](LIMITATIONS.md).

## Run the checks

```powershell
npm test
npm run smoke
```

`npm test` runs the server smoke checks, API contract tests, and local AI/executor tests. These checks validate local behavior; they do not prove production readiness, live provider quality, OAuth, payment processing, or multi-tenant isolation.

## Configuration and data hygiene

See [`ENVIRONMENT.md`](ENVIRONMENT.md) and [`.env.example`](.env.example) for the supported local variables and reserved future-provider names. `.env.example` contains no credentials and is reference-only; Node does not load it automatically.

For local demos:

- keep the server on loopback;
- use synthetic or redacted data only;
- never paste API keys, OAuth tokens, passwords, customer exports, or payment data into the UI, fixture, logs, or workspace JSON;
- treat `data/workspace.json` and browser storage as disposable demo state, not encrypted storage, a tenant database, a payment ledger, or an audit store.

## Launch artifact bundle

These files are the concise product and launch source of truth for this repository:

- [`LAUNCH-SCOPE.md`](LAUNCH-SCOPE.md) — launch job, ICP, target package, in/out scope, and production gates.
- [`V1-RELEASE.md`](V1-RELEASE.md) — current v1 launch-candidate capabilities, verification, and boundaries.
- [`FEATURE-MATRIX.md`](FEATURE-MATRIX.md) — local sandbox versus production launch capability matrix.
- [`COMPETITOR-V1-PLAN.md`](COMPETITOR-V1-PLAN.md) — ten competitor benchmark lenses, superiority-v1 evidence, acceptance criteria, and production path.
- [`LIMITATIONS.md`](LIMITATIONS.md) — user-facing limitations and prohibited claims.
- [`SETUP-RUN.md`](SETUP-RUN.md) — setup, first run, reset, troubleshooting, and verification steps.
- [`DEMO-SCRIPT.md`](DEMO-SCRIPT.md) — a truthful 7–10 minute demo path and talk track.
- [`ACCEPTANCE-CHECKLIST.md`](ACCEPTANCE-CHECKLIST.md) — local demo checks and paid-launch go/no-go gates.
- [`GO-TO-MARKET.md`](GO-TO-MARKET.md) — positioning, offer, qualification, proof, and initial sales motion.
- [`ENVIRONMENT.md`](ENVIRONMENT.md) — environment variables, safe defaults, and production configuration prerequisites.
- [`PRODUCTION-V1-IMPLEMENTATION.md`](PRODUCTION-V1-IMPLEMENTATION.md) — implemented v1 boundaries, required placeholders, live Gmail handoff, and production release gates.

## Production boundary

Before a live paid launch, the product needs authenticated organization/workspace tenancy, durable relational storage with authorization, real Gmail OAuth with least privilege, encrypted secret references, a durable queue and worker recovery model, a governed model provider, packet/usage accounting, verified billing webhooks, append-only audit evidence, monitoring/backups/restore, retention and deletion controls, and security/evaluation evidence. The target architecture and control requirements are described in `PLATFORM-ROADMAP.md`, `RUNTIME-SECURITY.md`, `LEDGER-CONTROLS.md`, `AI-CONTRACT.md`, and `AI-EVALUATION.md`.

Until those gates are met, the correct label is **local sandbox/demo only**. Seeded workflows, approvals, activity, connections, credits, plan values, and output text are synthetic or local records—not customer, revenue, savings, provider, or delivery evidence.

## Existing product and architecture references

- `PRODUCT-REVIEW.md` — product decision, ICP, activation, onboarding, and support wedge.
- `PRICING-FINAL-DECISION.md` — approved pricing hypothesis and launch package, explicitly conditional on production gates.
- `PLATFORM-ROADMAP.md` — target control plane, execution plane, AI plane, connector, policy, and deployment evolution.
- `API-CONTRACT.md` — target full-stack vocabulary and local contract boundaries.
- `DATABASE-SCHEMA.md` — reference relational schema and tenant-isolation design.
- `AI-CONTRACT.md` and `AI-EVALUATION.md` — provider-neutral AI boundary and synthetic evaluation plan.
- `PRICING-MODEL.md`, `LEDGER-CONTROLS.md`, and `BILLING-TAX-NOTES.md` — pricing assumptions and financial controls.
- `RUNTIME-SECURITY.md` — isolation, secrets, egress, sandbox, and audit requirements.
