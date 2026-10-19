# Gorgias — ecommerce customer experience and AI-agent benchmark

**Research snapshot:** 2026-10-16  
**Scope:** public Gorgias pricing, product, help-center, integration, analytics, security, and support material.  
**Status:** competitor research only. No Gorgias account, trial, API, or external service was used.

## Executive assessment

Gorgias is an ecommerce-specialized helpdesk that has expanded into a support-and-sales automation suite. Its strongest wedge is a Shopify-centric operator workspace: one inbox, a customer/order sidebar, ecommerce actions, macros/rules/flows, AI Agent skills, and revenue/support reporting. It is more than a generic chatbot, but it is still principally a customer-conversation system. The public product story is strongest for resolving or converting a conversation; it is less complete as a governed cross-system operations control tower for fulfillment exceptions, inventory, refunds, finance, or multi-platform commerce.

The most important competitive facts are:

* **Pricing is volume-based and potentially layered.** Helpdesk plans include a monthly ticket allowance and ticket overage; AI Agent adds usage-priced automated interactions, and an automated interaction also counts as a helpdesk ticket. Voice and SMS are usage-based add-ons without a public dollar amount on the pricing page.
* **Shopify is the deepest path.** Gorgias publicly describes customer/order context, order edits, cancellation/refund flows, discount-code generation, recommendations, tracking, and custom cross-stack updates. Its own compatibility table says AI Agent and Order Management are supported for Shopify, but not BigCommerce, Magento, WooCommerce, or PrestaShop.
* **Automation is materially deeper than canned replies.** Flows provide a tree builder and HTTP/JSONPath steps; Rules, macros, autoresponders, Order Management, article recommendations, and AI skills can be combined. The system has testing, handovers, skill-level analytics, and an improvement loop.
* **Agent UX is a clear strength.** Gorgias emphasizes one-tab work, customer profiles, Shopify data in the ticket, variables, macros, prioritization, multi-store support, and cross-channel history.
* **Omnichannel breadth exceeds omnichannel AI parity.** Email, chat, contact forms, social, SMS/MMS, WhatsApp, Voice, and marketplace/app channels are represented, but channel availability and automation differ. The analytics documentation explicitly says AI Agent does not handle voice tickets.
* **Reporting is unusually commerce-aware.** Gorgias reports automation, handovers, time/cost saved, CSAT, orders influenced, revenue influenced, product recommendations, and conversion metrics, with drill-downs and CSV/PDF export. Several metrics are estimates or attribution windows, so MakeEase should expose source evidence and distinguish recommendations from verified outcomes.

## Evidence discipline

This document uses three labels:

* **Verified fact** — directly stated in an official Gorgias product, pricing, security, help-center, or integration page retrieved for this research.
* **Vendor claim** — a Gorgias marketing outcome, customer-story result, rating, adoption figure, or performance promise. It is recorded as a claim rather than independently validated performance.
* **Inference** — analysis from the public material, including a likely product gap or a MakeEase implication. An absence from the public pages is not proof that a private/enterprise feature does not exist.

## 1. Pricing and billable interaction model

### Public plan table

The pricing page's structured offer data gives the following USD prices and allowances. Annual prices are shown as a monthly equivalent on an annual contract; monthly prices are billed monthly where listed.

| Helpdesk plan | Public price | Included helpdesk tickets / month | Ticket overage | Included automated AI interactions | Positioning shown by Gorgias |
| --- | ---: | ---: | ---: | ---: | --- |
| Starter | $10/month, monthly only | 50 | $0.40/ticket | 30 | Smaller brands, one platform |
| Basic | $50/month annual or $60/month monthly | 300 | $0.40/ticket | 30 | Growing brands |
| Pro | $300/month annual or $360/month monthly | 2,000 | $0.36/ticket | 190 | Scaling brands; revenue analytics |
| Advanced | $750/month annual or $900/month monthly | 5,000 | $0.36/ticket | 530 | High-volume brands and dedicated team |
| Enterprise | Custom | Over 5,000 conversations/month | Custom | Custom | Complex security, compliance, or integration needs |

**Verified fact:** the pricing page also lists AI Agent at **$0.90 per automated interaction on an annual contract** or **$1.00 per interaction on a monthly contract**. Automated interactions above the included allowance are listed at **$1.50 per interaction**. Each automated interaction also counts as one helpdesk ticket.

**Verified fact:** Gorgias says Helpdesk scales from 50 to 5,000 tickets/month and is not priced per agent. The page has an apparent legacy/structured-data inconsistency: one set of current offer data gives the plan prices above, while another embedded product snippet shows different monthly totals. The current pricing offer table and FAQ should be treated as the authoritative public source, and a buyer should confirm the quote before procurement.

### What appears to be billable

**Verified fact:** Gorgias defines a billable ticket as a conversation started on a Gorgias channel that includes a message from a human agent, a Rule, or AI Agent. A ticket with a response from one of those actors counts once regardless of the number of messages in the thread. A reply to an existing thread may become a new billable ticket after a defined inactivity period. Newsletters, spam, and auto-responders are stated to be filtered out automatically.

**Verified fact:** an automated interaction is a customer request fully resolved without a human, including AI Agent and other automation features such as Flows, Quick Responses, or Order Management. If a support agent replies within 72 hours of an AI Agent resolution, Gorgias says the interaction is charged as a billable helpdesk ticket instead. Automation metrics and billing therefore have a three-day maturation delay.

**Implication for a buyer (inference):** Gorgias has a relatively understandable unit—conversation/ticket plus successful automated interaction—but the interaction can touch both allowances. A support team should model human tickets, AI-resolved interactions, handovers, re-openings, and inactivity windows together rather than assuming “AI deflection” is free. MakeEase can differentiate with a pre-execution cost estimate and a ledger that shows exactly which event created each charge or avoided charge.

### Add-ons and trial/support pricing

**Verified fact:** Voice and SMS are add-ons available to any plan, with pricing described as scaling with call and text volume; the public pricing page does not show a dollar rate. The pricing FAQ says the trial lasts seven days and does not require payment information. A legacy Shopify landing page still contains “30-day free trial” copy, so trial terms should be confirmed at signup.

**Verified fact:** pricing FAQ material says support is available through live chat in the dashboard or `support@gorgias.com`; CSM access depends on annual Shopify GMV, with higher-GMV brands typically receiving a dedicated CSM. The Help Center links Academy, Community, developer docs, status, and API documentation.

**MakeEase pricing lesson (inference):** publish an all-in cost calculator that includes connector, AI, channel, overage, and action costs; show hard caps and alerts before a merchant crosses a threshold; and keep a durable usage ledger that reconciles vendor invoices to source interactions.

## 2. Product shape and ecommerce workflow coverage

### Helpdesk and agent workspace

**Verified fact:** Gorgias positions Helpdesk as an AI-powered ecommerce helpdesk with a centralized inbox for support interactions. Its structured product description lists ticket routing/prioritization/automation rules, macros, a customer sidebar and timeline, AI tagging/summaries/translations, help-center customization, performance dashboards, Voice of Customer/AutoQA, ecommerce integrations, teams, permissions, SSO, and MFA.

**Verified fact:** the Shopify product page describes a ticket view that shows order history and customer data, inserts names/order numbers/shipping addresses into replies, manages orders without leaving the helpdesk, and supports multi-store connection. It also describes intent and sentiment detection, prioritization, macros, autoresponders, and support/revenue statistics.

**Verified fact:** Gorgias markets a one-tab workflow for canceling, refunding, duplicating, and editing orders; the Shopify page says merchants can create, duplicate, edit, and refund Shopify orders, generate discount codes, and share recommendations. These are product capabilities stated by the vendor; the public page does not establish the exact permission matrix, failure semantics, or audit payload for every action.

### Typical ecommerce workflows supported in the public material

| Workflow | Publicly described Gorgias behavior | MakeEase read |
| --- | --- | --- |
| WISMO / order tracking | AI/order-management responses can show order status, tracking number, shipping information, and shipment journey with timestamps. | Strong high-frequency support wedge; MakeEase should add freshness/contradiction evidence and exception ownership. |
| Cancellation | Order Management lets shoppers submit a cancel request with order data pulled from Shopify; supported statuses determine available actions. | Good self-service foundation; MakeEase should show fulfillment cut-off, payment state, and approval policy before an irreversible change. |
| Returns / order issue | Order Management contains Return Flow and Report Order Issue categories; status/action behavior is documented by shipment state. | Useful customer-facing intake; MakeEase can connect returns, carrier, warehouse, refund, and reconciliation evidence. |
| Address/order edits | Gorgias markets real-time order edits before fulfillment and support for complex updates. | Strong Shopify action surface; MakeEase should bind an approval to exact order/version and idempotency key. |
| Refunds | Shopify material says refund orders from the helpdesk; other pages describe return and refund automation. | A competitive gap is governance: amount thresholds, reason codes, abuse signals, approval roles, post-action readback, and finance reconciliation should be first-class. |
| Product questions / pre-sale | Shopping Assistant answers product questions, recommends products, upsells/bundles, and may offer a discount based on intent. | Strong conversion UX; MakeEase should separately measure support resolution and verified incremental revenue. |
| Subscription changes | AI Agent page and Flow examples mention subscription edits and Recharge management through HTTP requests. | Good extensibility; MakeEase should keep a capability manifest and approval boundary per external write. |
| High-risk orders | Gorgias customer material cites an open API workflow that creates a ticket when high-risk Shopify orders appear. | MakeEase opportunity: native risk/exception queues with evidence, not only ticket creation. |
| Multi-brand/store | Shopify page says multiple stores/brands can be centralized with independent teams, tickets, and reports. | Good consolidation; MakeEase should add cross-store policy scopes, tenant isolation, and source-level reconciliation. |

### Shopify depth versus platform breadth

**Verified fact:** Gorgias's public integration catalog names Shopify, BigCommerce, Magento, and WooCommerce among ecommerce platforms, and advertises 100+ app integrations (the current app page contains a much larger catalog). The public app catalog includes examples spanning returns, shipping, subscriptions, loyalty, marketing, reviews, analytics, marketplaces, phone, SMS, and AI.

**Verified fact:** the official compatibility article draws a sharp distinction:

| Ecommerce platform | AI Agent | Flows | Order Management | Article Recommendations |
| --- | --- | --- | --- | --- |
| Shopify | Supported | Supported | Supported | Not supported |
| BigCommerce / Magento 2 | Not supported | Supported | Not supported | Supported |
| WooCommerce / PrestaShop | Not supported | Not supported | Not supported | Not supported |

All listed automation features require an active AI Agent subscription. This table is one of the clearest public limitations of the product: the deepest autonomous support and order actions are Shopify-first, while other storefronts get narrower feature slices.

**Inference:** Gorgias is excellent when the merchant's system of record is Shopify and the desired outcome is customer support or conversion. It is less differentiated for a merchant that needs a platform-neutral event/evidence model across Shopify, a 3PL, carrier, payments, returns, marketing, and accounting. MakeEase should use Shopify as a high-quality first connector without making the package's control plane depend on a single storefront.

## 3. AI Agent and automation depth

### AI Agent roles and lifecycle

**Verified fact:** Gorgias documents AI Agent as an autonomous assistant for support and sales, with personalized responses, order-related answers, and ticket resolution. It has at least two reported roles:

* **Support Agent** — handles shopper questions end-to-end and can use knowledge, skills, actions, tone, and handover rules.
* **Shopping Assistant** — proactively engages site visitors, recommends products, answers product questions, offers discounts, and tracks attributed sales.

**Verified fact:** the Help Center describes a lifecycle of training, testing, deploying, analyzing, and improving. Training inputs include brand content, help-center articles, store/URL sync, uploaded documents, product information, guidance, intents, and skills. Skills can contain instructions, variables, knowledge, intents, and actions; skill management includes drafts, enabling/disabling, performance metrics, and version history. The product includes a playground/test-conversation concept and an “Opportunities” improvement workflow (documented as beta).

**Verified fact:** settings include tone/personality, do/don't rules, channel-specific instructions, language, AI name/disclosure, handover topics, excluded topics, auto-assignment, tags, ticket fields, and Rules integration. AI Agent can use vision to understand images shared on supported channels.

### Automation primitives

**Verified fact:** Gorgias publicly documents multiple layers:

1. **Rules** for ticket conditions and actions such as routing, tagging, ignoring/preventing AI responses, reopening low-CSAT AI tickets, and other account workflows.
2. **Macros / quick responses / autoresponders** for repeatable templated support and dynamic variables.
3. **Flows** as automated multi-step Q&A scenarios across supported channels, represented by a tree-style builder with triggers, options, ends, and drop-off analysis.
4. **HTTP request steps** that can call external applications and expose response values through JSONPath variables. Official examples cover adding a customer to Klaviyo, showing LoyaltyLion points, and managing a Recharge subscription.
5. **Order Management** for tracking, cancellation, returns, and order issue reporting, with real-time Shopify-backed data.
6. **AI Agent skills/actions** for intent-specific responses, knowledge retrieval, ecommerce actions, and handovers.
7. **Article Recommendations** for selected platform/channel combinations.

**Verified fact:** a Test mode lets Lead/Admin users test Flows, Order Management, and Article Recommendations without creating billable tickets. This is a meaningful operational safeguard, although the public documentation does not establish an equivalent dry-run/readback simulator for every external AI action.

**Inference:** the automation stack is deep enough to support genuine no-code workflows and light integration orchestration, but it is centered on conversations. HTTP steps and external app integrations can create cross-system behavior; the public pages do not show a general policy-as-code layer, an approval packet bound to a source version, universal idempotency, or a reconciliation queue for partial failures. These are MakeEase opportunities.

### Vendor performance claims versus measurable definitions

**Vendor claims:** Gorgias markets “automate 60%” of support, resolution in under one minute, 50% lower cost, 65% time back, 70% fewer misships in a customer story, and sales lifts such as +75% conversion, 8x ROI, or +11% AOV on product pages/customer stories. Other Helpdesk marketing pages cite 30% less labor cost, 43% faster first response, and 44% higher LTV after a year. These are vendor/customer-story claims, not independent benchmarks.

**Verified fact about definitions:** Gorgias's analytics documentation defines an automated interaction as fully resolved by automation with no human involved, excludes spam, and delays the newest three days because a human handover within 72 hours changes classification. “Overall automation rate” is automated interactions divided by total billable workload; “success rate” divides billable AI Agent interactions by all AI Agent-handled tickets including handovers. Cost saved is an estimate using the current plan's prices and fixed assumptions (the documentation cites $3.10 for human handling and $0.85 for AI when a quota is absent). Revenue attribution uses a three-day window after the latest Shopping Assistant message and excludes certain order states.

**MakeEase lesson (inference):** a competitive dashboard must show both the headline KPI and its denominator, attribution window, exclusions, lag, source events, and whether an action was recommended, drafted, approved, executed, or verified. A generic “automation rate” without this evidence is easy to overstate.

## 4. Agent UX and operating model

### What is notably strong

**Verified fact:** Gorgias's Shopify material emphasizes no tab switching, rich customer profiles, order history, customer variables, macros, intent/sentiment detection, ticket prioritization, and the ability to manage order actions from the ticket. Its Helpdesk page positions one centralized inbox and AI assistance for tagging, summaries, and translations.

**Verified fact:** the Voice page says calls share customer history across Voice, Chat, SMS, and Email; agents can use Shopify insights, recommend products, and create orders while on a call. The SMS page says agents can switch a conversation to a call or email while retaining the full conversation, port an existing phone number, connect WhatsApp, and use Shopify/Recharge/other app variables in responses.

**Verified fact:** AI Agent analytics support role tabs, filters by date/aggregation/channel/store, customizable metric cards, chart breakdowns, intent/channel/store comparisons, ticket drill-downs, and PDF/CSV exports. The analytics docs say report viewers can drill into up to 100 recent matching tickets for some metrics.

### UX and control gaps inferred from the public material

**Inference, not a claim that the capability is absent in all plans:**

* The operator experience is optimized for answering a ticket, while a cross-functional exception often needs a single packet containing order, payment, fulfillment, carrier, return, policy, and financial evidence.
* AI Agent skills and actions are configurable, but public docs do not describe a universal approval inbox for monetary, inventory, customer-account, or customer-promise changes. MakeEase can make action scope, approver, expiration, and post-action readback visible in the same workspace.
* Gorgias has audit logs, but the public audit-log article says the selectable time range is up to seven days and events are retained for up to 12 months. That is useful for account administration; it is not the same as a durable, immutable, source-linked business decision ledger.
* “Connected” integrations are presented through an app catalog, but the public pages do not provide a single capability manifest with scopes, readable/writable objects, rate limits, webhook coverage, idempotency, data freshness, retention, and revocation state. This is a strong MakeEase trust/control opportunity.

## 5. Omnichannel behavior and limits

### Channels and integrations

**Verified fact:** public Gorgias pages and structured product data list email, live chat, SMS, Voice, social, contact form, and TikTok Shop, with Facebook/Messenger/Instagram support material and WhatsApp integration on the SMS page. The app store extends coverage through third-party connectors for marketplaces, returns, shipping, subscriptions, loyalty, marketing, reviews, BI, and phone.

**Verified fact:** the product story is a unified inbox and shared customer history. SMS tickets can continue as text, or the team can switch to phone/email. Voice reports expose queue, wait, missed calls, inbound/outbound calls, talk time, live calls, and agent status.

### Important parity caveats

**Verified fact:** the AI Agent performance documentation explicitly says AI Agent does not respond on every channel and gives voice as an example of a channel it does not handle. The compatibility table also limits AI Agent/Order Management to Shopify. Flows, article recommendations, and app integrations have their own channel/platform constraints.

**Inference:** “omnichannel inbox” should not be interpreted as “one automation policy works everywhere.” MakeEase should publish a per-channel capability matrix and ensure a handoff preserves context, evidence, consent, and ownership rather than simply moving a transcript between channels.

## 6. Analytics, attribution, security, and support

### Analytics and quality

**Verified fact:** Gorgias offers:

* Real-time Overview reports for online/offline agents, assigned/unassigned open tickets, and hourly created/replied/closed volume.
* Real-time Agents reports for tickets closed, messages sent, open tickets, and channel activity.
* Real-time Voice reports for queue, wait, missed calls, inbound/outbound calls, talk time, live calls, and availability.
* Customizable dashboards filtered by agent, channel, tag, store, and date.
* AI & automation Overview and AI Agent reports covering automated interactions, automation rate, handovers, first-response/resolution-time changes, estimated cost/time saved, CSAT, conversion, total/revenue influenced, orders influenced, discounts, product recommendations, and revenue per interaction.
* Drill-downs to the underlying tickets for supported metrics and PDF/CSV exports.

**Verified fact:** the general reporting page says filters can be saved/reused and audit logs are available. Gorgias's public audit-log article documents account, integration, macro, rule, tag, team, ticket, user, view, and widget events, with events kept for up to 12 months.

**MakeEase opportunity (inference):** keep the breadth of operational metrics, but add an evidence panel for each metric: source IDs, timestamps, policy version, connector freshness, model/action version, attribution rule, and verified outcome. Report “refund prevented” only after the source system confirms the final state.

### Security and governance

**Verified fact:** Gorgias's security page states user roles/permissions, conversation and action history, integration review, SSO for Google and Microsoft 365, SOC 2 Type II certification, Google Cloud Platform infrastructure, continuous encrypted backups, HTTPS/TLS, HIPAA compliance, a status page, two-factor authentication, and a vulnerability disclosure policy. The page links a Trust Center and security whitepaper.

**Vendor-stated fact requiring diligence:** the pricing FAQ/structured data says servers are hosted on Google Cloud Platform in the United States, European Union, and Australia, and that data is removed within 90 days after contract termination. These are vendor statements; verify region selection, subprocessors, deletion evidence, and contract terms during procurement.

**Inference:** Gorgias has a credible SaaS security baseline and administrative auditability. MakeEase can compete on operational governance rather than merely claiming “secure AI”: least-privilege connector capabilities, tenant-scoped policies, approval separation, source freshness blocks, idempotency, kill switches, immutable receipts, and a reconciliation queue should be core product behavior.

### Support and ecosystem

**Verified fact:** the public Help Center exposes getting started, AI Agent/automation, knowledge, daily operations, account setup, integrations, reporting, Academy, Community, roadmap, status, API docs, and contact support. Gorgias's pricing FAQ says support can be reached by in-dashboard chat or email; the FAQ says CSM access is associated with annual Shopify GMV.

**Inference:** Gorgias's ecosystem reduces onboarding friction, especially for Shopify teams. MakeEase should match self-serve documentation but add connector health diagnostics, action previews, policy templates, and an exportable incident/receipt bundle so an operator can troubleshoot without opening a support ticket.

## 7. Competitive gaps and implications for MakeEase

These are **inferences from the public evidence**, not assertions that Gorgias cannot do something privately or on an enterprise contract.

1. **Conversation-centric versus exception-centric.** Gorgias is optimized around a ticket and its customer context. A fulfillment or payout exception can span many tickets, orders, shipments, vendors, and financial events. MakeEase should group related events into one exception with an owner, SLA, evidence, and closure verification.
2. **Shopify depth versus cross-platform control.** AI Agent and Order Management are explicitly Shopify-only in the compatibility table. MakeEase should normalize Shopify, helpdesk, shipping/3PL, returns, payments, marketing, and finance objects behind a connector capability contract.
3. **Automation versus governed execution.** Gorgias documents actions, HTTP requests, and flows, but public material does not show a universal approval/payload-expiration/idempotency/reconciliation contract. MakeEase should make every consequential action a scoped decision packet with policy, approver, exact payload, preflight, post-readback, and receipt.
4. **Attribution versus causal proof.** Gorgias's sales attribution uses a three-day window, and cost/time-saved metrics use estimates and plan-based assumptions. MakeEase should separate model recommendation quality, approved action, executed source state, and measured business outcome.
5. **Catalog breadth versus integration observability.** A large app catalog is valuable, but the public pages do not expose one uniform view of scopes, freshness, write authority, rate limits, webhook health, retention, and revocation. MakeEase should surface this before a workflow is enabled and block risky execution when the connector is stale or authorization changed.
6. **Omnichannel inbox versus uneven channel automation.** Gorgias unifies channels but states that AI Agent does not handle voice and that feature compatibility varies by platform. MakeEase should make channel/connector parity explicit and preserve the same evidence and policy semantics across handoffs.
7. **Administrative audit log versus business decision ledger.** Gorgias documents useful account audit events and 12-month retention. MakeEase should retain an immutable chain of source event, policy decision, approval, payload, execution result, and reconciliation state for the life of the merchant's operational record.

## 8. Five concrete MakeEase requirements for a stronger ecommerce package

These requirements align with the existing MakeEase CommerceOps thesis and are intentionally concrete enough to become acceptance criteria.

### Requirement 1 — Evidence-backed order/support exception queue

For every order-related contact or system event, MakeEase must resolve the authorized customer/order context, classify intent and urgency, and present a single timeline combining ticket, order, payment, fulfillment, tracking, return, policy, and prior-action evidence. It must display source IDs, source-updated time, connector-received time, ambiguity, and stale/contradictory data warnings. It must route the exception to a team/SLA and preserve the operator's accept/edit/reject/escalate decision.

**Acceptance signal:** an operator can open a WISMO, address-change, damaged-item, or duplicate-charge case and see the evidence and next owner without switching systems; an ambiguous identity match cannot silently select an order.

### Requirement 2 — Policy-bound action packets for every consequential write

Refund, reship, replacement, address change, subscription change, discount, customer promise, inventory change, campaign send, and finance action must be represented as a named action packet containing target, exact payload, amount/currency, policy clause, evidence, confidence, approver role, expiry condition, and idempotency key. Human approval must be required for monetary, customer-facing, inventory, and account changes; approval must invalidate when material source facts change.

**Acceptance signal:** MakeEase can show “why this action,” “who approved it,” “what exactly will be sent,” and “what source state was read back” for every executed action; a retry cannot alter the approved payload.

### Requirement 3 — Connector capability and health contract

Each ecommerce, helpdesk, returns, carrier/3PL, payment, marketing, and finance connector must publish readable objects, writable objects, required scopes, rate limits, webhook coverage, idempotency behavior, data retention, last successful read, source freshness, and disconnect/revocation status. The UI must distinguish a validated live connection from an OAuth flow that has never produced a successful read.

**Acceptance signal:** a workflow cannot execute a write when a connector is stale, revoked, over rate limit, missing required scope, or outside its declared capability; the operator sees the precise block reason and remediation.

### Requirement 4 — Reconciliation-first outcome ledger and cost controls

MakeEase must write an immutable receipt for recommendations, drafts, approvals, executions, failures, and post-action reads, then keep unresolved partial/contradictory outcomes in a visible reconciliation queue. Usage metering must attribute AI/model, channel, connector, and external-action costs to source events, expose forecasted month-end spend, and alert or pause at merchant-configured limits.

**Acceptance signal:** a merchant can trace a refund or reship from source ticket through approval, API result, final source state, invoice/usage line, and any variance; simulated/test results are never labeled as live success.

### Requirement 5 — Cross-channel, cross-platform workflow parity with measurable proof

MakeEase must define a capability matrix for email, chat, contact form, SMS, Voice, social, marketplace, and internal events, and for each platform connector. Handoffs must preserve customer identity, evidence, consent, policy, owner, and SLA. Analytics must show denominators, exclusions, attribution windows, data lag, and verified outcomes separately for human, AI, automation, and handover paths.

**Acceptance signal:** the same “late shipment” policy can ingest a Shopify event, carrier event, and helpdesk contact, route it to one exception, draft channel-appropriate responses, and report whether the carrier/source state actually changed—without implying that a recommendation or chat conversion was a verified operational saving.

## Source URLs (official Gorgias material)

The following are the public sources used for the facts above. Pages were retrieved for this snapshot; URLs and product copy can change.

### Pricing, product, and channels

* [Gorgias pricing](https://www.gorgias.com/pricing) — plan allowances, prices, ticket/AI interaction definitions, trial and support FAQ, Voice/SMS add-on positioning.
* [Gorgias Helpdesk](https://www.gorgias.com/products/helpdesk) — unified inbox, ticket management, AI assistance, reports, teams/permissions/SSO/MFA.
* [Gorgias AI Agent](https://www.gorgias.com/ai-agent) — AI Agent product overview and supported ecommerce positioning.
* [AI Agent support skills](https://www.gorgias.com/ai-agent/support-skills) — Support Agent workflow, skills, handover, order/return/subscription examples, vendor performance claims.
* [AI Agent Shopping Assistant](https://www.gorgias.com/ai-agent/shopping-assistant) — proactive sales engagement, recommendations, discounts, conversion/revenue claims and attribution positioning.
* [Gorgias Voice](https://www.gorgias.com/products/voice) — phone history, Shopify context, order creation, call monitoring, recordings/transcripts claims.
* [Gorgias SMS](https://www.gorgias.com/product/sms) — SMS/MMS, WhatsApp, channel switching, Shopify variables, marketing app connections, reporting.
* [Shopify helpdesk integration page](https://www.gorgias.com/integrations/shopify) — customer/order context, order operations, macros/rules, multi-store, support/revenue statistics.

### Help Center and automation documentation

* [AI Agent & automation features](https://docs.gorgias.com/en-US/articles/ai-agent-and-automations-135134) — product areas for training, testing, deploying, analyzing, actions, Shopping Assistant, settings, and Flows/Order Management.
* [Getting Started with AI Agent](https://docs.gorgias.com/en-US/articles/getting-started-with-ai-agent-294725) — AI Agent setup and improvement lifecycle.
* [Train AI Agent](https://docs.gorgias.com/en-US/articles/train-ai-agent-268602) — skills, knowledge, product information, feedback/coaching (Help Center category page).
* [AI Agent settings](https://docs.gorgias.com/en-US/articles/ai-agent-settings-333826) — tone, handovers, tags/fields, language, AI disclosure/name, Rules.
* [AI Agent FAQs](https://docs.gorgias.com/en-US/articles/ai-agent-faqs-362668) — vision, security/privacy FAQ, tags, agent behavior.
* [Automation features: Flows and Order Management](https://docs.gorgias.com/en-US/articles/automations-279714) — automation categories, test mode, platform compatibility links.
* [Flows](https://docs.gorgias.com/en-US/articles/flows-76052) — tree builder, steps, analysis, HTTP request/JSONPath variables, external-app examples.
* [Order Management](https://docs.gorgias.com/en-US/articles/order-management-91092) — Track Order, Cancel Order, Return Flow, Report Order Issue.
* [Compatibility of automation features with ecommerce providers](https://docs.gorgias.com/en-US/compatibility-of-automation-features-with-ecommerce-store-providers-1749413) — Shopify/BigCommerce/Magento/WooCommerce/PrestaShop capability table.
* [Test automation without billable tickets](https://docs.gorgias.com/en-US/how-to-test-automation-features-without-creating-billable-tickets-286870) — Test mode and permissions.

### Analytics, security, and support

* [Statistics and Reporting](https://docs.gorgias.com/en-US/articles/reporting-18364) — dashboards, filters, live statistics, AI/automation metrics, satisfaction, audit log.
* [Review AI Agent performance](https://docs.gorgias.com/en-US/review-your-ai-agent-performance-931052) — role tabs, filters, drill-downs, metrics, export.
* [Review overall automation performance](https://docs.gorgias.com/en-US/review-your-overall-automation-performance-6153275) — consolidated AI Agent/Flows/Order Management/article recommendation reporting.
* [How AI and automation metrics are calculated](https://docs.gorgias.com/en-US/how-metrics-are-calculated-ai-and-automation-5666070) — definitions, 72-hour delay, cost/time estimates, three-day revenue attribution.
* [Real-time analytics reports](https://docs.gorgias.com/en-US/use-live-statistics-to-monitor-ticket-volume-agent-status-and-call-activity-775136) — support, agent, and Voice monitoring.
* [Account audit log](https://docs.gorgias.com/en-US/view-an-audit-log-of-changes-to-your-account-81841) — event categories, seven-day filter range, 12-month retention statement.
* [Gorgias security](https://www.gorgias.com/security) — roles, history, SSO, SOC 2 Type II, GCP, encrypted backups, TLS, HIPAA, 2FA, Trust Center.
* [Gorgias Help Center](https://docs.gorgias.com/en-US) — support articles, Academy, Community, developer docs, API docs, status, and support contact.
* [Gorgias app integrations](https://www.gorgias.com/apps) — app catalog, categories, platform and ecommerce integration examples.
