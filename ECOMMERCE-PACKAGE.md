# MakeEase CommerceOps package (later expansion)

**Status:** product hypothesis for a later package; not a runtime specification or a claim that any integration is live.

## Executive thesis

The highest-value ecommerce package MakeEase could offer is a **CommerceOps Control Tower** for Shopify-first direct-to-consumer brands. It would unify order and customer-support context, detect inventory and fulfillment exceptions, prepare refund and replenishment decisions, coordinate marketing operations, and reconcile the money trail. Every recommendation would be traceable to source events, a policy, and an approval decision.

The product should sell **fewer operational mistakes and faster exception handling**, not a generic chatbot. The valuable unit is a resolved exception with evidence and a safe next step:

1. ingest an event from a commerce, support, shipping, marketing, or finance system;
2. attach the relevant order, customer, SKU, shipment, policy, and financial evidence;
3. classify urgency, risk, and owner;
4. recommend or draft the next action;
5. route consequential actions through the merchant's approval policy;
6. execute only an allowed, idempotent action;
7. write an immutable audit trail and reconcile the result.

The package should start with the narrowest high-frequency wedge—**order/support triage plus fulfillment exceptions**—then add refunds, inventory, marketing, and finance once the data model, approval system, and integration reliability are proven.

## Who this is for

### Initial ICP hypothesis

- Shopify or Shopify Plus brands with one or a few stores.
- Roughly 1,000–50,000 orders per month, enough exception volume to employ operators but not enough to build a full internal operations platform.
- A support/helpdesk team, a 3PL or carrier network, and a finance owner who currently reconcile spreadsheets and exports.
- Repeated exceptions: “where is my order,” address changes, delivery failures, damaged goods, duplicate charges, stockouts, returns, and payout mismatches.
- A decision-maker who can approve data access and define monetary/action thresholds.

### Poor first customers

- A brand with too little order volume to produce recurring exception work.
- A marketplace-only seller without a stable system of record.
- Regulated or high-risk products where every customer outcome requires specialist review before the control model is mature.
- A retailer asking for a fully autonomous purchasing, refunding, customer-messaging, or ad-spend system.
- A multi-entity enterprise that needs a full ERP, tax engine, warehouse-management system, or order-management replacement before this package is useful.

These exclusions keep the first version focused on exception operations rather than attempting to become the merchant's commerce platform.

## Package promise and product shape

### Promise

> MakeEase turns noisy commerce events into an evidence-backed queue of decisions, with the right operator approving the right external action and a clean record of what happened.

### Control-tower layers

1. **Event and identity layer** — orders, customers, products, variants, inventory locations, shipments, tickets, returns, payouts, campaigns, and vendors are normalized with source IDs and timestamps.
2. **Evidence layer** — the operator sees the exact source records, policy text, previous actions, and confidence or data-freshness warnings used for a recommendation.
3. **Policy layer** — workspace rules define routing, SLA, approval tiers, monetary limits, allowed actions, sensitive categories, and escalation owners.
4. **Decision layer** — deterministic checks run before model assistance. The model can classify, summarize, draft, and rank; it cannot invent a source fact or silently override a policy.
5. **Approval and execution layer** — approvals are scoped to a specific action and payload, expire when relevant facts change, support idempotency, and produce a receipt.
6. **Reconciliation layer** — successful or failed actions are checked against the source system and surfaced until resolved.
7. **Reporting layer** — outcome, efficiency, quality, risk, and cost metrics are visible by workflow, store, channel, product, and operator.

### Package modules

| Module | Core outcome | First release posture |
| --- | --- | --- |
| Order & Support Triage | Faster, more consistent handling of order-related contacts | Recommend, route, tag, and draft; send only with an approved action |
| Refunds & Approvals | Reduce refund leakage while shortening approval time | Calculate and request; human approves every monetary outcome |
| Inventory Alerts | Find stockout and overstock risk early | Alert and recommend; draft replenishment or allocation, never purchase autonomously |
| Fulfillment Exceptions | Resolve late, lost, damaged, and blocked shipments | Gather evidence and prepare the resolution; consequential customer action requires approval |
| Marketing Operations | Reduce campaign and catalog errors | QA, summarize, segment, and draft; publishing, spend, and sends require approval |
| Finance Reconciliation | Make payout/order/refund variance visible | Match, explain, and create a close queue; no autonomous accounting or payment |

The package is strongest when the modules share one order/customer/SKU/financial evidence model. Selling disconnected “AI agents” would recreate the fragmentation the package is meant to remove.

## Workflow details

### 1. Order and support triage

**Inputs:** helpdesk ticket or email, customer identity, order history, fulfillment state, tracking events, product/variant data, return policy, subscription status, and prior conversations.

**Automation:**

- Classify intent and urgency: order status, address change, cancellation, return, refund, damaged item, missing item, duplicate charge, product question, subscription issue, abuse signal, or unknown.
- Resolve the customer to the correct order(s) without exposing another customer's data; show ambiguity when identity matching is not conclusive.
- Pull a compact timeline of order, payment, fulfillment, shipment, ticket, and prior outcome events.
- Apply SLA and queue tags; route to the correct team or specialist.
- Recommend a policy-compliant next step and draft a response using approved tone and macros.
- Detect contradictory facts, stale tracking, repeated contacts, possible abuse, and requests outside policy.
- Track whether the operator accepted, edited, rejected, or escalated the recommendation; use this as quality evidence, not as permission to broaden access.

**Safe automatic actions, if explicitly enabled:** internal ticket tagging, queue assignment, duplicate detection, evidence retrieval, and creation of a draft. These are reversible or internal and must still be logged.

**Required handoff:** an operator reviews the customer-facing text and any promise about refund, replacement, shipping date, discount, policy exception, or account change before it is sent.

### 2. Refunds and approvals

The system should turn a refund request into a structured decision packet rather than a one-click “refund agent.”

**Decision packet:** order and payment IDs; fulfillment and return status; item, shipping, tax, and discount amounts; prior refunds or credits; return-policy clause; reason code; fraud/abuse signals; recommended amount; confidence; and an explicit action scope.

**Approval matrix example:**

| Case | Default treatment | Approver |
| --- | --- | --- |
| Within published policy, no abuse signal, low amount | Queue a review with a precomputed amount | Trained support operator |
| Partial refund, shipping credit, replacement, or policy exception | Queue with evidence and customer-impact summary | Support lead or manager |
| High amount, repeat refund, chargeback signal, gift-card credit, or cross-border tax issue | Escalate and lock the packet | Finance/operations owner |
| Any conflicting payment/order data | Stop and request reconciliation | Finance owner |

Thresholds must be merchant-configured and can be stricter by SKU, country, customer segment, channel, and reason. A threshold is an approval routing rule, not permission for the model to bypass approval.

**Execution controls:** exact amount and currency are bound to the approval; a changed order, payment state, or policy invalidates it; retries use an idempotency key; the result is read back from the source system; and a failed or partial result creates a visible exception rather than a second attempt with a different payload.

### 3. Inventory alerts and replenishment recommendations

**Signals:** on-hand and available-to-sell inventory by location, committed stock, inbound purchase orders, sales velocity, seasonality, lead time, safety stock, bundles, returns, channel allocation, and inventory adjustments.

**Automation:**

- Alert on projected stockout, unsafe stock cover, oversell risk, stranded inventory, unexpected adjustment, and stale inventory feeds.
- Separate a real stockout from a sync delay or reservation anomaly.
- Explain the calculation: demand window, lead time, safety stock, and source freshness.
- Recommend transfer, allocation, preorder messaging, purchase-order quantity, or promotion suppression.
- Group related alerts so operators see one decision instead of hundreds of SKU notifications.
- Prioritize by expected lost margin, service impact, and reversibility.

**Boundaries:** the first package may draft a purchase order, transfer request, catalog availability change, or marketing suppression for approval. It must not place a purchase order, move stock, alter safety stock, oversell, or change a customer promise autonomously. Forecasts are recommendations with visible assumptions, not commitments.

### 4. Fulfillment exceptions

**Exception types:** unfulfilled past SLA, carrier delay, lost or damaged parcel, invalid address, split shipment, partial shipment, warehouse short-pick, failed delivery, return-to-sender, delivery scan contradiction, and tracking webhook gap.

**Automation:**

- Monitor promise date against fulfillment and carrier milestones.
- Match tracking, warehouse, ticket, and order data; call out missing or contradictory events.
- Identify the responsible queue: support, warehouse/3PL, carrier, fraud, or finance.
- Draft an internal escalation and customer response with the known facts and uncertainty.
- Recommend the least-cost policy-compliant resolution: wait and monitor, carrier claim, address correction, reship, replacement, refund, store credit, or manager review.
- Track the exception through closure and verify that the chosen resolution actually occurred.

Address, reship, replacement, refund, carrier-claim, and customer-promise actions are consequential. They require explicit approval even when the recommendation is high confidence.

### 5. Marketing operations

Marketing operations should be an accuracy and coordination layer, not an autonomous growth engine.

**Useful work:**

- QA product titles, prices, availability, images, variants, feeds, landing-page links, UTM tags, and promotion dates before a campaign.
- Detect a campaign that advertises unavailable inventory, a discount that conflicts with another offer, or a segment that violates suppression rules.
- Draft briefs, campaign checklists, product-copy variants, customer segments, and post-campaign summaries.
- Reconcile campaign eligibility with inventory and customer consent status.
- Explain performance changes using source data and mark attribution uncertainty.
- Create a preflight checklist and route it to the campaign owner.

**Approval boundary:** no autonomous campaign publish, ad-spend change, bid change, discount creation, promotion activation, customer send, SMS send, audience export, consent change, or suppression override. A human must approve the final payload and destination; approval must expire when inventory, price, audience, or legal copy changes.

### 6. Finance reconciliation

**Sources:** Shopify orders and refunds, Shopify Payments or payment processor payouts, fees, chargebacks, gift cards, returns, shipping charges, taxes, discounts, 3PL invoices, and accounting exports.

**Automation:**

- Match order-level activity to payout lines, refund events, fees, and bank deposits.
- Classify variance: timing, missing event, duplicate, currency/rounding, fee mismatch, tax mismatch, refund not posted, or unknown.
- Produce a close queue with evidence links, amount, age, owner, and proposed next investigation.
- Track expected versus observed settlement and aging of unresolved differences.
- Draft reconciliation notes and a journal-entry proposal for an accountant to review.
- Detect when an upstream connector is stale so a false “balanced” result cannot be presented.

**Boundary:** no autonomous journal entry, ledger post, vendor payment, customer refund, tax filing, chargeback response, payout transfer, or account/bank change. The system can export an accountant-reviewed file or structured proposal, but posting remains a human-controlled action in the accounting or payment system.

## Integrations and data contract

### Shopify (system of record for the first version)

Minimum useful scope:

- Read orders, customers as needed for an authorized order context, products/variants, inventory levels, locations, fulfillments, refunds, discounts, and transaction metadata.
- Subscribe to webhooks for orders, fulfillment, inventory, refunds, products, and app/uninstall or credential changes.
- Write only narrowly scoped, auditable fields in the first release: internal order notes, tags, and perhaps draft/approval metadata. Any write scope must be opt-in and visible during setup.
- Persist source IDs, event IDs, shop ID, received time, source updated time, and a normalized version. Keep raw payload retention configurable and minimize PII.
- Respect API rate limits, webhook retries, signature verification, replay protection, and Shopify's eventual consistency. A missing or stale event must lower confidence and block risky action.

No card numbers, security codes, or raw payment credentials should pass through MakeEase. Payment actions should use the merchant's authorized provider API with a narrow capability, never copied credentials in prompts or browser storage.

### Helpdesk (first choice: one connector, then an adapter model)

The first supported helpdesk should be selected based on target-customer concentration and reliable APIs; Gorgias, Zendesk, or Intercom are plausible candidates, but support for all three should not be promised before one is operationally proven.

Minimum useful scope:

- Read tickets, threads, requester identity, tags, status, assignee, SLA, and custom fields.
- Link a ticket to an authorized Shopify order and show the source records in one evidence view.
- Write internal tags, assignments, and drafts; sending a public reply requires explicit approval.
- Preserve the operator's edits and distinguish generated text from human-authored text.
- Handle deleted tickets, reassigned ownership, rate limits, webhook duplicates, and permission changes.

### Later adapters

- **Shipping/3PL:** ShipStation, ShipBob, Flexport, or the customer's existing provider for tracking, SLA, claims, and warehouse status.
- **Returns:** Loop Returns, Returnly, or Shopify returns for eligibility and status; never infer a return as complete from a ticket alone.
- **Payments/finance:** Shopify Payments, Stripe, PayPal, QuickBooks, Xero, NetSuite, or a CSV import, chosen by ICP rather than a long connector list.
- **Marketing:** Klaviyo, Meta, Google Ads, and feed/catalog tooling for QA and reporting, with no default send or spend authority.

Every adapter needs a capability manifest: readable objects, writable objects, side-effect level, required scopes, rate limits, webhook coverage, idempotency behavior, data retention, and a tested disconnect/revocation path. “Connected” must mean credential validation and a recent successful read—not merely that an OAuth flow was completed.

## What must never be autonomous

These are product-level prohibitions, not merely defaults that a customer can turn on later:

- Issuing a refund, store credit, gift card, chargeback response, payment, payout, or other movement of money.
- Placing, changing, or canceling a purchase order; buying inventory; transferring inventory; or making an irreversible stock allocation.
- Sending a customer-facing email, SMS, push, social message, or helpdesk reply that makes a promise, grants value, or represents a policy decision.
- Changing a customer address, subscription, payment method, consent, account status, or personal data without a scoped human approval.
- Publishing a product, price, discount, promotion, ad, campaign, audience, feed, or customer segment; changing ad spend or bids.
- Posting a journal entry, filing or amending a tax/financial report, paying a vendor, changing bank/payment settings, or accepting a reconciliation adjustment.
- Deleting records, closing a dispute, suppressing a customer, changing fraud/risk status, or overriding a policy/approval rule.
- Acting on a low-confidence identity match, stale/contradictory source data, missing authorization, or a connector in an unhealthy state.
- Expanding scope from an approved payload, retrying with altered amounts/recipients, or using one customer's data to resolve another customer's case.
- Treating an AI-generated explanation, forecast, sentiment label, or fraud signal as the sole basis for a consequential action.

Autonomous behavior is appropriate only for bounded internal work such as ingestion, normalization, deduplication, evidence retrieval, tagging, queue routing, alerting, draft creation, deterministic calculation, and reconciliation matching. Even these actions need an audit record, tenant isolation, least-privilege credentials, and a kill switch.

## Approval, risk, and operating controls

### Approval semantics

- An approval is for one named action, target, payload, amount, currency, and source version—not blanket permission for a workflow.
- Approvals show evidence, policy clause, model/deterministic checks, confidence, data freshness, predicted customer impact, and rollback or recovery path.
- Approval expires when the order, inventory, policy, price, customer, destination, or source version changes.
- Roles separate requester, approver, and administrator for monetary and sensitive actions. No self-approval for actions above the configured threshold.
- A rejected or expired action cannot be silently requeued with a new payload.
- Every execution has an idempotency key, preflight validation, post-action readback, and a receipt containing source IDs and timestamps.

### Safety controls

- Per-tenant OAuth, encrypted secret storage, least-privilege scopes, revocation detection, and no credentials in prompts, logs, exports, or browser storage.
- PII minimization, retention/deletion controls, access logs, row-level tenant authorization, and support access with reason codes.
- Policy-as-data with versioning; show the rule that caused routing or a block.
- Dry-run and sandbox mode that is unmistakably separate from live execution; no simulated success presented as a live outcome.
- Connector health, source freshness, rate-limit state, queue age, and failed-reconciliation alarms.
- Kill switch by connector, workflow, store, and workspace; pausing stops new side effects while preserving in-flight receipts for review.
- Human override requires a reason and never erases the original recommendation or evidence.
- Prompt injection and untrusted-content defenses: ticket text, product descriptions, emails, and webhooks are data, not instructions to change policy or permissions.
- Regional/legal controls for consent, marketing, taxes, returns, and product restrictions must be merchant-owned and reviewable; the package is not a legal or accounting authority.

## Metrics and proof of value

Metrics must distinguish **recommendation quality** from **executed outcome**. Do not report a draft as a saved cost or a simulated action as a completed action.

### Customer outcome metrics

- Median and p90 time from exception creation to resolution.
- First-response time and SLA-breach rate for order-related tickets.
- Percentage of tickets resolved with the correct order context on the first handling pass.
- Refund leakage: amount outside policy, duplicate refund amount, and preventable refund amount, all with a reviewed denominator.
- Fulfillment exception aging, late-shipment rate, failed-delivery rate, and time to verified resolution.
- Stockout hours, oversell incidents, inventory-alert precision, and time from risk alert to approved action.
- Reconciliation variance amount, percentage matched automatically, and days to close.
- Campaign/catalog preflight defects found before publish and defects found after publish.

### Efficiency and adoption metrics

- Operator minutes per ticket/exception and exceptions handled per operator hour.
- Queue volume by reason and percentage routed without manual re-triage.
- Recommendation acceptance, edit, rejection, and escalation rates by workflow and operator.
- Approval turnaround time and percentage of packets returned for missing evidence.
- Connector freshness, webhook delivery success, action success/readback rate, and retry rate.
- Active stores, active operators, workflows used weekly, and retained usage after 30/90 days.
- MakeEase credits or usage units consumed per resolved exception, so gross margin and customer value are visible together.

### Guardrail metrics (must not regress)

- Unauthorized external side effects: target zero.
- Wrong customer/order association, incorrect refund amount, duplicate action, or data-leak incident: target zero; alert on any occurrence.
- Customer-facing draft hallucination rate and unsupported policy claim rate from sampled review.
- Stale-data action attempts, blocked-policy attempts, and kill-switch response time.
- Human override rate and reasons, model confidence calibration, and false-positive/false-negative rates for risk flags.

Before commercial launch, establish a baseline from a customer's reviewed sample for at least two to four weeks. ROI claims should use measured labor time, recovered margin, reduced error, or faster cash close—not assumed “tickets deflected.”

## Pricing and willingness-to-pay assumptions

The current MakeEase B2B MVP uses a simple credit-led plan hypothesis: **Starter $25 / 15,000 credits, Growth $50 / 40,000, Business $100 / 90,000, Enterprise custom**, plus a **$12 / 10,000-credit top-up**. That is appropriate for validating a broad, approval-centric B2B operations shell. Ecommerce has higher event volume, higher integration/support cost, and a clearer connection between a resolved exception and recovered margin or labor, so the commerce package should not be priced as a small credit add-on.

### Initial ecommerce pricing hypothesis (to validate)

| Tier | Indicative price | Intended scope |
| --- | ---: | --- |
| Commerce Essentials | $199/month | One Shopify store, one helpdesk, order/support triage, fulfillment alerts, bounded monthly order/event volume, approval inbox |
| Commerce Growth | $499/month | Multiple queues or stores, refunds decision packets, inventory alerts, richer policies, shipping/returns adapter, higher volume, team reporting |
| Commerce Control | $1,250/month | Finance reconciliation, multi-location inventory, marketing preflight, advanced roles/audit, priority support, higher volume |
| Enterprise | Custom, likely $2,500+/month | Multi-entity controls, SSO/SCIM, data-region and retention requirements, dedicated onboarding/SLA, custom adapters, procurement/security review |

Potential onboarding or integration fees of **$500–$5,000** are justified only when there is real mapping, policy configuration, historical import, or a tested go-live process. Usage overages should be predictable (for example, by orders or resolved exceptions), capped by workspace policy, and never trigger an unexpected external action. Prices are willingness-to-pay assumptions, not validated market facts.

### Why an ecommerce buyer might pay more

The buyer's value may combine:

- operator time avoided on repetitive triage and reconciliation;
- fewer duplicate or out-of-policy refunds and credits;
- earlier intervention on stockouts and late shipments;
- faster customer resolution and fewer repeat contacts;
- less time spent matching payouts and investigating variances; and
- reduced cost of maintaining brittle spreadsheets and one-off scripts.

A practical validation rule is that a buyer should be able to point to a measured monthly value several times larger than the subscription and explain who owns the budget. The relevant evidence must be customer-specific; a model-generated ROI estimate is a sales hypothesis, not proof. Discovery should test whether the buyer prefers per-store, order-volume, resolved-exception, or seat-plus-platform pricing and whether finance will approve a tool that can recommend money movement but never executes it without people.

## Ecommerce versus the initial B2B SaaS wedge

| Dimension | Initial B2B SaaS wedge | Ecommerce expansion |
| --- | --- | --- |
| Primary job | Configure and run bounded business workflows across tools | Resolve high-volume commerce exceptions and reconcile outcomes |
| Buyer | Founder, operations lead, or small-business owner | Head of CX/operations, ecommerce director, finance owner, or COO |
| Event volume | Lower and more deliberate; a user starts a run | Continuous webhooks, tickets, orders, inventory, shipments, and payouts |
| Core data | Workspace knowledge, workflow inputs, task outputs | Customer/order/SKU identity graph plus operational and financial event history |
| Value proof | Time saved, workflow completion, controlled use of AI credits | Resolution time, leakage prevented, stockout/late-shipment reduction, close accuracy, and labor per exception |
| Side-effect risk | Email, code, or other B2B system actions; approval inbox is central | Refunds, customer promises, inventory, payments, marketing sends, and financial records; risk is materially higher |
| Approval shape | Approve a workflow result or external action | Approve a precise payload with monetary, customer, inventory, and compliance evidence |
| Integration burden | A small set of generalized connectors | Deep Shopify/helpdesk semantics, webhooks, rate limits, fulfillment/payment/finance edge cases |
| Reliability expectation | User can inspect a bounded run before proceeding | Eventual consistency, missed events, duplicate webhooks, and readback reconciliation are first-class concerns |
| Packaging | Low-cost credit plans and generic templates | Higher-value vertical package with connector, order/event, and support/onboarding economics |
| Product strategy | Prove safe, approval-centered workflow execution | Reuse the approval/audit engine, then specialize the evidence model and policies for commerce |

The ecommerce package should therefore reuse the MVP's strongest primitives—workspace scoping, workflow templates, bounded runs, visible credits, approval inbox, knowledge/policy sources, integration health, and audit history—while adding a durable event model, connector health, precise action receipts, reconciliation, and commerce-specific policy controls. It should not be launched by simply renaming generic B2B templates as “agents.”

## Recommended sequencing and launch gates

### Phase 0: prove the shared control plane

- Keep the existing B2B approval, audit, credit, and sandbox semantics.
- Add a normalized event/action model in design only; do not grant broad write scopes.
- Validate with design partners that order/support and fulfillment exceptions are frequent, painful, and owned by a budget holder.

### Phase 1: narrow live beta

- One Shopify connector and one helpdesk connector.
- Order lookup, triage, tags/routing, evidence timeline, drafts, and fulfillment exception queue.
- Human approval for every customer-facing action and every value-changing action.
- Readback, idempotency, connector health, and exportable audit trail.
- Two-to-four-week baseline and reviewed sample for quality and ROI.

### Phase 2: money and inventory controls

- Refund decision packets and approval matrix.
- Inventory risk alerts and draft replenishment/allocation proposals.
- Shipping/returns adapter and finance payout matching.
- Launch only after duplicate-action, wrong-association, stale-data, and unauthorized-action guardrails are measured and operationally owned.

### Phase 3: marketing and multi-entity scale

- Catalog/campaign preflight, segmentation checks, and finance close workflows.
- More connectors, multi-store/entity controls, SSO/SCIM, retention and regional controls, and enterprise support.
- Maintain the prohibition on autonomous sends, spend, refunds, purchasing, accounting, and policy overrides.

### Go/no-go gates

Do not package as generally available until a pilot demonstrates, on real reviewed data:

- reliable event ingestion and source freshness visibility;
- near-zero critical action defects and no unauthorized external side effects;
- a measurable reduction in exception resolution time or operator effort;
- approvals that are faster without increasing refund, service, or reconciliation errors;
- a clear owner for every unresolved exception; and
- willingness to pay from a budget holder at a price materially above the current generic B2B plan.

## Production gaps to keep explicit

This document defines the product opportunity, not an implementation claim. A real package still needs authenticated multi-tenant storage, encrypted OAuth secrets, durable queues, webhook verification and replay protection, provider-specific rate-limit handling, model evaluation, policy/version storage, scoped roles, retention and deletion, observability, incident response, connector certification, billing, support runbooks, legal/privacy review, and security testing. The local MVP's sandbox behavior must remain clearly labeled until those controls exist.
