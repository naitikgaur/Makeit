# Zapier competitor brief

**Research date:** 2026-10-16  
**Scope:** Public Zapier pricing, product, Help Center, developer documentation, Trust Center, AI, and MCP pages that were accessible on the research date. Prices, counts, plan entitlements, and early-access features are time-sensitive.

## Executive assessment

Zapier's enduring advantage is a very low-friction path from a recognizable app to a working automation: choose a trigger, map fields into actions, test, and turn the workflow on. Its marketplace, templates, field mapping, managed authentication, and run history make the first useful automation feel safe even for a non-engineer. Zapier is also extending that model from classic Zaps into AI-assisted and agent-callable work: Copilot, Agents, MCP, Skills, Code Actions, and Next Gen Zaps.

The strategic weakness is not a lack of features. It is the complexity created by the feature portfolio. Classic Zaps, Next Gen Zaps, Agents, Chatbots, AI by Zapier, MCP, SDK, Tables, Forms, and the developer platform have different limits, billing units, maturity levels, and administrative surfaces. Task pricing is understandable at the single-step level but becomes difficult to forecast when AI tiers, MCP calls, code runtime, loops, replays, overages, and several products share or do not share the same quota. Governance and approval features are strongest at Enterprise pricing, while some of the most ambitious workflow features are still early access.

**MakeEase opportunity:** provide the same approachable builder and broad adapter strategy, but make execution policy, cost, approvals, evidence, and portability first-class in every plan. The product advantage should be a governed, observable cross-system automation layer rather than unsupported one-for-one feature parity.

## Evidence and confidence

- **Vendor-stated fact:** directly described in an official Zapier page or official documentation page, linked below.
- **Observed page state:** a count, price, plan label, or availability statement visible on the public page on the research date. These can change without notice.
- **Inference:** a product-strategy conclusion from those facts; it is not a claim that Zapier itself makes.

Zapier's pages use different integration/action counts. The public app directory currently says **10,294+ apps**; pricing and several product pages say **9,000+ apps**; MCP documentation says **9,000+ apps and 40,000+ actions**, while the MCP marketing page says **66,000+ triggers and actions** and another AI page says **30,000+ actions**. These are recorded as surface-specific vendor claims, not reconciled into one number.

I did not rely on inaccessible material. The generic `https://zapier.com/security` and `https://zapier.com/enterprise/security` URLs returned 404 when checked; security observations below come from the public Trust Center and MCP security documentation instead.

## Product and workflow builder

### What Zapier documents

1. A classic Zap has one trigger and one or more actions. Triggers detect new or updated data; actions create or update data. Zapier's integration model also supports search actions and search-or-create combinations.  
   Sources: [How Zapier works](https://docs.zapier.com/integrations/quickstart/how-zapier-works), [Actions](https://docs.zapier.com/integrations/build/action)

2. A trigger can be a polling trigger or a REST Hook. Polling is documented as running every 1–15 minutes depending on plan; REST Hooks push events near real time. Zapier automatically deduplicates polling-trigger data.  
   Source: [Triggers](https://docs.zapier.com/integrations/build/trigger)

3. The classic product exposes a visual editor plus filters, paths, scheduling/delay, formatter, looping, webhooks, drafts, tests, and field mapping. The pricing comparison lists a visual editor and custom test records on all listed plans; Filters & Paths, Formatter, global variables, webhooks, and multi-step workflows are paid-plan features. Looping is documented as an open beta and is unavailable on Free in the Help Center page checked.  
   Sources: [Product/features page](https://zapier.com/features), [Pricing comparison](https://zapier.com/pricing), [Loop actions](https://help.zapier.com/hc/en-us/articles/8496106701453-Loop-your-Zap-actions)

4. **Next Gen Zaps** are presented as early access. Zapier says users can build in the editor, code, or by asking Claude, ChatGPT, or Cursor; the early-access page highlights loops, steps after loops, unlimited paths, code editing, step-level observability/governance in Workflow Manager, classic-Zap import, and agentic detection/fixing of issues. The same page says early-access building and running is free on paid plans and that future pricing is intended to use the existing task model, with a fetch call as a new billable line item. These are vendor statements about an early-access product, not stable general-availability commitments.  
   Source: [Next Gen Zaps / Workflow features](https://zapier.com/features)

5. Zapier offers two integration-builder paths: Platform UI, a visual form editor, and Platform CLI, a local JavaScript/TypeScript-oriented workflow with version control and automated tests. Zapier says both use the same underlying platform, but the CLI has advanced capabilities such as middleware, resources, files, hydration, npm modules, common functions, and long-running callbacks.  
   Source: [Platform UI vs Platform CLI](https://docs.zapier.com/integrations/quickstart/ui-vs-cli)

### Strategic reading

- **Vendor claim:** the editor is intuitive and visual, and Next Gen Zaps aim to let an agent build and manage workflows over time.  
- **Inference:** Zapier's strongest onboarding pattern is progressive disclosure: start with a familiar two-step recipe, then reveal branching, data transformation, loops, code, and AI only when needed. MakeEase should preserve that progression rather than beginning with a blank graph or an agent that hides the execution plan.
- **Inference:** the distinction between a trigger, a lookup/search, and a side-effecting action is a useful mental model. MakeEase can improve it by showing side-effect risk and cost before a user publishes.

## Triggers, actions, integrations, and developer reach

### Verified capability surface

- The public directory lists **10,294+ apps** and categories including Sales & CRM, Marketing, Communication, Productivity, Support, and AI. Popular examples include Gmail, Google Sheets, Slack, Calendar, Drive, HubSpot, Salesforce, Notion, Stripe, and GitHub.  
  Source: [App directory](https://zapier.com/apps)
- Zapier's developer model asks integration builders to define authentication, triggers, actions, input/output fields, and often search actions. It supports OAuth, API keys, basic/session/digest authentication, dynamic fields, line items, hydration, deduplication, error handling, and test data.  
  Sources: [How integrations work](https://docs.zapier.com/integrations/quickstart/how-zapier-works), [Integration documentation index](https://docs.zapier.com/llms.txt)
- The Platform UI supports a visual form-based build; the CLI supports code, tests, and local version-control workflows. Zapier's docs say a UI-built integration can be exported to CLI, but CLI-to-UI is not a direct export: a new UI version may require existing users to update workflows manually.  
  Source: [Platform UI vs Platform CLI](https://docs.zapier.com/integrations/quickstart/ui-vs-cli)
- Zapier also exposes a Powered by Zapier surface for embedded editors, action runs, templates, app authentication, and workflow APIs. This is evidence that Zapier sells not only end-user automation but also infrastructure for third-party products.  
  Source: [Developer documentation index](https://docs.zapier.com/llms.txt)

### Strength and limitation

- **Strength:** breadth converts integration work into a marketplace/search problem for most users. Managed OAuth, token refresh, retries, dynamic fields, and standardized test steps reduce setup friction.
- **Weakness/opportunity:** breadth can make app/action discovery noisy, and Zapier's abstractions remain platform-specific. A customer migrating a workflow must usually map trigger semantics, field IDs, search behavior, pagination, line items, auth, retries, and rate-limit behavior—not just copy a diagram.
- **MakeEase direction:** use a capability catalog with human-readable contracts: event latency, side effects, required scopes, idempotency behavior, data residency, expected cost, and sample payloads should appear before selection. Support HTTP/MCP/custom adapters as escape hatches, but keep the contract visible and testable.

## Pricing and task metering

### Publicly documented mechanics

Zapier's pricing model combines a plan level with a monthly task tier for self-serve users. The checked pricing page lists Free with **100 tasks/month**, Professional starting at **750 tasks/month** at **$19.99/month annual equivalent** or **$29.99 monthly**, and Team beginning at **2,000 tasks/month** at **$69/month annual equivalent** or **$103.50 monthly**. Exact prices and eligibility vary by tier and billing interval; Enterprise is custom.  
Source: [Pricing](https://zapier.com/pricing)

- A task is generally a **successful action**. Triggers, polling, filters, paths, halted/errored steps, and several built-in tools such as Formatter, Delay, Looping, Digest, Storage, Tables, and Forms do not consume tasks under the Help Center rules.
- Standard successful action steps generally use one task. AI by Zapier uses model-tier-dependent rates; Code by Zapier uses one task at standard runtime and can consume more with extended runtime; successful Zapier MCP tool calls use **two tasks**; Lead Router successful routing is documented as five tasks.
- A single account-level pool is shared by Zaps and programmatic usage such as MCP/SDK. Agents use a separate activity quota, and Chatbots use their own feature/seat-style limits. The pricing page says pay-per-task can keep eligible usage running after the plan allowance, subject to overage pricing and a cap; with pay-per-task off, runs are held until reset/upgrade/enablement.
- Tests are not universally free: the MCP usage documentation explicitly says successful test tool calls count toward task usage. Zap history documents that only successful action work counts, but replaying previously successful steps can create new billable tasks.
- On the checked Help Center page, Zap history guarantees at most **60 days** of run data and displays up to **10,000 runs**. Enterprise usage alerts can evaluate task usage every 15 minutes and notify admins when an hourly threshold is exceeded.

Sources: [How task usage is measured](https://help.zapier.com/hc/en-us/articles/8496196837261-How-is-task-usage-measured-in-Zapier), [MCP usage and billing](https://docs.zapier.com/mcp/overview/usage), [Zap history](https://help.zapier.com/hc/en-us/articles/8496291148685-View-and-manage-your-Zap-history), [Enterprise usage alerts](https://help.zapier.com/hc/en-us/articles/45955900008973-Set-up-usage-alerts-in-your-Enterprise-account), [Pricing rates](https://zapier.com/pricing/rates)

### Vendor claim versus inference

- **Vendor-stated:** charging only for successful side-effecting work, excluding many control-flow steps, and showing a shared task pool gives users a simple usage concept.
- **Inference:** the concept is simple for a two-step Zap but difficult to forecast for loops, replays, AI model tiers, code runtime, MCP tool calls, and product-specific quotas. A successful action can also be expensive operationally even when the UI shows one step.
- **Inference:** pay-per-task reduces surprise stoppage but can turn a runaway workflow into a billing incident. Flood protection, budget caps, and a clear preflight estimate are therefore a strategic differentiator for MakeEase.
- **Inference:** separate task, activity, and chatbot limits may force customers to learn several meters and admin pages. A unified cost-and-risk ledger would be easier to operate.

## AI, agents, and MCP

### Zapier's public AI surfaces

- **AI by Zapier:** embedded AI steps in Zaps for extraction, generation, and analysis; the pricing page lists it on Professional, Team, and Enterprise.
- **Copilot:** a beta assistant that drafts a Zap from chat in the editor or Canvas; the pricing page lists daily limits on Free and unlimited messages on paid plans.
- **AI troubleshooting, AI Custom Actions, and Formatter with AI:** editor features listed as beta or plan-gated in the public comparison.
- **Zapier Agents:** agents can use company knowledge, connected apps, web browsing/scraping, web search, and a Chrome extension, with a separate activity allowance. The pricing reference lists 400 free activities/month and 1,500 Pro activities/month, with paid runs capped at 40 activities per run and Free runs capped at 10. The Agents page emphasizes building, monitoring activity, chat, and web work.
- **Zapier MCP:** an MCP server for AI clients including Claude, ChatGPT, Cursor, and other compatible clients. Zapier says the client can discover available tools, use managed app connections, run actions, save workflows as Skills, and use Code Actions where a standard action does not fit. The docs say MCP uses Streamable HTTP, supports OAuth or connection-token authentication, dynamically discovers tools, and uses one server per named client.
- MCP restrictions include app/action controls, managed credentials outside the model, action history, and account/workspace governance. The public security page says MCP tool calls inherit account-level restrictions, while those restrictions cannot currently be set exclusively for MCP.

Sources: [AI overview](https://zapier.com/ai), [Agents](https://zapier.com/agents), [MCP product page](https://zapier.com/mcp), [MCP overview](https://docs.zapier.com/mcp/home), [MCP security and governance](https://docs.zapier.com/mcp/manage/security), [MCP usage](https://docs.zapier.com/mcp/overview/usage), [Pricing comparison](https://zapier.com/pricing)

### What to learn and what to challenge

- **Strong UX pattern:** an AI user can describe an outcome, let the system search a capability catalog, and then save a successful one-off process as a reusable Skill or persistent workflow. This meets users where they already are.
- **Strong safety pattern:** keep credentials in a managed connection layer rather than passing them to the model; expose app/action selection and a visible history.
- **Opportunity:** MakeEase should show the generated plan, exact tools, data crossings, permissions, cost estimate, and approval checkpoints before execution. “The agent chose the right tool” should be inspectable, not a black-box success claim.
- **Opportunity:** give deterministic workflow steps and agentic steps different visual semantics and policies. Zapier's Next Gen “Fluid Determinism” narrative is a useful direction, but its checked workflow page still describes the product as early access.
- **Migration friction:** an organization using AI by Zapier, Agents, and MCP may have three usage models and multiple saved artifacts. A MakeEase import should normalize these into one canonical run graph with explicit agent boundaries.

## Approvals, collaboration, and administration

### Publicly documented tiers

Zapier's checked pricing comparison lists:

- Free and Professional: one seat; personal workflows/connections.
- Team: up to 25 users, shared Zaps/workspaces, folders, shared app connections, SAML SSO, and priority support.
- Enterprise: unlimited users, SCIM, domain capture, super-admin and advanced permissions, app access controls, action restrictions, managed connections, domain restrictions, custom retention, workspaces, log streams, analytics, observability API, annual task limits, and BYOM.
- **Approval requests** are listed as beta and Enterprise-only in the comparison.

The MCP security documentation adds that users own their MCP servers; server access can be shared for review/management, but sharing server access does not let another person connect a client or run tools on the owner's behalf. App connections themselves cannot be shared in that MCP model. 

Sources: [Pricing comparison](https://zapier.com/pricing), [MCP security](https://docs.zapier.com/mcp/manage/security), [MCP server access](https://docs.zapier.com/mcp/manage/server-access)

### Strategic assessment

- **Strength:** the Team/Enterprise ladder maps recognizable IT controls to familiar collaboration primitives. Shared connections avoid asking teammates to share passwords or recreate auth.
- **Weakness:** approval and high-granularity governance arrive late in the plan ladder, and MCP server ownership creates a distinction between “can manage this server” and “can execute through it.” That distinction may be correct for security but is a discoverability burden.
- **MakeEase opportunity:** offer role-, environment-, action-, and data-classification policies from the start. A user should be able to require approval for a message, payment, deletion, external share, or AI-generated write without buying an enterprise-only add-on. Approvals should be durable, explain the exact pending side effect, expire safely, and leave an audit receipt.

## Observability, reliability, and change management

### What is verified

- Zap history supports filtering by date, Zap name, app, folder, owner, and status. A run view shows status for each step plus data received/sent and the version used. Failed runs can be replayed.
- Pricing lists drafts, autoreplay, customized error settings, flood-protection settings, and versions. Version retention shown in the comparison is one month for Professional, six months for Team, and one year for Enterprise. Enterprise adds compare versions, alerts, observability API, analytics, and log streams.
- The Next Gen page claims Workflow Manager will show every step and run and help identify/fix issues; this is tied to the early-access product surface.
- Zapier documents polling deduplication, REST Hook handshakes, and action error conventions for integration builders. These are important reliability affordances at the adapter layer.

Sources: [Zap history](https://help.zapier.com/hc/en-us/articles/8496291148685-View-and-manage-your-Zap-history), [Pricing comparison](https://zapier.com/pricing), [Triggers](https://docs.zapier.com/integrations/build/trigger), [Actions](https://docs.zapier.com/integrations/build/action), [Next Gen workflow page](https://zapier.com/features)

### Inference for MakeEase

Zapier has a good operational baseline for a small workflow, but the visible retention and version windows, plan gating, and separate MCP history suggest a customer may need several places to answer one incident: “what changed, what ran, what data crossed systems, what did it cost, and who approved it?” MakeEase can win by making one immutable run timeline the source of truth across workflow, agent, and tool calls. Include redacted payloads, policy decisions, retries, approvals, cost, and version in the same trace; allow retention/export to be configured per workspace.

## Security and trust posture

### Verified public disclosures

The public Zapier Trust Center displays SOC 2 Type II, SOC 3, GDPR, and CCPA badges. It links or lists a security whitepaper, SOC reports, penetration testing, subprocessors, data-flow documentation, a DPA, vulnerability reporting, data deletion on request, and a status page. The Trust Center says the latest posted SOC 2 Type II and SOC 3 reports cover June 1, 2025 through May 31, 2026; access to the SOC 2 report is described as NDA-gated, while the SOC 3 report is generally available.

The public MCP security page states:

- MCP is enabled by default for accounts, including Enterprise; account/workspace controls can be changed through Zapier's account-management process.
- Enterprise SAML SSO and SCIM apply to MCP access.
- App and action restrictions set at the account level are enforced for MCP but are not currently MCP-only restrictions.
- Customer data is stored in AWS US-East 1, and region-specific residency is not available unless otherwise agreed.
- Enterprise customers are opted out by default from AI model training under the cited AI terms.
- Data is logically segregated in a multi-tenant architecture; dedicated VPC and on-premises deployment are not available according to that page.
- MCP History and the account audit log record activity; Enterprise supports configurable data retention.
- Users cannot import arbitrary third-party tools into MCP; Zapier says this prevents tool poisoning, while private integrations can be built on its developer platform.

Sources: [Zapier Trust Center](https://trust.zapier.com/), [MCP security and governance](https://docs.zapier.com/mcp/manage/security), [Zapier subprocessors](https://zapier.com/legal/subprocessors), [Security/compliance Help Center entry](https://help.zapier.com/hc/en-us/articles/8496181993613-Security-and-Compliance)

### Strategic reading

- **Vendor claim:** the trust and governance layer travels across AI clients and app connections.
- **Inference:** this is a credible enterprise message because credentials, restrictions, SSO, audit, and retention are all placed above the model client. It also creates a high migration cost once a customer standardizes on managed connections and Zapier-specific policies.
- **Opportunity:** MakeEase should make region, retention, export, redaction, and policy evaluation visible during setup, not only in a security review. A smaller product can differentiate with portable evidence and deployment options only if it can actually support them; do not claim certifications or isolation that have not been obtained.

## Migration friction

The following are **inferences**, grounded in the cited product and developer documentation rather than claims that Zapier has made about lock-in:

1. **Workflow semantics:** a Zap's one-trigger/action-chain model, polling versus REST Hook behavior, deduplication, search-or-create conventions, and Zapier field identifiers do not map automatically to another engine's event, data, and retry model.
2. **Metering semantics:** a workflow port must account for successful-action billing, free control-flow steps, MCP's two-task calls, AI tier rates, code runtime, loops, and replay behavior. A visual copy can still change operating cost.
3. **Connection and permissions:** credentials, OAuth scopes, shared connections, managed domains, app/action restrictions, and MCP servers are configured in Zapier's account model. A portable workflow should never export secrets, but the destination must provide a guided re-auth and permission-diff process.
4. **Artifact fragmentation:** classic Zaps, Agents, Chatbots, Skills, MCP tool lists, and early-access Next Gen Zaps are not obviously one portable artifact. A customer may need to decide whether each item becomes a scheduled workflow, an interactive agent, a reusable tool, or a static prompt.
5. **Builder migration:** Zapier explicitly documents UI-to-CLI export but says CLI-to-UI is not direct and may require a new integration version and manual updates to existing workflows. This is developer-platform migration friction even before a customer changes automation vendors.
6. **Observability history:** Zapier's Help Center guarantees up to 60 days/10,000 runs in Zap history, while longer retention and richer analytics are plan-dependent. A migration needs an export of historical evidence, not merely the current workflow definition.

**MakeEase migration strategy:** define a versioned, provider-neutral workflow format with trigger contract, action contract, field mappings, retry/idempotency policy, approval policy, data classification, cost budget, and redacted connection references. Offer a Zapier-like guided importer that produces a mapping report with “mapped,” “needs re-auth,” “behavior differs,” and “unsupported” statuses. Never imply that a diagram alone preserves behavior.

## Strongest UX patterns to learn

1. **Start with intent, then expose structure.** Templates, app search, and Copilot turn “I want X when Y happens” into a draft while keeping steps visible for editing.
2. **Use a canonical step vocabulary.** Trigger, search, create/update, filter, path, transform, loop, delay, and webhook are easy to explain and compose.
3. **Test with representative records.** Custom test records, field previews, dynamic dropdowns, and step-level test results reduce the blank-canvas problem.
4. **Keep credentials out of prompts and code.** Managed connections and OAuth flows let users focus on the task while preserving a security boundary.
5. **Make the run the unit of learning.** Per-step status, input/output, replay, version, error explanation, and history turn an opaque failure into a repairable one.
6. **Progressively unlock power.** Free two-step Zaps, paid multi-step logic, then code/AI/enterprise governance create a comprehensible path from beginner to expert.
7. **Bridge one-off work to durable automation.** MCP's “do it now, save as a Skill, deploy as a Zap” story is a compelling lifecycle. MakeEase should preserve the user-approved plan and evidence across those transitions.

## Weaknesses and opportunities for MakeEase

| Zapier weakness or tension | MakeEase opportunity |
| --- | --- |
| Many product surfaces and quota types | One run graph and one cost/risk ledger for workflows, agents, MCP-style tools, and human approvals |
| Task cost becomes hard to predict with loops, AI, code, MCP, and replay | Preflight cost range, per-step budget, hard stop, and post-run exact accounting; show free versus billable work |
| Approvals are listed as Enterprise beta | Human-in-the-loop approval as a core primitive with action-level policy, expiry, escalation, and audit receipt |
| Governance and observability are heavily plan-gated | Baseline trace, policy decision, redacted payload, version diff, and export on every plan; advanced retention/SSO can still be paid |
| Marketplace breadth can make discovery noisy | Capability catalog ranked by intent, with latency, scopes, side effects, data residency, idempotency, and examples visible before selection |
| Polling and REST Hook behavior may be hidden in setup | Show event source, expected latency, dedupe key, missed-event behavior, and replay strategy in the trigger card |
| Managed connections are convenient but increase destination re-auth work | Portable redacted connection references plus guided re-auth and permission-diff checks |
| Early-access AI workflow claims are ahead of stable guarantees | Make deterministic/agentic boundaries, model choice, fallback, and approval points explicit and production-testable |
| History is useful but retention/version windows vary by plan | Unified, configurable event ledger with export, immutable run IDs, and durable incident links |

## Five acceptance criteria for a better alternative

These are product acceptance tests for MakeEase, not claims about current implementation.

1. **Intent-to-executable workflow:** Given a request such as “When a new Gmail message with an invoice arrives, extract the amount, require approval above $5,000, then write to Sheets and notify Slack,” a user can generate or build a visible graph containing the trigger, extraction, condition, approval, and two actions. Before publish, the UI shows required connections, scopes, event latency, side effects, and unresolved fields; a user can test each step with sample data without sending a real external side effect.

2. **Predictable metering and budgets:** Every draft and run displays an estimated and actual cost broken down by trigger, external action, model/tool call, loop iteration, and retry. The owner can set a hard per-run and monthly budget; when a run would exceed it, MakeEase pauses before the next side effect and records the reason. There is no hidden distinction between workflow, agent, and tool-call meters.

3. **Action-level approvals and governance:** A policy author can require approval based on action type, destination, data classification, amount, or confidence—regardless of whether the request came from a visual workflow, an AI agent, or an MCP-compatible client. The approval screen shows the exact proposed payload and policy reason, supports approve/deny/expire/escalate, prevents the side effect before approval, and emits an immutable audit receipt.

4. **Unified observable reliability:** One run timeline shows version, trigger event, every step/tool/model call, redacted input/output, policy decisions, retries/backoff, latency, cost, and external IDs. A user can compare versions, roll back, replay only idempotent failed work, export the trace, and configure retention. Sensitive fields are redacted by policy before storage or model transmission.

5. **Portable migration:** A user can import or recreate a representative Zapier workflow (for example Gmail → filter → Slack/Sheets) through a canonical JSON import or guided mapper. In one report, MakeEase identifies what mapped exactly, what needs re-authentication, what has different event/retry/cost behavior, and what is unsupported; credentials are never exported. The workflow can then be exported in the same redacted, versioned format so the customer retains operational ownership.

## Official source list

- [Zapier pricing and plan comparison](https://zapier.com/pricing)
- [Zapier pricing rates](https://zapier.com/pricing/rates)
- [Zapier features / Next Gen Zaps](https://zapier.com/features)
- [Zapier app directory](https://zapier.com/apps)
- [Zapier AI overview](https://zapier.com/ai)
- [Zapier Agents](https://zapier.com/agents)
- [Zapier MCP product page](https://zapier.com/mcp)
- [Zapier developer documentation index](https://docs.zapier.com/llms.txt)
- [How Zapier integrations work](https://docs.zapier.com/integrations/quickstart/how-zapier-works)
- [Triggers: polling and REST Hooks](https://docs.zapier.com/integrations/build/trigger)
- [Actions: create, search, and delete](https://docs.zapier.com/integrations/build/action)
- [Platform UI versus Platform CLI](https://docs.zapier.com/integrations/quickstart/ui-vs-cli)
- [How task usage is measured](https://help.zapier.com/hc/en-us/articles/8496196837261-How-is-task-usage-measured-in-Zapier)
- [View and manage Zap history](https://help.zapier.com/hc/en-us/articles/8496291148685-View-and-manage-your-Zap-history)
- [Loop your Zap actions](https://help.zapier.com/hc/en-us/articles/8496106701453-Loop-your-Zap-actions)
- [Enterprise usage alerts](https://help.zapier.com/hc/en-us/articles/45955900008973-Set-up-usage-alerts-in-your-Enterprise-account)
- [MCP overview](https://docs.zapier.com/mcp/home)
- [MCP usage and billing](https://docs.zapier.com/mcp/overview/usage)
- [MCP security and governance](https://docs.zapier.com/mcp/manage/security)
- [Zapier Trust Center](https://trust.zapier.com/)
