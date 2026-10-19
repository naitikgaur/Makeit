# MakeEase MVP — Product Decision Review

## Decision

MakeEase should launch as an **approval-first support operations product for small B2B SaaS teams**, not as a general Business Automation OS.

The first job is narrow and valuable:

> Turn an incoming customer-support thread into a grounded response draft and a clear escalation recommendation, with a human approving the result before it is sent.

The current MVP already contains the right trust primitives for this wedge: bounded workflow budgets, explicit sandbox/live states, workspace knowledge, run traces, an approval inbox, activity history, and truthful integration status. Keep those primitives. Narrow the product, the onboarding, the sales story, and the first integration around a shared Gmail support inbox.

The Business Automation OS vision is commercially useful as an **internal product thesis and expansion architecture**. It is too broad to be the initial market message or the first product surface.

## What the current MVP proves — and does not prove

The UI and API contract demonstrate a credible operating model for reviewable AI work:

- start from a template rather than an unconstrained agent;
- configure a model and a hard credit budget;
- add approved workspace knowledge;
- execute a bounded run;
- inspect steps and output;
- approve or reject internally;
- retain a ledger/activity trail; and
- make sandbox behavior explicit instead of pretending that external actions occurred.

That is a strong foundation for a trust-sensitive product. It is not yet evidence of product-market fit. The repository still describes a local, dependency-free demo; the local adapter exposes only health, plans, and workspace persistence, while the browser client expects the broader authenticated workflow API. Real OAuth connections, external writes, durable production tenancy, payment processing, and customer outcome telemetry are not yet present. The prefilled workspace data is useful for demonstrating the interface but cannot be used as proof of savings, usage, or retention.

The commercial test therefore needs to validate one real customer outcome, not more dashboard breadth.

## Ideal customer profile

### Primary ICP

**Company**

- B2B SaaS company with approximately 5–30 employees;
- one shared Gmail support inbox or clearly labeled support queue;
- recurring inbound support volume that is large enough to interrupt a founder, COO, or support lead;
- a small support/operations team of roughly 1–3 people;
- policies and product context exist, but are scattered across documents, email, or the heads of experienced staff; and
- customer communication is important enough that the buyer wants review before send.

**Buyer and champion**

- Economic buyer: founder, COO, or Head of Operations.
- Champion: support lead or the person currently reviewing replies.
- End user: the person triaging and approving customer-facing drafts.

**Trigger events**

- support volume has outgrown founder-led handling;
- a new support hire needs to become productive quickly;
- repeated requests are consuming senior attention; or
- the team wants faster response times but does not trust an unsupervised bot.

**Strong fit**

The customer has repeatable support categories, an identifiable escalation policy, and a person willing to review the first outputs. They value consistency and traceability as much as raw speed.

**Poor initial fit**

Very low-volume teams, teams seeking fully autonomous sending on day one, or companies whose first need is engineering deployment, finance operations, or a large multi-system integration program. Those use cases may become expansion opportunities, but they should not determine the launch product.

## Initial wedge

### Shared Gmail support inbox → triage → grounded draft → human approval

The first workflow should:

1. read only the selected support inbox or label;
2. classify the thread by intent and urgency;
3. retrieve relevant customer-support policies and product context;
4. recommend an escalation or next step;
5. draft a response with visible supporting context and uncertainty;
6. place the result in a review queue;
7. let a reviewer approve, edit, or reject it; and
8. save an approved draft back to Gmail or provide a clearly copyable draft.

Nothing is auto-sent in the initial commercial release. The approval decision is the product's central control point, not a temporary warning label.

This wedge is preferable to the other templates currently shown in the MVP:

- support work is frequent enough to create a repeat usage loop;
- the output is easy for a human to judge;
- the risk is manageable when sending remains manual;
- the value is visible in one session; and
- the knowledge, approval, run-history, and budget primitives already map to the job.

Lead follow-up can be a later adjacent workflow because it shares Gmail and drafting. Engineering assistance, weekly briefings, refunds, deployments, and broad cross-functional automation should not compete for launch attention.

## Product promise

**MakeEase turns repetitive support threads into grounded, reviewable drafts so a small team can respond faster without handing customer communication to an opaque bot.**

The promise has four non-negotiable qualifiers:

- grounded in the customer's approved policies and context;
- reviewable before any customer-facing action;
- observable through the run trace, output, and decision record; and
- bounded by the workspace's configured scope and budget.

Do not lead with "AI employees," "autonomous operations," or "run your business from one OS." Those claims create expectations the current product and trust model intentionally do not satisfy.

## Must-have workflows for the first paid cohort

| Workflow | Launch requirement | Why it matters |
| --- | --- | --- |
| Configure support | Connect one Gmail inbox/label, choose escalation categories, set tone, and confirm approval-before-send | Makes scope and responsibility explicit |
| Add context | Import or paste refund, SLA, escalation, and product policies; show the extracted rules for confirmation | Grounding is the primary quality lever |
| Triage | Classify intent/urgency and identify missing information or escalation risk | Creates value even when a draft is not safe |
| Draft | Produce a concise reply plus recommended next action and supporting context | Delivers the time-saving outcome |
| Review | Approve, edit, or reject; capture the decision and reason; save as a Gmail draft only after approval | Creates trust and a measurable quality signal |
| History and audit | Show source thread, context used, model, budget, output, reviewer, and status | Lets a small team diagnose mistakes and hand off work |
| Reliability controls | Explicit sandbox/live mode, bounded retries, idempotent runs, provider/error status, and a hard usage cap | Prevents a useful draft tool from becoming an operational liability |

The first-run experience should use one real customer thread with consent or an explicitly labeled sample. It should never rely on invented customer histories or implied external actions.

## Packaging and pricing hypothesis

The current Starter/Growth/Business/Enterprise ladder and credit balances are reasonable backend experiments, but credits should not be the primary customer-facing value proposition. Customers buy reviewed support work, not tokens. Credits can remain an internal cost guardrail and a detailed usage view.

### Recommended launch packaging

1. **Guided pilot** — a time-boxed design-partner period for the first 5–10 accounts. One inbox, one support workflow, human approval always on, and concierge policy setup. Charge enough to test willingness to pay; waive or discount only in exchange for explicit feedback and access to outcome data.
2. **Support plan — initial hypothesis: $49/workspace/month** — one connected support inbox, up to three reviewers, one production workflow, knowledge/policy records, approval inbox, audit history, export, and an included allowance of reviewed threads. Start with a hard cap rather than surprise overage. The exact thread allowance should be set after measuring provider cost per reviewed thread; 500 threads/month is a reasonable test point, not a promise.
3. **Team plan — add only after repeatable retention** — multiple inboxes/workflows, more reviewers, routing and quality analytics, and priority support. A price around $149/workspace/month is a hypothesis to test, not a committed market fact.
4. **Business/Enterprise — custom** — SSO, role controls, retention/data controls, implementation, and procurement requirements. Do not build or sell this tier until a real buyer requests it.

Do not expose model choice as the main packaging axis. Do not make top-ups the core monetization loop before there is evidence that customers understand or need them. Show actual threads processed, approvals, edits, rejects, escalations, and provider cost internally; surface customer-relevant usage externally.

## Onboarding

The onboarding should be a use-case setup path, not a tour of every navigation item.

1. **Choose the job:** “Support inbox” is the primary choice; the other templates are not presented as equal launch paths.
2. **Connect narrowly:** authorize one Gmail inbox or label with the smallest practical scope. Start read-only where possible and explain the later draft-write permission.
3. **Confirm policy:** paste or import three to five high-value references, such as refund policy, SLA, escalation rules, and tone. Make the customer approve the summarized rules before they are used.
4. **Set the boundary:** approval-before-send is on by default; define categories that always escalate; set a visible run/usage cap.
5. **Run a real example:** process one consented thread or clearly labeled sample. Show classification, retrieved context, draft, uncertainty, steps, and estimated usage.
6. **Review the result:** the customer edits, approves, or rejects it and sees where the record is stored. Invite the next reviewer only after the first output is understood.
7. **Turn on the queue:** choose the support label or schedule and explain how failures, pending reviews, and provider disconnects will be surfaced.

The customer should reach a useful review in the first session. Do not require setup of Slack, GitHub, Notion, Stripe, Linear, billing top-ups, or a company-wide knowledge graph before the first support result.

## Activation event

The primary activation event is **`first_approved_support_draft`**:

- one support inbox is scoped;
- at least one policy or knowledge record is confirmed;
- a real or explicitly labeled test thread is processed;
- a human approves or edits the resulting draft; and
- the draft is saved to Gmail or copied for use, with the run and decision visible in history.

Account creation, integration connection, template selection, or a sandbox run alone is not activation. A stronger product-qualified activation signal is three distinct threads reviewed in the first seven days with at least one policy correction or knowledge addition. Track both events separately so a polished demo cannot be mistaken for retained value.

## Retention loop

1. A new support thread enters the selected queue.
2. MakeEase triages it and drafts a policy-grounded response.
3. The reviewer approves, edits, rejects, or escalates it.
4. The decision and any correction become feedback for the team's policies and routing rules.
5. A weekly digest reports real operational signals: threads processed, approval/edit/reject rates, escalations, review latency, failures, and usage. Do not invent hours saved; only show measured or customer-entered values.
6. As quality and trust improve, the team sends more of its repeatable support volume through the queue and adds another reviewer or adjacent workflow.

The durable loop is **incoming work → useful draft → safe review → better context → more trusted usage**. Credits, badges, and a generic activity feed are not retention mechanisms by themselves.

## Customer success

For the first cohort, customer success is part of the product:

- run a guided setup and policy review;
- sample early outputs with the customer and label failure modes;
- help define escalation boundaries and an emergency pause procedure;
- review approval, edit, reject, and escalation patterns during the first month;
- proactively surface provider failures, stale knowledge, disconnected accounts, and unusual quality changes;
- provide a short playbook for adding a policy and handling an uncertain draft; and
- report actual usage and quality, never fabricated ROI.

The success milestone is not “the customer connected Gmail.” It is “the customer trusts MakeEase with a repeatable class of support threads while retaining accountability for the final response.”

## Sales motion

Use a founder-led, consultative motion for the first 10–20 accounts.

### Offer

Offer a **support inbox audit and guided pilot**. With consent and appropriate redaction, review a small set of representative threads, identify repeatable categories and escalation rules, configure one workflow, and agree on the quality bar before launch.

### Channels

- founder and operator networks;
- B2B SaaS and support-operations communities;
- referrals from fractional COOs, support consultants, and implementation partners; and
- highly targeted outbound to companies showing the trigger events above.

### Qualification

Qualify for recurring support volume, an accessible decision maker, available policies/context, a willingness to keep human approval, and a clear first inbox. Disqualify buyers asking for broad autonomous automation before they can define a safe workflow.

### Demo and conversion

Demo one support thread end to end: context, trace, draft, review, and audit record. Do not demo the entire template catalog or call the product an OS. Convert the pilot when the customer has repeated weekly usage, accepts the review experience, and can describe the operational class they will keep in MakeEase.

## What to postpone

### Postpone until the support wedge retains customers

- lead follow-up as a separate top-level product;
- weekly business briefings and engineering issue assistance;
- Slack, GitHub, Notion, Stripe, Linear, and a broad integration marketplace;
- an unconstrained workflow builder or arbitrary step graph;
- autonomous sending, refunds, deployments, code changes, or other irreversible external actions;
- a generalized company brain across every data source;
- multi-agent orchestration, self-healing workflows, and background autonomy;
- exposing multiple model tiers as a user decision;
- credit top-ups and complex plan switching as a primary UX; and
- enterprise SSO, SCIM, data residency, custom retention, and procurement features.

The reusable platform core should remain small: scoped connections, approved context, bounded execution, human review, immutable history, and honest usage accounting. Everything else must earn its place through a repeated customer problem.

## Is the Business Automation OS vision commercially coherent?

**As a long-term architecture: yes. As a launch category: no.**

The vision has a coherent technical spine because support, sales follow-up, briefings, and engineering assistance can share context, templates, execution budgets, approvals, and audit history. That is a sensible expansion path.

It is not a coherent initial commercial product because it combines different buyers, urgency levels, risk profiles, integrations, and definitions of success. “OS” also describes a category ambition rather than a painful job a buyer is already trying to solve. A founder who needs faster support replies cannot evaluate a promise that also includes engineering, finance, marketing, and company-wide automation.

Keep “Business Automation OS” in internal strategy documents and architecture discussions. Externally position MakeEase around the support outcome until the company has evidence that the same buyer repeatedly adopts adjacent workflows.

### Expansion gate

Do not broaden the positioning until a provisional gate is met:

- at least 10 paying workspaces use the support workflow weekly;
- week-8 retention and repeat volume are measured, not inferred from demo data;
- approval, edit, reject, escalation, and failure rates are understood and acceptable to customers;
- the cost per reviewed thread and gross margin are known; and
- at least three customers independently request the same adjacent workflow.

If that evidence appears, expand first into an adjacent customer-operations job that shares the inbox and policy context. Treat engineering and cross-functional automation as separate products until the buyer, data, and safety model are proven.

## Final product call

MakeEase has a promising trust-and-control foundation, but the MVP is currently a workflow UX and service contract rather than a validated automation business. The next commercial milestone is not more templates or integrations. It is one real Gmail-based support workflow that reliably produces a useful, approved draft, records the outcome, and earns recurring payment from a narrow ICP.

**Launch message:** “Reviewable AI support operations for small B2B SaaS teams.”

**Do not launch message:** “The Business Automation OS for every team.”
