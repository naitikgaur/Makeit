const API_BASE = "/api";
const LOCAL_STORAGE_KEY = "makeease.local.workspace.v1";
const STORAGE_MODE_KEY = "makeease.local.storage-mode.v1";
const GRAPH_OVERLAY_KEY = "makeease.local.workflow-graph-overlays.v1";
const MAX_WORKFLOW_JSON_BYTES = 256 * 1024;
const MAX_GRAPH_NODES = 100;
const MAX_GRAPH_EDGES = 200;
const MAX_GRAPH_DEPTH = 8;
const UNSAFE_KEY_PATTERN = /^(?:__proto__|prototype|constructor)$/;
const SENSITIVE_KEY_PATTERN = /(password|secret|token|api[-_]?key|private[-_]?key|credential|authorization)/i;
const WORKFLOW_GRAPH_KEYS = ["trigger", "nodes", "edges", "policy", "retry", "connector", "connectors", "connectorMetadata"];
let volatileWorkspace = null;
let storageMode = "browser";
let serverBacked = false;
let connectorCatalog = [];
let csrfToken = null;

export class ApiError extends Error {
  constructor(message, { code = "REQUEST_FAILED", status = 0, source = "service" } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.source = source;
  }
}

const DEFAULT_PLANS = [
  {
    id: "starter",
    name: "MakeEase Support",
    price: 149,
    creditLimit: 15000,
    topUp: { credits: 10000, price: 12 },
    packetLimit: 500,
    reviewerLimit: 3,
    description: "One support workflow for a small B2B SaaS team.",
    features: ["Three reviewers", "500 support review packets", "Approval-first drafts"]
  },
  {
    id: "growth",
    name: "MakeEase Team",
    price: 499,
    creditLimit: 40000,
    topUp: { credits: 10000, price: 12 },
    packetLimit: 1000,
    reviewerLimit: 10,
    description: "More support capacity and review controls for a growing team.",
    features: ["Everything in Support", "Expanded packet capacity", "Team review controls"]
  },
  {
    id: "business",
    name: "MakeEase Custom",
    price: null,
    creditLimit: 90000,
    topUp: { credits: 10000, price: 12 },
    packetLimit: 2500,
    reviewerLimit: 25,
    description: "Custom capacity, security, and implementation support.",
    features: ["Custom packet capacity", "Advanced approvals", "Implementation support"]
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    creditLimit: null,
    topUp: null,
    description: "Custom limits, controls, and implementation support.",
    features: ["Custom credit volume", "SSO and advanced controls", "Dedicated implementation"]
  }
];

const DEFAULT_WORKSPACE = {
  id: "demo-workspace",
  name: "MakeEase Support Preview",
  description: "A focused workspace for preparing support drafts before a human decides what happens next.",
  goal: "Turn one support request into a grounded, reviewable draft.",
  timezone: "UTC",
  plan: "starter",
  owner: { name: "Workspace owner", role: "Owner" },
  usage: { used: 0, limit: 15000, reserved: 0, topup: 0, packetsPrepared: 0, packetLimit: 500 },
  integrations: [
    { id: "gmail", name: "Gmail", connected: false, detail: "Preview only · OAuth placeholder", category: "Communication" },
    { id: "slack", name: "Slack", connected: false, detail: "Catalog preview only", category: "Communication" },
    { id: "github", name: "GitHub", connected: false, detail: "Catalog preview only", category: "Engineering" },
    { id: "notion", name: "Notion", connected: false, detail: "Catalog preview only", category: "Knowledge" },
    { id: "stripe", name: "Stripe", connected: false, detail: "Catalog preview only", category: "Finance" },
    { id: "linear", name: "Linear", connected: false, detail: "Catalog preview only", category: "Engineering" }
  ],
  workflows: [
    { id: "support", name: "Customer support triage", description: "Classify a support request, ground a draft in approved policy, and hold it for review.", status: "active", runs: 0, credits: 0, budgetCredits: 50, model: "makeease-small", requiresApproval: true, createdAt: "2026-01-01T09:00:00.000Z" }
  ],
  approvals: [],
  runs: [],
  activity: [{ id: "activity-1", action: "Support triage ready", detail: "Run one synthetic request to prepare your first review packet.", createdAt: "2026-01-01T09:00:00.000Z" }],
  knowledge: [
    { id: "source-1", title: "Support review policy", content: "Refund and account requests require human confirmation. Never promise eligibility until the reviewer checks the account. Keep customer-facing sending disabled until a reviewer approves the exact draft.", status: "approved", kind: "Policy", createdAt: "2026-01-01T09:00:00.000Z" }
  ],
  settings: { approvalMode: true, smartRouting: true, weeklyBrief: true, darkMode: false },
  security: { approvalMode: true, safeMode: true, auditTrail: true, privateWorkspace: true }
};

// Catalog records are intentionally capability metadata only.  They describe
// possible workflow context; they never represent an OAuth grant, provider
// health, or a live connection.
const DEFAULT_CONNECTORS = [
  { id: "gmail", name: "Gmail", description: "Email context for a bounded workflow preview.", category: "Communication", status: "not_configured", available: false, connected: false, live: false, previewOnly: true },
  { id: "slack", name: "Slack", description: "Team conversation context for a bounded workflow preview.", category: "Communication", status: "not_configured", available: false, connected: false, live: false, previewOnly: true },
  { id: "github", name: "GitHub", description: "Repository and issue context for a bounded workflow preview.", category: "Product", status: "not_configured", available: false, connected: false, live: false, previewOnly: true },
  { id: "notion", name: "Notion", description: "Knowledge context for a bounded workflow preview.", category: "Knowledge", status: "not_configured", available: false, connected: false, live: false, previewOnly: true },
  { id: "stripe", name: "Stripe", description: "Finance context metadata for a bounded workflow preview.", category: "Finance", status: "not_configured", available: false, connected: false, live: false, previewOnly: true },
  { id: "linear", name: "Linear", description: "Product issue context for a bounded workflow preview.", category: "Product", status: "not_configured", available: false, connected: false, live: false, previewOnly: true }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(value, key) {
  return Boolean(value && Object.prototype.hasOwnProperty.call(value, key));
}

function randomId(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${suffix}`.slice(0, 128);
}

function canUseStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function safeClone(value, depth = 0, seen = new Set()) {
  if (value === null || value === undefined || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (depth > MAX_GRAPH_DEPTH || (value && typeof value === "object" && seen.has(value))) return undefined;
  if (Array.isArray(value)) {
    seen.add(value);
    const result = value.slice(0, MAX_GRAPH_EDGES).map((item) => safeClone(item, depth + 1, seen)).filter((item) => item !== undefined);
    seen.delete(value);
    return result;
  }
  if (!isObject(value)) return undefined;
  seen.add(value);
  const result = {};
  for (const [key, child] of Object.entries(value).slice(0, 100)) {
    if (UNSAFE_KEY_PATTERN.test(key) || SENSITIVE_KEY_PATTERN.test(key)) continue;
    const copied = safeClone(child, depth + 1, seen);
    if (copied !== undefined) result[key] = copied;
  }
  seen.delete(value);
  return result;
}

function normalizeConnector(value, index = 0) {
  const source = isObject(value) ? value : { id: value };
  const id = String(source.id || source.key || source.connectorKey || `connector-${index + 1}`).trim().slice(0, 128) || `connector-${index + 1}`;
  const name = String(source.name || source.label || source.title || id).trim().slice(0, 160) || id;
  const status = String(source.status || "not_configured").trim().toLowerCase();
  // A catalog can advertise availability, but the browser must never turn a
  // catalog record into a claim that an account is connected or live.
  return {
    ...safeClone(source),
    id,
    key: source.key || source.connectorKey || id,
    name,
    description: String(source.description || source.detail || "Catalog capability available for preview.").slice(0, 1000),
    category: String(source.category || "Workspace tool").slice(0, 100),
    status: ["connected", "ready", "available"].includes(status) ? "not_configured" : status || "not_configured",
    available: Boolean(source.available),
    connected: false,
    live: false,
    previewOnly: true
  };
}

export function normalizeConnectorCatalog(value) {
  const list = Array.isArray(value) ? value : [];
  const normalized = list.slice(0, MAX_GRAPH_NODES).map(normalizeConnector).filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
  return normalized.length ? normalized : DEFAULT_CONNECTORS.map((item) => clone(item));
}

function readGraphCandidate(workflow) {
  if (!isObject(workflow)) return null;
  if (isObject(workflow.graph)) return workflow.graph;
  if (isObject(workflow.workflowGraph)) return workflow.workflowGraph;
  if (isObject(workflow.definition?.graph)) return workflow.definition.graph;
  if (WORKFLOW_GRAPH_KEYS.some((key) => hasOwn(workflow, key))) {
    return Object.fromEntries(WORKFLOW_GRAPH_KEYS.filter((key) => hasOwn(workflow, key)).map((key) => [key, workflow[key]]));
  }
  if (Array.isArray(workflow.nodes) || Array.isArray(workflow.edges)) return { nodes: workflow.nodes || [], edges: workflow.edges || [] };
  return null;
}

export function normalizeGraph(value) {
  if (!isObject(value)) return null;
  const source = safeClone(value);
  if (!isObject(source)) return null;
  const nodes = Array.isArray(source.nodes) ? source.nodes.slice(0, MAX_GRAPH_NODES).filter((node) => isObject(node)).map((node, index) => ({
    ...node,
    id: String(node.id || `node-${index + 1}`).slice(0, 128),
    type: String(node.type || node.kind || "transform").slice(0, 64),
    kind: String(node.kind || node.type || "transform").slice(0, 80),
    ...(node.connector || node.connectorId || node.connectorKey ? {
      connector: normalizeConnector(isObject(node.connector) ? node.connector : { id: node.connector || node.connectorId || node.connectorKey, name: node.connectorName }),
      connectorId: String(node.connectorId || (isObject(node.connector) ? node.connector.id : node.connector) || node.connectorKey || "").slice(0, 128),
      connectorStatus: "preview_only",
      connected: false,
      live: false,
      previewOnly: true
    } : {})
  })) : [];
  const edges = Array.isArray(source.edges) ? source.edges.slice(0, MAX_GRAPH_EDGES).filter((edge) => isObject(edge)).map((edge, index) => ({
    ...edge,
    id: String(edge.id || `edge-${index + 1}`).slice(0, 128),
    source: String(edge.source || edge.from || "").slice(0, 128),
    target: String(edge.target || edge.to || "").slice(0, 128)
  })).filter((edge) => edge.source && edge.target) : [];
  return {
    ...source,
    version: String(source.version || source.schemaVersion || "1").slice(0, 40),
    nodes,
    edges,
    ...(Array.isArray(source.connectors) ? { connectors: source.connectors.slice(0, MAX_GRAPH_NODES).map(normalizeConnector) } : {})
  };
}

function graphForWorkflow(workflow) {
  const candidate = readGraphCandidate(workflow);
  return candidate ? normalizeGraph(candidate) : null;
}

function graphConnectorPayload(value) {
  if (typeof value === "string") return value.slice(0, 128);
  if (!isObject(value)) return null;
  const source = normalizeConnector(value);
  const allowed = ["id", "type", "kind", "name", "label", "description", "category", "provider", "operation", "action", "operations", "actions", "mode", "status", "connected", "available", "readOnly", "sideEffects", "externalSideEffects", "capabilities", "scopes", "config", "metadata", "version"];
  const result = {};
  for (const key of allowed) if (hasOwn(source, key)) result[key] = safeClone(source[key]);
  result.id = String(result.id || source.key || "connector").slice(0, 128);
  result.status = result.status === "connected" ? "not_configured" : String(result.status || "not_configured");
  result.connected = false;
  result.available = false;
  result.externalSideEffects = false;
  return result;
}

function graphNodePayload(value, index) {
  if (!isObject(value)) return null;
  const allowed = ["id", "type", "kind", "name", "label", "title", "description", "connector", "connectorId", "operation", "action", "mode", "config", "data", "metadata", "policy", "retry", "position", "inputs", "outputs", "enabled", "version"];
  const result = {};
  for (const key of allowed) if (hasOwn(value, key)) result[key] = safeClone(value[key]);
  result.id = String(result.id || `node-${index + 1}`).slice(0, 128);
  result.type = String(result.type || result.kind || "transform").slice(0, 64);
  if (hasOwn(result, "connector")) result.connector = graphConnectorPayload(result.connector);
  if (result.connector === null) delete result.connector;
  return result;
}

function graphEdgePayload(value, index) {
  if (!isObject(value)) return null;
  const allowed = ["id", "source", "target", "from", "to", "sourceHandle", "targetHandle", "label", "type", "condition", "when", "metadata"];
  const result = {};
  for (const key of allowed) if (hasOwn(value, key)) result[key] = safeClone(value[key]);
  result.id = String(result.id || `edge-${index + 1}`).slice(0, 128);
  result.source = String(result.source || result.from || "").slice(0, 128);
  result.target = String(result.target || result.to || "").slice(0, 128);
  delete result.from;
  delete result.to;
  return result.source && result.target ? result : null;
}

function workflowGraphPayload(value) {
  const graph = normalizeGraph(value);
  if (!graph) return {};
  const payload = {};
  if (hasOwn(graph, "trigger")) payload.trigger = safeClone(graph.trigger);
  if (Array.isArray(graph.nodes)) payload.nodes = graph.nodes.map(graphNodePayload).filter(Boolean).slice(0, MAX_GRAPH_NODES);
  if (Array.isArray(graph.edges)) payload.edges = graph.edges.map(graphEdgePayload).filter(Boolean).slice(0, MAX_GRAPH_EDGES);
  for (const key of ["policy", "retry"]) if (hasOwn(graph, key)) payload[key] = safeClone(graph[key]);
  if (hasOwn(graph, "connector")) payload.connector = graphConnectorPayload(graph.connector);
  if (Array.isArray(graph.connectors)) payload.connectors = graph.connectors.map(graphConnectorPayload).filter(Boolean).slice(0, MAX_GRAPH_NODES);
  if (hasOwn(graph, "connectorMetadata")) {
    payload.connectorMetadata = Array.isArray(graph.connectorMetadata)
      ? graph.connectorMetadata.map(graphConnectorPayload).filter(Boolean).slice(0, MAX_GRAPH_NODES)
      : graphConnectorPayload(graph.connectorMetadata);
  }
  return payload;
}

export function normalizeWorkflowDefinition(value, { includeStatus = false } = {}) {
  let rawSize = 0;
  try { rawSize = JSON.stringify(value)?.length || 0; } catch {
    throw new ApiError("The workflow JSON must be serializable.", { code: "INVALID_WORKFLOW_JSON", source: "browser" });
  }
  if (rawSize > MAX_WORKFLOW_JSON_BYTES) throw new ApiError("Workflow JSON must be 256 KB or smaller.", { code: "WORKFLOW_JSON_TOO_LARGE", source: "browser" });
  const source = isObject(value?.workflow) ? value.workflow : value;
  if (!isObject(source)) throw new ApiError("The workflow JSON must contain one workflow object.", { code: "INVALID_WORKFLOW_JSON", source: "browser" });
  const definition = {};
  for (const key of ["name", "description", "templateId", "model", "budgetCredits", "requiresApproval"]) {
    if (hasOwn(source, key)) definition[key] = safeClone(source[key]);
  }
  if (includeStatus && hasOwn(source, "status")) definition.status = safeClone(source.status);
  const graph = graphForWorkflow(source);
  if (graph) definition.graph = graph;
  for (const key of ["connectorIds", "connectorRefs", "connectors", "graphVersion"]) {
    if (!hasOwn(source, key)) continue;
    definition[key] = key === "connectors"
      ? (Array.isArray(source[key]) ? source[key].slice(0, MAX_GRAPH_NODES).map(normalizeConnector) : [])
      : safeClone(source[key]);
  }
  definition.name = String(definition.name || "Imported workflow").trim().slice(0, 120) || "Imported workflow";
  definition.description = String(definition.description || "Bounded automation with a reviewable output.").slice(0, 2000);
  definition.templateId = String(definition.templateId || "customer-support-triage").slice(0, 100);
  definition.model = String(definition.model || "makeease-small").slice(0, 200);
  const budget = Number(definition.budgetCredits);
  definition.budgetCredits = Number.isInteger(budget) && budget > 0 ? Math.min(budget, 100000) : 60;
  definition.requiresApproval = definition.requiresApproval !== false;
  return definition;
}

export function workflowExportPayload(workflow) {
  const definition = normalizeWorkflowDefinition(workflow, { includeStatus: false });
  const canonicalGraph = definition.graph ? workflowGraphPayload(definition.graph) : {};
  return {
    schemaVersion: "makeease-workflow/v1",
    kind: "workflow-definition",
    exportedAt: new Date().toISOString(),
    // Keep the nested graph for browser clients while also including the
    // adapter's top-level graph fields so an export can be handed to either
    // shape without carrying runs, approvals, credentials, or live state.
    workflow: { ...definition, ...canonicalGraph }
  };
}

function graphOverlaySnapshot() {
  if (!canUseStorage()) return {};
  try {
    const saved = window.localStorage.getItem(GRAPH_OVERLAY_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    if (!isObject(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).slice(0, MAX_GRAPH_NODES).map(([id, graph]) => [id, normalizeGraph(graph)]).filter(([, graph]) => graph));
  } catch {
    return {};
  }
}

function writeGraphOverlay(id, graph) {
  const overlays = graphOverlaySnapshot();
  if (graph) overlays[id] = normalizeGraph(graph);
  else delete overlays[id];
  try {
    if (canUseStorage()) window.localStorage.setItem(GRAPH_OVERLAY_KEY, JSON.stringify(overlays));
  } catch {
    // The browser-only fallback remains usable even when storage is disabled.
  }
  return overlays[id] || null;
}

function applyGraphOverlays(snapshot) {
  if (!isObject(snapshot) || !Array.isArray(snapshot.workflows)) return snapshot;
  const overlays = graphOverlaySnapshot();
  if (!Object.keys(overlays).length) return snapshot;
  return {
    ...snapshot,
    workflows: snapshot.workflows.map((workflow) => overlays[workflow.id] && !graphForWorkflow(workflow)
      ? { ...workflow, graph: overlays[workflow.id] }
      : workflow)
  };
}

function applyPreviewOverlay(snapshot) {
  if (!isObject(snapshot)) return snapshot;
  const local = readStoredWorkspace();
  if (!Array.isArray(local?.connectorPreviews)) return snapshot;
  return { ...snapshot, connectorPreviews: clone(local.connectorPreviews) };
}

function localWorkflowSnapshot() {
  return applyGraphOverlays(applyPreviewOverlay(readLocalWorkspace()));
}

function localWorkflowRecord(definition, { nameSuffix = "" } = {}) {
  const safe = normalizeWorkflowDefinition(definition);
  const createdAt = new Date().toISOString();
  return {
    id: randomId("workflow"),
    ...safe,
    ...(nameSuffix ? { name: `${safe.name}${nameSuffix}`.slice(0, 120) } : {}),
    status: "draft",
    runs: 0,
    credits: 0,
    createdAt,
    updatedAt: createdAt
  };
}

function graphCompatibilityError(error) {
  if (!error) return false;
  if (error.status === 404 || error.status === 405 || error.code === "NOT_FOUND" || error.code === "METHOD_NOT_ALLOWED") return true;
  return error.status === 400 && /(graph|node|edge|field|workflow payload|unknown)/i.test(`${error.code || ""} ${error.message || ""}`);
}

function connectorPayload(value, context = {}) {
  const source = isObject(value) ? value : { id: value };
  const connector = normalizeConnector(source);
  return {
    connectorId: connector.id,
    connectorKey: connector.key || connector.id,
    connectorName: connector.name,
    category: connector.category,
    workflowId: context.workflowId || null,
    nodeId: context.nodeId || null,
    status: "preview_only",
    connected: false,
    live: false,
    externalSideEffects: false,
    selectedAt: new Date().toISOString()
  };
}

function merge(base, patch) {
  const next = clone(base);
  Object.entries(patch || {}).forEach(([key, value]) => {
    next[key] = isObject(next[key]) && isObject(value) ? merge(next[key], value) : clone(value);
  });
  return next;
}

function readStoredWorkspace() {
  if (!canUseStorage()) return null;
  try {
    const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? merge(DEFAULT_WORKSPACE, JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

function readLocalWorkspace() {
  return clone(volatileWorkspace || readStoredWorkspace() || DEFAULT_WORKSPACE);
}

function writeLocalWorkspace(snapshot) {
  try {
    if (!canUseStorage()) throw new Error("localStorage is unavailable");
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
    window.localStorage.setItem(STORAGE_MODE_KEY, "browser");
    volatileWorkspace = null;
    storageMode = "browser";
    return { workspace: clone(snapshot), storage: storageMode, persisted: true };
  } catch {
    // Private browsing contexts can reject writes. Keep the session usable in memory.
    volatileWorkspace = clone(snapshot);
    storageMode = "memory";
    return { workspace: clone(snapshot), storage: storageMode, persisted: false };
  }
}

function memoryWorkspace(snapshot) {
  return clone(snapshot);
}

function isLocalFallbackError(error) {
  return error?.code === "NETWORK_ERROR" || error?.status === 404;
}

function mutationKey(prefix) {
  const suffix = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `ui-${prefix}-${suffix}`.slice(0, 128);
}

function unsupportedRouteError(error) {
  return error?.status === 405 || error?.code === "NOT_FOUND" || error?.code === "METHOD_NOT_ALLOWED";
}

function workflowPayload(workflow, { includeGraph = true, patch = false } = {}) {
  const source = isObject(workflow) ? workflow : {};
  const payload = {};
  for (const key of ["name", "description", "templateId", "model", "budgetCredits", "requiresApproval"]) {
    if (hasOwn(source, key)) payload[key] = safeClone(source[key]);
  }
  if (patch && hasOwn(source, "status")) payload.status = safeClone(source.status);
  if (includeGraph) {
    const graph = graphForWorkflow(source);
    if (graph) Object.assign(payload, workflowGraphPayload(graph));
  }
  return payload;
}

function workflowHasGraph(workflow) {
  return Boolean(graphForWorkflow(workflow));
}

function responseWorkflow(response, requestedWorkflow, { graphPersisted = true, compatibilityFallback = false } = {}) {
  const workflow = response?.workflow || response || {};
  const requestedGraph = graphForWorkflow(requestedWorkflow);
  const responseGraph = graphForWorkflow(workflow);
  const persisted = requestedGraph ? Boolean(responseGraph) && graphPersisted : true;
  if (requestedGraph && !persisted && workflow.id) writeGraphOverlay(workflow.id, requestedGraph);
  if (requestedGraph && persisted && workflow.id) writeGraphOverlay(workflow.id, null);
  return {
    ...workflow,
    ...(requestedGraph ? { graphPersisted: persisted, graphCompatibilityFallback: compatibilityFallback } : {})
  };
}

async function waitForRun(run) {
  let currentRun = run;
  for (let attempt = 0; currentRun && ["queued", "running"].includes(currentRun.status) && attempt < 80; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    const current = await request(`/runs/${encodeURIComponent(currentRun.id)}`);
    currentRun = current.run || currentRun;
  }
  return currentRun;
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(csrfToken && method !== "GET" && method !== "HEAD" ? { "X-CSRF-Token": csrfToken } : {}),
        ...headers,
        ...(body === undefined ? {} : { "Content-Type": "application/json" })
      },
      credentials: "same-origin",
      cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError("The local workspace service could not be reached.", { code: "NETWORK_ERROR", source: "browser" });
  }

  let payload = null;
  try { payload = await response.json(); } catch { /* empty response */ }
  if (!response.ok) {
    throw new ApiError(payload?.error?.message || `The workspace service returned ${response.status}.`, {
      code: payload?.error?.code || "REQUEST_FAILED",
      status: response.status,
      source: "service"
    });
  }
  return payload || {};
}

export async function resetLocalDemo() {
  volatileWorkspace = null;
  serverBacked = false;
  storageMode = "browser";
  connectorCatalog = [];
  try { if (canUseStorage()) window.localStorage.removeItem(LOCAL_STORAGE_KEY); } catch { /* best effort */ }
  try { if (canUseStorage()) window.localStorage.removeItem(STORAGE_MODE_KEY); } catch { /* best effort */ }
  try { if (canUseStorage()) window.localStorage.removeItem(GRAPH_OVERLAY_KEY); } catch { /* best effort */ }
  return clone(DEFAULT_WORKSPACE);
}

export const api = {
  isServerBacked() {
    return serverBacked;
  },

  async bootstrap({ localOnly = false } = {}) {
    if (localOnly) {
      serverBacked = false;
      connectorCatalog = normalizeConnectorCatalog(DEFAULT_CONNECTORS);
      return { workspace: localWorkflowSnapshot(), plans: clone(DEFAULT_PLANS), templates: [], models: [], connectors: clone(connectorCatalog), connectorCatalog: clone(connectorCatalog), source: "Browser demo", storage: storageMode, serverBacked: false };
    }
    try {
      const payload = await request("/bootstrap");
      csrfToken = payload.csrfToken || csrfToken;
      serverBacked = true;
      storageMode = "server";
      connectorCatalog = normalizeConnectorCatalog(payload.connectors || payload.connectorCatalog || payload.catalog?.connectors || payload.workspace?.connectors || payload.workspace?.connectorCatalog || DEFAULT_CONNECTORS);
      const bootWorkspace = {
        ...(payload.workspace || {}),
        ...(payload.workflows && !(payload.workspace?.workflows) ? { workflows: payload.workflows } : {}),
        ...(payload.connectors && !(payload.workspace?.connectors) ? { connectors: payload.connectors } : {}),
        ...(payload.connectorCatalog && !(payload.workspace?.connectorCatalog) ? { connectorCatalog: payload.connectorCatalog } : {})
      };
      return {
        workspace: applyGraphOverlays(applyPreviewOverlay(bootWorkspace)),
        packetUsage: payload.packetUsage || null,
        plans: payload.plans || clone(DEFAULT_PLANS),
        templates: payload.templates || [],
        models: payload.models || [],
        connectors: clone(connectorCatalog),
        connectorCatalog: clone(connectorCatalog),
        source: "Local adapter",
        storage: storageMode,
        persisted: true,
        serverBacked: true
      };
    } catch (error) {
      if (!isLocalFallbackError(error)) throw error;
      serverBacked = false;
      storageMode = "browser";
      connectorCatalog = normalizeConnectorCatalog(DEFAULT_CONNECTORS);
      return { workspace: localWorkflowSnapshot(), plans: clone(DEFAULT_PLANS), templates: [], models: [], connectors: clone(connectorCatalog), connectorCatalog: clone(connectorCatalog), source: "Browser demo", storage: storageMode, serverBacked: false };
    }
  },

  async login(credentials) {
    const response = await request("/auth/login", { method: "POST", body: credentials });
    csrfToken = response.csrfToken || null;
    return response;
  },

  async register(credentials) {
    const response = await request("/auth/register", { method: "POST", body: credentials });
    csrfToken = response.csrfToken || null;
    return response;
  },

  async refreshWorkspace() {
    const payload = await request("/workspace");
    serverBacked = true;
    storageMode = "server";
    const workspace = applyGraphOverlays(applyPreviewOverlay({
      ...(payload.workspace || payload),
      ...(payload.workflows && !(payload.workspace?.workflows) ? { workflows: payload.workflows } : {}),
      ...(payload.connectors && !(payload.workspace?.connectors) ? { connectors: payload.connectors } : {}),
      ...(payload.connectorCatalog && !(payload.workspace?.connectorCatalog) ? { connectorCatalog: payload.connectorCatalog } : {})
    }));
    const incomingConnectors = payload.connectors || payload.connectorCatalog || workspace.connectors || workspace.connectorCatalog;
    if (incomingConnectors) connectorCatalog = normalizeConnectorCatalog(incomingConnectors);
    return { workspace, packetUsage: payload.packetUsage || null, connectors: clone(connectorCatalog.length ? connectorCatalog : DEFAULT_CONNECTORS), connectorCatalog: clone(connectorCatalog.length ? connectorCatalog : DEFAULT_CONNECTORS), source: "Local adapter", storage: storageMode, persisted: true, serverBacked: true };
  },

  async updateWorkspace(patch) {
    if (serverBacked) {
      const allowed = {};
      for (const key of ["name", "description", "goal", "timezone"]) {
        if (patch && Object.prototype.hasOwnProperty.call(patch, key)) allowed[key] = patch[key];
      }
      const unsupported = Object.keys(patch || {}).filter((key) => !Object.prototype.hasOwnProperty.call(allowed, key));
      let snapshot = null;
      if (Object.keys(allowed).length) {
        const response = await request("/workspace", {
          method: "PATCH",
          body: allowed,
          headers: { "Idempotency-Key": mutationKey("workspace") }
        });
        snapshot = response.workspace || response;
      } else {
        snapshot = (await api.refreshWorkspace()).workspace;
      }
      if (unsupported.length) {
        // Local-only controls (connection previews, display preferences, and
        // activity presentation) stay in a browser cache. They are never
        // represented as external provider state by the adapter.
        const saved = writeLocalWorkspace(merge(snapshot, patch));
        return { workspace: applyPreviewOverlay(saved.workspace), source: "Local adapter", storage: saved.storage, persisted: false, previewOnly: true, serverBacked: true };
      }
      return { workspace: applyPreviewOverlay(snapshot), source: "Local adapter", storage: "server", persisted: true, serverBacked: true };
    }

    try {
      const saved = writeLocalWorkspace(merge(readLocalWorkspace(), patch));
      return { workspace: saved.workspace, source: "Browser demo", storage: saved.storage, persisted: saved.persisted, serverBacked: false };
    } catch (error) {
      throw new ApiError("The browser demo could not save this change.", { code: "LOCAL_STORAGE_WRITE_FAILED", source: "browser" });
    }
  },

  async createWorkflow(workflow, { idempotencyKey: suppliedKey } = {}) {
    const definition = normalizeWorkflowDefinition(workflow);
    if (!serverBacked) {
      const created = localWorkflowRecord(definition);
      const snapshot = localWorkflowSnapshot();
      const saved = writeLocalWorkspace(merge(snapshot, {
        workflows: [created, ...(snapshot.workflows || [])],
        activity: [{ id: randomId("activity"), action: "Workflow created", detail: `${created.name} · draft`, createdAt: created.createdAt }, ...(snapshot.activity || [])].slice(0, 100)
      }));
      return { ...created, workspace: saved.workspace, persisted: saved.persisted, serverBacked: false };
    }

    const body = workflowPayload(definition);
    const legacyBody = workflowPayload(definition, { includeGraph: false });
    const key = suppliedKey || mutationKey("workflow");
    let response;
    let compatibilityFallback = false;
    try {
      response = await request("/workflows", {
        method: "POST",
        body,
        headers: { "Idempotency-Key": key }
      });
    } catch (error) {
      if (!workflowHasGraph(definition) || !graphCompatibilityError(error)) throw error;
      compatibilityFallback = true;
      response = await request("/workflows", {
        method: "POST",
        body: legacyBody,
        headers: { "Idempotency-Key": key }
      });
    }
    return responseWorkflow(response, definition, { graphPersisted: !compatibilityFallback, compatibilityFallback });
  },

  async updateWorkflow(id, patch, { idempotencyKey: suppliedKey } = {}) {
    const definition = workflowPayload(patch, { patch: true });
    if (!serverBacked) {
      const snapshot = localWorkflowSnapshot();
      const existing = (snapshot.workflows || []).find((item) => item.id === id);
      if (!existing) throw new ApiError("The requested workflow was not found.", { code: "WORKFLOW_NOT_FOUND", status: 404, source: "browser" });
      const patchGraph = graphForWorkflow(patch);
      const updated = { ...existing, ...definition, ...(patchGraph ? { graph: patchGraph } : {}), updatedAt: new Date().toISOString() };
      const saved = writeLocalWorkspace(merge(snapshot, { workflows: snapshot.workflows.map((item) => item.id === id ? updated : item) }));
      return { ...updated, workspace: saved.workspace, persisted: saved.persisted, serverBacked: false };
    }

    const legacyBody = workflowPayload(patch, { includeGraph: false, patch: true });
    const key = suppliedKey || mutationKey("workflow-update");
    let response;
    let compatibilityFallback = false;
    try {
      response = await request(`/workflows/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: definition,
        headers: { "Idempotency-Key": key }
      });
    } catch (error) {
      if (!workflowHasGraph(patch) || !graphCompatibilityError(error)) throw error;
      compatibilityFallback = true;
      let fallbackBody = legacyBody;
      if (!Object.keys(fallbackBody).length) {
        // A graph-only update must not issue a no-op legacy mutation. Read the
        // current server record, retain the graph in the browser overlay, and
        // leave the adapter's persisted workflow untouched.
        const current = await request(`/workflows/${encodeURIComponent(id)}`);
        response = current;
      }
      if (Object.keys(fallbackBody).length) {
        response = await request(`/workflows/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: fallbackBody,
          headers: { "Idempotency-Key": key }
        });
      }
    }
    return responseWorkflow(response, { ...patch, id }, { graphPersisted: !compatibilityFallback, compatibilityFallback });
  },

  async updateWorkflowGraph(id, graph) {
    const normalized = normalizeGraph(graph);
    if (!normalized) throw new ApiError("The workflow graph must be a JSON object.", { code: "INVALID_WORKFLOW_GRAPH", source: "browser" });
    return api.updateWorkflow(id, { graph: normalized });
  },

  async getWorkflow(id) {
    if (!serverBacked) {
      const workflow = localWorkflowSnapshot().workflows?.find((item) => item.id === id);
      if (!workflow) throw new ApiError("The requested workflow was not found.", { code: "WORKFLOW_NOT_FOUND", status: 404, source: "browser" });
      return workflow;
    }
    const response = await request(`/workflows/${encodeURIComponent(id)}`);
    return responseWorkflow(response, response.workflow || {});
  },

  async getWorkflowGraph(id) {
    const workflow = await api.getWorkflow(id);
    return graphForWorkflow(workflow);
  },

  async getConnectors({ refresh = false } = {}) {
    if (!serverBacked || !refresh) return clone(connectorCatalog.length ? connectorCatalog : DEFAULT_CONNECTORS);
    for (const path of ["/connectors", "/catalog/connectors"]) {
      try {
        const payload = await request(path);
        const incoming = payload.connectors || payload.connectorCatalog || payload.catalog?.connectors;
        if (Array.isArray(incoming)) {
          connectorCatalog = normalizeConnectorCatalog(incoming);
          return clone(connectorCatalog);
        }
      } catch (error) {
        if (!unsupportedRouteError(error)) throw error;
      }
    }
    return clone(connectorCatalog.length ? connectorCatalog : DEFAULT_CONNECTORS);
  },

  async previewConnector(connector, context = {}) {
    const preview = connectorPayload(connector, context);
    const snapshot = serverBacked ? (await api.refreshWorkspace()).workspace : localWorkflowSnapshot();
    const current = Array.isArray(snapshot.connectorPreviews) ? snapshot.connectorPreviews : [];
    const previews = [preview, ...current.filter((item) => !(item.connectorId === preview.connectorId && item.workflowId === preview.workflowId && item.nodeId === preview.nodeId))].slice(0, MAX_GRAPH_NODES);
    const saved = await api.updateWorkspace({ connectorPreviews: previews });
    return { ...saved, connector: preview, previewOnly: true, externalSideEffects: false };
  },

  async selectConnectorPreview(connector, context = {}) {
    return api.previewConnector(connector, context);
  },

  async previewConnectorSelection(connector, context = {}) {
    return api.selectConnectorPreview(connector, context);
  },

  async selectConnector(connector, context = {}) {
    return api.selectConnectorPreview(connector, context);
  },

  async setConnectorPreview(connector, context = {}) {
    return api.selectConnectorPreview(connector, context);
  },

  async exportWorkflow(id, fallbackWorkflow = null) {
    let source = fallbackWorkflow;
    let routeFallback = false;
    if (serverBacked) {
      try {
        const response = await request(`/workflows/${encodeURIComponent(id)}/export`);
        source = response.workflow || response.export?.workflow || source;
        if (response.export) return { ...response, export: workflowExportPayload(source || fallbackWorkflow) };
      } catch (error) {
        if (!unsupportedRouteError(error)) throw error;
        routeFallback = true;
        const response = await request("/export");
        const exported = response.export || response;
        source = (exported.workflows || []).find((workflow) => workflow.id === id) || source;
      }
    }
    if (!source) throw new ApiError("The workflow could not be found for export.", { code: "WORKFLOW_NOT_FOUND", status: 404, source: "browser" });
    const fallbackGraph = graphForWorkflow(fallbackWorkflow);
    if (fallbackGraph && !graphForWorkflow(source)) source = { ...source, graph: fallbackGraph };
    return { ok: true, export: workflowExportPayload(source), workflow: normalizeWorkflowDefinition(source), routeFallback, source: serverBacked ? "Local adapter" : "Browser demo", serverBacked };
  },

  async importWorkflow(definition) {
    const safe = normalizeWorkflowDefinition(definition);
    if (!serverBacked) {
      const created = localWorkflowRecord(safe);
      const snapshot = localWorkflowSnapshot();
      const saved = writeLocalWorkspace(merge(snapshot, {
        workflows: [created, ...(snapshot.workflows || [])],
        activity: [{ id: randomId("activity"), action: "Workflow imported", detail: `${created.name} · draft`, createdAt: created.createdAt }, ...(snapshot.activity || [])].slice(0, 100)
      }));
      return { ok: true, workflow: created, workspace: saved.workspace, source: "Browser demo", storage: saved.storage, persisted: saved.persisted, serverBacked: false, imported: true };
    }
    try {
      const key = mutationKey("workflow-import");
      const response = await request("/workflows/import", {
        method: "POST",
        body: { workflow: safe, idempotencyKey: key },
        headers: { "Idempotency-Key": key }
      });
      return { ...response, workflow: responseWorkflow(response, safe), imported: true, serverBacked: true };
    } catch (error) {
      if (!unsupportedRouteError(error) && !graphCompatibilityError(error)) throw error;
      // Import is safely compatible with the existing create route: all
      // runtime fields, runs, approvals, credentials, and provider state are
      // deliberately discarded by normalizeWorkflowDefinition.
      const created = await api.createWorkflow(safe, { idempotencyKey: key });
      return { ok: true, workflow: created, imported: true, routeFallback: true, serverBacked: true };
    }
  },

  async importWorkflowJson(definition) {
    return api.importWorkflow(definition);
  },

  async duplicateWorkflow(id, sourceWorkflow = null, overrides = {}) {
    const source = sourceWorkflow || (serverBacked ? (await request(`/workflows/${encodeURIComponent(id)}`)).workflow : localWorkflowSnapshot().workflows?.find((item) => item.id === id));
    if (!source) throw new ApiError("The workflow could not be found for duplication.", { code: "WORKFLOW_NOT_FOUND", status: 404, source: "browser" });
    const safe = normalizeWorkflowDefinition({ ...source, ...overrides, name: overrides.name || `${source.name || "Workflow"} copy` });
    if (!serverBacked) {
      const created = localWorkflowRecord(safe);
      const snapshot = localWorkflowSnapshot();
      const saved = writeLocalWorkspace(merge(snapshot, {
        workflows: [created, ...(snapshot.workflows || [])],
        activity: [{ id: randomId("activity"), action: "Workflow duplicated", detail: `${created.name} · draft`, createdAt: created.createdAt }, ...(snapshot.activity || [])].slice(0, 100)
      }));
      return { ok: true, workflow: created, workspace: saved.workspace, source: "Browser demo", storage: saved.storage, persisted: saved.persisted, serverBacked: false, duplicated: true };
    }
    try {
      const key = mutationKey("workflow-duplicate");
      const response = await request(`/workflows/${encodeURIComponent(id)}/duplicate`, {
        method: "POST",
        body: { ...overrides, idempotencyKey: key },
        headers: { "Idempotency-Key": key }
      });
      return { ...response, workflow: responseWorkflow(response, safe), duplicated: true, serverBacked: true };
    } catch (error) {
      if (!unsupportedRouteError(error) && !graphCompatibilityError(error)) throw error;
      const created = await api.createWorkflow(safe, { idempotencyKey: key });
      return { ok: true, workflow: created, duplicated: true, routeFallback: true, serverBacked: true };
    }
  },

  async exportWorkflowJson(id, fallbackWorkflow = null) {
    return api.exportWorkflow(id, fallbackWorkflow);
  },

  async runWorkflow(id, input) {
    const key = mutationKey("run");
    const response = await request(`/workflows/${encodeURIComponent(id)}/run`, {
      method: "POST",
      body: { input, idempotencyKey: key },
      headers: { "Idempotency-Key": key }
    });
    return waitForRun(response.run);
  },

  async retryRun(id) {
    const key = mutationKey("run-retry");
    try {
      const response = await request(`/runs/${encodeURIComponent(id)}/retry`, {
        method: "POST",
        body: { idempotencyKey: key },
        headers: { "Idempotency-Key": key }
      });
      return waitForRun(response.run);
    } catch (error) {
      // Older local adapters do not expose a retry route yet. Returning null
      // lets the UI resubmit the captured input through the stable run route.
      if (unsupportedRouteError(error)) return null;
      throw error;
    }
  },

  async decideApproval(id, decision, { reason, editedOutput } = {}) {
    const body = { decision, ...(reason ? { reason } : {}), ...(editedOutput !== undefined ? { editedOutput } : {}) };
    const response = await request(`/approvals/${encodeURIComponent(id)}/decision`, {
      method: "POST",
      body,
      headers: { "Idempotency-Key": mutationKey("approval") }
    });
    return response;
  },

  async createKnowledge(item) {
    const response = await request("/knowledge", {
      method: "POST",
      body: { title: item.title, content: item.content },
      headers: { "Idempotency-Key": mutationKey("knowledge") }
    });
    return response.knowledge;
  },

  async deleteKnowledge(id) {
    return request(`/knowledge/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Idempotency-Key": mutationKey("knowledge-delete") }
    });
  },

  async sandboxTopup() {
    const key = mutationKey("topup");
    return request("/billing/sandbox-topup", {
      method: "POST",
      body: { idempotencyKey: key },
      headers: { "Idempotency-Key": key }
    });
  },

  async sandboxPlan(planId) {
    const key = mutationKey("plan");
    return request("/billing/sandbox-plan", {
      method: "POST",
      body: { planId, idempotencyKey: key },
      headers: { "Idempotency-Key": key }
    });
  },

  async exportWorkspace() {
    return request("/export");
  },

  async resetLocalDemo() {
    csrfToken = null;
    return { workspace: await resetLocalDemo(), source: "Browser demo", storage: "browser" };
  }
};

if (typeof window !== "undefined") {
  window.MakeEase = {
    ...(window.MakeEase || {}),
    reset: async () => {
      await resetLocalDemo();
      window.location.reload();
    }
  };
}
