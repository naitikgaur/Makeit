# Microsoft Power Automate and Copilot Studio

**Research date:** 2026-10-16  
**Scope:** Microsoft Power Automate (cloud/DPA, desktop/RPA, approvals, process/bot capacity, environments, connectors and governance) and Microsoft Copilot Studio (AI agents, agent flows, licensing, credits, quotas and governance).

This review uses Microsoft-owned pricing and Microsoft Learn documentation. “Verified” means the statement is present in the cited Microsoft source. “Vendor claim” means Microsoft marketing or a customer-story assertion that is not independently validated here. “Inference” is analysis from the verified material, not a Microsoft promise.

## Executive assessment

Power Automate is a broad enterprise automation platform with unusually strong Microsoft 365, Dynamics 365, Dataverse, Entra ID, Teams, SharePoint, Excel and Azure adjacency. It covers deterministic cloud workflows, approvals, process mining, AI Builder, Windows desktop RPA, unattended bots and hosted RPA. Copilot Studio extends the same Power Platform environment/connector/DLP model into conversational and autonomous agents.

The main competitive weakness for MakeEase is not missing capability. It is the number of billing and governance dimensions a customer must understand: user versus capacity licensing; standard, premium and custom connectors; per-user versus per-flow/bot entitlements; attended versus unattended versus hosted RPA; Dataverse storage; Power Platform request/action limits; Copilot Studio tenant and maker licenses; prepaid Copilot Credits versus Azure-backed pay-as-you-go; environments, managed environments and environment groups; plus connector-specific limits. Microsoft offers powerful controls, but they are distributed across several portals and are often activated only after an administrator understands the dependency chain.

**Opportunity for MakeEase:** make the policy, entitlement, capacity, data movement and approval consequences visible in one workspace before a workflow or agent is published. A small organization should not need a licensing specialist to know who can run an automation, what it costs, what data can cross a connector boundary, or what happens when a limit is reached.

## 1. Pricing and licensing

### Power Automate public list prices

The US Power Automate pricing page currently lists annual-paid prices as follows. Microsoft warns that displayed prices are marketing prices and can vary by currency, country, organization and checkout terms; enterprise pricing may require a Microsoft representative.

| Plan | Public list price | Meter | Main included capability documented by Microsoft |
|---|---:|---|---|
| Free trial | Free | Trial | 30-day trial; standard connectors and UI-based cloud flows on the pricing page |
| Power Automate Premium | **$15/user/month** | User | Cloud flows; attended desktop flows; process/task mining; 50 MB process-mining storage; 250 MB Dataverse database and 2 GB file capacity |
| Power Automate Process | **$150/bot/month** | Capacity/bot | Cloud flows; unattended desktop flows; 50 MB Dataverse database and 200 MB file capacity |
| Power Automate Hosted Process | **$215/bot/month** | Capacity/bot | Unattended RPA plus a Microsoft-hosted Azure VM; 50 MB Dataverse database and 200 MB file capacity |
| Process Mining add-on | **$5,000/tenant/month** | Tenant add-on | 100 GB process-mining data; 2 GB Dataverse database and 1 TB file capacity; available with Premium |

**Verified sources:** [Power Automate pricing](https://www.microsoft.com/en-us/power-platform/products/power-automate/pricing) and [Types of Power Automate licenses](https://learn.microsoft.com/en-us/power-platform/admin/power-automate-licensing/types).

The pricing page says Premium includes attended RPA, while Process/Hosted Process provide unattended RPA. A Process bot assigned to a machine can execute one unattended desktop-flow run at a time; Microsoft says concurrent runs require additional bots. A Hosted Process license supports one hosted bot. These are capacity semantics, not simply “number of automations.”

### Licensing model and why it is complex

Microsoft explicitly supports both **user** and **capacity** licensing:

* A Premium user license gives the user broad authoring and execution rights, including standard/premium/custom connectors, attended RPA and process mining, within service limits.
* A Process license can be assigned to a cloud flow or standard machine. It provides higher request capacity for the flow and one unattended bot when allocated to a machine. A Process license can be stacked on a flow, or one license can be shared across a flow group of up to 25 solution-aware flows.
* A Hosted Process license applies to hosted machines/groups and is described as a superset of Process, although the licensing documentation notes that some superset behavior is still being made available.
* Capacity licenses do not replace every user license. Microsoft says authoring, monitoring and machine registration still require a suitably licensed user; an unattended machine must first be registered by a Premium user.
* The licensing documentation lists 40,000 daily Power Platform requests for Premium and 250,000 per day per Process/Hosted Process license, while the limits documentation notes transition-period enforcement and connector-specific limits.
* A Free license supports cloud flows with standard connectors without sharing and local attended desktop flows. Premium/trial access is required to run flows using custom connectors; Microsoft says custom connectors are limited to 50 per user and 500 requests/minute per connection.

There is a public-duration ambiguity worth surfacing to a buyer: the pricing page advertises a **30-day** free trial, while the licensing documentation describes a Power Automate Trial license as a **90-day** user trial. These may refer to different trial experiences/SKUs, but the public pages do not make that distinction obvious.

Copilot Studio adds a second licensing system:

* The current Copilot pricing page lists **Microsoft 365 Copilot at $30/user/month paid yearly**, including Copilot Chat and the Standard harness for internal agents, subject to a qualifying Microsoft 365 plan.
* Standalone Copilot Studio is offered as a tenant-wide **pre-purchase plan** or **pay-as-you-go**. Microsoft describes prepaid units as **25,000 Copilot Credits for $200/month** and says prepaid purchase can save up to 20%; an Azure subscription is required for agents. PAYG requires linking an Azure subscription to an environment, but the reviewed public page does not show one consolidated, region-neutral dollar rate for every credit-consuming feature.
* Copilot Studio documentation requires a **per-user maker license** plus a **tenant license**. Users of a published agent do not need a special Copilot Studio license, but guest users cannot access Copilot Studio. A standalone subscription enables external channels and premium connectors; the Teams plan in selected Microsoft 365 subscriptions is narrower (classic orchestration, Teams publication and Dataverse for Teams).
* Credits are pooled at the tenant level and can be allocated to environments. Microsoft publishes feature-specific rates: classic answer 1 credit; generative answer 2; agent action 5; tenant-graph grounding 10; agent-flow actions 13 per 100 actions; content processing 8 per page; and separate AI-tool and voice rates. The cost of one interaction depends on the agent design, model/tool use, grounding and traffic.

**Inference:** “$15 per user” and “$200 per credit pack” are not comparable units. A customer planning one unattended process, one shared workflow, an employee-facing agent and a public website agent may need four different entitlement decisions before any implementation estimate is credible.

**Verified sources:** [Copilot Studio plans and pricing](https://www.microsoft.com/en-us/copilot/pricing/copilot-studio), [Assign user licenses and manage access](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing), [Get access to Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-subscriptions), and [Billing rates and management](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management).

## 2. Connectors and Microsoft ecosystem

Microsoft describes connectors as typed representations of APIs, with prebuilt and custom connector categories. The connector overview says they work across Copilot Studio, Power Automate, Power Apps and Azure Logic Apps. Examples include Salesforce, Office 365, Twitter/X, Dropbox and Google services. The Power Automate marketing page claims **more than 1,400** prebuilt certified connectors; the current Copilot Studio marketing page claims **1,500+ pre-built data connectors**. The discrepancy is likely product-page scope or catalog timing, so MakeEase should not quote one number as a stable technical limit.

Connector classes matter operationally:

* Standard connectors are available to licenses with standard rights; Microsoft 365 and some Dynamics 365 licenses can include limited Power Automate rights.
* Premium connectors and custom connectors require an appropriate Premium/trial or capacity entitlement.
* Custom connectors let makers wrap an API that does not have a prebuilt connector, but they introduce API authentication, ownership, throttling and governance decisions.
* Copilot Studio can use connectors as agent tools. Its DLP model also governs many Copilot-specific virtual connectors, HTTP, knowledge sources, channels, event triggers, Azure Bot Service skills and MCP-related connector usage.
* On-premises systems are reachable through the on-premises data gateway rather than an on-premises Power Automate service.

**Ecosystem strength (inference):** A Microsoft 365/Dynamics customer can use identity, files, mail, calendars, Teams, SharePoint, Dataverse, Power BI, Azure and business data with familiar accounts and admin boundaries. The advantage compounds when the organization already pays for Microsoft 365 and has Entra, Purview and Power Platform administrators.

**Ecosystem cost (inference):** The breadth also increases choice and failure modes. “Connector available” does not tell a maker whether it is standard or premium, whether the tenant DLP policy permits it, whose credential it uses, which environment contains the connection, or which connector-specific throttle applies.

**Verified sources:** [Connectors overview](https://learn.microsoft.com/en-us/connectors/overview), [Power Automate product page](https://www.microsoft.com/en-us/power-platform/products/power-automate), and [Power Automate licensing entitlements](https://learn.microsoft.com/en-us/power-platform/admin/power-automate-licensing/types#connector-types).

## 3. Governance, environments and security

### Environments and lifecycle

Microsoft defines an environment as a container for business data, apps, chatbots and flows. Each environment belongs to a Microsoft Entra tenant and a macro-region; resources and connections are bound to that environment. Apps cannot directly use data sources in another environment. Environment roles include Environment Admin and Environment Maker, and users/groups assigned those roles still need separate Dataverse permissions where applicable.

The documented environment types include Production, Default, Sandbox, Trial, Developer and Dataverse for Teams. The Default environment is shared, gives licensed users maker access, has limited control and should not be used for production workloads. Trial environments expire after 30 days. This creates a practical dev/test/prod lifecycle, but it also makes “where is my flow?” and “which policy applies?” central UX questions.

Managed environments unlock a large set of controls, including environment groups, sharing limits, usage insights, data policies, pipelines, solution checker, IP firewall, cookie binding, customer-managed keys, Lockbox, extended backup, desktop-flow DLP and Application Insights export. Microsoft says managed environments are included as an entitlement with standalone Power Automate, Copilot Studio and other qualifying licenses, but not the Developer Plan when users run their assets.

Environment groups are a scale-control layer: only managed environments can join; each environment belongs to one group; groups cannot overlap or nest; and published group rules lock corresponding local settings. The documentation says per-environment exceptions are not currently supported. This is strong central governance, but a mistake in a group rule can affect every member environment.

### DLP and data movement

Power Platform data policies classify connectors into **Business**, **Non-business** and **Blocked** groups. Connectors in different groups cannot share data; blocked connectors cannot be used where the policy applies. Administrators can scope policies tenant-wide or to selected/excluded environments. Tenant-level policies cannot be overridden by environment-level policies.

The data-policy lifecycle is important: policy configuration cascades to environments; resources are evaluated; violations can suspend or quarantine apps/flows/chatbots; connections can be disabled; and runtime calls using blocked connections/actions/MCP servers fail. Microsoft says most changes take effect within an hour, with extreme cases up to 24 hours. Some connectors are not blockable and default to Non-business. Advanced Connector Policies do not support virtual connectors, with some governance capabilities in transition.

Copilot Studio adds controls to require Microsoft Entra authentication, block local/SharePoint/OneDrive/public knowledge sources, prevent Power Platform connectors as agent tools, block HTTP or particular endpoints, block Bot Service skills, restrict publishing channels and block event triggers. Microsoft states Copilot Studio DLP enforcement is real time and that agents previously exempted from enforcement are now subject to it.

### Security and credentials

Microsoft’s security overview documents tenant/environment administrators, security recommendations, auditing, IP firewall, tenant isolation, environment security groups, guest access, Customer Lockbox, Azure Virtual Network, data policies and compliance controls. The “security score” is marked preview, updates every 24 hours and is a directional posture measure rather than a real-time control plane.

Connections are saved credentials stored in the environment. Microsoft distinguishes explicit authentication (the end user’s credentials) from implicit authentication (the maker’s saved connection) and recommends explicit authentication where possible. Source-system permissions still determine what a user can read or edit; a Power Apps or flow UI does not itself revoke a user’s underlying SharePoint/database rights.

**Inference:** Microsoft supplies enterprise-grade control primitives, but they are split between Power Automate, Power Platform admin center, Microsoft 365 admin center, Entra, Dataverse, Azure billing and Purview. MakeEase can differentiate by presenting a single, plain-language “what this automation can do, where it can send data, who pays, and who can approve” view while retaining an exportable policy record.

**Verified sources:** [Environments overview](https://learn.microsoft.com/en-us/power-platform/admin/environments-overview), [Managed environments overview](https://learn.microsoft.com/en-us/power-platform/admin/managed-environment-overview), [Environment groups](https://learn.microsoft.com/en-us/power-platform/admin/environment-groups), [Data policies overview](https://learn.microsoft.com/en-us/power-platform/admin/wp-data-loss-prevention), [Manage data policies](https://learn.microsoft.com/en-us/power-platform/admin/prevent-data-loss), [Copilot Studio data policies](https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-data-loss-prevention), [Security overview](https://learn.microsoft.com/en-us/power-platform/admin/security/security-overview), and [Connecting/authenticating to data sources](https://learn.microsoft.com/en-us/power-platform/admin/security/connect-data-sources).

## 4. Approvals and human-in-the-loop UX

Approvals are a standard connector. Microsoft documents a “Start and wait for an approval” action supporting:

* Approve/Reject where everyone must approve;
* Approve/Reject where the first response completes the request;
* custom responses waiting for all or one response; and
* sequential approval.

Approvers can respond from email, Microsoft Teams adaptive cards, the Power Automate action center or the mobile app. Requests can target tenant users, guests and Microsoft 365 groups subject to Entra/Dataverse conditions. In a non-default environment, the first approval flow can automatically provision Dataverse and requires an environment administrator for that first provisioning.

The documented cloud-flow run duration is 30 days, including pending approval steps. Microsoft recommends a two-flow pattern with Dataverse for approvals that may outlive 30 days: one flow creates the approval and another reacts to the response. This is capable but a notable hidden lifecycle decision for a business user.

**UX assessment (inference):** The approval recipient experience is excellent when the organization already lives in Outlook/Teams. The maker experience is more technical: an approval is a flow action, Dataverse storage may be provisioned, and long-running or escalation behavior requires architecture rather than a simple form setting.

**Verified sources:** [Get started with Power Automate approvals](https://learn.microsoft.com/en-us/power-automate/get-started-approvals) and [Create and test an approval workflow](https://learn.microsoft.com/en-us/power-automate/modern-approvals).

## 5. Desktop/RPA and hosted process model

Power Automate for desktop uses drag-and-drop actions and recording. Microsoft documents automation of Windows applications, browsers, Excel, files, modern and legacy applications, terminal emulators and UI elements/images/coordinates. The desktop app supports Windows 10 and 11. A desktop flow can therefore bridge systems without an API or connector, including legacy ERP or terminal work.

The entitlement boundary is explicit:

* Premium/trial user licenses provide attended RPA on a registered workstation.
* Process capacity provides unattended RPA on a standard physical/virtual machine; one bot runs one unattended desktop-flow execution at a time.
* Hosted Process provides unattended RPA on a Microsoft-hosted Azure VM and can use hosted machine groups for scaling.

Unattended execution securely signs into the machine on the user’s behalf, runs the flow and signs out. Administrators must also account for machine registration, Windows sessions, desktop-flow endpoints and service-bus namespace allowlists. Microsoft’s docs list extensive endpoints and say the list can evolve.

**Strength:** RPA covers systems that lack APIs, and hosted bots reduce physical-machine management.  
**Tradeoff (inference):** RPA adds machine state, UI selector fragility, credentials, Windows-session concurrency and endpoint/network operations to the governance surface. MakeEase should show those operational dependencies before a user chooses “desktop automation.”

**Verified sources:** [Introduction to desktop flows](https://learn.microsoft.com/en-us/power-automate/desktop-flows/introduction), [Power Automate pricing](https://www.microsoft.com/en-us/power-platform/products/power-automate/pricing), [Power Automate license types](https://learn.microsoft.com/en-us/power-platform/admin/power-automate-licensing/types#robotic-process-automation), and [Add-ons/hosted and unattended RPA](https://learn.microsoft.com/en-us/power-platform/admin/power-automate-licensing/add-ons).

## 6. AI-agent capabilities and limits

Copilot Studio is positioned by Microsoft as a no-code platform for custom agents, workflows and apps. The product page lists natural-language/graphical authoring, conversational and voice agents, autonomous capabilities, multi-agent systems, connector/MCP integration, evaluation, publishing to internal and external channels, ALM/deployment governance, analytics and Microsoft security/compliance integrations.

The official Copilot Studio docs make the plan boundary concrete. A standalone subscription can use generative orchestration, premium connectors, any supported environment/channel, create/edit with Copilot, Azure Bot Service skills and live handoff. The Teams plan is limited to classic orchestration, Teams publication, Dataverse for Teams and flows used in topics.

Selected documented limits include:

* 8,000 messages/minute to one paid agent per Dataverse environment.
* Generative-AI quotas vary by prepaid pack count: 50 RPM/1,000 RPH for 1–10 packs, 80/1,600 for 11–50, 100/2,000 for 51–150, with incremental increases above that; trial/developer environments are 10 RPM/200 RPH and PAYG environments 100 RPM/2,000 RPH.
* Five-minute model-response streaming timeout.
* Per agent: up to 500 knowledge sources, 100 skills, 1,000 topics in Dataverse environments and 200 trigger phrases per topic.
* Connector payload 5 MB in public cloud (450 KB in GCC); file upload 512 MB and 500 files.
* Standard Copilot Studio subscription: 250,000 Power Platform requests per 24 hours; Teams plan: 6,000 per 24 hours.
* SharePoint, OneDrive, Dataverse and other knowledge sources have additional source-specific limits and synchronization delays.

Prepaid capacity enforcement is especially important for trust: Microsoft documents a 125% threshold at which custom agents are disabled after current conversations finish. Agent-flow enforcement is different: when prepaid capacity is exhausted, new agent-flow runs are blocked while the parent agent can continue handling non-flow interactions. PAYG avoids the prepaid enforcement behavior by billing the linked Azure subscription. Microsoft also documents monthly consumption limits for individual agents.

**Inference:** Agents make “cost per request” a design property, not just a deployment property. A generative answer, tenant-grounded answer, tool call, content-processing page and flow action can all consume different units. A transparent automation product should show the expected cost and limit impact alongside the agent graph, not bury it in an admin report.

**Verified sources:** [Copilot Studio quotas and limits](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-quotas), [Billing rates and management](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management), [Copilot Studio licensing/subscriptions](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-subscriptions), and [Copilot Studio plans/pricing](https://www.microsoft.com/en-us/copilot/pricing/copilot-studio).

## 7. General Power Automate limits that affect product UX

Microsoft’s limits page documents the following boundaries for cloud flows:

* 500 actions per workflow, eight levels of nesting, 250 variables, 600 flows owned by one user.
* 30-day maximum run duration and 30-day run-history retention.
* Minimum recurrence of 60 seconds and maximum recurrence of 500 days.
* A flow with persistent errors or throttling can be turned off after 14 days; a flow without trigger activity may be turned off after 90 days (with exceptions for Premium/capacity-licensed flows).
* Concurrency control is off by default; when enabled it supports 1–100 concurrent runs and a queue of 10 plus the configured parallelism. Apply-to-each supports 5,000 items on Low and 100,000 on other profiles; concurrency is 1–50.
* Power Platform request limits are profile/license dependent. The transition table lists approximately 10,000 requests/day for Low, 200,000 Medium, 500,000 High and 10,000,000 Unlimited Extended, plus 100,000 requests per five minutes during transition. Individual connectors can impose lower limits.
* Synchronous outbound/inbound calls have a 120-second timeout; a message is 100 MB, or up to 1 GB when chunking is supported.

These limits are not merely engineering trivia. They affect whether a workflow needs child flows, capacity licenses, queues, retries, a second Dataverse-backed approval flow or a different connector. Microsoft exposes much of this detail, but generally in documentation rather than at the moment a maker designs the process.

**Verified source:** [Limits of automated, scheduled and instant flows](https://learn.microsoft.com/en-us/power-automate/limits-and-config).

## 8. User experience and governance comparison

### Where Microsoft is strong

1. **Native work context:** Outlook, Teams, SharePoint, OneDrive, Excel, Dynamics, Dataverse, Power BI and Entra are first-class neighbors. Approval recipients can act in the tools they already use.
2. **Coverage:** Cloud DPA, desktop RPA, hosted bots, process mining, AI Builder, connectors, agent tools and custom APIs cover a very broad enterprise surface.
3. **Enterprise control plane:** Environments, solutions, managed environments, environment groups, DLP, security roles, gateways, auditing, pipelines and Purview integrations give administrators real control points.
4. **Multiple scaling choices:** Per-user, per-flow/bot, hosted capacity, flow groups, prepaid credits and PAYG can fit different workload shapes.
5. **AI transition path:** Copilot Studio can combine deterministic Power Automate flows with generative orchestration and agent actions.

### Where the experience is difficult (inference from verified requirements)

1. **Many portals:** A maker may encounter the Power Automate portal, Power Automate for desktop, Power Platform admin center, Microsoft 365 admin center, Copilot Studio, Entra, Azure billing and Dataverse.
2. **Entitlement opacity:** The same visible action can change from standard to premium, user to capacity, attended to unattended, or Power Automate request billing to Copilot Credit billing.
3. **Policy indirection:** A flow can save successfully in one environment and fail in another due to DLP, connector groups, endpoint filters, credential scope or environment-specific connections.
4. **Failure after success:** A flow may be suspended after 14 days of errors/throttling, lose its owner’s higher performance profile when the owner leaves, or be disabled by Copilot credit enforcement.
5. **Lifecycle burden:** Long approvals, desktop sessions, machine registration, hosted capacity, Dataverse provisioning and dev/test/prod promotion require architectural choices that are not obvious from a simple template.

## 9. Vendor claims versus verified facts

### Vendor claims/marketing (not independently verified here)

* Power Automate says it can automate across “nearly unlimited systems” and markets “built-in security, governance and 360-degree monitoring.”
* Microsoft’s Power Automate page says more than 1,400 prebuilt certified connectors; Copilot Studio says 1,500+ pre-built data connectors.
* Copilot Studio says 90% of the Fortune 500 has used it.
* Customer stories on Microsoft pages report large time/cost savings, for example Uber’s reported $30 million yearly savings and Nsure’s reported 60% time savings.
* Microsoft markets Copilot Studio as autonomous, multi-agent and enterprise-ready.

These are useful positioning signals, not independent evidence of connector coverage, savings, reliability, adoption or agent quality for a particular customer.

### Verified in reviewed official documentation

Prices and license scopes; standard/premium/custom connector distinctions; user/capacity licensing; approval types and channels; environment boundaries and roles; managed environment/environment-group behavior; DLP classifications and enforcement; connection authentication model; desktop RPA entitlement boundaries; Copilot Credit rates; agent and cloud-flow quotas; and documented timeout, retention, concurrency and request limits.

## 10. Material not established by the reviewed public sources

The following should not be presented to a MakeEase buyer as known facts without a tenant-specific quote, contract or technical validation:

* Negotiated enterprise discounts, volume pricing, regional taxes, reseller/partner implementation fees, and the final checkout price.
* A single universal Azure PAYG dollar price for every Copilot Credit scenario and every region/model combination.
* Which exact Microsoft 365/Dynamics entitlements a particular customer already owns, including seeded Power Automate or Copilot rights.
* Real-world success rates, UI-selector durability, bot recovery rates, connector availability in a specific sovereign/government cloud, or end-to-end latency.
* Connector-specific throttles for every service, practical Windows-session capacity for every machine shape, and workload-specific SLA behavior.
* An independent audit of Microsoft’s Fortune 500/adoption and customer-savings claims.
* A complete, tenant-neutral account of model selection, retention and training behavior for every Copilot Studio capability and bring-your-own-model configuration.

## 11. Five MakeEase acceptance criteria for simpler, transparent governance

1. **Pre-publish entitlement and cost explanation**  
   For every workflow/agent, MakeEase MUST show the required plan, connector class, user/capacity assignment, expected request/credit consumption, concurrency assumption and estimated cost before publish. A missing entitlement blocks publish with a plain-language fix; no rule may depend on an undocumented SKU name.

2. **One governance graph with inheritance and effective state**  
   An administrator MUST be able to see workspace/environment, workflow/agent, connector, credential, data classification, approval and runtime policy in one view. The UI MUST show inherited rules, exceptions, policy version, effective time and the exact reason a step is blocked or quarantined; a policy simulation/diff MUST be available before applying it.

3. **Safe defaults for data movement and agent autonomy**  
   New external/public, HTTP, custom, desktop and agent-tool capabilities MUST default to restricted. MakeEase MUST require explicit authentication and data classifications, show the source-to-destination path, and require an auditable approval for crossing a sensitive boundary or enabling autonomous/event-triggered execution.

4. **Visible limits with predictable degradation**  
   Runtime pages MUST show remaining requests/credits, per-connector throttles, queue/concurrency, retry policy, retention and suspension timers. Before execution, MakeEase MUST preflight capacity and explain the fallback: queue, pause, ask for capacity, retry, or require approval. A person leaving an organization MUST NOT silently downgrade a workflow without an owner/capacity warning and an explicit transfer path.

5. **Approval and audit lifecycle in the same product**  
   MakeEase MUST provide sequential/parallel/all-or-first approval templates, response channels, escalation, cancellation and long-running approval persistence without requiring a separate architecture lesson. Each run MUST produce an exportable immutable record of actor, policy version, connectors, credentials/classifications, input/output references, approval decisions, workflow version, limits and cost, with dev/test/prod promotion gates visible to makers and administrators.

## Official source index

* [Power Automate pricing](https://www.microsoft.com/en-us/power-platform/products/power-automate/pricing)
* [Power Automate product overview](https://www.microsoft.com/en-us/power-platform/products/power-automate)
* [Types of Power Automate licenses](https://learn.microsoft.com/en-us/power-platform/admin/power-automate-licensing/types)
* [Power Automate add-ons](https://learn.microsoft.com/en-us/power-platform/admin/power-automate-licensing/add-ons)
* [Power Automate limits](https://learn.microsoft.com/en-us/power-automate/limits-and-config)
* [Connectors overview](https://learn.microsoft.com/en-us/connectors/overview)
* [Power Automate approvals](https://learn.microsoft.com/en-us/power-automate/get-started-approvals)
* [Desktop flows introduction](https://learn.microsoft.com/en-us/power-automate/desktop-flows/introduction)
* [Environments overview](https://learn.microsoft.com/en-us/power-platform/admin/environments-overview)
* [Managed environments overview](https://learn.microsoft.com/en-us/power-platform/admin/managed-environment-overview)
* [Environment groups](https://learn.microsoft.com/en-us/power-platform/admin/environment-groups)
* [Data policies overview](https://learn.microsoft.com/en-us/power-platform/admin/wp-data-loss-prevention)
* [Manage data policies](https://learn.microsoft.com/en-us/power-platform/admin/prevent-data-loss)
* [Security overview](https://learn.microsoft.com/en-us/power-platform/admin/security/security-overview)
* [Connecting and authenticating to data sources](https://learn.microsoft.com/en-us/power-platform/admin/security/connect-data-sources)
* [Copilot Studio plans and pricing](https://www.microsoft.com/en-us/copilot/pricing/copilot-studio)
* [Copilot Studio licensing/subscriptions](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing-subscriptions)
* [Assign Copilot Studio licenses](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-licensing)
* [Copilot Studio billing rates and management](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-messages-management)
* [Copilot Studio quotas and limits](https://learn.microsoft.com/en-us/microsoft-copilot-studio/requirements-quotas)
* [Copilot Studio data policies](https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-data-loss-prevention)
