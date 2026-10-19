# Zendesk competitor research

**Research date:** 2026-10-16  
**Scope:** Zendesk's publicly documented customer-service/support, AI agents, Copilot, Action Builder, knowledge, routing, reporting, marketplace, migration, security, enterprise controls, and pricing. All links below are official Zendesk pages or Zendesk Help articles. Prices and packaging are the public display observed on the research date and can vary by region, contract, plan generation, and sales quote.

## Executive read

Zendesk is positioning its products as a **Resolution Platform**: ticketing and an omnichannel Agent Workspace are the system of record; knowledge grounds self-service, AI agents, and human replies; routing assigns work; Action Builder and integrations perform work in Zendesk and external systems; Explore/Agentic Analytics and QA measure outcomes; enterprise security and audit controls govern the whole loop.

The strongest competitive lesson for MakeEase is the end-to-end handoff. A customer can start in messaging, email, voice, or social; an AI agent can gather context and attempt a resolution; an escalated ticket can be routed by availability, capacity, priority, SLA, and skills; a human sees the conversation, customer history, knowledge, apps, side conversations, approvals, and calls in one workspace; and actions can update external systems. Zendesk makes the workspace and ecosystem feel coherent even though the underlying products and add-ons are numerous.

The main counterpressure is complexity. Seat pricing, add-ons, automated-resolution usage, action credits, voice usage, plan-dependent routing, connector scopes, data-locality exceptions, and legacy-to-modern channel migrations all require careful administration. Public documentation also describes two automated-resolution platforms (pre-May-18-2026 and resolution tiers introduced May 18, 2026), while the public pricing page still displays the older allowance/overage terminology. A buyer should obtain a tenant-specific quote and confirm which billing platform applies.

## Official source register

The source IDs in this document point to the following official pages. Accessed 2026-10-16.

- **[S1] Pricing:** [zendesk.com/in/pricing](https://www.zendesk.com/in/pricing/)
- **[S2] Service overview:** [zendesk.com/in/service](https://www.zendesk.com/in/service/)
- **[S3] Zendesk AI:** [zendesk.com/in/service/ai](https://www.zendesk.com/in/service/ai/)
- **[S4] AI agents:** [zendesk.com/in/service/ai/ai-agents](https://www.zendesk.com/in/service/ai/ai-agents/)
- **[S5] Copilot:** [zendesk.com/in/service/ai/copilot](https://www.zendesk.com/in/service/ai/copilot/)
- **[S6] Resolution Platform:** [zendesk.com/in/platform](https://www.zendesk.com/in/platform/)
- **[S7] Knowledge:** [zendesk.com/in/service/knowledge](https://www.zendesk.com/in/service/knowledge/)
- **[S8] Ticketing:** [zendesk.com/in/service/ticketing-system](https://www.zendesk.com/in/service/ticketing-system/)
- **[S9] Messaging:** [zendesk.com/in/service/messaging](https://www.zendesk.com/in/service/messaging/)
- **[S10] Contact Centre:** [zendesk.com/in/service/contact-center](https://www.zendesk.com/in/service/contact-center/)
- **[S11] Agent Workspace Help:** [About the Zendesk Agent Workspace](https://support.zendesk.com/hc/en-us/articles/4408821259930)
- **[S12] Current resolution-tier documentation:** [About automated resolution tiers](https://support.zendesk.com/hc/en-us/articles/9570369117338)
- **[S13] Prior resolution-platform documentation:** [About automated resolutions](https://support.zendesk.com/hc/en-us/articles/5352026794010)
- **[S14] Action Builder:** [Understanding the action builder and action flows](https://support.zendesk.com/hc/en-us/articles/8855513857306)
- **[S15] Action steps/connectors:** [Action flow steps and actions reference](https://support.zendesk.com/hc/en-us/articles/11313555027098)
- **[S16] Action usage and traces:** [Monitoring action credits and action flow activity](https://support.zendesk.com/hc/en-us/articles/10149993578522)
- **[S17] Custom code:** [Using custom code steps in action flows](https://support.zendesk.com/hc/en-us/articles/9853782610970)
- **[S18] External knowledge:** [Connecting external knowledge sources](https://support.zendesk.com/hc/en-us/articles/9796599390874)
- **[S19] Omnichannel routing:** [About omnichannel routing](https://support.zendesk.com/hc/en-us/articles/4409149119514)
- **[S20] Routing choices:** [Routing and automation options](https://support.zendesk.com/hc/en-us/articles/4408831658650)
- **[S21] Explore:** [Support ticket activity and agent performance](https://support.zendesk.com/hc/en-us/articles/4408835846810)
- **[S22] Explore roles/concepts:** [Getting started with Explore](https://support.zendesk.com/hc/en-us/articles/4408831710618)
- **[S23] Trust Centre:** [Security, Privacy and Legal](https://www.zendesk.com/in/trust-center/)
- **[S24] AI Trust:** [AI Trust at Zendesk](https://support.zendesk.com/hc/en-us/articles/9196781863578)
- **[S25] Audit log:** [Viewing the audit log](https://support.zendesk.com/hc/en-us/articles/4408828001434)
- **[S26] Data locality:** [Data Hosting Locations](https://support.zendesk.com/hc/en-us/articles/4408825765530) and [Regional Data Hosting Policy](https://support.zendesk.com/hc/en-us/articles/4408883599130)
- **[S27] Chat-to-Messaging migration:** [Why migrating from live chat to messaging](https://support.zendesk.com/hc/en-us/articles/4408834108186--Why-migrating-from-live-chat-to-messaging-is-the-right-choice)
- **[S28] Chat-to-omnichannel migration:** [Using omnichannel routing while migrating](https://support.zendesk.com/hc/en-us/articles/6249962577690)
- **[S29] App Builder:** [Using App Builder](https://support.zendesk.com/hc/en-us/articles/9034700691866)

The direct Marketplace page returned HTTP 403 to the retrieval tool. The official Platform and Service pages still expose the Marketplace count/link, so marketplace observations below are limited to those accessible official claims and the Action Builder connector documentation.

## Verified facts from official product pages and docs

### 1. Support product and end-to-end Agent Workspace

- Zendesk Ticketing turns email, messaging, phone, social, and other channels into a single ticket record. Its documented workflow primitives include support addresses, ticket forms, tags, views, triggers, time-based automations, macros, SLAs, and integrations. [S8, S20]
- The Agent Workspace is a single ticket interface for multiple channels. Agents can switch between email, chat/messaging, voice, social, and web messages without changing dashboards. It exposes customer context and interaction history, a Knowledge panel, apps, side conversations, custom-object records, approvals, IT assets, task lists, a call console, and a unified agent-status menu. [S11]
- Messaging supports both real-time and persistent conversations. Zendesk's migration documentation says messaging adds conversation persistence, AI agents, social channels, omnichannel routing, and Agent Workspace support compared with legacy live chat. [S9, S27]
- Contact Centre combines voice, digital channels, workforce management, QA, AI agents, and Copilot in one workspace. Voice AI and voice Copilot are part of the Contact Centre positioning; the public plan comparison separately marks voice AI as requiring Zendesk Voice and shows some voice features as add-ons. [S1, S10]
- The documented agent workflow is therefore: channel intake -> ticket/conversation context -> AI agent or self-service attempt -> escalation when necessary -> omnichannel assignment -> human workspace with context/knowledge/apps -> Zendesk or external action -> resolution and reporting. This is a synthesis of the documented product behavior, not a claim that every step is enabled on every plan. [S6, S11, S19]

### 2. AI agents and AI-resolution pricing

**Capabilities documented by Zendesk**

- AI agents are described as autonomous systems for messaging, email, and voice (voice availability is also marked EAP in the plan comparison). The public product page lists web, mobile, social, email, and voice channels, natural-language agent/procedure building, external integrations/actions, reasoning controls, advanced reporting, and support for 80+ languages. [S1, S4]
- Generative procedures let an admin describe a workflow in free text, generate a human-readable procedure summary and visual procedure map, revise it with natural-language instructions, inspect version history, test, and publish. Procedures can reference knowledge searches, actions, API integrations, parameters, search rules, and other procedures/dialogues. [S4 and the official Help article linked from S4: https://support.zendesk.com/hc/en-us/articles/8979864563610]
- AI agents can escalate to human teams with context, and Zendesk documents that omnichannel routing does not route an AI-agent ticket until it has escalated to a human. [S4, S19]
- Zendesk's AI Trust documentation says AI outputs can expose confidence scores; Custom Agents can show how an agent arrived at responses/decisions; AI agents are identified to end users; and QA can monitor outputs. [S24]

**Public price display and usage model**

- The public pricing page displays, paid annually per agent/month: **Support Team US$19**, **Suite Team US$55**, and **Suite Professional US$115**. Monthly display is **US$25**, **US$69**, and **US$149**, respectively. Enterprise is sales-assisted. The page was the India-localized page but displayed USD; treat these as observed public display prices, not a universal quote. [S1]
- The same page says AI agents are included in Suite and Support plans and usage is priced by automated resolutions. Its comparison table displays **5 automated resolutions per agent/month** for Team and **10 per agent/month** for Professional, with a stated annual cap of up to 10,000 resolutions; it displays **£1.30** for committed resolutions and **US$2.00** for pay-as-you-go resolutions. [S1]
- The older automated-resolution article documents a different allowance table for accounts still on the pre-May-18-2026 platform: Team 5, Growth/Professional 10, Enterprise 15 automated resolutions per agent/month, maximum 10,000 per year; overage can be allowed or AI can be paused. It says only conversations resolved without human escalation consume an automated resolution, with an LLM verification step. [S13]
- The current tier article says automated resolutions introduced on May 18, 2026 are grouped into **Assisted escalation**, **Contained resolution**, and **Verified resolution**. Assisted escalation and contained resolution do not count against the resolution allowance; verified resolution is a successful AI resolution verified by an LLM. It defines conversation-end timing as 72 hours after the first email, normally two hours after the first messaging message (configurable up to 72 hours), or immediately after a voice hangup. [S12]
- The tier article does not publish a dollar rate for each tier. Because the public pricing page still uses the older allowance/committed/PAYG labels while the Help Centre documents a newer tier platform, a buyer must confirm the account's resolution platform, tier definitions, allowance, overage behavior, and currency in the quote. [S1, S12, S13]

### 3. Copilot

- Copilot is positioned as an add-on for human agents and admins, distinct from AI agents. In the workspace it can provide ticket summaries, suggested first replies, suggested macros, similar/merged-ticket suggestions, writing tools, next steps, and approved actions. Admin Copilot surfaces workflow/setup recommendations and an agent-productivity dashboard. [S5, S11]
- Copilot can use knowledge, procedures, macros, ticket context, conversation history, and external-system data. Its documented action examples include updating fields, processing returns, and actions in Shopify, Jira, Slack, and other systems. [S5]
- The public price page shows a **Copilot add-on at US$50 per agent/month paid annually**. The table shows five pooled writing-tool/ticket-summary uses per agent/month, capped at 500 uses per instance/month. The Copilot FAQ also says it is an add-on and directs buyers to an account executive, while noting that some Copilot benefits may be available at no extra cost on qualifying plans. [S1, S5]
- Intelligent triage is a Copilot capability that classifies tickets by intent/topic, language, sentiment, and related attributes for routing, automation, and reporting. [S1, S20]

### 4. Action Builder and workflow/action governance

- Action flows are user-defined sequences triggered by ticket, user, custom-object, IT asset, Slack, schedule, custom HTTP, or AI/Copilot on-demand events. They can run Zendesk actions and external connector/custom actions. The builder supports branches, waits, repeats, custom variables, custom code, approvals, and outputs returned to Copilot. [S14, S15]
- Documented limits are material: maximum **100 action flows** per account, **60 steps** per flow excluding the trigger, one connected instance per connected system, one condition per branch, up to 10 trigger conditions, and nesting up to two levels. [S14, S15]
- Custom actions can call user-specified APIs; connector actions cover a large catalog of systems. The reference includes examples such as AfterShip, Airtable, Asana, BambooHR, Calendly, Chargebee, Claude, ClickUp, Confluence, Freshdesk, GitHub, Gmail, Google services, HubSpot, Intercom, Jira, Linear, Shopify-related systems, and others. Zendesk also documents MCP server connections whose discovered tools can be used in flows and optionally surfaced through auto assist or AI agents. [S15, official connector article linked from S15]
- Governance is partly identity- and scope-based: external actions are attributed to the user who connected the external system; Zendesk recommends a dedicated service account and says admins should review requested scopes. Zendesk actions are attributed to the system user. [S15, official connector article]
- Action Builder has usage metering. Included monthly action credits are **40,000** for Suite Team/Growth and Support Team, **100,000** for Professional, **225,000** for Enterprise, and **400,000** for Enterprise Plus. Zendesk sends alerts at 80% and 100%; extra credits are sold in 100,000-action units. [S16]
- Zendesk documents a seven-day rolling action-flow activity record plus real-time execution logs and visual step traces showing inputs, outputs, condition evaluations, timestamps, action credits consumed, failure details, and suggested fixes. Admins can configure failure notifications. [S16]
- Custom code runs synchronous JavaScript only, with a 10,000-character limit; network requests, `async`/`await`, `fetch`, imports, and external modules are prohibited. The docs advise testing in a test environment and excluding secrets/sensitive data. [S17]
- A custom action is snapshotted when inserted into a flow; subsequent edits are not reflected until the step is deleted and re-added. Auto-assist custom actions require the Copilot add-on. [S14, S15]

### 5. Knowledge and knowledge connectors

- Zendesk Knowledge is presented as a shared foundation for self-service, AI agents, and human agents. Knowledge Builder can analyze historical tickets and business context to suggest structure and draft articles; Knowledge Graph/Connectors unify content from Zendesk and external sources; contextual answers and content-health recommendations are surfaced to agents and admins. [S6, S7]
- Zendesk documents dedicated connectors for systems including Confluence, Google Drive, Notion, SharePoint, Jira, Salesforce, Freshdesk, Front, Contentful, Box, Dropbox, S3, and others. A universal connector accepts a REST `GET` endpoint returning JSON, API-key authentication, field mappings, pagination, and a full refresh every 24 hours. [S18]
- Up to **50 external content sources** can be connected. A Knowledge admin configures connections and syncs; updates are ingested on the next sync. [S18]
- The universal connector uses the permissions of the configured API credential; source-specific per-user or per-record permissions are not preserved or enforced in Zendesk. This is a significant enterprise knowledge-governance caveat. [S18]
- The external-content article says external content is available on all plans but notes plan-dependent storage limits; its eligibility header lists Knowledge Professional or Enterprise for Support. The product page and pricing page also package knowledge differently by Suite tier. Packaging should therefore be validated for the exact account. [S1, S7, S18]

### 6. Routing

- Omnichannel routing covers email (including web form/API/side conversations), messaging, and calls. It assigns work using queue, group/brand eligibility, unified agent status, channel capacity, assignment method (spare capacity or round robin), skills, and ticket priority/SLA ordering. [S19]
- Team and Growth provide basic capacity/status routing; Growth and above can prioritize soonest SLA breach; Professional and above add priority/skills-based ordering, custom queues, fallback groups, custom unified statuses, and richer reassignment controls. [S19]
- Agent Workspace must be active. Messaging must be active for omnichannel routing with live chat, and Talk Lite is not supported. Only new/open tickets are routed; AI-agent tickets wait until escalation; light agents cannot be assigned work. [S19]
- Capacity rules limit automatic assignment but do not prevent agents from self-assigning above the limit. Messaging can be reassigned after an offer timeout; calls can be re-offered after decline/no-answer until the queue timeout. Skills can be required indefinitely or can time out/overflow to other agents. [S19]
- Zendesk also supports manual assignment, round robin, Play mode, standalone skills-based routing, views, triggers, automations, macros, and intelligent triage. [S20]

### 7. Reporting and analytics

- Explore includes prebuilt dashboards covering tickets, efficiency, assignee activity, agent updates, unsolved tickets, backlog, satisfaction, SLAs, and group SLAs. It supports filters, cloned/custom dashboards, custom reports, scheduled sharing, and product datasets. [S21, S22]
- Explore separates Editor, Admin, and Viewer roles. Activation prepares Zendesk data for reporting and may take minutes to hours; dashboard refresh is scheduled rather than necessarily real-time. [S22]
- Zendesk's newer Agentic Analytics page adds natural-language questions, cited answers, root-cause/deep-exploration views, live monitoring, anomaly/proactive alerts, cross-human/AI service signals, connected business data, and Bridge-based access from other AI tools. Public pricing is sales-directed. [S6 and official analytics page: https://www.zendesk.com/in/service/analytics/]
- Action Builder traces and Explore reporting provide two distinct observability layers: per-run workflow execution evidence and aggregate service/agent/ticket performance. [S16, S21]

### 8. Security, privacy, and enterprise controls

- The Trust Centre lists SOC 2 Type II, ISO 27001:2022, ISO 27017, ISO 27018, ISO 27701, ISO 42001, FedRAMP LI-SaaS, Cyber Essentials Plus, CSA STAR AI Levels 1 and 2, and industry programs including PCI-DSS, HIPAA, and HDS. [S23]
- Zendesk documents TLS 1.2+ in transit, AES-256 at rest in AWS, 24/7 security monitoring, network segmentation, third-party penetration tests, vulnerability scanning, MFA for production access, SAML/JWT SSO options, configurable password policy, 2FA, IP restrictions, private attachments, redaction, and device tracking. [S23]
- RBAC includes owner/admin/agent/end-user roles; custom roles are an Enterprise capability. Enterprise and Enterprise Plus provide audit logs; the audit log records account/settings, users, apps, business rules, ticket settings, organizations, custom objects, task lists, and action flows. It is retained indefinitely, filterable, and exportable as CSV. [S23, S25]
- Advanced Data Privacy and Protection adds BYOK encryption, custom retention, data masking, PII redaction, and access logs. Standard deletion schedules and redaction are available more broadly. [S23, S24]
- AI Trust commitments include customer control over AI features and training choices, zero data retention for third-party LLM processing beyond the time needed to answer, no customer-data training for third-party LLM integrations, RAG grounding in customer materials, transparency that identifies AI agents to end users, and confidence/quality signals. Zendesk's own proprietary-model terms are more nuanced: customers can instruct use of data for model training, subject to stated controls. [S24]
- Regional hosting is conditional. Zendesk lists AWS regions in the US, EEA, UK, Japan, and Australia, but contractual locality commitments require the Data Centre Location Add-on or an entitled Suite plan. Secondary-data and product exceptions apply; WFM/QA may use GCP. Existing Messaging accounts created before 2023-04-17 cannot currently be transferred to another supported region, and existing AI-agent accounts created before 2026-03-10 have narrower locality/transfer support. Forethought AI Agents are excluded from the regional policy. [S26]

### 9. Marketplace and integration surface

- Zendesk's official navigation advertises a Marketplace with **1,800+ apps, partners, and integrations**; the Platform page links to Marketplace and the Service FAQ says thousands of prebuilt apps/integrations are available, with APIs for custom extensions. This is a vendor-reported ecosystem count, not an independently audited inventory. [S2, S6]
- The integration surface is layered: Marketplace apps for packaged integrations; APIs/webhooks/app framework/SDKs for custom applications; Action Builder connectors and custom actions for governed workflows; knowledge connectors for read-oriented content; and MCP connections for discovered tools. [S6, S15, S18]
- The breadth reduces the need to replace a company's existing stack, but each connector has its own auth model, scopes, data residency, rate limits, and attribution behavior. Action Builder's service-account recommendation is especially relevant for high-impact writes. [S15]

### 10. Migration friction

**Legacy Chat -> Messaging/Omnichannel**

- Omnichannel routing is not supported for Chat-only accounts: Agent Workspace, Messaging, and at least one web/mobile messaging channel must be activated. When enabled, existing Chat routing settings are hidden and no longer work; statuses move to unified agent statuses; operating hours no longer automatically change status; Chat skills must be recreated as ticket skills and applied through triggers; hybrid assignment is unsupported. [S28]
- Reporting semantics change: offered chats can appear as incoming, the old Team > View all report becomes empty, Chat acceptance-rate data has no equivalent, some visitor filters disappear, and engagement duration is calculated differently. Teams must record old settings and remap them before activation. [S28]
- Messaging is generally the strategic path for persistent conversations, AI agents, social channels, and omnichannel routing, but the migration is not a transparent toggle. [S27, S28]

**Knowledge and data migration**

- Connectors can reduce manual copying by syncing external knowledge, but the universal connector requires a compatible REST API and its source ACLs are not preserved. A customer may need to redesign permissions rather than simply import content. [S18]
- Data-locality migration is not universally reversible: old Messaging and AI-agent accounts may require deletion/recreation or may not support transfers between regions. [S26]

**Custom apps and workflows**

- App Builder supports AI-generated apps with previews, code editing, testing, and versions, but apps cannot move between environments, cannot change location after creation, cannot import an existing app for editing, and must be recreated for another environment/location. Deleting the App Builder conversation prevents later edits to that app. [S29]
- Zendesk customer stories describe fast migrations (for example, a Freshdesk migration in about three weeks), but that is an anecdote rather than a general implementation guarantee. [S8]

## Vendor claims and claims requiring validation

The following are Zendesk's marketing or customer-story claims, not independently verified performance results:

- AI agents can resolve **up to 80%** of complex issues/interactions, and the Resolution Learning Loop can automate 80%+ of interactions. [S1, S4, S6]
- AI agents support **80+ languages** and can reason, adapt, act, and self-improve. The underlying feature set is documented, but the resolution-rate and quality outcomes depend on data, procedures, channel, and implementation. [S1, S4]
- Customer-story metrics include 66–80% automation, 99% reduction in repetitive emails, 50% resolution-rate improvement, and other savings/productivity figures. These are selected customer examples and should not be treated as a benchmark. [S4, S5, S7]
- The Service page says more than 100,000 customer and employee experiences are powered by Zendesk; the Platform/Service pages advertise 1,800+ Marketplace partners and the pricing page calls Zendesk the “#1 AI customer service solution.” [S1, S2, S6]
- Pricing-page and customer-story ROI figures are illustrative or customer-specific. Zendesk explicitly says its AI ROI calculator does not guarantee financial outcomes. [S1, S4]

## Inference for MakeEase

1. **The workspace is a defensible product surface.** Zendesk wins by making channel changes, customer context, knowledge, routing, collaboration, and actions visible in one place. MakeEase should treat an interaction timeline plus execution context as the primary object, not as separate “chat,” “ticket,” and “automation” screens.
2. **Outcome billing creates a trust problem as well as a pricing opportunity.** A resolution ledger must show why an interaction was classified as assisted, contained, verified, escalated, or failed; when the decision was made; what evidence was used; and what spend/allowance it consumed. A customer should be able to set a hard stop before an overage rather than discover usage on an invoice.
3. **Action governance is an enterprise wedge.** Zendesk has strong building blocks (scopes, service-account guidance, approval triggers, credits, traces, and audit logs), but the model is spread across plan gates and connector-specific behavior. MakeEase can differentiate with one policy layer for read/write scope, human approval, environment, data sensitivity, idempotency, retries, budgets, and rollback.
4. **Knowledge permission fidelity matters more than connector count.** A 50-source connector limit and broad ecosystem are less valuable if an ingestion credential collapses source ACLs. MakeEase should preserve source authorization and show citations/freshness/deletion status at answer time.
5. **Migration is a product feature.** Zendesk's Chat-to-Messaging conversion illustrates that routing, status, skill, reporting, and API semantics can all change at once. MakeEase should import mappings, run a compatibility report, provide a dual-run/shadow period, and make rollback/export straightforward.
6. **Marketplace breadth is useful but not sufficient.** MakeEase should prioritize a smaller, high-quality catalog with explicit capabilities, scopes, data handling, health, versioning, and test fixtures over a raw app count. A governed connector can be used by a human, an automation, or an AI agent without changing its permission contract.

## MakeEase acceptance criteria

1. **Unified, context-preserving workspace:** Given a conversation that starts in email, messaging, voice, or a connected channel, an operator can view the complete timeline, customer/context records, source citations, routing state, approvals, and action results in one workspace; an AI-to-human handoff preserves the transcript, collected fields, attempted steps, and reason for escalation.
2. **Transparent AI-resolution ledger and spend controls:** Every AI interaction is classified with an explicit outcome state (including assisted escalation, contained, verified, escalated, failed, or human-resolved), evidence and timestamp; the account shows allowance/usage/cost by workspace, agent, channel, and workflow; admins can set warning thresholds and a hard stop that prevents billable AI execution or routes to humans.
3. **Governed, observable action execution:** Every connector/action declares read/write scopes, data sensitivity, identity/service account, environment, version, rate limit, idempotency key, and approval requirement; high-impact writes can require human approval; each run has a replayable step trace, input/output redaction, retries, failure notification, rollback/compensation metadata, and immutable audit history.
4. **Permission-preserving knowledge fabric:** MakeEase can sync at least one local source plus REST/Confluence/Drive-style sources, preserves source ACLs (or visibly blocks content when ACL fidelity is unavailable), displays citation, freshness, sync/error, and deletion status, and supports redaction/retention controls that propagate to retrieval indexes and conversation evidence.
5. **Migration-safe routing, reporting, and enterprise control plane:** An administrator can import channel/routing/skill/SLA mappings, run a compatibility report and shadow mode before cutover, then route by status, capacity, priority, SLA, and skills; dashboards cover volume, backlog, response/resolution time, CSAT, automation outcomes, action failures, and spend; RBAC, SSO/MFA, data-region policy, export, and indefinite/tenant-configurable audit retention are testable in the same product.
