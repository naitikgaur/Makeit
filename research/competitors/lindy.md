# Lindy: AI coworker / agent product research

**Research date:** 2026-10-16  
**Evidence standard:** First-party Lindy marketing pages and Lindy documentation retrieved on the date above. Statements marked **Verified** describe what those pages explicitly say. Statements marked **Vendor claim** are Lindy’s own positioning, certifications, or reported outcomes and were not independently audited in this research. **Inference** is analysis of the product behavior implied by the published material.

## Executive read

Lindy positions itself as an **“AI employee,” “AI teammate,”** and even a **“next hire,”** rather than as a chatbot or a single-purpose automation. Its core promise is that a person can describe work in natural language and Lindy will complete it across connected systems. The product combines two surfaces:

* a private assistant in DMs, email, iMessage/SMS, and the web app for a person’s inbox, meetings, calendar, and ad-hoc work; and
* a shared teammate in Slack that a team can `@mention` in channels and threads.

The underlying product is a hybrid of general-purpose delegation and prompt-defined workflows:

* **General-purpose:** an open-ended request can trigger research, tool calls, artifact creation, or a multi-step investigation.
* **Workflow-like:** reusable skills, scheduled/event-driven routines, shared sources, integration guardrails, and persistent files turn repeated work into an operating procedure.

Its strongest differentiators are low-friction Slack adoption, a large integration catalog, model choice, inspectable memory files, and a clear “do the work” UX. Its largest professional-product gaps are cost transparency, inconsistent public pricing/catalog numbers, coarse write permissions, approval-surface ambiguity, and limited public detail on audit-log semantics, retention, residency, reliability targets, and measurable task quality.

## Product model and agent setup

### Setup path

**Verified from the setup docs:**

1. An owner/admin installs the Slack app through Slack’s standard permission screen. The installer is linked to Lindy automatically.
2. Other teammates can DM or `@mention` Lindy; the first interaction produces a **“Connect Slack to Lindy”** button. After the user confirms, the original message is replayed.
3. Each person connects Google or Microsoft email and calendar, optionally a phone/iMessage/SMS channel, and any needed tools.
4. An owner/admin invites members, assigns Member/Admin roles and a Plus/Pro/Max plan, and manages seats in **Settings → Members and groups**.
5. A user gives Lindy a task in natural language, such as preparing a client brief from previous calls and emails or converting sales calls into a report and CRM updates.

Sources: [Quickstart](https://docs.lindy.ai/start-here/quickstart.md), [Set up Lindy](https://docs.lindy.ai/teammate/setup.md), [Team Setup](https://docs.lindy.ai/start-here/team-setup.md).

The marketing FAQ says setup takes minutes, with “no API keys or IT ticket”; that is a **Vendor claim**. The documentation does say integrations can use OAuth or an API key, so the practical setup experience depends on the selected connector.

### One product, two trust/data surfaces

Lindy describes the shared and personal experiences as “the same Lindy,” but the published permissions are materially different:

| Surface | Published behavior | Product implication |
|---|---|---|
| Personal DM/web/iMessage/SMS | Uses the user’s personal connections and context; supports email, calendar, meeting, reminders, and full personal tool work | A personal executive assistant with broad delegated access |
| Shared Slack channel/thread | Uses approved team sources and shared connections; responds publicly in the thread | A team coworker whose work is visible to the channel |
| Slack setup | Admin installs the app; users link their identities; auto-join of public channels is configurable | Slack is the distribution and invocation layer, not merely a notification target |

The docs say public/shared channels are designed to be public-safe and that Lindy summarizes rather than pastes private data into a public channel. They also say private DMs stay between the user and Lindy. This is a strong UX boundary, but it creates two potentially different security/approval experiences that should be made explicit to users.

### General-purpose delegation versus workflows

Lindy is not presented as a visual DAG builder. The primary setup is “tell it what you need,” and the agent chooses how to use connected tools. The product then adds structure around that open-ended agent:

* **Ad hoc tasks:** one-off research, knowledge lookups, summaries, meeting prep, scheduling, email drafting, and personal reminders ([Ad Hoc Tasks](https://docs.lindy.ai/features/ad-hoc-tasks.md)).
* **Skills:** named playbooks with descriptions and instructions. Lindy sees the skill names/descriptions and loads the full instructions when a request appears relevant. Personal, Team, and built-in scopes exist ([Skills](https://docs.lindy.ai/teammate/skills.md)).
* **Routines:** a trigger, plain-English prompt, and destination. Triggers can be scheduled or event-based; delivery can be chat, text, Slack DM, a Slack thread, or a channel ([Routines](https://docs.lindy.ai/teammate/routines.md)).
* **Scripts:** personal routines can be converted into Python that runs before waking the model. The docs describe “finish on its own,” “leave Lindy a note,” and “crash and wake Lindy to repair/test” outcomes. This provides a deterministic path for simple polling but is not available for workspace routines.
* **Dry runs:** routines can run against real reads and real judgment while suppressing sends/posts/writes. Lindy recommends a safe destination or copy when testing the delivery leg.

**Inference:** Lindy’s agent abstraction is a **general-purpose coworker with prompt-routed sub-procedures**, rather than a collection of isolated bots. A user can start with an open-ended task, then progressively turn the successful method into a reusable skill or routine. This is a low-friction adoption path, but it puts more responsibility on descriptions, model judgment, and guardrails than a fixed workflow editor would.

## Integrations, MCP, and Slack

The integrations catalog lists Gmail, Outlook, Google Calendar, Drive, Docs, Sheets, Slack, Microsoft Teams, GitHub, HubSpot, Salesforce, Notion, Linear, Zendesk, Intercom, Stripe, Snowflake, Databricks, and many others. Lindy also supports hosted MCP servers. The docs say that if a connector or MCP server is unavailable, Lindy may drive the browser like a person or write an integration against the tool API.

The first-party count is not consistent:

* the [Integrations page](https://www.lindy.ai/integrations) headline says **1,000+** and its directory UI says “1,400+ integrations”;
* the [Use Cases page](https://www.lindy.ai/use-cases) says **1,500+ integrations + MCP**; and
* the [Pricing page](https://www.lindy.ai/pricing) says **1,500+ integrations**.

These are all official surfaces observed in the same research window. Treat the count as an approximate catalog-size claim, not a precise benchmark.

### Slack mechanics that matter

The Slack docs describe a natural thread interaction: after Lindy replies to an `@mention`, a follow-up in the same thread does not need another `@mention`. Admins can adjust the Slack context lookback with `/lindy admin convogap <minutes>`. Lindy warns that a longer lookback may pull in less relevant messages and that context affects credit usage. Users can run `/lindy usage` for their own seven-day Slack diagnostics.

The integration docs expose three write settings:

| Setting | Published behavior |
|---|---|
| **Always allow** | Writes without asking |
| **Require approval** | Asks in Slack before writing |
| **Don’t offer** | Never writes with that tool |

Important limitations published in the same docs:

* Reads are never guarded.
* Guardrails apply to **shared Slack threads only**; the docs explicitly say the web app, Slack DMs, iMessage, and SMS are not guarded by these integration settings.
* A guardrail covers every account under an integration; it cannot yet distinguish, for example, work Gmail from personal Gmail.
* Every action for a connected tool is enabled at once; there is no action-picking step during connection.
* A shared connection acts with the connected account’s permissions.

The setup and integrations model is therefore powerful and approachable, but a workspace needs a separate access-review process to prevent a broad shared account from becoming an unnecessarily large blast radius.

## Use cases and workflow behavior

Lindy markets across executive assistance, sales, support, operations/finance, marketing, product, and engineering. Representative first-party examples include:

* **Research/monitoring:** track competitors all week and post a sourced Monday report; check daily ad spend and ROAS; compare vendors with pros/cons and price math.
* **Sales:** watch pipeline changes across CRM, meetings, and inbox; run a deal-won handoff; query sales calls; update CRM from Slack.
* **Support:** triage a support queue, draft replies from solved tickets, route issues, group recurring root causes, and watch escalations.
* **Operations/finance:** build a staff meeting deck from CRM/support/usage data, reconcile invoices, and answer warehouse questions in Slack.
* **Product/engineering:** investigate a funnel issue across analytics/deploys/tickets, write a changelog, file tickets from an on-call channel, and chase stale pull requests.

The use-case pages model three depths for one job: an **alert**, a **digest**, or a **dashboard/artifact**. This is a useful product pattern because it lets a user start with a small notification and expand into a durable deliverable.

The enterprise page also shows a sales objection workflow: read sales calls, replay relevant calls, check deals, write cards, then post to Slack. It illustrates the “agent plan plus visible steps” interaction, but the example is a marketing illustration rather than a measured execution trace.

## Memory, context, and model choice

### Persistent context

The [Memory docs](https://docs.lindy.ai/teammate/memory.md) describe a browser-based, versioned file explorer:

* **Personal files:** visible/editable by the individual within a workspace.
* **Team files:** visible to the workspace; owners/admins edit, regular members are read-only.
* **System files:** built-in and not editable.
* `.memory/` stores durable knowledge; `.skills/` stores skill folders containing `SKILL.md` instructions.
* Every save creates a version, and deleted files retain earlier versions.
* Changes sync in near real time; users can inspect Preview, Raw, and History views.

**Vendor claim:** the product page calls this “memory you can edit” and says the memory lives in plain files.  
**Inference:** this is more inspectable than an opaque chat-history-only memory design and gives MakeEase a concrete reference for user-visible context management. It does not, by itself, prove that every decision can be reconstructed from the exact memory snapshot used during a run.

The enterprise page claims shared company knowledge, source links for answers, source precedence when facts disagree, and personal context isolation. The public memory docs document scopes and versioning but do not provide the same level of detail on source precedence, retention, or an exportable provenance record.

### Model selection

The pricing and usage docs say credits are approximately **$0.01 each on base plans**, that Lindy can choose a suitable model, and that users can select a model per task. The enterprise page names Anthropic, OpenAI, Gemini, and other frontier models and says access can be controlled.

This is commercially attractive for model flexibility and cost optimization. However, no public page reviewed here provides a model-by-model credit multiplier, token accounting model, quality evaluation, fallback behavior, or an explanation of how a model choice is recorded in an audit trail.

## Pricing and credit economics

### Official figures observed

The public [Pricing page](https://www.lindy.ai/pricing) currently shows:

* **Free:** $0, $50 in credits, no card, credits last 7 days.
* **Team:** $29.99/month for 3,000 credits/month, with larger bundles listed; top-ups at $10 per 1,000 credits.
* **Enterprise:** custom credits/billing, with HIPAA/BAA, SSO/SCIM, audit logs, shared usage/bonus credits, support, and enablement.
* Active users take seats and the seat credits are pooled across the workspace.
* Monthly plan credits do not roll over; purchased top-ups remain until used.
* If the pool is depleted, Lindy pauses credit-using actions rather than silently charging more.

The docs’ [Pricing](https://docs.lindy.ai/pricing.md) page does not publish the same dollar tiers; it describes Plus, Pro, Max, and Enterprise and directs users to **Settings → Billing** for current plan details. The current [home page](https://www.lindy.ai/) contains another official pricing module showing **$49.99/month for 5,000 credits** and says plans start at $49.99/user/month. This conflicts with the public `/pricing` page’s $29.99/3,000 Team entry point. It may be an experiment, a rollout difference, or a product packaging transition; it should be treated as an unresolved first-party pricing discrepancy.

### Unit economics from the published numbers

Using the docs’ stated base price of $0.01/credit:

| Lindy workload band | Published credit range | Approx. base-plan equivalent |
|---|---:|---:|
| Everyday asks | 2–250 | $0.02–$2.50 |
| Deep work | 250–1,000 | $2.50–$10.00 |
| Big builds | 1,000–2,500 | $10.00–$25.00 |

These are **ranges, not price guarantees**. Lindy says lookups, summaries, drafting, tool updates, competitor research, dashboards, and heavy scheduled workflows consume different amounts. It does not publish a deterministic estimator for a particular tool sequence. The docs also say deep research cost varies with scope and that vague prompts tend to cost more.

The credit design has several practical properties:

* pooled credits reduce the friction of assigning work to a particular person;
* per-member limits let admins stop one teammate from consuming the entire pool;
* usage can be reviewed in Settings → Billing and sorted per person in Settings → Members;
* an unusually heavy task can pause and ask the user whether to continue;
* a task already running may finish beyond a per-person cap, so a cap is not an exact hard ceiling;
* monthly credits expire at reset, while top-ups carry over.

**Inference:** credits are a simple value meter for the buyer, but a weak operational meter for a finance or platform team until each run exposes its actual model/tool/step cost. The shared-pool design also makes “cost per workflow” and “cost per successful outcome” the important metrics, not just cost per user.

## Approvals, security, and enterprise controls

### What Lindy says

The product and pricing pages use a strong headline: **“Nothing irreversible happens without your approval.”** The FAQ says outside-impact actions such as sending email, updating a ticket, posting to another channel, or publishing a document wait for approval; read-only lookups do not.

The security page and docs state:

* data is encrypted in transit and at rest;
* Lindy says data is never sold and neither Lindy nor its providers use it to train AI models;
* Lindy states SOC 2 Type II, GDPR, HIPAA, and PIPEDA compliance/verification claims;
* Enterprise adds SSO, SCIM, audit logs, and HIPAA with a signed BAA;
* admins control personal/team connections, shared sources, members, credit limits, and workspace ownership.

The [Enterprise page](https://www.lindy.ai/enterprise) additionally markets centralized management, team-source controls, grounded answers with source links, named approvers, roles, audit visibility, and source/context privacy. It says Lindy is “governed like an employee, audited like a system.” These are **Vendor claims/enterprise positioning**; the public pages do not expose an audit-log export, retention schedule, SLA, data-residency matrix, subprocessor inventory, or a sample compliance report.

### Approval semantics that need careful reading

The public docs are more qualified than the headline:

1. The integration guardrail applies to writes in **shared Slack threads**, not to web-app chat, Slack DMs, iMessage, or SMS.
2. The approval dialog is per action: **Approve** allows one action. **Always allow** changes the future rule for the relevant scope; an owner/admin change is workspace-wide, while a member change is personal.
3. The requester can approve their own action; workspace owners/admins can approve; other members receive a private note to ask an owner/admin.
4. Guardrails are set at the integration level and cover all accounts under that integration.

This is a material trust gap between “no irreversible action without approval” and the narrower documented implementation. It may be intentional product scope, but a buyer should verify which surfaces and connections are governed before treating the headline as a universal policy.

## UX language and trust signals

### Language Lindy uses

Lindy repeatedly uses human-work metaphors:

* “Hire Lindy”
* “The AI teammate that punches above its price”
* “The teammate that lets you do more”
* “AI employee” / “newest teammate”
* “Teach it once. Everyone uses it.”
* “It does the work,” rather than only giving an answer

This language makes delegation legible to non-technical users. A person can map “prepare a report,” “run the handoff,” or “watch my pipeline” to an assistant rather than learn a workflow DSL. The Slack `@mention` reinforces the coworker metaphor.

### UX patterns that work well

* **Visible plan/progress:** examples show tool-by-tool steps, counts, elapsed time, and a final artifact.
* **Progressive commitment:** start with a one-line alert, then a digest, then a dashboard; start with an ad-hoc task, then save it as a skill/routine.
* **Persistent, editable context:** memory files are visible, versioned, and scoped.
* **Native team channel:** the work appears where decisions already happen, rather than forcing users into a separate automation console.
* **Dry runs and safe destinations:** routines have a concrete preflight path before unattended delivery.
* **Model choice without provider lock-in:** users can choose a model per task.

### Trust weaknesses in the UX

* “AI employee” and “nothing irreversible” imply a uniform, dependable policy boundary, while the docs limit guardrails to shared Slack threads.
* A broad integration-level rule is easy to understand but too coarse for multiple accounts, resources, or data classifications.
* A user sees credit ranges and warnings, but not a reliable pre-run estimate, per-step cost, or model multiplier.
* The product says every action is logged, but public documentation does not establish whether logs are immutable, exportable, retention-controlled, searchable by run ID, or sufficient for a regulated evidence trail.
* “Grounded answers” and source links are marketed on the enterprise page, but the public docs do not define a source-precedence algorithm or an answer-quality/evaluation report.
* Skills are described as rolling out behind feature flags, so the reusable-procedure experience may not be uniform across accounts.

## Trust-gap register

| Gap | Evidence | Why it matters for a professional buyer |
|---|---|---|
| Pricing/package drift | `/pricing` shows $29.99/3,000; home page shows $49.99/5,000; docs defer to Settings → Billing | Procurement cannot reproduce a public quote from the marketing site alone |
| Catalog-count drift | Official surfaces say 1,000+, 1,400+, and 1,500+ integrations | The count reads as a scale signal rather than a stable, auditable capability metric |
| Approval boundary ambiguity | Headline promises universal approval; integration docs limit guardrails to writes in shared Slack threads | Users may assume DMs or personal channels are governed when the documented control does not apply |
| Coarse permissions | Guardrails cover an entire integration/account set; all tool actions turn on together | Least privilege and separation of duties are harder to enforce |
| Spend ceiling overshoot | Docs say an in-flight task may finish beyond a per-person cap | “Cap” is a soft control, which matters for budget and incident response |
| Opaque unit economics | Broad credit bands, model choice, and vague deep-work cost; no public estimator or model table | Finance cannot forecast a workflow or compare cost per successful outcome |
| Audit evidence unspecified | Marketing says every action is logged; public pages do not expose schema, export, retention, or SLA details | Security teams cannot validate whether the record meets internal evidence requirements |
| Context/provenance not fully specified | Memory is inspectable/versioned, but public docs do not detail run snapshots, source precedence, or exact citation coverage | A reviewer may not be able to reproduce why a particular answer/action happened |

## Competitive assessment for MakeEase

### Where Lindy is strong

1. **Fast time-to-first-value:** Slack installation and natural-language delegation minimize setup ceremony.
2. **Broad horizontal reach:** one assistant spans personal productivity and departmental workflows across a large connector/MCP ecosystem.
3. **Adoption-friendly mental model:** “hire an AI teammate” is easier to sell than “configure a tool graph.”
4. **Human-in-the-loop primitives:** the product has approval buttons, write guardrails, dry runs, per-person spend caps, and visible progress.
5. **Context compounding:** skills, routines, meeting library, and versioned memory encourage repeated use and team reuse.

### Where MakeEase can be more professional

MakeEase should avoid competing only on connector count or anthropomorphic copy. The differentiated product should make every delegated action **measurable, reproducible, and governed by default**.

## Five ways MakeEase can provide a more professional, measurable, governed experience

1. **Make every run an evidence-backed execution record.**
   Give each task a stable run ID and show requester, policy version, agent/version, model, input snapshot, approved sources, step graph, reads, writes, retries, timestamps, result links, and final status. Track completion rate, error rate, latency, human intervention, and cost per successful outcome. Export the record for security and finance review.

2. **Use policy-as-code approvals at the action/resource level.**
   Let admins require approval by action type, account, resource, data classification, destination, dollar amount, or risk score. Name the approver role, add escalation/expiry, and record the exact payload that was approved. Separate “approve once” from “approve this class of action,” and make the policy apply consistently across chat, Slack, API, and scheduled runs.

3. **Make economics predictable before and after execution.**
   Show a pre-run cost estimate with confidence bounds, model/tool assumptions, and expected credit reservation. Meter each step and model, enforce a true hard budget (or explicitly label a soft budget), and provide workspace/team/user allocations. Report cost per run, cost per successful result, avoided human minutes, and realized ROI instead of only a pooled credit balance.

4. **Treat context as versioned, permissioned evidence.**
   Provide personal/team/system scopes, source citations, precedence rules, conflict flags, retrieval snapshots, and diffs for memory/skills. Let reviewers see exactly which context was available to a run, approve changes to shared playbooks, and replay a run against the same snapshot. Add evaluation cases so a skill change can be tested for regressions before it reaches the team.

5. **Ship a measurable workflow control plane alongside chat surfaces.**
   Keep Slack and natural language for discovery, but give operators a durable workspace for workflow contracts: trigger, input schema, expected output, side effects, owner, SLA, retry policy, test/dry-run results, approval policy, and rollback. Dashboard trigger volume, success, stale/failed runs, approval latency, policy denials, and human overrides. This turns “AI coworker” from a persuasive metaphor into an accountable operating system.

## Sources

All sources below are official Lindy pages. Retrieved 2026-10-16.

### Product and commercial pages

* [Lindy home](https://www.lindy.ai/) — positioning, product surfaces, use-case examples, and the alternate pricing module.
* [Pricing](https://www.lindy.ai/pricing) — free/team/enterprise pricing module, credit bands, top-ups, pooled seats, model choice, approvals FAQ.
* [Integrations](https://www.lindy.ai/integrations) — catalog categories, MCP listing, connector examples, published count.
* [Use cases](https://www.lindy.ai/use-cases) — departmental jobs, alert/digest/dashboard pattern, integration examples, security/approval positioning.
* [Security](https://www.lindy.ai/security) — encryption, access/control, monitoring, compliance and trust-center claims.
* [Enterprise](https://www.lindy.ai/enterprise) — team/shared assistant model, centralized controls, source links, named approvals, audit and compliance positioning.

### Documentation

* [Documentation index](https://docs.lindy.ai/llms.txt) — official page inventory used to select the detailed references.
* [Quickstart](https://docs.lindy.ai/start-here/quickstart.md) — Slack and personal setup flow.
* [Set up Lindy](https://docs.lindy.ai/teammate/setup.md) — account connections, Slack linking, personal/shared behavior, guardrail pointer.
* [Team Setup](https://docs.lindy.ai/start-here/team-setup.md) — invitations, roles, seats, credit limits, ownership, cap-overrun note.
* [Integrations](https://docs.lindy.ai/integrations/overview.md) — personal/team connections, MCP/browser fallback, write guardrails, approval mechanics and limitations.
* [Slack Commands](https://docs.lindy.ai/teammate/slack-commands.md) — mentions, threads, context lookback, usage diagnostics.
* [Memory](https://docs.lindy.ai/teammate/memory.md) — personal/team/system files, `.memory`, `.skills`, versioning, editing and syncing.
* [Skills](https://docs.lindy.ai/teammate/skills.md) — reusable playbooks, routing by description, scopes, early-access note.
* [Routines](https://docs.lindy.ai/teammate/routines.md) — trigger/prompt/destination, schedules/events, scripts, dry runs and delivery.
* [Ad Hoc Tasks](https://docs.lindy.ai/features/ad-hoc-tasks.md) — research, knowledge lookup, meeting, email, calendar and reminder examples.
* [Pricing](https://docs.lindy.ai/pricing.md) — $0.01 base credit statement, model choice, pooling, expiry and approval FAQ.
* [Understanding Your Usage](https://docs.lindy.ai/account-billing/usage.md) — credit impact, heavy-task warning, per-person caps, pool exhaustion, optimization guidance.
* [Security](https://docs.lindy.ai/resources/security.md) — concise compliance and encryption summary linking to the Trust Center.
