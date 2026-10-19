import { escapeHtml, formatDateTime, formatNumber, initials, relativeTime, safeNumber, statusLabel, statusTone, titleCase } from "./utils.js";
import { icon } from "./icons.js";
import { filterConnectors, getCapabilityLabels, getConnectorCategories, getEffectDisplay, getRiskDisplay, getSetupSteps, normalizeConnectorCatalog } from "./connector-catalog.js";

const viewTitles = {
  overview: "Overview", workflows: "Support workflows", editor: "Workflow details",
  "ai-workers": "Workflow roles", approvals: "Review queue", runs: "Run history",
  integrations: "Connections", knowledge: "Policies & references", analytics: "Insights",
  billing: "Plans & usage", security: "Workspace controls", settings: "Settings"
};

const fallbackTemplates = [
  { id: "customer-support-triage", name: "Customer support triage", description: "Classify an incoming customer request and draft a safe response plan.", steps: ["Understand the request", "Search company knowledge", "Draft a response plan", "Request internal approval"] },
  { id: "new-lead-follow-up", name: "New lead follow-up", description: "Turn a lead brief into a concise, reviewable follow-up draft.", steps: ["Summarize the lead", "Match relevant knowledge", "Draft follow-up options", "Request internal approval"] },
  { id: "weekly-business-briefing", name: "Weekly business briefing", description: "Create a structured internal briefing from supplied operating context.", steps: ["Collect the supplied context", "Identify themes", "Draft a briefing", "Highlight open questions"] },
  { id: "engineering-issue-assistant", name: "Engineering issue assistant", description: "Break an engineering issue into a bounded internal implementation plan.", steps: ["Parse the issue", "Find relevant knowledge", "Draft implementation steps", "List verification checks"] }
];

const fallbackModels = [
  { id: "makeease-small", label: "MakeEase Fast" },
  { id: "makeease-medium", label: "MakeEase Reasoning" }
];

const workspace = (state) => state.workspace || {};
const records = (state, key) => Array.isArray(workspace(state)[key]) ? workspace(state)[key] : [];
const workflows = (state) => records(state, "workflows");
const runs = (state) => records(state, "runs");
const approvals = (state) => records(state, "approvals");
const knowledge = (state) => records(state, "knowledge");
const integrations = (state) => records(state, "integrations");
const activity = (state) => records(state, "activity");
const auditEvents = (state) => {
  const events = records(state, "auditEvents");
  return events.length ? events : records(state, "audit");
};
const ledgerEntries = (state) => records(state, "ledger");
const workspaceName = (state) => workspace(state).name || "MakeEase workspace";
const userName = (state) => workspace(state).owner?.name || "Workspace owner";
const usage = (state) => workspace(state).usage || {};
const templates = (state) => state.templates?.length ? state.templates : fallbackTemplates;
const models = (state) => state.models?.length ? state.models : fallbackModels;
const pending = (state, key) => state.pendingKeys?.has(key) || false;
const disabled = (condition) => condition ? "disabled aria-disabled=\"true\"" : "";
let currentRenderState = null;
let connectorDirectoryInteraction = { category: "all", query: "" };

function modeInfo(state) {
  return state?.serverBacked ? {
    className: "server-backed",
    badge: "Local preview",
    workspace: "Local preview",
    record: "Local preview record",
    run: "Local sandbox run",
    recipe: "local preview",
    persistence: "Core workflow, run, review, and reference records persist in the local adapter.",
    title: "Local preview. Records persist locally; no external actions run.",
    defaultNotice: "Core workflow and review records are stored by the local adapter. No external systems are contacted."
  } : {
    className: "browser-only",
    badge: "Browser preview",
    workspace: "Browser preview",
    record: "Browser preview record",
    run: "Browser simulation",
    recipe: "browser preview",
    persistence: "Changes are stored in this browser only.",
    title: "Browser preview. Changes stay in this browser; no local adapter is connected.",
    defaultNotice: "This browser preview stores changes in this browser. No local adapter or external systems are contacted."
  };
}

function modelLabel(state, id) {
  return models(state).find((model) => model.id === id)?.label || (id ? titleCase(id) : "Local simulation");
}

function balance(state) {
  const current = usage(state);
  const included = safeNumber(current.limit ?? current.included);
  const used = safeNumber(current.used);
  const reserved = safeNumber(current.reserved);
  const topup = safeNumber(current.topup);
  return { included, used, reserved, topup, available: safeNumber(current.available, Math.max(included + topup - used - reserved, 0)) };
}

function workerList(state) {
  return workflows(state).map((workflow) => ({
    id: workflow.id, name: workflow.workerName || `${workflow.name} worker`,
    description: workflow.workerRole || workflow.description || "Prepares an output for this workflow.",
    status: workflow.status === "active" ? "ready" : workflow.status || "draft",
    model: workflow.model, runs: safeNumber(workflow.runs), requiresApproval: workflow.requiresApproval !== false
  }));
}

function status(value) {
  return `<span class="pill ${statusTone(value)}"><span class="pill-dot" aria-hidden="true"></span>${escapeHtml(statusLabel(value))}</span>`;
}

function emptyState(title, text, action = "", iconName = "inbox") {
  return `<div class="empty-state"><span class="empty-icon">${icon(iconName)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>${action}</div>`;
}

function heading(title, description, actions = "", eyebrow = "") {
  return `<div class="page-heading"><div class="heading-copy">${eyebrow ? `<div class="eyebrow">${escapeHtml(eyebrow)}</div>` : ""}<h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</div>`;
}

function sectionHeading(title, description = "", actions = "") {
  return `<div class="section-header"><div><h2>${escapeHtml(title)}</h2>${description ? `<p>${escapeHtml(description)}</p>` : ""}</div>${actions}</div>`;
}

function progress(value, max, label, tone = "teal") {
  const percent = max > 0 ? Math.min(Math.max(Math.round(value / max * 100), 0), 100) : 0;
  return `<div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="${escapeHtml(label)}"><span class="progress-fill progress-${tone}" style="width:${percent}%"></span></div>`;
}

function metric(label, value, detail, iconName, tone = "neutral") {
  return `<article class="metric-card"><div class="metric-top"><span>${escapeHtml(label)}</span>${icon(iconName, "sm")}</div><strong class="metric-value metric-${tone}">${escapeHtml(value)}</strong><span class="metric-foot">${escapeHtml(detail)}</span></article>`;
}

function localNotice(stateOrText, text = "") {
  const state = stateOrText && typeof stateOrText === "object" ? stateOrText : currentRenderState;
  const message = typeof stateOrText === "string" ? stateOrText : text;
  const mode = modeInfo(state);
  const previewNote = state?.serverBacked && state.previewOnly ? " This specific preview preference is stored in this browser; core records remain in the local adapter." : "";
  const resolvedMessage = `${(message || mode.defaultNotice).replaceAll("local preview", mode.recipe).replaceAll("Local preview", mode.badge)}${previewNote}`;
  return `<div class="local-notice ${mode.className}">${icon("shield", "sm")}<div><strong>${escapeHtml(mode.badge)}</strong><span>${escapeHtml(resolvedMessage)}</span></div></div>`;
}

function renderPacketSummary(state) {
  const packet = workspace(state).packetUsage || {};
  const prepared = safeNumber(packet.prepared);
  const limit = packet.limit === null ? null : safeNumber(packet.limit, 500);
  const remaining = packet.remaining === null || limit === null ? "Custom" : formatNumber(Math.max(remainingValue(packet.remaining, limit - prepared), 0));
  return `<section class="packet-capacity-card" aria-label="Support review packet capacity"><div><span class="section-kicker">Customer-facing capacity</span><h2>Support review packets</h2><p>A packet is one support request prepared for human review. It is not a sent message or a resolved ticket.</p></div><div class="packet-capacity-facts"><strong>${formatNumber(prepared)}</strong><span>prepared</span><strong>${escapeHtml(remaining)}</strong><span>remaining</span><em>No automatic send or overage</em></div></section>`;
}

function remainingValue(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function modeAwareMarkup(markup, state) {
  const mode = modeInfo(state);
  const profileStorage = state?.serverBacked ? "Workspace profile fields save in the local adapter. No external account is changed." : "Saved in this browser. No external account is changed.";
  const connectionDescription = state?.serverBacked ? "Connection state is simulated by the local adapter." : "Connection state is simulated in this browser-only demo.";
  const controlsDescription = state?.serverBacked ? "These preferences are local adapter preview records." : "These preferences are browser-only demo records.";
  const addPacketSummary = state?.view === "overview" && !markup.includes("packet-capacity-card");
  return markup
    .replace(addPacketSummary ? '<section class="overview-hero">' : "\u0000", addPacketSummary ? `${renderPacketSummary(state)}<section class="overview-hero">` : "\u0000")
    .replaceAll("Workspace command center", "Prepare support drafts for review")
    .replaceAll("See what is ready, what needs a decision, and how much safe capacity remains.", "Turn one support request into a grounded, reviewable draft without giving an opaque bot the final say.")
    .replaceAll("Review inbox", "Review queue")
    .replaceAll("Open review queue", "Open review queue")
    .replaceAll("Build workflow", "Start support triage")
    .replaceAll("Launch workspace", "Approval-first support")
    .replaceAll("releases the held credits", "moves held credits to used")
    .replaceAll("Connection state in this preview is simulated.", connectionDescription)
    .replaceAll("These preferences are local preview records.", controlsDescription)
    .replaceAll("Saved in this browser. No external account is changed.", profileStorage)
    .replaceAll("<span>Local workspace</span>", `<span>${escapeHtml(mode.workspace)}</span>`)
    .replaceAll("Local workflow run records", `${mode.workspace} workflow run records`)
    .replaceAll("local run records", `${mode.recipe} run records`);
}

function renderOutput(output, emptyText = "No output was captured for this record.") {
  if (output === null || output === undefined || output === "") return `<p class="output-empty">${escapeHtml(emptyText)}</p>`;
  if (typeof output !== "object") return `<div class="prose-output">${escapeHtml(output)}</div>`;
  if (output.supportPacket) {
    const packet = output.supportPacket;
    const draft = packet.groundedDraft || output.groundedDraft || {};
    const classification = packet.classification || output.classification || {};
    const urgency = packet.urgency || output.urgency || {};
    const escalation = packet.escalation || output.escalation || {};
    const missing = Array.isArray(packet.missingFacts) ? packet.missingFacts : [];
    const evidence = Array.isArray(packet.evidence) ? packet.evidence : [];
    return `<div class="support-packet-summary"><div class="packet-summary-head"><div><span class="section-kicker">Support review packet</span><h3>${escapeHtml(packet.packetId || output.packetId || "Prepared locally")}</h3></div><span class="soft-badge">Draft only · not sent</span></div><div class="packet-facts"><div><span>Intent</span><strong>${escapeHtml(classification.label || "Needs review")}</strong></div><div><span>Urgency</span><strong>${escapeHtml(urgency.level || "medium")}</strong></div><div><span>Escalation</span><strong>${escapeHtml(escalation.level || "human_review")}</strong></div><div><span>Evidence</span><strong>${formatNumber(evidence.length)} source${evidence.length === 1 ? "" : "s"}</strong></div></div><div class="packet-draft"><span>Prepared draft</span><p>${escapeHtml(draft.text || "No draft was prepared; review the packet manually.")}</p></div>${missing.length ? `<div class="packet-missing"><strong>Missing information</strong><span>${escapeHtml(missing.join(", "))}</span></div>` : ""}<div class="packet-boundary">${icon("shield", "sm")} ${escapeHtml(packet.limitations?.[0] || "No external action is authorized or performed.")}</div></div><details class="raw-output"><summary>View complete packet evidence</summary><pre class="output-block">${escapeHtml(JSON.stringify(packet, null, 2))}</pre></details>`;
  }
  const entries = Object.entries(output);
  if (!entries.length) return `<p class="output-empty">${escapeHtml(emptyText)}</p>`;
  const valueMarkup = (value) => {
    if (typeof value === "object" && value !== null) return `<pre class="inline-json">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
    return `<p>${escapeHtml(value === null ? "Not provided" : value)}</p>`;
  };
  return `<dl class="output-fields">${entries.map(([key, value]) => `<div><dt>${escapeHtml(titleCase(key.replace(/([a-z])([A-Z])/g, "$1 $2")))}</dt><dd>${valueMarkup(value)}</dd></div>`).join("")}</dl><details class="raw-output"><summary>View raw output</summary><pre class="output-block">${escapeHtml(JSON.stringify(output, null, 2))}</pre></details>`;
}

function renderActivity(state, limit = 5) {
  const list = activity(state).slice(0, limit);
  if (!list.length) return emptyState("No activity yet", "Local runs, review decisions, and workspace changes will be recorded here.", "", "history");
  return `<div class="activity-list">${list.map((item) => `<div class="activity-row"><span class="activity-icon">${icon(/approval|review/i.test(item.action || "") ? "inbox" : "history", "sm")}</span><div class="activity-copy"><strong>${escapeHtml(item.action || item.title || "Workspace change")}</strong><span>${escapeHtml(item.detail || "Local workspace record")}</span></div><time datetime="${escapeHtml(item.createdAt || "")}" title="${escapeHtml(formatDateTime(item.createdAt))}">${escapeHtml(item.createdAt ? relativeTime(item.createdAt) : item.time || "Recorded locally")}</time></div>`).join("")}</div>`;
}

function renderRunTable(state, limit = 8) {
  const list = runs(state).slice(0, limit);
  if (!list.length) return emptyState("No runs to show", "Open a workflow and run a local test to see its input, output, and review status here.", `<button class="button button-secondary button-sm" data-view="workflows" type="button">Open workflows ${icon("arrow", "sm")}</button>`, "history");
  return `<div class="table-wrap"><table class="data-table run-table"><caption class="sr-only">Local workflow run records</caption><thead><tr><th scope="col">Workflow</th><th scope="col">Status</th><th scope="col" class="numeric">Credits</th><th scope="col">Created</th><th scope="col"><span class="sr-only">Run details</span></th></tr></thead><tbody>${list.map((run) => `<tr><td data-label="Workflow"><div class="table-title"><span class="table-icon">${icon("play", "sm")}</span><div><button class="name-button" data-action="open-run" data-id="${escapeHtml(run.id)}" type="button">${escapeHtml(run.workflowName || workflows(state).find((workflow) => workflow.id === run.workflowId)?.name || "Workflow run")}</button><span class="record-id">${escapeHtml(run.id)}</span></div></div></td><td data-label="Status">${status(run.status)}</td><td data-label="Credits" class="numeric">${formatNumber(run.credits)}</td><td data-label="Created"><time datetime="${escapeHtml(run.createdAt || "")}" title="${escapeHtml(formatDateTime(run.createdAt))}">${escapeHtml(run.createdAt ? relativeTime(run.createdAt) : "Not recorded")}</time></td><td class="row-action"><button class="icon-button" data-action="open-run" data-id="${escapeHtml(run.id)}" type="button" aria-label="Inspect ${escapeHtml(run.workflowName || "workflow")} run">${icon("chevron", "sm")}</button></td></tr>`).join("")}</tbody></table></div>`;
}

function renderWorkflowTable(state, list) {
  return `<div class="table-wrap"><table class="data-table workflow-table"><caption class="sr-only">Workflows in this local workspace</caption><thead><tr><th scope="col">Workflow</th><th scope="col">Status</th><th scope="col">Review</th><th scope="col" class="numeric">Runs</th><th scope="col" class="numeric">Run limit</th><th scope="col"><span class="sr-only">Workflow details</span></th></tr></thead><tbody>${list.map((workflow) => `<tr><td data-label="Workflow"><div class="table-title"><span class="table-icon">${icon("workflow", "sm")}</span><div><button class="name-button" data-action="open-workflow" data-id="${escapeHtml(workflow.id)}" type="button">${escapeHtml(workflow.name)}</button><span class="table-description">${escapeHtml(workflow.description || "No description added")}</span></div></div></td><td data-label="Status">${status(workflow.status)}</td><td data-label="Review"><span class="review-policy">${icon(workflow.requiresApproval === false ? "minus" : "user", "sm")}${workflow.requiresApproval === false ? "Not required" : "Required"}</span></td><td class="numeric" data-label="Runs">${formatNumber(workflow.runs)}</td><td class="numeric" data-label="Run limit">${formatNumber(workflow.budgetCredits)}<span class="table-unit"> credits</span></td><td class="row-action"><button class="icon-button" data-action="open-workflow" data-id="${escapeHtml(workflow.id)}" type="button" aria-label="Open ${escapeHtml(workflow.name)}">${icon("chevron", "sm")}</button></td></tr>`).join("")}</tbody></table></div>`;
}

export function renderSidebar(state) {
  const activeView = state.view === "editor" ? "workflows" : state.view;
  const reviewCount = approvals(state).filter((item) => item.status === "pending").length;
  const currentBalance = balance(state);
  const sections = [
    ["Workspace", [["overview", "Overview", "grid"], ["workflows", "Support workflows", "workflow"], ["approvals", "Review queue", "inbox", reviewCount], ["runs", "Run history", "history"]]],
    ["Resources", [["knowledge", "Policies & references", "book"], ["integrations", "Connections", "plug"], ["ai-workers", "Workflow roles", "cpu"], ["analytics", "Insights", "chart"]]],
    ["Manage", [["billing", "Plans & usage", "card"], ["security", "Controls", "shield"], ["settings", "Settings", "settings"]]]
  ];
  return `<aside class="sidebar ${state.mobileNavOpen ? "open" : ""}" id="sidebar" aria-label="Workspace navigation"><div class="sidebar-top"><a class="brand" href="#overview" data-view="overview" aria-label="MakeEase overview"><span class="brand-mark">${icon("brand")}</span><span class="brand-word">MakeEase</span></a><button class="icon-button sidebar-close" data-action="close-nav" type="button" aria-label="Close navigation">${icon("close")}</button></div><button class="workspace-switcher" data-view="settings" type="button" aria-label="Workspace settings for ${escapeHtml(workspaceName(state))}"><span class="workspace-avatar">${escapeHtml(initials(workspaceName(state)))}</span><span class="workspace-copy"><strong>${escapeHtml(workspaceName(state))}</strong><span>Local workspace</span></span>${icon("down", "sm")}</button><nav class="main-nav" aria-label="Main navigation">${sections.map(([label, items]) => `<div class="nav-group"><div class="nav-label">${label}</div>${items.map(([id, text, iconName, count]) => `<button class="nav-item ${activeView === id ? "active" : ""}" data-view="${id}" type="button" ${activeView === id ? 'aria-current="page"' : ""}>${icon(iconName, "sm")}<span>${text}</span>${count ? `<span class="nav-count">${formatNumber(count)}<span class="sr-only"> pending</span></span>` : ""}</button>`).join("")}</div>`).join("")}</nav><div class="sidebar-footer"><div class="sidebar-usage"><div class="sidebar-usage-head"><span>${escapeHtml(titleCase(workspace(state).plan || "starter"))} plan</span><button class="text-button" data-view="billing" type="button">Usage ${icon("arrow", "sm")}</button></div>${progress(currentBalance.used, currentBalance.included + currentBalance.topup, "Workspace credits used")}<p><strong>${formatNumber(currentBalance.available)}</strong> credits available</p></div><button class="user-card" data-view="settings" type="button"><span class="user-avatar">${escapeHtml(initials(userName(state)))}</span><span class="user-copy"><strong>${escapeHtml(userName(state))}</strong><span>${escapeHtml(workspace(state).owner?.role || "Owner")}</span></span>${icon("settings", "sm")}</button></div></aside>`;
}

export function renderTopbar(state) {
  const title = viewTitles[state.view] || "Overview";
  const mode = modeInfo(state);
  return `<header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" data-action="toggle-nav" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="${state.mobileNavOpen}" type="button">${icon("menu")}</button><div class="breadcrumb"><span>${escapeHtml(workspaceName(state))}</span><span class="crumb-divider" aria-hidden="true">/</span><strong>${escapeHtml(title)}</strong></div></div><div class="topbar-right"><span class="mode-badge ${mode.className}" title="${escapeHtml(mode.title)}"><span class="mode-dot" aria-hidden="true"></span>${escapeHtml(mode.badge)}</span><button class="icon-button" data-action="export-workspace" type="button" aria-label="Export workspace JSON" title="Export workspace">${icon("download", "sm")}</button><button class="topbar-avatar" data-view="settings" type="button" aria-label="Open settings for ${escapeHtml(userName(state))}">${escapeHtml(initials(userName(state)))}</button></div></header>`;
}

export function renderShell(state, content) {
  const mode = modeInfo(state);
  const persistence = mode.persistence;
  return modeAwareMarkup(`<div class="app-shell">${renderSidebar(state)}<button class="sidebar-overlay ${state.mobileNavOpen ? "open" : ""}" data-action="close-nav" type="button" aria-label="Close navigation" tabindex="-1"></button><div class="main-content">${renderTopbar(state)}<main class="page-view page-${escapeHtml(state.view || "overview")}" id="main-content" tabindex="-1">${content}</main><footer class="workspace-footer"><span>${icon("lock", "sm")} ${escapeHtml(mode.badge)}</span><span>${persistence}</span></footer></div></div>`, state);
}

function renderStartGuide(state) {
  const firstWorkflow = workflows(state).find((workflow) => /support/i.test(workflow.name)) || workflows(state)[0];
  return `<section class="card start-guide">${sectionHeading("Your first reviewable workflow", "Start with one support request, then inspect the result.", '<span class="soft-badge">Quick start</span>')}<ol class="setup-list"><li><span class="setup-number">1</span><div><strong>Choose the job</strong><p>Support triage is a practical first workflow.</p></div><button class="text-button" data-action="${firstWorkflow ? "open-workflow" : "new-workflow"}" ${firstWorkflow ? `data-id="${escapeHtml(firstWorkflow.id)}"` : 'data-template-id="customer-support-triage"'} type="button">${firstWorkflow ? "Open flow" : "Choose template"} ${icon("arrow", "sm")}</button></li><li><span class="setup-number">2</span><div><strong>Add a policy or reference</strong><p>Use refund rules, escalation guidance, or tone examples.</p></div><button class="text-button" data-action="new-knowledge" type="button">Add context ${icon("arrow", "sm")}</button></li><li><span class="setup-number">3</span><div><strong>Test, inspect, and review</strong><p>Run a sample request. Nothing is sent to a customer.</p></div><button class="text-button" ${firstWorkflow ? `data-action="quick-run" data-id="${escapeHtml(firstWorkflow.id)}"` : 'data-action="new-workflow" data-template-id="customer-support-triage"'} type="button">Run a test ${icon("arrow", "sm")}</button></li></ol></section>`;
}

export function renderOverview(state) {
  const queue = approvals(state).filter((item) => item.status === "pending");
  const active = workflows(state).filter((item) => item.status === "active").length;
  const currentBalance = balance(state);
  const firstReview = queue[0];
  const failed = runs(state).filter((item) => ["failed", "error"].includes(item.status));
  const reviewCard = `<section class="card review-summary"><div class="review-summary-icon ${queue.length ? "needs-review" : ""}">${icon(queue.length ? "inbox" : "check")}</div><div class="review-summary-copy"><div class="section-kicker">Review queue</div><h2>${queue.length ? `${queue.length} item${queue.length === 1 ? "" : "s"} ready for your review` : "Your review queue is clear"}</h2><p>${queue.length ? "Check prepared outputs and record a decision before work is marked complete." : "New outputs will appear here when a workflow has human review enabled."}</p></div><button class="button ${queue.length ? "button-primary" : "button-secondary"}" data-view="approvals" type="button">${queue.length ? "Review outputs" : "View queue"} ${icon("arrow", "sm")}</button></section>`;
  return `${heading("Workspace overview", "Keep track of prepared work, review decisions, and workflow activity.", `<button class="button button-primary" data-action="new-workflow" data-template-id="customer-support-triage" type="button">${icon("plus", "sm")} New workflow</button>`)}${localNotice()}<div class="metric-grid">${metric("Active workflows", String(active), `${workflows(state).length} workflows in this workspace`, "workflow")}${metric("Awaiting review", String(queue.length), queue.length ? "Human decision required" : "Nothing waiting right now", "inbox", queue.length ? "amber" : "neutral")}${metric("Recorded runs", formatNumber(runs(state).length), "Records in the current snapshot", "history")}${metric("Available credits", formatNumber(currentBalance.available), `${formatNumber(currentBalance.reserved)} held for review`, "bolt")}</div>${reviewCard}${failed.length ? `<div class="inline-alert inline-alert-error">${icon("alert", "sm")}<div><strong>${failed.length} run${failed.length === 1 ? " needs" : "s need"} attention</strong><span>Inspect the recorded error before running the workflow again.</span></div><button class="text-button" data-action="open-run" data-id="${escapeHtml(failed[0].id)}" type="button">Inspect run ${icon("arrow", "sm")}</button></div>` : ""}${!runs(state).length ? renderStartGuide(state) : ""}<div class="overview-grid"><section class="card">${sectionHeading("Recent runs", "Input, output, and status stay together.", '<button class="text-button" data-view="runs" type="button">View history ' + icon("arrow", "sm") + '</button>')}${renderRunTable(state, 5)}</section><aside class="card overview-queue">${sectionHeading("Up next", firstReview ? "The next decision in your queue." : "A focused place to start.")}${firstReview ? `<div class="next-review"><span class="pill pill-amber"><span class="pill-dot"></span>Needs review</span><h3>${escapeHtml(firstReview.title)}</h3><p>${escapeHtml(firstReview.detail || "Inspect this prepared output and record your decision.")}</p><dl class="compact-facts"><div><dt>Workflow</dt><dd>${escapeHtml(workflows(state).find((item) => item.id === firstReview.workflowId)?.name || "Workspace review")}</dd></div><div><dt>Reserved credits</dt><dd>${formatNumber(firstReview.credits)}</dd></div></dl><button class="button button-secondary button-block" data-action="open-approval" data-id="${escapeHtml(firstReview.id)}" type="button">Open review ${icon("arrow", "sm")}</button></div>` : `<div class="next-review"><span class="section-icon">${icon("inbox")}</span><h3>Start with support triage</h3><p>Classify one customer request, prepare a next step, and keep human approval in the flow.</p><button class="button button-secondary button-block" data-action="new-workflow" data-template-id="customer-support-triage" type="button">Use support template ${icon("arrow", "sm")}</button></div>`}</aside></div><section class="card activity-card">${sectionHeading("Recent activity", "Changes recorded in this local workspace.")}${renderActivity(state)}</section>`;
}

function renderTemplate(template, featured = false) {
  return `<article class="template-card ${featured ? "featured" : ""}"><span class="template-icon">${icon(featured ? "inbox" : "file", "sm")}</span><div class="template-copy"><div class="template-heading"><h3>${escapeHtml(template.name)}</h3>${featured ? '<span class="soft-badge">Recommended</span>' : ""}</div><p>${escapeHtml(template.description || "A starting point for repeatable work.")}</p><span class="template-meta">${template.steps?.length || 3} steps · ${escapeHtml(modeInfo(currentRenderState).recipe)}</span></div><button class="button button-secondary button-sm" data-action="new-workflow" data-template-id="${escapeHtml(template.id)}" type="button">Use template ${icon("arrow", "sm")}</button></article>`;
}

export function renderWorkflows(state) {
  const list = workflows(state);
  const filter = state.workflowFilter || "all";
  const query = String(state.workflowQuery || "").trim().toLowerCase();
  const filtered = list.filter((workflow) => (filter === "all" || workflow.status === filter) && (!query || `${workflow.name} ${workflow.description || ""}`.toLowerCase().includes(query)));
  const filters = [["all", "All workflows"], ["active", "Active"], ["paused", "Paused"], ["draft", "Drafts"]];
  const noMatches = list.length && (query || filter !== "all");
  return `${heading("Workflows", "Define a repeatable job, set a run limit, and choose where human review belongs.", `<button class="button button-primary" data-action="new-workflow" data-template-id="customer-support-triage" type="button">${icon("plus", "sm")} New workflow</button>`)}<section class="card workflow-results"><div class="section-toolbar"><div class="filter-group" role="group" aria-label="Filter workflows by status">${filters.map(([id, label]) => `<button class="filter ${filter === id ? "active" : ""}" data-action="workflow-filter" data-filter="${id}" aria-pressed="${filter === id}" type="button">${label}<span>${formatNumber(id === "all" ? list.length : list.filter((workflow) => workflow.status === id).length)}</span></button>`).join("")}</div><label class="search">${icon("search", "sm")}<span class="sr-only">Search workflows</span><input id="workflow-search" type="search" placeholder="Search workflows…" value="${escapeHtml(state.workflowQuery || "")}" autocomplete="off" /></label></div><p class="sr-only" role="status">${filtered.length} matching workflow${filtered.length === 1 ? "" : "s"}</p>${filtered.length ? renderWorkflowTable(state, filtered) : emptyState(noMatches ? "No workflows found" : "Create your first workflow", noMatches ? "Try a different search or clear the status filter." : "Support triage is a useful first job. Start with its template and keep review enabled.", noMatches ? '<button class="button button-secondary button-sm" data-action="clear-workflow-filters" type="button">Clear filters</button>' : '<button class="button button-primary button-sm" data-action="new-workflow" data-template-id="customer-support-triage" type="button">' + icon("plus", "sm") + ' Create support workflow</button>')}</section><details class="template-library" ${list.length ? "" : "open"}><summary><span>Start from a template</span><span class="muted">${templates(state).length} starting points ${icon("down", "sm")}</span></summary><div class="template-grid">${templates(state).map((template) => renderTemplate(template, template.id === "customer-support-triage")).join("")}</div></details>`;
}

function renderWorkflowSteps(state, workflow) {
  const nodes = [
    ["Manual input", "A request you provide", "play"],
    ["Workspace context", `${knowledge(state).length} reference records available`, "book"],
    ["Local simulation", "Prepares a sample output", "cpu"],
    [workflow.requiresApproval === false ? "Record result" : "Human review", workflow.requiresApproval === false ? "Review is not required" : "Approve or reject internally", workflow.requiresApproval === false ? "file" : "user"]
  ];
  return `<section class="card workflow-definition">${sectionHeading("Workflow steps", "A read-only view of this local test flow.", '<span class="soft-badge">Manual trigger</span>')}<ol class="workflow-steps">${nodes.map(([label, description, iconName], index) => `<li><span class="node-icon">${icon(iconName, "sm")}</span><div><span class="node-step-label">Step ${index + 1}</span><strong>${label}</strong><p>${escapeHtml(description)}</p></div></li>`).join("")}</ol></section>`;
}

export function renderWorkflowDetail(state) {
  const workflow = workflows(state).find((item) => item.id === state.selectedWorkflowId);
  if (!workflow) return `${heading("Workflow not found", "This workflow is not in the current workspace snapshot.")}${emptyState("Choose a workflow", "Open a workflow to inspect its steps and run a local test.", '<button class="button button-secondary" data-view="workflows" type="button">Back to workflows</button>')}`;
  const latestRun = runs(state).find((run) => run.workflowId === workflow.id);
  const review = latestRun && approvals(state).find((item) => item.runId === latestRun.id && item.status === "pending");
  const busy = pending(state, `workflow-status-${workflow.id}`);
  return `<button class="back-link" data-view="workflows" type="button">${icon("back", "sm")} All workflows</button>${heading(workflow.name, workflow.description || "A repeatable job with a visible run limit and review policy.", `${status(workflow.status)}<button class="button button-secondary" data-action="toggle-workflow-status" data-id="${escapeHtml(workflow.id)}" type="button" ${disabled(busy)}>${icon(workflow.status === "active" ? "pause" : "play", "sm")}${workflow.status === "active" ? "Pause" : "Mark active"}</button>`)}${localNotice("Tests use a deterministic local simulation. No AI provider is contacted, and no output is sent outside this workspace.")}<div class="editor-layout"><div class="editor-main">${renderWorkflowSteps(state, workflow)}<section class="card test-panel">${sectionHeading("Run a local test", "Use a sample support request or paste approved reference text.", `<span class="soft-badge">${formatNumber(workflow.budgetCredits)} credits max</span>`)}<form id="run-form" aria-busy="${Boolean(state.runBusy)}"><label class="form-label" for="run-input">Task or request</label><textarea class="form-textarea" id="run-input" name="input" placeholder="Example: A customer asks about a duplicate invoice. Classify the request and outline a response for review." required aria-describedby="run-help">${escapeHtml(state.runInput || "")}</textarea><div class="test-form-footer"><p class="form-help" id="run-help">Creates a local run record${workflow.requiresApproval === false ? "." : " and a review item."}</p><button class="button button-primary" type="submit" ${disabled(state.runBusy)}>${state.runBusy ? '<span class="spinner"></span> Running test…' : icon("play", "sm") + " Run test"}</button></div></form></section><section class="card result-panel">${sectionHeading("Latest result", latestRun ? formatDateTime(latestRun.createdAt) : "The output from your next test will appear here.", latestRun ? status(latestRun.status) : "")}${state.runBusy ? '<div class="result-loading" role="status"><span class="spinner"></span><span>Preparing a local result…</span></div>' : latestRun ? renderOutput(latestRun.output) : emptyState("No result yet", "Run a local test to inspect the sample output and follow it into review.", "", "file")}${latestRun ? `<div class="result-actions"><button class="text-button" data-action="open-run" data-id="${escapeHtml(latestRun.id)}" type="button">Inspect run ${icon("arrow", "sm")}</button>${review ? `<button class="button button-secondary button-sm" data-action="open-approval" data-id="${escapeHtml(review.id)}" type="button">Review output ${icon("arrow", "sm")}</button>` : ""}</div>` : ""}</section></div><aside class="editor-side"><section class="card inspector-card">${sectionHeading("Run boundary")}<dl class="compact-facts"><div><dt>Execution</dt><dd>Local simulation</dd></div><div><dt>Profile</dt><dd>${escapeHtml(modelLabel(state, workflow.model))}</dd></div><div><dt>Maximum per run</dt><dd>${formatNumber(workflow.budgetCredits)} credits</dd></div><div><dt>Human review</dt><dd>${workflow.requiresApproval === false ? "Not required" : "Required"}</dd></div><div><dt>Recorded runs</dt><dd>${formatNumber(workflow.runs)}</dd></div></dl><p class="context-note">${icon("shield", "sm")} Marking a workflow active updates its local status. Tests are started manually.</p></section><section class="card context-card">${sectionHeading("Approved context", "Policies and notes available in this workspace.")}${knowledge(state).length ? `<ul class="context-list">${knowledge(state).slice(0, 4).map((item) => `<li>${icon("book", "sm")}<span>${escapeHtml(item.title)}</span></li>`).join("")}</ul>` : '<p class="muted small">No reference records yet. Add a policy or process note to make the intended context explicit.</p>'}<button class="text-button" data-view="knowledge" type="button">Manage knowledge ${icon("arrow", "sm")}</button></section></aside></div>`;
}

export function renderWorkers(state) {
  const list = workerList(state);
  return `${heading("Workers", "A worker is the role attached to a workflow. Its scope and review policy come from that workflow.")}<div class="info-banner">${icon("info", "sm")}<div><strong>One role per workflow</strong><p>Workers are local configuration records in this preview. They do not run in the background or contact AI providers.</p></div></div>${list.length ? `<div class="worker-grid">${list.map((worker) => `<article class="card worker-card"><div class="worker-card-head"><span class="worker-avatar">${icon("cpu")}</span>${status(worker.status)}</div><h2>${escapeHtml(worker.name)}</h2><p>${escapeHtml(worker.description)}</p><dl class="worker-facts"><div><dt>Profile</dt><dd>${escapeHtml(modelLabel(state, worker.model))}</dd></div><div><dt>Review</dt><dd>${worker.requiresApproval ? "Required" : "Off"}</dd></div><div><dt>Runs</dt><dd>${formatNumber(worker.runs)}</dd></div></dl><div class="worker-card-footer"><button class="button button-secondary button-sm" data-action="open-workflow" data-id="${escapeHtml(worker.id)}" type="button">Open workflow ${icon("arrow", "sm")}</button><button class="icon-button" data-action="toggle-worker" data-id="${escapeHtml(worker.id)}" type="button" aria-label="${worker.status === "ready" ? "Pause" : "Resume"} ${escapeHtml(worker.name)}" ${disabled(pending(state, `workflow-status-${worker.id}`))}>${icon(worker.status === "ready" ? "pause" : "play", "sm")}</button></div></article>`).join("")}</div>` : `<section class="card">${emptyState("No workers yet", "Create a workflow to give a worker one clear job.", '<button class="button button-primary button-sm" data-action="new-workflow" type="button">' + icon("plus", "sm") + ' Create workflow</button>', "cpu")}</section>`}`;
}

function renderApprovalDetail(state, approval) {
  const run = runs(state).find((item) => item.id === approval.runId);
  const workflow = workflows(state).find((item) => item.id === approval.workflowId);
  const busy = pending(state, `approval-${approval.id}`) || pending(state, `approval-save-${approval.id}`);
  return `<section class="card approval-detail" id="review-detail" tabindex="-1">${sectionHeading(approval.title || "Output review", workflow?.name || "Workspace review", status(approval.status))}<dl class="approval-meta"><div><dt>Created</dt><dd>${escapeHtml(approval.createdAt ? formatDateTime(approval.createdAt) : "Not recorded")}</dd></div><div><dt>Credits held</dt><dd>${formatNumber(approval.credits)}</dd></div></dl>${run?.input ? `<details class="request-context"><summary>Original request</summary><p>${escapeHtml(run.input)}</p></details>` : ""}<div class="review-output"><h3>Prepared output</h3>${renderOutput(run?.output || approval.output)}</div><div class="approval-callout">${icon("shield", "sm")}<p><strong>Records an internal decision only.</strong> Approval does not send a message, create a pull request, or change another service.</p></div>${approval.status === "pending" ? `<div class="approval-actions"><button class="button button-secondary" data-action="approval-decision" data-id="${escapeHtml(approval.id)}" data-decision="reject" type="button" ${disabled(busy)}>Reject output</button><button class="button button-primary" data-action="approval-decision" data-id="${escapeHtml(approval.id)}" data-decision="approve" type="button" ${disabled(busy)}>${busy ? '<span class="spinner"></span>' : icon("check", "sm")}Approve internally</button></div>` : `<div class="decision-note">${icon(approval.status === "approved" ? "check" : "x", "sm")} ${escapeHtml(statusLabel(approval.status))}${approval.decidedAt ? ` · ${escapeHtml(formatDateTime(approval.decidedAt))}` : ""}</div>`}</section>`;
}

export function renderApprovals(state) {
  const queue = approvals(state).filter((item) => item.status === "pending");
  const history = approvals(state).filter((item) => item.status !== "pending");
  const selected = approvals(state).find((item) => item.id === state.selectedApprovalId) || queue[0];
  return `${heading("Review queue", "Inspect prepared outputs and record a decision. Customer-facing actions stay with your team.", `<span class="pill ${queue.length ? "pill-amber" : "pill-muted"}"><span class="pill-dot"></span>${queue.length ? `${queue.length} awaiting review` : "Queue clear"}</span>`)}<div class="approval-layout"><section class="card approval-queue">${sectionHeading("Awaiting review", "Select an item to inspect its output.")}${queue.length ? `<div class="approval-list">${queue.map((item) => `<button class="approval-row ${selected?.id === item.id ? "selected" : ""}" data-action="open-approval" data-id="${escapeHtml(item.id)}" aria-pressed="${selected?.id === item.id}" type="button"><span class="approval-icon">${icon("file", "sm")}</span><span class="approval-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail || "Prepared output ready for review")}</span><small>${escapeHtml(item.createdAt ? relativeTime(item.createdAt) : "Recorded locally")} · ${formatNumber(item.credits)} credits</small></span>${icon("chevron", "sm")}</button>`).join("")}</div>` : emptyState("All caught up", "New outputs appear here after a workflow test with review enabled.", '<button class="button button-secondary button-sm" data-view="workflows" type="button">Open workflows</button>', "check")}</section>${selected ? renderApprovalDetail(state, selected) : `<section class="card review-empty">${emptyState("Nothing waiting for a decision", "Run a test with human review enabled to follow an output from preparation to approval.", "", "check")}</section>`}</div><section class="card decision-history">${sectionHeading("Decision history", "The latest decisions recorded in this workspace.")}${history.length ? `<div class="history-list">${history.slice(0, 8).map((item) => `<button class="history-row" data-action="open-approval" data-id="${escapeHtml(item.id)}" type="button"><span class="history-icon ${item.status === "rejected" ? "rejected" : ""}">${icon(item.status === "approved" ? "check" : "x", "sm")}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.decidedAt ? formatDateTime(item.decidedAt) : "Decision time not recorded")}</small></span>${status(item.status)}${icon("chevron", "sm")}</button>`).join("")}</div>` : '<div class="compact-empty">Approved and rejected outputs will appear here after the first decision.</div>'}</section>`;
}

function connectorDirectoryHasEntries(value) {
  if (Array.isArray(value)) return value.some((item) => item !== null && item !== undefined);
  if (!value || typeof value !== "object") return false;
  const nestedFields = ["connectors", "connectorCatalog", "connector_catalog", "catalog", "items", "apps", "integrations", "results", "data"];
  const nested = nestedFields.filter((field) => Object.prototype.hasOwnProperty.call(value, field));
  if (nested.length) return nested.some((field) => connectorDirectoryHasEntries(value[field]));
  return Object.keys(value).some((key) => !["loading", "status", "error", "message"].includes(key) && value[key] !== null && value[key] !== undefined);
}

function connectorDirectoryData(state) {
  const currentWorkspace = workspace(state);
  const candidates = [
    state?.connectorCatalog,
    state?.connectors,
    state?.catalog?.connectors,
    currentWorkspace.connectorCatalog,
    currentWorkspace.connectors
  ];
  for (const candidate of candidates) {
    if (!connectorDirectoryHasEntries(candidate)) continue;
    const list = normalizeConnectorCatalog(candidate);
    if (list.length) return { list, fromCatalog: true };
  }
  return { list: normalizeConnectorCatalog(integrations(state)), fromCatalog: false };
}

function connectorIdentifiers(connector) {
  return [connector?.id, connector?.key, connector?.connectorId, connector?.connectorKey]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map((value) => String(value));
}

function connectorPreviewRecords(state) {
  const currentWorkspace = workspace(state);
  return [
    ...(Array.isArray(state?.connectorPreviews) ? state.connectorPreviews : []),
    ...(Array.isArray(currentWorkspace.connectorPreviews) ? currentWorkspace.connectorPreviews : []),
    ...(state?.connectorPreview ? [state.connectorPreview] : [])
  ];
}

function connectorPreviewSelected(state, connector) {
  const identifiers = new Set(connectorIdentifiers(connector));
  const integration = integrations(state).find((item) => connectorIdentifiers(item).some((id) => identifiers.has(id)));
  const integrationPreview = Boolean(integration && (integration.previewSelected || integration.connected || ["connected", "ready", "configured"].includes(String(integration.status || "").toLowerCase())));
  const catalogPreview = Boolean(connector.previewSelected || connector.connected || ["connected", "ready", "configured"].includes(String(connector.status || "").toLowerCase()));
  const storedPreview = connectorPreviewRecords(state).some((item) => {
    const itemConnector = item?.connector && typeof item.connector === "object" ? item.connector : item;
    return connectorIdentifiers(itemConnector).some((id) => identifiers.has(id)) || identifiers.has(String(item?.connectorId || item?.connectorKey || ""));
  });
  return Boolean(state.selectedConnectorId && identifiers.has(String(state.selectedConnectorId))) || integrationPreview || catalogPreview || storedPreview;
}

function connectorDirectoryQuery(state) {
  const value = state?.connectorQuery ?? state?.integrationQuery;
  return String(value === undefined ? connectorDirectoryInteraction.query : value).trim();
}

function connectorDirectoryCategory(state) {
  const value = state?.connectorCategory ?? state?.connectorFilter;
  return String(value === undefined ? connectorDirectoryInteraction.category : value).trim() || "all";
}

function renderConnectorCapabilities(connector) {
  const capabilities = getCapabilityLabels(connector);
  if (!capabilities.length) return `<p class="connector-detail-empty">Capabilities were not provided in this catalog record.</p>`;
  return `<ul class="connector-capability-list">${capabilities.map((label) => `<li><span class="connector-capability-dot" aria-hidden="true"></span><span>${escapeHtml(label)}</span></li>`).join("")}</ul>`;
}

function renderConnectorSetup(connector) {
  const steps = getSetupSteps(connector);
  if (!steps.length) return `<p class="connector-detail-empty">Setup guidance was not provided by this catalog record. No credentials are requested here.</p>`;
  return `<ol class="connector-setup-list">${steps.map((step) => `<li><span class="connector-setup-number">${formatNumber(step.number)}</span><div><strong>${escapeHtml(step.title)}</strong>${step.description ? `<p>${escapeHtml(step.description)}</p>` : ""}${step.optional ? '<span class="connector-setup-optional">Optional</span>' : '<span class="connector-setup-required">Catalog step</span>'}</div></li>`).join("")}</ol>`;
}

function renderConnectorDirectoryCard(state, connector, index, fromCatalog, hidden = false) {
  const previewReady = connectorPreviewSelected(state, connector);
  const risk = getRiskDisplay(connector);
  const effect = getEffectDisplay(connector);
  const category = connector.category || connector.categories?.[0] || "Workspace tool";
  const cardId = `connector-directory-card-${index + 1}`;
  const busy = pending(state, `integration-${connector.id}`)
    || pending(state, `connector-preview-${connector.id}-workspace-catalog`)
    || pending(state, `connector-clear-${connector.id}`);
  const action = previewReady
    ? `<button class="button button-secondary button-sm" data-action="clear-connector-preview" data-id="${escapeHtml(connector.id)}" data-connector-id="${escapeHtml(connector.id)}" type="button" ${disabled(busy)}>Clear preview</button>`
    : `<button class="button button-primary button-sm" data-action="select-connector-preview" data-id="${escapeHtml(connector.id)}" data-connector-id="${escapeHtml(connector.id)}" type="button" ${disabled(busy)}>Add to workflow preview ${icon("arrow", "sm")}</button>`;
  const sourceLabel = fromCatalog ? "Server catalog metadata" : "Integration record";
  const categoryIndex = [category, ...(connector.categories || [])].filter(Boolean).join("|");
  const searchIndex = connector.searchText || [connector.name, connector.provider, category, connector.description, ...(connector.capabilityLabels || []), ...(connector.effectLabels || [])].filter(Boolean).join(" ");
  return `<article class="connector-directory-card"${hidden ? " hidden" : ""} data-connector-card data-connector-category="${escapeHtml(categoryIndex)}" data-connector-search-text="${escapeHtml(searchIndex)}" aria-labelledby="${escapeHtml(cardId)}-title"><div class="connector-directory-card-head"><span class="integration-logo connector-directory-logo" aria-hidden="true">${escapeHtml(initials(connector.name))}</span><span class="pill ${previewReady ? "pill-teal" : "pill-muted"}"><span class="pill-dot"></span>${previewReady ? "Preview ready" : "Not configured"}</span></div><div class="connector-directory-card-title"><div><h2 id="${escapeHtml(cardId)}-title">${escapeHtml(connector.name)}</h2><p class="connector-directory-provider">${escapeHtml(connector.provider || category)}</p></div><span class="connector-directory-category">${escapeHtml(category)}</span></div><p class="connector-directory-description">${escapeHtml(connector.description || "Catalog metadata for a bounded workflow preview.")}</p><div class="connector-directory-labels" aria-label="${escapeHtml(connector.name)} risk and effect labels"><span class="pill ${escapeHtml(risk.className)}" title="${escapeHtml(risk.description)}"><span class="pill-dot"></span>Risk · ${escapeHtml(risk.label)}</span><span class="pill ${escapeHtml(effect.className)}" title="${escapeHtml(effect.label)}"><span class="pill-dot"></span>Effect · ${escapeHtml(effect.label)}</span>${risk.requiresApproval || effect.requiresApproval ? '<span class="soft-badge connector-approval-label">Review gate suggested</span>' : ""}</div><div class="connector-directory-details"><section class="connector-detail-block" aria-labelledby="${escapeHtml(cardId)}-capabilities"><h3 id="${escapeHtml(cardId)}-capabilities">Capabilities</h3>${renderConnectorCapabilities(connector)}</section><section class="connector-detail-block" aria-labelledby="${escapeHtml(cardId)}-setup"><h3 id="${escapeHtml(cardId)}-setup">Setup steps</h3>${renderConnectorSetup(connector)}</section></div><div class="connector-directory-boundary" role="note">${icon("lock", "sm")}<span>Preview metadata only. No account access in this demo; this card does not authorize an account, collect credentials, or contact ${escapeHtml(connector.provider || connector.name)}.</span></div><div class="connector-directory-card-foot"><span class="connector-directory-source">${escapeHtml(sourceLabel)} · no live connection</span>${action}</div></article>`;
}

export function renderIntegrations(state) {
  const directory = connectorDirectoryData(state);
  const query = connectorDirectoryQuery(state);
  const categories = getConnectorCategories(directory.list);
  const requestedCategory = connectorDirectoryCategory(state);
  const category = requestedCategory === "all" || categories.some((item) => item.toLowerCase() === requestedCategory.toLowerCase()) ? requestedCategory : "all";
  const filtered = filterConnectors(directory.list, { category, query });
  const previewCount = directory.list.filter((connector) => connectorPreviewSelected(state, connector)).length;
  const sourceDescription = directory.fromCatalog
    ? "Review the server-provided connector catalog, its declared capabilities, and the setup guidance for a safe workflow preview."
    : "No connector catalog was returned, so the current integration records are shown with the same preview-only boundary.";
  const filters = ["all", ...categories.filter((item) => item.toLowerCase() !== "all")];
  const filterMarkup = filters.map((item) => {
    const active = String(category).toLowerCase() === String(item).toLowerCase();
    const count = item === "all" ? directory.list.length : filterConnectors(directory.list, { category: item }).length;
    return `<button class="filter connector-directory-filter ${active ? "active" : ""}" data-connector-category="${escapeHtml(item)}" data-filter="${escapeHtml(item)}" aria-pressed="${active}" type="button">${escapeHtml(item === "all" ? "All categories" : item)}<span>${formatNumber(count)}</span></button>`;
  }).join("");
  const resultText = `${formatNumber(filtered.length)} connector${filtered.length === 1 ? "" : "s"} shown${query ? ` for “${query}”` : ""}`;
  const filteredIds = new Set(filtered.map((connector) => String(connector.id)));
  const body = directory.list.length
    ? `<div class="connector-directory-grid">${directory.list.map((connector, index) => renderConnectorDirectoryCard(state, connector, index, directory.fromCatalog, !filteredIds.has(String(connector.id)))).join("")}</div><div class="connector-directory-filter-empty-state" data-connector-directory-empty ${filtered.length ? "hidden" : ""}>${emptyState("No matching connectors", "Try a different search term or category. The catalog is metadata only; no live connection is inferred.", "", "plug")}</div>`
    : emptyState("No connector records", "You can still create workflows and run local tests without connecting a provider.", "", "plug");
  return `${heading("Connections", sourceDescription, `<span class="soft-badge">${formatNumber(previewCount)} preview-ready</span>`, "Connector directory")}${localNotice("Connector entries describe possible workflow context. Add to workflow preview records a local selection only; it never authorizes an account or performs an external action.")}<section class="connector-directory" aria-labelledby="connector-directory-heading"><div class="connector-directory-head"><div><div class="section-kicker">${directory.fromCatalog ? "Server catalog" : "Workspace records"}</div><h2 id="connector-directory-heading">Available connectors</h2><p>${directory.fromCatalog ? "The full catalog is presented as returned; inspect each connector before choosing preview context." : "Showing current integration records because no connector catalog is present."}</p></div><div class="connector-directory-head-meta"><span class="soft-badge">${formatNumber(directory.list.length)} item${directory.list.length === 1 ? "" : "s"}</span><span class="connector-directory-safety">${icon("shield", "sm")} Preview only</span></div></div><div class="connector-directory-toolbar"><div class="connector-directory-toolbar-copy"><strong>Filter the directory</strong><span>Search names, categories, capabilities, effects, risk, or setup steps.</span></div><label class="search connector-directory-search">${icon("search", "sm")}<span class="sr-only">Search connectors</span><input id="connector-search" data-connector-search type="search" placeholder="Search connectors…" value="${escapeHtml(query)}" autocomplete="off" /></label></div><div class="connector-directory-filters" role="group" aria-label="Filter connectors by category">${filterMarkup || '<span class="connector-directory-filter-empty">No categories returned</span>'}</div><p class="connector-directory-results" data-connector-directory-results role="status" aria-live="polite">${escapeHtml(resultText)}</p>${body}</section>`;
}

function foldConnectorDirectoryText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function applyConnectorDirectoryDomFilter(root) {
  if (!root) return;
  const input = root.querySelector("[data-connector-search]");
  const query = foldConnectorDirectoryText(input?.value || "");
  const tokens = query ? query.split(/\s+/).filter(Boolean) : [];
  const activeFilter = root.querySelector("[data-connector-category].active")?.dataset.connectorCategory || "all";
  const foldedCategory = foldConnectorDirectoryText(activeFilter);
  const cards = [...root.querySelectorAll("[data-connector-card]")];
  let visible = 0;
  cards.forEach((card) => {
    const searchText = foldConnectorDirectoryText(card.dataset.connectorSearchText);
    const categories = String(card.dataset.connectorCategory || "").split("|").map(foldConnectorDirectoryText);
    const categoryMatches = !foldedCategory || foldedCategory === "all" || categories.includes(foldedCategory);
    const searchMatches = tokens.every((token) => searchText.includes(token));
    const matches = categoryMatches && searchMatches;
    card.hidden = !matches;
    if (matches) visible += 1;
  });
  const empty = root.querySelector("[data-connector-directory-empty]");
  if (empty) empty.hidden = visible > 0 || cards.length === 0;
  const results = root.querySelector("[data-connector-directory-results]");
  if (results) results.textContent = `${visible} connector${visible === 1 ? "" : "s"} shown${input?.value.trim() ? ` for “${input.value.trim()}”` : ""}`;
}

function handleConnectorDirectoryInput(event) {
  const input = event.target.closest?.("[data-connector-search]");
  if (!input) return;
  connectorDirectoryInteraction.query = input.value;
  applyConnectorDirectoryDomFilter(input.closest(".connector-directory"));
}

function handleConnectorDirectoryClick(event) {
  const filter = event.target.closest?.("[data-connector-category]");
  if (!filter) return;
  const root = filter.closest(".connector-directory");
  if (!root) return;
  event.preventDefault();
  connectorDirectoryInteraction.category = filter.dataset.connectorCategory || "all";
  root.querySelectorAll("[data-connector-category]").forEach((item) => {
    const active = item === filter;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  applyConnectorDirectoryDomFilter(root);
}

if (typeof document !== "undefined") {
  document.addEventListener("input", handleConnectorDirectoryInput);
  document.addEventListener("click", handleConnectorDirectoryClick);
}

export function renderKnowledge(state) {
  const query = String(state.knowledgeQuery || "").trim().toLowerCase();
  const list = knowledge(state).filter((item) => !query || `${item.title} ${item.content}`.toLowerCase().includes(query));
  return `${heading("Knowledge", "Keep policies, process notes, and approved reference text close to the work they support.", `<button class="button button-primary" data-action="new-knowledge" type="button">${icon("plus", "sm")} Add reference</button>`)}<section class="card knowledge-library"><div class="section-toolbar"><div><h2>Reference library <span class="count-label">${knowledge(state).length}</span></h2><p class="muted small">Use refund rules, escalation guidance, product notes, or tone examples.</p></div><label class="search">${icon("search", "sm")}<span class="sr-only">Search knowledge</span><input id="knowledge-search" type="search" placeholder="Search reference text…" value="${escapeHtml(state.knowledgeQuery || "")}" autocomplete="off" /></label></div><p class="sr-only" role="status">${list.length} matching reference${list.length === 1 ? "" : "s"}</p>${list.length ? `<div class="knowledge-list">${list.map((item) => `<article class="knowledge-item"><div class="knowledge-item-head"><span class="knowledge-type">${icon(item.kind === "Source" ? "plug" : "book", "sm")}${escapeHtml(item.kind || "Workspace note")}</span>${status(item.status || "synced")}</div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.content)}</p><div class="knowledge-item-footer"><span>${escapeHtml(item.createdAt ? relativeTime(item.createdAt) : "Local reference")}</span><button class="icon-button" data-action="delete-knowledge" data-id="${escapeHtml(item.id)}" type="button" aria-label="Remove ${escapeHtml(item.title)}">${icon("trash", "sm")}</button></div></article>`).join("")}</div>` : emptyState(query ? "No matching references" : "Add the context your team repeats", query ? "Try a different title or phrase." : "Start with one policy, product note, or approved reply example. References stay in this local workspace.", query ? '<button class="button button-secondary button-sm" data-action="clear-knowledge-search" type="button">Clear search</button>' : '<button class="button button-primary button-sm" data-action="new-knowledge" type="button">' + icon("plus", "sm") + ' Add reference</button>', "book")}</section>`;
}

function renderRunDetail(state, run) {
  if (!run) return `${heading("Run not found", "This run is not in the current workspace snapshot.")}${emptyState("No run record", "Return to history and choose another run.", '<button class="button button-secondary" data-action="back-runs" type="button">Back to history</button>')}`;
  const review = approvals(state).find((item) => item.runId === run.id);
  return `<button class="back-link" data-action="back-runs" type="button">${icon("back", "sm")} All runs</button>${heading(run.workflowName || "Workflow run", formatDateTime(run.createdAt), status(run.status))}<div class="run-detail-meta"><code>${escapeHtml(run.id)}</code><span>${formatNumber(run.credits)} credits recorded</span><span>Local simulation</span></div><div class="detail-layout"><div class="stack"><section class="card">${sectionHeading("Prepared output", "The result recorded for this local run.")}${renderOutput(run.output)}</section><section class="card">${sectionHeading("Original input")}<p class="prose-output">${escapeHtml(run.input || "No input was captured.")}</p></section></div><aside class="stack"><section class="card">${sectionHeading("Run trace", "A summary of this local test.")}<ol class="trace"><li><span class="trace-dot completed"></span><div><strong>Input recorded</strong><p>A local task was submitted.</p></div></li><li><span class="trace-dot ${["failed", "error"].includes(run.status) ? "failed" : "completed"}"></span><div><strong>${["failed", "error"].includes(run.status) ? "Run did not complete" : "Sample output recorded"}</strong><p>${["failed", "error"].includes(run.status) ? "Inspect the output for details before retrying." : "No external AI provider was contacted."}</p></div></li><li><span class="trace-dot ${run.status === "awaiting_approval" ? "waiting" : "completed"}"></span><div><strong>${review ? statusLabel(review.status) : run.status === "awaiting_approval" ? "Waiting for review" : "Result recorded"}</strong><p>External systems were not changed.</p></div></li></ol>${review ? `<button class="button button-secondary button-block" data-action="open-approval" data-id="${escapeHtml(review.id)}" type="button">Open review record ${icon("arrow", "sm")}</button>` : ""}</section><div class="context-note">${icon("shield", "sm")} This is a local record, not evidence that a message was sent or an external action completed.</div></aside></div>`;
}

export function renderRuns(state) {
  if (state.selectedRunId) return renderRunDetail(state, runs(state).find((item) => item.id === state.selectedRunId));
  return `${heading("Run history", "Follow each local test from input to output and review. Inspect a record without running it again.", `<button class="button button-secondary" data-action="export-workspace" type="button">${icon("download", "sm")} Export snapshot</button>`)}<section class="card">${sectionHeading("Recorded runs", `${runs(state).length} records in this workspace.`)}${renderRunTable(state, 100)}</section>`;
}

function recordTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function newestGovernanceRecords(items, limit = 8) {
  return items
    .filter((item) => item && typeof item === "object")
    .slice()
    .sort((left, right) => recordTimestamp(right.createdAt) - recordTimestamp(left.createdAt))
    .slice(0, limit);
}

function governanceLabel(value, fallback) {
  return titleCase(String(value || fallback).replace(/[._-]+/g, " "));
}

function governanceTime(value) {
  return `<time datetime="${escapeHtml(value || "")}" title="${escapeHtml(formatDateTime(value))}">${escapeHtml(value ? relativeTime(value) : "Recorded locally")}</time>`;
}

function renderAuditEvents(state) {
  const allEvents = auditEvents(state);
  const events = newestGovernanceRecords(allEvents);
  if (!events.length) {
    const message = state.serverBacked
      ? "The local adapter has not returned a persisted audit event for this workspace yet."
      : "The browser-only preview has no adapter audit collection. Local tests continue to work without audit events.";
    return emptyState("No persisted audit events", message, "", "history");
  }
  return `<div class="governance-record-list" aria-label="Persisted local audit events">${events.map((event) => {
    const eventType = governanceLabel(event.eventType || event.action, "Workspace event");
    const actor = event.actorType ? governanceLabel(event.actorType, "Service") : "";
    const reference = event.entityId || event.runId || event.approvalId;
    const referenceType = event.entityType ? governanceLabel(event.entityType, "Record") : "Record";
    return `<article class="governance-record"><span class="governance-record-icon">${icon("shield", "sm")}</span><div class="governance-record-copy"><div class="governance-record-title"><strong>${escapeHtml(eventType)}</strong>${actor ? `<span class="soft-badge">${escapeHtml(actor)}</span>` : ""}</div><p>${escapeHtml(event.detail || "Event detail was not returned by the adapter.")}</p>${reference ? `<code>${escapeHtml(referenceType)} · ${escapeHtml(reference)}</code>` : ""}</div><div class="governance-record-side">${governanceTime(event.createdAt)}</div></article>`;
  }).join("")}</div>`;
}

function renderLedgerEntries(state) {
  const allEntries = ledgerEntries(state);
  const entries = newestGovernanceRecords(allEntries);
  if (!entries.length) {
    const message = state.serverBacked
      ? "The local adapter has not returned a persisted credit-ledger entry for this workspace yet."
      : "The browser-only preview has no adapter credit ledger. Local credit display remains available, but no ledger rows are fabricated.";
    return emptyState("No persisted credit-ledger entries", message, "", "bolt");
  }
  return `<div class="governance-record-list" aria-label="Persisted local credit-ledger entries">${entries.map((entry) => {
    const entryType = governanceLabel(entry.type, "Credit event");
    const mode = entry.mode ? governanceLabel(entry.mode, "Sandbox") : "";
    const relatedId = entry.runId || entry.approvalId || entry.workflowId;
    const relatedType = entry.runId ? "Run" : entry.approvalId ? "Approval" : entry.workflowId ? "Workflow" : "Record";
    return `<article class="governance-record ledger-record"><span class="governance-record-icon ledger-icon">${icon("bolt", "sm")}</span><div class="governance-record-copy"><div class="governance-record-title"><strong>${escapeHtml(entryType)}</strong>${mode ? `<span class="soft-badge">${escapeHtml(mode)}</span>` : ""}</div><p>${escapeHtml(entry.description || "Credit-ledger detail was not returned by the adapter.")}</p>${relatedId ? `<code>${escapeHtml(relatedType)} · ${escapeHtml(relatedId)}</code>` : ""}</div><div class="governance-record-side"><strong class="governance-amount">${formatNumber(entry.amount)} <small>credits</small></strong>${governanceTime(entry.createdAt)}</div></article>`;
  }).join("")}</div>`;
}

function renderGovernanceVisibility(state) {
  const eventCount = auditEvents(state).length;
  const ledgerCount = ledgerEntries(state).length;
  const mode = modeInfo(state);
  const sourceNote = state.serverBacked
    ? "Showing persisted collections returned by the local adapter; missing records are left empty rather than inferred."
    : "Browser-only previews do not expose adapter audit or ledger collections. Existing local tests continue to work, and these panels stay empty until adapter records are available.";
  return `<section class="governance-section" aria-labelledby="governance-heading"><div class="governance-section-header"><div><div class="section-kicker">Governance visibility</div><h2 id="governance-heading">Local audit &amp; credit ledger</h2><p>${escapeHtml(sourceNote)}</p></div><span class="soft-badge">${escapeHtml(mode.record)}</span></div><div class="governance-disclaimer" role="note">${icon("shield", "sm")}<div><strong>Sandbox records — no financial authority</strong><p>These local audit and credit-ledger records describe sandbox workflow activity only. They are not payment-provider records, invoices, charges, financial statements, or authorization to move money.</p></div></div><div class="governance-grid"><section class="card governance-card">${sectionHeading("Audit events", `${formatNumber(eventCount)} persisted event${eventCount === 1 ? "" : "s"}`)}${renderAuditEvents(state)}</section><section class="card governance-card">${sectionHeading("Credit ledger", `${formatNumber(ledgerCount)} persisted entr${ledgerCount === 1 ? "y" : "ies"}`)}${renderLedgerEntries(state)}</section></div></section>`;
}

function renderAnalyticsContent(state) {
  const list = workflows(state);
  const total = list.reduce((sum, item) => sum + safeNumber(item.runs), 0);
  const credits = list.reduce((sum, item) => sum + safeNumber(item.credits), 0);
  const decided = approvals(state).filter((item) => item.status !== "pending");
  const approved = decided.filter((item) => item.status === "approved").length;
  const max = Math.max(...list.map((item) => safeNumber(item.runs)), 1);
  return `${heading("Insights", "A summary of recorded workflow activity and review decisions in this local snapshot.", `<button class="button button-secondary" data-action="export-workspace" type="button">${icon("download", "sm")} Export data</button>`)}<div class="metric-grid">${metric("Workflow runs", formatNumber(total), "Reported across configured workflows", "history")}${metric("Credits recorded", formatNumber(credits), "Reported usage across workflows", "bolt")}${metric("Approval rate", decided.length ? `${Math.round(approved / decided.length * 100)}%` : "—", `${decided.length} decisions · pending items excluded`, "check")}${metric("Active workflows", formatNumber(list.filter((item) => item.status === "active").length), `${list.length} workflows configured`, "workflow")}</div><div class="analytics-grid"><section class="card">${sectionHeading("Runs by workflow", "Cumulative counts in the current snapshot.")}${list.length ? `<div class="bar-list">${list.map((item) => `<div><div class="bar-label"><span>${escapeHtml(item.name)}</span><strong>${formatNumber(item.runs)}</strong></div>${progress(safeNumber(item.runs), max, `Runs for ${item.name}`)}</div>`).join("")}</div>` : emptyState("No workflow activity", "Create a workflow to begin recording local runs.", "", "chart")}</section><section class="card">${sectionHeading("Review outcomes", "Human decisions recorded in this workspace.")}<dl class="outcome-list"><div><dt><span class="outcome-dot approved"></span>Approved</dt><dd>${approved}</dd></div><div><dt><span class="outcome-dot rejected"></span>Rejected</dt><dd>${decided.length - approved}</dd></div><div><dt><span class="outcome-dot pending"></span>Awaiting review</dt><dd>${approvals(state).filter((item) => item.status === "pending").length}</dd></div></dl><p class="form-help">Sample records and local tests do not measure customer outcomes or time saved.</p></section></div><section class="card">${sectionHeading("Recent runs", "Open a record to inspect the underlying output.")}${renderRunTable(state)}</section>`;
}

export function renderAnalytics(state) {
  return `${renderAnalyticsContent(state)}${renderGovernanceVisibility(state)}`;
}

function planCard(state, plan) {
  const current = workspace(state).plan === plan.id || workspace(state).planId === plan.id;
  return `<article class="plan-card ${current ? "current" : ""}"><div class="plan-head"><h3>${escapeHtml(plan.name)}</h3>${current ? '<span class="soft-badge">Current</span>' : ""}</div><p>${escapeHtml(plan.description || "Local capacity preview")}</p><div class="plan-price">${plan.price === null || plan.price === undefined ? "Custom" : `$${escapeHtml(plan.price)}`}<span>${plan.price === null || plan.price === undefined ? "" : " / month"}</span></div><span class="plan-credits">${plan.creditLimit === null ? "Custom credit allowance" : `${formatNumber(plan.creditLimit)} credits per cycle`}</span><ul>${(plan.features || []).map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul><button class="button button-secondary button-sm button-block" data-action="select-plan" data-plan-id="${escapeHtml(plan.id)}" type="button" ${disabled(current || pending(state, `billing-plan-${plan.id}`))}>${current ? "Current plan" : "Preview plan"}</button></article>`;
}

export function renderBilling(state) {
  const current = balance(state);
  const plans = state.plans || [];
  const topup = plans.find((plan) => plan.id === workspace(state).plan)?.topUp;
  return `${heading("Plans & usage", "Review the capacity behind your workflows. Prices and plan changes below are preview data.", `<button class="button button-secondary" data-action="topup" type="button" ${disabled(pending(state, "billing-topup"))}>${icon("plus", "sm")} Simulate top-up</button>`)}${localNotice("Plan switches and top-ups change local demo capacity only. No card is collected and no payment is processed.")}<section class="card usage-card">${sectionHeading("Credit balance", "Available credits exclude used and reserved amounts.", `<span class="soft-badge">${escapeHtml(titleCase(workspace(state).plan || "starter"))}</span>`)}<div class="balance-summary"><div><strong>${formatNumber(current.available)}</strong><span>available credits</span></div><div class="balance-progress">${progress(current.used + current.reserved, current.included + current.topup, "Used and reserved credit allowance")}<p>${formatNumber(current.used)} used · ${formatNumber(current.reserved)} reserved</p></div></div><dl class="usage-breakdown"><div><dt>Included allowance</dt><dd>${formatNumber(current.included)}</dd></div><div><dt>Top-up credits</dt><dd>${formatNumber(current.topup)}</dd></div><div><dt>Used</dt><dd>${formatNumber(current.used)}</dd></div><div><dt>Reserved for review</dt><dd>${formatNumber(current.reserved)}</dd></div></dl><details class="credit-help"><summary>How to read these numbers</summary><p>Included and top-up credits form the demo allowance. Used credits are recorded by local tests. Reserved credits are held while an output awaits a decision. The available balance is the allowance minus used and reserved credits.</p></details></section><section class="card plan-section">${sectionHeading("Plan preview", "Compare the current local plan settings.")}<div class="plan-grid">${plans.length ? plans.map((plan) => planCard(state, plan)).join("") : emptyState("Plan details unavailable", "The local workspace did not return any plan records.", "", "card")}</div></section><p class="billing-footnote">${topup ? `The current preview top-up is ${formatNumber(topup.credits)} credits for $${escapeHtml(topup.price)}. ` : ""}These demo values are not a checkout or a subscription agreement.</p>`;
}

export function renderSecurity(state) {
  const settings = { ...(workspace(state).settings || {}), ...(workspace(state).security || {}) };
  const options = [
    ["approvalMode", "Human review preference", "Record a preference for review before completion. Each workflow’s review setting determines its local test behavior.", "user"],
    ["safeMode", "Safe mode preference", "Record a local preference. All execution remains simulated regardless of this setting.", "shield"],
    ["auditTrail", "Activity history preference", "Record a workspace preference for keeping an activity trail.", "history"],
    ["privateWorkspace", "Private workspace preference", "Record the intended privacy boundary. This preview does not implement accounts or access control.", "lock"]
  ];
  return `${heading("Workspace controls", "Keep the intended review and data boundaries visible. These preferences are local preview records.")}${localNotice("These switches store local preferences. They do not grant provider permissions, enable live actions, or enforce production access control.")}<div class="security-layout"><section class="card">${sectionHeading("Workspace preferences", "Changes apply to this browser’s workspace snapshot.")}<div class="security-options">${options.map(([key, label, detail, iconName]) => `<div class="security-option"><span class="security-option-icon">${icon(iconName, "sm")}</span><div class="security-option-copy"><strong id="control-${key}">${label}</strong><p id="control-help-${key}">${detail}</p></div><button class="switch ${settings[key] !== false ? "on" : ""}" data-action="toggle-security" data-key="${key}" type="button" role="switch" aria-checked="${settings[key] !== false}" aria-labelledby="control-${key}" aria-describedby="control-help-${key}" ${disabled(pending(state, `security-${key}`))}><span></span></button></div>`).join("")}</div></section><aside class="stack"><section class="card">${sectionHeading("Local data boundary")}<ul class="boundary-list"><li>${icon("check", "sm")}Browser-stored workspace changes</li><li>${icon("check", "sm")}Manual, simulated test runs</li><li>${icon("check", "sm")}No provider credentials collected</li><li>${icon("check", "sm")}No messages or payments sent</li></ul><button class="button button-secondary button-block" data-action="export-workspace" type="button">${icon("download", "sm")} Export workspace</button></section><section class="card">${sectionHeading("Workspace owner")}<div class="owner-card"><span class="user-avatar">${escapeHtml(initials(userName(state)))}</span><div><strong>${escapeHtml(userName(state))}</strong><span>${escapeHtml(workspaceName(state))}</span></div></div><p class="form-help">Owner details are part of the demo record, not a signed-in identity.</p></section></aside></div>`;
}

export function renderSettings(state) {
  const current = workspace(state);
  const zones = [...new Set([current.timezone || "UTC", "UTC", "America/New_York", "Europe/London", "Asia/Kolkata", "Asia/Singapore", "Australia/Sydney"])];
  const busy = pending(state, "settings-save") || pending(state, "settings-save-local");
  return `${heading("Settings", "Manage this workspace’s profile and local data.")}<div class="settings-layout"><nav class="settings-menu" aria-label="Settings sections"><span class="active" aria-current="page">Workspace profile</span><button data-view="security" type="button">Controls ${icon("arrow", "sm")}</button><button data-view="billing" type="button">Plans & usage ${icon("arrow", "sm")}</button></nav><div class="stack"><section class="card settings-form">${sectionHeading("Workspace profile", "Saved in this browser. No external account is changed.")}<form id="settings-form"><div class="form-group"><label for="settings-name">Workspace name</label><input class="form-input" id="settings-name" name="name" value="${escapeHtml(current.name || "")}" required maxlength="120" /></div><div class="form-group"><label for="settings-description">Description <span class="optional">Optional</span></label><textarea class="form-textarea" id="settings-description" name="description" placeholder="What does this workspace help your team do?">${escapeHtml(current.description || "")}</textarea></div><div class="form-group"><label for="settings-goal">Primary goal <span class="optional">Optional</span></label><input class="form-input" id="settings-goal" name="goal" value="${escapeHtml(current.goal || "")}" placeholder="Example: Prepare support drafts for review" /></div><div class="form-group"><label for="settings-timezone">Timezone</label><select class="form-select" id="settings-timezone" name="timezone">${zones.map((zone) => `<option value="${escapeHtml(zone)}" ${(current.timezone || "UTC") === zone ? "selected" : ""}>${escapeHtml(zone)}</option>`).join("")}</select><p class="form-help">A stored preference for this local workspace.</p></div><div class="form-footer"><button class="button button-primary" type="submit" ${disabled(busy)}>${busy ? '<span class="spinner"></span> Saving…' : "Save changes"}</button></div></form></section><section class="card data-settings">${sectionHeading("Workspace data")}<div class="data-setting-row"><div><strong>Export a copy</strong><p>Download the current workspace as a JSON file.</p></div><button class="button button-secondary button-sm" data-action="export-workspace" type="button">${icon("download", "sm")} Export JSON</button></div><div class="data-setting-row"><div><strong>Reset local demo</strong><p>Remove browser changes and reload the sample workspace.</p></div><button class="button button-danger button-sm" data-action="request-reset" type="button">Reset demo</button></div></section></div></div>`;
}

function allowance(state) {
  const current = balance(state);
  return { ...current, total: current.included + current.topup, usedTotal: current.used + current.reserved };
}

function usageTone(state) {
  const current = allowance(state);
  if (!current.total) return "neutral";
  const ratio = current.usedTotal / current.total;
  return ratio >= 0.9 ? "danger" : ratio >= 0.7 ? "warn" : "good";
}

function renderBudgetStatus(state, compact = false) {
  const current = allowance(state);
  const tone = usageTone(state);
  const label = tone === "danger" ? "Capacity is tight" : tone === "warn" ? "Watch capacity" : "Within budget";
  const detail = `${formatNumber(current.usedTotal)} of ${formatNumber(current.total)} credits used or reserved`;
  return `<div class="budget-status budget-${tone} ${compact ? "budget-compact" : ""}"><div class="budget-status-head"><span>${icon("bolt", "sm")}<strong>Workspace budget</strong></span><span class="budget-label">${label}</span></div>${progress(current.usedTotal, current.total, "Used and reserved workspace credits", tone === "danger" ? "red" : tone === "warn" ? "amber" : "teal")}<div class="budget-status-foot"><span>${escapeHtml(detail)}</span><button class="text-button" data-view="billing" type="button">View usage ${icon("arrow", "sm")}</button></div></div>`;
}

function renderRunTimeline(state, limit = 6) {
  const runEvents = runs(state).map((run) => ({
    id: `run-${run.id}`,
    createdAt: run.createdAt,
    title: run.workflowName || workflows(state).find((workflow) => workflow.id === run.workflowId)?.name || "Workflow run",
    detail: run.status === "awaiting_approval" ? "Prepared output is waiting for a human decision" : run.status === "completed" ? "Local output recorded" : statusLabel(run.status),
    status: run.status,
    iconName: run.status === "awaiting_approval" ? "inbox" : "play",
    action: "open-run",
    actionId: run.id
  }));
  const activityEvents = activity(state).map((item) => ({
    id: `activity-${item.id}`,
    createdAt: item.createdAt,
    title: item.action || item.title || "Workspace change",
    detail: item.detail || "Local workspace record",
    status: /approval|review/i.test(item.action || item.title || "") ? "pending" : "completed",
    iconName: /approval|review/i.test(item.action || item.title || "") ? "inbox" : "history"
  }));
  const events = [...runEvents, ...activityEvents]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, limit);
  if (!events.length) return emptyState("Your timeline starts here", "Run a workflow or make a workspace change to create a reviewable record.", '<button class="button button-secondary button-sm" data-view="workflows" type="button">Open workflow studio</button>', "history");
  return `<ol class="run-timeline" aria-label="Recent workspace activity">${events.map((event) => `<li><span class="timeline-marker timeline-${statusTone(event.status).replace("pill-", "")}">${icon(event.iconName, "sm")}</span><div class="timeline-copy"><div class="timeline-title"><strong>${escapeHtml(event.title)}</strong>${status(event.status)}</div><p>${escapeHtml(event.detail)}</p><time datetime="${escapeHtml(event.createdAt || "")}" title="${escapeHtml(formatDateTime(event.createdAt))}">${escapeHtml(event.createdAt ? relativeTime(event.createdAt) : "Recorded locally")}</time></div>${event.action ? `<button class="icon-button" data-action="${event.action}" data-id="${escapeHtml(event.actionId)}" type="button" aria-label="Inspect ${escapeHtml(event.title)}">${icon("chevron", "sm")}</button>` : ""}</li>`).join("")}</ol>`;
}

function renderEvidence(state, run, approval = null) {
  const linkedWorkflow = workflows(state).find((workflow) => workflow.id === (run?.workflowId || approval?.workflowId));
  const mode = modeInfo(state);
  const records = [
    ["Request", run?.input ? "Captured" : "Not available", run?.input ? "The submitted text is retained with this run." : "No request text was attached."],
    ["Available context", `${formatNumber(knowledge(state).length)} records`, "Workspace references are available to a test; this preview does not claim provider retrieval."],
    ["Run record", run?.id || "No linked run", run?.createdAt ? formatDateTime(run.createdAt) : "Record created locally"],
    ["Decision", approval ? statusLabel(approval.status) : "No decision", approval?.decidedAt ? formatDateTime(approval.decidedAt) : "Human review is recorded in this workspace only"]
  ];
  return `<section class="evidence-card"><div class="evidence-card-head"><div><div class="section-kicker">Evidence & audit</div><h3>${escapeHtml(linkedWorkflow?.name || "Workspace record")}</h3></div><span class="soft-badge">${escapeHtml(mode.record)}</span></div><div class="evidence-grid">${records.map(([label, value, detail]) => `<div class="evidence-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(detail)}</p></div>`).join("")}</div><div class="evidence-boundary">${icon("shield", "sm")}<span>This evidence shows what the ${escapeHtml(mode.recipe)} recorded. It does not prove that a provider was contacted, a message was sent, or an external system changed.</span></div></section>`;
}

function renderLaunchOverview(state) {
  const queue = approvals(state).filter((item) => item.status === "pending");
  const active = workflows(state).filter((item) => item.status === "active").length;
  const current = allowance(state);
  const firstReview = queue[0];
  const topWorkflow = workflows(state).find((workflow) => workflow.status === "active") || workflows(state)[0];
  const reviewAction = firstReview ? `<button class="button button-primary" data-action="open-approval" data-id="${escapeHtml(firstReview.id)}" type="button">Review next ${icon("arrow", "sm")}</button>` : `<button class="button button-secondary" data-view="approvals" type="button">Open review queue ${icon("arrow", "sm")}</button>`;
  return `${heading("Workspace command center", "See what is ready, what needs a decision, and how much safe capacity remains.", `<button class="button button-secondary" data-view="approvals" type="button">${icon("inbox", "sm")} Review inbox${queue.length ? ` <span class="button-count">${formatNumber(queue.length)}</span>` : ""}</button><button class="button button-primary" data-action="new-workflow" data-template-id="customer-support-triage" type="button">${icon("plus", "sm")} Build workflow</button>`, "Launch workspace")}${localNotice("This workspace is in local preview mode. Tests create inspectable records; approvals never send messages or change connected services.")}<section class="overview-hero"><div class="overview-hero-copy"><span class="hero-kicker">${queue.length ? "Your next decision" : "Ready for a controlled test"}</span><h2>${queue.length ? escapeHtml(firstReview.title) : "Turn one repeatable job into a reviewable workflow."}</h2><p>${queue.length ? escapeHtml(firstReview.detail || "Inspect the prepared output before marking it internally approved.") : "Start from a recipe, define the review boundary, then run a deterministic local sample."}</p><div class="hero-actions">${reviewAction}<button class="text-button" data-view="workflows" type="button">Browse recipes ${icon("arrow", "sm")}</button></div></div><div class="overview-hero-aside"><span class="hero-aside-label">Workspace posture</span><strong>${active ? "Guardrails are on" : "Set up your first flow"}</strong><span>${active} active workflow${active === 1 ? "" : "s"} · ${queue.length} awaiting review</span><div class="hero-chips"><span class="hero-chip">${icon("user", "sm")} Approval-first</span><span class="hero-chip">${icon("shield", "sm")} Safe preview</span></div></div></section><div class="metric-grid">${metric("Active workflows", String(active), `${workflows(state).length} configured in this workspace`, "workflow")}${metric("Awaiting review", String(queue.length), queue.length ? "Human decision required" : "Queue is clear", "inbox", queue.length ? "amber" : "neutral")}${metric("Recorded runs", formatNumber(runs(state).length), "Inspectable local records", "history")}${metric("Available credits", formatNumber(current.available), `${formatNumber(current.reserved)} held for review`, "bolt")}</div><div class="overview-command-grid"><section class="card overview-timeline-card">${sectionHeading("Run timeline", "A compact trail from request to recorded decision.", '<button class="text-button" data-view="runs" type="button">Open history ' + icon("arrow", "sm") + '</button>')}${renderRunTimeline(state)}</section><aside class="stack"><section class="card overview-budget-card">${sectionHeading("Budget posture", "Used and reserved credits are shown together.")}${renderBudgetStatus(state)}<div class="budget-facts"><span><strong>${formatNumber(current.used)}</strong> used</span><span><strong>${formatNumber(current.reserved)}</strong> reserved</span><span><strong>${formatNumber(current.available)}</strong> available</span></div></section><section class="card overview-next-card">${sectionHeading("Suggested next step", topWorkflow ? "Keep the next test small and reviewable." : "Build the first workflow.")}${topWorkflow ? `<div class="next-workflow"><span class="next-workflow-icon">${icon("workflow", "sm")}</span><div><strong>${escapeHtml(topWorkflow.name)}</strong><p>${escapeHtml(topWorkflow.description || "A bounded workflow with a visible review policy.")}</p></div></div><button class="button button-secondary button-block" data-action="open-workflow" data-id="${escapeHtml(topWorkflow.id)}" type="button">Open workflow ${icon("arrow", "sm")}</button>` : emptyState("Choose a recipe", "Start with a support triage workflow and keep approval enabled.", '<button class="button button-primary button-sm" data-action="new-workflow" data-template-id="customer-support-triage" type="button">Build first workflow</button>', "workflow")}</section></aside></div>${!workflows(state).length ? renderStartGuide(state) : ""}<section class="card overview-recipes">${sectionHeading("Recipes for the next job", "Start with a bounded pattern and customize it in the builder.", '<button class="text-button" data-view="workflows" type="button">View all recipes ' + icon("arrow", "sm") + '</button>')}<div class="recipe-strip">${templates(state).slice(0, 3).map((template, index) => `<article class="recipe-mini ${index === 0 ? "recommended" : ""}"><span class="recipe-mini-icon">${icon(index === 0 ? "inbox" : "file", "sm")}</span><div><strong>${escapeHtml(template.name)}</strong><p>${escapeHtml(template.description || "A safe starting point for repeatable work.")}</p><span>${template.steps?.length || 3} steps · local test</span></div><button class="icon-button" data-action="new-workflow" data-template-id="${escapeHtml(template.id)}" type="button" aria-label="Use ${escapeHtml(template.name)} recipe">${icon("arrow", "sm")}</button></article>`).join("")}</div></section>`;
}

function renderStudioWorkflows(state) {
  const list = workflows(state);
  const filter = state.workflowFilter || "all";
  const query = String(state.workflowQuery || "").trim().toLowerCase();
  const filtered = list.filter((workflow) => (filter === "all" || workflow.status === filter) && (!query || `${workflow.name} ${workflow.description || ""}`.toLowerCase().includes(query)));
  const filters = [["all", "All"], ["active", "Active"], ["paused", "Paused"], ["draft", "Draft"]];
  const recipeCards = templates(state).map((template, index) => `<article class="recipe-card ${index === 0 ? "featured" : ""}"><div class="recipe-card-top"><span class="recipe-icon">${icon(index === 0 ? "inbox" : "file", "sm")}</span>${index === 0 ? '<span class="soft-badge">Recommended</span>' : ""}</div><h3>${escapeHtml(template.name)}</h3><p>${escapeHtml(template.description || "A starting point for repeatable work.")}</p><div class="recipe-card-foot"><span>${template.steps?.length || 3} steps · approval-ready</span><button class="button button-secondary button-sm" data-action="new-workflow" data-template-id="${escapeHtml(template.id)}" type="button">Use recipe ${icon("arrow", "sm")}</button></div></article>`).join("");
  const noMatches = list.length && (query || filter !== "all");
  return `${heading("Workflow studio", "Choose a recipe, set a clear review boundary, and test the smallest useful version.", `<button class="button button-primary" data-action="new-workflow" data-template-id="customer-support-triage" type="button">${icon("plus", "sm")} New workflow</button>`, "Build with guardrails")}${localNotice("Recipes configure a local test flow. They do not activate a background worker or connect an external provider.")}<section class="studio-steps" aria-label="Workflow builder steps"><div class="studio-step active"><span>1</span><div><strong>Choose a recipe</strong><p>Start from a bounded job.</p></div></div><div class="studio-step"><span>2</span><div><strong>Set guardrails</strong><p>Review, budget, and scope.</p></div></div><div class="studio-step"><span>3</span><div><strong>Test & inspect</strong><p>Capture a local run record.</p></div></div></section><section class="card recipe-library-v1">${sectionHeading("Recipe library", "A small set of useful starting points beats an empty canvas.", `<span class="soft-badge">${templates(state).length} recipes</span>`)}<div class="recipe-grid-v1">${recipeCards}</div></section><section class="card workflow-results workflow-results-v1"><div class="section-toolbar"><div><h2>Configured workflows <span class="count-label">${formatNumber(list.length)}</span></h2><p class="muted small">Every workflow has a visible status, run budget, and review policy.</p></div><label class="search">${icon("search", "sm")}<span class="sr-only">Search workflows</span><input id="workflow-search" type="search" placeholder="Search by name or purpose…" value="${escapeHtml(state.workflowQuery || "")}" autocomplete="off" /></label><div class="filter-group" role="group" aria-label="Filter workflows by status">${filters.map(([id, label]) => `<button class="filter ${filter === id ? "active" : ""}" data-action="workflow-filter" data-filter="${id}" aria-pressed="${filter === id}" type="button">${label}<span>${formatNumber(id === "all" ? list.length : list.filter((workflow) => workflow.status === id).length)}</span></button>`).join("")}</div></div><p class="sr-only" role="status">${filtered.length} matching workflow${filtered.length === 1 ? "" : "s"}</p>${filtered.length ? `<div class="workflow-card-grid">${filtered.map((workflow) => `<article class="workflow-card-v1"><div class="workflow-card-head"><span class="workflow-card-icon">${icon("workflow", "sm")}</span>${status(workflow.status)}</div><h3>${escapeHtml(workflow.name)}</h3><p>${escapeHtml(workflow.description || "Bounded automation with a reviewable output.")}</p><div class="workflow-card-facts"><span><small>Review</small><strong>${workflow.requiresApproval === false ? "Not required" : "Required"}</strong></span><span><small>Runs</small><strong>${formatNumber(workflow.runs)}</strong></span><span><small>Run cap</small><strong>${formatNumber(workflow.budgetCredits)}</strong></span></div><div class="workflow-card-foot"><span>${escapeHtml(modelLabel(state, workflow.model))}</span><button class="button button-secondary button-sm" data-action="open-workflow" data-id="${escapeHtml(workflow.id)}" type="button">Open builder ${icon("arrow", "sm")}</button></div></article>`).join("")}</div>` : emptyState(noMatches ? "No workflows match this view" : "Build your first workflow", noMatches ? "Try another search or clear the status filter." : "Choose a recipe above to create a reviewable workflow in under a minute.", noMatches ? '<button class="button button-secondary button-sm" data-action="clear-workflow-filters" type="button">Clear filters</button>' : '<button class="button button-primary button-sm" data-action="new-workflow" data-template-id="customer-support-triage" type="button">' + icon("plus", "sm") + ' Use support recipe</button>', "workflow")}</section>`;
}

function renderBuilderSteps(state, workflow, latestRun) {
  const stages = [
    ["Request", "Task captured", "play", Boolean(latestRun)],
    ["Context", `${knowledge(state).length} references available`, "book", Boolean(latestRun)],
    ["Prepare", "Local output generated", "cpu", Boolean(latestRun)],
    [workflow.requiresApproval === false ? "Record" : "Review", workflow.requiresApproval === false ? "No decision required" : "Human decision", workflow.requiresApproval === false ? "file" : "user", Boolean(latestRun && (workflow.requiresApproval === false || latestRun.status !== "awaiting_approval"))]
  ];
  return `<ol class="builder-steps" aria-label="Workflow execution stages">${stages.map(([label, detail, iconName, complete], index) => `<li class="${complete ? "complete" : index === 0 ? "current" : ""}"><span class="builder-step-marker">${complete ? icon("check", "sm") : index + 1}</span><div><span>Step ${index + 1}</span><strong>${escapeHtml(label)}</strong><p>${escapeHtml(detail)}</p></div></li>`).join("")}</ol>`;
}

function renderStudioWorkflowDetail(state) {
  const workflow = workflows(state).find((item) => item.id === state.selectedWorkflowId);
  if (!workflow) return `${heading("Workflow not found", "This workflow is not in the current workspace snapshot.")}${emptyState("Choose a workflow", "Open the workflow studio to inspect a recipe and run a local test.", '<button class="button button-secondary" data-view="workflows" type="button">Back to workflow studio</button>', "workflow")}`;
  const latestRun = runs(state).find((run) => run.workflowId === workflow.id);
  const review = latestRun && approvals(state).find((item) => item.runId === latestRun.id && item.status === "pending");
  const current = allowance(state);
  const localCap = Math.max(1, Number(workflow.budgetCredits) || 60);
  const busy = pending(state, `workflow-status-${workflow.id}`);
  return `<button class="back-link" data-view="workflows" type="button">${icon("back", "sm")} Workflow studio</button>${heading(workflow.name, workflow.description || "A bounded job with a visible review policy.", `${status(workflow.status)}<button class="button button-secondary" data-action="toggle-workflow-status" data-id="${escapeHtml(workflow.id)}" type="button" ${disabled(busy)}>${icon(workflow.status === "active" ? "pause" : "play", "sm")}${workflow.status === "active" ? "Pause" : "Mark active"}</button>`, "Workflow builder")}${localNotice("This builder is intentionally honest about sandbox limits: it records a deterministic local output and never performs an external side effect.")}<section class="builder-header"><div><span class="hero-kicker">Recipe configured</span><h2>${escapeHtml(workflow.name)}</h2><p>${workflow.requiresApproval === false ? "This flow records its local result without a review step." : "This flow pauses at human review before it can be marked internally complete."}</p></div><div class="builder-header-facts"><span><strong>${formatNumber(workflow.runs)}</strong> recorded runs</span><span><strong>${formatNumber(workflow.budgetCredits)}</strong> credit cap</span><span><strong>${workflow.requiresApproval === false ? "Off" : "On"}</strong> review gate</span></div></section><div class="builder-layout"><div class="builder-main"><section class="card builder-flow-card">${sectionHeading("Execution blueprint", "A read-only map of the local test path.", '<span class="soft-badge">Manual trigger</span>')}${renderBuilderSteps(state, workflow, latestRun)}</section><section class="card test-panel builder-test-panel">${sectionHeading("Run a controlled test", "Use a realistic request; the preview keeps input, output, and review status together.", `<span class="soft-badge">Up to ${formatNumber(localCap)} credits</span>`)}<form id="run-form" aria-busy="${Boolean(state.runBusy)}"><label class="form-label" for="run-input">Request to prepare</label><textarea class="form-textarea" id="run-input" name="input" placeholder="Example: A customer asks about a duplicate invoice. Classify it and outline a response for review." required aria-describedby="run-help">${escapeHtml(state.runInput || "")}</textarea><div class="test-form-footer"><p class="form-help" id="run-help">${workflow.requiresApproval === false ? "Creates a local run record." : "Creates a local run and holds its estimated credits until review."} Nothing is sent outside this workspace.</p><button class="button button-primary" type="submit" ${disabled(state.runBusy)}>${state.runBusy ? '<span class="spinner"></span> Preparing…' : icon("play", "sm") + " Prepare output"}</button></div></form></section><section class="card result-panel">${sectionHeading("Latest output", latestRun ? formatDateTime(latestRun.createdAt) : "Your next local result will appear here.", latestRun ? status(latestRun.status) : "")}${state.runBusy ? '<div class="result-loading" role="status"><span class="spinner"></span><span>Recording a deterministic local test…</span></div>' : latestRun ? renderOutput(latestRun.output) : emptyState("No output yet", "Run the smallest useful test, then inspect the evidence before deciding.", "", "file")}${review ? `<div class="result-actions"><span class="pill pill-amber"><span class="pill-dot"></span>Needs review</span><button class="button button-secondary button-sm" data-action="open-approval" data-id="${escapeHtml(review.id)}" type="button">Open review ${icon("arrow", "sm")}</button></div>` : ""}</section></div><aside class="builder-aside stack"><section class="card guardrail-card">${sectionHeading("Guardrails", "Visible before every test.")}<ul class="guardrail-list"><li>${icon("user", "sm")}<span><strong>${workflow.requiresApproval === false ? "Review optional" : "Human review required"}</strong><small>${workflow.requiresApproval === false ? "Result is recorded directly." : "Output stays pending until a person decides."}</small></span></li><li>${icon("bolt", "sm")}<span><strong>${formatNumber(workflow.budgetCredits)} credit cap</strong><small>Local tests use at most ${formatNumber(localCap)} credits.</small></span></li><li>${icon("book", "sm")}<span><strong>${formatNumber(knowledge(state).length)} references available</strong><small>Reference records stay in this workspace.</small></span></li></ul>${renderBudgetStatus(state, true)}</section>${latestRun ? renderEvidence(state, latestRun, review) : `<section class="card evidence-empty">${emptyState("Evidence will appear here", "Run once to see request, record, and decision metadata together.", "", "shield")}</section>`}</aside></div>`;
}

function renderApprovalDetailLaunch(state, approval) {
  const run = runs(state).find((item) => item.id === approval.runId);
  const workflow = workflows(state).find((item) => item.id === approval.workflowId);
  const busy = pending(state, `approval-${approval.id}`) || pending(state, `approval-save-${approval.id}`);
  return `<section class="card approval-detail approval-detail-v1" id="review-detail" tabindex="-1"><div class="approval-detail-head"><div><div class="section-kicker">Decision request</div><h2>${escapeHtml(approval.title || "Output review")}</h2><p>${escapeHtml(workflow?.name || "Workspace review")} · ${escapeHtml(approval.detail || "Prepared output ready for review")}</p></div>${status(approval.status)}</div><dl class="approval-meta"><div><dt>Created</dt><dd>${escapeHtml(approval.createdAt ? formatDateTime(approval.createdAt) : "Not recorded")}</dd></div><div><dt>Credits held</dt><dd>${formatNumber(approval.credits)}</dd></div><div><dt>Record</dt><dd><code>${escapeHtml(approval.runId || approval.id)}</code></dd></div></dl>${run?.input ? `<details class="request-context" open><summary>Original request</summary><p>${escapeHtml(run.input)}</p></details>` : ""}<div class="review-output"><div class="review-output-head"><h3>Prepared output</h3><span class="soft-badge">Deterministic preview</span></div>${renderOutput(run?.output || approval.output)}</div>${renderEvidence(state, run, approval)}<div class="approval-callout">${icon("shield", "sm")}<p><strong>Internal decision only.</strong> Approving records your decision and releases the held credits. It does not send a message, issue a refund, create a pull request, or change another service.</p></div>${approval.status === "pending" ? `<div class="approval-actions"><button class="button button-secondary" data-action="approval-decision" data-id="${escapeHtml(approval.id)}" data-decision="reject" type="button" ${disabled(busy)}>Reject output</button><button class="button button-primary" data-action="approval-decision" data-id="${escapeHtml(approval.id)}" data-decision="approve" type="button" ${disabled(busy)}>${busy ? '<span class="spinner"></span>' : icon("check", "sm")}Approve internally</button></div>` : `<div class="decision-note">${icon(approval.status === "approved" ? "check" : "x", "sm")} ${escapeHtml(statusLabel(approval.status))}${approval.decidedAt ? ` · ${escapeHtml(formatDateTime(approval.decidedAt))}` : ""}</div>`}${run ? `<button class="text-button approval-run-link" data-action="open-run" data-id="${escapeHtml(run.id)}" type="button">Open full run trace ${icon("arrow", "sm")}</button>` : ""}</section>`;
}

function renderLaunchApprovals(state) {
  const queue = approvals(state).filter((item) => item.status === "pending");
  const history = approvals(state).filter((item) => item.status !== "pending");
  const selected = approvals(state).find((item) => item.id === state.selectedApprovalId) || queue[0];
  return `${heading("Review inbox", "Make the human decision explicit. Every item keeps its request, output, held credits, and audit record together.", `<span class="pill ${queue.length ? "pill-amber" : "pill-muted"}"><span class="pill-dot"></span>${queue.length ? `${queue.length} awaiting review` : "Queue clear"}</span>`, "Approval-first workspace")}${localNotice("Review actions update this local workspace only. They do not authorize or execute an external action.")}<div class="approval-layout approval-layout-v1"><section class="card approval-queue">${sectionHeading("Needs a decision", queue.length ? "Select an item to inspect its evidence." : "New review items will land here after a test.")}${queue.length ? `<div class="approval-list">${queue.map((item) => `<button class="approval-row ${selected?.id === item.id ? "selected" : ""}" data-action="open-approval" data-id="${escapeHtml(item.id)}" aria-pressed="${selected?.id === item.id}" type="button"><span class="approval-icon">${icon("inbox", "sm")}</span><span class="approval-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail || "Prepared output ready for review")}</span><small>${escapeHtml(item.createdAt ? relativeTime(item.createdAt) : "Recorded locally")} · ${formatNumber(item.credits)} credits held</small></span>${icon("chevron", "sm")}</button>`).join("")}</div>` : emptyState("Inbox is clear", "Run a test with human review enabled to see the full request-to-decision path.", '<button class="button button-secondary button-sm" data-view="workflows" type="button">Open workflow studio</button>', "check")}</section>${selected ? renderApprovalDetailLaunch(state, selected) : `<section class="card review-empty">${emptyState("Nothing waiting", "Your next reviewable output will appear here.", "", "check")}</section>`}</div><section class="card decision-history">${sectionHeading("Decision history", "Previously recorded internal decisions remain inspectable.")}${history.length ? `<div class="history-list">${history.slice(0, 8).map((item) => `<button class="history-row" data-action="open-approval" data-id="${escapeHtml(item.id)}" type="button"><span class="history-icon ${item.status === "rejected" ? "rejected" : ""}">${icon(item.status === "approved" ? "check" : "x", "sm")}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(statusLabel(item.status))}${item.decidedAt ? ` · ${escapeHtml(formatDateTime(item.decidedAt))}` : ""}</small></span>${status(item.status)}${icon("chevron", "sm")}</button>`).join("")}</div>` : emptyState("No decisions recorded", "Approve or reject a prepared output to create an audit entry.", "", "history")}</section>`;
}

function renderRunDetailLaunch(state, run) {
  if (!run) return `${heading("Run not found", "This run is not in the current workspace snapshot.")}${emptyState("No run record", "Return to history and choose another run.", '<button class="button button-secondary" data-action="back-runs" type="button">Back to history</button>', "history")}`;
  const review = approvals(state).find((item) => item.runId === run.id);
  const failed = ["failed", "error"].includes(run.status);
  const mode = modeInfo(state);
  const timeline = [
    ["Request captured", "The submitted task was retained with this run.", "completed"],
    [failed ? "Local test reported an error" : "Local output prepared", failed ? "Inspect the recorded output before retrying." : "A deterministic sample was recorded; no provider was contacted.", failed ? "failed" : "completed"],
    [review ? statusLabel(review.status) : run.status === "awaiting_approval" ? "Waiting for review" : "Record complete", review ? "Decision state is stored in the workspace." : "No external side effect is implied by this record.", run.status === "awaiting_approval" ? "waiting" : failed ? "failed" : "completed"]
  ];
  return `<button class="back-link" data-action="back-runs" type="button">${icon("back", "sm")} All runs</button>${heading(run.workflowName || "Workflow run", formatDateTime(run.createdAt), status(run.status), "Run record")}${localNotice(`Run records are ${mode.recipe} records. They are not delivery receipts or proof of an external system change.`)}<div class="run-detail-meta"><code>${escapeHtml(run.id)}</code><span>${formatNumber(run.credits)} credits recorded</span><span>${escapeHtml(mode.run)}</span><span>${review ? "Review linked" : "No review linked"}</span></div><div class="detail-layout run-detail-layout"><div class="stack"><section class="card">${sectionHeading("Prepared output", "The result recorded for this local run.", '<span class="soft-badge">Inspectable</span>')}${renderOutput(run.output)}</section><section class="card">${sectionHeading("Original input", "Captured at submission time.")}<p class="prose-output">${escapeHtml(run.input || "No input was captured.")}</p></section>${renderEvidence(state, run, review)}</div><aside class="stack"><section class="card run-trace-card">${sectionHeading("Run timeline", "Each stage is visible before you trust the result.")}<ol class="trace trace-v1">${timeline.map(([label, detail, tone]) => `<li><span class="trace-dot ${tone}"></span><div><strong>${escapeHtml(label)}</strong><p>${escapeHtml(detail)}</p></div></li>`).join("")}</ol>${review ? `<button class="button button-secondary button-block" data-action="open-approval" data-id="${escapeHtml(review.id)}" type="button">Open review record ${icon("arrow", "sm")}</button>` : ""}</section><div class="context-note">${icon("shield", "sm")} ${escapeHtml(mode.run)} · no AI provider contacted · no external action performed.</div></aside></div>`;
}

function renderRunDetailWithRetry(state, run) {
  const markup = renderRunDetailLaunch(state, run);
  if (!run || !["failed", "error"].includes(run.status)) return markup;
  const busy = pending(state, `retry-run-${run.id}`);
  const retryAction = `<div class="run-retry-block" role="group" aria-label="Retry failed run"><button class="button button-primary button-block" data-action="retry-run" data-id="${escapeHtml(run.id)}" type="button" ${disabled(busy)}>${busy ? '<span class="spinner"></span> Retrying…' : icon("refresh", "sm") + " Retry failed run"}</button><p class="form-help">Submits the captured request again and creates a new run record.</p></div>`;
  const errorNotice = `<div class="run-error" role="alert"><strong>Run failed</strong><span>${escapeHtml(run.error || "The local adapter marked this run as failed.")}</span></div>`;
  return markup.replace("</ol>", `</ol>${retryAction}`).replace('<section class="card">', `<section class="card">${errorNotice}`);
}

function renderLaunchRuns(state) {
  if (state.selectedRunId) return renderRunDetailWithRetry(state, runs(state).find((run) => run.id === state.selectedRunId));
  const waiting = runs(state).filter((run) => run.status === "awaiting_approval").length;
  return `${heading("Run history", "Follow each test from request to output and decision. Open a record without running it again.", `<button class="button button-secondary" data-action="export-workspace" type="button">${icon("download", "sm")} Export snapshot</button>`, "Evidence trail")}<div class="run-history-summary"><div><span class="section-kicker">Recorded trail</span><strong>${formatNumber(runs(state).length)}</strong><span>local run records</span></div><div><span class="section-kicker">Waiting for review</span><strong>${formatNumber(waiting)}</strong><span>${waiting ? "Decision needed" : "No pending run reviews"}</span></div><div class="run-history-summary-budget">${renderBudgetStatus(state, true)}</div></div><div class="run-history-grid"><section class="card">${sectionHeading("All run records", `${runs(state).length} records in this workspace.`)}${renderRunTable(state, 100)}</section><section class="card timeline-side">${sectionHeading("Latest activity", "The same local record trail, in time order.")}${renderRunTimeline(state, 8)}</section></div>`;
}

const fallbackConnectorCatalog = [
  { id: "gmail", name: "Gmail", category: "Communication", description: "Inbox and thread context", capabilities: ["Read context", "Draft preview"] },
  { id: "slack", name: "Slack", category: "Communication", description: "Channel and message context", capabilities: ["Read context", "Draft preview"] },
  { id: "notion", name: "Notion", category: "Knowledge", description: "Approved workspace references", capabilities: ["Read context"] },
  { id: "github", name: "GitHub", category: "Product", description: "Issue and repository context", capabilities: ["Read context", "Draft preview"] }
];

function textValue(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return textValue(value.label || value.name || value.title || value.id, fallback);
  return String(value);
}

function graphPayload(state, workflow) {
  const workspaceGraph = workspace(state).graph;
  const candidate = state?.graph ?? workflow?.graph ?? workflow?.workflowGraph ?? workflow?.definition?.graph ?? workspaceGraph;
  if (candidate === undefined || candidate === null) return { nodes: [], loading: false, error: "", present: false };
  if (Array.isArray(candidate)) return { nodes: candidate, loading: false, error: "", present: true };
  if (typeof candidate !== "object") return { nodes: [], loading: false, error: "", present: true };
  const graph = candidate.graph && typeof candidate.graph === "object" ? candidate.graph : candidate;
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : Array.isArray(graph.steps) ? graph.steps : Array.isArray(graph.items) ? graph.items : [];
  const loading = Boolean(candidate.loading || graph.loading || candidate.status === "loading" || graph.status === "loading");
  const error = textValue(candidate.error || candidate.message || graph.error || graph.message || (candidate.status === "error" || graph.status === "error" ? "The workflow graph could not be loaded." : ""));
  return { nodes, loading, error, present: true };
}

function connectorPayload(state, workflow = null) {
  let source;
  let metadata = {};
  let explicit = false;
  if (state?.connectors !== undefined) {
    source = state.connectors;
    explicit = true;
  } else if (state?.connectorCatalog !== undefined) {
    source = state.connectorCatalog;
    explicit = true;
  } else if (state?.catalog?.connectors !== undefined) {
    source = state.catalog.connectors;
    explicit = true;
  } else if (workflow?.connectors !== undefined) {
    source = workflow.connectors;
    explicit = true;
  } else if (workspace(state).connectors !== undefined) {
    source = workspace(state).connectors;
    explicit = true;
  } else if (workspace(state).connectorCatalog !== undefined) {
    source = workspace(state).connectorCatalog;
    explicit = true;
  } else if (workspace(state).integrations !== undefined) {
    source = workspace(state).integrations;
    explicit = true;
  } else if (integrations(state).length) {
    source = integrations(state);
    explicit = true;
  } else {
    source = fallbackConnectorCatalog;
  }
  if (source && !Array.isArray(source) && typeof source === "object") {
    metadata = source;
    source = source.items || source.catalog || source.connectors || Object.entries(source).filter(([key]) => !["loading", "status", "error", "message"].includes(key)).map(([id, value]) => ({ id, ...(typeof value === "object" ? value : { name: value }) }));
  }
  const list = (Array.isArray(source) ? source : []).filter(Boolean).map((connector, index) => {
    const connected = Boolean(connector.connected || connector.configured || ["connected", "ready", "configured"].includes(String(connector.status || "").toLowerCase()));
    const capabilities = Array.isArray(connector.capabilities) ? connector.capabilities : Array.isArray(connector.actions) ? connector.actions : [];
    return {
      ...connector,
      id: textValue(connector.id, `connector-${index + 1}`),
      name: textValue(connector.name || connector.label, "Workspace connector"),
      category: textValue(connector.category || connector.group, "Workspace tool"),
      description: textValue(connector.description || connector.detail, "Context source for a local preview."),
      capabilities: capabilities.slice(0, 3).map((item) => textValue(item)).filter(Boolean),
      connected,
      status: textValue(connector.status, connected ? "connected" : "not_configured")
    };
  });
  return { list, explicit, empty: explicit && !list.length && !metadata.loading && metadata.status !== "loading", loading: Boolean(metadata.loading || metadata.status === "loading"), error: textValue(metadata.error || metadata.message || (metadata.status === "error" ? "The connector catalog could not be loaded." : "")) };
}

function connectorById(state, workflow = null) {
  return new Map(connectorPayload(state, workflow).list.map((connector) => [connector.id, connector]));
}

function canvasRisk(value, fallback = "low") {
  const candidate = value && typeof value === "object" ? value.level || value.risk || value.label : value;
  const risk = String(candidate || fallback).toLowerCase();
  if (/(critical|high|write|external)/.test(risk)) return "high";
  if (/(medium|moderate|review|guard)/.test(risk)) return "medium";
  return "low";
}

function canvasRiskLabel(value) {
  return { low: "Low", medium: "Review", high: "High" }[canvasRisk(value)] || "Low";
}

function canvasEffectLabel(value, fallback = "Prepare") {
  const candidate = value && typeof value === "object" ? value.label || value.effect || value.type || value.operation : value;
  const effect = String(candidate || fallback).toLowerCase();
  if (effect.includes("read") || effect.includes("context")) return "Read context";
  if (effect.includes("write") || effect.includes("send")) return "External write";
  if (effect.includes("decision") || effect.includes("approval")) return "Internal decision";
  if (effect.includes("guard") || effect.includes("policy") || effect.includes("budget")) return "Guardrail";
  if (effect.includes("record") || effect.includes("outcome")) return "Record result";
  return textValue(candidate, fallback);
}

function canvasIcon(node, index) {
  const value = String(node?.icon || node?.iconName || node?.type || node?.kind || "").toLowerCase();
  if (value.includes("trigger") || value.includes("input") || value.includes("request") || index === 0) return "play";
  if (value.includes("context") || value.includes("app") || value.includes("connector") || value.includes("source")) return "plug";
  if (value.includes("worker") || value.includes("ai") || value.includes("model") || value.includes("prepare")) return "spark";
  if (value.includes("policy") || value.includes("budget") || value.includes("guard")) return "shield";
  if (value.includes("approval") || value.includes("review") || value.includes("human")) return "user";
  if (value.includes("outcome") || value.includes("result") || value.includes("record")) return "check";
  return ["play", "plug", "spark", "shield", "user", "check"][index] || "workflow";
}

function canvasNodes(state, workflow) {
  const connectors = connectorById(state, workflow);
  const contextCount = knowledge(state).length;
  const approvalRequired = workflow?.requiresApproval !== false;
  const defaults = [
    { id: "trigger", stage: "Trigger", label: "Request intake", description: "Captures a task you provide for this test.", risk: "low", effect: "Read input", iconName: "play", source: "Manual input" },
    { id: "context", stage: "Apps & context", label: "Workspace context", description: `${formatNumber(contextCount)} reference record${contextCount === 1 ? "" : "s"} available to the preview.`, risk: "medium", effect: "Read context", iconName: "plug", source: "Preview context" },
    { id: "worker", stage: "AI worker", label: workflow?.workerName || "Prepare a result", description: modelLabel(state, workflow?.model), risk: "medium", effect: "Prepare draft", iconName: "spark", source: "Local simulation" },
    { id: "policy", stage: "Policy & budget", label: "Guardrails", description: `${formatNumber(workflow?.budgetCredits || 60)} credits maximum per test.`, risk: "high", effect: "Guardrail", iconName: "shield", source: "Workspace policy" },
    { id: "approval", stage: "Approval", label: approvalRequired ? "Human review" : "Review gate off", description: approvalRequired ? "A person decides before internal completion." : "This workflow records without a review gate.", risk: approvalRequired ? "high" : "medium", effect: "Internal decision", iconName: "user", source: "Workspace reviewer" },
    { id: "outcome", stage: "Outcome", label: approvalRequired ? "Prepared for review" : "Recorded result", description: "A local record is saved for inspection; no provider is contacted.", risk: "high", effect: "Record result", iconName: "check", source: "Local record" }
  ];
  const payload = graphPayload(state, workflow);
  const raw = payload.nodes.map((item, index) => {
    const node = typeof item === "string" ? { label: item } : item || {};
    const connectorId = typeof node.connector === "string"
      ? node.connector
      : textValue(node.connectorId || node.integrationId || node.connector?.id || node.sourceId);
    const connectorName = connectorId && connectors.get(connectorId)?.name;
    const base = defaults[index] || { id: `node-${index + 1}`, stage: "Workflow step", label: "Configured step", description: "A configured step in this workflow.", risk: "medium", effect: "Prepare", iconName: "workflow", source: "Workflow graph" };
    return {
      ...base,
      ...node,
      id: textValue(node.id, base.id),
      stage: textValue(node.stage || node.category || node.typeLabel, base.stage),
      label: textValue(node.label || node.name || node.title || node.config?.label || node.data?.label, base.label),
      description: textValue(node.description || node.detail || node.subtitle || node.config?.description || node.data?.description, base.description),
      risk: canvasRisk(node.riskLevel || node.risk || node.riskLabel, base.risk),
      effect: canvasEffectLabel(node.effectLabel || node.effect || node.operation, base.effect),
      iconName: canvasIcon(node, index),
      source: connectorName ? `Preview source · ${connectorName}` : textValue(node.sourceLabel || node.source, base.source),
      connectorName
    };
  });
  const normalized = raw.length ? raw : defaults;
  return { nodes: normalized, fallback: !payload.nodes.length, loading: payload.loading, error: payload.error, present: payload.present };
}

function renderCanvasNode(node, index) {
  const risk = canvasRisk(node.risk);
  const riskLabel = canvasRiskLabel(risk);
  const effect = canvasEffectLabel(node.effect, "Prepare");
  return `<li class="workflow-canvas-item"><article class="workflow-node workflow-node-${risk}" aria-label="${escapeHtml(`${node.stage}: ${node.label}`)}"><div class="workflow-node-top"><span class="workflow-node-icon">${icon(node.iconName || "workflow", "sm")}</span><span class="workflow-node-index">${String(index + 1).padStart(2, "0")}</span></div><div class="workflow-node-copy"><span class="workflow-node-stage">${escapeHtml(node.stage)}</span><h3>${escapeHtml(node.label)}</h3><p>${escapeHtml(node.description)}</p></div><div class="workflow-node-labels"><span class="node-risk node-risk-${risk}">Risk · ${escapeHtml(riskLabel)}</span><span class="node-effect">Effect · ${escapeHtml(effect)}</span></div><div class="workflow-node-foot"><span>${escapeHtml(node.source || "Workflow graph")}</span><span class="workflow-node-dot" aria-hidden="true"></span></div></article>${index ? "" : `<span class="workflow-canvas-port workflow-canvas-port-start" aria-hidden="true"></span>`}${index < 99 ? `<span class="workflow-canvas-port workflow-canvas-port-end" aria-hidden="true"></span>` : ""}</li>`;
}

function renderWorkflowCanvas(state, workflow, options = {}) {
  const data = canvasNodes(state, workflow);
  const compact = Boolean(options.compact);
  const headingId = `${options.id || (workflow?.id ? `workflow-canvas-${workflow.id}` : "workflow-canvas-preview")}-heading`;
  const stateNotice = data.loading
    ? `<div class="workflow-canvas-state workflow-canvas-loading" role="status" aria-live="polite"><span class="spinner"></span><div><strong>Loading workflow map</strong><span>The latest graph is being prepared. A safe fallback remains visible.</span></div></div>`
    : data.error
      ? `<div class="workflow-canvas-state workflow-canvas-error" role="alert">${icon("alert", "sm")}<div><strong>Workflow map unavailable</strong><span>${escapeHtml(data.error)} Showing a safe preview blueprint instead.</span></div></div>`
      : data.fallback
        ? `<div class="workflow-canvas-state workflow-canvas-empty" role="status">${icon("info", "sm")}<div><strong>Preview blueprint</strong><span>No saved graph was returned, so the standard approval-first path is shown safely.</span></div></div>`
        : `<div class="workflow-canvas-state workflow-canvas-ready" role="status">${icon("check", "sm")}<div><strong>Graph loaded</strong><span>Review the configured path before running a local test.</span></div></div>`;
  const items = data.loading
    ? `<li class="workflow-canvas-item workflow-node-skeleton"><div class="workflow-node-skeleton-box"><span></span><span></span><span></span></div></li>`.repeat(6)
    : data.nodes.map((node, index) => `${renderCanvasNode(node, index)}${index < data.nodes.length - 1 ? `<li class="workflow-canvas-connector" aria-hidden="true"><span></span>${icon("arrow", "sm")}</li>` : ""}`).join("");
  return `<section class="workflow-canvas ${compact ? "workflow-canvas-compact" : ""}" aria-labelledby="${escapeHtml(headingId)}"><div class="workflow-canvas-head"><div><div class="section-kicker">Visual workflow</div><h2 id="${escapeHtml(headingId)}">${escapeHtml(workflow?.name || "Approval-first workflow path")}</h2><p>${escapeHtml(compact ? "A clear path from request to recorded outcome." : "Follow the request, context, worker, guardrails, decision, and outcome in one view.")}</p></div><span class="soft-badge workflow-canvas-badge">${data.fallback ? "Safe fallback" : data.nodes.length + " nodes"}</span></div>${stateNotice}<div class="workflow-canvas-viewport" tabindex="0" aria-label="Workflow node canvas. Use the page controls to inspect each node."><ol class="workflow-canvas-track">${items}</ol></div><div class="workflow-canvas-legend" aria-label="Node label legend"><span><i class="legend-swatch legend-risk"></i>Risk shows review attention</span><span><i class="legend-swatch legend-effect"></i>Effect describes the local operation</span><span>${icon("lock", "sm")} Preview only · no live side effects</span></div></section>`;
}

function renderConnectorPicker(state, workflow, compact = false) {
  const catalog = connectorPayload(state, workflow);
  if (catalog.loading) return `<section class="card connector-picker connector-picker-loading" aria-labelledby="connector-picker-heading"><div class="connector-picker-head"><div><div class="section-kicker">Apps &amp; context</div><h2 id="connector-picker-heading">Choose preview sources</h2><p>Loading the latest connector catalog…</p></div><span class="soft-badge">Loading</span></div><div class="connector-picker-skeletons" role="status" aria-live="polite">${"<span></span>".repeat(compact ? 3 : 4)}</div><div class="connector-picker-note">${icon("lock", "sm")}<span>Connector access remains preview-only while records load.</span></div></section>`;
  const catalogError = catalog.error ? `<div class="connector-picker-error" role="alert">${icon("alert", "sm")}<span><strong>Connector catalog unavailable.</strong> ${escapeHtml(catalog.error)} Showing safe catalog fallbacks.</span></div>` : "";
  if (catalog.empty && !catalog.error) return `<section class="card connector-picker connector-picker-empty"><div class="connector-picker-head"><div><div class="section-kicker">Apps &amp; context</div><h2>Connector selection</h2><p>No connector records were returned for this workspace.</p></div><span class="soft-badge">Not configured</span></div>${emptyState("No connectors yet", "Open Connections to review the local connector catalog. Authorization is not available in this preview.", '<button class="button button-secondary button-sm" data-view="integrations" type="button">Open Connections ' + icon("arrow", "sm") + '</button>', "plug")}</section>`;
  const integrationIds = new Set(integrations(state).map((item) => item.id));
  const sourceList = catalog.list.length ? catalog.list : fallbackConnectorCatalog.map((connector) => ({ ...connector, connected: false, status: "not_configured" }));
  const visible = compact ? sourceList.slice(0, 3) : sourceList;
  return `<section class="card connector-picker ${compact ? "connector-picker-compact" : ""}" aria-labelledby="connector-picker-heading"><div class="connector-picker-head"><div><div class="section-kicker">Apps &amp; context</div><h2 id="connector-picker-heading">Choose preview sources</h2><p>Map context into the workflow without authorizing an account.</p></div><span class="soft-badge">${formatNumber(sourceList.length)} catalog item${sourceList.length === 1 ? "" : "s"}</span></div>${catalogError}<div class="connector-picker-note" role="note">${icon("shield", "sm")}<span>Every connector below is <strong>preview-only</strong>. “Preview ready” is a local label, not a live connection.</span></div><div class="connector-picker-grid">${visible.map((connector) => { const ready = connector.connected; const hasIntegration = integrationIds.has(connector.id); const action = hasIntegration ? `<button class="button button-secondary button-sm" data-action="toggle-integration" data-id="${escapeHtml(connector.id)}" type="button" ${disabled(pending(state, `integration-${connector.id}`))}>${ready ? "Clear preview" : "Preview connection"}</button>` : `<button class="button button-secondary button-sm" data-view="integrations" type="button">Review catalog ${icon("arrow", "sm")}</button>`; return `<article class="connector-option"><div class="connector-option-main"><span class="connector-option-icon">${escapeHtml(initials(connector.name))}</span><div><h3>${escapeHtml(connector.name)}</h3><p>${escapeHtml(connector.description)}</p><span class="connector-option-category">${escapeHtml(connector.category)}${connector.capabilities.length ? ` · ${escapeHtml(connector.capabilities.join(" · "))}` : ""}</span></div></div><div class="connector-option-foot"><span class="connector-status ${ready ? "connector-status-ready" : "connector-status-off"}"><i></i>${ready ? "Preview ready" : "Not configured"}</span>${action}</div></article>`; }).join("")}</div>${compact && sourceList.length > visible.length ? `<button class="text-button connector-picker-more" data-view="integrations" type="button">View all connections ${icon("arrow", "sm")}</button>` : ""}</section>`;
}

function renderRecipeGallery(state) {
  const list = templates(state);
  if (!list.length) return `<section class="card recipe-gallery recipe-gallery-empty">${emptyState("No recipes available", "Create a workflow from the blank starting point when a recipe catalog is available.", '<button class="button button-secondary button-sm" data-action="new-workflow" type="button">Create workflow</button>', "file")}</section>`;
  return `<section class="card recipe-gallery" aria-labelledby="recipe-gallery-heading"><div class="recipe-gallery-head"><div><div class="section-kicker">Starting points</div><h2 id="recipe-gallery-heading">Recipe gallery</h2><p>Start with a bounded job, then refine its context and review boundary.</p></div><span class="soft-badge">${formatNumber(list.length)} recipes</span></div><div class="recipe-gallery-grid">${list.map((template, index) => { const steps = Array.isArray(template.steps) && template.steps.length ? template.steps : ["Trigger", "Prepare", "Review"]; return `<article class="recipe-gallery-card ${index === 0 ? "featured" : ""}"><div class="recipe-gallery-card-top"><span class="recipe-icon">${icon(index === 0 ? "inbox" : "file", "sm")}</span>${index === 0 ? '<span class="soft-badge">Recommended</span>' : '<span class="recipe-preview-label">Preview recipe</span>'}</div><h3>${escapeHtml(template.name)}</h3><p>${escapeHtml(template.description || "A starting point for repeatable work.")}</p><div class="recipe-stage-pills">${steps.slice(0, 4).map((step, stepIndex) => `<span>${stepIndex + 1}. ${escapeHtml(textValue(step, "Workflow step"))}</span>`).join("")}</div><div class="recipe-gallery-card-foot"><span>${steps.length} stages · approval-ready</span><button class="button button-secondary button-sm" data-action="new-workflow" data-template-id="${escapeHtml(template.id)}" type="button">Use recipe ${icon("arrow", "sm")}</button></div></article>`; }).join("")}</div></section>`;
}

function renderStudioWorkflowCards(state, list, filtered, filter, query) {
  const filters = [["all", "All"], ["active", "Active"], ["paused", "Paused"], ["draft", "Draft"]];
  const noMatches = list.length && (query || filter !== "all");
  const body = state.workflowsLoading
    ? `<div class="studio-loading-state" role="status" aria-live="polite"><span class="spinner"></span><strong>Loading workflows</strong><p>Fetching the latest local workflow records…</p></div>`
    : state.workflowsError
      ? `<div class="studio-error-state" role="alert">${icon("alert", "sm")}<div><strong>Workflow records unavailable</strong><p>${escapeHtml(textValue(state.workflowsError, "The workflow list could not be loaded."))}</p></div></div>`
      : filtered.length
        ? `<div class="workflow-card-grid">${filtered.map((workflow) => `<article class="workflow-card-v2"><div class="workflow-card-v2-head"><span class="workflow-card-icon">${icon("workflow", "sm")}</span>${status(workflow.status)}</div><h3>${escapeHtml(workflow.name)}</h3><p>${escapeHtml(workflow.description || "Bounded automation with a reviewable output.")}</p><div class="workflow-card-v2-facts"><span><small>Run cap</small><strong>${formatNumber(workflow.budgetCredits)} credits</strong></span><span><small>Review</small><strong>${workflow.requiresApproval === false ? "Off" : "Required"}</strong></span><span><small>Runs</small><strong>${formatNumber(workflow.runs)}</strong></span></div><div class="workflow-card-v2-foot"><span>${escapeHtml(workflow.model ? modelLabel(state, workflow.model) : "Local simulation")}</span><button class="button button-secondary button-sm" data-action="open-workflow" data-id="${escapeHtml(workflow.id)}" type="button">Open canvas ${icon("arrow", "sm")}</button></div></article>`).join("")}</div>`
        : emptyState(noMatches ? "No matching workflows" : "Your canvas is ready", noMatches ? "Try a different search or clear the status filter." : "Choose a recipe to create the first reviewable workflow.", noMatches ? '<button class="button button-secondary button-sm" data-action="clear-workflow-filters" type="button">Clear filters</button>' : '<button class="button button-primary button-sm" data-action="new-workflow" data-template-id="customer-support-triage" type="button">' + icon("plus", "sm") + ' Create workflow</button>', "workflow");
  return `<section class="card workflow-library-v2" aria-labelledby="configured-workflows-heading"><div class="workflow-library-v2-toolbar"><div><div class="section-kicker">Saved flows</div><h2 id="configured-workflows-heading">Configured workflows <span class="count-label">${formatNumber(list.length)}</span></h2><p>Open a canvas to inspect nodes, context, and the local run preview.</p></div><label class="search">${icon("search", "sm")}<span class="sr-only">Search workflows</span><input id="workflow-search" type="search" placeholder="Search by name or purpose…" value="${escapeHtml(state.workflowQuery || "")}" autocomplete="off" /></label></div><div class="workflow-library-v2-filters" role="group" aria-label="Filter workflows by status">${filters.map(([id, label]) => `<button class="filter ${filter === id ? "active" : ""}" data-action="workflow-filter" data-filter="${id}" aria-pressed="${filter === id}" type="button">${label}<span>${formatNumber(id === "all" ? list.length : list.filter((workflow) => workflow.status === id).length)}</span></button>`).join("")}</div><p class="sr-only" role="status">${filtered.length} matching workflow${filtered.length === 1 ? "" : "s"}</p>${body}</section>`;
}

function renderRunPreview(state, workflow, latestRun) {
  const review = latestRun && approvals(state).find((item) => item.runId === latestRun.id);
  const failed = latestRun && ["failed", "error"].includes(latestRun.status);
  if (state.runBusy) return `<section class="card run-preview" aria-labelledby="run-preview-heading"><div class="run-preview-head"><div><div class="section-kicker">Run preview</div><h2 id="run-preview-heading">Preparing a local record</h2></div><span class="pill pill-blue"><span class="pill-dot"></span>Running</span></div><div class="run-preview-loading" role="status" aria-live="polite"><span class="spinner"></span><div><strong>Recording request and output</strong><p>No provider is contacted while this preview runs.</p></div></div></section>`;
  if (!latestRun) return `<section class="card run-preview" aria-labelledby="run-preview-heading"><div class="run-preview-head"><div><div class="section-kicker">Run preview</div><h2 id="run-preview-heading">Your next result</h2></div><span class="soft-badge">No run yet</span></div>${emptyState("Nothing recorded yet", "Run a controlled test to preview the request, prepared output, and review boundary here.", "", "play")}<div class="run-preview-boundary">${icon("lock", "sm")} Preview only · the result stays in this workspace.</div></section>`;
  const summary = textValue(latestRun.output?.summary || latestRun.output?.result || latestRun.output, "A local output record is available.");
  return `<section class="card run-preview" aria-labelledby="run-preview-heading"><div class="run-preview-head"><div><div class="section-kicker">Run preview</div><h2 id="run-preview-heading">Latest local result</h2><p>${escapeHtml(latestRun.createdAt ? relativeTime(latestRun.createdAt) : "Recorded locally")}</p></div>${status(latestRun.status)}</div>${failed ? `<div class="run-preview-error" role="alert">${icon("alert", "sm")}<span>${escapeHtml(latestRun.error || "The local test reported an error.")}</span></div>` : ""}<dl class="run-preview-facts"><div><dt>Request</dt><dd>${escapeHtml(textValue(latestRun.input, "Not captured").slice(0, 120))}</dd></div><div><dt>Output</dt><dd>${escapeHtml(summary.slice(0, 160))}</dd></div><div><dt>Decision</dt><dd>${escapeHtml(review ? statusLabel(review.status) : latestRun.status === "awaiting_approval" ? "Awaiting review" : "Recorded")}</dd></div></dl><div class="run-preview-actions"><button class="button button-secondary button-sm" data-action="open-run" data-id="${escapeHtml(latestRun.id)}" type="button">Inspect run ${icon("arrow", "sm")}</button>${review ? `<button class="text-button" data-action="open-approval" data-id="${escapeHtml(review.id)}" type="button">Open review ${icon("arrow", "sm")}</button>` : ""}</div><div class="run-preview-boundary">${icon("shield", "sm")} ${escapeHtml(modeInfo(state).run)} · no external action performed.</div></section>`;
}

function renderStudioWorkflowsCanvas(state) {
  const list = workflows(state);
  const filter = state.workflowFilter || "all";
  const query = String(state.workflowQuery || "").trim().toLowerCase();
  const filtered = list.filter((workflow) => (filter === "all" || workflow.status === filter) && (!query || `${workflow.name} ${workflow.description || ""}`.toLowerCase().includes(query)));
  const previewWorkflow = list[0] || { id: "preview", name: "New reviewable workflow", budgetCredits: 60, requiresApproval: true, runs: 0 };
  return `${heading("Workflow studio", "Design a clear path from trigger to outcome, then test it locally before anything could be live.", `<button class="button button-primary" data-action="new-workflow" data-template-id="customer-support-triage" type="button">${icon("plus", "sm")} New workflow</button>`, "Build with guardrails")}${localNotice("This studio is a local preview. Recipes, connector labels, runs, and approvals do not authorize accounts or perform external actions.")}<section class="studio-overview-grid"><div>${renderWorkflowCanvas(state, previewWorkflow, { compact: true, id: "studio-canvas" })}</div><div class="studio-overview-side">${renderConnectorPicker(state, previewWorkflow, true)}<div class="card studio-side-note">${icon("shield", "sm")}<div><strong>Approval-first by default</strong><p>Every recipe can pause for a human decision before its local outcome is marked complete.</p></div></div></div></section>${renderRecipeGallery(state)}${renderStudioWorkflowCards(state, list, filtered, filter, query)}`;
}

function renderStudioWorkflowDetailCanvas(state) {
  const workflow = workflows(state).find((item) => item.id === state.selectedWorkflowId);
  if (!workflow) return `${heading("Workflow not found", "This workflow is not in the current workspace snapshot.")}${emptyState("Choose a workflow", "Open a workflow to inspect its canvas and run a local test.", '<button class="button button-secondary" data-view="workflows" type="button">Back to workflow studio</button>', "workflow")}`;
  const latestRun = runs(state).find((run) => run.workflowId === workflow.id);
  const current = allowance(state);
  const localCap = Math.max(1, Number(workflow.budgetCredits) || 60);
  const busy = pending(state, `workflow-status-${workflow.id}`);
  const nodeData = canvasNodes(state, workflow);
  return `<button class="back-link" data-view="workflows" type="button">${icon("back", "sm")} Workflow studio</button>${heading(workflow.name, workflow.description || "A bounded job with a visible review policy.", `${status(workflow.status)}<button class="button button-secondary" data-action="toggle-workflow-status" data-id="${escapeHtml(workflow.id)}" type="button" ${disabled(busy)}>${icon(workflow.status === "active" ? "pause" : "play", "sm")}${workflow.status === "active" ? "Pause" : "Mark active"}</button>`, "Workflow builder")}${localNotice("This canvas is a deterministic local preview. It records a request, prepared output, and internal review state; it never performs an external side effect.")}<section class="builder-header builder-header-v2"><div><span class="hero-kicker">Canvas ready</span><h2>${escapeHtml(workflow.name)}</h2><p>${workflow.requiresApproval === false ? "This flow records a local result without a review gate." : "This flow pauses at human review before its local outcome is marked complete."}</p></div><div class="builder-header-facts"><span><strong>${formatNumber(nodeData.nodes.length)}</strong> canvas nodes</span><span><strong>${formatNumber(workflow.budgetCredits)}</strong> credit cap</span><span><strong>${workflow.requiresApproval === false ? "Off" : "On"}</strong> review gate</span></div></section>${renderWorkflowCanvas(state, workflow, { id: `workflow-${workflow.id}` })}<div class="studio-detail-grid"><div class="studio-detail-main">${renderConnectorPicker(state, workflow)}<section class="card test-panel builder-test-panel"><div class="section-header"><div><div class="section-kicker">Controlled test</div><h2>Run a local preview</h2><p>Use a realistic request; input, output, and review stay together.</p></div><span class="soft-badge">Up to ${formatNumber(localCap)} credits</span></div><form id="run-form" aria-busy="${Boolean(state.runBusy)}"><label class="form-label" for="run-input">Request to prepare</label><textarea class="form-textarea" id="run-input" name="input" placeholder="Example: A customer asks about a duplicate invoice. Classify the request and outline a response for review." required aria-describedby="run-help">${escapeHtml(state.runInput || "")}</textarea><div class="test-form-footer"><p class="form-help" id="run-help">Creates a local run record${workflow.requiresApproval === false ? "." : " and a review item."} No message is sent.</p><button class="button button-primary" type="submit" ${disabled(state.runBusy)}>${state.runBusy ? '<span class="spinner"></span> Running preview…' : icon("play", "sm") + " Run preview"}</button></div></form></section></div><aside class="studio-detail-side">${renderRunPreview(state, workflow, latestRun)}<section class="card guardrail-card"><div class="section-header"><div><div class="section-kicker">Policy boundary</div><h2>Guardrails in view</h2><p>Keep the local test legible before activating anything.</p></div><span class="soft-badge">Preview only</span></div><ul class="guardrail-list"><li>${icon("shield", "sm")}<span><strong>Human review ${workflow.requiresApproval === false ? "disabled" : "required"}</strong><small>${workflow.requiresApproval === false ? "The workflow records an internal result without a decision." : "Approval is an internal record; it is not a send or provider receipt."}</small></span></li><li>${icon("bolt", "sm")}<span><strong>${formatNumber(workflow.budgetCredits)} credits per run</strong><small>${formatNumber(current.available)} credits remain available in this local snapshot.</small></span></li><li>${icon("lock", "sm")}<span><strong>No external writes</strong><small>Connectors remain not configured until a future provider flow exists.</small></span></li></ul>${renderBudgetStatus(state, true)}</section></aside></div>`;
}

export function renderPage(state) {
  currentRenderState = state;
  const pages = { overview: renderLaunchOverview, workflows: renderStudioWorkflowsCanvas, editor: renderStudioWorkflowDetailCanvas, "ai-workers": renderWorkers, approvals: renderLaunchApprovals, runs: renderLaunchRuns, integrations: renderIntegrations, knowledge: renderKnowledge, analytics: renderAnalytics, billing: renderBilling, security: renderSecurity, settings: renderSettings };
  return modeAwareMarkup((pages[state.view] || renderLaunchOverview)(state), state);
}

function modalFrame(title, description, body, footer, wide = false) {
  return `<div class="modal-backdrop" data-modal-backdrop><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description" tabindex="-1"><div class="modal-head"><div><h2 id="dialog-title">${escapeHtml(title)}</h2><p id="dialog-description">${escapeHtml(description)}</p></div><button class="icon-button close-modal" data-action="close-modal" type="button" aria-label="Close dialog">${icon("close", "sm")}</button></div><div class="modal-body">${body}</div><div class="modal-foot">${footer}</div></section></div>`;
}

export function renderModal(state) {
  const modal = state.modal;
  if (!modal) return "";
  const cancel = '<button class="button button-secondary" data-action="close-modal" type="button">Cancel</button>';
  if (modal.type === "workflow") {
    const selected = templates(state).find((item) => item.id === modal.templateId) || templates(state)[0];
    const busy = pending(state, "create-workflow") || pending(state, "create-workflow-save");
    const body = `<form id="workflow-form"><fieldset class="form-group template-choice"><legend>Choose a starting point</legend><div class="choice-grid">${templates(state).map((template) => `<label class="choice-card"><input type="radio" name="workflow-template" value="${escapeHtml(template.id)}" ${template.id === selected?.id ? "checked" : ""} /><span><strong>${escapeHtml(template.name)}${template.id === "customer-support-triage" ? '<span class="recommended-label">Recommended</span>' : ""}</strong><span>${escapeHtml(template.description)}</span></span></label>`).join("")}</div></fieldset><div class="form-group"><label for="workflow-name">Workflow name</label><input class="form-input" id="workflow-name" name="name" value="${escapeHtml(selected?.name || "")}" placeholder="Example: Customer support triage" required maxlength="120" /></div><div class="form-group"><label for="workflow-description">What should it prepare?</label><textarea class="form-textarea" id="workflow-description" name="description" placeholder="Describe the response or next step you want to review.">${escapeHtml(selected?.description || "")}</textarea></div><label class="checkbox-row"><input name="requiresApproval" type="checkbox" checked /><span><strong>Require human review</strong><span>Keep the output in the review queue until a person approves or rejects it.</span></span></label><details class="advanced-settings"><summary>Run limits and simulation profile ${icon("down", "sm")}</summary><div class="form-grid"><div class="form-group"><label for="workflow-budget">Maximum credits per run</label><input class="form-input" id="workflow-budget" name="budgetCredits" type="number" min="1" max="1000000" step="1" value="60" required /><p class="form-help">A cap for the local test, not a payment.</p></div><div class="form-group"><label for="workflow-model">Simulation profile</label><select class="form-select" id="workflow-model" name="model">${models(state).map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.label)}</option>`).join("")}</select><p class="form-help">No AI provider is contacted in this preview.</p></div></div></details><p class="form-error" id="workflow-form-error" role="alert" hidden></p></form>`;
    return modalFrame("New workflow", "Start with one repeatable job. Support triage is a good first step.", body, cancel + `<button class="button button-primary" form="workflow-form" type="submit" ${disabled(busy)}>${busy ? '<span class="spinner"></span> Creating…' : "Create workflow"}</button>`, true);
  }
  if (modal.type === "knowledge") {
    const busy = pending(state, "create-knowledge") || pending(state, "create-knowledge-save");
    const body = `<form id="knowledge-form"><div class="form-group"><label for="knowledge-title">Reference title</label><input class="form-input" id="knowledge-title" name="title" placeholder="Example: Refund and escalation policy" required maxlength="160" /></div><div class="form-group"><label for="knowledge-content">Approved reference text</label><textarea class="form-textarea" id="knowledge-content" name="content" placeholder="Add the policy, process note, or reply guidance your team uses…" required></textarea><p class="form-help">Saved as a searchable local reference. Pasted text is not treated as executable instructions.</p></div><p class="form-error" id="knowledge-form-error" role="alert" hidden></p></form>`;
    return modalFrame("Add reference", "Give your workflows a clear source of approved context.", body, cancel + `<button class="button button-primary" form="knowledge-form" type="submit" ${disabled(busy)}>${busy ? '<span class="spinner"></span> Saving…' : "Add reference"}</button>`);
  }
  if (modal.type === "confirm") {
    return modalFrame(modal.title || "Confirm local change", modal.description || "This updates the browser’s workspace snapshot.", `<p class="confirm-copy">${escapeHtml(modal.message || "Review this change before continuing.")}</p>${modal.warning ? `<div class="inline-alert"><p>${escapeHtml(modal.warning)}</p></div>` : ""}`, cancel + `<button class="button ${["knowledge-delete", "reset"].includes(modal.action) ? "button-danger" : "button-primary"}" data-action="confirm-modal" type="button">${escapeHtml(modal.confirmLabel || "Confirm")}</button>`);
  }
  return "";
}
