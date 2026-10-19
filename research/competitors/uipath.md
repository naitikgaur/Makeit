# UiPath competitor research: agentic automation, RPA, orchestration, and governance

**Research date:** 2026-10-16  
**Scope:** UiPath's publicly available product pages, pricing page, and documentation. This is a product/architecture benchmark for MakeEase, not a claim that a local MakeEase demo is production-equivalent to UiPath.

## Reading guide

- **Verified fact** means the statement is directly described in an official UiPath page or documentation page linked below.
- **Vendor claim** means UiPath's own positioning, marketing promise, customer outcome, or certification statement. It may be true in the stated product/configuration, but it is not independent validation of every workload.
- **Inference** is analysis for MakeEase derived from those facts and from normal RPA operating constraints; it is not a UiPath statement.

## Executive assessment

UiPath is no longer positioned as only a desktop macro/RPA vendor. Its public platform story is a layered stack:

1. **Build:** Studio Desktop and Studio Web for low-code, coded, and AI-assisted workflows.
2. **Execute:** attended and unattended Robots, deterministic selectors, Computer Vision, semantic UI capabilities, ScreenPlay, and API workflows.
3. **Understand:** Document Understanding and the newer IXP positioning for documents, messages, and other unstructured content.
4. **Connect:** Integration Service for connectors, activities, triggers, webhooks, HTTP, MCP, and private-system Relay connectivity.
5. **Orchestrate:** Maestro BPMN, Flow, and Case Management for durable processes that combine robots, APIs, agents, and people.
6. **Govern:** Orchestrator, RBAC, folders/tenants, credential stores, policy controls, approvals, audit, AI Trust Layer, and deployment/data-residency options.

**Vendor claim:** UiPath's differentiator is one governed control plane across agents, robots, APIs, documents, and humans, with deterministic RPA for predictable work and agentic capabilities for changing or ambiguous work.  
**Inference for MakeEase:** The most relevant competitive lesson is not “copy every UiPath feature.” It is to make **permission boundaries, human escalation, durable state, and evidence** part of the automation product before adding broad desktop autonomy. UiPath's breadth also shows that reliable enterprise RPA is an operating system and governance problem, not just a click recorder.

## Product surface and architecture

| Layer | What the official material says | MakeEase interpretation |
|---|---|---|
| Studio | Studio supports low-code, code-first, AI-assisted, and mixed projects. Studio Desktop is a Windows IDE for advanced RPA/desktop/Citrix work; Studio Web is a browser-based IDE for agents, API workflows, processes, and apps and runs on Windows/macOS. | Separate authoring environment from execution environment. A cross-platform web editor does not mean arbitrary desktop automation is cross-platform. |
| Robots + Orchestrator | Robots execute Studio processes. Orchestrator provisions, deploys, triggers, monitors, measures, and tracks attended/unattended robots. | A runner needs a managed identity, machine/session model, package version, resource scope, and operational telemetry. |
| UI automation | UiPath describes a layered ladder: robust selectors, AI Computer Vision, semantic selectors/activities, ScreenPlay, and Healing Agent. | Use the most deterministic mechanism available; treat visual/semantic/agentic recovery as higher-uncertainty fallbacks that require tighter controls. |
| Integration Service | Activities, triggers, and connections are reusable building blocks. Connectors, HTTP/webhooks, Relay, and custom Connector Builder bridge SaaS, APIs, legacy systems, and private networks. | Prefer typed/API actions over screen scraping when available, but keep a governed UI adapter for systems without APIs. |
| Document processing | Document Understanding combines RPA and AI and supports structured, semi-structured, and unstructured content plus human validation. IXP is positioned as a unified cloud document/communications layer. | Extraction confidence, provenance, redaction, and human review are first-class workflow state, not just an AI result. |
| Maestro | BPMN, Flow, and Case Management share an orchestration backbone and surface instances in a common management view. | Represent process state explicitly and distinguish fixed paths from goal-/case-driven work. |
| Deployment | Automation Cloud is managed SaaS; Automation Cloud Dedicated adds dedicated infrastructure/data and customer-managed keys; Automation Suite is self-hosted on supported Kubernetes/Linux options and supports regulated/air-gapped scenarios with feature differences. | Hosting choice changes operational cost, capability availability, data boundary, and upgrade responsibility. |

## Desktop and browser automation boundaries

### What UiPath publicly documents

**Verified facts and vendor claims:**

- UiPath's RPA page says robots can interact with screens, systems, and data across **Windows and macOS**, including legacy applications and virtual environments such as Citrix, using Computer Vision and selectors. Source: [Enterprise-grade RPA](https://www.uipath.com/platform/agentic-automation/rpa).
- The UI automation page says selectors target the underlying UI structure for fast deterministic execution; Computer Vision is for image-only screens such as Citrix/virtual desktops; semantic selectors can target changing elements using natural language; semantic activities handle forms and pop-ups; ScreenPlay turns natural-language instructions into multi-step UI automation. Source: [UI automation](https://www.uipath.com/platform/agentic-automation/rpa/ui-automation).
- Studio Desktop is described as a **Windows-only** IDE for complex RPA, desktop, Citrix, coded workflows, and advanced debugging. Studio Web is described as a browser-based, Mac/Windows-compatible IDE for agentic and API-first automation. Source: [UiPath Studio](https://www.uipath.com/product/studio).
- Integration Service explicitly says that UI automation is the path for systems with no API, while connectors, HTTP, webhooks, and Relay cover API/event/private-system connectivity. Source: [Integration Service](https://www.uipath.com/product/integration-service).

### Practical boundary analysis

1. **Browser authoring is not browser-only execution.** Studio Web lets a builder work in a browser, but the published platform may still invoke API workflows, cloud services, or a desktop Robot. A MakeEase browser editor should expose the eventual executor and required permissions instead of implying that every flow runs inside the user's browser.
2. **Modern DOM/selector automation is the preferred reliability path.** Structured selectors can be fast and repeatable, but they depend on an accessible and stable UI tree. UI redesigns, dynamic identifiers, timing, pop-ups, authentication changes, and third-party anti-automation controls remain operational risks. The last sentence is an **inference**, not a UiPath guarantee.
3. **Image-only/Citrix automation is a different risk class.** Computer Vision expands coverage where selectors cannot reach, but screen recognition is sensitive to resolution, scaling, latency, focus, localization, and visual ambiguity. MakeEase should classify coordinate/image actions as higher risk than an API or stable semantic target and require stronger verification.
4. **Natural-language UI agents are not equivalent to deterministic workflows.** UiPath positions ScreenPlay as self-driving and adaptive, while also positioning deterministic selectors as the reliable choice for predictable, high-volume work. This supports a staged ladder: fixed selectors/API first, semantic/visual recovery second, agentic planning only with constrained tools and human escalation.
5. **Browser security/session boundaries still matter.** The public pages reviewed describe capabilities, but do not promise that every website, CAPTCHA, MFA challenge, cross-origin frame, browser profile, or anti-bot control can be automated. MakeEase should treat such conditions as explicit handoff/failure states rather than trying to bypass them.

### Reliability ladder for MakeEase

| Level | Typical executor | Expected behavior | Required guardrail |
|---|---|---|---|
| 0 | API/typed connector | Stable request/response contract | Allowlisted endpoint, schema validation, idempotency key |
| 1 | DOM/accessibility selector | Deterministic UI operation | Selector health check, bounded timeout, post-action assertion |
| 2 | Semantic selector/activity | Target survives some UI variation | Confidence threshold, screenshot/evidence, no irreversible action without confirmation |
| 3 | Computer Vision/image target | Operates on image-only/remote screen | Resolution/session checks, visual confirmation, human fallback |
| 4 | Screen agent/agentic recovery | Plans/adapts across several UI actions | Tool allowlist, action budget, preview/approval, full trace, immediate kill switch |

The ladder is **MakeEase analysis**, informed by UiPath's published layers; it is not an official UiPath reliability ranking.

## Attended and unattended bots

### Official operating model

The Orchestrator Robots documentation gives unusually concrete boundaries:

- **Attended Robots** act as personal assistants for end users and are suited to smaller, fragmented tasks requiring supervision. They run under the user's identity and should not receive permissions the user could not exercise. They generally cannot be started/triggered from Orchestrator or run under a locked screen; they are normally started from UiPath Assistant or command line. Source: [Robots: Attended Robots](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-robots#attended-robots).
- **Unattended Robots** run autonomously without human supervision for complex, repetitive, rule-driven work, including privileged operations. They should run under dedicated robot/application accounts rather than personal identities. Orchestrator is the central hub for triggers, resource management, folder permissions, and distributing work. Source: [Robots: Unattended Robots](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-robots#unattended-robots).
- For UI-interacting unattended jobs, the docs say the Robot needs machine login credentials. Background jobs can run without credentials in Session 0, but foreground/UI jobs without credentials are invalid. Source: [Robots: credentials](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-robots#unattended-robots-with-credentials-vs-without-credentials).
- Service Mode Robots are intended for unattended deployments and can automatically manage interactive Windows sessions. The documentation says the service runs under Local System and can open sessions with machine-administrator rights; this is a powerful capability and a significant blast-radius risk if permissions are not constrained. Source: [Robots: Service Mode](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-robots#the-service-mode-robot-service).
- Unattended licensing is allocated per runtime/slot at the machine-object level. The docs give an example where a machine template with 10 runtimes connected to four machines requires 40 tenant-level runtime licenses, even if not all jobs run simultaneously. Source: [Robots: licensing](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-robots#unattended-licensing).

### Implications

**Verified:** UiPath separates user identity, robot identity, machine registration, folder permissions, credentials, and runtime capacity.  
**Inference:** MakeEase should not implement “run in the background” as a boolean on a browser session. It needs at least:

- an explicit **human/attended** versus **robot/unattended** identity;
- a registered executor or sandbox and a session-health contract;
- resource and secret scopes that are narrower than the user's full machine access;
- concurrency/capacity accounting;
- a policy decision before a flow can move from attended to unattended execution.

The Service Mode description also illustrates a critical safety lesson: a runner with interactive-session and administrator privileges can be technically reliable while still being unsafe. Reliability must therefore include authorization correctness and blast-radius limits, not only successful clicks.

## Process orchestration, Maestro, and human tasks

### Maestro's model

**Verified facts:**

- Maestro unifies RPA bots, AI agents, API/system work, documents, and people. The public product page says an instance can hold state for hours, days, or weeks while waiting for a person, system, or event, and advertises no cap on duration or concurrency. Source: [Maestro Orchestrate](https://www.uipath.com/product/maestro).
- BPMN, Flow, and Case Management share the same orchestration backbone. The documentation distinguishes BPMN/Flow for paths known at design time from Case Management for long-lived, exception-heavy work where the next stage is selected at runtime. Source: [Choosing a Maestro modeler](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/choosing-a-maestro-modeler).
- Maestro can pause, resume, retry, cancel, migrate, or move through live instances, and exposes process history, variables, duration, completion, SLA data, dashboards, alerts, API access, and audit claims on its public product page. Source: [Maestro Orchestrate](https://www.uipath.com/product/maestro).
- BPMN user tasks are completed by people through Task Inbox; service tasks invoke automations/APIs/systems; script tasks evaluate inline logic; business-rule tasks use DMN/rules. Manual/send/receive task shapes may document work but are not executed by Maestro. Source: [Tasks in BPMN modeling](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/tasks-in-bpmn-modeling).
- BPMN supports message/timer/error events, gateways, retries/loops/markers, and explicit timeout/escalation patterns in its modeling guidance. Source: [BPMN primer](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/bpmn-primer).

### Why this matters for MakeEase

UiPath's orchestration answer is not simply “queue a script.” It records a durable business process and its actor handoffs. A safer MakeEase equivalent should:

1. persist a run as a state machine rather than relying on in-memory browser state;
2. make every side-effecting node identify its executor and permission scope;
3. support explicit wait states for approvals, credentials, MFA, missing documents, and external events;
4. distinguish retryable failures from non-retryable business decisions;
5. preserve completed work when resuming, rather than replaying an irreversible step blindly;
6. expose cancellation, pause, escalation, and operator takeover as normal lifecycle operations.

**Vendor claim versus expectation:** “No cap on duration or concurrency” is a product claim on the Maestro page, not an assurance that a customer's downstream application, credential, browser session, worker pool, or license budget has no limits. MakeEase should publish concrete per-tenant concurrency, queue, retention, and timeout behavior rather than borrowing an unlimited-sounding promise.

## Document processing and human-in-the-loop work

**Verified facts:**

- UiPath Document Understanding combines RPA and AI and can extract/interpret data from images, PDFs, handwriting, signatures, checkboxes, and tables using rules, templates, specialized models, or generative models. It can collect documents from sources and use human-in-the-loop validation. Source: [Document Understanding documentation](https://docs.uipath.com/document-understanding/automation-cloud/latest/user-guide/about-document-understanding).
- UiPath's IDP page positions the solution for communications, structured/semi-structured documents, complex/unstructured documents, and customizable validation. Source: [Intelligent Document Processing](https://www.uipath.com/platform/agentic-automation/idp).
- The pricing page places enterprise-scale document/communications classification and extraction in Standard/Enterprise offerings rather than the smallest Basic feature set. Source: [Plans and pricing](https://www.uipath.com/pricing).

**Inference for MakeEase:** document automation should be staged as **extract -> validate -> approve/repair -> commit**, with the extracted value, confidence, source span/page, model/version, reviewer, and final committed value all retained. A model's confidence score is not itself authorization to post a payment, change a customer record, or approve a regulated decision.

## Orchestrator, integrations, and enterprise controls

### Central operations

**Verified:** Orchestrator is marketed as a central control plane for provisioning, deployment, triggers, monitoring, measurement, and audit of attended and unattended work. UiPath also describes credential stores, OAuth 2.0, Active Directory group-based deployment, folders, dashboards, alerts, historical monitoring, API audit monitoring, and video timelines. Source: [Orchestrator](https://www.uipath.com/product/orchestrator).

**Inference:** MakeEase needs a central run ledger and policy layer even if the first executor is local. A successful local run without a durable receipt, actor identity, inputs/outputs, and failure reason will not scale into an enterprise control plane.

### Integration Service and private systems

**Verified:** Integration Service governs credentials, actions, and events across agents, robots, workflows, and apps; connections can be folder-scoped and protected with RBAC; credential access, connection use, and trigger activation are audit-visible. It supports pre-built connectors, HTTP, webhooks, custom Connector Builder, MCP, and Relay for private/on-premises systems. Source: [Integration Service](https://www.uipath.com/product/integration-service).

**Verified/vendor claim:** Automation Cloud Relay is described as one outbound-only connection to reach systems behind a firewall, without VPN or inbound ports, and with credentials remaining in a customer KeyVault in the relevant product description. Source: [Automation Cloud](https://www.uipath.com/product/automation-cloud).

**Inference:** “Connector” must mean more than a URL plus token. MakeEase should model connection ownership, allowed operations, environment, rotation/expiry, input/output redaction, and whether a connector is read-only or mutating. A tool allowlist should be enforced at execution time, not merely displayed in the editor.

## Security, AI governance, and deployment

### Publicly described governance controls

UiPath's security/governance page describes:

- RBAC, identity, tenant boundaries, SAML/OIDC/SCIM, and organization administration;
- Policy-as-Code and low-code policies versioned in Git and enforced at runtime;
- access, tool, cost, geo, content/safety, lifecycle, and audit policies;
- centralized guardrails such as tool restrictions, allow/deny lists, prompt-injection/jailbreak defenses, and PII masking;
- model validation, behavioral baselines, versioning, geo-residency, deprecation workflows, and BYOM governance;
- tamper-evident/append-only audit claims for agent actions, prompts, responses, tool calls, model versions, and human approvers;
- stated certifications/framework mappings including SOC 2 Type II, ISO/IEC 27001, ISO/IEC 42001, AIUC-1, HIPAA, FedRAMP Moderate, HITRUST, and others.

Source: [Security and Governance](https://www.uipath.com/platform/agentic-automation/foundation/security-governance) and [UiPath Trust Center](https://trust.uipath.com/).

**Vendor-claim caution:** these pages describe UiPath's control design and certification posture. Certification scope, region, product edition, retention, and contractual terms must be checked in the Trust Center and applicable agreements. The claims should not be generalized to every connector, customer deployment, model provider, or configuration without that verification.

### Deployment choices

**Verified:**

- Automation Cloud is fully managed SaaS, with UiPath handling infrastructure, security, and updates; the public page advertises automatic updates approximately twice monthly and no customer-managed servers/Kubernetes. Source: [Automation Cloud](https://www.uipath.com/product/automation-cloud).
- Automation Cloud Dedicated is described as dedicated compute/data, scheduled upgrade windows, and customer-managed encryption keys. Source: [Automation Cloud](https://www.uipath.com/product/automation-cloud).
- Automation Suite is the self-hosted, customer-managed platform. UiPath describes supported deployment on AKS, EKS, OpenShift, Linux VMs/bare metal, and air-gapped environments, with process logic, agent configuration, enterprise data, and audit trails kept inside the customer's perimeter. Source: [Automation Suite](https://www.uipath.com/product/automation-suite).
- UiPath's deployment comparison states that Automation Cloud has the broadest/current feature set and that self-hosted options have documented exceptions; its page specifically notes that some Maestro canvases or newer capabilities may be limited by deployment flavor. Source: [Deployment options](https://www.uipath.com/platform/agentic-automation/deployment-options).

**Inference:** deployment is a product decision, not a post-launch infrastructure checkbox. MakeEase should begin with a small, isolated local/sandbox runner and a cloud control plane only when data/permissions are understood; later self-hosting should be designed around the same policy and audit interfaces rather than requiring a rewrite.

## Pricing, licensing, and implementation cost

### Public prices and plan boundaries

The current public pricing page states:

- **Community:** free forever; build and automate with limited/community-oriented use.
- **Basic:** starts at **$25 per month**, hosted in the European region, with limited scale, 99.9% service uptime, and Bronze Support. The comparison shows one tenant, one folder, up to two robots, and user/scale limits; the page warns that users and Robots may require additional purchases.
- **Standard:** contact sales; intended for professional/enterprise programs, with enterprise automation, documents/communications at scale, orchestration of agents/robots/people, enhanced governance, BYO identity provider, opt-out of data collection, no stated scale limits, and selected-region or on-premises hosting.
- **Enterprise:** contact sales; adds resilient/self-healing UI automation, process monitoring/optimization/simulation, robot-infrastructure optimization, BYOM, customer-managed encryption keys, customer credential vaults, CI/CD flexibility, and multi-region/on-premises choices.
- Some testing add-ons have published list prices (for example ScreenPlay and Performance Testing on the Test Cloud section), but the page does not publish an equivalent complete price card for a production RPA/agentic program.

Source: [UiPath Plans and Pricing](https://www.uipath.com/pricing).

### Cost analysis

**Verified:** UiPath has a free Community tier and a $25/month Basic starting price, while Standard and Enterprise are contact-sales offerings. Unattended capacity is licensed through runtime slots in the documented Orchestrator model.  
**Not publicly quantified:** a comparable enterprise implementation price, partner/professional-services rate, full robot/agent/document consumption schedule, or total cost for a specific process.  
**Inference:** a realistic UiPath-style implementation budget has at least these components:

1. platform/user/robot/runtime and any document/agent consumption licenses;
2. process discovery and exception analysis;
3. Studio/workflow build, connector work, and test data;
4. unattended worker VMs, Windows licenses, browser profiles, Citrix/VDI, network/Relay, and credential vault integration where applicable;
5. security review, identity/RBAC, retention, and audit integration;
6. UAT, regression tests, release management, monitoring, support, and ongoing selector/application-drift maintenance;
7. self-hosted Kubernetes/backup/observability/upgrade operations when Automation Suite is selected.

The low entry price is therefore a useful experiment signal, not a production TCO estimate. For MakeEase, a staged pilot should cap both **license/compute spend** and **blast radius**, with an explicit go/no-go based on error rate, human-review rate, time saved, and operator hours.

## Reliability expectations: what is reasonable to promise

### UiPath's public reliability positioning

**Vendor claims:**

- UiPath calls deterministic RPA “reliable execution,” says it enforces business rules run after run, and describes precision at scale. Source: [Enterprise-grade RPA](https://www.uipath.com/platform/agentic-automation/rpa).
- The UI automation page says selector technology provides robust, deterministic execution and positions agentic capabilities as a way to adapt to changing interfaces. Source: [UI automation](https://www.uipath.com/platform/agentic-automation/rpa/ui-automation).
- Maestro claims durable execution through failures, restarts, and redeployments, plus live retry/pause/resume and a complete instance history. Source: [Maestro Orchestrate](https://www.uipath.com/product/maestro).
- Automation Cloud pricing/product pages advertise a 99.9% uptime figure/SLA for applicable plans or regions. Source: [Plans and pricing](https://www.uipath.com/pricing) and [Automation Cloud](https://www.uipath.com/product/automation-cloud).

### What those claims do not prove

The public pages do not provide a universal per-application success rate for arbitrary browser/desktop workflows. A service uptime SLA is not the same as a successful business transaction. A deterministic selector can still fail because the target application changed, a session expired, a popup obscured the target, a credential was revoked, a downstream API rejected a value, or a human approval timed out. AI/semantic recovery can increase coverage while adding nondeterminism.

**Inference for MakeEase:** publish reliability as measurable, workload-specific SLOs rather than a blanket “autonomous” promise. For each flow, track at minimum:

- successful end-to-end transactions;
- safe recoveries versus retries;
- false-positive/incorrect-action rate;
- human handoff and approval latency;
- selector/visual drift incidents;
- duplicate/partial side effects after retry;
- worker/session availability and queue delay;
- audit completeness and redaction failures.

Use dry-run/sandbox, attended pilot, limited unattended canary, and only then broader rollout. The operator must be able to pause or kill a run and know what has already committed.

## Competitive strengths and gaps (analysis)

### Strengths UiPath demonstrates

- **Breadth:** one vendor covers UI, API, documents, agents, orchestration, people, analytics, and governance.
- **Legacy reach:** selectors plus Computer Vision/Citrix support expand beyond APIs and modern DOMs.
- **Operational maturity:** attended/unattended distinction, machine/runtime slots, folders, triggers, credential stores, monitoring, and audit are explicit concepts.
- **Process durability:** Maestro treats days/weeks-long waits, human tasks, case exceptions, retries, and live intervention as normal.
- **Deployment flexibility:** SaaS, dedicated, on-premises, hybrid/private connectivity, and air-gapped claims address different enterprise constraints.
- **Governance as a product surface:** policy, identity, secret handling, model controls, approval, and evidence are not left entirely to individual workflow authors.

### Costs and exposure areas (inference)

- Feature breadth creates implementation and training complexity; customers need architecture and platform-operations expertise.
- Enterprise price transparency is limited; exact runtime, document, agent, connector, support, and self-hosting costs require sales validation.
- Desktop/Citrix automation requires managed machines, sessions, credentials, browser/application compatibility, and regression maintenance.
- Visual/semantic/agentic automation can be more resilient than brittle selectors but is harder to reason about and test exhaustively.
- Cloud and self-hosted deployments do not have identical feature availability or operational burden.
- Powerful unattended service sessions and privileged credentials make policy mistakes high impact even when the automation itself is technically reliable.

## Five concrete requirements for a safer staged MakeEase RPA roadmap

These requirements are the recommended minimum safety bar before MakeEase expands from local/browser demos to unattended enterprise automation.

### 1. Make executor, capability, and risk boundaries explicit

Every action must declare an executor (`api`, `browser-dom`, `desktop-selector`, `visual`, `agent`, or `human`), target/resource allowlist, read/write/irreversible classification, and risk level. The runtime must deny unknown capabilities by default.

**Stage gates:**

- **Stage 0:** dry-run/record-only; no external mutation.
- **Stage 1:** sandbox APIs and read-only browser actions with post-action assertions.
- **Stage 2:** attended desktop/visual actions with visible status and user takeover.
- **Stage 3:** unattended fixed workflows only on registered workers with approved scopes.
- **Stage 4:** agentic/semantic recovery only with bounded tools, action budget, and approval for material side effects.

### 2. Enforce least privilege and secret isolation at runtime

Use separate human and robot identities; scope connections to a workspace, environment, and operation; keep secrets in a vault or OS-protected store; never place credentials in prompts, workflow definitions, screenshots, or ordinary logs. Require step-up approval for privileged machine/session access.

**Acceptance evidence:** an authorization decision and credential reference (not the secret) appear in the run receipt; a negative test proves a flow cannot call an unlisted system or use a broader user permission.

### 3. Make human approval and safe interruption first-class

Irreversible, financial, regulated, destructive, or externally communicative actions must support preview/diff, explicit approval, expiry, reassignment/escalation, cancellation, and operator takeover. Document extraction and ambiguous UI results must be able to enter a human-review task rather than silently guessing.

**Acceptance evidence:** approval actor, timestamp, input version/hash, decision, and resulting action are linked in an immutable run history; cancel/pause does not lose the already-committed step or replay it accidentally.

### 4. Build durable, idempotent execution before unattended scale

Persist checkpoints and state outside the browser process. Give every mutating step an idempotency key or duplicate-detection strategy; use bounded retries, exponential backoff, timeouts, circuit breakers, compensation/manual-repair paths, and explicit “unknown outcome” handling. Detect session loss, UI drift, stale credentials, and downstream partial failure.

**Acceptance evidence:** fault-injection tests cover worker crash, browser crash, network timeout after commit, duplicate event, expired credential, changed selector, and human timeout; the process resumes without duplicate side effects.

### 5. Ship governance, observability, and release gates with the first runner

Version workflows, prompts, selectors, connector schemas, policies, and models. Require review/approval before production publication, separate dev/test/prod resources, support canary rollout and rollback, and emit correlation IDs plus structured events for every action. Redact secrets/PII while retaining enough evidence to reconstruct what happened.

**Minimum metrics:** end-to-end success rate, incorrect-action rate, retry/recovery rate, human-handoff rate, duplicate-side-effect rate, queue/worker availability, cost per completed transaction, and audit completeness. Define a stop/rollback threshold before enabling unattended execution.

## Official source index

The following public official URLs were used for the claims above:

1. [UiPath RPA Automation](https://www.uipath.com/platform/agentic-automation/rpa)
2. [UiPath UI Automation](https://www.uipath.com/platform/agentic-automation/rpa/ui-automation)
3. [UiPath Robots documentation](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-robots)
4. [UiPath Orchestrator](https://www.uipath.com/product/orchestrator)
5. [UiPath Maestro Orchestrate](https://www.uipath.com/product/maestro)
6. [Maestro overview documentation](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/overview)
7. [Choosing a Maestro modeler](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/choosing-a-maestro-modeler)
8. [Tasks in BPMN modeling](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/tasks-in-bpmn-modeling)
9. [BPMN primer](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/bpmn-primer)
10. [Intelligent Document Processing / IDP](https://www.uipath.com/platform/agentic-automation/idp)
11. [Document Understanding documentation](https://docs.uipath.com/document-understanding/automation-cloud/latest/user-guide/about-document-understanding)
12. [UiPath Integration Service](https://www.uipath.com/product/integration-service)
13. [Security and Governance](https://www.uipath.com/platform/agentic-automation/foundation/security-governance)
14. [UiPath Trust Center](https://trust.uipath.com/)
15. [Deployment options](https://www.uipath.com/platform/agentic-automation/deployment-options)
16. [Automation Cloud](https://www.uipath.com/product/automation-cloud)
17. [Automation Suite](https://www.uipath.com/product/automation-suite)
18. [Plans and pricing](https://www.uipath.com/pricing)
19. [UiPath Studio](https://www.uipath.com/product/studio)
