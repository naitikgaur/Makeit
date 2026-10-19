# Make.com — competitor research for MakeEase

**Research lens:** product strategy and workflow UX

**Research date:** 2026-10-16

**Evidence rule:** Claims under **Verified vendor fact** are taken from Make's public Help Center or Developer Hub. Claims under **Strategic inference** are my interpretation for MakeEase and are not claims made by Make. Time-sensitive items (pricing, credit allowances, app counts, model availability, and plan gating) should be rechecked before a product or commercial decision.

**Method:** Documentation-based product/UX review. No Make account was created, no scenario was executed, no credentials were entered, and no completion-time or conversion study was performed. UI behavior below is the documented behavior, not a hands-on usability test.

## Executive readout

Make is a mature, deeply composable automation platform organized around a visual **scenario**: a graph of modules that moves typed data bundles through triggers, searches, actions, tools, routers, filters, iterators, and aggregators. Its strongest product advantages are:

1. **Composable depth:** the same canvas supports a simple two-app automation and a branching, multi-bundle process.
2. **Inspectable execution:** module bubbles, bundle-level input/output, history, credits, operations, and replay make a run debuggable.
3. **Reuse and distribution:** public/team templates, guided setup, cloning, blueprints, public scenario links, and a developer app model lower the cost of starting over.
4. **A serious failure model and estate view:** error-handler routes, incomplete executions, retries, rate limits, ordered processing, and Make Grid's dependency/attention views acknowledge that integrations fail and depend on each other.
5. **An expanding AI surface:** Make AI Agents, an AI Provider/custom provider split, knowledge retrieval, MCP, and Maia put AI inside the builder rather than beside it.

Its main strategic weakness for MakeEase is not missing capability; it is **capability density and cost/operational complexity**. A first-time user has to understand modules, bundles, mapping, schedules, connections, routes, operations, credits, data zones, error handlers, and plan limits. Make's guided templates and excellent documentation mitigate this, but the underlying mental model still asks users to become workflow engineers.

**MakeEase should adopt the evidence-oriented execution model and the reusable typed workflow primitives, then put an opinionated support outcome in front of them.** It should make the cost, side-effect boundary, policy, and recovery path easier to understand than Make. It should not attempt parity with Make's broad canvas, app catalog, or arbitrary automation surface for the first support-inbox product.

## Research boundaries and unavailable pages

### Sources successfully available

- Make Help Center pages at `help.make.com`, including scenario building, mapping, templates, errors, credits, collaboration, security, AI, and administration.
- Make Developer Hub pages at `developers.make.com`, including REST API, API authentication/rate limits, scenarios, logs, consumptions, templates, and custom-app module contracts.

### Pages attempted but blocked or unavailable

The following official public landing pages were not usable in this environment:

| Page | Result | Consequence |
| --- | --- | --- |
| `https://www.make.com/en/pricing` | HTTP 403 | I did not treat the current pricing-card amounts as verified. |
| `https://www.make.com/en/product` | HTTP 403 | Product positioning below comes from the Help Center and Developer Hub instead. |
| `https://www.make.com/en/security` | HTTP 403 | I did not assert certifications, attestations, or security claims that require the landing page. |
| `https://www.make.com/en/ai-automation` | HTTP 403 | AI findings below use official Help Center/system-card material. |
| `https://www.make.com/en/help/general/pricing-parameters` and related `www.make.com/en/help/...` variants | HTTP 403 | Pricing behavior is sourced from accessible Help Center pages and dated official pricing announcements. |
| `https://trust.make.com` and `https://security.make.com` | Transport error | No trust-center claims were used. |

The built-in browser also timed out opening the pricing page. The Help Center remains public and exposes plan/credit behavior, but it is not a substitute for a live pricing card. Exact dollar prices in this document are therefore either absent or explicitly labeled as dated examples, never presented as the current Make price list.

Some legacy or guessed documentation paths returned 404. The Help Center index resolved the case-sensitive `Introduction-to-errors-and-warnings` and `Overview-of-error-handling` paths; their lowercase variants and the legacy `quick-error-handling-reference` URL were unavailable. The relevant current pages were retrieved and used below.

### Evidence-quality caveats

- **Versioned AI guidance:** `introduction-to-ai-agents` and `ai-agent-best-practices` explicitly say they describe a previous version. Current-feature claims below use `make-ai-agent-new-app`, `make-ai-agent-new-best-practices`, and `create-your-first-ai-agent`; older guidance is labeled when retained.
- **Stale cycles setting:** `scenario-settings` still describes “Cycles per run,” but the dated removal notice says the setting was removed on October 1, 2026, and the current API schema marks its `roundtrips` field deprecated/ignored. Treat the removal notice as newer evidence and do not model multi-cycle runs as a current capability. [Cycles removal notice](https://help.make.com/cycles-removal-on-october-1-2026), [API — Scenarios](https://developers.make.com/api-documentation/api-reference/scenarios.md)
- **Error-help inconsistencies:** The overview says repeated Rollback errors can deactivate a scenario; the individual Rollback page says the scenario itself will not be disabled. The Commit page also contains retry-configuration instructions inconsistent with its “stop and commit” definition. This report relies on the stable handler definitions, not those contradictory edge-case instructions. A real configuration test is needed before using them as an implementation specification. [Overview](https://help.make.com/Overview-of-error-handling), [Rollback](https://help.make.com/rollback-error-handler), [Commit](https://help.make.com/commit-error-handler)
- **AI-region specificity:** The data-zone page includes mixed/malformed model rows and EU-labeled region lists that include London/Zurich. It establishes that routing depends on feature/model/connection; it does not justify a blanket EU-only promise. Confirm the exact provider route and contract for a residency requirement. [AI providers and data zones](https://help.make.com/ai-providers-and-data-zones-in-make)

## Verified product model

### 1. The core object is a scenario made of modules

**Verified vendor facts**

- Make defines a scenario as a series of modules that indicate how data is transferred and transformed between apps or services. [Help — Create your first scenario](https://help.make.com/create-your-first-scenario), [Developer Hub — Scenarios](https://developers.make.com/api-documentation/api-reference/scenarios.md)
- A module is a building block for retrieving data, searching, creating/updating/deleting records, downloading files, or transforming data. Make distinguishes triggers, searches, actions, and universal modules. [Help — Types of modules](https://help.make.com/types-of-modules)
- A trigger is normally the first module and can be polling or instant/webhook based. Polling triggers check for new data according to the schedule; instant triggers begin when a service sends data. [Help — Types of modules](https://help.make.com/types-of-modules)
- Search modules can be placed anywhere and return matching records; list modules return all available objects subject to Make/provider limits. Actions include get, create, update, delete, and provider-specific operations. Universal/API-call modules cover endpoints without a pre-built action. [Help — Types of modules](https://help.make.com/types-of-modules)
- Built-in tools such as Iterator, Aggregator, Data store, Compose a string, and Set variable do not require a third-party connection. [Help — Types of modules](https://help.make.com/types-of-modules)
- A scenario may be scheduled at intervals, once, daily, weekdays, weekly, monthly, specified dates, on demand, or immediately for eligible instant triggers. The default schedule described in Help is every 15 minutes, but the minimum interval depends on plan. [Help — Schedule a scenario](https://help.make.com/schedule-a-scenario)

**Strategic inference**

This is a powerful compositional kernel, but it makes the user model the implementation. For MakeEase's support wedge, the user should begin with “triage this support inbox” and see a small number of policy-level stages; the underlying typed steps can remain extensible without making the first screen a blank canvas.

### 2. Flow control is explicit and visual

**Verified vendor facts**

- A router creates several routes. Filters determine which route receives a bundle, routes can be ordered, and a fallback route handles data that matches none of the other routes. Make documents routes as sequential, not parallel: the next route waits for the preceding route to finish. [Help — Router](https://help.make.com/router)
- An Iterator converts array items to individual bundles. An Aggregator collects bundles during a source module's operation and emits one bundle containing an array; it can group by a formula and can stop after an empty aggregation. [Help — Aggregator](https://help.make.com/aggregator), [Help — Mapping arrays](https://help.make.com/mapping-arrays)
- Make supports scenario inputs and outputs for on-demand calls, calls from another scenario, API requests, and AI-agent/MCP tool interfaces. [Help — Scenario inputs and outputs](https://help.make.com/scenario-inputs-and-outputs)
- Subscenarios can chain workflows and transfer data; an on-demand scenario can be called as a tool if its inputs/outputs are defined. [Help — Subscenarios](https://help.make.com/subscenarios), [Help — Create your first AI agent](https://help.make.com/create-your-first-ai-agent)
- Make documents a scenario size limit of 2 MB in its first-scenario walkthrough. [Help — Create your first scenario](https://help.make.com/create-your-first-scenario)

**Strategic inference**

Routers, iterators, and aggregators are excellent power-user primitives and should be available in MakeEase's platform kernel. They should be introduced only when the support job needs them, with a plain-language explanation of bundle multiplication and the expected cost. A default support workflow should not expose a graph of empty branches.

### 3. The canvas is a true builder, not a static diagram

**Verified vendor facts**

- The Scenario Builder uses a canvas with pan, zoom, select, multi-select, move, context-menu, and touch interactions. The user can choose automatic input-device detection or a mouse/trackpad preference, and the chosen navigation setting is saved between sessions on that browser/device. [Help — Canvas interaction model](https://help.make.com/canvas-interaction-model)
- Users add modules through a large plus/search interaction, connect modules, open module settings, and can add a router through a connection or by inserting it between two modules. [Help — Router](https://help.make.com/router), [Help — Create an AI agent](https://help.make.com/create-your-first-ai-agent)
- Error-handling routes are shown as transparent, dotted connections. [Help — Overview of error handling](https://help.make.com/Overview-of-error-handling)
- After a run, bubbles above modules expose operation counts and can be opened to inspect processed bundles. [Help — Operations](https://help.make.com/operations), [Help — Scenario execution flow](https://help.make.com/scenario-execution-flow)
- Make provides undo/redo, saved versions, version history, and recovery of unsaved changes after an interrupted editing session. Saved versions are kept for 60 days except the latest version, which is kept until a newer version is saved. [Help — Scenario version control](https://help.make.com/scenario-version-control), [Help — Undo and redo scenario changes](https://help.make.com/undo-and-redo-scenario-changes)

**Strategic inference**

The canvas is a durable advantage for users who need to reason about a process spatially. MakeEase should borrow the visible run evidence and safe recovery, but offer an intent-first setup before exposing a canvas. A compact “workflow stages” view can later open into a graph for advanced operators.

## Data mapping and type system

### 1. Mapping is the main interaction contract

**Verified vendor facts**

- Mapping tells Make which data from one module goes into a field in another module. Users can map any information present in a source bundle, including nested arrays and collections. [Help — Mapping](https://help.make.com/mapping)
- To discover mappable fields, a user generally runs the source module (or runs that module only), opens its output bundle, expands items, and inserts a field into the target field. Make visually indicates the source module when the user hovers over a mapped value. [Help — Mapping](https://help.make.com/mapping)
- A bundle can contain simple values or nested structures. Make calls homogeneous lists arrays and mixed key/value structures collections. [Help — Mapping](https://help.make.com/mapping), [Help — Item data types](https://help.make.com/item-data-types)
- Supported data types include text, number, Boolean, date/time, binary buffer, collection, and array. Fields validate expected types; Make can coerce some mismatches, such as Boolean or number to text, but invalid or uncoercible values can produce a DataError. [Help — Item data types](https://help.make.com/item-data-types)
- Arrays can be indexed, searched with formulas, mapped by key/value, or converted into bundles with an Iterator. The mapping syntax is case-sensitive for raw item names. [Help — Mapping arrays](https://help.make.com/mapping-arrays)
- A module's field may be static or mappable. In Make's custom-app contract, mappable parameters can be entered manually or mapped from previous modules, and app authors can declare interface/output fields and samples so users do not always have to execute a module first. [Developer Hub — Mappable parameters](https://developers.make.com/custom-apps-documentation/component-blocks/mappable-parameters.md), [Developer Hub — Modules](https://developers.make.com/custom-apps-documentation/create-your-first-app/apps-environment/module.md)

**Strategic inference**

Make's mapping model is extremely expressive but has a discovery tax: a user often has to run a source before knowing what can be mapped. MakeEase should preserve typed mapping, but make the sample schema, source provenance, and expected output visible before the first live run. The product should distinguish “auto-converted” from “validated” rather than silently allowing coercion.

### 2. Mapping is also where cost and correctness multiply

**Verified vendor facts**

- Operations are module runs over bundles. A trigger can use one operation while returning multiple bundles; downstream actions may run once per bundle. Make's example of a trigger returning 10 bundles and three downstream modules totals 31 operations (`1 + 10 + 10 + 10`). [Help — Operations](https://help.make.com/operations)
- Make recommends limits and search filters because many searches have a 3,200-object or 5 MB per-run limit, and large iterations can hit a 40-minute scenario run limit. [Help — Types of modules](https://help.make.com/types-of-modules)
- Aggregating multiple bundles can reduce downstream operations: Make's operations walkthrough shows reducing a run from 11 operations to 3 by combining contacts before sending one email. [Help — Operations](https://help.make.com/operations)

**Strategic inference**

The visual flow can hide a fan-out cost explosion. MakeEase should show a pre-run estimate such as “1 thread → 4 policy checks → 1 draft” and warn when a mapping/iterator could create many side effects. A simple “per item” versus “once per run” label is more useful to a support operator than raw operation syntax.

## Operations, credits, and pricing behavior

### 1. Verified billing terminology and mechanics

**Verified vendor facts**

- Make distinguishes **operations** from **credits**. An operation is a module run/process/check; credits are the billing currency. [Help — Credits & operations](https://help.make.com/credits-and-operations), [Help — Operations](https://help.make.com/operations)
- For non-AI apps, one operation equals one credit by default. Some fixed-cost features consume more than one credit. [Help — Credits](https://help.make.com/credits)
- Dynamic credit use can vary by tokens, file size, page count, processing time, or other usage-based factors. [Help — Credits](https://help.make.com/credits)
- Third-party AI modules that use a custom provider connection generally charge Make credits for operations while the customer pays that AI provider for tokens. Make's AI Provider combines operation and token-based credit accounting; automatic-provider features may use tokens, operations, and other factors. [Help — Credits](https://help.make.com/credits)
- The Help Center currently names Free, Core, Pro, Teams, and Enterprise plan concepts in plan-gating examples. Standard apps are available to all users; paid-plan apps are available on Core, Pro, Teams, and Enterprise; Enterprise apps require Enterprise. [Help — Introduction to Make apps](https://help.make.com/introduction-to-make-apps)
- Paid users can manually purchase extra credits. Extra credits are valid for the current billing cycle; Make consumes included credits first. Extra credit purchases are in 1,000-credit increments and have a 25% additional cost. [Help — Extra credits](https://help.make.com/extra-credits)
- Auto-purchasing buys 10,000 credits when the subscription allocation is exhausted, repeats as needed, and is capped at the number of credits in the subscription. It also carries the 25% additional cost. Payment failure pauses scenarios until the payment method is updated. [Help — Extra credits](https://help.make.com/extra-credits)
- A monthly subscription allocates credits each month. An annual subscription is paid up front; Pro and Teams annual subscriptions provide a yearly package, while Core annual credits still reset monthly. [Help — Monthly and annual subscriptions](https://help.make.com/monthly-and-annual-subscriptions)
- An official November 6, 2025 pricing-adjustment note says Core was adjusted up to 300,000 credits/month, Pro up to 8 million credits/month, and custom AI-provider connections became available on all paid plans. These are dated vendor facts, not a current price-card substitute. [Help — Adjustments to plans and pricing](https://help.make.com/adjustments-to-plans-and-pricing)
- The same dated note includes a historical example of $338.13/month for 500,000 credits, and the subscription-help page includes a historical example of $113.85 for 150,000 Core credits/month. These examples are retained only to explain the credit-tier model; do not use them as current list prices. [Help — Adjustments to plans and pricing](https://help.make.com/adjustments-to-plans-and-pricing), [Help — Change your subscription](https://help.make.com/change-your-subscription)
- The public API documents organization-level rate limits of 60 requests/minute on Core, 120 on Pro, 240 on Teams, and 1,000 on Enterprise. [Developer Hub — Rate limiting](https://developers.make.com/api-documentation/getting-started/rate-limiting.md)
- Enterprise team-credit controls can allocate a team limit; at 75%, 90%, and 100% usage, owners/admins receive notifications, and scenarios pause at the team limit. [Help — Credits per team management](https://help.make.com/credits-per-team-management)
- Maia's builder chat uses the same credit pool as scenario runs; the cost per response varies by task complexity and model token consumption. The October 15, 2026 Help page describes temporary free-message promotions and explicitly warns that beta pricing may change. This adds design-time AI usage to the budget, not only production execution. [Help — Maia pricing](https://help.make.com/maia-by-make-pricing)

**Verified packaging snapshot from accessible Help/API docs — list prices unavailable:**

| Plan concept | Documented differentiators relevant to this research |
| --- | --- |
| Free | Standard apps, templates, and Make AI Provider access; custom AI-provider connections require a paid plan. |
| Core | Paid-plan apps/custom AI-provider connections; API rate-limit documentation lists 60 requests/minute. Annual billing still uses monthly credit resets. |
| Pro | API rate-limit documentation lists 120 requests/minute; execution full-text search is documented for Pro+; yearly credit pool available on annual billing. |
| Teams | Multiple teams and team-role management; API rate-limit documentation lists 240 requests/minute. |
| Enterprise | SSO, audit logs, team credit limits, and on-premise agent; API rate-limit documentation lists 1,000 requests/minute. |

Sources: [Apps](https://help.make.com/introduction-to-make-apps), [Templates](https://help.make.com/scenario-templates), [Credits](https://help.make.com/credits), [Subscriptions](https://help.make.com/monthly-and-annual-subscriptions), [Teams](https://help.make.com/teams), [History](https://help.make.com/scenario-history), [SSO](https://help.make.com/single-sign-on), [Audit logs](https://help.make.com/audit-logs), [Team credit limits](https://help.make.com/credits-per-team-management), [On-premise agent](https://help.make.com/on-premise-agent), [API limits](https://developers.make.com/api-documentation/getting-started/rate-limiting.md).

### 2. Pricing strategy interpretation

**Strategic inference**

Make's dual vocabulary is rational for an engine but difficult for a buyer. Operations describe what happened; credits describe what it costs; AI adds dynamic usage; extra credits and auto-purchase add a billing edge case. A sophisticated user can optimize a workflow with aggregators, but a small support team may experience an unexpected bill or a paused scenario before understanding why.

**MakeEase should improve this in four ways:**

1. Show one customer-facing unit (“reviewed thread”) and disclose underlying provider/credit usage as a detail.
2. Estimate cost before admission, reserve a bounded budget, settle actual usage, and show variance after the run.
3. Default to a hard no-overage cap; require an owner to raise it. Never silently auto-purchase.
4. Explain fan-out, AI-token effects, and billable AI-assisted design/testing in the workflow itself, not only in an organization billing screen.

## Error handling, reliability, and observability

### 1. Make has a mature error taxonomy and route model

**Verified vendor facts**

- Make distinguishes errors from warnings. Unhandled errors stop a run; warnings let the scenario continue and may result from handled errors or incomplete executions. [Help — Introduction to errors and warnings](https://help.make.com/Introduction-to-errors-and-warnings)
- The five documented error handlers are **Skip**, **Retry**, **Resume**, **Commit**, and **Rollback**. They differ in whether the bundle is dropped, substituted, retried, committed, or rolled back, and whether the scenario ends in success, warning, or error. [Help — Overview of error handling](https://help.make.com/Overview-of-error-handling)
- Error-handler routes are visually dotted and do not consume operations when activated. A route can itself contain ordinary notification or recovery modules. [Help — Overview of error handling](https://help.make.com/Overview-of-error-handling)
- Skip removes the affected bundle and continues; Resume substitutes a defined output and continues; Retry stores the failed bundle, error, mappings, and remaining flow for automatic/manual retry; Commit stops and keeps transaction-supported changes; Rollback stops and reverts changes only in modules that support transactions. [Help — Error handlers](https://help.make.com/error-handlers), [Help — Retry](https://help.make.com/retry-error-handler), [Help — Resume](https://help.make.com/resume-error-handler), [Help — Commit](https://help.make.com/commit-error-handler), [Help — Rollback](https://help.make.com/rollback-error-handler)
- Rollback cannot undo non-transactional external effects such as Gmail send or Dropbox delete; Make marks transaction-capable modules with an ACID label. [Help — Rollback error handler](https://help.make.com/rollback-error-handler)
- Incomplete executions are disabled by default. When enabled, Make stores unfinished runs for manual resolution or automatic retry, and storage counts against the subscription's limits. [Help — Incomplete executions](https://help.make.com/incomplete-executions), [Help — Scenario settings](https://help.make.com/scenario-settings)
- Scenario settings include process-data-in-order, keep-data-confidential, store-incomplete-executions, discard-data-if-storage-is-full, use-updated-variable-values, error count before deactivation, commit-after-each-module, and commit-trigger-last. [Help — Scenario settings](https://help.make.com/scenario-settings)
- Make automatically retries common ConnectionError and RateLimitError cases when incomplete executions are enabled. A Retry handler can configure attempts and delay for other cases. [Help — Retry error handler](https://help.make.com/retry-error-handler), [Help — Fix connection errors](https://help.make.com/fix-connection-errors)
- Repeated errors can deactivate scheduling; instant-trigger scenarios have stricter behavior and can be disabled immediately after an error. [Help — Overview of error handling](https://help.make.com/Overview-of-error-handling)

### 2. Make exposes execution evidence

**Verified vendor facts**

- Scenario history includes run date/time, run name, trigger/activity type, status, duration, operations, credits, transferred data, source run, replay, and details. It also records scheduling changes, edits, and activation changes. [Help — Scenario history](https://help.make.com/scenario-history)
- Run details expose module bundles and can switch between simple and advanced logs. History can be filtered and exported to CSV; full-text execution search is documented for Pro and higher plans. [Help — Scenario history](https://help.make.com/scenario-history)
- The public API exposes scenario logs with success/warning/error filtering, duration/operations/transfer/credits filters, execution status, author, and paused/waiting lifecycle fields. It exposes per-module logs and execution details, including outputs and error cause module. [Developer Hub — Scenario logs](https://developers.make.com/api-documentation/api-reference/scenarios/logs.md)
- The public API can replay an eligible execution against the latest active scenario version, and can stop a running execution. [Developer Hub — Scenario logs](https://developers.make.com/api-documentation/api-reference/scenarios/logs.md)

**Strategic inference**

Make's recovery primitives are a major trust advantage, but the user must choose among many semantics. MakeEase should provide a single guided recovery queue with a recommended action (“retry provider outage,” “request human review,” “skip invalid thread,” “stop because side effect is uncertain”), preserve the raw evidence, and make duplicate-effect risk explicit. A handled error should remain visible as a handled exception, not be flattened into an unqualified success.

## Templates, blueprints, and onboarding

### 1. Reuse is a first-class acquisition and activation loop

**Verified vendor facts**

- Make's template docs describe public templates created by Make/community and team templates created internally. The current Help page says the public library covers over 7,500 use cases; templates are available on all Make plans. [Help — Scenario templates](https://help.make.com/scenario-templates)
- A public-template flow offers either **Start guided setup** or manual creation from the template. Guided setup prompts for selected module fields, shows status icons, and can be skipped. [Help — Scenario templates](https://help.make.com/scenario-templates)
- Template authors can mark fields **Use in Wizard** and **Use as a default value**, add help text, and write a template description (up to 1,500 characters) and scenario description (up to 240 characters). [Help — Create and manage scenario templates](https://help.make.com/create-and-manage-scenario-templates)
- Team templates can be private or published. Published templates can be shared via link, submitted for Make approval, and later made public. Link recipients can use a template but cannot edit/copy the template itself. [Help — Create and manage scenario templates](https://help.make.com/create-and-manage-scenario-templates)
- Blueprints are JSON representations containing modules, module settings, and mapped values. They can be exported/imported, pasted to the clipboard, or shared with other users/LLMs. Connections are not included and must be created after import; imported blueprints are limited to 2 MB. [Help — Scenario blueprints](https://help.make.com/blueprints)
- Scenario sharing creates a public page with a live latest-saved version, preview, title, description, additional information, author, and a copy action. No API keys/passwords/connection details are included. [Help — Scenario sharing](https://help.make.com/scenario-sharing)
- Shared scenarios containing subscenarios, AI Agents, data stores, data structures, or unapproved custom/community apps may represent those pieces as empty modules; the recipient must recreate or install them. [Help — Scenario sharing](https://help.make.com/scenario-sharing)
- Cloning within a team can preserve module settings/connections; cross-team cloning requires selecting target-team connections and usually replacing webhooks. The user can choose whether polling-trigger state is carried over. [Help — Clone a scenario](https://help.make.com/clone-a-scenario)

### 2. The documented onboarding path

**Verified vendor facts**

- Make's first-scenario guide starts with an explicit task (Google Sheets new prospect → Slack notification), asks the user to create/access the third-party accounts, create a Slack channel and sheet/sample row, add the first app/module, create a connection, map data, test with **Run once**, and schedule the scenario. [Help — Learn the basics](https://help.make.com/learn-the-basics), [Help — Create your first scenario](https://help.make.com/create-your-first-scenario), [Help — Step-by-step scenario guide](https://help.make.com/step-1-plan-your-scenario)
- Testing uses a starting position, Run once, module output bubbles, input/output bundles, and a check in the destination service. [Help — Test your scenario](https://help.make.com/step-9-test-your-scenario)
- The newer AI-agent onboarding is explicitly six steps: plan the agent, build its scenario, configure instructions/provider/model, add tools, add knowledge, and test it. Testing supports chat, scenario runs from previous data, disabling tools, and run-detail inspection. [Help — Create your first AI agent](https://help.make.com/create-your-first-ai-agent)

**Strategic inference**

Make's onboarding teaches the engine well but requires several external accounts and concepts before the first result. MakeEase should reverse the order: identify the support job, connect one narrowly scoped Gmail label, confirm a few policies, process one consented/sample thread, and let the user approve/edit the draft. The graph and broad catalog should be an expansion path, not the activation gate.

## Integrations and developer/API surface

### 1. Connector ecosystem

**Verified vendor facts**

- Make distinguishes verified apps, community apps, and custom apps. Verified third-party apps pass Make's app review and must be maintained; community apps do not pass the same Make review and are supported/monetized by their developer; custom apps can be private or invite-only public. [Help — Introduction to Make apps](https://help.make.com/introduction-to-make-apps)
- If no pre-built app exists, Make directs users to the HTTP app or a universal API-call module. [Help — Types of modules](https://help.make.com/types-of-modules)
- Connections can use OAuth, API keys, credentials, or app-specific details. Connections are reusable across modules/scenarios; Make provides connection verification, reauthorization, replacement, and a list of scenarios using a connection. [Help — Connect an application](https://help.make.com/connect-an-application)
- Make warns that all users in a team can use/manage connections created in that team and recommends caution with personal accounts. [Help — Connect an application](https://help.make.com/connect-an-application)
- Custom-app authors define communication, static parameters, mappable parameters, interface/output fields, samples, error handling, and connection/auth configuration. The Developer Hub documents OAuth 2.0, webhooks, search/list/action/trigger modules, pagination, dynamic fields, and app testing. [Developer Hub — Custom Apps](https://developers.make.com/custom-apps-documentation/get-started/readme.md), [Developer Hub — Modules](https://developers.make.com/custom-apps-documentation/create-your-first-app/apps-environment/module.md)
- Enterprise customers can use an on-premise agent to reach local applications/databases without changing firewall settings. The currently documented HTTP Agent supports an API/web service reachable through the installed agent. [Help — On-premise agent](https://help.make.com/on-premise-agent)

### 2. REST API and platform automation

**Verified vendor facts**

- The Make REST API is intended to access Make data and control the platform without opening the graphical interface. It supports API tokens or OAuth 2.0 connections, with access defined by API scopes. [Developer Hub — Getting started](https://developers.make.com/api-documentation/getting-started.md), [Developer Hub — Authentication](https://developers.make.com/api-documentation/authentication.md)
- Public resources include organizations, teams, connections, scenarios, blueprints, logs, consumptions, templates, users, roles, keys, data stores, webhooks, and more. [Developer Hub — Make Developer Hub](https://developers.make.com/make-developer-hub.md), [Developer Hub — Scenarios](https://developers.make.com/api-documentation/api-reference/scenarios.md)
- The scenario API can list/filter scenarios, create/update/delete them, manage activity, activate/deactivate/schedule/run them, and retrieve blueprints. Scenario objects expose validity, active/paused/locked state, used apps/modules, schedule, unresolved incomplete executions, executions, errors, credits, transfer, labels, folders, and authors when requested. [Developer Hub — Scenarios](https://developers.make.com/api-documentation/api-reference/scenarios.md)
- The consumptions endpoint reports operations, transferred data, and centicredits for scenarios during the current reset period. [Developer Hub — Consumptions](https://developers.make.com/api-documentation/api-reference/scenarios/consumptions.md)
- The templates API lists, creates, updates, publishes, approves, deletes, and returns blueprints for templates. Template metadata includes used apps, visibility, publication/approval state, and team/organization. [Developer Hub — Templates](https://developers.make.com/api-documentation/api-reference/templates.md)
- The Developer Hub also advertises Make's MCP Server, Make CLI/SDK, event subscriptions, custom apps, and white-label documentation. [Developer Hub — Make Developer Hub](https://developers.make.com/make-developer-hub.md)

**Strategic inference**

The API/SDK model is a good boundary for MakeEase: workflows should be durable resources with typed revisions and logs, not browser-only state. MakeEase should expose API capabilities only after tenant, scope, idempotency, approval, and redacted-evidence semantics are defined. A “run” API must return a durable run ID/status rather than imply that an external side effect completed synchronously.

## Collaboration, governance, and lifecycle

### Verified vendor facts

- Organizations contain teams; scenarios, templates, connections, webhooks, keys, devices, data stores, data structures, custom functions, and credential requests belong to one team. A user can belong to multiple organizations/teams and have different roles. [Help — Teams](https://help.make.com/teams)
- Documented team roles include Team Admin, Team Member, Team Operator, Team Monitoring, Team Guest, and a deprecated restricted-member role. Operators can activate/deactivate/schedule; monitoring users can view selected scenarios/logs/usage without editing. [Help — Teams](https://help.make.com/teams)
- Scenario history records both executions and user changes. It supports filtering, hide-check-run/hide-change-log controls, CSV export, and, on Pro+, full-text search through execution output. [Help — Scenario history](https://help.make.com/scenario-history)
- Version history shows who saved a version and when; saved versions can be restored. Recovery can retrieve unsaved changes after a browser crash, disconnect, power outage, or closed tab, but the user must still save after recovery. [Help — Scenario version control](https://help.make.com/scenario-version-control)
- Public scenario links are viewable without login, but copying into a Make account requires sign-in. A shared link shows the latest saved version. [Help — Scenario sharing](https://help.make.com/scenario-sharing)
- Enterprise audit logs cover scenario, connection, webhook, key, team, variable, data-store, identity/access, private-space, credential, and related events; the documented retention is 12 months. [Help — Audit logs](https://help.make.com/audit-logs)
- Enterprise organizations can configure SSO using OIDC or SAML 2.0 and provision new users into teams. [Help — Single Sign-on](https://help.make.com/single-sign-on)

### Make Grid extends visibility beyond one scenario

**Verified vendor facts**

- Make Grid is described as a near-real-time, auto-generated dependency map of scenarios, apps, data stores, and AI components, intended to make inter-scenario dependencies and change impact visible. [Help — Introduction to Make Grid](https://help.make.com/introduction-to-make-grid)
- Grid can search inside blueprint/module configuration (including URLs, field values, notes, and AI prompts), filter by scenario properties, and show items needing attention such as queued webhooks, data-store capacity, incomplete executions, and deactivation. It has credits, data-transfer, and operations layers for the last 30 days and a last-sync indicator. [Help — Explore Make Grid](https://help.make.com/explore-make-grid)
- Grid has live teammate cursors/presence, layout editing, and view/edit access to some connected objects. This is documented collaboration in Grid; it is not evidence of simultaneous co-editing of a Scenario Builder graph. [Help — Grid navigation and interaction updates](https://help.make.com/make-grid-workspace-navigation-and-interaction-updates)
- Grid can connect to selected external providers to display their automations/AI agents. The documented provider example is Relevance AI; connections are per user, and sharing a space does not automatically grant other people that provider access. [Help — Connect external providers](https://help.make.com/connect-external-providers)

**Strategic inference**

Make supplies resource/role/version collaboration and a genuine cross-automation estate view. MakeEase should not claim that it uniquely visualizes dependencies or governs an automation estate: Grid already competes in that direction. MakeEase's clearer potential advantage is a first-class “draft → review → publish” lifecycle, reviewer assignment, policy diff, approval record, and outcome-oriented recovery for the specific support job. The person approving a customer-facing draft is not equivalent to someone with permission to edit the underlying workflow. The reviewed material is not sufficient to claim that Make has no approval or human-in-the-loop capability.

## AI and security material

### 1. AI product surface

**Verified vendor facts**

- Make's earlier AI-agent introduction describes an LLM, system prompt, context/knowledge, tools (modules/scenarios/MCP), and reasoning. That page is marked as a previous version; the same broad concepts appear in the current agent-app guide. [Help — Earlier introduction](https://help.make.com/introduction-to-ai-agents), [Help — Current agent reference](https://help.make.com/make-ai-agent-new-app)
- The current first-agent guide supports Make's AI Provider, OpenAI, Anthropic Claude, and other provider connections depending on plan; paid users can use custom provider connections and pay that provider directly for tokens. Agents support input files, conversation IDs/history, step timeouts, response formats, modules/scenarios/MCP tools, knowledge files, and test runs. [Help — Create your first AI agent](https://help.make.com/create-your-first-ai-agent), [Help — Credits](https://help.make.com/credits)
- The current agent reference documents reasoning effort, maximum output length, steps per agent call, bounded conversation history, step timeout, prompt caching, compaction, and an optional fallback connection. The current best-practices guide recommends precise tool names/descriptions, typed inputs/outputs, filtered tool output, limited data scope, relevant knowledge, and repeated testing. [Help — Current agent reference](https://help.make.com/make-ai-agent-new-app), [Help — Current agent best practices](https://help.make.com/make-ai-agent-new-best-practices)
- Knowledge files are stored in a RAG vector database so the agent retrieves relevant sections instead of passing an entire file. [Help — Create your first AI agent](https://help.make.com/create-your-first-ai-agent)
- Current best-practices guidance includes a human-validation pattern: send a tool output for review (for example, a Gmail draft via Slack) and have a person confirm/request changes before proceeding. This is a documented composition pattern, not evidence of a universal policy-enforced approval gate. [Help — Current agent best practices](https://help.make.com/make-ai-agent-new-best-practices)
- Maia is documented as an AI co-worker in the Scenario Builder that can create, modify, and debug scenarios through predefined tools. It acts only when explicitly prompted, shows tool actions on the canvas, can be reverted through previous scenario versions, and cannot run, activate, or deactivate scenarios. [Help — Maia system card](https://help.make.com/maia-by-make-system-card)
- The Maia system card says Make does not use customer prompts, scenario structures, or outputs to train/fine-tune the underlying LLM, and says Maia does not see connection keys. It also requires an AI-output disclosure and tells users to validate before running/activating. These are vendor statements, not independently verified attestations. [Help — Maia system card](https://help.make.com/maia-by-make-system-card)

### 2. Data-zone caveat

**Verified vendor facts**

- Make distinguishes an organization data zone (US1/US2/EU1/EU2) from the physical data region used by an AI provider. Selecting an EU Make zone does not guarantee every AI request stays in the EU. The official table says some Make AI features/OpenAI models route to the US, some Claude models route to the UK, and custom-provider routing follows the provider endpoint/project. [Help — AI providers and data zones in Make](https://help.make.com/ai-providers-and-data-zones-in-make)
- The same page says custom OpenAI/Anthropic/Gemini and other provider connections can remove Make's EU guarantee, depending on provider routing. [Help — AI providers and data zones in Make](https://help.make.com/ai-providers-and-data-zones-in-make)

**Strategic inference**

Make demonstrates the right UX pattern for AI-assisted building: changes are visible, bounded by tools, and reversible. MakeEase should adopt this for AI-generated workflow setup and drafts, but add policy and side-effect checks that are first-class in the run, not just an instruction in a prompt. Provider, region, data classification, and retention should be visible before a support thread is sent to a model.

### 3. Security controls available in public docs

**Verified vendor facts**

- Make documents connections with OAuth/API credentials, connection verification/reauthorization, API scopes, and an on-premise agent. [Help — Connect an application](https://help.make.com/connect-an-application), [Help — On-premise agent](https://help.make.com/on-premise-agent), [Developer Hub — API authentication](https://developers.make.com/api-documentation/authentication.md)
- Account 2FA uses an authenticator app and one-time recovery codes. [Help — Two-factor authentication](https://help.make.com/two-factor-authentication)
- Enterprise SSO supports OIDC and SAML 2.0. Enterprise audit logs retain documented activity for 12 months. [Help — Single Sign-on](https://help.make.com/single-sign-on), [Help — Audit logs](https://help.make.com/audit-logs)
- Public security-help pages describe AES, PGP, digital signatures, hashing, data confidentiality settings, and practical ways to avoid storing sensitive execution payloads. [Help — Securing data with Make](https://help.make.com/securing-data-with-make), [Help — Scenario settings](https://help.make.com/scenario-settings)

**Important boundary**

The accessible security material is product-help guidance and vendor system-card material. Because the public security landing/trust pages were blocked or unavailable, this research does not verify SOC reports, certification scope, penetration-test claims, SLA language, subprocessor commitments, or contractual data-processing terms.

## MakeEase decision matrix

### Adopt

| Make pattern | Why it is valuable | MakeEase implementation direction |
| --- | --- | --- |
| Typed, modular workflow steps | Makes provider work composable and inspectable | Keep a small typed step set: trigger, retrieve, classify, draft, approve, write-draft, notify, branch, delay. Add steps through versioned contracts. |
| Run-this-module/source preview and bundle evidence | Lets users debug mappings before a full run | Show a sample thread, source fields, mapped fields, and expected draft before any external write. Preserve per-step evidence. |
| Explicit operation/credit accounting | Makes engine behavior measurable | Keep server-side usage facts and a ledger, but present “threads/reviews” first and credit/provider details second. |
| Aggregator/iterator/router primitives | Handles realistic fan-out and conditional work | Add only when the support workflow needs them; always display fan-out and estimated side effects. |
| Error routes and incomplete execution queue | Treats failures as recoverable work | Implement a guided recovery queue with retry, human review, skip, cancel, and replay; retain original evidence and reason. |
| Templates with guided fields/defaults/help | Shortens time to first value | Build support-specific templates with policy questions, connection scope, sample thread, and an approval gate. |
| Blueprints/version history/recovery | Protects users from destructive edits | Store immutable workflow revisions; make draft/publish/rollback explicit; allow recovery without changing historical runs. |
| Team roles, history, audit, CSV export | Supports operational accountability | Separate workflow-edit permission, run permission, approval permission, and connection administration. Export redacted evidence. |
| Provider-neutral AI/tool boundary | Enables model replacement and bounded tool use | Use logical capabilities (`support.classify.v1`, `support.draft.v1`), model routing, source provenance, and allowlisted connector capabilities. |
| Visible AI builder changes and revert | Maia's strongest trust UX | Let AI propose or apply staged changes, narrate the change, show a diff, and require a human to publish/run. |
| Grid's dependency map, attention list, and last-sync indicator | Makes cross-system failure and change impact inspectable | Start with a factual dependency/health list for the support workflow; expand to a graph only as the estate grows. Show freshness and affected workflows before changing a connection or policy. |

### Improve

| Make friction | MakeEase improvement |
| --- | --- |
| Operations and credits are separate and dynamic | Use one understandable customer metric, show exact underlying usage, provide pre-run estimates and hard caps, and never hide AI/provider charges. |
| Mapping often requires running the source first | Ship declared schemas and representative samples; show field type, source, freshness, redaction, and transformation preview before the first run. |
| A blank canvas exposes too much power at once | Start with an outcome setup and a small stage view; reveal the graph and advanced functions progressively. |
| Error handlers require choosing technical semantics | Recommend a recovery policy from error class and effect risk; explain why retry/skip/resume/rollback is safe or unsafe. |
| Rollback is not reliable for external side effects | Require idempotency keys, effect risk labels, provider receipts, and an explicit “unknown outcome” state. Approval must precede high-risk writes. |
| Connections are team-wide resources and can be personal credentials | Scope connections to a workspace/environment and capability; warn when a personal account is shared; make connection use auditable. |
| Templates can be broad and require account setup | Curate a narrow support template catalog; let users use a local/sample run before connecting a live inbox; explain every permission. |
| Collaboration is mostly resource and version based | Add review requests, policy diffs, reviewer assignment, approval SLAs, and immutable release records. |
| AI data-zone behavior is nuanced | Show model/provider/region/retention on the run admission screen and block a route that violates workspace policy. |
| Public links dynamically show the latest saved version | Give MakeEase explicit snapshot sharing so a customer review or audit link cannot change silently after publication. |

### Reject for the MakeEase MVP

1. **General automation parity as a launch goal.** A giant connector catalog, arbitrary graph editing, and every Make primitive would delay the support outcome.
2. **Opaque credit top-ups or automatic overage.** Make's extra-credit behavior is a useful competitor fact, but it is a poor trust pattern for a small support team with customer-facing work.
3. **Autonomous external side effects by default.** Do not auto-send email, issue refunds, alter code, or modify customer records without an explicit policy and approval path.
4. **Public/untrusted workflow import as execution.** Imported templates/blueprints need schema validation, connector scope review, policy simulation, and a sandbox/test run.
5. **Prompt-only security.** Do not treat an AI instruction such as “never send” as the enforcement boundary; enforce capability and policy in the connector gateway.
6. **Rollback as a promise of exactly-once behavior.** External APIs may have accepted a request even when the client timed out. Record uncertainty and receipts instead.
7. **Model/provider choice as the main user decision.** Start with a governed logical capability and a sensible route; expose a model override only for users who need it.

## Assumptions and hypotheses to validate

The following are **not verified competitor facts**:

- **MakeEase's launch wedge:** This report uses the existing local [product decision review](../../PRODUCT-REVIEW.md) and [README](../../README.md) as the working scope: approval-first Gmail support drafts for small B2B SaaS teams. That is a MakeEase strategy decision, not market validation.
- **Usability hypothesis:** Outcome-first setup and a stage view will activate the support ICP faster than a blank general-purpose canvas. This needs a comparative usability test; documentation alone cannot establish task-completion time or conversion.
- **Pricing-comprehension hypothesis:** Reviewed threads plus a hard cap will be easier for this ICP to predict than operations/credits/dynamic AI usage. Test whether users can estimate a 100-thread week and explain the cap before charging.
- **Willingness-to-pay hypothesis:** Approval, grounding, evidence, and guided recovery will justify a premium over a low-entry-price general automation tool. No pricing interview, cohort, or customer purchase evidence was collected here.
- **Competitive-gap hypothesis:** An outcome-centered policy/review/evidence flow may be differentiated, but Make already has AI, dependency visualization, role controls, logs, and composable human validation. Do not infer that Make lacks a feature merely because it was not verified in this public-document review.
- **Acceptance thresholds:** The 10-minute activation target and the strict pre-run/recovery requirements below are proposed product targets, not measured MakeEase or Make performance.

## Five UX/product acceptance criteria for MakeEase

These are proposed acceptance tests for the MakeEase MVP, derived from the Make benchmark and the current support-wedge strategy. They are not Make product facts.

1. **First approved support result:** A new workspace can choose “Support inbox,” connect one Gmail label with read-only scope, confirm at least one policy, run a clearly labeled sample or consented thread, and reach an editable/approvable draft in **10 minutes or less** without configuring a second integration. The UI must show whether the thread is sample, sandbox, or live and must not claim a message was sent.
2. **Typed mapping before side effects:** For every mapped field, the builder shows source name, type, sample value, transformation, and destination type before execution. Invalid required mappings block the run with a repair action; implicit coercion is labeled. A reviewer can trace every draft sentence/input field to its source thread or approved knowledge record.
3. **Predictable usage admission:** Before queueing a run, MakeEase shows estimated provider/model usage, expected external actions, and remaining workspace budget. It atomically reserves the configured budget, stops admission at the hard cap, and records estimate/actual variance. No run may create a billable overage or external side effect without an owner-approved budget and policy decision.
4. **Recoverable, non-duplicating failure:** A failed step displays the error class, affected bundle/thread, redacted input/output evidence, retryability, and recommended action. Retry/replay uses an idempotency key and the original immutable workflow revision; an uncertain external result is not retried automatically. A reviewer can resolve the run from a queue without losing the original evidence or creating a duplicate customer message.
5. **Governed collaboration and audit:** Publishing a workflow creates an immutable revision with actor, policy version, connector scopes, model route, and approval requirements. A user with run permission cannot silently change the workflow or approve their own high-risk policy exception unless explicitly allowed. Every support draft decision records reviewer, time, edit/approve/reject/escalate outcome, sources used, and a redacted exportable audit record.

## Recommended MakeEase product posture

Use Make as the benchmark for **depth beneath the surface**:

- MakeEase should feel easier than Make for the first support task, not less capable forever.
- The first screen should be a job and boundary selector, not a blank scenario canvas.
- A canvas/graph can become an advanced view after the workflow earns a real run.
- The visible unit of value should be a reviewed support thread; operations, credits, tokens, and provider costs should remain inspectable underneath.
- Every AI or connector action should carry provenance, policy, effect risk, approval state, and outcome evidence.
- The differentiator is governed, observable, cross-system support work—not unsupported feature-parity claims.

## Source ledger

The following official sources were used for the facts above. The Help Center pages are public documentation; the Developer Hub pages are public developer/API documentation.

### Product, builder, mapping, and onboarding

- [What is Make?](https://help.make.com/what-is-make)
- [Create your first scenario](https://help.make.com/create-your-first-scenario)
- [Learn the basics](https://help.make.com/learn-the-basics)
- [Step 1: Plan your scenario](https://help.make.com/step-1-plan-your-scenario)
- [Types of modules](https://help.make.com/types-of-modules)
- [Canvas interaction model](https://help.make.com/canvas-interaction-model)
- [Schedule a scenario](https://help.make.com/schedule-a-scenario)
- [Scenario execution flow](https://help.make.com/scenario-execution-flow)
- [Scenario inputs and outputs](https://help.make.com/scenario-inputs-and-outputs)
- [Subscenarios](https://help.make.com/subscenarios)
- [Mapping](https://help.make.com/mapping)
- [Data & mapping](https://help.make.com/data-and-mapping)
- [Item data types](https://help.make.com/item-data-types)
- [Mapping arrays](https://help.make.com/mapping-arrays)
- [Router](https://help.make.com/router)
- [Aggregator](https://help.make.com/aggregator)
- [Test your scenario](https://help.make.com/step-9-test-your-scenario)

### Credits, pricing behavior, and operations

- [Credits](https://help.make.com/credits)
- [Credits & operations](https://help.make.com/credits-and-operations)
- [Operations](https://help.make.com/operations)
- [Extra credits](https://help.make.com/extra-credits)
- [Monthly and annual subscriptions](https://help.make.com/monthly-and-annual-subscriptions)
- [Adjustments to plans and pricing](https://help.make.com/adjustments-to-plans-and-pricing)
- [Change your subscription](https://help.make.com/change-your-subscription)
- [Credits per team management](https://help.make.com/credits-per-team-management)
- [Parallel capacity](https://help.make.com/parallel-capacity)
- [Maia by Make pricing](https://help.make.com/maia-by-make-pricing)

### Errors, history, templates, and collaboration

- [Introduction to errors and warnings](https://help.make.com/Introduction-to-errors-and-warnings)
- [Overview of error handling](https://help.make.com/Overview-of-error-handling)
- [Error handlers](https://help.make.com/error-handlers)
- [Retry error handler](https://help.make.com/retry-error-handler)
- [Resume error handler](https://help.make.com/resume-error-handler)
- [Commit error handler](https://help.make.com/commit-error-handler)
- [Rollback error handler](https://help.make.com/rollback-error-handler)
- [Incomplete executions](https://help.make.com/incomplete-executions)
- [Scenario settings](https://help.make.com/scenario-settings)
- [Scenario history](https://help.make.com/scenario-history)
- [Scenario version control](https://help.make.com/scenario-version-control)
- [Undo and redo scenario changes](https://help.make.com/undo-and-redo-scenario-changes)
- [Cycles removal on October 1, 2026](https://help.make.com/cycles-removal-on-october-1-2026)
- [Scenario templates](https://help.make.com/scenario-templates)
- [Create and manage scenario templates](https://help.make.com/create-and-manage-scenario-templates)
- [Scenario blueprints](https://help.make.com/blueprints)
- [Scenario sharing](https://help.make.com/scenario-sharing)
- [Clone a scenario](https://help.make.com/clone-a-scenario)
- [Teams](https://help.make.com/teams)
- [Audit logs](https://help.make.com/audit-logs)
- [Introduction to Make Grid](https://help.make.com/introduction-to-make-grid)
- [Explore Make Grid](https://help.make.com/explore-make-grid)
- [Make Grid workspace navigation and interaction updates](https://help.make.com/make-grid-workspace-navigation-and-interaction-updates)
- [Connect external providers](https://help.make.com/connect-external-providers)

### Integrations, API, AI, and security

- [Introduction to Make apps](https://help.make.com/introduction-to-make-apps)
- [Connect an application](https://help.make.com/connect-an-application)
- [On-premise agent](https://help.make.com/on-premise-agent)
- [Make Developer Hub](https://developers.make.com/make-developer-hub.md)
- [API getting started](https://developers.make.com/api-documentation/getting-started.md)
- [API authentication](https://developers.make.com/api-documentation/authentication.md)
- [API rate limiting](https://developers.make.com/api-documentation/getting-started/rate-limiting.md)
- [API scenarios](https://developers.make.com/api-documentation/api-reference/scenarios.md)
- [API scenario logs](https://developers.make.com/api-documentation/api-reference/scenarios/logs.md)
- [API scenario consumptions](https://developers.make.com/api-documentation/api-reference/scenarios/consumptions.md)
- [API templates](https://developers.make.com/api-documentation/api-reference/templates.md)
- [Custom Apps overview](https://developers.make.com/custom-apps-documentation/get-started/readme.md)
- [Custom-app modules](https://developers.make.com/custom-apps-documentation/create-your-first-app/apps-environment/module.md)
- [Mappable parameters](https://developers.make.com/custom-apps-documentation/component-blocks/mappable-parameters.md)
- [Introduction to AI agents](https://help.make.com/introduction-to-ai-agents)
- [Create your first AI agent](https://help.make.com/create-your-first-ai-agent)
- [Current agent reference](https://help.make.com/make-ai-agent-new-app)
- [Current agent best practices](https://help.make.com/make-ai-agent-new-best-practices)
- [Earlier agent best practices — marked previous version](https://help.make.com/ai-agent-best-practices)
- [Maia by Make system card](https://help.make.com/maia-by-make-system-card)
- [AI providers and data zones in Make](https://help.make.com/ai-providers-and-data-zones-in-make)
- [Securing data with Make](https://help.make.com/securing-data-with-make)
- [Scenario settings](https://help.make.com/scenario-settings)
- [Two-factor authentication](https://help.make.com/two-factor-authentication)
- [Single Sign-on](https://help.make.com/single-sign-on)
