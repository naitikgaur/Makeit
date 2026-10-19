import { api, normalizeConnectorCatalog, normalizeGraph, normalizeWorkflowDefinition, workflowExportPayload } from "./api.js";
import { icon } from "./icons.js";
import { $, $$, downloadJson, escapeHtml, formatNumber, getErrorMessage, safeNumber, titleCase } from "./utils.js";
import { renderModal, renderPage, renderShell } from "./views.js";

const appRoot = $("#app");
const modalRoot = $("#modal-root");
const toastRoot = $("#toast-region");

const DEFAULT_TEMPLATES = [
  { id: "customer-support-triage", name: "Customer support triage", description: "Classify an incoming customer request and draft a safe response plan.", steps: ["Understand the request", "Search company knowledge", "Draft a response plan", "Request internal approval"] },
  { id: "new-lead-follow-up", name: "New lead follow-up", description: "Turn a lead brief into a concise, reviewable follow-up draft.", steps: ["Summarize the lead", "Match relevant knowledge", "Draft follow-up options", "Request internal approval"] },
  { id: "weekly-business-briefing", name: "Weekly business briefing", description: "Create a structured internal briefing from supplied operating context.", steps: ["Collect the supplied context", "Identify themes", "Draft a briefing", "Highlight open questions"] },
  { id: "engineering-issue-assistant", name: "Engineering issue assistant", description: "Break an engineering issue into a bounded internal implementation plan.", steps: ["Parse the issue", "Find relevant knowledge", "Draft implementation steps", "List verification checks"] }
];

const DEFAULT_MODELS = [
  { id: "makeease-small", label: "MakeEase Fast", configured: true },
  { id: "makeease-medium", label: "MakeEase Reasoning", configured: true }
];

const state = {
  phase: "loading",
  authView: "login",
  workspace: null,
  plans: [],
  templates: DEFAULT_TEMPLATES,
  models: DEFAULT_MODELS,
  connectors: [],
  connectorCatalog: [],
  selectedConnectorId: null,
  connectorPreview: null,
  source: "Browser demo",
  storage: "browser",
  serverBacked: false,
  previewOnly: false,
  error: null,
  view: "overview",
  mobileNavOpen: false,
  modal: null,
  workflowFilter: "all",
  workflowQuery: "",
  knowledgeQuery: "",
  selectedWorkflowId: null,
  selectedApprovalId: null,
  selectedRunId: null,
  runInput: "",
  runBusy: false,
  graphBusy: false,
  importBusy: false,
  pendingKeys: new Set()
};

let lastFocusedElement = null;
let lastFocusTarget = null;
let focusMainAfterRender = false;
let renderedModal = null;
let renderedView = null;
const narrowViewport = window.matchMedia("(max-width: 880px)");

function array(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeWorkspace(raw) {
  const source = raw?.workspace || raw || {};
  const rawUsage = source.usage || {};
  const rawWorkflows = array(source.workflows).map((workflow, index) => {
    const graphKeys = ["trigger", "nodes", "edges", "policy", "retry", "connector", "connectors", "connectorMetadata"];
    const graphCandidate = workflow?.graph || workflow?.workflowGraph || workflow?.definition?.graph || (graphKeys.some((key) => Object.prototype.hasOwnProperty.call(workflow || {}, key)) ? Object.fromEntries(graphKeys.filter((key) => Object.prototype.hasOwnProperty.call(workflow || {}, key)).map((key) => [key, workflow[key]])) : null);
    const graph = normalizeGraph(graphCandidate);
    return {
      ...workflow,
      id: workflow.id || `workflow-${index + 1}`,
      name: workflow.name || "Untitled workflow",
      description: workflow.description || "Bounded automation with a reviewable output.",
      status: workflow.status || "draft",
      runs: safeNumber(workflow.runs),
      credits: safeNumber(workflow.credits),
      budgetCredits: safeNumber(workflow.budgetCredits, 60),
      model: workflow.model || (index % 2 ? "makeease-medium" : "makeease-small"),
      requiresApproval: workflow.requiresApproval !== false,
      ...(graph ? { graph } : {})
    };
  });
  const rawIntegrations = array(source.integrations).map((integration, index) => ({
    ...integration,
    id: integration.id || `integration-${index + 1}`,
    name: integration.name || "Workspace tool",
    // `connected` is retained only as a legacy preview-selection flag.  It is
    // never treated as evidence of an account grant or provider availability.
    previewSelected: Boolean(integration.previewSelected || integration.previewOnly || integration.connected || integration.status === "connected"),
    connected: Boolean(integration.previewSelected || integration.previewOnly || integration.connected || integration.status === "connected"),
    status: integration.previewSelected || integration.previewOnly || integration.connected || integration.status === "connected" ? "connected" : "not_configured",
    live: false,
    previewOnly: true,
    detail: integration.previewSelected || integration.previewOnly || integration.connected || integration.status === "connected" ? "Preview selected; no account access" : "Preview available; no account access"
  }));
  const rawSources = array(source.sources);
  const rawConnectors = source.connectors || source.connectorCatalog || source.catalog?.connectors;
  const rawKnowledge = array(source.knowledge).length ? array(source.knowledge) : rawSources;
  const normalizedKnowledge = rawKnowledge.map((item, index) => ({
    ...item,
    id: item.id || `knowledge-${index + 1}`,
    title: item.title || item.name || "Workspace record",
    content: item.content || item.detail || "No content available.",
    kind: item.kind || (item.name ? "Source" : "Workspace note"),
    status: String(item.status || "synced").toLowerCase()
  }));
  const normalizedApprovals = array(source.approvals).map((approval, index) => ({
    ...approval,
    id: approval.id || `approval-${index + 1}`,
    title: approval.title || "Workflow output review",
    status: approval.status || "pending",
    createdAt: approval.createdAt || "",
    credits: safeNumber(approval.credits),
    detail: approval.detail || "Review the prepared output before internal completion."
  }));
  const normalizedRuns = array(source.runs).map((run, index) => ({
    ...run,
    id: run.id || `run-${index + 1}`,
    status: run.status || "completed",
    credits: safeNumber(run.credits),
    workflowName: run.workflowName || rawWorkflows.find((workflow) => workflow.id === run.workflowId)?.name || "Workflow run"
  }));
  const normalizedActivity = array(source.activity).map((item, index) => ({
    ...item,
    id: item.id || `activity-${index + 1}`,
    action: item.action || item.title || "Workspace event",
    detail: item.detail || "",
    createdAt: item.createdAt || ""
  }));
  const limit = safeNumber(rawUsage.limit || rawUsage.included, 15000);
  const used = safeNumber(rawUsage.used);
  const reserved = safeNumber(rawUsage.reserved);
  const topup = safeNumber(rawUsage.topup);
  const security = {
    approvalMode: true,
    safeMode: true,
    auditTrail: true,
    privateWorkspace: true,
    ...(source.settings || {}),
    ...(source.security || {})
  };
  return {
    ...source,
    id: source.id || "demo-workspace",
    name: source.name || "MakeEase workspace",
    plan: source.plan || source.planId || "starter",
    owner: source.owner || { name: "Workspace owner", role: "Owner" },
    usage: {
      ...rawUsage,
      used,
      limit,
      included: safeNumber(rawUsage.included, limit),
      reserved,
      topup,
      available: safeNumber(rawUsage.available, Math.max(limit + topup - used - reserved, 0))
    },
    workflows: rawWorkflows,
    integrations: rawIntegrations,
    connectors: normalizeConnectorCatalog(rawConnectors),
    connectorCatalog: normalizeConnectorCatalog(rawConnectors),
    connectorPreviews: array(source.connectorPreviews),
    knowledge: normalizedKnowledge,
    sources: rawSources,
    approvals: normalizedApprovals,
    runs: normalizedRuns,
    activity: normalizedActivity,
    security,
    settings: { ...(source.settings || {}), ...security }
  };
}

function renderLoading() {
  return `<main class="loading-shell" aria-busy="true"><div class="loading-card"><span class="loading-mark">M</span><span class="spinner"></span><div class="eyebrow">MakeEase workspace</div><h1>Preparing your review queue</h1><p>Loading your local support workspace and its latest draft records…</p><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></main>`;
}

function renderServiceError(error) {
  const message = getErrorMessage(error, "The workspace service could not return a snapshot.");
  return `<main class="error-shell"><section class="error-card" role="alert"><span class="error-icon">${icon("alert")}</span><div class="eyebrow">Workspace unavailable</div><h1>We could not open your workspace.</h1><p>${escapeHtml(message)}</p><div class="error-note"><strong>No changes were made.</strong><span>Check that the local adapter is running and retry, or open the browser-only demo using the data already stored here.</span></div><div class="page-actions"><button class="button button-primary" data-action="retry" type="button">${icon("refresh", "sm")} Retry connection</button><button class="button button-secondary" data-action="use-browser-demo" type="button">Open browser demo</button></div></section></main>`;
}

function renderAuth(view = "login") {
  const register = view === "register";
  return `<main class="auth-shell"><section class="auth-card" aria-labelledby="auth-title"><div class="auth-brand"><span class="brand-mark">${icon("brand")}</span><span>MakeEase</span></div><div class="eyebrow">Secure workspace</div><h1 id="auth-title">${register ? "Create your support workspace" : "Sign in to review support drafts"}</h1><p class="auth-intro">Your workspace, policies, review decisions, and packet evidence stay behind an authenticated session.</p><form id="auth-form">${register ? '<div class="form-group"><label for="auth-name">Your name</label><input class="form-input" id="auth-name" name="name" autocomplete="name" required placeholder="Your name" /></div><div class="form-group"><label for="auth-workspace">Workspace name</label><input class="form-input" id="auth-workspace" name="workspaceName" required placeholder="Acme support" /></div>' : ""}<div class="form-group"><label for="auth-email">Email</label><input class="form-input" id="auth-email" name="email" type="email" autocomplete="email" required placeholder="you@company.com" /></div><div class="form-group"><label for="auth-password">Password</label><input class="form-input" id="auth-password" name="password" type="password" autocomplete="${register ? "new-password" : "current-password"}" required minlength="12" placeholder="At least 12 characters" /></div><p class="form-error" id="auth-form-error" role="alert" hidden></p><button class="button button-primary button-block" type="submit">${register ? "Create workspace" : "Sign in"}</button></form><button class="text-button auth-switch" data-action="switch-auth" type="button">${register ? "Already have an account? Sign in" : "Need an account? Create a workspace"}</button><p class="auth-note">Live deployments must use HTTPS, a relational auth store, secure secrets, and an approved workspace membership policy.</p></section></main>`;
}

function focusTarget(element) {
  if (!element) return null;
  if (element.id) return `#${CSS.escape(element.id)}`;
  const attributes = ["data-action", "data-view", "data-id", "data-key", "data-filter", "name", "value"];
  const parts = attributes.filter((attribute) => element.hasAttribute(attribute)).map((attribute) => `[${attribute}="${CSS.escape(element.getAttribute(attribute))}"]`);
  return parts.length ? `${element.tagName.toLowerCase()}${parts.join("")}` : null;
}

function captureFields(form) {
  if (!form) return null;
  return [...form.elements].filter((element) => element.name && !["submit", "button"].includes(element.type)).map((element) => ({ name: element.name, value: element.value, checked: element.checked, type: element.type }));
}

function restoreFields(form, fields) {
  if (!form || !fields) return;
  fields.forEach((field) => {
    const candidates = [...form.elements].filter((element) => element.name === field.name);
    const element = ["radio", "checkbox"].includes(field.type) ? candidates.find((candidate) => candidate.value === field.value) : candidates[0];
    if (!element) return;
    if (["radio", "checkbox"].includes(field.type)) element.checked = field.checked;
    else element.value = field.value;
  });
}

function syncAccessibility() {
  const drawerOpen = state.mobileNavOpen && narrowViewport.matches;
  appRoot.inert = Boolean(state.modal);
  const sidebar = $("#sidebar");
  if (sidebar) sidebar.inert = narrowViewport.matches && !drawerOpen;
  const content = $(".main-content");
  if (content) content.inert = drawerOpen;
  document.body.style.overflow = state.modal || drawerOpen ? "hidden" : "";
}

function renderApp() {
  const modalFields = state.modal && state.modal === renderedModal ? captureFields(modalRoot.querySelector("form")) : null;
  const expandedSettings = state.modal === renderedModal && modalRoot.querySelector(".advanced-settings")?.open;
  const profileFields = state.view === "settings" && renderedView === "settings" ? captureFields($("#settings-form")) : null;
  const activeElement = document.activeElement;
  const activeTarget = focusTarget(activeElement);
  const focusWasInModal = modalRoot.contains(activeElement);
  const focusWasInForm = Boolean(activeElement?.closest("form"));
  if (state.phase === "loading") {
    appRoot.innerHTML = renderLoading();
    modalRoot.innerHTML = "";
    syncAccessibility();
    return;
  }
  if (state.phase === "error") {
    appRoot.innerHTML = renderServiceError(state.error);
    modalRoot.innerHTML = "";
    syncAccessibility();
    return;
  }
  if (state.phase === "auth") {
    appRoot.innerHTML = renderAuth(state.authView);
    modalRoot.innerHTML = "";
    syncAccessibility();
    return;
  }
  appRoot.innerHTML = renderShell(state, renderPage(state));
  modalRoot.innerHTML = renderModal(state);
  restoreFields(modalRoot.querySelector("form"), modalFields);
  restoreFields($("#settings-form"), profileFields);
  if (expandedSettings && modalRoot.querySelector(".advanced-settings")) modalRoot.querySelector(".advanced-settings").open = true;
  renderedModal = state.modal;
  renderedView = state.view;
  syncAccessibility();
  if (!focusMainAfterRender && activeTarget && (!state.modal || focusWasInModal || focusWasInForm)) {
    const replacement = (focusWasInModal ? modalRoot : appRoot).querySelector(activeTarget) || (focusWasInForm ? appRoot.querySelector(activeTarget) : null);
    if (replacement && !replacement.disabled && !replacement.closest("[inert]")) replacement.focus({ preventScroll: true });
  }
  focusModalIfNeeded();
  const title = $("#main-content h1")?.textContent || "Workspace";
  document.title = `${title} · MakeEase`;
  if (focusMainAfterRender) {
    focusMainAfterRender = false;
    $("#page-announcement").textContent = title;
    window.setTimeout(() => $("#main-content")?.focus(), 0);
  }
}

function focusModalIfNeeded() {
  if (!state.modal) return;
  const first = modalRoot.querySelector("input:not([type=radio]), textarea, select") || modalRoot.querySelector("button");
  if (first && !modalRoot.contains(document.activeElement)) window.setTimeout(() => first.focus(), 0);
}

function toast(message, tone = "success") {
  const node = document.createElement("div");
  node.className = `toast ${tone}`;
  node.setAttribute("role", tone === "error" ? "alert" : "status");
  node.textContent = message;
  toastRoot.appendChild(node);
  window.setTimeout(() => node.remove(), 4200);
}

function begin(key) {
  if (state.pendingKeys.has(key)) return false;
  state.pendingKeys.add(key);
  return true;
}

function finish(key) {
  state.pendingKeys.delete(key);
}

function addActivity(action, detail) {
  return [{ id: `activity-${Date.now()}`, action, detail, createdAt: new Date().toISOString() }, ...array(state.workspace?.activity)].slice(0, 50);
}

function usageWith(usagePatch = {}) {
  const current = state.workspace?.usage || {};
  const next = { ...current, ...usagePatch };
  const limit = safeNumber(next.limit || next.included, 15000);
  const used = safeNumber(next.used);
  const reserved = safeNumber(next.reserved);
  const topup = safeNumber(next.topup);
  return { ...next, used, limit, included: safeNumber(next.included, limit), reserved, topup, available: Math.max(limit + topup - used - reserved, 0) };
}

function parseJsonValue(value, label = "JSON") {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "object") return value;
  const raw = String(value).trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} must contain valid JSON.`);
  }
}

function graphFromForm(form) {
  if (!form) return null;
  const field = form.querySelector("[name=graph], [name=workflowGraph], [name=graphJson], [data-workflow-graph]");
  const raw = field?.value ?? field?.dataset?.workflowGraph ?? form.dataset?.graph;
  if (raw === undefined) return null;
  const parsed = parseJsonValue(raw, "Workflow graph");
  return parsed ? normalizeGraph(parsed) : null;
}

function graphFromTarget(target) {
  if (!target) return null;
  const raw = target.dataset?.graph || target.dataset?.workflowGraph || target.dataset?.graphJson || target.getAttribute?.("data-graph-json");
  if (!raw) return null;
  const parsed = parseJsonValue(raw, "Workflow graph");
  return parsed ? normalizeGraph(parsed) : null;
}

function connectorFor(idOrValue) {
  if (!idOrValue) return null;
  if (typeof idOrValue === "object") return idOrValue;
  return state.connectors.find((connector) => connector.id === idOrValue || connector.key === idOrValue || connector.connectorKey === idOrValue)
    || state.workspace?.integrations?.find((integration) => integration.id === idOrValue)
    || null;
}

function selectedWorkflow() {
  return state.workspace?.workflows?.find((workflow) => workflow.id === state.selectedWorkflowId) || null;
}

function updateGraphNode(graph, node) {
  const next = normalizeGraph(graph) || { version: "1", nodes: [], edges: [] };
  const normalizedNode = { ...(node || {}), id: String(node?.id || `node-${Date.now()}`) };
  const nodes = next.nodes.filter((item) => item.id !== normalizedNode.id);
  nodes.push(normalizedNode);
  return normalizeGraph({ ...next, nodes });
}

function graphFromCustomEvent(event) {
  const detail = event?.detail || {};
  return normalizeGraph(detail.graph || detail.workflowGraph || detail.definition?.graph || detail);
}

function applyApiSnapshot(response) {
  if (!response) return;
  if (response.workspace) state.workspace = normalizeWorkspace({ ...response.workspace, ...(response.packetUsage ? { packetUsage: response.packetUsage } : {}) });
  if (Array.isArray(response.plans) && response.plans.length) state.plans = response.plans;
  if (Array.isArray(response.templates) && response.templates.length) state.templates = response.templates;
  if (Array.isArray(response.models) && response.models.length) state.models = response.models;
  const incomingConnectors = response.connectors || response.connectorCatalog || response.catalog?.connectors || response.workspace?.connectors || response.workspace?.connectorCatalog;
  if (incomingConnectors !== undefined) {
    state.connectors = normalizeConnectorCatalog(incomingConnectors);
    state.connectorCatalog = state.connectors;
  } else if (!state.connectors.length) {
    state.connectors = normalizeConnectorCatalog([]);
    state.connectorCatalog = state.connectors;
  }
  if (response.connector) state.connectorPreview = response.connector;
  if (response.source) state.source = response.source;
  if (response.storage) state.storage = response.storage;
  if (response.serverBacked !== undefined) state.serverBacked = Boolean(response.serverBacked);
  state.previewOnly = Boolean(response.previewOnly);
}

async function persistWorkspace(patch, message, key = "workspace-save") {
  if (!begin(key)) return false;
  renderApp();
  try {
    const response = await api.updateWorkspace(patch);
    applyApiSnapshot(response);
    if (message) {
      const suffix = response.previewOnly ? " This preference is only stored in this browser preview." : state.storage === "memory" ? " Changes stay in this tab only; browser storage is unavailable." : "";
      toast(`${message}${suffix}`, response.previewOnly || state.storage === "memory" ? "warning" : "success");
    }
    return true;
  } catch (error) {
    toast(getErrorMessage(error, "The local workspace could not be saved."), "error");
    return false;
  } finally {
    finish(key);
    renderApp();
  }
}

async function bootstrap(localOnly = false) {
  state.phase = "loading";
  state.error = null;
  renderApp();
  try {
    const payload = await api.bootstrap({ localOnly });
    applyApiSnapshot(payload);
    state.plans = array(payload.plans).length ? payload.plans : state.plans;
    state.templates = array(payload.templates).length ? payload.templates : DEFAULT_TEMPLATES;
    state.models = array(payload.models).length ? payload.models : DEFAULT_MODELS;
    state.source = payload.source || "Browser demo";
    state.storage = payload.storage || "browser";
    state.serverBacked = Boolean(payload.serverBacked);
    state.phase = "ready";
    renderApp();
  } catch (error) {
    state.error = error;
    if (error?.status === 401 || error?.code === "AUTHENTICATION_REQUIRED") state.authView = "login";
    state.phase = error?.status === 401 || error?.code === "AUTHENTICATION_REQUIRED" ? "auth" : "error";
    renderApp();
  }
}

async function submitAuth(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const errorNode = $("#auth-form-error");
  if (errorNode) { errorNode.hidden = true; errorNode.textContent = ""; }
  try {
    if (state.authView === "register") await api.register({ name: values.name, email: values.email, password: values.password, workspaceName: values.workspaceName });
    else await api.login({ email: values.email, password: values.password });
    await bootstrap(false);
  } catch (error) {
    if (errorNode) {
      errorNode.hidden = false;
      errorNode.textContent = getErrorMessage(error, "We could not sign you in.");
    }
  }
}

function navigate(view) {
  state.view = view;
  state.mobileNavOpen = false;
  state.modal = null;
  if (view !== "editor") state.selectedWorkflowId = null;
  if (view !== "approvals") state.selectedApprovalId = null;
  if (view !== "runs") state.selectedRunId = null;
  focusMainAfterRender = true;
  renderApp();
}

function openModal(modal) {
  lastFocusedElement = document.activeElement;
  lastFocusTarget = focusTarget(document.activeElement);
  state.modal = modal;
  renderApp();
}

function closeModal() {
  state.modal = null;
  modalRoot.innerHTML = "";
  renderApp();
  const restoreTarget = lastFocusedElement && document.contains(lastFocusedElement) ? lastFocusedElement : lastFocusTarget ? $(lastFocusTarget) : null;
  (restoreTarget || $("#main-content"))?.focus({ preventScroll: true });
  lastFocusedElement = null;
  lastFocusTarget = null;
}

function openWorkflow(id, focusInput = false) {
  if (!state.workspace?.workflows?.some((workflow) => workflow.id === id)) return;
  state.selectedWorkflowId = id;
  state.runInput = "";
  state.view = "editor";
  state.mobileNavOpen = false;
  focusMainAfterRender = !focusInput;
  renderApp();
  if (focusInput) window.setTimeout(() => $("#run-input")?.focus(), 0);
}

function browserRunRecord(workflow, input) {
  const credits = Math.max(1, Number(workflow.budgetCredits) || 60);
  const createdAt = new Date().toISOString();
  const graph = normalizeGraph(workflow.graph || workflow);
  const graphPlan = graph?.nodes?.length ? graph.nodes.map((node) => String(node.name || node.label || node.title || node.type || node.id).slice(0, 200)) : null;
  const run = {
    id: `run-${Date.now()}`,
    workflowId: workflow.id,
    workflowName: workflow.name,
    status: workflow.requiresApproval === false ? "completed" : "awaiting_approval",
    credits,
    createdAt,
    input: input.trim(),
    ...(graphPlan ? { steps: graphPlan.map((name) => ({ name, status: "completed", detail: "Browser-only simulation step; no external action was used." })) } : {}),
    output: { summary: "Browser-only test output prepared", request: input.trim(), mode: "Deterministic simulation — no AI provider was contacted.", ...(graphPlan ? { plan: graphPlan } : {}), nextStep: workflow.requiresApproval === false ? "Recorded locally with no review required." : "Review this sample output before marking it internally approved." }
  };
  const currentUsage = usageWith();
  const nextWorkflow = { ...workflow, runs: safeNumber(workflow.runs) + 1, credits: safeNumber(workflow.credits) + credits, updatedAt: createdAt };
  const nextApprovals = workflow.requiresApproval === false ? state.workspace.approvals : [...state.workspace.approvals, { id: `approval-${Date.now()}`, workflowId: workflow.id, title: `${workflow.name} output`, detail: "Browser-only test output is ready for review", credits, status: "pending", createdAt, runId: run.id, output: run.output }];
  return {
    run,
    patch: {
      workflows: state.workspace.workflows.map((item) => item.id === workflow.id ? nextWorkflow : item),
      runs: [run, ...array(state.workspace.runs)].slice(0, 100),
      approvals: nextApprovals,
      usage: usageWith({
        used: currentUsage.used + (workflow.requiresApproval === false ? credits : 0),
        reserved: currentUsage.reserved + (workflow.requiresApproval === false ? 0 : credits)
      }),
      activity: addActivity("Browser-only test run completed", `${workflow.name} · ${credits} credits${workflow.requiresApproval === false ? "" : " · approval requested"}`)
    },
    message: workflow.requiresApproval === false ? "Browser-only test recorded." : "Browser-only test recorded. The output is ready in Review queue."
  };
}

async function createWorkflow(form, element) {
  if (!begin("create-workflow")) return;
  const values = Object.fromEntries(new FormData(form).entries());
  const budgetCredits = Number(values.budgetCredits);
  if (!values.name?.trim() || !Number.isInteger(budgetCredits) || budgetCredits < 1) {
    finish("create-workflow");
    toast("Add a workflow name and a whole-number credit budget.", "warning");
    return;
  }
  let graph = null;
  try {
    graph = graphFromForm(form) || graphFromTarget(element);
  } catch (error) {
    finish("create-workflow");
    toast(getErrorMessage(error, "The workflow graph could not be read."), "warning");
    return;
  }
  let connectorIds = [];
  try {
    const rawConnectorIds = values.connectorIds || values.connectors || form.dataset?.connectorIds;
    const parsedConnectorIds = rawConnectorIds ? parseJsonValue(rawConnectorIds, "Connector selection") : null;
    connectorIds = Array.isArray(parsedConnectorIds) ? parsedConnectorIds : rawConnectorIds ? String(rawConnectorIds).split(",").map((item) => item.trim()).filter(Boolean) : [];
  } catch (error) {
    finish("create-workflow");
    toast(getErrorMessage(error, "The connector selection could not be read."), "warning");
    return;
  }
  const workflow = {
    id: `workflow-${Date.now()}`,
    name: values.name.trim(),
    description: values.description?.trim() || "Bounded automation with a reviewable output.",
    status: "draft",
    runs: 0,
    credits: 0,
    budgetCredits,
    model: values.model || "makeease-small",
    templateId: form.querySelector("input[name=workflow-template]:checked")?.value || "",
    requiresApproval: form.querySelector("input[name=requiresApproval]")?.checked !== false,
    createdAt: new Date().toISOString(),
    ...(graph ? { graph } : {}),
    ...(connectorIds.length ? { connectorIds } : {})
  };
  let saved = false;
  let createdWorkflowId = workflow.id;
  try {
    if (state.serverBacked) {
      const created = await api.createWorkflow(workflow);
      createdWorkflowId = created?.id || createdWorkflowId;
      applyApiSnapshot(await api.refreshWorkspace());
      toast(created?.graphCompatibilityFallback ? "Workflow created in the local adapter. Its graph is retained as a browser compatibility overlay; review the boundary before activating it." : "Workflow created in the local adapter. Review the boundary before activating it.", created?.graphCompatibilityFallback ? "warning" : "success");
      saved = true;
    } else {
      const created = await api.createWorkflow(workflow);
      createdWorkflowId = created?.id || createdWorkflowId;
      if (created?.workspace) applyApiSnapshot(created);
      toast("Workflow created in the browser-only demo. Review the boundary before activating it.", "warning");
      saved = Boolean(created?.id);
    }
  } catch (error) {
    toast(getErrorMessage(error, "The workflow could not be created."), "error");
  }
  finish("create-workflow");
  if (saved) {
    state.modal = null;
    state.selectedWorkflowId = state.workspace.workflows.find((item) => item.id === createdWorkflowId)?.id || state.workspace.workflows.find((item) => item.name === workflow.name)?.id || workflow.id;
    state.view = "editor";
    focusMainAfterRender = true;
  }
  renderApp();
}

async function saveWorkflowGraph(id, graph, { message = "Workflow graph saved." } = {}) {
  const workflow = state.workspace?.workflows?.find((item) => item.id === id);
  const normalized = normalizeGraph(graph);
  if (!workflow || !normalized) {
    toast("Choose a workflow graph before saving.", "warning");
    return false;
  }
  const key = `workflow-graph-${id}`;
  if (!begin(key)) return false;
  state.graphBusy = true;
  renderApp();
  try {
    const updated = await api.updateWorkflowGraph(id, normalized);
    if (state.serverBacked) {
      applyApiSnapshot(await api.refreshWorkspace());
      const fallback = updated?.graphCompatibilityFallback;
      toast(fallback ? "Workflow graph saved as a browser compatibility overlay; the local adapter route does not store graph fields yet." : message, fallback ? "warning" : "success");
    } else {
      // The local API method already persists the graph.  Refreshing from its
      // response keeps the browser-only path equivalent to the server path.
      if (updated?.workspace) applyApiSnapshot(updated);
      toast(message, state.storage === "memory" ? "warning" : "success");
    }
    return true;
  } catch (error) {
    toast(getErrorMessage(error, "The workflow graph could not be saved."), "error");
    return false;
  } finally {
    state.graphBusy = false;
    finish(key);
    renderApp();
  }
}

async function selectConnectorPreview(id, target = null) {
  const connector = connectorFor(id);
  if (!connector) {
    toast("That connector is not in the available catalog.", "warning");
    return;
  }
  const workflowId = target?.dataset?.workflowId || state.selectedWorkflowId || null;
  const nodeId = target?.dataset?.nodeId || null;
  const key = `connector-preview-${connector.id}-${workflowId || "workspace"}-${nodeId || "catalog"}`;
  if (!begin(key)) return;
  try {
    const response = await api.selectConnectorPreview(connector, { workflowId, nodeId });
    applyApiSnapshot(response);
    state.selectedConnectorId = connector.id;
    if (workflowId && nodeId) {
      const workflow = state.workspace?.workflows?.find((item) => item.id === workflowId);
      const graph = normalizeGraph(workflow?.graph || workflow);
      if (workflow && graph?.nodes?.some((node) => node.id === nodeId)) {
        const nextGraph = normalizeGraph({
          ...graph,
          nodes: graph.nodes.map((node) => node.id === nodeId ? {
            ...node,
            connector: { id: connector.id, name: connector.name, category: connector.category, status: "not_configured", connected: false, available: false, live: false, previewOnly: true },
            connectorId: connector.id,
            connectorStatus: "preview_only",
            connected: false,
            live: false,
            previewOnly: true
          } : node)
        });
        await saveWorkflowGraph(workflowId, nextGraph, { message: `${connector.name} preview attached to the workflow graph.` });
      }
    }
    toast(`${connector.name} preview selected. No account access or provider call was made.`, "warning");
  } catch (error) {
    toast(getErrorMessage(error, "The connector preview could not be selected."), "error");
  } finally {
    finish(key);
    renderApp();
  }
}

async function clearConnectorPreview(id) {
  const connector = connectorFor(id);
  if (!connector) return;
  const snapshot = state.workspace || {};
  const previews = array(snapshot.connectorPreviews).filter((item) => item.connectorId !== connector.id);
  const integrations = array(snapshot.integrations).map((item) => item.id === connector.id ? {
    ...item,
    connected: false,
    previewSelected: false,
    status: "not_configured",
    live: false,
    previewOnly: true,
    detail: "Preview available; no account access"
  } : item);
  const saved = await persistWorkspace({ connectorPreviews: previews, integrations }, `${connector.name} preview cleared. No account access changed.`, `connector-clear-${connector.id}`);
  if (saved) state.selectedConnectorId = null;
}

async function duplicateWorkflow(id, target = null) {
  const workflow = state.workspace?.workflows?.find((item) => item.id === id);
  if (!workflow || !begin(`duplicate-workflow-${id}`)) return;
  try {
    const requestedName = target?.dataset?.name || target?.dataset?.workflowName;
    const response = await api.duplicateWorkflow(id, workflow, requestedName ? { name: requestedName } : {});
    if (state.serverBacked) applyApiSnapshot(await api.refreshWorkspace());
    else if (response.workspace) applyApiSnapshot(response);
    const duplicate = response.workflow;
    if (duplicate?.id) {
      state.selectedWorkflowId = duplicate.id;
      state.view = "editor";
      focusMainAfterRender = true;
    }
    toast(response.routeFallback ? "Workflow duplicated through the compatible create route. Graph fields remain in the browser preview." : "Workflow duplicated as a draft.", response.routeFallback ? "warning" : "success");
  } catch (error) {
    toast(getErrorMessage(error, "The workflow could not be duplicated."), "error");
  } finally {
    finish(`duplicate-workflow-${id}`);
    renderApp();
  }
}

async function exportWorkflow(id) {
  const workflow = state.workspace?.workflows?.find((item) => item.id === id);
  if (!workflow || !begin(`export-workflow-${id}`)) return;
  try {
    const response = await api.exportWorkflow(id, workflow);
    downloadJson(`makeease-workflow-${id}-${new Date().toISOString().slice(0, 10)}.json`, response.export || workflowExportPayload(workflow));
    toast(response.routeFallback ? "Workflow JSON exported from the compatible workspace snapshot." : "Workflow JSON exported.");
  } catch (error) {
    toast(getErrorMessage(error, "The workflow export could not be created."), "error");
  } finally {
    finish(`export-workflow-${id}`);
    renderApp();
  }
}

function openWorkflowImportPicker() {
  const existing = $("[data-workflow-import]");
  if (existing) {
    existing.value = "";
    existing.click();
    return;
  }
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.setAttribute("data-workflow-import", "true");
  input.hidden = true;
  document.body.appendChild(input);
  input.addEventListener("change", () => handleWorkflowImportFile(input), { once: true });
  input.click();
}

async function handleWorkflowImportFile(input) {
  const file = input?.files?.[0];
  if (!file) return;
  if (file.size > 256 * 1024) {
    toast("Workflow JSON must be 256 KB or smaller.", "warning");
    input.remove();
    return;
  }
  if (!begin("import-workflow")) return;
  state.importBusy = true;
  renderApp();
  try {
    const parsed = JSON.parse(await file.text());
    const definition = normalizeWorkflowDefinition(parsed);
    const response = await api.importWorkflow(definition);
    if (state.serverBacked) applyApiSnapshot(await api.refreshWorkspace());
    else if (response.workspace) applyApiSnapshot(response);
    const imported = response.workflow;
    if (imported?.id) {
      state.selectedWorkflowId = imported.id;
      state.view = "editor";
      focusMainAfterRender = true;
    }
    toast(response.routeFallback ? "Workflow imported through the compatible create route. It remains a draft and its graph is retained in the browser preview." : "Workflow imported as a draft.", response.routeFallback ? "warning" : "success");
  } catch (error) {
    toast(getErrorMessage(error, "The workflow JSON could not be imported."), "error");
  } finally {
    input.remove();
    state.importBusy = false;
    finish("import-workflow");
    renderApp();
  }
}

async function importWorkflowValue(value) {
  const parsed = parseJsonValue(value, "Workflow JSON");
  const definition = normalizeWorkflowDefinition(parsed);
  if (!begin("import-workflow")) return;
  state.importBusy = true;
  renderApp();
  try {
    const response = await api.importWorkflow(definition);
    if (state.serverBacked) applyApiSnapshot(await api.refreshWorkspace());
    else if (response.workspace) applyApiSnapshot(response);
    if (response.workflow?.id) {
      state.selectedWorkflowId = response.workflow.id;
      state.view = "editor";
      focusMainAfterRender = true;
    }
    toast(response.routeFallback ? "Workflow imported through the compatible create route; it remains a draft." : "Workflow imported as a draft.", response.routeFallback ? "warning" : "success");
  } catch (error) {
    toast(getErrorMessage(error, "The workflow JSON could not be imported."), "error");
  } finally {
    state.importBusy = false;
    finish("import-workflow");
    renderApp();
  }
}

async function handleGraphAction(action, target) {
  const workflow = selectedWorkflow();
  const id = target?.dataset?.workflowId || workflow?.id || target?.dataset?.id;
  if (!id) {
    toast("Open a workflow before editing its graph.", "warning");
    return;
  }
  let graph = graphFromTarget(target);
  if (!graph && target?.dataset?.node) {
    const node = parseJsonValue(target.dataset.node, "Workflow node");
    graph = updateGraphNode(workflow?.graph, node);
  }
  if (!graph && ["remove-graph-node", "delete-graph-node"].includes(action)) {
    const nodeId = target.dataset.nodeId || target.dataset.id;
    const current = normalizeGraph(workflow?.graph);
    if (current) graph = normalizeGraph({ ...current, nodes: current.nodes.filter((node) => node.id !== nodeId), edges: current.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId) });
  }
  if (!graph && action === "connect-graph-nodes") {
    const current = normalizeGraph(workflow?.graph) || { version: "1", nodes: [], edges: [] };
    const source = target.dataset.source || target.dataset.from;
    const destination = target.dataset.target || target.dataset.to;
    if (source && destination) graph = normalizeGraph({ ...current, edges: [...current.edges, { id: `edge-${Date.now()}`, source, target: destination }] });
  }
  if (!graph) {
    toast("Provide a workflow graph before saving.", "warning");
    return;
  }
  await saveWorkflowGraph(id, graph, { message: "Workflow graph saved." });
}

async function toggleWorkflowStatus(id, status) {
  const workflow = state.workspace?.workflows?.find((item) => item.id === id);
  if (!workflow) return;
  if (state.serverBacked) {
    if (!begin(`workflow-status-${id}`)) return;
    try {
      await api.updateWorkflow(id, { status });
      applyApiSnapshot(await api.refreshWorkspace());
      toast(`${workflow.name} is now ${status}.`);
    } catch (error) {
      toast(getErrorMessage(error, "The workflow status could not be changed."), "error");
    } finally {
      finish(`workflow-status-${id}`);
      renderApp();
    }
    return;
  }
  const workflows = state.workspace.workflows.map((item) => item.id === id ? { ...item, status } : item);
  await persistWorkspace({ workflows, activity: addActivity(`Workflow ${status === "active" ? "activated" : "paused"}`, workflow.name) }, `${workflow.name} is now ${status}.`, `workflow-status-${id}`);
}

async function runWorkflow(form) {
  const workflow = state.workspace?.workflows?.find((item) => item.id === state.selectedWorkflowId);
  const input = form.querySelector("#run-input")?.value || "";
  state.runInput = input;
  if (!workflow || !input.trim()) {
    toast("Add a request or task before running the test.", "warning");
    return;
  }
  const requiredCredits = Math.max(1, Number(workflow.budgetCredits) || 60);
  const currentUsage = usageWith();
  if (requiredCredits > currentUsage.available) {
    toast("This test needs more available demo credits. Review Plans & usage before running it.", "warning");
    return;
  }
  if (!begin(`run-${workflow.id}`)) return;
  state.runBusy = true;
  renderApp();
  try {
    if (state.serverBacked) {
      await api.runWorkflow(workflow.id, input.trim());
      applyApiSnapshot(await api.refreshWorkspace());
      const pending = state.workspace.approvals.some((item) => item.status === "pending" && item.workflowId === workflow.id);
      toast(pending ? "Local test recorded. The output is ready in Review queue." : "Local test recorded in the local adapter.", pending ? "warning" : "success");
    } else {
      const localRun = browserRunRecord(workflow, input);
      await persistWorkspace(localRun.patch, localRun.message, `run-save-${workflow.id}`);
    }
  } catch (error) {
    toast(getErrorMessage(error, "The local test could not be recorded."), "error");
  }
  finish(`run-${workflow.id}`);
  state.runBusy = false;
  renderApp();
}

async function retryFailedRun(id) {
  const run = state.workspace?.runs?.find((item) => item.id === id);
  const workflow = run && state.workspace?.workflows?.find((item) => item.id === run.workflowId);
  const failed = ["failed", "error"].includes(run?.status);
  const input = String(run?.input || "").trim();
  if (!run || !workflow || !failed) return;
  if (!input) {
    toast("This failed run has no captured request to retry.", "warning");
    return;
  }
   const retryCredits = Math.max(1, Number(workflow.budgetCredits) || 60);
  if (retryCredits > usageWith().available) {
    toast("This retry needs more available demo credits. Review Plans & usage before trying again.", "warning");
    return;
  }
  const key = `retry-run-${run.id}`;
  if (!begin(key)) return;
  renderApp();
  try {
    if (state.serverBacked) {
      let retried = null;
      if (typeof api.retryRun === "function") retried = await api.retryRun(run.id);
      // The current adapter predates the dedicated retry route. Re-submit the
      // captured request through the supported run command when it is absent.
      if (!retried) retried = await api.runWorkflow(workflow.id, input);
      applyApiSnapshot(await api.refreshWorkspace());
      const stored = state.workspace.runs.find((item) => item.id === retried?.id);
      state.selectedWorkflowId = workflow.id;
      state.selectedRunId = stored?.id || retried?.id || run.id;
      toast(retried?.status === "failed" ? "The retry also failed. Inspect the new run record for details." : "Failed run retried in the local adapter.", retried?.status === "failed" ? "warning" : "success");
    } else {
      const localRun = browserRunRecord(workflow, input);
      const saved = await persistWorkspace(localRun.patch, "Failed run retried in the browser-only demo.", `retry-save-${run.id}`);
      if (!saved) return;
      state.selectedWorkflowId = workflow.id;
      state.selectedRunId = localRun.run.id;
    }
  } catch (error) {
    toast(getErrorMessage(error, "The failed run could not be retried."), "error");
  } finally {
    finish(key);
    renderApp();
  }
}

async function decideApproval(id, decision) {
  const approval = state.workspace?.approvals?.find((item) => item.id === id);
  if (!approval || approval.status !== "pending" || !begin(`approval-${id}`)) return;
  if (state.serverBacked) {
    try {
      await api.decideApproval(id, decision);
      applyApiSnapshot(await api.refreshWorkspace());
      toast(decision === "approve" ? "Output approved internally. Nothing was sent." : "Output rejected. Reserved credits released.", decision === "approve" ? "success" : "warning");
    } catch (error) {
      toast(getErrorMessage(error, "The approval decision could not be saved."), "error");
    } finally {
      finish(`approval-${id}`);
      renderApp();
    }
    return;
  }
  const status = decision === "approve" ? "approved" : "rejected";
  const runStatus = decision === "approve" ? "completed" : "rejected";
  const reserved = Math.max(safeNumber(state.workspace.usage.reserved) - safeNumber(approval.credits), 0);
  const used = safeNumber(state.workspace.usage.used) + (decision === "approve" ? safeNumber(approval.credits) : 0);
  const approvals = state.workspace.approvals.map((item) => item.id === id ? { ...item, status, decidedAt: new Date().toISOString() } : item);
  const runs = state.workspace.runs.map((item) => item.id === approval.runId ? { ...item, status: runStatus } : item);
  await persistWorkspace({ approvals, runs, usage: usageWith({ used, reserved }), activity: addActivity(`Output ${status} internally`, approval.title) }, status === "approved" ? "Output approved internally. Nothing was sent." : "Output rejected. Reserved credits released.", `approval-save-${id}`);
  finish(`approval-${id}`);
  renderApp();
}

async function toggleIntegration(id) {
  const integration = state.workspace?.integrations?.find((item) => item.id === id);
  if (!integration || !begin(`integration-${id}`)) return;
  try {
    if (integration.previewSelected || integration.connected) {
      await clearConnectorPreview(id);
    } else {
      await selectConnectorPreview(id);
    }
  } finally {
    finish(`integration-${id}`);
    renderApp();
  }
}

async function createKnowledge(form) {
  if (!begin("create-knowledge")) return;
  const values = Object.fromEntries(new FormData(form).entries());
  if (!values.title?.trim() || !values.content?.trim()) {
    finish("create-knowledge");
    toast("Add a title and approved reference text first.", "warning");
    return;
  }
  const item = { id: `knowledge-${Date.now()}`, title: values.title.trim(), content: values.content.trim(), status: "synced", kind: "Workspace note", createdAt: new Date().toISOString() };
  let saved = false;
  try {
    if (state.serverBacked) {
      await api.createKnowledge(item);
      applyApiSnapshot(await api.refreshWorkspace());
      toast("Reference added to the local knowledge boundary.");
      saved = true;
    } else {
      saved = await persistWorkspace({ knowledge: [item, ...array(state.workspace.knowledge)], activity: addActivity("Reference added", item.title) }, "Reference added to the workspace.", "create-knowledge-save");
    }
  } catch (error) {
    toast(getErrorMessage(error, "The reference could not be added."), "error");
  }
  finish("create-knowledge");
  if (saved) closeModal();
  else renderApp();
}

async function saveSettings(form) {
  if (!begin("settings-save")) return;
  const values = Object.fromEntries(new FormData(form).entries());
  if (!values.name?.trim()) {
    finish("settings-save");
    toast("A workspace name is required.", "warning");
    return;
  }
  await persistWorkspace({
    name: values.name.trim(),
    description: values.description?.trim() || "",
    goal: values.goal?.trim() || "",
    timezone: values.timezone || "UTC",
    activity: addActivity("Workspace profile saved", values.name.trim())
  }, "Workspace profile saved.", "settings-save-local");
  finish("settings-save");
  renderApp();
}

async function deleteKnowledge(id) {
  if (!begin(`delete-knowledge-${id}`)) return;
  const item = state.workspace?.knowledge?.find((record) => record.id === id);
  try {
    if (state.serverBacked) {
      await api.deleteKnowledge(id);
      applyApiSnapshot(await api.refreshWorkspace());
      toast("Knowledge record removed from the local adapter.", "warning");
    } else {
      await persistWorkspace({ knowledge: state.workspace.knowledge.filter((record) => record.id !== id), activity: addActivity("Knowledge removed", item?.title || "Workspace record") }, "Knowledge record removed.", `delete-knowledge-save-${id}`);
    }
  } catch (error) {
    toast(getErrorMessage(error, "The knowledge record could not be removed."), "error");
  }
  finish(`delete-knowledge-${id}`);
  renderApp();
}

async function toggleSecurity(key) {
  const current = { ...(state.workspace?.security || {}) };
  const nextValue = current[key] === false;
  const security = { ...current, [key]: nextValue };
  await persistWorkspace({ security, settings: { ...(state.workspace?.settings || {}), [key]: nextValue }, activity: addActivity(`Security control ${nextValue ? "enabled" : "disabled"}`, key) }, `${titleCase(key)} ${nextValue ? "enabled" : "disabled"}.`, `security-${key}`);
}

async function simulateTopup() {
  const plan = state.plans.find((item) => item.id === (state.workspace?.plan || "starter"));
  const credits = safeNumber(plan?.topUp?.credits, 10000);
  if (state.serverBacked) {
    if (!begin("billing-topup")) return;
    try {
      const response = await api.sandboxTopup();
      applyApiSnapshot(await api.refreshWorkspace());
      if (response?.usage) state.workspace.usage = usageWith(response.usage);
      toast(`${formatNumber(credits)} sandbox credits added. No payment was processed.`, "warning");
    } catch (error) {
      toast(getErrorMessage(error, "The sandbox top-up could not be recorded."), "error");
    } finally {
      finish("billing-topup");
      renderApp();
    }
    return;
  }
  await persistWorkspace({ usage: usageWith({ topup: safeNumber(state.workspace.usage.topup) + credits }), activity: addActivity("Sandbox top-up simulated", `${formatNumber(credits)} credits added`) }, `${formatNumber(credits)} local demo credits added.`, "billing-topup");
}

async function selectPlan(planId) {
  const plan = state.plans.find((item) => item.id === planId);
  if (!plan) return;
  const limit = plan.creditLimit === null ? state.workspace.usage.limit : plan.creditLimit;
  if (state.serverBacked) {
    if (!begin(`billing-plan-${planId}`)) return;
    try {
      await api.sandboxPlan(planId);
      applyApiSnapshot(await api.refreshWorkspace());
      toast(`${plan.name} selected in the sandbox. No subscription was charged.`, "warning");
    } catch (error) {
      toast(getErrorMessage(error, "The sandbox plan could not be changed."), "error");
    } finally {
      finish(`billing-plan-${planId}`);
      renderApp();
    }
    return;
  }
  await persistWorkspace({ plan: plan.id, planId: plan.id, usage: usageWith({ limit, included: limit }), activity: addActivity("Plan changed in demo", plan.name) }, `${plan.name} plan selected in the local demo.`, `billing-plan-${planId}`);
}

async function exportWorkspace() {
  if (!begin("export")) return;
  try {
    const payload = state.serverBacked ? await api.exportWorkspace() : null;
    downloadJson(`makeease-workspace-${new Date().toISOString().slice(0, 10)}.json`, payload?.export || state.workspace);
    toast("Workspace JSON exported.");
  } catch (error) {
    toast(getErrorMessage(error, "The workspace export could not be created."), "error");
  } finally {
    finish("export");
    renderApp();
  }
}

async function resetDemo() {
  if (!begin("reset")) return;
  try {
    await api.resetLocalDemo();
    toast("Browser demo reset. Reloading…", "warning");
    window.setTimeout(() => window.location.reload(), 300);
  } catch (error) {
    toast(getErrorMessage(error, "The browser demo could not be reset."), "error");
    finish("reset");
  }
}

function updateSearch(field, value) {
  const active = document.activeElement;
  const start = active?.selectionStart;
  const end = active?.selectionEnd;
  state[field] = value;
  renderApp();
  const input = $(field === "workflowQuery" ? "#workflow-search" : "#knowledge-search");
  if (input) {
    input.focus();
    if (start !== undefined) input.setSelectionRange(start, end);
  }
}

function handleClick(event) {
  const viewTarget = event.target.closest("[data-view]");
  if (viewTarget) {
    event.preventDefault();
    navigate(viewTarget.dataset.view);
    return;
  }
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (action === "toggle-nav") { state.mobileNavOpen = !state.mobileNavOpen; renderApp(); if (state.mobileNavOpen) $(".sidebar-close")?.focus(); return; }
  if (action === "close-nav") { state.mobileNavOpen = false; renderApp(); $(".mobile-menu")?.focus(); return; }
  if (action === "retry") { bootstrap(); return; }
  if (action === "switch-auth") { state.authView = state.authView === "register" ? "login" : "register"; renderApp(); return; }
  if (action === "use-browser-demo") { bootstrap(true); return; }
  if (action === "reset-demo") { resetDemo(); return; }
  if (action === "request-reset") { openModal({ type: "confirm", action: "reset", title: "Reset this local demo?", description: "This removes the changes stored in this browser.", message: "Your workflows, references, test records, and review decisions will return to the sample workspace. Export a copy first if you want to keep them.", confirmLabel: "Reset demo" }); return; }
  if (action === "close-modal") { closeModal(); return; }
  if (action === "new-workflow") { openModal({ type: "workflow", templateId: target.dataset.templateId || "" }); return; }
  if (["import-workflow", "import-workflow-json"].includes(action)) {
    if (target.dataset.json || target.dataset.workflowJson) importWorkflowValue(target.dataset.json || target.dataset.workflowJson);
    else openWorkflowImportPicker();
    return;
  }
  if (action === "new-knowledge") { openModal({ type: "knowledge" }); return; }
  if (action === "create-workflow") { const form = $("#workflow-form"); if (form?.reportValidity()) createWorkflow(form, target); return; }
  if (action === "create-knowledge") { const form = $("#knowledge-form"); if (form?.reportValidity()) createKnowledge(form); return; }
  if (action === "open-workflow" || action === "quick-run") { openWorkflow(id, action === "quick-run"); return; }
  if (["export-workflow", "export-workflow-json", "download-workflow"].includes(action)) { exportWorkflow(id || state.selectedWorkflowId); return; }
  if (["duplicate-workflow", "clone-workflow", "copy-workflow"].includes(action)) { duplicateWorkflow(id || state.selectedWorkflowId, target); return; }
  if (["save-workflow-graph", "update-workflow-graph", "workflow-graph-save", "add-graph-node", "remove-graph-node", "delete-graph-node", "connect-graph-nodes"].includes(action)) { handleGraphAction(action, target); return; }
  if (["select-connector-preview", "preview-connector", "choose-connector", "connector-preview", "select-connector", "open-connector-preview"].includes(action)) { selectConnectorPreview(target.dataset.connectorId || target.dataset.connector || id, target); return; }
  if (["clear-connector-preview", "remove-connector-preview"].includes(action)) { clearConnectorPreview(target.dataset.connectorId || target.dataset.connector || id); return; }
  if (action === "workflow-filter") { state.workflowFilter = target.dataset.filter || "all"; renderApp(); return; }
  if (action === "clear-workflow-filters") { state.workflowFilter = "all"; state.workflowQuery = ""; renderApp(); $("#workflow-search")?.focus(); return; }
  if (action === "clear-knowledge-search") { state.knowledgeQuery = ""; renderApp(); $("#knowledge-search")?.focus(); return; }
  if (action === "toggle-workflow-status") {
    const workflow = state.workspace?.workflows?.find((item) => item.id === id);
    if (!workflow) return;
    const nextStatus = workflow.status === "active" ? "paused" : "active";
    openModal({ type: "confirm", action: "workflow-status", id, status: nextStatus, title: `${nextStatus === "active" ? "Activate" : "Pause"} workflow?`, description: "Confirm the local workflow status change.", message: `${workflow.name} will be marked ${nextStatus}.`, confirmLabel: nextStatus === "active" ? "Activate workflow" : "Pause workflow", warning: "This only changes the persisted local workspace snapshot." });
    return;
  }
  if (action === "toggle-worker") {
    const workflow = state.workspace?.workflows?.find((item) => item.id === id);
    if (workflow) toggleWorkflowStatus(id, workflow.status === "active" ? "paused" : "active");
    return;
  }
  if (action === "open-approval") { state.selectedApprovalId = id; state.view = "approvals"; state.mobileNavOpen = false; renderApp(); $("#review-detail")?.focus(); return; }
  if (action === "open-run") { state.selectedRunId = id; state.view = "runs"; state.mobileNavOpen = false; focusMainAfterRender = true; renderApp(); return; }
  if (action === "back-runs") { state.selectedRunId = null; focusMainAfterRender = true; renderApp(); return; }
  if (action === "retry-run") { retryFailedRun(id); return; }
  if (action === "approval-decision") { decideApproval(id, target.dataset.decision); return; }
  if (action === "toggle-integration") { toggleIntegration(id); return; }
  if (action === "delete-knowledge") { openModal({ type: "confirm", action: "knowledge-delete", id, title: "Delete knowledge record?", description: "Confirm this local workspace deletion.", message: "The selected record will be removed from this workspace snapshot.", confirmLabel: "Delete record" }); return; }
  if (action === "toggle-security") { toggleSecurity(target.dataset.key); return; }
  if (action === "topup") { openModal({ type: "confirm", action: "topup", title: "Simulate a credit top-up?", description: "This is a local, reversible demo action.", message: "Credits will be added to the browser or local adapter snapshot. No payment or checkout is involved.", confirmLabel: "Add demo credits" }); return; }
  if (action === "select-plan") { openModal({ type: "confirm", action: "plan", planId: target.dataset.planId, title: "Switch plan in the demo?", description: "Review this local capacity change before applying it.", message: "The selected plan and credit limit will be persisted to the local workspace snapshot.", confirmLabel: "Switch demo plan" }); return; }
  if (action === "confirm-modal") {
    const modal = state.modal;
    if (!modal) return;
    state.modal = null;
    if (modal.action === "workflow-status") { toggleWorkflowStatus(modal.id, modal.status); return; }
    if (modal.action === "knowledge-delete") { deleteKnowledge(modal.id); return; }
    if (modal.action === "topup") { simulateTopup(); return; }
    if (modal.action === "plan") { selectPlan(modal.planId); return; }
    if (modal.action === "reset") { resetDemo(); renderApp(); return; }
  }
  if (action === "export-workspace") { exportWorkspace(); return; }
}

function handleInput(event) {
  if (event.target.id === "run-input") { state.runInput = event.target.value; return; }
  if (event.target.id === "workflow-search") { updateSearch("workflowQuery", event.target.value); return; }
  if (event.target.id === "knowledge-search") { updateSearch("knowledgeQuery", event.target.value); }
}

function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (form.id === "auth-form") { submitAuth(form); return; }
  if (form.id === "workflow-form") { createWorkflow(form, event.submitter); return; }
  if (["workflow-graph-form", "graph-form"].includes(form.id) || form.matches("[data-workflow-graph-form]")) {
    const workflowId = form.dataset.workflowId || state.selectedWorkflowId;
    try {
      const graph = graphFromForm(form);
      handleGraphAction("save-workflow-graph", { dataset: { id: workflowId, graph: JSON.stringify(graph || {}) } });
    } catch (error) {
      toast(getErrorMessage(error, "The workflow graph could not be read."), "warning");
    }
    return;
  }
  if (form.id === "knowledge-form") { createKnowledge(form); return; }
  if (form.id === "run-form") { runWorkflow(form); }
  if (form.id === "settings-form") { saveSettings(form); }
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    if (state.modal) closeModal();
    else if (state.mobileNavOpen) { state.mobileNavOpen = false; renderApp(); $(".mobile-menu")?.focus(); }
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    if (state.modal || state.mobileNavOpen) return;
    event.preventDefault();
    $(state.view === "knowledge" ? "#knowledge-search" : "#workflow-search")?.focus();
  }
  const overlay = state.modal ? modalRoot : state.mobileNavOpen && narrowViewport.matches ? $("#sidebar") : null;
  if (event.key === "Tab" && overlay) {
    const focusable = $$('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [href]', overlay).filter((element) => element.getClientRects().length && !element.closest("[inert]"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  }
}

function handleTemplateChange(event) {
  if (event.target.name !== "workflow-template" || state.modal?.type !== "workflow") return;
  const availableTemplates = array(state.templates).length ? state.templates : DEFAULT_TEMPLATES;
  const previous = availableTemplates.find((item) => item.id === state.modal.templateId) || availableTemplates[0];
  const next = availableTemplates.find((item) => item.id === event.target.value);
  if (!next) return;
  const name = $("#workflow-name");
  const description = $("#workflow-description");
  if (name && (!name.value.trim() || name.value === previous.name)) name.value = next.name;
  if (description && (!description.value.trim() || description.value === previous.description)) description.value = next.description;
  state.modal.templateId = next.id;
}

function handleChange(event) {
  const target = event.target;
  if (target.matches?.("[data-workflow-import]")) {
    handleWorkflowImportFile(target);
    return;
  }
  if (target.matches?.("[data-connector-select], [data-connector-preview-select]")) {
    selectConnectorPreview(target.value, target);
  }
}

function handleWorkflowGraphEvent(event) {
  const detail = event.detail || {};
  const workflowId = detail.workflowId || state.selectedWorkflowId;
  const graph = graphFromCustomEvent(event);
  if (workflowId && graph) saveWorkflowGraph(workflowId, graph);
}

function handleConnectorPreviewEvent(event) {
  const detail = event.detail || {};
  selectConnectorPreview(detail.connectorId || detail.connectorKey || detail.connector, {
    dataset: { workflowId: detail.workflowId || state.selectedWorkflowId, nodeId: detail.nodeId || "" }
  });
}

function handleWorkflowImportEvent(event) {
  const detail = event.detail || event.data;
  if (detail) importWorkflowValue(detail);
}

document.addEventListener("click", handleClick);
document.addEventListener("input", handleInput);
document.addEventListener("change", handleTemplateChange);
document.addEventListener("change", handleChange);
document.addEventListener("submit", handleSubmit);
document.addEventListener("keydown", handleKeydown);
document.addEventListener("makeease:workflow-graph", handleWorkflowGraphEvent);
document.addEventListener("makeease:workflow-graph-update", handleWorkflowGraphEvent);
document.addEventListener("workflow-graph-change", handleWorkflowGraphEvent);
document.addEventListener("workflow:graph-change", handleWorkflowGraphEvent);
document.addEventListener("workflow:graph:update", handleWorkflowGraphEvent);
document.addEventListener("makeease:connector-preview", handleConnectorPreviewEvent);
document.addEventListener("makeease:connector-preview-select", handleConnectorPreviewEvent);
document.addEventListener("connector-preview-select", handleConnectorPreviewEvent);
document.addEventListener("connector:selected", handleConnectorPreviewEvent);
document.addEventListener("makeease:workflow-import", handleWorkflowImportEvent);
document.addEventListener("workflow:import", handleWorkflowImportEvent);
document.addEventListener("click", (event) => { if (event.target.matches("[data-modal-backdrop]")) closeModal(); });
document.addEventListener("invalid", (event) => { const details = event.target.closest("details"); if (details) details.open = true; }, true);
narrowViewport.addEventListener("change", () => {
  if (!narrowViewport.matches && state.mobileNavOpen) { state.mobileNavOpen = false; renderApp(); }
  else syncAccessibility();
});

bootstrap();
