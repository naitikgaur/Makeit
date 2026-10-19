# MakeEase v1 release note

**Release:** 1.0.0 local launch candidate  
**Product job:** approval-first support operations for small B2B SaaS teams  
**Runtime:** Node.js 20+ recommended; dependency-free; loopback-only

**Surface:** `superiority-v1` is a local proof surface for a narrow
governance-and-review differentiation hypothesis. It is not a claim of overall
competitor superiority or production readiness. See
[`COMPETITOR-V1-PLAN.md`](COMPETITOR-V1-PLAN.md) for the ten benchmark lenses,
evidence, acceptance criteria, and production path.

## What is launchable now

- A calm command center, workflow studio, review inbox, run history, Insights, Knowledge, Connections, Controls, Settings, and Plans & usage views.
- Four canonical recipes: customer support triage, new lead follow-up, weekly business briefing, and engineering issue assistant.
- Server-backed local workflow creation, activation/pause, bounded sandbox runs, polling, approval/rejection, knowledge add/remove, usage, ledger, audit, export, and explicit sandbox billing simulations.
- Atomic credit reservations and settlement, persisted idempotency records, audit/ledger evidence, retry lineage, and safe retry of failed sandbox runs.
- Typed AI/execution safety boundaries: evidence, abstention, prompt-injection quarantine, policy checks, bounded retries/timeouts, replay metadata, and no external side effects.
- Browser-only fallback when the local adapter is unavailable, clearly labeled as a different persistence mode.

## What superiority-v1 demonstrates

The release candidate now presents a coherent local control surface: a
support-first command center, recipe-driven workflow studio, visible run and
review states, local knowledge references, budget and reservation display,
run-history recovery, Insights, audit/credit-ledger evidence, JSON export, and
explicit connection/plan simulations. The local journey is:

> **choose a bounded recipe → add local context → run a deterministic test →
> inspect evidence → approve or reject internally → retain the record**

The competitive comparison is intentionally a set of ten lenses rather than a
scoreboard: Zapier (setup/breadth), Make (composition/recovery), n8n
(technical control), Power Automate (governance), Intercom Fin (support
lifecycle), Zendesk (support workspace), Gorgias (ecommerce CX), Lindy
(coworker delegation), Agentforce (native actions/observability), and UiPath
(RPA/orchestration). The local product demonstrates the control model around
these jobs; it does not provide their mature live ecosystems or claim parity.

## Acceptance and production path

For a local review, the support recipe must run from `npm start`, show the
local/sandbox mode, keep a visible demo-credit cap, produce deterministic output
with a no-provider/no-side-effect statement, enter the review queue, settle or
release the local reservation after a decision, preserve audit/ledger and
idempotency evidence, and retry failed runs as linked records. Connections,
models, workers, plans, top-ups, approvals, and exports must remain visibly
local or simulated. Run:

```powershell
npm test
npm run smoke
```

Those checks establish local behavior only. The production path is one scoped
Gmail inbox/label → governed model route → grounded draft → exact-payload human
review → optional Gmail draft save (never automatic send), backed by
authenticated tenancy, durable workers/storage, secret references, evaluation,
server-owned usage/billing, audit/export, monitoring, and recovery. The full
go/no-go list is in [`ACCEPTANCE-CHECKLIST.md`](ACCEPTANCE-CHECKLIST.md) and
[`LAUNCH-SCOPE.md`](LAUNCH-SCOPE.md).

## Start it

```powershell
cd makease-mvp
npm start
```

Open <http://127.0.0.1:3000/>. Use synthetic or redacted data only.

## Verify it

```powershell
npm test
npm run smoke
```

The current suite passes, including API lifecycle, persistence, security/path boundaries, approval settlement, durable idempotency replay, retry lineage, and AI/executor safety. The exact test count is intentionally left to the command output as the local contract suite evolves.

## Not included in this release

This is not a public SaaS deployment. It does not provide production authentication, multi-tenant relational storage, Gmail OAuth, real model calls, Stripe billing, cloud workers, secrets management, or customer-facing external actions. An approval is an internal sandbox decision, never proof that an email, refund, deployment, pull request, or payment occurred.

Use [`LAUNCH-SCOPE.md`](LAUNCH-SCOPE.md), [`FEATURE-MATRIX.md`](FEATURE-MATRIX.md), [`LIMITATIONS.md`](LIMITATIONS.md), [`COMPETITOR-V1-PLAN.md`](COMPETITOR-V1-PLAN.md), and [`ACCEPTANCE-CHECKLIST.md`](ACCEPTANCE-CHECKLIST.md) before enabling any real paid workflow.
