# MakeEase — research and technical dossier

MakeEase is a dependency-free local prototype for **reviewable AI support
operations**. It combines a runnable automation workspace with a provider-neutral
AI contract, deterministic safety controls, synthetic evaluation data, execution
receipts, and a documented path to a production AI automation platform.

The repository turns an otherwise vague “AI agent for business automation” idea
into a concrete set of workflows, schemas, policy boundaries, evaluation
targets, and human-review signals that can be improved with stronger models and
real-world data.

> **Current status:** local sandbox and launch candidate. It does not contain a
> production model, live provider integrations, real customer data, or a
> completed fine-tuning run.

---

## Executive summary

The central product question behind MakeEase is:

> How can an AI system perform repetitive business work while keeping evidence,
> uncertainty, cost, approval, and external side effects visible and bounded?

The repository answers that question with a narrow support-operations wedge:

```text
incoming request
      ↓
bounded workflow
      ↓
context and policy
      ↓
triage / extraction / draft
      ↓
evidence, uncertainty, and action policy
      ↓
human review
      ↓
audited internal result
```

The initial production concept is one scoped support inbox → triage → grounded
draft → human review. The local implementation uses synthetic inputs and a
deterministic mock. It is deliberately unable to send email, issue a refund,
change access, deploy code, or call an external provider.

## Why this foundation matters

MakeEase is not only a front-end demo. It is a compact experimental environment
for several research areas that are difficult to study in isolation:

| Research area | What the repository provides |
| --- | --- |
| Workflow-aware models | Four bounded workflow templates with named steps, inputs, outputs, review states, and execution records |
| Structured prediction | Classification and extraction contracts with explicit enums, required fields, unknown values, and exact-match evaluation targets |
| Retrieval and grounding | Knowledge records, source IDs, exact evidence quotes, provenance metadata, bounded context, and source-aware support packets |
| Safe agent behavior | Typed action policies, approval requirements, blocked side effects, prompt-injection quarantine, and non-operative tool proposals |
| Human-in-the-loop learning | Approval, rejection, reviewer edits, escalation, uncertainty, and missing-fact states that can become future labels |
| Cost-aware inference | Model routing, token estimates, credit budgets, reservations, settlement, fallback rules, and budget failure states |
| Reproducible evaluation | Deterministic request/result digests, pinned contract versions, synthetic fixtures, local regression hooks, and explicit release gates |
| Automation product research | Competitor research, positioning decisions, onboarding design, pricing hypotheses, security requirements, and a 24-month platform roadmap |

The useful asset is the connection between these layers. A future model can be
evaluated not only on whether it produces fluent text, but also on whether it
retrieves the right evidence, abstains when facts are missing, preserves an
approval boundary, respects a budget, and produces a trace that an operator can
understand.

---

## Repository evidence at a glance

These figures describe the checked-in repository and its current local behavior.

| Area | Current evidence |
| --- | --- |
| Runtime | Node.js 20+, dependency-free, loopback-only local adapter |
| Product templates | 4: customer support triage, new lead follow-up, weekly business briefing, engineering issue assistant |
| Local AI operations | 5 provider-neutral operations: classification, extraction, drafting, retrieval, and tool proposals; tool execution is always refused |
| Local model routes | 3 deterministic mock models: `mock-fast`, `mock-balanced`, and `mock-safe` |
| Connector research surface | 40+ metadata-only connector previews across communication, support, CRM, ecommerce, finance, productivity, engineering, data, and browser/desktop automation |
| Synthetic evaluation seed | 8 cases: 4 support cases and 4 lead cases |
| Adversarial seed | 2 red-team cases covering prompt injection and secret-exfiltration/approval-bypass attempts |
| Competitor research | 10 dated competitor briefs and 10 comparison lenses |
| AI contract | `lib/ai.js` contract version `1.1`; local evaluation hook version `1.0` |
| Automated verification | 45 Node tests passed in the current checkout, plus server smoke and syntax checks |
| External effects | None in the local adapter; provider contact and external actions are explicitly recorded as false |

The repository does not record person-hours spent researching or implementing
the project. It records research artifacts, decisions, contracts, fixtures, and
tests. Those are the measurable claims made here; no invented research-hour or
model-training-hour figure is presented as fact.

---

## The research path from scratch

The project began with a broad Business Automation OS thesis and was narrowed
through product, competitor, architecture, safety, and evaluation research.
The important result was not a larger feature list; it was a smaller and more
testable job.

### 1. Problem framing

The first question was whether a general-purpose automation operating system
should be the initial product. The research conclusion was that the broad
position combined too many buyers, integrations, risk levels, and definitions of
success.

The launch job was narrowed to:

> Turn an incoming support thread into a policy-grounded triage result, draft
> reply, and escalation recommendation that a human reviews before any
> customer-facing action.

This job was selected because a small B2B SaaS team can judge the output, the
work repeats often enough to create a usage loop, and the human approval point
is clear.

Primary artifacts:

- [`PRODUCT-REVIEW.md`](PRODUCT-REVIEW.md)
- [`LAUNCH-SCOPE.md`](LAUNCH-SCOPE.md)
- [`PLAIN-LANGUAGE-REVIEW.md`](PLAIN-LANGUAGE-REVIEW.md)

### 2. Competitor and market research

The repository contains dated research briefs for:

- Zapier
- Make
- n8n
- Microsoft Power Automate
- Intercom Fin
- Zendesk
- Gorgias
- Lindy
- Salesforce Agentforce
- UiPath

The briefs separate verified public facts, vendor claims, and inferences. They
were used as design input rather than as proof that another vendor is safe,
accurate, or commercially superior.

The research was synthesized into ten benchmark lenses:

1. guided setup and connector breadth;
2. visual composition and recovery;
3. technical control and portability;
4. governance and data boundaries;
5. support lifecycle and handoff;
6. support workspace and routing;
7. ecommerce and irreversible actions;
8. coworker delegation and write permissions;
9. native actions, testing, and observability; and
10. durable orchestration and human/robot boundaries.

The resulting competitive position is intentionally narrow:

> A portable, approval-first automation control plane with evidence, hard cost
> caps, and one consistent policy model across workflows and AI actions.

This is a differentiation hypothesis, not a claim of overall superiority or
feature parity.

Research artifacts:

- [`research/competitors/`](research/competitors/)
- [`COMPETITIVE-DECISION.md`](COMPETITIVE-DECISION.md)
- [`COMPETITOR-V1-PLAN.md`](COMPETITOR-V1-PLAN.md)

### 3. Product and operating-model research

The product research defined:

- the small B2B SaaS ICP;
- the support-inbox wedge;
- the `first_approved_support_draft` activation event;
- the approval/edit/reject/escalation retention loop;
- the difference between a prepared support packet and an external action;
- the first paid workflow and its production gates; and
- the metrics required to measure real value instead of inventing savings.

The research deliberately rejects unsupported claims such as “fully
autonomous,” “zero hallucinations,” universal percentage savings, or a sandbox
run being proof of customer ROI.

Artifacts:

- [`GO-TO-MARKET.md`](GO-TO-MARKET.md)
- [`PRICING-MODEL.md`](PRICING-MODEL.md)
- [`PRICING-FINAL-DECISION.md`](PRICING-FINAL-DECISION.md)
- [`DEMO-SCRIPT.md`](DEMO-SCRIPT.md)
- [`ACCEPTANCE-CHECKLIST.md`](ACCEPTANCE-CHECKLIST.md)

### 4. Platform architecture research

The architecture work treats MakeEase as a future platform with replaceable
implementations rather than a collection of hard-coded provider calls.

The target platform separates:

```text
control plane       identity, tenancy, workflows, policy, billing, audit
execution plane     queue, orchestrator, workers, retries, approvals
AI plane            model routing, retrieval, guardrails, evaluations, usage
connector gateway   typed capabilities, scopes, provider calls, receipts
evidence layer      provenance, traces, ledger, exports, retention
```

The 24-month roadmap is staged from a local contract prototype, through a
single-region production kernel, to a connector/AI platform, enterprise
controls, and eventually multi-region resilience. It explicitly says that the
current repository is not that production topology.

Artifact:

- [`PLATFORM-ROADMAP.md`](PLATFORM-ROADMAP.md)

### 5. AI-contract research

The AI work began by defining what a model is allowed to return and what a
caller is allowed to do with that return.

The local contract covers:

- provider-neutral model IDs and capability declarations;
- deterministic routing by task and budget;
- bounded JSON-safe inputs;
- credential-like field rejection;
- source-backed evidence and exact quotes;
- explicit uncertainty and abstention;
- lexical retrieval with quarantined hostile documents;
- typed action/risk classes;
- approval descriptors that cannot authorize execution;
- action plans with immutable digests;
- replay and idempotency metadata;
- deterministic usage/cost estimates; and
- refusal of unrestricted tool execution.

Artifact:

- [`AI-CONTRACT.md`](AI-CONTRACT.md)

### 6. Evaluation and safety research

The evaluation plan defines clean-quality and red-team tracks separately. It
specifies labels, annotation rules, exact extraction fields, groundedness
metrics, tool-call validity, prompt-injection resistance, approval outcomes,
latency, token usage, cost, and release gates.

The evaluation methodology requires:

- a train/dev/test separation;
- scenario-template and paraphrase-aware splitting to avoid leakage;
- two independent labels and a third adjudicator;
- agreement reporting before benchmark use;
- synthetic or redacted inputs;
- network-denied evaluation with a local tool simulator;
- pinned model, prompt, policy, retrieval, and adapter versions; and
- reporting of failures, confidence intervals, latency, and cost rather than a
  single quality number.

Artifacts:

- [`AI-EVALUATION.md`](AI-EVALUATION.md)
- [`evaluation/fixtures.json`](evaluation/fixtures.json)
- [`RUNTIME-SECURITY.md`](RUNTIME-SECURITY.md)

### 7. Implementation and verification

The implementation turns the research decisions into a local vertical slice:

1. choose a bounded recipe;
2. add local knowledge;
3. set a visible budget and review requirement;
4. run a deterministic sandbox test;
5. inspect steps, output, evidence, and safety state;
6. approve or reject internally;
7. settle or release local credits; and
8. retain run, audit, ledger, retry, idempotency, and export records.

The current test run reports 45 passing tests. These validate local contracts,
persistence, lifecycle transitions, evidence bounds, prompt-injection handling,
budget enforcement, idempotency, retry lineage, auth-mode behavior, and the
absence of external effects. They do not prove production reliability, model
accuracy, OAuth, billing, or customer savings.

---

## What is implemented now

### Product surface

- command center and workspace overview;
- workflow studio with four canonical recipes;
- bounded test runs and run history;
- review queue with approve/reject/edit records;
- local knowledge records;
- Insights, activity, audit, credit ledger, and JSON export;
- explicit plan and top-up simulations; and
- connector catalog and connection previews.

### Execution and control behavior

- atomic local credit reservations and settlement/release;
- bounded steps, output, retries, and timeout behavior;
- persisted idempotency records and replay detection;
- linked retry records that preserve the original failure;
- action plans with risk classes and approval status;
- evidence and provenance summaries;
- support review packets with draft-only output;
- prompt-injection quarantine for input and knowledge; and
- receipts that explicitly report `providerContacted: false` and
  `externalActionsPerformed: false`.

### Local AI behavior

`lib/ai.js` is a deterministic mock adapter. It does not:

- read API keys;
- inspect provider environment variables;
- load a provider SDK;
- make network requests;
- call a model provider; or
- execute a tool.

It does provide a stable interface that a future model adapter can implement:

```js
const {
  createAIAdapter,
  classify,
  extract,
  draft,
  retrieveContext,
  proposeTools,
  executeTool,
  evaluateResponse
} = require("./lib/ai");
```

`executeTool()` always refuses unrestricted execution. A model result,
caller-supplied boolean, or local approval flag cannot become execution
authority.

---

## Data and training assets

The repository contains **training-ready structure and synthetic examples**,
not a large production corpus. The following table identifies what is actually
available and how it can be used.

| Asset | Location | Current contents | Useful training or research task | Current limitation |
| --- | --- | --- | --- | --- |
| Synthetic support cases | [`evaluation/fixtures.json`](evaluation/fixtures.json) | 4 cases covering billing/refund, technical timeout, access, and direct prompt injection | Support intent, priority, sentiment, field extraction, evidence selection, approval routing, safe refusal | Four cases are a smoke seed, not enough for model-quality claims |
| Synthetic lead cases | [`evaluation/fixtures.json`](evaluation/fixtures.json) | 4 cases covering qualified, nurture, disqualified, and injection/secret-exfiltration behavior | Lead stage/fit, qualification extraction, unknown handling, safe follow-up drafting | Four cases are a smoke seed, not enough for fine-tuning |
| Gold labels | `gold` objects in `evaluation/fixtures.json` | Required classifications, exact fields, evidence IDs, risk flags, approval state, allowed/forbidden tools | Supervised learning, evaluator construction, structured-output scoring | Labels are synthetic and limited in linguistic diversity |
| Knowledge/context examples | `knowledge` arrays in fixtures and `data/workspace.json` | Synthetic policy records for billing, runtime, access, leads, and review rules | Retrieval ranking, provenance, policy-grounded drafting, hostile-context quarantine | No real organization knowledge, freshness history, or access-control corpus |
| AI output contract | [`AI-CONTRACT.md`](AI-CONTRACT.md), [`lib/ai.js`](lib/ai.js) | Response envelopes, evidence, uncertainty, action policy, action plan, budget, trace, replay metadata | Schema-constrained generation, adapter compatibility, contract evaluation | The local output is deterministic mock output, not a trained model response |
| Safety/action taxonomy | `ACTION_TYPES`, risk classes, policy logic in `lib/ai.js` and `lib/executor.js` | Analysis, read, draft, communicate, financial, access, destructive, code execution, tool proposal, unknown | Safety classification, policy learning, approval-risk prediction, tool allowlisting | Policy is currently deterministic code; it is not learned from a large incident corpus |
| Execution receipts | `lib/executor.js` and runtime-generated local run records | Steps, attempts, retries, timeouts, credits, evidence IDs, replay keys, status, side-effect flags | Reliability modeling, cost prediction, failure classification, recovery policies | Checked-in history is synthetic/empty; runtime records are local demo evidence |
| Human-review states | API contract, approval routes, local run lifecycle, tests | Pending, approved, rejected, edited, escalated, awaiting approval, blocked, failed | Preference learning, reviewer-assist models, calibrated escalation | No meaningful production reviewer volume is included |
| Connector capability catalog | [`lib/connectors.js`](lib/connectors.js) | 40+ preview manifests with categories, capabilities, effect classes, risk classes, and setup steps | Capability schema design, action-risk mapping, connector planning, policy simulation | Catalog entries do not connect to providers and contain no provider data |
| Competitor research | [`research/competitors/`](research/competitors/) | 10 briefs with sources, product observations, pricing/packaging analysis, and design implications | Product research, benchmark design, agent-platform architecture analysis | Third-party facts require source and licensing review before any model training use |

### The most useful labels for model development

The current fixtures already encode a useful multi-objective target rather than
only a desired answer string:

```json
{
  "classification": {},
  "extraction": {},
  "required_evidence": [],
  "risk_flags": [],
  "approval_required": true,
  "allowed_tool_calls": [],
  "forbidden_actions": []
}
```

That structure can train or evaluate a system to answer several questions at
once:

1. What kind of request is this?
2. Which facts are explicitly present?
3. Which facts are unknown and must remain unknown?
4. Which approved knowledge sources support the result?
5. Is a draft possible, or should the system abstain?
6. Does the request require human approval?
7. Which tools are allowed, and which side effects are forbidden?
8. What should be shown to a reviewer?

### What should not be treated as training data

- `SANDBOX SIMULATION` output is not evidence of model quality.
- Deterministic heuristic confidence is not calibrated probability.
- Local demo credits are not provider cost data.
- Seeded workspace state is not customer behavior or ROI evidence.
- Approval in the sandbox is not proof that an external action succeeded.
- Competitor pages and copied third-party material must not be used for model
  training without appropriate rights and provenance review.

---

## Current training status

The current repository has **not** performed fine-tuning, reinforcement
learning, preference optimization, or training of a foundation model.

What has been built is the training and evaluation scaffold:

- 8 synthetic cases;
- 2 adversarial seed cases;
- explicit gold labels and forbidden actions;
- deterministic input/output contracts;
- source/evidence checks;
- local evaluation hooks;
- model/task routing abstractions;
- structured action and approval policies; and
- a test suite that exercises the safety plumbing.

This is enough to start experiments immediately, compare model adapters against
a stable contract, and expand the dataset without first rebuilding the product
semantics. It is not enough to claim that a model is
accurate, grounded, calibrated, secure against all attacks, or ready for live
customer operations.

---

## Recommended training and research program

The following is the realistic way to turn the current repository into a strong
AI automation service. It is a proposed continuation plan, not work already
completed in this checkout.

### Phase 0 — Reproduce the contract

Use the existing fixtures and local adapter to establish a baseline:

- run all five AI operations;
- validate every normalized response;
- confirm no external tool calls occur;
- record evidence, uncertainty, approval, budget, and trace fields; and
- freeze the current contract as a baseline adapter.

### Phase 1 — Expand and label the dataset

Grow the seed cases into a locked benchmark. The repository's evaluation plan
recommends at least:

- 50 clean cases per high-impact class;
- 50 red-team cases per major attack family;
- train/dev sets for iteration;
- an access-controlled test set that is never used for prompt tuning;
- scenario-template and paraphrase-family splits; and
- two independent reviewers plus an adjudicator for ambiguous labels.

The first new examples should vary wording, missing facts, policy conflict,
urgency, customer sentiment, multilingual phrasing, long context, and
contradictory knowledge. Synthetic or redacted data should remain the default
until data governance is in place.

### Phase 2 — Train task-specific model adapters

Different tasks should be measured separately rather than forcing one model to
own every behavior:

| Task | Candidate training target |
| --- | --- |
| Classification | Intent, priority, sentiment, lead stage, and fit labels |
| Extraction | Exact structured fields with null/unknown preservation |
| Retrieval | Query-to-policy ranking with evidence/source-ID supervision |
| Drafting | Concise internal drafts that cite context and preserve review language |
| Safety | Injection, secret-exfiltration, fake-authority, and approval-bypass detection |
| Action planning | Risk class, approval requirement, allowed capability, and blocked effect |

Instruction tuning or parameter-efficient fine-tuning can be tested for
classification, extraction, and drafting. Retrieval should first be improved
through corpus quality, chunking, source permissions, and ranking evaluation.
Policy facts should remain in approved context and deterministic policy code
where possible rather than being memorized by a model.

### Phase 3 — Add reviewer feedback as a quality signal

Once real or carefully redacted pilots exist, capture:

- approved without edit;
- approved after material edit;
- rejected and rejection reason;
- escalation reason;
- missing policy or knowledge source;
- unsupported claim;
- incorrect classification or extraction;
- unsafe action proposal; and
- reviewer time-to-decision.

These records can support preference modeling, reviewer-assist ranking, and
policy-gap discovery. They must remain separate from the locked test set and
must not be treated as a simple “approval means correct” label.

### Phase 4 — Evaluate safety and operational quality

The proposed staging gates in [`AI-EVALUATION.md`](AI-EVALUATION.md) include:

- macro-F1 ≥ 0.90 overall and ≥ 0.85 for each tracked class;
- high-risk recall ≥ 0.98;
- critical extraction fields exact ≥ 0.95;
- supported-claim precision ≥ 0.98;
- unsupported material-claim rate ≤ 0.02;
- forbidden side effects, unexpected tool calls, leakage, and approval bypass
  at 0.00;
- successful completion ≥ 0.99;
- p95 draft latency ≤ 8 seconds and p99 ≤ 15 seconds under declared load; and
- no budget overrun or duplicate charge.

These thresholds are release targets for a sufficiently sized locked set. They
are not results achieved by the current eight-case seed.

### Phase 5 — Connect a governed provider

Only after synthetic evaluation is meaningful should the lab add a real model
route behind the existing provider-neutral boundary. The production route must
pin and record:

- model/provider ID;
- prompt and context versions;
- retrieval snapshot;
- tool-policy version;
- temperature and output limits;
- latency and retry behavior;
- provider-reported token usage; and
- exact evaluation results.

The first external action should remain a scoped Gmail draft save after
action-scoped human approval. Automatic sending, refunds, deployments, code
changes, and account changes remain separate higher-risk capabilities.

---

## Architecture

### Current local architecture

```text
Browser UI
   │
   ├── local JSON API and workspace lifecycle
   ├── workflow/run/approval/knowledge routes
   ├── local credit ledger and audit records
   └── loopback-only persistence in data/workspace.json

lib/ai.js
   ├── deterministic provider-neutral AI contract
   ├── evidence, uncertainty, action policy, and evaluation hooks
   └── refusal-only tool boundary

lib/executor.js
   ├── bounded local execution
   ├── timeout/retry/idempotency behavior
   ├── support packet and execution receipts
   └── no-provider/no-side-effect sandbox mode
```

### Production architecture being researched

The target architecture separates control, execution, AI, connector, and
evidence concerns:

```text
authenticated API
       │
control plane ── identity, tenancy, policy, workflow revisions, billing
       │
event/job fabric ── queue, scheduler, outbox, dead-letter, replay
       ├── execution plane ── orchestrator, workers, approvals
       ├── AI plane ── model gateway, retrieval, guardrails, evaluation
       ├── connector gateway ── typed capabilities, scopes, receipts
       └── evidence ── audit, provenance, usage, export, retention
```

The local repository intentionally stops before this production boundary. The
architecture and security documents define what must be added rather than
pretending that a JSON file and local process already provide it.

---

## Local demo

### Requirements

- Node.js 20 or newer recommended;
- a browser with JavaScript modules enabled; and
- synthetic or redacted text only.

No package installation is required.

### Start

```powershell
node --version
npm start
```

Open <http://127.0.0.1:3000/>.

The adapter is intentionally bound to loopback. It rejects a non-loopback host
because it has no production tenant boundary or live provider authorization.

### Recommended demonstration path

1. Open **Workflows** and choose **Customer support triage**.
2. Add a synthetic policy in **Knowledge**, such as: “Duplicate charges require
   reviewer confirmation; do not promise a refund.”
3. Run a bounded test with a synthetic request.
4. Inspect the support packet, evidence, uncertainty, draft-only result,
   escalation state, and credit reservation.
5. Approve or reject the result in **Review queue**.
6. Inspect run history, Insights, audit, ledger, retry lineage, and export.
7. Open **Connections** and **Plans & usage** to see their explicit preview and
   simulation state.

The meaningful result is a visible trace and internal decision. It is not a
claimed customer response, provider call, refund, or savings figure.

### Verification

```powershell
npm test
npm run smoke
npm run check
```

At the current checkout, `npm test` reports 45 passing tests. The checks are
local contract and safety evidence; they do not establish production model
quality, OAuth, payment processing, multi-tenant isolation, or live uptime.

### Local data handling

- `data/workspace.json` is disposable synthetic demo state.
- Browser fallback state uses `localStorage` and is not a secret store.
- Never paste API keys, OAuth tokens, passwords, customer exports, or payment
  data into the UI, fixtures, logs, or workspace file.
- Restore the checked-in workspace fixture before sharing a demo copy.

---

## Current boundary versus production target

| Capability | Current repository | Production evidence still required |
| --- | --- | --- |
| AI | Deterministic local mock; no provider SDK or network | Governed provider adapter, measured quality, usage, latency, cost, and rollback |
| Data | JSON workspace and synthetic fixtures | Durable relational storage, tenant scope, migrations, backups, retention, deletion |
| Identity | Local demo; optional rehearsal auth mode | Authenticated organization/workspace/environment tenancy and role checks |
| Connectors | 40+ preview catalog entries; all disconnected | Least-privilege OAuth, secret references, provider health, revocation, readback |
| Approval | Internal sandbox decision with no external authority | Exact-payload approval bound to actor, policy, version, expiry, and idempotency |
| Execution | Bounded local queue and executor | Durable workers, leases, cancellation, restart recovery, dead-letter, monitoring |
| Billing | Local plan, top-up, reservation, and ledger simulation | Verified payment webhooks, tax/refund policy, financial reconciliation |
| Evaluation | 8 synthetic cases and deterministic contract checks | Locked clean/red-team suites, human labels, confidence intervals, pilot outcomes |
| External effects | None | First target is approved Gmail draft save; automatic send is out of scope |

The production column is a research and implementation target, not a current
feature claim.

---

## Repository map

| Path | Purpose |
| --- | --- |
| `server.js` | Local HTTP adapter, routes, persistence boundary, and sandbox lifecycle |
| `lib/ai.js` | Provider-neutral deterministic AI contract and safety/evaluation hooks |
| `lib/executor.js` | Bounded execution, action plans, retries, receipts, and support packets |
| `lib/connectors.js` | Metadata-only connector catalog and effect/risk descriptions |
| `lib/config.js` | Local plans, model labels, support packet limits, and four templates |
| `ui/` | Browser API client, state controller, views, utilities, and icons |
| `data/workspace.json` | Synthetic local workspace seed and disposable state |
| `evaluation/fixtures.json` | Eight synthetic support/lead cases with gold labels |
| `research/competitors/` | Ten competitor research briefs |
| `AI-CONTRACT.md` | AI response, evidence, policy, routing, budget, and refusal contract |
| `AI-EVALUATION.md` | Dataset protocol, metrics, red-team matrix, and release gates |
| `PLATFORM-ROADMAP.md` | Target platform architecture and 24-month staged roadmap |
| `RUNTIME-SECURITY.md` | Production trust zones, worker isolation, egress, secrets, and audit model |
| `FEATURE-MATRIX.md` | Local behavior versus production requirements |
| `LIMITATIONS.md` | Prohibited claims and local-only boundary |

---

## Research conclusions

The repository's research supports five durable conclusions:

1. **Bounded workflows are a better first experiment than unconstrained
   autonomy.** They create clear inputs, steps, evaluation labels, and failure
   boundaries.
2. **Evidence must be part of the output contract.** A fluent draft without
   source references, uncertainty, and policy context is difficult to review or
   improve.
3. **Approval is a state transition, not a decorative button.** It must be
   separate from provider success and bound to the exact action in production.
4. **Cost and safety are both runtime controls.** Budgets, reservations,
   retries, model routing, and side-effect policies belong in the execution
   plane, not only in sales packaging or prompts.
5. **The next research investment is data and measured outcomes.** More
   templates, connector cards, and dashboard breadth cannot substitute for a
   locked evaluation set, real reviewer labels, provider measurements, and
   repeated customer workflows.

## Important limitations

MakeEase currently must be described as a local sandbox/demo. It does not yet
provide:

- a production-trained or fine-tuned model;
- a real model provider call in the local runtime;
- live Gmail, Slack, GitHub, Notion, Stripe, Linear, or other provider access;
- production authentication or multi-tenant relational storage;
- cloud workers, secret management, or an egress gateway;
- payment processing or live financial entitlements;
- automatic email, refund, deployment, code, access, or payment actions; or
- proof of accuracy, groundedness, savings, ROI, security, compliance, or uptime.

These limitations are part of the research record. They define the work an AI
lab can measure and extend rather than allowing a prototype state to be
mistaken for production evidence.

## Further reading

- [`V1-RELEASE.md`](V1-RELEASE.md) — current local release candidate
- [`PRODUCT-REVIEW.md`](PRODUCT-REVIEW.md) — product decision and support wedge
- [`COMPETITOR-V1-PLAN.md`](COMPETITOR-V1-PLAN.md) — ten benchmark lenses and claim rules
- [`AI-CONTRACT.md`](AI-CONTRACT.md) — provider-neutral AI boundary
- [`AI-EVALUATION.md`](AI-EVALUATION.md) — training/evaluation protocol and gates
- [`DATABASE-SCHEMA.md`](DATABASE-SCHEMA.md) — target relational domain model
- [`LEDGER-CONTROLS.md`](LEDGER-CONTROLS.md) — usage and billing control design
- [`SETUP-RUN.md`](SETUP-RUN.md) — setup, demo, reset, and troubleshooting
- [`LIMITATIONS.md`](LIMITATIONS.md) — local-only constraints and prohibited claims
