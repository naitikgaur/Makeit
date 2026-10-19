# Salesforce Agentforce: enterprise CRM-native AI-agent platform

**Research date:** 2026-10-16  
**Scope:** Salesforce’s public pricing, rate-card, Agentforce Builder/Actions, Agent Script, Data 360 (formerly Data Cloud), Knowledge, Slack, governance/security, observability, lifecycle, and implementation material.

## Executive take

Agentforce is Salesforce’s CRM-native control plane for configuring, running, governing, and measuring AI agents. Its strongest adoption wedge is an existing Salesforce customer: CRM records, metadata, permissions, Flow, Apex, MuleSoft, Prompt Builder, Knowledge, Data 360, and Slack are presented as one connected system. The platform combines low-code configuration with a deterministic scripting layer (Agent Script), action-level metering, human escalation, audit/security controls, testing, and session-level observability.

The tradeoff is commercial and architectural coupling. Public pricing is a portfolio of Salesforce SKUs and consumption meters rather than one simple product price. A seemingly small use case can involve an Agentforce entitlement, Flex Credits or Conversation pricing, CRM edition/objects, Data 360 consumption, Slack, security products, and implementation/support services. Agent definitions are portable by copy/paste across Salesforce teams/environments, but the public material does not establish export to a neutral runtime or metadata standard. That is a meaningful lock-in risk for a buyer whose systems of record are not Salesforce.

**Bottom line for MakeEase:** match the governance, deterministic workflow, human-control, and observability depth, but make the core portable, connector-first, self-serve, and financially predictable.

## Evidence conventions

- **Verified fact** means the statement is explicit on a public Salesforce page linked in the Sources section.
- **Vendor claim** means Salesforce’s product/marketing assertion (for example, “reliable,” “eliminate hallucinations,” or “scale in minutes”); it is not an independently validated outcome.
- **Inference** is analysis from the published packaging and architecture, not a Salesforce statement.

## What Agentforce is and why it is CRM-native

### Verified facts and vendor claims

- Salesforce describes Agentforce as a platform for building, deploying, managing, and orchestrating agents across customer service, sales, marketing, commerce, employee support, IT, field service, voice, web, apps, and messaging channels. [Vendor claim: Agentforce overview and How It Works]
- Agentforce agents can use Salesforce CRM data, external data through Data 360, knowledge articles, Flows, Apex, MuleSoft APIs, prompt templates, and custom business logic. Agentforce Builder connects these assets to a configured agent through topics/subagents, instructions, and actions. [Verified fact]
- Salesforce positions the platform around **data, reasoning, and actions**: the Atlas Reasoning Engine breaks a request into tasks, proposes a plan, retrieves trusted context, and invokes actions. [Vendor claim: How It Works]
- Salesforce’s current data product is **Data 360**, formerly Data Cloud. It provides connectors, zero-copy integrations, structured and unstructured data support, vector search for content such as PDFs/chat transcripts/knowledge articles, reference data models, data graphs, identity resolution, calculated insights, and real-time actions. [Verified fact]
- Agentforce is explicitly available in Slack. Salesforce says Slack is included with every new Salesforce org and that Agentforce in Slack puts humans and agents side by side in the existing work conversation. [Verified fact/vendor claim]

### CRM lock-in analysis

**High-value native surface.** For an organization already using Salesforce, the agent can act on the same object model, sharing rules, roles, automation, and customer context as human users. This reduces integration work and makes a CRM action (for example, retrieve cases, update a record, or add a case comment) a first-class tool rather than a separately maintained integration.

**Where coupling accumulates (inference).** The durable parts of an Agentforce deployment are likely to include Salesforce metadata for agent instructions/topics/actions, Salesforce object and permission semantics, Flow/Apex/MuleSoft implementations, Data 360 mappings and policies, Slack channel configuration, Salesforce trace/evaluation data, and Salesforce consumption accounting. Reusing these assets increases time-to-value but also increases switching cost. Salesforce’s portability language is “copy, paste, and reuse” across Salesforce teams or environments; that is useful operational portability, but it is not evidence of a vendor-neutral export format or independent execution runtime.

**External access reduces migration, not control-plane dependency (inference).** Salesforce advertises 200+ Data 360 connectors on one page, 300+ sources through MuleSoft on another, zero-copy warehouse integrations, external systems, APIs, and MCP/headless access. These options can avoid copying all data into Salesforce, but the agent’s policies, orchestration, action metadata, trace model, and commercial meter still remain Salesforce-centered unless a buyer builds and maintains an external parallel control plane.

**Slack strengthens the ecosystem loop (inference).** Slack delivery is a strong adoption advantage because employees do not need a new surface. It also makes Salesforce + Slack a combined platform decision: channel history, approvals, notifications, and agent interaction become more valuable when both products remain in the same vendor ecosystem.

## Pricing, rate cards, and unit economics

### Published US pricing

Salesforce currently presents several buying models. Prices below are the public list prices shown on the Agentforce pricing page; contracts, discounts, currency, availability, and future rate-card changes can differ.

| Model | Published price | Meter/entitlement | Practical reading |
|---|---:|---|---|
| Salesforce Foundations | **$0** | Includes Agentforce Builder, Prompt Builder, Agent Script, Agentforce Coworker, and Agentforce Vibes | A low-friction starting surface, but the page describes it as an add-on for Salesforce customers (the How It Works FAQ says Enterprise Edition and higher). |
| Flex Credits | **$500 per 100,000 credits** | Normal Agentforce action = **20 credits**; Agentforce Voice action = **30 credits** | $0.005/credit; therefore a normal action is **$0.10** and a voice action is **$0.15** at the published list rate. Credits are fungible across actions, prompts, translations, and voice actions. |
| Conversations | **$2 per conversation** | Customer-facing Agentforce conversations | Simple external-agent unit, but the public page does not define the conversation boundary in the excerpt; confirm counting rules contractually. |
| Agentforce User License | **$5/user/month**, requires Flex Credits | Employee access, limited Salesforce CRM objects, metered usage | A seat fee does not replace consumption. |
| Agentforce add-on | **$125/user/month** | Unmetered Agentforce use for employees plus Salesforce AI features | Sales, Service, Field Service, and Operations add-ons. |
| Industries add-on | **$150/user/month** | Unmetered employee use for Industries Clouds | Separate packaging from the general add-on. |
| Agentforce Max Editions | **From $550/user/month** | Agentforce add-on plus 2.75M Flex Credits per org/year | Enterprise packaging with a large included credit pool. |

The pricing page lists **Pre-Purchase**, **Pre-Commit**, and **PayGo** buying models. Pre-Purchase draws down an upfront balance; Pre-Commit bills monthly against a baseline and can true-up; PayGo has no upfront commitment and bills monthly in arrears. Salesforce says Digital Wallet is provided free when a customer has a Digital Wallet-enabled product and supports near-real-time consumption, thresholds, and trends.

### Action versus conversation pricing

The public page’s action examples make the economic behavior concrete:

- **Customer self-service:** two actions per “where is my order” request = 40 credits = **$0.20/request**; Salesforce’s example of 20 requests/day is **$120/month**.
- **Case management:** three actions per case = 60 credits = **$0.30/case**; 100 users × 3 cases/day × 20 days = **$1,800/month** in the example.
- **Appointment scheduling:** five actions per appointment = 100 credits = **$0.50/appointment**; 10 reps × 3 appointments/day × 20 days = **$300/month**.
- **Knowledge answer:** one action = 20 credits = **$0.10/question**; the example totals **$10/month** for 20 employees × 5 questions.
- **Voice:** four voice actions = 120 credits = **$0.60/call** at the published $500/100,000-credit rate; 300 calls/month = **$180/month** in the example. A single 30-credit voice action is $0.15.

Salesforce labels these examples illustrative and says actual usage varies. The case-management example explicitly excludes “other costs like Data 360 credits or other consumption services.” This is important: a cheap action-level calculation is not necessarily the complete cost of grounded data, CRM editions, channels, security, or integration.

Commercial constraints called out by Salesforce:

- Flex Credits and Conversation pricing **cannot be used together in the same org**.
- Unused Flex Credits **do not roll over** into a subsequent subscription term.
- If usage exceeds the Flex entitlement, Salesforce says there is no overage penalty; the contracted rate is billed monthly in arrears.
- Conversation pricing is positioned for external customer agents; Flex Credits are positioned as the more flexible model across employee, customer, voice, Slackbot, and other use cases.

**Inference: pricing is flexible but forecast-heavy.** Action pricing aligns spend with work completed, but a multi-step plan, retry, retrieval, or extra tool call increases the bill. Conversation pricing is easier to explain but is constrained by org-level model choice and an externally defined conversation unit. The inability to mix models, non-rollover credits, separate Data 360 consumption, and multiple user/add-on editions create procurement and forecasting friction even before implementation services are considered.

## Agent configuration and actions

### Builder

Salesforce’s Agentforce Builder is a low-code/pro-code workspace. Publicly described controls include:

- prebuilt agents, subagents, actions, and templates for jobs such as order management, reservations, FAQs, service, SDR, Sales Coach, guided shopping, campaigns, and setup;
- natural-language instructions in a Canvas-style workspace;
- global instructions, topics, subagents, actions, variables, and guardrails;
- connections to CRM data, knowledge articles, Flows, Apex, MuleSoft APIs, prompt templates, external systems, and channels;
- an integrated simulator that shows interaction summaries and event metadata;
- batch testing, reusable test cases from real interactions, and drill-down traces before deployment;
- Agent Optimizer, which Salesforce says can create/refine/test/observe agents conversationally.

### Actions

Salesforce defines an action as a specific function an agent executes—for example, updating a record, summarizing a complex case, answering a product inquiry, or executing a custom prompt or Flow. The Builder and How It Works pages describe turning existing Flows, prompts, Apex, and APIs into actions. This gives administrators an attractive “reuse what already runs the business” path.

**Architecture observation (inference):** actions are the economic and security boundary. They are the unit that can change business state, the unit the Flex meter counts, and the unit that should carry an explicit schema, permission, idempotency, approval, and audit policy. MakeEase should treat action definitions as portable contracts rather than opaque prompts.

### Agent Script

Agent Script is Salesforce’s deterministic scripting layer. Salesforce says it combines natural-language flexibility with programmatic expressions and supports conditions, loops, transitions, variable assignment/comparison, persistent context, structured workflows, and syntax validation. The same metadata foundation can be edited through AI assistance, the natural-language Canvas, or script view; Salesforce says agents can be copied and reused across teams/environments.

**Vendor claim:** Agent Script “guarantees consistency,” removes prompt overload, and keeps critical workflows repeatable as underlying models change.  
**Verified design lesson:** deterministic branches, typed variables, explicit transitions, and visible validation are more governable than putting every policy into a single system prompt.  
**Inference:** this is Salesforce’s answer to the enterprise fear that an unconstrained LLM will choose an unsafe or inconsistent path. It is a strong pattern for MakeEase, provided the language and manifest are open/exportable.

## Data, Knowledge, and grounding

Salesforce’s knowledge story has two layers:

1. **Agentforce knowledge actions and articles:** Builder can connect knowledge articles, and “Answer Question with Knowledge” appears as a metered action in Salesforce’s pricing examples.
2. **Data 360 context platform:** Data 360 ingests or connects to structured records and unstructured sources such as PDFs, chat transcripts, wikis, and knowledge-base articles; Salesforce describes vector search, data graphs, identity/reconciliation rules, real-time ingestion, calculated insights, and grounded prompts for agents.

Data 360 can map external data into Salesforce’s reference data model and expose only focused data graphs to prompts. Salesforce also advertises zero-copy connections to Snowflake, Databricks, BigQuery, AWS, and other warehouses. These are meaningful enterprise-data capabilities and can reduce ETL duplication.

**Vendor claim:** Data 360 provides trusted context, reduces hallucinations and model processing costs, and enables confident decisions.  
**Inference:** Data 360 is both an adoption accelerator and a lock-in multiplier. It lets a customer avoid moving all data, but the value of harmonization, identity resolution, semantic models, and policies accumulates in Salesforce’s metadata. A buyer should ask which Data 360 ingestion, storage, vector, graph, and activation operations are billed separately from Agentforce.

## Human controls, governance, and security

### Controls described publicly

- **Human escalation:** Salesforce repeatedly describes agents handing complex or out-of-scope issues to human agents. Agentforce Operations describes humans handling approvals, exceptions, and high-impact decisions.
- **Guardrails:** Agentforce Guardrails combine customer-defined safeguards with Salesforce-managed protections intended to block off-topic/inappropriate conversations and reduce hallucination, bias, and incorrect information.
- **Trust Layer:** Salesforce lists dynamic grounding, zero data retention, toxicity detection, secure retrieval, and audit capabilities. The How It Works FAQ says Audit Trail tracks agent actions and outputs for security, privacy, regulatory, and AI-governance policies.
- **Platform controls:** Salesforce cites least-privilege access, core access controls, security testing, disaster recovery, and shared responsibility. The security portfolio includes Shield, Security Center, Data Mask & Seed, Privacy Center, Backup & Recover, Archive, Hyperforce residency options, and Data 360 Governance.
- **Data governance:** Data 360 pages describe classification/tagging, consistent access policies over ingested and zero-copy data, and secure/private connections for sensitive data.
- **Determinism:** Agent Script can enforce fixed workflow paths and variables instead of allowing the model to select every step.
- **Operational audit:** Agentforce Operations describes blueprint-linked activity records, status, owners, timelines, escalations, and a full audit trail; its systems-integration material says permissions and approval controls are preserved.

**Vendor claim versus implementation reality:** these controls are strong on paper, but the public pages do not say that every action is automatically approval-gated. Approval behavior, escalation conditions, object-level permissions, retention, data residency, and audit depth still need to be designed and validated per org/use case. Inference: Salesforce provides the primitives; governance quality depends on configuration, edition/entitlements, and operating discipline.

## Evaluation and observability

Agentforce has unusually broad lifecycle messaging for an enterprise agent product:

- **Builder simulation:** inspect the selected subagent/topic, action calls, output, variable changes, timing, and metadata for an interaction.
- **Batch testing:** generate reusable test cases from real interactions, run them in batches, and compare results over time.
- **Test & Evaluate lifecycle:** Salesforce describes multi-turn simulation, custom scoring evaluations, automated test cases, probabilistic-agent evaluation, and pipeline-compatible batch testing.
- **Controlled experimentation:** the lifecycle page describes traffic-split experiments comparing instructions, topics, and actions in production with built-in metrics.
- **Observability mission control:** aggregate usage/effectiveness/customer-feedback analytics, consumption tracking, configuration inspection, health alerts, session tracing, intent clustering, sentiment segmentation, and per-interaction Quality Scores.
- **Programmatic traces:** Salesforce says its Session Trace Data Model can expose complete agent traces to existing monitoring and DevOps tooling.
- **Cost visibility:** Digital Wallet and Observability show consumption by agent and usage trends; Salesforce positions this as tying activity to outcomes.

**Vendor claim:** these features provide full visibility, near-real-time health monitoring, faster resolution, higher accuracy, and continuous optimization.  
**Inference:** the feature set is a serious enterprise strength, but it also increases product surface area. A customer may need Builder, Testing Center/lifecycle tooling, Observability, Digital Wallet, Data 360, security products, and external monitoring knowledge. MakeEase should make the minimum viable governance/evaluation loop available in one workspace and export standard traces rather than requiring a buyer to assemble a Salesforce-specific operations stack.

## Implementation and buying friction

Salesforce’s Customer Success and Services pages make implementation an explicit part of the offer:

- Standard Success Plan: included self-guided resources, documentation, Trailhead, Help, and community.
- Premier Success Plan: personalized onboarding/coaching and expedited support; the public comparison lists **30% of net license fees**.
- Signature Success Plan: designated Customer Success Manager, specialized architect reviews, proactive monitoring, and fastest support; price is “contact your account executive.”
- Professional Services: “Get Started,” “Build,” “Optimize,” and “Transform” services, including advisory, integration, data work, security/guardrails, adoption, and Agentforce deployments.

**Buying friction (inference from verified packaging):**

1. **Prerequisite ecosystem:** the lowest-friction path assumes a Salesforce org, edition, CRM object model, permissions, and admins. Builder access is granted by admin permissions.
2. **SKU and meter complexity:** a buyer must choose between Flex and Conversations, then account for user licenses/add-ons/Max, CRM editions, Data 360 consumption, Slack, voice, and possibly security products.
3. **Architecture work remains:** grounding and safe action execution require data mappings, knowledge quality, Flow/Apex/MuleSoft/API design, permission reviews, test sets, and escalation policy.
4. **Commercial opacity:** Salesforce’s pages show list prices but repeatedly direct customers to an Account Executive for detailed pricing, rate-card questions, contract terms, and model selection.
5. **Specialist dependency:** Salesforce’s own implementation and Success Plan offering is a benefit for large enterprises, but it signals additional services, skills, and time for customers that lack Salesforce platform expertise.

The $0 Foundations entry point and PayGo model reduce initial commitment for an existing customer. They do not eliminate the larger adoption decision: production value depends on Salesforce data, actions, channels, governance, and operating services.

## Product/architecture requirements for MakeEase

To be easier to adopt than Agentforce while retaining enterprise governance, MakeEase should meet these five requirements:

1. **Portable, connector-first control plane.** Store agents, actions, policies, tests, and traces in a versioned, documented JSON/YAML manifest with stable IDs and schemas. Provide Salesforce/HubSpot/ServiceNow/Slack/email/database adapters without requiring a CRM migration or making one vendor’s object model the canonical runtime. Support import/export and a clean “detach connector” path.

2. **Transparent cost and safety budgeting.** Show a preflight estimate before execution (model calls, retrievals, action calls, retries, connector fees), expose per-run/per-action usage, and enforce hard workspace/org budgets, rate limits, loop limits, and approval thresholds. Offer a self-serve starter tier with predictable limits; let customers choose action-based or conversation-based pricing without an org-wide lock-in.

3. **Low-code builder plus deterministic open DSL.** Pair a visual/natural-language builder with a readable script/manifest supporting typed inputs/outputs, conditions, loops, transitions, variables, retries, timeouts, idempotency, and explicit failure paths. Keep the generated artifact reviewable in code review and deployable across dev/staging/prod; never hide critical policy in an unexportable prompt.

4. **Risk-based human control plane.** Give every action a policy classification and default to least privilege, dry-run, reversible operations, and allowlists. Support configurable approval gates, two-person approval for high-impact actions, pause/kill switch, escalation queues, delegation, environment promotion, and immutable audit records with actor, input, policy decision, output, and external side effects.

5. **Evaluation and observability by default.** Include simulator, golden test sets, multi-turn batch tests, custom evaluators, trace spans, action/variable/policy timelines, quality/latency/cost metrics, intent clustering, alerts, replay, shadow mode, and canary/A-B rollout in the core product. Export OpenTelemetry-compatible traces and audit events so an enterprise can use its existing SIEM/DevOps stack instead of buying a separate observability island.

## Sources (official Salesforce pages)

### Pricing and rate cards

- Agentforce Pricing: https://www.salesforce.com/agentforce/pricing/
- Agentforce & Data 360 Rate Cards: https://www.salesforce.com/agentforce/rates/
- Flex Credits Rate Card (linked by Salesforce): https://www.salesforce.com/en-us/wp-content/uploads/sites/4/assets/pdf/agentforce/Flex-Credits-Rate-Card-08.31.2026.pdf
- Agentforce Conversation Rate Card (linked by Salesforce): https://www.salesforce.com/en-us/wp-content/uploads/sites/4/assets/pdf/agentforce/Rate-Card-Agentforce.pdf

### Builder, actions, scripting, lifecycle, and observability

- Agentforce Builder: https://www.salesforce.com/agentforce/agent-builder/
- How Agentforce Works: https://www.salesforce.com/agentforce/how-it-works/
- Agent Script: https://www.salesforce.com/agentforce/script/
- Agent Development Lifecycle: https://www.salesforce.com/agentforce/agent-development-lifecycle/
- Agentforce Observability: https://www.salesforce.com/agentforce/observability/
- Agentforce Operations: https://www.salesforce.com/agentforce/operations/

### Data, Knowledge, Slack, governance, and security

- Data 360 overview (formerly Data Cloud): https://www.salesforce.com/data/
- How Data 360 works: https://www.salesforce.com/data/how-it-works/
- Agentforce in Slack: https://www.salesforce.com/slack/agentforce/
- Cloud Data Security & Privacy: https://www.salesforce.com/platform/cloud-data-security/

### Implementation and support

- Salesforce Customer Success: https://www.salesforce.com/services/
- Salesforce Success Plans: https://www.salesforce.com/services/success-plans/
- Salesforce Professional Services: https://www.salesforce.com/services/professional-services/
