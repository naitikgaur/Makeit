# Intercom + Fin AI Agent: customer-support competitor research

**Research snapshot:** 2026-10-16

**Scope:** Official Intercom and Fin pricing, product, help-center, AI, workflow,
Inbox, knowledge, security, integration, and reporting pages that were publicly
available at the time of research. “Verified” below means that the statement was
published on the linked vendor page; it does not mean that the statement was
independently audited. Vendor performance, security, and customer-result claims
are marked as vendor claims. Interpretations about product strategy, risk, or
lock-in are explicitly marked as inference.

## Executive summary

Intercom is positioning Fin as a customer-service platform rather than a bot
added to a helpdesk. The product combines a shared Inbox and ticketing, no-code
Workflows, a Help Center/Knowledge layer, Fin as a customer-facing agent, and
Operator/Copilot products for internal teams. Fin is also being positioned as a
single “Customer Agent” that can move between service, sales, ecommerce, and
success roles.

The strongest product pattern is a visible operating loop:

1. **Train** on content, policies, tone, attributes, and external data;
2. **Test** with previews, batch tests, simulations, and regression checks;
3. **Deploy** to chat, email, voice, social, Slack, Discord, API, and workflows;
4. **Analyze** resolutions, escalations, customer experience, topics, content,
   monitors, and recommendations; then repeat.

Fin also has a mature agent-resolution model. A conversation can be resolved,
assumed resolved, escalated, abandoned, or routed through a configured Procedure.
Fin can hand off to people with context, ask a teammate for input while keeping
Fin as the conversation owner, or route the post-handoff work through an
Intercom Workflow.

The main strategic contrast for MakeEase is not feature parity. Fin is strong at
integrated support execution and polished operational UX. MakeEase should be
stronger on **cross-system governance, explicit evidence, reversible actions,
portable records, and cost/decision transparency**. Fin’s public material shows
many of the ingredients for safe operation, but the customer still has to reason
about which events count as a billable outcome, which denominator a metric uses,
which source/version grounded an answer, and whether a handoff was an ordinary
escalation or a billable Procedure handoff.

## 1. Product shape and support UX

### What is verified on official pages

* Intercom’s current pricing page presents three combined helpdesk plans:
  **Essential** at $29 per seat/month, **Advanced** at $85 per seat/month, and
  **Expert** at $132 per seat/month, with Fin included and Fin usage priced
  separately. The page lists shared Inbox/ticketing and a public Help Center on
  Essential; multiple Inboxes, Workflows, round-robin assignment, and private or
  multilingual Help Center on Advanced; and SSO/identity management, HIPAA
  support, SLAs, and multibrand Messenger/Help Center on Expert.
* Fin’s public navigation and Help Center are organized around **Overview,
  Train, Test, Deploy, Analyze, Operator, Settings, Pricing & Billing,** and
  FAQs. This gives an operator an understandable lifecycle rather than asking
  them to configure a bot in one undifferentiated screen.
* Intercom’s Inbox collection describes a workspace connecting the Inbox,
  tickets, and Help Center. Its Workflows collection describes a no-code visual
  builder for automating repetitive tasks for customers and teammates.
* Fin’s channel pages describe native experiences for Messenger/live chat,
  email, Voice, WhatsApp, Instagram, Facebook Messenger, SMS, Slack, Discord,
  and the Fin Agent API. The vendor says channel-specific formatting is used:
  for example, cited sources and email formatting for email, native threads for
  Slack, and branded conversational behavior for Messenger.
* Fin’s Help Center says a handoff preserves customer context and sends the
  conversation to the preferred Inbox/helpdesk. The pricing page says Fin can be
  set up on a current helpdesk in under an hour and does not require seats when
  used with an existing helpdesk.

Sources: [Intercom pricing](https://www.intercom.com/pricing), [Fin pricing](https://fin.ai/pricing), [Fin Help Center home](https://fin.ai/help/en/), [Inbox collection](https://www.intercom.com/help/en/collections/3497068-inbox), [Workflows collection](https://www.intercom.com/help/en/collections/2094721-workflows), and [Fin channels](https://fin.ai/channels).

### UX assessment

**Vendor fact:** The Train/Test/Deploy/Analyze structure is explicit in Fin’s
product and help-center material. The UI model joins configuration, testing,
deployment, and measurement instead of treating AI quality as a one-time
prompt-writing task.

**Inference:** This is a strong support-operations UX because it maps to how a
team actually manages risk: teach the system, check it, limit its exposure, and
inspect production results. It also gives Intercom a natural path to sell more
of the stack: content, inbox, workflow, agent, analytics, and outbound support
are parts of the same workspace.

**UX strengths:**

* Agents and administrators work in a familiar Inbox while Fin handles the
  first response or gathers context.
* A single lifecycle gives support operations a place to find configuration and
  quality controls.
* Fin supports both autonomous answers and agent-assist patterns. Copilot is
  described as a personal assistant in the Inbox; human-in-the-loop input lets a
  teammate inspect a draft before Fin sends the answer.
* Customers can interact in their existing channel rather than being forced to
  a separate bot portal.

**UX risks / gaps:**

* The public product material uses several adjacent concepts—resolution,
  outcome, deflection, automation, answer, escalation, Procedure handoff, and
  CX Score. These are useful metrics, but users must understand their distinct
  meanings and denominators.
* Fin’s own escalation documentation says that escalation rules and guidance
  decide **when** to escalate, while Workflows decide **what happens next** and
  where to route. This separation is powerful, but it makes the actual customer
  journey depend on multiple configuration surfaces.
* On chat, escalation is offered in text rather than a standard button. Fin’s
  documentation says quick-reply buttons are not available for ordinary
  conversational escalation and that a bot-only setup will not offer escalation.
  That can produce a natural conversation, but it is less visually explicit than
  a clear “talk to a person” control.

## 2. Agent resolution model and human handoff

### Resolution and outcomes

The official outcome article defines one billable Fin outcome per conversation,
even when Fin answers multiple questions or takes multiple actions. The current
published outcome categories are:

| Outcome | Published price | Vendor definition |
| --- | ---: | --- |
| Resolution | $0.99 | The customer confirms the answer was satisfactory, or leaves without requesting further assistance. |
| Procedure handoff | $0.99 | Fin successfully completes a configured Procedure that ends in a human or workflow handoff. |
| Disqualification | $0.99 | Fin decides a sales prospect does not meet configured qualification criteria. |
| Self-serve routing | $0.99 | Fin routes a prospect to a self-serve outcome, such as a trial sign-up, rather than a meeting or sales follow-up. |
| Qualification | $9.99 | Fin matches configured qualification criteria and routes the prospect accordingly. |

The vendor’s documentation also states that a failed Procedure, a standard
escalation caused by a direct human request/default behavior, spam routing, and
abandonment without a Fin answer are not billable outcomes. A later customer
return to the same conversation can remove a previously assumed resolution and
its charge.

Source: [Fin AI Agent outcomes](https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes).

**Vendor fact:** Fin distinguishes **confirmed resolution** from **assumed
resolution**. A positive customer response is confirmed; leaving without asking
for more help is assumed. The official reporting article separately says the
resolution rate is calculated over conversations in which Fin was involved,
while outcome rates are calculated as a percentage of all conversations in the
selected period.

**Inference:** This is an unusually explicit commercial resolution model, but it
also creates a measurement literacy requirement. “The customer did not reply”
is a weaker success signal than “the customer confirmed the answer,” and an
outcome count is not interchangeable with a resolution rate. MakeEase should
make those distinctions unavoidable in its event model and UI.

### Fin as a customer-facing agent

Fin’s official product pages describe one Customer Agent with specialized roles:

* **Service:** answers support questions and handles complex queries;
* **Sales:** engages prospects, qualifies them, books meetings, and routes them;
* **Ecommerce:** recommends products and guides customers toward checkout;
* **Success:** supports onboarding, adoption, and retention.

This is a vendor product claim about one agent moving across the customer
lifecycle, illustrated with customer stories. It is not independent evidence
that one configuration performs equally well in every role. The strategic UX is
clear, however: Fin tries to preserve identity and context across a customer’s
journey instead of handing the customer between unrelated bots.

Source: [Fin Customer Agent](https://fin.ai/customer-agent) and [Fin explained](https://www.intercom.com/help/en/articles/7120684-fin-ai-agent-explained).

### Human handoff patterns

Fin documents several distinct handoff behaviors:

1. **Default escalation:** direct human requests, strong frustration/anger, or
   repetitive loops can trigger escalation.
2. **Escalation rules:** structured data such as sentiment, issue type, order
   value, VIP status, or a connector response can trigger a handoff.
3. **Escalation guidance:** natural-language rules can tell Fin to escalate
   immediately, offer escalation, ask questions first, or avoid escalation.
4. **Workflow routing:** after escalation, a Workflow can collect information,
   assign an Inbox/team, create a ticket, or take another configured action.
5. **Human in the loop / Ask for input:** on chat and email beta, Fin can show a
   teammate its draft and what it needs; the teammate supplies input, and Fin
   sends the final response while retaining ownership of the conversation.

The handoff page says a configured rule can be targeted by audience and channel,
but the rule/guidance itself cannot select the destination Inbox. Destination
routing belongs in the Workflow. It also says Fin will automatically hand off
high-risk content such as self-harm, harmful content involving minors, jailbreak
attempts, and high-risk medical, legal, or financial advice.

Source: [Escalation guidance and rules](https://www.intercom.com/help/en/articles/12396892-manage-fin-ai-agent-s-escalation-guidance-and-rules).

**Inference:** The separation of “decide to hand off” from “route and follow up”
is a sound control boundary. It permits a shared escalation policy with
different destinations, but increases configuration complexity and makes a
single end-to-end handoff preview important. MakeEase should show the complete
decision, evidence, destination, data passed, and next action in one trace.

## 3. Knowledge grounding and AI behavior

### Grounding sources and controls

Fin’s Train page and Intercom Knowledge material state that Fin can use:

* Help Center articles and internal support content;
* PDFs, URLs/web pages, and content synchronized from external sources such as
  Zendesk and a website;
* guidance about tone, answer length, clarification, behavior, and escalation;
* audience-targeted content based on plan, location, brand, or other customer
  segments;
* identity-verified user attributes and configured custom data attributes; and
* live data from Data Connectors, APIs, MCP servers, and Procedures.

Fin’s explained page describes a retrieval-augmented generation layer with
search, reranking, policy/guidance application, and response generation. The
vendor also says Fin can inspect answer sources and settings in an “answer
inspection” experience. Channel pages claim that sources can be shown in
customer replies, including email and live chat.

Sources: [Train Fin](https://fin.ai/train), [Intercom Knowledge collection](https://www.intercom.com/help/en/collections/9615439-knowledge), [Fin explained](https://www.intercom.com/help/en/articles/7120684-fin-ai-agent-explained), and [Fin channels](https://fin.ai/channels).

**Vendor claim:** Fin’s security page says the AI Engine validates the query,
retrieves grounded content, reranks it, performs a final validation pass, and
escalates when confidence thresholds are not met rather than guessing. Fin’s
product pages say Suggestions analyze unresolved conversations and recommend
content improvements.

**Inference:** The design is a practical combination of retrieval, policy, and
tool access. However, “grounded” does not by itself answer the operational
questions a regulated or cross-system customer needs: which exact source
version was used, when it was last refreshed, whether a live connector value
overrode a static policy, and whether an action was merely proposed or actually
completed. The public pages describe these capabilities at a product level but
do not establish a universal source-precedence or customer-visible evidence
contract for every channel and connector.

### Procedures: action-capable resolution

Procedures are Fin’s main answer to multi-step support work. The official page
says teams can write a process in natural language, add if/else branches and
code for deterministic rules, connect Stripe/Shopify/internal systems through
Data Connectors or MCP, and choose where Fin should complete or escalate. Fin
can adapt to an interruption or change of intent rather than following a rigid
form.

Procedure examples on the page include account checks, refunds, cancellations,
subscription updates, order tracking, claims, chargebacks, and ban appeals.
The page describes built-in Simulations and regression testing for Procedures.

Source: [Fin Procedures](https://fin.ai/procedures).

**Inference:** Procedures make Fin more than a retrieval bot: it can be a
controlled orchestration layer over customer systems. The risk boundary is also
higher. A wrong answer is a support-quality issue; a wrong refund, cancellation,
or account update is a business-side effect. MakeEase should therefore treat
read, propose, approve, execute, and verify as separate states with typed
contracts and an immutable receipt.

## 4. Reporting, quality, and observability

### Published reporting model

Intercom’s Fin report template includes:

* involvement and involvement rate;
* answer, pending, escalation, deflection, and resolution rates;
* confirmed and assumed resolutions;
* outcome counts and rates, including separate Service, Ecommerce, and Sales
  outcomes;
* CX Score and customer experience rating reasons;
* content performance;
* channel breakdowns; and
* time-based trends.

The vendor says the Fin report template is customizable. Intercom’s API
documentation in the reporting article says AI-agent metadata is available on
the Conversation model in API version 2.11 and later, including source/workflow
involvement, resolution state, customer rating, and content sources.

Fin’s newer Analyze page adds:

* **Insights:** performance dashboards, Automation rate, CX Score, Topics
  Explorer, and weekly Trends;
* **Monitors:** filters, natural-language criteria, custom scorecards, alerts,
  review queues, and evaluation across Fin and human conversations; and
* **Recommendations:** prioritized content, data-access, or action gaps based on
  unresolved conversations, with review/accept/edit flows.

Sources: [Fin reporting](https://www.intercom.com/help/en/articles/7837533-fin-ai-agent-reporting), [Fin Analyze](https://fin.ai/analyze), and [Fin Help Center Analyze collection](https://fin.ai/help/en/collections/18812317-analyze).

### Important reporting caveats

* **Denominators differ.** Outcome rate uses all conversations in the selected
  period, while resolution rate uses Fin-involved conversations. A dashboard
  that shows these adjacent without the denominator would invite a false
  comparison.
* **Assumed resolution is not confirmed resolution.** The report exposes both,
  which is good, but decision-makers need to see them separately by default.
* **Content performance has a drill-in limitation.** Intercom’s reporting page
  says the content-performance involved/resolved counts are summary totals and
  are not clickable to open underlying conversations; the vendor points users to
  Operator to find such conversations. This is a concrete example where a
  summary metric does not directly expose its evidence.
* **Usage data is not necessarily instantaneous.** The usage help page says the
  billing overview refreshes every 30 minutes and, for some customers on an
  older system, invoice usage can be up to 24 hours behind in-product reporting.
* **Hard limits have eventual/approximate behavior.** Intercom says a Fin
  outcome limit can stop slightly before or after the configured number because
  conversation states can change. The usage page also says the outcome limit can
  be recalculated hourly, with backup workflow predicates lagging until the
  recalculation.

Sources: [Fin reporting](https://www.intercom.com/help/en/articles/7837533-fin-ai-agent-reporting) and [Usage, alerts, and hard limits](https://www.intercom.com/help/en/articles/8991894-how-to-see-and-manage-your-usage).

**Inference:** Intercom has strong observability breadth, but MakeEase can
differentiate by making every metric an inspectable event query: show the source
events, policy version, action receipts, human decisions, and cost reservation
behind a number; expose freshness and denominator next to the number; and export
the raw event stream without requiring a separate operator product.

## 5. Action integrations and cross-system reach

### Verified integration approach

Fin’s integration page says it connects to helpdesks, channels, APIs, MCP, and
business tools. It lists 60 connectors on the page, including Intercom,
Zendesk, Freshdesk, Salesforce Service Cloud, HubSpot Service Hub, and an “any
helpdesk” API path. Business-system examples include Shopify, Stripe, Linear,
Jira, GitHub, Sentry, Statuspage, Salesforce CRM, HubSpot CRM, PostgreSQL,
Snowflake, MongoDB, Airtable, Notion, QuickBooks, Xero, Twilio, and custom REST
API/webhooks. Channel entries include Messenger, Email, WhatsApp, social,
SMS, Slack, Discord, Amazon Connect, and Fin Voice.

The page says pre-built integrations use MCP or API Data Connectors to read
real-time data and take actions. Its FAQ says OAuth 2.0, restricted data access,
field-level sharing, masking of credit-card numbers, authenticated/encrypted
connections, and auditability are supported. The vendor says a connector is
included in all plans, while custom API integrations are described as available
on Professional and Enterprise plans; plan names and availability should be
validated for a specific contract because the public pricing pages use different
plan presentations.

Sources: [Fin integrations](https://fin.ai/integrations), [Fin Procedures](https://fin.ai/procedures), and [Intercom Apps & Integrations collection](https://www.intercom.com/help/en/collections/2094744-apps-integrations).

### Cross-system strengths and risk

**Vendor fact:** Fin can be deployed alongside an existing helpdesk and keep
that helpdesk as the system of record. The vendor explicitly markets no
migration, existing assignment rules, existing channels, and preferred-Inbox
handoff.

**Inference:** This is a major adoption advantage over a full helpdesk
replacement. It also limits, but does not remove, lock-in. The customer can keep
Salesforce/Zendesk/etc. for tickets, but Fin’s Procedure definitions, guidance,
audience rules, source configuration, and performance semantics remain Fin
configuration. A future migration would need to reproduce both data-plane
actions and control-plane behavior.

For MakeEase, “many connectors” is not enough. The product should make each
connection legible: what data is readable, what mutations are possible, who
authorized it, which system is authoritative, how stale data is handled, and
how to replay or reverse a failed action.

## 6. Pricing and commercial model

### Published prices and packaging

The pricing pages show a two-part model for Intercom: paid teammate seats plus
usage-based services. Current published figures are:

| Product / tier | Published price or rule | Notes from official pages |
| --- | --- | --- |
| Intercom Essential | $29/seat/month | Fin included; $0.99 per Fin outcome; shared Inbox/ticketing and public Help Center. |
| Intercom Advanced | $85/seat/month | Fin included; multiple Inboxes, Workflows, round robin, private/multilingual Help Center; 20 free Lite seats. |
| Intercom Expert | $132/seat/month | Fin included; SSO, identity management, HIPAA support, SLAs, multibrand; 50 free Lite seats. |
| Fin with an existing helpdesk | $0.99/outcome, no seat cost | Minimum monthly commitment applies, with the pricing page giving 50 outcomes as an example; no setup, integration, or platform fee is advertised. |
| Copilot | $29/agent/month annual or $35/agent/month monthly | Personal Inbox assistant; public pages present both annual and monthly figures. |
| Pro add-on / Operator | From $100/month | Includes advanced analysis and Operator; pages describe included analysis/conversation credits and additional credit pricing. |
| Proactive Support Plus | $99/month | Pricing page says 500 messages included; additional usage may apply. |
| Trial | 14 days, no credit card | Public pages say all features, Fin, and add-ons are available during the trial. |

Fin’s pricing page also says Voice is custom-priced for select customers and that
the list is in USD. Fin’s outcomes page specifies the $9.99 rate for Sales
Qualification even though the headline Fin service resolution rate is $0.99.

Sources: [Intercom pricing](https://www.intercom.com/pricing), [Fin pricing](https://fin.ai/pricing), [Fin outcome definitions](https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes), and [Usage controls](https://www.intercom.com/help/en/articles/8991894-how-to-see-and-manage-your-usage).

### Pricing interpretation

**Vendor claim:** Fin describes outcome pricing as paying only when Fin delivers
value, with configurable alerts, limits, and real-time reporting.

**Inference:** Outcome pricing aligns vendor revenue with successful completion
more closely than per-message or per-token pricing, and charging once per
conversation avoids multiplying the bill for multiple questions in a single
conversation. But the customer still has to understand vendor-defined success
states: an assumed resolution can be billable, a Procedure handoff can be
billable, a normal human escalation may not be, and a Sales Qualification costs
10x a standard $0.99 outcome. The outcome model therefore creates a commercial
coupling between configuration choices and invoice behavior.

Intercom does provide usage alerts and hard limits. When a Fin outcome limit is
reached, Fin is disabled for new and existing conversations for the remainder of
the billing period, with handover behavior available through a backup Workflow.
The hard-limit documentation explicitly warns that the exact threshold may be
slightly exceeded or undershot. This is a good operational control, but it is a
fail-closed/hand-off behavior that should be shown prominently before an owner
enables the limit.

## 7. Security, safety, and trust claims

Fin’s trust page claims SOC 2 Type II, ISO 27001, ISO 27701, ISO 27018, ISO
42001, AIUC-1, HIPAA, and GDPR/CCPA compliance or coverage. It also claims:

* SSO integrations with Okta, Azure AD, and OneLogin;
* 2FA, SCIM, and IP restrictions;
* data hosting in the US, EU, or Australia;
* a 99.8% SLA and regional redundancy;
* multi-model resilience using OpenAI, Anthropic, Google, and Intercom models;
* anonymized customer data may be used for fine-tuning, with opt-out and deletion
  within 30 days; and
* third-party AI providers are contractually restricted from training on the
  customer data and use zero-data-retention policies after output generation.

Fin’s safety pages describe Procedures, simulations, restricted connector data
access, OAuth permissions, masked payment-card numbers, and escalation when it
cannot safely answer. The Intercom help center says Fin automatically hands off
high-risk topics, including self-harm, minors, jailbreak attempts, and high-risk
medical/legal/financial advice.

Sources: [Fin trust and reliability](https://fin.ai/trust-reliability), [Fin integrations](https://fin.ai/integrations), and [Fin explained](https://www.intercom.com/help/en/articles/7120684-fin-ai-agent-explained).

**Important classification:** The certifications, SLA, model-provider, deletion,
and data-training statements above are **vendor claims** from public pages. This
research did not inspect a contract, audit report, DPA, or trust-center artifact
to independently validate their scope, applicability to a chosen plan, or
implementation details.

**Inference:** Fin communicates a useful “partnership” safety model: Intercom
provides platform controls; the customer defines goals, boundaries, Procedures,
connectors, and validation criteria. MakeEase should adopt that division but
make the customer-defined boundary machine-readable and exportable as policy
and audit data, not only as configuration in a hosted UI.

## 8. Lock-in and portability analysis

### Lock-in-reducing choices

The following are verified vendor positions that reduce migration friction:

* Fin can run on Salesforce, Zendesk, Freshdesk, HubSpot, Dixa, Front, Zoho,
  Sprinklr, Gorgias, and additional helpdesks.
* The “any helpdesk” path uses an API, and Fin says it can preserve the existing
  helpdesk as system of record.
* Fin supports custom REST APIs, webhooks, and MCP, rather than requiring every
  customer system to become a first-party connector.
* Intercom exposes Fin metadata through its Conversation API and supports custom
  reports and exports in its reporting documentation.

### Lock-in pressures

The following are **inferences from the product shape**, not claims that the
vendor prevents export:

* Fin Procedures, escalation guidance, audience targeting, source selection,
  Workflows, and Intercom Inbox routing are platform-specific control-plane
  objects. Reproducing their behavior elsewhere would require more than copying
  conversation transcripts.
* Outcome definitions and reporting denominators are proprietary product
  semantics. A customer migrating out would need to preserve both raw events and
  the interpretation used for historical reports.
* Intercom’s combined helpdesk, knowledge, automation, agent, and outbound
  surface can create operational gravity even when Fin itself is deployed on a
  third-party helpdesk.
* The public pages reviewed do not promise a complete, versioned export of all
  agent configuration, policy versions, connector scopes, action receipts, and
  evaluation history. Absence of a promise is not proof that export is
  unavailable; it is a portability question MakeEase should answer explicitly.

## 9. Five concrete MakeEase product requirements

These requirements are deliberately aimed at making MakeEase safer,
more cross-system, and more transparent than a tightly integrated support suite.

### 1. Every answer and action must carry an evidence and freshness bundle

For every AI answer, recommendation, connector lookup, and proposed mutation,
MakeEase must record and expose:

* source/document IDs and versions;
* retrieval timestamp and source freshness/expiry status;
* policy and workflow version;
* connector/system of record;
* whether the value was static knowledge, live data, or a human-provided input;
* confidence/uncertainty and the reason for a handoff; and
* customer-safe citations where appropriate.

**Acceptance signal:** An operator can click from an answer or report metric to
the exact source snapshot, policy version, and connector response used. A stale,
missing, contradictory, or untrusted source forces a clarification or human
review instead of silent synthesis.

### 2. Use a cross-system action broker with typed permissions and receipts

All external actions must pass through one broker supporting REST, webhooks,
MCP, and native connectors. Each tool declares read/propose/approve/execute/
verify capabilities, input/output schema, required scopes, reversibility,
idempotency key, owning system, and risk class. High-impact mutations require an
explicit approval or policy gate; the default path is dry-run/preview.

**Acceptance signal:** A refund, cancellation, ticket update, or CRM mutation
shows a pre-action diff, authorized principal, target system, idempotency key,
result, verification lookup, and reversal path. A failed or timed-out call is
never presented as completed.

### 3. Make resolution, handoff, and completion separate customer-visible states

MakeEase must not collapse “answer sent,” “customer confirmed,” “customer
stopped replying,” “action proposed,” “action completed,” “human requested,”
“human-in-the-loop,” “escalated,” and “abandoned” into one success number.
Customers must always have a clear human-handoff control, and operators must see
why a handoff happened, what context was transferred, and which team/system owns
the next step.

**Acceptance signal:** Reports show confirmed and assumed resolution separately;
the denominator is displayed next to each rate; and a customer can request a
human without being charged or marked resolved merely because the conversation
went quiet.

### 4. Provide a hard, auditable cost and side-effect budget across providers

Every workspace and workflow must support pre-run estimates, atomic reservations,
per-system/action budgets, alerts, hard caps, and safe checkpoints. BYOK usage
must distinguish MakeEase orchestration cost from the customer’s external
provider invoice. At a cap, new side effects stop or require approval while
read-only status and audit export remain available.

**Acceptance signal:** Before an expensive or mutating step, the UI shows the
estimated platform and external cost, remaining budget, and cap behavior. A
ledger records reservations, settlement, retries, refunds/credits, and the
policy version that caused a hold. No retry can bypass the same cap.

### 5. Treat AI changes as versioned releases with evals, monitoring, rollback,
and portable event export

MakeEase must provide a draft environment, representative simulations, saved
regression cases, policy/connector tests, staged rollout, A/B or canary support,
live monitors across AI and human work, alert thresholds, review queues, and
one-click rollback. The complete event stream—including prompts/configuration
hashes, sources, tool calls, approvals, outputs, handoffs, costs, and human
ratings—must be exportable in an open, documented format.

**Acceptance signal:** An owner can compare a proposed policy/knowledge/tool
change against the current version before release, identify regressions by
scenario and system, roll back without deleting evidence, and reconstruct a
customer interaction outside MakeEase from the exported receipt.

## Official source register

The principal pages used for this brief are:

* [Intercom pricing](https://www.intercom.com/pricing)
* [Fin pricing](https://fin.ai/pricing)
* [Fin AI Agent outcomes](https://www.intercom.com/help/en/articles/8205718-fin-ai-agent-outcomes)
* [Fin AI Agent reporting](https://www.intercom.com/help/en/articles/7837533-fin-ai-agent-reporting)
* [Fin usage, alerts, and hard limits](https://www.intercom.com/help/en/articles/8991894-how-to-see-and-manage-your-usage)
* [Fin escalation guidance and rules](https://www.intercom.com/help/en/articles/12396892-manage-fin-ai-agent-s-escalation-guidance-and-rules)
* [Fin AI Agent explained](https://www.intercom.com/help/en/articles/7120684-fin-ai-agent-explained)
* [Fin Help Center](https://fin.ai/help/en/)
* [Fin Train](https://fin.ai/train)
* [Fin Procedures](https://fin.ai/procedures)
* [Fin Testing / eval-driven delivery](https://fin.ai/testing)
* [Fin Analyze](https://fin.ai/analyze)
* [Fin Integrations](https://fin.ai/integrations)
* [Fin Channels](https://fin.ai/channels)
* [Fin Trust and Reliability](https://fin.ai/trust-reliability)
* [Intercom Inbox collection](https://www.intercom.com/help/en/collections/3497068-inbox)
* [Intercom Workflows collection](https://www.intercom.com/help/en/collections/2094721-workflows)
* [Intercom Knowledge collection](https://www.intercom.com/help/en/collections/9615439-knowledge)
* [Intercom Apps & Integrations collection](https://www.intercom.com/help/en/collections/2094744-apps-integrations)
* [Intercom Security & Privacy collection](https://www.intercom.com/help/en/collections/384-security-privacy)
