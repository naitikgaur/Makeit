# MakeEase Launch Pricing — Final Decision

**Decision date:** 2026-10-16  
**Decision owner:** Finance / Product  
**Status:** Commercial decision for the first production launch; not a statement that the current local MVP can bill customers.

## Executive decision

MakeEase will launch around one narrow job:

> Turn an incoming support thread into a policy-grounded triage result, draft reply, and escalation recommendation that a human reviews before any customer-facing action.

The customer-facing launch package is **MakeEase Support at $149 per workspace per month**, billed monthly. It includes one Gmail support inbox or label, three named reviewers, one production support workflow, and **500 support threads prepared for review per month**. The plan stops new processing at the included limit by default; it does not silently create an overage invoice.

The first commercial motion is a **paid guided pilot at $299 for 30 days** for the first five to ten design partners. The pilot includes 150 support review packets, two reviewers, one inbox/label, policy setup, and four short weekly reviews, with two hours of included implementation/review service in total. It does not renew automatically. Continuing at $149/month requires the buyer's explicit agreement; the pilot fee is not credited against recurring service.

The launch package is deliberately narrower and more expensive than the old generic credit hypothesis. Customers buy a reviewable support outcome, not a token balance. Internal credits and action meters remain necessary for cost control and settlement, but they are not the primary value story.

### Reconciliation of the existing price proposals

This document is the commercial launch decision. The other files remain useful historical assumptions and technical references; their numbers must not be combined into one offer.

| Existing proposal | Decision |
|---|---|
| Current demo/API/config: Starter $25/15,000 credits, Growth $50/40,000, Business $100/90,000, and $12/10,000-credit top-up | Demo hypotheses only. There is no verified dollar-to-thread or dollar-to-provider-cost conversion, so do not sell these as the live launch plans or convert demo balances into paid entitlements. |
| `PRICING-MODEL.md`: $149/$499/$1,499/$3,499 broad platform ladder with runs, AI actions, and heavy actions | Keep the cost taxonomy, reservation logic, BYOK distinction, and sensitivity discipline. Replace the broad public ladder with the support-specific launch package below. |
| `PRODUCT-REVIEW.md`: $49 Support/approximately 500 threads and a possible $149 Team plan | Adopt the ICP, support job, review-first model, and understandable usage unit. Reject the unvalidated $49 price at the current cost/support assumptions. |

At modeled full usage including the test allowance, Support costs $29.65/month before payment processing. A $49 price would produce only **39.5% direct gross margin**; the list price needed for an 80% target is $29.65 / 20% = **$148.25**. This supports testing $149, but it does **not** establish that buyers will pay it. The pilot must prove both value and willingness to renew. If the target buyer will not pay $149, reduce scope, setup effort, or delivery cost before lowering the price; a margin spreadsheet is not demand validation.

## What is being priced

### Launch product boundary

The package follows the product decision in `PRODUCT-REVIEW.md`:

- one shared Gmail support inbox or selected label;
- triage by intent and urgency;
- retrieval from customer-approved support policies and product context;
- a grounded draft with visible context and uncertainty;
- an escalation or next-step recommendation;
- an approval inbox where a reviewer can approve, edit, reject, or escalate;
- an audit/history record containing the source thread, context, model route, usage, output, reviewer, and decision; and
- a copyable or saved Gmail draft only after the reviewer approves.

**Automatic sending is not included and is not a launch option.** MakeEase is not launching as a general helpdesk, an autonomous support agent, or the broad “Business Automation OS.” Slack, GitHub, Notion, Stripe, Linear, refunds, deployments, autonomous outbound messages, and broad workflow construction are expansion work.

### Current product reality

The reviewed repository is a local, dependency-free MVP/demo. Its UI has support flows, a review queue, model/credit limits, knowledge, history, and simulated plan/top-up behavior. The inspected `lib/config.js` still labels OAuth not configured, AI sandbox-only, and billing demo-only. Local authentication or ledger scaffolding is not a validated production tenant, payment, or provider boundary. Live Gmail, production isolation, usage reconciliation, verified billing, and real external writes remain launch prerequisites. Runtime work is happening independently; this memo does not certify its production readiness.

Therefore:

1. These prices are the launch policy to implement after the production gates are met.
2. The local UI's seeded credits, usage, approvals, integrations, and activity are not customer, billing, or revenue evidence.
3. No checkout, paid entitlement, or customer-facing savings claim should be enabled merely because this document exists.

## Customer-facing package

### Public launch plan: MakeEase Support

| Item | Launch decision |
|---|---|
| Price | **$149/workspace/month**, USD, monthly billing |
| Workspace scope | One workspace and one Gmail support inbox or label |
| Reviewers | Three named reviewers included, including the owner; up to two additional reviewers at **$20/month each**, maximum five on Support |
| Production workflow | One support-triage workflow |
| Included usage | **500 support threads prepared for review/month**; one prepared thread cycle is one support review packet as defined below |
| Context | Approved support policies, escalation rules, tone guidance, and product knowledge records |
| Review controls | Approval inbox, approve/edit/reject/escalate, decision reason, run trace, and history |
| Export and retention | 90 days of searchable run/output history and export; a longer archive is a later priced entitlement |
| Support | Business-hours email support, two-business-day response target, setup documentation, and one 30-minute kickoff |
| External effects | No automatic customer-facing send; an approved result may create or expose a draft only when the production Gmail capability is live and explicitly scoped |
| Rollover | None |
| Automatic overage | None |
| Default invoice cap | **$149 before tax**; the owner must explicitly pre-authorize any capacity add-on |

The price is intentionally presented as a workspace plan rather than a per-agent price. A small B2B SaaS team is buying a controlled support process; it should not have to predict which reviewer will use the product or which model route the platform will select.

Target the buyer in `PRODUCT-REVIEW.md`: a roughly 5–30-person B2B SaaS business with one recurring Gmail support queue and one to three operators. Qualify for recurring, reviewable categories and an accountable policy owner. A team seeking an unrestricted agent, a full omnichannel helpdesk, or the cheapest drafting feature is not the initial commercial fit. Claims about time saved require customer measurements, including review/edit time and setup effort.

### Guided pilot: first five to ten accounts

| Item | Pilot decision |
|---|---|
| Price | **$299 one-time for 30 days** |
| Included usage | 150 support review packets; hard stop, no paid capacity extension |
| Reviewers | Two named reviewers |
| Scope | One Gmail inbox/label and one support workflow |
| Service | 30-minute policy/context setup, four 15-minute weekly output reviews, and 30 minutes of asynchronous preparation; two hours total |
| Safety | Approval-before-send remains on; no autonomous external action |
| Conversion | Explicit opt-in to Support at $149/month; no automatic renewal or conversion credit |
| Discount policy | Any additional discount requires a written exchange for feedback, representative data access, and outcome measurement |

The pilot is a paid learning instrument, not a free trial disguised as consulting. It should measure the first approved draft, repeat weekly usage, edit/reject/escalation patterns, cost per prepared packet, support minutes, and willingness to continue at the public price.

Offer an unconnected, clearly labeled sample demo before the pilot. Do not offer unlimited live AI or a permanent free production tier during launch. Extra pilot implementation work requires a scoped paid service quote, not an invisible extension of the two-hour service allowance.

### Expansion packages — reserve, do not broadly sell at day one

The following are the commercial expansion path. They become generally available only after the launch gates in this document are met.

| Package | Target price | Intended scope | Availability decision |
|---|---:|---|---|
| **MakeEase Team** | **$499/workspace/month** | Three inboxes/labels, ten reviewers, three production workflows, 2,000 support review packets/month, 365-day history, routing and quality analytics, priority email support, and a quarterly operating review | Release after Support retention and cost telemetry are repeatable |
| **Business** | **Internal quote floor: $1,499/month** | Multiple workspaces or business units, role controls, priced volume/retention, implementation, and governed BYOK | Sales-assisted after a real buyer requests the controls; publish no usage allowance or feature entitlement before costing the order |
| **Enterprise** | **Internal quote floor: $3,499/month** | SSO/SCIM, procurement/security review, regional or dedicated execution requirements, customer-specific retention, SLA terms, and dedicated onboarding | Sales-assisted only; dedicated infrastructure and services can put the actual quote materially above the floor |

The Team price is intentionally aligned with the economics of the existing Growth hypothesis while giving the buyer a support-specific package. It is not a promise that the current local MVP already delivers these capabilities.

### Capacity and seat expansion

At launch, expansion must be explicit and bounded:

- **Additional reviewer:** $20 per reviewer per month. A named enabled account consumes a seat, whether active that day or not; replacing a deactivated reviewer does not create another simultaneous seat. Billing-only administration carries no thread/content access.
- **Managed-model capacity pack:** $49 for 250 additional support review packets in the billing month.
- **BYOK capacity pack (Team/custom later):** $39 for 250 additional support review packets when the production BYOK controls are live. This is not a launch Support option.
- A capacity pack is purchased in advance by an owner/admin. It raises that month's customer-visible cap; it does not create an uncapped account.
- Allow at most **two** 250-packet packs on Support: a hard maximum of **1,000 prepared thread cycles/month** and $247 before seat add-ons/tax. Team may later buy at most four packs, reaching 3,000 cycles/month. More volume is a sized plan/order, never “unlimited.”
- Additional inboxes and additional production workflows are not self-serve Support add-ons at launch. They are a Team or custom-scope conversation until connector reliability and support cost are measured.

Monthly allowances reset on the subscription anniversary using recorded UTC period boundaries, not at a guessed calendar month-end. Packs are non-renewing, consumed after the included allowance, and expire with that billing period; unused units have no cash value. Display expiry before purchase. Seat changes and plan changes take effect at the next renewal during the launch cohort; a capacity pack is the immediate-volume option. Cancellation stops the next renewal and keeps access through the paid term. Standard unused-allowance refunds are not promised; billing mistakes, failed delivery, and mandatory refund rights follow the published refund terms. A pricing-page click or checkout redirect cannot grant a paid pack without verified payment evidence.

### Annual billing

Launch billing is monthly only. After at least 60 days of observed retention, annual prepayment may be offered at a maximum **10% discount**, only if measured full-allowance delivery costs preserve the 80% target on net discounted revenue. The potential prices at that ceiling are:

- Support: $1,609.20/year, $134.10/month equivalent;
- Team: $5,389.20/year, $449.10/month equivalent.

The base Support cost model does not pass that discounted 80% test yet; do not advertise an annual discount as already available. The exact invoice, tax, revenue-recognition, cancellation, and credit-note treatment follows the approved payment-provider and tax design. No annual bulk usage pool is implied: included packets still reset monthly. Larger discounts or service credits need an explicit net-margin calculation and commercial rationale.

## Usage model

### Customer-facing unit: support review packet

A **support review packet** is one distinct source-thread snapshot processed into a reviewable result containing:

1. intent and urgency classification;
2. relevant approved context and policy references;
3. a grounded draft response, or a specific reason no safe draft can be prepared;
4. an escalation or next-step recommendation; and
5. a review-queue record that can later capture approval, editing, rejection, or escalation.

Customer copy is **“500 support threads prepared for review.”** Do not label a generated packet “reviewed,” “resolved,” or “sent.” It consumes capacity when preparation succeeds, even if the human later rejects or never opens it. Human-review completion and customer resolution are separate product metrics.

Counting rules:

- Reserve one packet slot atomically before work begins and consume it once when a usable triage/draft or evidenced escalation packet is saved. A technical error message alone is not a usable packet.
- Deduplicate using workspace, source thread/latest inbound message ID, and processing-operation identity. Polls, duplicate webhooks, refreshes, repeated approvals, and a retry of the same operation cannot count again.
- Manual reviewer edits, approval, rejection, escalation, draft saving, and bounded automatic provider retries for that cycle add no packet unit.
- A new inbound message may cause a new processing cycle. An explicit “prepare again” also uses one new unit and must say so before execution. Do not promise unlimited AI redrafting under one thread ID.
- Preflight rejection, spam filtered before processing, provider failure with no usable packet, and cancellation before preparation consume zero packet units. Retain incurred provider costs internally and release the packet reservation after reconciliation; a timeout is not evidence of zero external cost.
- Twenty sandbox/sample preparation cycles per workspace per month have a separate budget and no external effects. Further live-model testing consumes ordinary packet capacity with an explicit preview. A purely local synthetic preview is not provider usage or a paid result.
- Unused packet units expire at the end of the monthly billing period. There is no rollover or transfer. Retrying a timed-out financial/usage mutation must reconcile the original operation before creating a new one.

This definition is intentionally closer to a customer-visible work outcome than to an opaque token or model-call counter. It is still not the same unit as a competitor's ticket, session, automated resolution, outcome, or conversation; comparisons must not imply equivalence.

### Internal meters remain separate

The product should expose simple prepared-thread usage to customers while retaining the following internal events for finance and operations:

- standard workflow run;
- ordinary AI action;
- heavy AI/action step, including long context, OCR/multimodal work, browser/computer-use, or multi-step agent behavior;
- BYOK ordinary or heavy orchestration action;
- connector/API call, storage, egress, retry, and provider usage facts; and
- reservation, settlement, release, adjustment, and cap-hold events.

The rates in `PRICING-MODEL.md` remain the initial planning rates: $0.0015 per standard run, $0.004 per non-BYOK ordinary AI action, $0.025 per non-BYOK heavy action, $0.0015 per BYOK ordinary orchestration action, and $0.008 per BYOK heavy orchestration action. They are assumptions, not vendor quotes. Exact provider usage and invoice data replace them for post-run settlement when available.

### Service envelope and technical hard limits

These are launch entitlements to implement and verify, not measurements of the current runtime:

| Boundary | Support launch limit | Behavior above the limit |
|---|---|---|
| Source/context | Text-only support; up to 8,000 input tokens per model call and 2,000 output tokens per call | Show oversized context and ask for a narrower excerpt; never silently summarize away material policy or switch to an expensive route |
| Model work | Maximum three provider attempts per processing cycle, including retries; no unconstrained agent/tool loop | Stop and surface failure/escalation; automatic retries cannot multiply the bill or packet count |
| Execution | 60 seconds of active model/connector work per cycle, two concurrent cycles/workspace, maximum 100 queued compute cycles | Queue fairly or return a visible capacity state; human review waiting is not active compute, and unadmitted email stays in Gmail |
| Heavy work | No browser/computer-use, OCR/image/voice, long-context premium reasoning, or arbitrary code included | Separate sized/evaluated future package, not an automatic conversion of cheap units |
| Approved knowledge | 50 text records, 10,000 characters each, 1 MiB total stored approved text | Block import with a precise limit; no surprise storage bill |
| Retention/storage | 90-day searchable run/output history; maximum 500 MiB of text/artifacts per Support workspace; source mailbox remains the system of record | Export before scheduled deletion or the storage limit; pause new artifact-producing work rather than silently delete an unresolved review or add a storage bill. Financial-record retention is separate |

The managed route must pass the support evaluation bar and allow a **$0.05 maximum reserved direct-usage cost per cycle**. That is an internal stop, not the expected unit cost and not a charge to the customer. Enforce token, attempt, timeout, and provider-cost bounds before calls. If a provider bills above a reservation because of an accounting variance, MakeEase bears the variance and investigates it; the customer never gets an unapproved charge. Team may later raise concurrency to five and artifact storage to 5 GiB for its longer history; higher context, retention, or workload classes require an explicit price/cost review. Financial/tax retention and account-deletion obligations are not waived by a product-history limit.

### What happens at the cap

At 80% and 90% of the current allowance, notify workspace owners and show a forecast only when enough real usage exists. At 100%:

1. stop admitting new billable processing cycles;
2. finish or safely checkpoint a run that was already admitted and reserved;
3. retain read-only history, audit export, policy editing, and review decisions where safe;
4. explain that the workspace is at its configured capacity; and
5. resume only after the owner purchases a capacity pack, upgrades, or reaches the next billing period.

There is no silent credit grant, automatic card charge, or hidden fallback to a cheaper/unapproved model. If the provider is unavailable or the internal cost circuit breaker trips, the UI must show a provider/cost hold rather than pretending that a draft or external action completed.

## Hard caps and spend controls

### Customer-visible invoice cap

The default formula is:

```text
monthly invoice before tax
  = subscription price
  + explicitly purchased capacity packs
  + approved seat add-ons
```

Examples:

| Scenario | Maximum monthly invoice before tax |
|---|---:|
| Support, no add-on | **$149** |
| Support + one managed 250-thread pack | **$198** |
| Support + two managed packs (1,000 prepared cycles total) | **$247** |
| Support + two managed packs and two additional reviewers | **$287** |
| Team, no add-on | **$499** |
| Future Team + one BYOK pack | **$538**, plus the customer's separate provider invoice |

The owner/admin must explicitly authorize any amount above the subscription. The service reserves packet capacity and estimated internal cost atomically before dispatch and retains an auditable hold reason. A browser request cannot change the price, plan, cap, or credit balance directly. Taxes and any currency-conversion fees charged by the customer's bank are outside the pre-tax MakeEase service cap; show applicable tax and the final checkout total before payment. No hidden connector surcharge is permitted in this launch package.

### Internal delivery-cost circuit breaker

The customer invoice cap and the internal delivery-cost budget are separate controls. Begin with the existing model's planning policy: an internal total delivery-cost ceiling equal to the **lower of 150% of modeled full-allowance direct COGS or 30% of net recurring service revenue**. The 30% term preserves the 70% operating floor. Allocate known tenant/user/support cost first; reserve remaining variable cost before dispatch. This is a total-cost control, not permission to spend that full amount on tokens in addition to fixed delivery costs.

Using the launch assumptions below, the initial internal budgets are approximately:

| Plan | Modeled full-included direct COGS | Initial internal cost budget (lower of 1.5x COGS or 30% of net recurring revenue) |
|---|---:|---:|
| Support, including test allowance | $29.65 | **$44.47** (rounded down) |
| Team, including test allowance | $92.90 | **$139.35** |

When projected internal cost approaches this budget, hold heavy work first, then ordinary AI work, then new standard runs. Preserve the run state, evidence, and reason for the hold. This threshold is not a customer charge and is not a service-level guarantee.

Recalculate the budget for paid seats/capacity using their actual incremental costs and net revenue. Trial, test, retry, failure, ingestion, and support costs must be included rather than hidden in an unmetered bucket. Add an organization-wide daily provider limit to contain correlated retry loops across workspaces.

An internal cost hold is an incident to resolve, not a way to quietly take back a purchased allowance. Inform the customer, retain work, restore a tested route, and offer an appropriate extension, service credit, or refund for capacity MakeEase cannot deliver. Change future limits/rates prospectively with at least 30 days' notice and a cancellation opportunity; never retrospectively reclassify already admitted work into a more expensive meter. Price changes for fixed annual terms apply at renewal unless the agreed contract says otherwise.

## BYOK treatment

BYOK means that the customer supplies a supported model-provider key and receives the provider's model invoice directly. It does not mean that MakeEase gives away its workflow, policy, approval, evidence, Gmail, or usage-governance layer.

### Launch policy

- Public Support checkout uses a MakeEase-managed model route initially.
- BYOK is a gated Team/custom option later, and may be tested in a paid pilot by exception only after production secret-reference storage, access auditing, provider isolation, and usage reconciliation are live. Public Support is managed-model only at launch.
- BYOK does **not** reduce the monthly subscription. The subscription pays for the control plane, scoped connection, context retrieval, approval queue, audit/history, execution admission, and support operating model.
- The same packet allowance and customer hard-cap behavior apply whether the model route is managed or BYOK. Switching routes cannot create a second allowance or bypass limits.
- When BYOK is enabled, the customer pays the model provider directly and remains responsible for provider quotas, rate limits, provider availability, model terms, and provider-side budget settings.
- MakeEase meters its own orchestration and packet usage and charges the lower BYOK capacity-pack rate above when that option is released. It does not add the provider's invoice to the MakeEase invoice. No unused managed-inference refund or cash credit is generated by enabling BYOK.
- A MakeEase cap cannot guarantee a hard cap on a third-party provider invoice. If the provider does not expose a budget or rate-limit control that MakeEase can verify, state that limitation plainly and stop MakeEase admission at its own cap.
- If BYOK fails or is exhausted, pause. Do not fall back to a MakeEase-paid or different data-handling route without explicit owner consent and capacity/cost admission.
- Keys are stored as secret references in a production vault/KMS boundary. They must not appear in browser payloads, workflow definitions, prompts, logs, exports, or the local demo fixture. BYOK is a model API credential, distinct from customer-managed encryption keys.

Do not make model choice the main packaging axis. Customers should choose the governance and support outcome; MakeEase should select a tested logical route unless an eligible customer explicitly pins an approved route.

## Margin guardrails

### Targets and definitions

The financial model uses delivery COGS: provider/model usage, connector/worker infrastructure, tenant baseline, included-user service cost, and expected account support. **Revenue is net of discounts, refunds, and service credits, and excludes collected taxes.** Direct gross margin is `(net service revenue - delivery COGS) / net service revenue`. Payment processing is shown separately in contribution to remain comparable to `PRICING-MODEL.md`; finance must still report it and bad debt/disputes in a complete financial view. Product engineering, G&A, sales/marketing, and financing are operating expenses, not hidden in this plan-margin table.

Guardrails:

- **80% direct gross-margin target** at full included usage for a mature plan;
- **75% direct gross-margin review threshold** if observed for two consecutive months;
- **70% minimum operating floor** for admitting new expensive workload classes or quoting nonstandard contracts. Incident holds follow the delivery-remedy policy above; scope/rate changes are prospective, not a surprise loss of prepaid capacity;
- **20% cap-hit trigger:** if more than 20% of active workspaces hit their plan cap in a month, review allowance and package fit rather than automatically increasing limits;
- **1.5x cost trigger:** if p95 cost for a heavy class exceeds 1.5 times its planning rate, reclassify or reprice it;
- **50% support trigger:** if support time exceeds the included allocation by 50%, remove high-touch work from self-serve or raise price; and
- **9-month CAC-payback trigger:** if measured payback exceeds nine months, fix acquisition/activation or price before scaling spend.

### Launch unit-economics working model

The following table is a planning calculation, not a market fact or vendor quote. It uses a **$0.02 expected direct-usage budget per packet**. One illustrative standard cycle is one standard run ($0.0015) plus two ordinary AI actions ($0.008), leaving $0.0105 for weighted retries, retrieval, connector handling, and other usage delivery. This is a new mapping assumption, not a proven token budget or a guarantee about every model. The separate $0.05 per-cycle reservation ceiling controls the tail; it cannot be used as the average cost in this table. Replace assumptions with provider and connector measurements before accepting a paid cohort.

| Plan | List price | Included packets | Usage budget at $0.02/packet (included + test) | Tenant infrastructure | Included-user cost | Support allocation | Total modeled recurring direct COGS | Direct gross margin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Support | $149 | 500 | $10.40 | $5.00 | $2.25 | $12.00 | **$29.65** | **80.1%** |
| Team | $499 | 2,000 | $40.40 | $10.00 | $7.50 | $35.00 | **$92.90** | **81.4%** |

The table includes the separate 20-cycle test allowance at full use. Use these test-inclusive figures in the operating dashboard. A cost-control estimate is not a customer entitlement currency.

For Support, the assumed payment processing rate is 2.9% + $0.30 per transaction, not a verified processor quote. At $149, the fee is $4.62 and full-allowance contribution after tests is approximately **$114.73/month (77.0%)** before CAC and fixed operating expense. At an assumed $400 fully loaded CAC, steady-state payback is approximately **3.5 months**; neither CAC nor payback is a measured result. Do not double-count first-month onboarding in both CAC and COGS.

The model is sensitive to expected packet cost. Including test use, $0.025/packet puts Support direct COGS at **$32.25 (78.4%)**; $0.04/packet produces **$40.05 (73.1%)**; $0.05/packet produces **$45.25 (69.6%)**. A 30-minute monthly support burden rather than the assumed 12 minutes adds $18 and reduces base test-inclusive margin to **68.0%**. Those results explain why unlimited use, unrestricted premium models, and unlimited concierge support cannot be included.

At $134.10/month annual-equivalent revenue, test-inclusive Support margin is approximately **77.9%**. To preserve 80%, full-allowance cost must be at most **$26.82/month**. The annual option is therefore conditional, not a day-one discount. Team's same test-inclusive cost at $449.10/month produces approximately 79.3%, so its annual option also needs a measured cost improvement.

### Onboarding, pilot, and expansion economics

- **Standard kickoff:** one 30-minute session costs an assumed $30 at the loaded rate. If charged to first-month service delivery, Support's test-inclusive first-month direct margin is about **60.0%**, not 80.1%. Pilot graduates do not receive a duplicate kickoff. Track the one-time cost separately and do not hide it in steady-state margin claims. This is a margin view, not a promise that a $149 first month covers the company's full acquisition cost.
- **Guided pilot:** two service hours cost $120; $5 tenant allocation + $1.50 for two users + $3 for 150 packets + $0.40 test allowance gives **$129.90 modeled delivery cost**, or **56.6% direct margin** on $299. Assumed processing is $8.97, leaving **$160.13 contribution (53.6%)**. The lower pilot margin is a deliberate, capped first-cohort learning investment, not the recurring plan target.
- **Managed capacity pack:** 250 packets at $0.02 cost $5; a $49 pack has **89.8% incremental usage margin before incremental support/processing**. Even at $0.05, usage-only margin is 74.5%. Include the support and payment effect when quoting volume.
- **BYOK capacity pack:** use a planning platform-only budget of $0.006/packet, excluding the customer's model invoice. A $39/250 pack then has $1.50 usage cost and **96.2% usage-only margin**, before other incremental delivery costs. This is not a statement that total customer spend is lower under BYOK.
- **Additional reviewer:** $20 revenue against $0.75/user service cost is $19.25 before incremental support, payment cost, and taxes. Adding seats does not add packet capacity.
- **Custom plans:** build a bottom-up quote for included packets, connectors, expected support, retention, infrastructure, security review, and committed capacity. Enforce net-revenue margin targets after discounts; the $1,499/$3,499 internal floors are not margin evidence or universal all-in prices.

No break-even company forecast or LTV claim should be copied from the old broad-plan mix into this narrower launch. Replace those assumptions with observed plan mix, churn, sales effort, and support. For example only, $120,000 of monthly fixed operating expense divided by $114.73 Support contribution implies about **1,046 Support accounts before acquisition spend**; that is arithmetic scale context, not a forecast or justification to hire.

### Cost accounting rules

Production billing must preserve the distinctions in `LEDGER-CONTROLS.md` and `PLATFORM-ROADMAP.md`:

1. Provider usage facts are not customer invoices.
2. Reservations are holds, not consumption and not revenue.
3. Consumption is settled from measured usage or an explicitly labeled sandbox classification.
4. Commercial billing is separate from the application usage ledger.
5. A failed or timed-out provider request is not automatically zero cost.
6. Rate cards are versioned; a later rate change cannot rewrite history.
7. Payment-provider events are verified and idempotent before entitlements or capacity are granted.
8. Taxes, refunds, chargebacks, credits, and manual adjustments are separate ledger events.

## Support and service assumptions

The price includes a bounded support service, not unlimited consulting.

### Support plan

- Email support Monday–Friday, 09:00–17:00 UTC, excluding published company holidays. Publish that window rather than implying all time zones are covered continuously.
- Two-business-day response target; no 24/7 or uptime SLA at launch.
- One standard 30-minute kickoff per workspace.
- Documentation for Gmail scope, approved policy/context, escalation categories, approval behavior, and emergency pause.
- No custom prompt engineering, historical migration, bespoke connector, or continuous human review included.
- Planning allocation: approximately 0.20 support hours/month at the $60/hour loaded rate, or $12/month. This is an internal staffing average, not a ticket quota that cuts off ordinary defect/billing support. Scope custom configuration separately. The buyer supplies the human reviewers; MakeEase is not providing a staffed support desk or reviewing 500 replies for $149.

### Guided pilot

- Concierge policy/context setup within the two-hour total service scope.
- Four 15-minute weekly reviews of sampled drafts and failure modes.
- Explicit emergency pause and escalation-boundary design.
- Pilot delivery time is costed explicitly above. A mapping or import project beyond the pilot scope is quoted separately. Further concessions require an explicit first-cohort acquisition/learning budget; they do not prove that a $49 recurring plan can carry concierge support.

### Team and custom service

- Team gets priority email and one quarterly operating review; planning allocation is approximately $35/month.
- Business/Enterprise onboarding, security review, data mapping, retention design, training, and SLA support are quoted from the actual work. A $500–$5,000 one-time implementation range is a planning envelope only, not a public promise.
- A customer success claim must use measured usage, approval/edit/reject behavior, review latency, or customer-provided labor data. MakeEase must not invent hours saved, automation rate, or recovered revenue.

## Verified competitor pricing versus MakeEase assumptions

### Evidence status

All ten briefs in `research/competitors/` were reviewed after they became available: `make.md`, `zapier.md`, `n8n.md`, `lindy.md`, `intercom-fin.md`, `zendesk.md`, `gorgias.md`, `agentforce.md`, `uipath.md`, and `power-automate.md`. They use official public pages and explicitly separate product facts from claims/inference. Intercom, Zendesk, and Gorgias pricing were also spot-checked directly for this memo; Front, Help Scout, Freshdesk, and Hiver were read as adjacent support benchmarks.

**“Verified public price” means a figure was observed in an official source on 2026-10-16, either in the research brief's source capture or the direct checks. It is not an audited invoice, a negotiated quote, or proof that every packaging surface agrees.** Annual equivalents, monthly charges, currencies, prerequisites, promotions, and included units are kept distinct. Unavailable or contradictory figures remain unresolved.

### Support competitors

| Vendor and official page | Verified public pricing observed | Pricing signal relevant to MakeEase |
|---|---|---|
| [Intercom pricing](https://www.intercom.com/pricing), [Fin outcomes](https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes); brief: `intercom-fin.md` | Headline seats Essential **$29**, Advanced **$85**, Expert **$132** per seat/month are observed under an annual/monthly toggle; do not assume these are all flexible-monthly quotes. Standard Fin service outcomes are **$0.99**, including a completed Procedure handoff under the documented rule. Fin on an existing helpdesk has no seat fee but a minimum commitment (50 outcomes is the public example). Copilot explicitly lists **$29 annual-equivalent/$35 monthly per agent**; Pro starts at $100/month. | An outcome is not necessarily a confirmed resolution. Sales qualification is separately documented at **$9.99**. Do not apply $0.99 to every Fin use case or equate it with preparation for human review. |
| [Zendesk pricing](https://www.zendesk.com/in/pricing/), [resolution tiers](https://support.zendesk.com/hc/en-us/articles/9570369117338); brief: `zendesk.md` | Annual equivalents: Support Team **US$19/agent/month**, Suite Team **$55**, Suite Professional **$115**. Flexible monthly display: **$25/$69/$149**. Copilot is **$50/agent/month annually**. The regional page displays US$2 PAYG resolutions but also a mixed-currency committed figure (£1.30). | Newer resolution-tier docs and older public allowance labels coexist. The applicable account platform, verified-resolution rule, allowance, rate, and currency require a quote; $2 is an observed page figure, not a universal current AI price. |
| [Gorgias pricing](https://www.gorgias.com/pricing); brief: `gorgias.md` | One structured Helpdesk offer set shows Starter **$10/month/50 tickets**, Basic **$50 annual-equivalent/$60 monthly/300 tickets**, Pro **$300/$360/2,000 tickets**, and Advanced **$750/$900/5,000 tickets**. AI interaction rates shown are **$0.90 annual/$1 monthly**, with **$1.50** above stated allowance. A second embedded set shows Basic/Pro/Advanced **$77/$471/$1,227**. | The conflicting embedded totals may reflect different bundling; the evidence does not establish one canonical all-in quote. Record both, confirm inclusions, and remember an automated interaction also counts as a Helpdesk ticket. Do not pick the lowest snippet to construct a savings claim. |
| [Front pricing](https://front.com/pricing) | Starter **$25/seat/month** annually, Professional $65/seat, Enterprise $105/seat. Front AI Autopilot is shown from **$0.05/conversation**; Copilot is $20/seat/month for Starter/Professional and included in Enterprise. | Shared inbox plus human-in-control AI can command a seat subscription and a separate usage layer. |
| [Help Scout pricing](https://www.helpscout.com/pricing/) | Headline Standard **$25/user/month**, Plus **$45**, Pro **$75** under an annual/monthly toggle; Plus lists unlimited AI Drafts. AI Answers is **$0.75/resolution**. Free includes five users, one inbox, and one Docs site with other limits. Billing basis for the captured headline must be confirmed before comparison. | Existing customers may already get drafting at little incremental cost. MakeEase must prove workflow/evidence value, not price as if competitors only sell autonomous bots. |
| [Freshdesk pricing](https://freshdesk.com/pricing) | Growth **$19/agent/month** annually, Pro $55, Enterprise $89. Additional Freddy AI Agent sessions are **$49 per 100**; Copilot **$29/agent/month annually**. The FAQ qualifies the first 500 sessions as **once per account**, not 500 free sessions every month. | A 72-hour email session is a different unit from a prepared thread snapshot. Do not turn a one-time trial allowance into a recurring plan comparison. |
| [Hiver Omni pricing](https://hiverhq.com/pricing/hiver-omni) | Growth **$25/user/month** annually or $35 monthly, Pro $55/$65, Elite $85/$95. AI agents are listed across plans; Voice is shown at $30 per voice seat/month with 1,000 minutes and $0.03/minute overage. | Gmail/shared-inbox adjacency is already priced per user; MakeEase must differentiate on review governance and evidence rather than inbox access alone. |

### Horizontal automation, agents, and enterprise platforms

| Vendor / brief | Verified official-source observation | Decision implication / qualification |
|---|---|---|
| Make — `research/competitors/make.md`; [credits](https://help.make.com/credits), [extra credits](https://help.make.com/extra-credits) | **Current list prices were not verified**: the public pricing landing page was blocked. Official Help confirms non-AI operations generally use one credit, dynamic AI use, custom-provider token bills paid separately, and extra credits with a 25% premium. Automatic extra-credit purchase can be enabled within documented limits. | Do not invent a current Make dollar price from memory or dated examples. Borrow understandable scope plus underlying usage evidence; make auto-purchase off and retain platform fees under BYOK. |
| Zapier — `zapier.md`; [pricing](https://zapier.com/pricing), [MCP usage](https://docs.zapier.com/mcp/overview/usage) | Free 100 tasks/month; Professional starts at **$19.99/month annual-equivalent or $29.99 monthly** for 750 tasks; Team **$69 annual-equivalent/$103.50 monthly** for 2,000 tasks. Successful MCP calls use two tasks; Agents have a separate activity meter. | A task is normally a successful action, not an entire reviewed thread. Templates may reduce setup cost; multiple steps and model charges change TCO. MakeEase is not the lowest entry price. |
| n8n — `n8n.md`; [pricing](https://n8n.io/pricing/) | Cloud Starter **€20/month annually/2,500 executions**; Pro **€50/month annually/10,000 executions**. Business **€667/month annually/40,000 executions**, self-hosted on the reviewed page. Community is license-fee-free for permitted internal use, with hosting/operations obligations. | Keep EUR as EUR; no assumed FX conversion. Execution pricing does not establish model/API or self-hosting TCO. Technical buyers can build cheaper workflows and may prefer n8n. |
| Lindy — `lindy.md`; [pricing](https://www.lindy.ai/pricing), [home](https://www.lindy.ai/) | The pricing page shows **$29.99/3,000 credits monthly**; the home page shows **$49.99/5,000 credits** and a per-user entry claim. Docs instead describe Plus/Pro/Max and direct buyers to in-app billing. Top-ups are shown at $10/1,000 credits; depletion pauses credit-using work. | The discrepancy is verified; **a single current canonical entry price is not**. Credit ranges and in-flight cap overshoot make cost predictability an opportunity, not evidence that Lindy lacks caps or approvals. |
| Salesforce Agentforce — `agentforce.md`; [pricing](https://www.salesforce.com/agentforce/pricing/) | **$500/100,000 Flex Credits**; a normal action uses 20 credits, so **$0.10/action is derived arithmetic**. Conversations are listed at **$2**. Employee access can include **$5/user/month plus Flex consumption**; other add-ons differ. | CRM/Data 360 and other entitlements can add cost. A headline action price is not a complete implementation price. Do not mix incompatible org-level buying models in a comparison. |
| UiPath — `uipath.md`; [pricing](https://www.uipath.com/pricing) | Community is free; Basic starts at **$25/month** with scale/region limitations and potential additional users/robots. Standard and Enterprise are contact-sales. | Do not invent an enterprise/RPA quote or present the Basic price as equivalent to a governed production program. Machines, runtimes, implementation, and operations matter. |
| Microsoft Power Automate / Copilot Studio — `power-automate.md`; [Power Automate pricing](https://www.microsoft.com/en-us/power-platform/products/power-automate/pricing), [Copilot Studio pricing](https://www.microsoft.com/en-us/copilot/pricing/copilot-studio) | Annual-paid Power Automate Premium **$15/user/month**, Process **$150/bot/month**, Hosted Process **$215/bot/month**. Standalone Copilot Studio pre-purchase is **$200/month for 25,000 Copilot Credits**; feature rates vary and Azure/maker/tenant prerequisites apply. | A Microsoft customer may already own useful seeded rights. User licenses, bot capacity, hosting, and AI credits are not interchangeable, and MakeEase cannot promise to beat every bundle. |

### Product/pricing conclusions from the research

1. **A control layer has value, but approval is not unique.** Fin, Zendesk, Make, n8n, Lindy, Microsoft, and UiPath all document human-control patterns of different scope. Sell a simpler, consistently enforced support review/evidence flow; do not claim competitors have no governance.
2. **Baseline control is included, not an “AI safety” surcharge.** Approval, trace/history, budget caps, and export belong in Support. SSO, custom retention, dedicated infrastructure, and implementation can expand the contract only when real capabilities/costs exist.
3. **Keep two accounting views.** The buyer sees work prepared and the maximum MakeEase bill; operations sees calls, tokens, retries, data movement, and external provider exposure. BYOK shifts one cost, not all delivery costs.
4. **Deep commerce/RPA is a different product cost base.** Gorgias, UiPath, Microsoft, and Agentforce demonstrate that extra channels, storefront actions, finance, robots, and enterprise integration involve real implementation and support. The future CommerceOps package in `ECOMMERCE-PACKAGE.md` needs its own priced volume/risk envelope; it is not included in $149 Support or a $49 capacity pack.

### What is verified, what is assumed, and what is inferred

**Verified source observations:** public prices and feature/meter descriptions above, with the explicit unavailable, mixed-currency, prerequisite, and conflicting-price qualifications preserved. Performance, security certification, customer-savings, and reliability assertions remain vendor claims unless separately established.

**MakeEase assumptions/decisions:** $149 Support price, $299 pilot, 500 included prepared cycles, the $0.02/packet expected cost, $0.05 per-cycle cost ceiling, test allowance, support allocations, $20 reviewer add-on, $49/$39 capacity packs, $499 Team price, annual discount ceiling, and the margin thresholds. None is measured willingness to pay, an observed production cost, or a competitor claim.

**Inference to validate:** prepared-thread pricing may be easier for the target buyer than raw operations/credits. Test whether a buyer can calculate a month's allowance, understand reprocessing, explain a cap, and predict the final invoice unaided. The research establishes that these meters exist, not that all buyers understand them.

## Why MakeEase should not promise to be universally cheapest

MakeEase should not market “the cheapest AI support tool” or “the lowest price per ticket.” That promise would be both strategically weak and technically misleading:

1. Competitors price different products and units: a seat, ticket, conversation, automated resolution, AI outcome, session, or add-on. A direct price ranking would compare unlike services.
2. Mature vendors have materially broader scope, including ticketing, omnichannel channels, help centers, voice, routing, analytics, marketplaces, and autonomous resolution. MakeEase should not pretend to replace all of that at a lower price.
3. MakeEase deliberately pays for approved context, visible evidence, bounded execution, reviewer control, audit history, and safe failure. Those controls create real delivery and support costs; removing them to win a price race would damage the product's reason to exist.
4. Model and connector costs vary. A low list price paired with an uncapped or opaque AI meter can be more expensive than a higher subscription with a hard cap. MakeEase's advantage is predictable control, not a guarantee that every customer's invoice will be the lowest.
5. A universal-cheapest claim invites a race against vendors with greater scale and a different margin structure. MakeEase should instead win a narrow buyer who values reviewability, policy grounding, and accountability before customer-facing action.

Some customers should rationally pay less for an existing helpdesk's included drafting, a promotional/startup plan, or a technical workflow they operate themselves. Some will value a full autonomous service product more than MakeEase's manual-review model. Those are legitimate alternatives, not evidence that every competitor is overpriced. MakeEase must show measured net benefit for its chosen buyer and include existing subscription, model, implementation, reviewer labor, and ongoing operation costs in any customer-specific comparison. No blanket percentage-savings or feature-parity claim is approved.

The customer-facing position is:

> **MakeEase is the approval-first support workflow for small B2B SaaS teams that need faster drafts without giving an opaque bot the final say.**

The pricing promise is **clear scope, a visible allowance, and no surprise overage by default**. It is not “cheapest for everyone.”

## Launch gates and review cadence

### Must be true before live paid launch

The production team must have, at minimum:

- authenticated, tenant-scoped durable storage;
- one versioned server-side price book mapped to payment-provider IDs;
- verified payment webhooks with durable inbox, replay protection, and idempotency;
- append-only usage/credit ledger with reserve, consume, release, correction, and reconciliation behavior;
- real Gmail OAuth with the smallest necessary scope and a tested disconnect path;
- production secret references and BYOK isolation before BYOK is marketed;
- explicit sandbox/live separation with no simulated success presented as live;
- approval, pause, retry, and uncertain-provider states that cannot silently send or duplicate work;
- tax, invoice, refund, chargeback, revenue-recognition, and data-retention decisions approved for the launch markets; and
- a contract/smoke test that exercises the same workflow boundary as the browser.

Until these exist, the correct label remains **local sandbox/demo only**.

### First 30–60 days of paid evidence

Review weekly:

- prepared packet cycles per workspace and p50/p90/p99, with completed human reviews reported separately;
- first approved draft and three-thread-in-seven-days activation;
- approval, edit, reject, escalation, and provider-failure rates;
- actual direct cost per prepared packet and by model route, including failed/test/retry costs in the numerator;
- retries, heavy-step share, connector/API cost, and BYOK share;
- support minutes per workspace;
- percentage of workspaces reaching the cap;
- paid pilot-to-Support conversion and measured churn;
- customer-reported time or error outcomes, clearly separated from generated drafts; and
- payment failures, refunds, discounts, credits, and chargebacks.

Review the package at day 30, day 60, and every quarter thereafter. Do not increase included usage solely because a prospect asks for an unlimited plan; first establish the cost and value distribution. The first cohort must produce at least five explicit conversions at the full $149 recurring price and real recurring usage before a broader self-serve release. Record the denominator, discounts, and reasons lost; five hand-selected pilots alone are not product-market fit.

### Expansion gate

Open Team packaging only when all of the following are evidenced:

- at least 10 paying workspaces use Support weekly;
- week-eight retention and repeat volume are measured;
- approval/edit/reject/escalation/failure rates are understood and acceptable;
- actual cost per prepared packet and net direct gross margin are known;
- at least three customers independently request multiple inboxes, workflows, or routing/analytics; and
- the production control plane can support those entitlements without relying on the local JSON demo.

## Reference documents

- `PRODUCT-REVIEW.md` — launch wedge, ICP, activation, onboarding, and expansion gate.
- `PRICING-MODEL.md` — assumption-labeled broad-plan unit economics, cost rates, BYOK rates, caps, and sensitivity.
- `LEDGER-CONTROLS.md` — production ledger, provider-event, entitlement, reconciliation, and close controls.
- `BILLING-TAX-NOTES.md` — tax, invoice, refund, chargeback, revenue, and global launch questions.
- `CODEBASE-REVIEW.md` and `README.md` — current local/demo runtime boundaries.
- `lib/config.js`, `ui/api.js`, and `ui/views.js` — inspected demo price, usage, cap, and support-review surfaces; no runtime file was edited for this decision.
- `research/competitors/{make,zapier,n8n,lindy,intercom-fin,zendesk,gorgias,agentforce,uipath,power-automate}.md` — all ten supplied competitor briefs reviewed, with their first-party source registers and confidence qualifications.
