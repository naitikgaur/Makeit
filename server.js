"use strict";

const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = fs.promises;
const {
  ADAPTER_CAPABILITIES,
  API_CONTRACT_VERSION,
  DEFAULT_MODE,
  PRODUCT_VERSION,
  CUSTOMER_UNIT,
  SUPPORT_PACKET_LIMIT,
  SUPPORT_HISTORY_DAYS,
  SUPPORT_REVIEWER_LIMIT,
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_TENANT_ID,
  DEFAULT_WORKSPACE_ID,
  IDEMPOTENCY_TTL_MS,
  MAX_ARRAY_ITEMS,
  MAX_IDEMPOTENCY_ENTRIES,
  MAX_JSON_BODY_BYTES,
  MAX_JSON_DEPTH,
  MAX_OBJECT_KEYS,
  planById,
  publicModels,
  publicPlans,
  publicTemplates,
  TOPUP
} = require("./lib/config");
const { createSupportPacket, validateSupportPacket } = require("./lib/ai");
const { AuthStore } = require("./lib/auth-store");
const {
  assertPayloadBounds,
  identifier,
  idempotencyKey,
  approvalDecision,
  knowledge,
  run: runPayload,
  runRetry,
  sandboxPlan,
  sandboxTopup,
  workflow,
  workflowGraph,
  workspaceDocument,
  workspacePatch,
  register: registerPayload,
  login: loginPayload
} = require("./lib/validation");

// This process is the dependency-free local runtime for MakeEase v1. It is
// deliberately fail-closed: the support packet and review model are real
// application contracts, while identity, Gmail OAuth, billing, and provider
// effects remain explicit integration boundaries rather than silent mocks.
const ADAPTER_NAME = "makeease-local-mvp-adapter";
const PROJECT_ROOT = __dirname;
const DATA_DIRECTORY = path.join(PROJECT_ROOT, "data");
const WORKSPACE_FILE = process.env.MAKEEASE_DATA_PATH
  ? path.resolve(PROJECT_ROOT, process.env.MAKEEASE_DATA_PATH)
  : path.join(DATA_DIRECTORY, "workspace.json");

// Keep the route payloads and the domain plan definitions on one source of
// truth. The adapter only describes plans; it never charges or provisions one.
const DEFAULT_PLANS = publicPlans();

const DEFAULT_WORKSPACE = {
  id: DEFAULT_WORKSPACE_ID,
  name: "Local demo workspace",
  description: "",
  goal: "",
  timezone: "UTC",
  plan: "starter",
  owner: { name: "Local demo", role: "Owner" },
  usage: { used: 0, limit: 15000 },
  integrations: [
    { id: "gmail", name: "Gmail", connected: false, detail: "Not configured", category: "Communication" },
    { id: "slack", name: "Slack", connected: false, detail: "Not configured", category: "Communication" },
    { id: "github", name: "GitHub", connected: false, detail: "Not configured", category: "Product" },
    { id: "notion", name: "Notion", connected: false, detail: "Not configured", category: "Knowledge" },
    { id: "stripe", name: "Stripe", connected: false, detail: "Not configured", category: "Finance" },
    { id: "linear", name: "Linear", connected: false, detail: "Not configured", category: "Product" }
  ],
  workflows: [],
  approvals: [],
  activity: [],
  sources: [],
  settings: { approvalMode: true, smartRouting: true, weeklyBrief: true, darkMode: false }
};

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

const SECRET_KEY_PATTERN = /(password|secret|token|api[-_]?key|private[-_]?key|credential|authorization)/i;
const UNSAFE_OBJECT_KEY_PATTERN = /^(?:__proto__|constructor|prototype)$/;
const PRIVATE_STATIC_FILES = new Set([
  "server.js",
  "server-smoke.js",
  "package.json",
  "package-lock.json",
  "README.md"
]);
const PRIVATE_STATIC_DIRECTORIES = new Set(["data", "lib", "node_modules", ".git"]);
const PUBLIC_STATIC_FILES = new Set(["index.html", "app.js", "styles.css"]);
const MAX_PERSISTED_WORKSPACE_BYTES = MAX_JSON_BODY_BYTES;
const REQUEST_ID_HEADER = "x-request-id";
const TENANT_ID_HEADER = "x-tenant-id";
const WORKSPACE_ID_HEADER = "x-workspace-id";
const IDEMPOTENCY_KEY_HEADER = "idempotency-key";
const CSRF_HEADER = "x-csrf-token";
const SESSION_COOKIE = "makeease_session";

class HttpError extends Error {
  constructor(statusCode, code, message, headers = {}) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.headers = headers;
  }
}

class PersistenceError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "PersistenceError";
    this.statusCode = 503;
    this.code = "WORKSPACE_STORE_UNAVAILABLE";
    this.cause = cause;
  }
}

class IdempotencyError extends HttpError {
  constructor(code, message) {
    super(409, code, message);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(stableSerialize(value), "utf8").digest("hex");
}

function workspaceEtag(snapshot) {
  // Internal idempotency records are intentionally omitted from the public
  // representation and therefore must not make an otherwise unchanged
  // workspace appear stale to If-Match clients.
  const publicSnapshot = clone(snapshot);
  if (isPlainObject(publicSnapshot)) delete publicSnapshot.operations;
  return `"workspace-${fingerprint(publicSnapshot)}"`;
}

function parseIfMatch(request) {
  const raw = requestHeader(request, "if-match");
  if (raw === undefined) return null;
  if (typeof raw !== "string" || (raw !== "*" && !/^"workspace-[a-f0-9]{64}"$/.test(raw))) {
    throw new HttpError(400, "INVALID_IF_MATCH", "If-Match must contain one strong workspace ETag or *.");
  }
  return raw;
}

function requestHeader(request, name) {
  const raw = request.headers && request.headers[String(name).toLowerCase()];
  if (Array.isArray(raw)) {
    if (raw.length !== 1) throw new HttpError(400, "INVALID_HEADER", `The ${name} header must contain one value.`);
    return raw[0];
  }
  return raw;
}

function requestCookie(request, name) {
  const raw = requestHeader(request, "cookie");
  if (typeof raw !== "string") return null;
  const pair = raw.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  if (!pair) return null;
  try { return decodeURIComponent(pair.slice(name.length + 1)); } catch { return null; }
}

function sessionCookie(token, maxAge, { clear = false } = {}) {
  return `${SESSION_COOKIE}=${clear ? "" : encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : maxAge}`;
}

function requestId(request) {
  const provided = requestHeader(request, REQUEST_ID_HEADER);
  if (typeof provided === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(provided)) return provided;
  return `req_${crypto.randomUUID()}`;
}

function headerIdentifier(request, headerName, fallback, label) {
  const provided = requestHeader(request, headerName);
  if (provided === undefined || provided === "") return fallback;
  try {
    return identifier(provided, label, { max: 128 });
  } catch (error) {
    throw new HttpError(400, "INVALID_SCOPE_HEADER", `${headerName} must contain a valid identifier.`);
  }
}

function parseIdempotencyHeader(request) {
  const raw = requestHeader(request, IDEMPOTENCY_KEY_HEADER);
  if (raw === undefined || raw === "") return null;
  try {
    return idempotencyKey(raw, "Idempotency-Key");
  } catch (error) {
    throw new HttpError(400, "INVALID_IDEMPOTENCY_KEY", "Idempotency-Key must be 4 to 128 letters, numbers, or . _ : - characters.");
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasUnsafeKeys(value, seen = new Set()) {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);

  for (const [key, child] of Object.entries(value)) {
    if (UNSAFE_OBJECT_KEY_PATTERN.test(key) || SECRET_KEY_PATTERN.test(key)) return true;
    if (hasUnsafeKeys(child, seen)) return true;
  }
  return false;
}

function mergeObjects(base, patch) {
  const result = clone(base);
  for (const [key, value] of Object.entries(patch)) {
    result[key] = isPlainObject(result[key]) && isPlainObject(value)
      ? mergeObjects(result[key], value)
      : clone(value);
  }
  return result;
}

function mergeWorkspaceUpdate(current, payload) {
  const next = mergeObjects(current, payload);
  if (payload.planId && payload.planId !== current.planId) {
    const plan = planById(payload.planId);
    if (plan.creditLimit === null) {
      throw new HttpError(400, "PLAN_NOT_AVAILABLE", "Enterprise requires custom configuration and cannot be selected in the local adapter.");
    }
    if (payload.usage && payload.usage.included !== plan.creditLimit) {
      throw new HttpError(400, "INVALID_INPUT", "usage.included must match the selected plan's demo credit limit.");
    }
    const usage = next.usage;
    const available = plan.creditLimit + usage.topup - usage.used - usage.reserved;
    if (available < 0) {
      throw new HttpError(409, "PLAN_LIMIT_EXCEEDED", "Current usage and reservations exceed the selected plan's demo credit limit.");
    }
    // This changes a local demo quota only. Used, reserved, and top-up credits
    // survive plan switches; cycling plans never resets the usage counter.
    next.usage = { ...usage, included: plan.creditLimit, limit: plan.creditLimit, available };
  }
  return next;
}

class IdempotencyCache {
  constructor({ ttlMs = IDEMPOTENCY_TTL_MS, maxEntries = MAX_IDEMPOTENCY_ENTRIES, now = () => Date.now() } = {}) {
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) throw new TypeError("ttlMs must be a positive integer");
    if (!Number.isInteger(maxEntries) || maxEntries <= 0) throw new TypeError("maxEntries must be a positive integer");
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.now = now;
    this.entries = new Map();
  }

  prune() {
    const currentTime = this.now();
    for (const [key, entry] of this.entries) {
      if (!entry.pending && entry.expiresAt <= currentTime) this.entries.delete(key);
    }
  }

  reserve(key, fingerprintValue) {
    this.prune();
    const existing = this.entries.get(key);
    if (existing) {
      if (existing.fingerprint !== fingerprintValue) {
        throw new IdempotencyError("IDEMPOTENCY_KEY_REUSE", "The Idempotency-Key was already used for a different request.");
      }
      return existing;
    }

    if (this.entries.size >= this.maxEntries) {
      const oldest = [...this.entries.entries()].find(([, entry]) => !entry.pending);
      if (oldest) this.entries.delete(oldest[0]);
      else throw new HttpError(503, "IDEMPOTENCY_STORE_FULL", "The idempotency store is temporarily full; retry later with a new key.");
    }

    const entry = { fingerprint: fingerprintValue, pending: true, expiresAt: this.now() + this.ttlMs };
    this.entries.set(key, entry);
    return entry;
  }

  async execute(key, fingerprintValue, operation) {
    if (!key) return { value: await operation(), replayed: false };
    const entry = this.reserve(key, fingerprintValue);
    if (!entry.pending) return { value: clone(entry.result), replayed: true };
    if (entry.promise) {
      const result = await entry.promise;
      return { value: clone(result), replayed: true };
    }

    entry.promise = Promise.resolve().then(operation).then((result) => {
      entry.pending = false;
      entry.result = clone(result);
      entry.expiresAt = this.now() + this.ttlMs;
      return result;
    }).catch((error) => {
      this.entries.delete(key);
      throw error;
    });
    const result = await entry.promise;
    return { value: clone(result), replayed: false };
  }
}

function parseContentLength(request) {
  const raw = request.headers && request.headers["content-length"];
  if (raw === undefined) return null;
  const value = Number(raw);
  if (Array.isArray(raw) || typeof raw !== "string" || !/^\d+$/.test(raw) || !Number.isSafeInteger(value)) {
    throw new HttpError(400, "INVALID_CONTENT_LENGTH", "Content-Length must be a non-negative integer.");
  }
  return value;
}

function isJsonContentType(request) {
  const raw = request.headers && request.headers["content-type"];
  if (typeof raw !== "string") return false;
  return raw.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

function readJsonBody(request, maxBytes, { allowEmpty = false } = {}) {
  let declaredLength;
  try {
    declaredLength = parseContentLength(request);
  } catch (error) {
    request.resume();
    return Promise.reject(error);
  }
  if (declaredLength !== null && declaredLength > maxBytes) {
    request.resume();
    return Promise.reject(new HttpError(413, "PAYLOAD_TOO_LARGE", `JSON request bodies must be ${maxBytes} bytes or smaller.`));
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let finished = false;

    const fail = (error) => {
      if (finished) return;
      finished = true;
      reject(error);
    };

    request.on("data", (chunk) => {
      if (finished) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > maxBytes) {
        request.resume();
        fail(new HttpError(413, "PAYLOAD_TOO_LARGE", `JSON request bodies must be ${maxBytes} bytes or smaller.`));
        return;
      }
      chunks.push(buffer);
    });
    request.on("aborted", () => fail(new HttpError(400, "REQUEST_ABORTED", "The request body was interrupted.")));
    request.on("error", () => fail(new HttpError(400, "REQUEST_STREAM_ERROR", "The request body could not be read.")));
    request.on("end", () => {
      if (finished) return;
      finished = true;
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        if (allowEmpty) {
          resolve({});
          return;
        }
        reject(new HttpError(400, "INVALID_JSON", "A JSON request body is required."));
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        assertPayloadBounds(parsed, {
          maxStringLength: maxBytes,
          maxDepth: MAX_JSON_DEPTH,
          maxObjectKeys: MAX_OBJECT_KEYS,
          maxArrayItems: MAX_ARRAY_ITEMS,
          rejectSensitiveKeys: false
        });
        resolve(parsed);
      } catch (error) {
        if (error instanceof HttpError) {
          reject(error);
          return;
        }
        if (error && error.statusCode === 400) {
          reject(new HttpError(400, error.code || "INVALID_JSON", error.message));
          return;
        }
        reject(new HttpError(400, "INVALID_JSON", "The request body must contain valid JSON."));
      }
    });
  });
}

class JsonStore {
  constructor(filePath = WORKSPACE_FILE, initialValue = DEFAULT_WORKSPACE, { workspaceId = initialValue?.id || DEFAULT_WORKSPACE_ID } = {}) {
    this.filePath = path.resolve(filePath);
    this.initialValue = clone(initialValue);
    this.workspaceId = workspaceId;
    this.initialization = null;
    this.writeQueue = Promise.resolve();
  }

  async init() {
    if (!this.initialization) {
      this.initialization = (async () => {
        await fsp.mkdir(path.dirname(this.filePath), { recursive: true });
        try {
          await fsp.access(this.filePath, fs.constants.F_OK);
        } catch (error) {
          if (error.code !== "ENOENT") throw new PersistenceError("The local workspace data could not be accessed.", error);
          await this.writeFileAtomically(this.initialValue);
        }
        // Fail closed during startup when an existing file is corrupt or
        // belongs to another workspace. Otherwise health would report ready
        // while the first browser read fails later.
        await this.readFile();
      })().catch((error) => {
        this.initialization = null;
        throw error instanceof PersistenceError ? error : new PersistenceError("The local workspace store could not be initialized.", error);
      });
    }
    return this.initialization;
  }

  async readFile() {
    let raw;
    try {
      const fileStats = await fsp.stat(this.filePath);
      if (!fileStats.isFile()) throw new PersistenceError("The local workspace data is not a regular file.");
      if (fileStats.size > MAX_PERSISTED_WORKSPACE_BYTES) {
        throw new PersistenceError("The local workspace data exceeds the safe storage limit.");
      }
      raw = await fsp.readFile(this.filePath, "utf8");
      if (Buffer.byteLength(raw, "utf8") > MAX_PERSISTED_WORKSPACE_BYTES) {
        throw new PersistenceError("The local workspace data exceeds the safe storage limit.");
      }
    } catch (error) {
      if (error instanceof PersistenceError) throw error;
      throw new PersistenceError("The local workspace data could not be read.", error);
    }
    try {
      const value = JSON.parse(raw);
      if (!isPlainObject(value) || hasUnsafeKeys(value)) throw new Error("invalid persisted object");
      return workspaceDocument(value, { workspaceId: this.workspaceId, complete: true });
    } catch (error) {
      if (error && error.statusCode === 400) {
        throw new PersistenceError("The local workspace data failed schema validation.", error);
      }
      if (error && error.code === "WORKSPACE_MISMATCH") {
        throw new PersistenceError("The local workspace belongs to a different workspace.", error);
      }
      throw new PersistenceError("The local workspace data is not valid JSON.", error);
    }
  }

  async writeFileAtomically(value) {
    const nextValue = workspaceDocument(value, { workspaceId: this.workspaceId, complete: true });
    const serialized = `${JSON.stringify(nextValue, null, 2)}\n`;
    if (Buffer.byteLength(serialized, "utf8") > MAX_PERSISTED_WORKSPACE_BYTES) {
      throw new HttpError(413, "WORKSPACE_TOO_LARGE", `The local workspace must fit within the ${MAX_PERSISTED_WORKSPACE_BYTES}-byte storage limit.`);
    }
    const temporaryPath = `${this.filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    let temporaryFile;
    try {
      temporaryFile = await fsp.open(temporaryPath, "wx", 0o600);
      await temporaryFile.writeFile(serialized, "utf8");
      await temporaryFile.sync();
      await temporaryFile.close();
      temporaryFile = null;
      await fsp.rename(temporaryPath, this.filePath);
    } catch (error) {
      if (temporaryFile) {
        try { await temporaryFile.close(); } catch (cleanupError) { /* best effort cleanup */ }
      }
      try { await fsp.unlink(temporaryPath); } catch (cleanupError) { /* best effort cleanup */ }
      throw new PersistenceError("The local workspace data could not be saved.", error);
    }
    return clone(nextValue);
  }

  async read() {
    await this.init();
    await this.writeQueue;
    return this.readFile();
  }

  enqueueWrite(operation) {
    const nextOperation = this.writeQueue.then(async () => {
      await this.init();
      return operation();
    });
    this.writeQueue = nextOperation.catch(() => undefined);
    return nextOperation;
  }

  replace(value) {
    return this.enqueueWrite(() => this.writeFileAtomically(value));
  }

  update(mutator) {
    return this.enqueueWrite(async () => {
      const current = await this.readFile();
      const next = await mutator(current);
      return this.writeFileAtomically(next);
    });
  }
}

function apiMeta(scope = {}) {
  return {
    adapter: ADAPTER_NAME,
    product: "MakeEase Support",
    productVersion: PRODUCT_VERSION,
    contractVersion: API_CONTRACT_VERSION,
    mode: DEFAULT_MODE,
    auth: scope.authMode === "required" ? "session-cookie" : "loopback-local-demo",
    billing: "demo-only",
    data: "local-demo",
    idempotency: { storage: "workspace-json", durable: true },
    externalSideEffects: false,
    effectPolicy: {
      automaticSend: false,
      allowedExternalEffects: [],
      customerUnit: CUSTOMER_UNIT,
      packetLimit: SUPPORT_PACKET_LIMIT,
      reviewerLimit: SUPPORT_REVIEWER_LIMIT,
      searchableHistoryDays: SUPPORT_HISTORY_DAYS
    },
    tenantId: scope.tenantId || DEFAULT_TENANT_ID,
    workspaceId: scope.workspaceId || DEFAULT_WORKSPACE_ID,
    capabilities: clone(ADAPTER_CAPABILITIES)
  };
}

function workspaceResponse(snapshot, scope = {}) {
  const workspace = clone(snapshot);
  // Idempotency records are server bookkeeping, never part of the user-facing
  // workspace snapshot or an export.
  delete workspace.operations;
  const plan = planById(workspace.planId || workspace.plan || "starter");
  const preparedPackets = (workspace.runs || []).filter((run) => Boolean(run.output?.supportPacket)).length;
  const packetUsage = {
    customerUnit: CUSTOMER_UNIT,
    prepared: preparedPackets,
    limit: plan?.packetLimit ?? SUPPORT_PACKET_LIMIT,
    remaining: plan?.packetLimit === null ? null : Math.max((plan?.packetLimit ?? SUPPORT_PACKET_LIMIT) - preparedPackets, 0),
    automaticOverage: false,
    automaticSend: false
  };
  return {
    ok: true,
    meta: apiMeta(scope),
    workspace,
    // Keep the complete snapshot under `workspace` for the existing browser
    // adapter, while exposing the published contract's top-level collections
    // for clients that consume a normalized snapshot.
    usage: clone(workspace.usage || {}),
    packetUsage,
    workflows: clone(workspace.workflows || []),
    runs: clone(workspace.runs || []),
    approvals: clone(workspace.approvals || []),
    auditEvents: clone(workspace.auditEvents || []),
    knowledge: (workspace.sources || []).map((source) => ({
      id: source.id,
      title: source.name,
      content: source.detail,
      kind: "Source",
      status: "local",
      ...(source.createdAt ? { createdAt: source.createdAt } : {})
    })),
    activity: clone(workspace.activity || []),
    integrations: clone(workspace.integrations || []),
    ledger: clone(workspace.ledger || [])
  };
}

function nowIso() {
  return new Date().toISOString();
}

function resourceId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function recomputeUsage(snapshot) {
  const usage = snapshot.usage || {};
  const included = Number.isSafeInteger(usage.included) ? usage.included : Number(usage.limit) || 0;
  const topup = Number.isSafeInteger(usage.topup) ? usage.topup : 0;
  const used = Number.isSafeInteger(usage.used) ? usage.used : 0;
  const reserved = Number.isSafeInteger(usage.reserved) ? usage.reserved : 0;
  snapshot.usage = {
    ...usage,
    included,
    topup,
    used,
    reserved,
    limit: included,
    available: included + topup - used - reserved
  };
  return snapshot.usage;
}

function appendAudit(snapshot, {
  eventType,
  actorType = "service",
  entityType,
  entityId,
  workflowId,
  runId,
  approvalId,
  requestId: requestIdValue,
  idempotencyKey: operationKey,
  detail = "",
  metadata = {}
} = {}) {
  const event = {
    id: resourceId("audit"),
    eventType,
    actorType,
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(workflowId ? { workflowId } : {}),
    ...(runId ? { runId } : {}),
    ...(approvalId ? { approvalId } : {}),
    ...(requestIdValue ? { requestId: requestIdValue } : {}),
    ...(operationKey ? { idempotencyKey: operationKey } : {}),
    detail,
    metadata,
    createdAt: nowIso()
  };
  snapshot.auditEvents = [...(snapshot.auditEvents || []), event].slice(-MAX_ARRAY_ITEMS);
  return event;
}

function appendActivity(snapshot, action, detail = "") {
  snapshot.activity = [...(snapshot.activity || []), {
    id: resourceId("activity"),
    action,
    detail,
    createdAt: nowIso()
  }].slice(-MAX_ARRAY_ITEMS);
}

function appendLedger(snapshot, {
  type,
  amount = 0,
  availableDelta = 0,
  reservedDelta = 0,
  usedDelta = 0,
  description,
  runId,
  workflowId,
  approvalId,
  idempotencyKey: operationKey,
  mode = "sandbox",
  bucket
} = {}) {
  const entry = {
    id: resourceId("ledger"),
    type,
    amount,
    availableDelta,
    reservedDelta,
    usedDelta,
    description,
    ...(runId ? { runId } : {}),
    ...(workflowId ? { workflowId } : {}),
    ...(approvalId ? { approvalId } : {}),
    ...(operationKey ? { idempotencyKey: operationKey } : {}),
    mode,
    ...(bucket ? { bucket } : {}),
    createdAt: nowIso()
  };
  snapshot.ledger = [...(snapshot.ledger || []), entry].slice(-MAX_ARRAY_ITEMS);
  return entry;
}

function findOperation(snapshot, operation, key, requestFingerprint) {
  if (!key) return null;
  const existing = (snapshot.operations || []).find((item) => item.operation === operation && item.key === key);
  if (existing && existing.fingerprint !== requestFingerprint) {
    throw new IdempotencyError("IDEMPOTENCY_KEY_REUSE", "The Idempotency-Key was already used for a different request.");
  }
  return existing || null;
}

function recordOperation(snapshot, { operation, key, requestFingerprint, resourceType, resourceId: targetId }) {
  if (!key) return;
  snapshot.operations = [...(snapshot.operations || []), {
    id: resourceId("operation"),
    operation,
    key,
    fingerprint: requestFingerprint,
    resourceType,
    resourceId: targetId,
    createdAt: nowIso()
  }].slice(-MAX_ARRAY_ITEMS);
}

function parseRouteIdentifier(pathname, prefix) {
  if (!pathname.startsWith(prefix)) return null;
  const raw = pathname.slice(prefix.length).split("/", 1)[0];
  if (!raw) return null;
  let decoded;
  try { decoded = decodeURIComponent(raw); } catch { throw new HttpError(400, "INVALID_PATH", "The requested identifier is invalid."); }
  try { return identifier(decoded, "id", { max: 128 }); } catch { throw new HttpError(400, "INVALID_PATH", "The requested identifier is invalid."); }
}

function requestedLimit(searchParams, fallback = 100) {
  if (!searchParams || !searchParams.has("limit")) return fallback;
  const raw = searchParams.get("limit");
  if (!/^\d+$/.test(raw || "")) throw new HttpError(400, "INVALID_LIMIT", "limit must be a positive integer.");
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_ARRAY_ITEMS) throw new HttpError(400, "INVALID_LIMIT", `limit must be from 1 to ${MAX_ARRAY_ITEMS}.`);
  return value;
}

function mutationKey(request, body, { required = false } = {}) {
  const headerKey = parseIdempotencyHeader(request);
  const bodyKey = body && Object.prototype.hasOwnProperty.call(body, "idempotencyKey")
    ? idempotencyKey(body.idempotencyKey, "idempotencyKey")
    : null;
  if (headerKey && bodyKey && headerKey !== bodyKey) throw new HttpError(400, "IDEMPOTENCY_KEY_MISMATCH", "The Idempotency-Key header and body value must match.");
  const key = headerKey || bodyKey;
  if (required && !key) throw new HttpError(428, "IDEMPOTENCY_KEY_REQUIRED", "This write requires an Idempotency-Key header or body value.");
  return key;
}

function bodyWithoutIdempotencyKey(body) {
  if (!isPlainObject(body) || !Object.prototype.hasOwnProperty.call(body, "idempotencyKey")) return body;
  const copy = { ...body };
  delete copy.idempotencyKey;
  return copy;
}

function templateSteps(workflowValue) {
  const template = publicTemplates().find((item) => item.id === workflowValue.templateId);
  return template ? template.steps.map((name) => ({ name, status: "queued" })) : [{ name: "Review the supplied request", status: "queued" }];
}

function graphSteps(workflowValue) {
  if (!Array.isArray(workflowValue.nodes)) return null;
  const nodes = workflowValue.nodes;
  if (!nodes.length) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map(nodes.map((node) => [node.id, []]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of Array.isArray(workflowValue.edges) ? workflowValue.edges : []) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    outgoing.get(edge.source).push(edge.target);
    indegree.set(edge.target, indegree.get(edge.target) + 1);
  }

  // Validation rejects cycles. Keep the original node order as a stable tie
  // breaker so disconnected graph fragments render deterministically too.
  const queue = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const ordered = [];
  while (queue.length) {
    const id = queue.shift();
    ordered.push(byId.get(id));
    for (const target of outgoing.get(id) || []) {
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) === 0) queue.push(target);
    }
  }
  for (const node of nodes) if (!ordered.includes(node)) ordered.push(node);
  return ordered.map((node) => {
    const configuredName = node.name || node.label || node.title || node.config?.label || node.data?.label;
    const name = String(configuredName || node.type || node.id).slice(0, 200);
    return { name, status: "queued" };
  });
}

function workflowSteps(workflowValue) {
  return graphSteps(workflowValue) || templateSteps(workflowValue);
}

// Connector catalogs are optional extension data. The local adapter does not
// ship a catalog and must not synthesize one or execute a catalog provider.
// If a deployment adds a plain-data catalog module, expose only its inventory
// through bootstrap and normalize any unverifiable connection claims.
const CONNECTOR_CATALOG_MODULES = [
  "./lib/connector-catalog",
  "./lib/connectorCatalog",
  "./lib/connectors/catalog",
  "./lib/connectors",
  "./lib/catalog",
  "./connector-catalog",
  "./connectors/catalog"
];

function connectorCatalog() {
  for (const modulePath of CONNECTOR_CATALOG_MODULES) {
    let loaded;
    try {
      loaded = require(modulePath);
    } catch (error) {
      if (error && error.code === "MODULE_NOT_FOUND") continue;
      continue;
    }
    const source = loaded && loaded.default ? loaded.default : loaded;
    const raw = Array.isArray(source)
      ? source
      : source && (source.connectorCatalog
        || source.catalog
        || source.connectors
        || source.CONNECTOR_CATALOG
        || source.CONNECTORS
        || (typeof source.publicConnectors === "function" ? source.publicConnectors({ limit: MAX_ARRAY_ITEMS }) : null));
    if (!Array.isArray(raw)) continue;
    try {
      assertPayloadBounds(raw, {
        maxStringLength: 4000,
        maxDepth: MAX_JSON_DEPTH,
        maxObjectKeys: MAX_OBJECT_KEYS,
        maxArrayItems: MAX_ARRAY_ITEMS,
        rejectSensitiveKeys: true
      });
    } catch (error) {
      // A malformed optional catalog must not make the local adapter claim it
      // has a usable connector inventory.
      continue;
    }
    return raw.filter((item) => isPlainObject(item)).map((item) => {
      const result = clone(item);
      if (Object.prototype.hasOwnProperty.call(result, "connected")) result.connected = false;
      if (result.status === "connected") result.status = "not_configured";
      if (result.externalSideEffects === true) result.externalSideEffects = false;
      return result;
    });
  }
  return null;
}

function sandboxOutput(runValue, workflowValue, snapshot) {
  const knowledge = (snapshot.sources || []).slice(0, 6).map((source) => ({
    id: source.id,
    title: source.name,
    detail: String(source.detail || "").slice(0, 500)
  }));
  let supportPacket = null;
  try {
    supportPacket = createSupportPacket({
      request: String(runValue.input || "").slice(0, 12000),
      documents: knowledge.map((source) => ({ id: source.id, title: source.title, content: source.detail }))
    }, {
      idempotencyKey: `packet-${String(runValue.id || "run").slice(0, 110)}`,
      minConfidence: workflowValue.requiresApproval === false ? 0.6 : 0.7
    });
    if (!validateSupportPacket(supportPacket).valid) supportPacket = null;
  } catch (error) {
    // The local run must remain inspectable even when an optional packet
    // extension receives malformed legacy data. The hard no-side-effect
    // boundary is preserved and the run still records its bounded plan.
    supportPacket = null;
  }
  const storedPacket = supportPacket ? compactSupportPacket(supportPacket) : null;
  return {
    summary: "Sandbox simulation completed",
    mode: "sandbox",
    deterministic: true,
    workflow: workflowValue.name,
    request: String(runValue.input || "").slice(0, 4000),
    plan: workflowSteps(workflowValue).map((step) => step.name),
    knowledge,
    ...(storedPacket ? {
      packetId: storedPacket.packetId,
      customerUnit: CUSTOMER_UNIT,
      supportPacket: storedPacket,
      classification: storedPacket.classification,
      urgency: storedPacket.urgency,
      groundedDraft: storedPacket.groundedDraft,
      escalation: storedPacket.escalation,
      evidence: storedPacket.evidence,
      uncertainty: storedPacket.uncertainty
    } : {}),
    sideEffectsPerformed: false,
    note: "No AI provider, connector, email, deployment, payment, or other external action was used. This is a deterministic local support review packet."
  };
}

// The full provider-neutral packet is valuable at the AI boundary but too
// verbose for the dependency-free JSON workspace. Persist an inspectable,
// redacted packet projection and keep the stable digest so a future relational
// evidence store can attach the complete artifact without changing this API.
function compactSupportPacket(packet) {
  const compactEvidence = (Array.isArray(packet.evidence) ? packet.evidence : []).slice(0, 8).map((item) => ({
    sourceId: String(item.sourceId || "source").slice(0, 128),
    sourceType: String(item.sourceType || "context").slice(0, 80),
    quote: String(item.quote || "").slice(0, 500),
    supports: String(item.supports || "support:context").slice(0, 160)
  }));
  return {
    ok: true,
    supportPacketVersion: packet.supportPacketVersion,
    contractVersion: packet.contractVersion,
    operation: "support_packet",
    status: packet.status,
    mode: packet.mode,
    provider: packet.provider,
    providerContacted: false,
    externalActionsPerformed: false,
    deterministic: true,
    packetId: packet.packetId,
    digest: packet.digest,
    classification: {
      label: packet.classification?.label || "support",
      confidence: packet.classification?.confidence ?? null,
      reason: String(packet.classification?.reason || "").slice(0, 300),
      matchedTerms: Array.isArray(packet.classification?.matchedTerms) ? packet.classification.matchedTerms.slice(0, 8) : []
    },
    urgency: {
      level: packet.urgency?.level || packet.urgencyLevel || "medium",
      confidence: packet.urgency?.confidence ?? null,
      reasons: Array.isArray(packet.urgency?.uncertainty?.reasons) ? packet.urgency.uncertainty.reasons.slice(0, 4) : []
    },
    missingFacts: Array.isArray(packet.missingFacts) ? packet.missingFacts.slice(0, 12) : [],
    groundedDraft: {
      text: String(packet.groundedDraft?.text || "").slice(0, 3000),
      subject: packet.groundedDraft?.subject ? String(packet.groundedDraft.subject).slice(0, 200) : null,
      status: "draft_only",
      sent: false,
      reviewRequired: true,
      confidence: packet.groundedDraft?.confidence ?? null,
      uncertainty: packet.groundedDraft?.uncertainty || null
    },
    escalation: {
      required: Boolean(packet.escalation?.required),
      level: packet.escalation?.level || "none",
      status: packet.escalation?.status || "pending",
      reasons: Array.isArray(packet.escalation?.reasons) ? packet.escalation.reasons.slice(0, 6) : [],
      destination: packet.escalation?.destination || null,
      bypassable: false
    },
    actionRisk: {
      class: packet.actionRisk?.class || "draft_only",
      level: packet.actionRisk?.level || "medium",
      externalAction: Boolean(packet.actionRisk?.externalAction),
      executable: false,
      requiresApproval: true
    },
    evidence: compactEvidence,
    grounding: {
      evidenceCount: compactEvidence.length,
      limitations: (Array.isArray(packet.limitations) ? packet.limitations : []).slice(0, 6).map((item) => String(item).slice(0, 300))
    },
    confidence: packet.confidence ?? null,
    abstained: Boolean(packet.abstained),
    uncertainty: {
      level: packet.uncertainty?.level || "medium",
      reasons: Array.isArray(packet.uncertainty?.reasons) ? packet.uncertainty.reasons.slice(0, 6) : [],
      abstained: Boolean(packet.uncertainty?.abstained)
    },
    limitations: (Array.isArray(packet.limitations) ? packet.limitations : []).slice(0, 6).map((item) => String(item).slice(0, 300))
  };
}

async function processSandboxRun(store, scope, runId) {
  let startedRun = false;
  try {
    await store.update((snapshot) => {
      assertWorkspaceScope(snapshot, scope);
      const runValue = (snapshot.runs || []).find((item) => item.id === runId);
      if (!runValue || runValue.status !== "queued") return snapshot;
      const workflowValue = (snapshot.workflows || []).find((item) => item.id === runValue.workflowId);
      if (!workflowValue) throw new HttpError(409, "WORKFLOW_NOT_FOUND", "The workflow for this run no longer exists.");
      if (workflowValue.status === "paused") throw new HttpError(409, "WORKFLOW_PAUSED", "Paused workflows cannot execute sandbox runs.");
      startedRun = true;
      const updatedRun = {
        ...runValue,
        status: "running",
        startedAt: nowIso(),
        steps: (runValue.steps || []).map((step, index) => index === 0 ? { ...step, status: "running", detail: "Sandbox step started." } : step)
      };
      snapshot.runs = snapshot.runs.map((item) => item.id === runId ? updatedRun : item);
      appendAudit(snapshot, { eventType: "run.started", entityType: "run", entityId: runId, workflowId: runValue.workflowId, runId, detail: "Bounded sandbox run started." });
      return snapshot;
    });
    if (!startedRun) return;

    await new Promise((resolve) => setImmediate(resolve));
    const current = await store.read();
    const runValue = (current.runs || []).find((item) => item.id === runId);
    const workflowValue = (current.workflows || []).find((item) => item.id === runValue?.workflowId);
    if (!runValue || !workflowValue || runValue.status !== "running") return;
    const output = sandboxOutput(runValue, workflowValue, current);
    // Meter the bounded local operation from the submitted request and the
    // configured step path. Do not make the persisted evidence projection
    // itself inflate the customer-facing sandbox meter.
    const meteredChars = String(runValue.input || "").length + workflowSteps(workflowValue).length * 100;
    const actualCredits = Math.max(1, Math.min(runValue.reservedCredits, Math.ceil(meteredChars / 120)));

    await store.update((snapshot) => {
      assertWorkspaceScope(snapshot, scope);
      const currentRun = (snapshot.runs || []).find((item) => item.id === runId);
      const currentWorkflow = (snapshot.workflows || []).find((item) => item.id === workflowValue.id);
      if (!currentRun || !currentWorkflow || currentRun.status !== "running") return snapshot;
      const completedSteps = (currentRun.steps || []).map((step) => ({ ...step, status: "completed", detail: "Sandbox simulation completed; no external side effect was used." }));
      const completedAt = nowIso();
      const requiresApproval = currentWorkflow.requiresApproval !== false;
      const nextRun = {
        ...currentRun,
        status: requiresApproval ? "awaiting_approval" : "completed",
        output,
        ...(output.packetId ? { packetId: output.packetId } : {}),
        credits: actualCredits,
        steps: completedSteps,
        ...(requiresApproval ? {} : { completedAt }),
        ...(requiresApproval ? {} : { reservedCredits: 0 })
      };
      if (requiresApproval) {
        const approval = {
          id: resourceId("approval"),
          workflowId: currentWorkflow.id,
          runId,
          title: `Review prepared support draft for ${currentWorkflow.name}`,
          detail: "Inspect the request, policy context, uncertainty, and draft before recording an internal decision.",
          credits: actualCredits,
          status: "pending",
          createdAt: completedAt,
          output,
          ...(output.packetId ? { packetId: output.packetId } : {}),
          ...(output.supportPacket?.digest ? { actionDigest: output.supportPacket.digest } : {})
        };
        snapshot.approvals = [...(snapshot.approvals || []), approval];
        snapshot.runs = snapshot.runs.map((item) => item.id === runId ? nextRun : item);
        appendAudit(snapshot, { eventType: "approval.created", entityType: "approval", entityId: approval.id, workflowId: currentWorkflow.id, runId, detail: "Approval requested for a sandbox result." });
        appendActivity(snapshot, "Sandbox run needs approval", currentWorkflow.name);
      } else {
        const release = Math.max(0, currentRun.reservedCredits - actualCredits);
        recomputeUsage(snapshot);
        snapshot.usage.reserved = Math.max(0, snapshot.usage.reserved - currentRun.reservedCredits);
        snapshot.usage.used += actualCredits;
        recomputeUsage(snapshot);
        snapshot.runs = snapshot.runs.map((item) => item.id === runId ? nextRun : item);
        snapshot.workflows = snapshot.workflows.map((item) => item.id === currentWorkflow.id ? { ...item, credits: (item.credits || 0) + actualCredits, updatedAt: completedAt } : item);
        appendLedger(snapshot, { type: "consumption", amount: actualCredits, reservedDelta: -actualCredits, usedDelta: actualCredits, description: "Sandbox run consumed credits.", runId, workflowId: currentWorkflow.id });
        if (release) appendLedger(snapshot, { type: "release", amount: release, availableDelta: release, reservedDelta: -release, description: "Unused sandbox run reservation released.", runId, workflowId: currentWorkflow.id });
        appendAudit(snapshot, { eventType: "run.completed", entityType: "run", entityId: runId, workflowId: currentWorkflow.id, runId, detail: "Sandbox run completed without an approval boundary.", metadata: { credits: actualCredits } });
        appendActivity(snapshot, "Sandbox run completed", `${currentWorkflow.name} · ${actualCredits} credits`);
      }
      return snapshot;
    });
  } catch (error) {
    console.error("MakeEase sandbox run failed:", { runId, code: error?.code || "RUN_FAILED", message: String(error?.message || "The bounded run failed.").slice(0, 300) });
    try {
      await store.update((snapshot) => {
        assertWorkspaceScope(snapshot, scope);
        const currentRun = (snapshot.runs || []).find((item) => item.id === runId);
        if (!currentRun || !["queued", "running"].includes(currentRun.status)) return snapshot;
        const released = currentRun.reservedCredits || 0;
        recomputeUsage(snapshot);
        snapshot.usage.reserved = Math.max(0, snapshot.usage.reserved - released);
        recomputeUsage(snapshot);
        const completedAt = nowIso();
        snapshot.runs = snapshot.runs.map((item) => item.id === runId ? {
          ...item,
          status: "failed",
           error: error && error.code === "WORKFLOW_NOT_FOUND"
             ? error.message
             : error?.code === "INVALID_INPUT" || error?.code === "SECRET_INPUT_REJECTED"
               ? "The generated support packet failed the local safety contract."
               : "The bounded sandbox run could not be completed.",
          reservedCredits: 0,
          completedAt,
          steps: (item.steps || []).map((step) => step.status === "completed" ? step : { ...step, status: "failed", detail: "Sandbox run failed before completion." })
        } : item);
        if (released) appendLedger(snapshot, { type: "release", amount: released, availableDelta: released, reservedDelta: -released, description: "Failed sandbox run reservation released.", runId, workflowId: currentRun.workflowId });
         appendAudit(snapshot, { eventType: "run.failed", entityType: "run", entityId: runId, workflowId: currentRun.workflowId, runId, detail: "Sandbox run failed; no external action was attempted.", metadata: { code: String(error?.code || "RUN_FAILED").slice(0, 80), reason: String(error?.message || "The bounded run failed.").slice(0, 300) } });
        return snapshot;
      });
    } catch (finalizeError) {
      console.error("MakeEase sandbox run finalization error:", finalizeError && finalizeError.stack ? finalizeError.stack : finalizeError);
    }
  }
}

async function recoverSandboxRuns(store, scope) {
  const snapshot = await store.read();
  assertWorkspaceScope(snapshot, scope);
  const interrupted = (snapshot.runs || []).filter((runValue) => runValue.status === "running");
  if (interrupted.length) {
    await store.update((current) => {
      assertWorkspaceScope(current, scope);
      recomputeUsage(current);
      for (const runValue of interrupted) {
        const currentRun = (current.runs || []).find((item) => item.id === runValue.id);
        if (!currentRun || currentRun.status !== "running") continue;
        const released = currentRun.reservedCredits || 0;
        current.usage.reserved = Math.max(0, current.usage.reserved - released);
        current.runs = current.runs.map((item) => item.id === currentRun.id ? {
          ...item,
          status: "failed",
          error: "The sandbox run was interrupted by a local adapter restart.",
          reservedCredits: 0,
          completedAt: nowIso(),
          steps: (item.steps || []).map((step) => step.status === "completed" ? step : { ...step, status: "failed", detail: "Run interrupted by local adapter restart." })
        } : item);
        if (released) appendLedger(current, { type: "release", amount: released, availableDelta: released, reservedDelta: -released, description: "Interrupted sandbox run reservation released.", runId: currentRun.id, workflowId: currentRun.workflowId });
        appendAudit(current, { eventType: "run.interrupted", entityType: "run", entityId: currentRun.id, workflowId: currentRun.workflowId, runId: currentRun.id, detail: "A running sandbox run was safely finalized after restart." });
      }
      recomputeUsage(current);
      return current;
    });
  }
  const refreshed = await store.read();
  for (const runValue of (refreshed.runs || []).filter((item) => item.status === "queued").slice(0, MAX_ARRAY_ITEMS)) {
    processSandboxRun(store, scope, runValue.id).catch((error) => {
      console.error("MakeEase sandbox recovery error:", error && error.stack ? error.stack : error);
    });
  }
}

function sendJson(response, statusCode, payload, { head = false, headers = {} } = {}) {
  const body = Buffer.from(JSON.stringify(payload));
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", body.length);
  response.setHeader("Cache-Control", "no-store");
  setSecurityHeaders(response);
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  response.end(head ? undefined : body);
}

function setSecurityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
}

function sendError(response, error, requestIdValue, { head = false } = {}) {
  const isExpected = error instanceof HttpError || error instanceof PersistenceError || (error && Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 500);
  const statusCode = isExpected ? error.statusCode : 500;
  const code = isExpected ? error.code : "INTERNAL_ERROR";
  const message = error instanceof PersistenceError
    ? "The local workspace store is unavailable."
    : (isExpected ? error.message : "The server could not complete the request.");
  if (!isExpected) console.error("MakeEase local adapter error:", { requestId: requestIdValue, code: "INTERNAL_ERROR" });
  sendJson(response, statusCode, {
    ok: false,
    error: { code, message, requestId: requestIdValue }
  }, {
    head,
    headers: { ...(isExpected && error.headers ? error.headers : {}), ["X-Request-ID"]: requestIdValue }
  });
}

function parseRequestUrl(rawUrl) {
  if (typeof rawUrl !== "string") throw new HttpError(400, "INVALID_URL", "The request URL is invalid.");
  let parsed;
  try {
    parsed = new URL(rawUrl, "http://127.0.0.1");
  } catch (error) {
    throw new HttpError(400, "INVALID_URL", "The request URL is invalid.");
  }
  return { pathname: parsed.pathname, rawPathname: rawUrl.split(/[?#]/, 1)[0] || "/", searchParams: parsed.searchParams };
}

function resolveRequestScope(request, pathname, { tenantId: adapterTenantId = DEFAULT_TENANT_ID, workspaceId: adapterWorkspaceId = DEFAULT_WORKSPACE_ID, authenticatedScope = null, authMode = "local-demo" } = {}) {
  const requestedTenantId = authenticatedScope?.tenantId || headerIdentifier(request, TENANT_ID_HEADER, adapterTenantId, "tenantId");
  const requestedWorkspaceId = authenticatedScope?.workspaceId || headerIdentifier(request, WORKSPACE_ID_HEADER, adapterWorkspaceId, "workspaceId");
  if (requestedTenantId !== adapterTenantId) {
    throw new HttpError(404, "TENANT_NOT_FOUND", "The requested tenant is not available in the local adapter.");
  }
  if (pathname === "/api/workspace/demo" && requestedWorkspaceId !== DEFAULT_WORKSPACE_ID) {
    throw new HttpError(404, "WORKSPACE_NOT_FOUND", "The requested workspace is not available in the local adapter.");
  }
  if (requestedWorkspaceId !== adapterWorkspaceId) {
    throw new HttpError(404, "WORKSPACE_NOT_FOUND", "The requested workspace is not available in the local adapter.");
  }
  return { tenantId: requestedTenantId, workspaceId: requestedWorkspaceId, authMode };
}

function assertWorkspaceScope(snapshot, scope) {
  if (!snapshot || snapshot.id !== scope.workspaceId) {
    throw new HttpError(404, "WORKSPACE_NOT_FOUND", "The requested workspace is not available in the local adapter.");
  }
}

function unwrapWorkspaceRequest(value) {
  if (!isPlainObject(value)) {
    throw new HttpError(400, "INVALID_WORKSPACE", "The workspace payload must be a JSON object.");
  }
  if (Object.prototype.hasOwnProperty.call(value, "workspace")) {
    if (Object.keys(value).length !== 1 || !isPlainObject(value.workspace)) {
      throw new HttpError(400, "INVALID_WORKSPACE", "The workspace request wrapper must contain only a workspace object.");
    }
    return value.workspace;
  }
  return value;
}

function decodeStaticPath(rawPathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPathname);
  } catch (error) {
    throw new HttpError(400, "INVALID_PATH", "The requested path contains invalid encoding.");
  }
  if (decodedPath.includes("\0")) throw new HttpError(400, "INVALID_PATH", "The requested path is invalid.");

  const segments = decodedPath.replace(/\\/g, "/").split("/");
  if (segments.includes("..")) {
    throw new HttpError(403, "PATH_TRAVERSAL_BLOCKED", "The requested path is not allowed.");
  }
  return decodedPath;
}

function isInsideDirectory(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function isPublicStaticPath(relativePath) {
  return PUBLIC_STATIC_FILES.has(relativePath) || /^ui\/[a-z0-9_-]+\.js$/i.test(relativePath);
}

async function serveStatic(request, response, rawPathname, staticRoot) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    throw new HttpError(405, "METHOD_NOT_ALLOWED", "Static files are available with GET or HEAD.", { Allow: "GET, HEAD" });
  }

  const decodedPath = decodeStaticPath(rawPathname);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const lexicalCandidate = path.resolve(staticRoot, relativePath);
  const lexicalRoot = path.resolve(staticRoot);
  if (!isInsideDirectory(lexicalRoot, lexicalCandidate)) {
    throw new HttpError(403, "PATH_TRAVERSAL_BLOCKED", "The requested path is not allowed.");
  }

  const normalizedLexicalPath = path.relative(lexicalRoot, lexicalCandidate).split(path.sep).join("/").toLowerCase();
  const firstSegment = normalizedLexicalPath.split("/", 1)[0];
  if (!isPublicStaticPath(normalizedLexicalPath) || PRIVATE_STATIC_DIRECTORIES.has(firstSegment) || firstSegment.startsWith(".") || PRIVATE_STATIC_FILES.has(normalizedLexicalPath)) {
    throw new HttpError(404, "NOT_FOUND", "The requested resource was not found.");
  }

  let realRoot;
  let realCandidate;
  try {
    realRoot = await fsp.realpath(lexicalRoot);
    realCandidate = await fsp.realpath(lexicalCandidate);
  } catch (error) {
    if (error.code === "ENOENT") throw new HttpError(404, "NOT_FOUND", "The requested resource was not found.");
    throw error;
  }
  if (!isInsideDirectory(realRoot, realCandidate)) {
    throw new HttpError(403, "PATH_TRAVERSAL_BLOCKED", "The requested path is not allowed.");
  }
  const normalizedRealPath = path.relative(realRoot, realCandidate).split(path.sep).join("/").toLowerCase();
  const realFirstSegment = normalizedRealPath.split("/", 1)[0];
  if (!isPublicStaticPath(normalizedRealPath) || PRIVATE_STATIC_DIRECTORIES.has(realFirstSegment) || realFirstSegment.startsWith(".") || PRIVATE_STATIC_FILES.has(normalizedRealPath)) {
    throw new HttpError(404, "NOT_FOUND", "The requested resource was not found.");
  }

  let fileStats;
  try {
    fileStats = await fsp.stat(realCandidate);
  } catch (error) {
    if (error.code === "ENOENT") throw new HttpError(404, "NOT_FOUND", "The requested resource was not found.");
    throw error;
  }
  if (!fileStats.isFile()) throw new HttpError(404, "NOT_FOUND", "The requested resource was not found.");

  const file = await fsp.readFile(realCandidate);
  response.statusCode = 200;
  response.setHeader("Content-Type", MIME_TYPES[path.extname(realCandidate).toLowerCase()] || "application/octet-stream");
  response.setHeader("Content-Length", file.length);
  setSecurityHeaders(response);
  response.setHeader("Cache-Control", path.extname(realCandidate).toLowerCase() === ".html" ? "no-store" : "public, max-age=300");
  response.end(request.method === "HEAD" ? undefined : file);
}

const API_ROUTES = {
  "/api": { methods: ["GET", "HEAD"] },
  "/api/health": { methods: ["GET", "HEAD"] },
  "/api/auth/register": { methods: ["POST"] },
  "/api/auth/login": { methods: ["POST"] },
  "/api/auth/logout": { methods: ["POST"] },
  "/api/auth/me": { methods: ["GET", "HEAD"] },
  "/api/bootstrap": { methods: ["GET", "HEAD"] },
  "/api/plans": { methods: ["GET", "HEAD"] },
  "/api/usage": { methods: ["GET", "HEAD"] },
  "/api/credits": { methods: ["GET", "HEAD"] },
  "/api/ledger": { methods: ["GET", "HEAD"] },
  "/api/audit": { methods: ["GET", "HEAD"] },
  "/api/export": { methods: ["GET", "HEAD"] },
  "/api/connectors": { methods: ["GET", "HEAD"] },
  "/api/packets": { methods: ["GET", "HEAD"] },
  "/api/workspace": { methods: ["GET", "HEAD", "PUT", "PATCH"] },
  "/api/workspace/demo": { methods: ["GET", "HEAD", "PUT", "PATCH"] },
  "/api/workflows": { methods: ["GET", "HEAD", "POST"] },
  "/api/knowledge": { methods: ["GET", "HEAD", "POST"] },
  "/api/billing/sandbox-topup": { methods: ["POST"] },
  "/api/billing/sandbox-plan": { methods: ["POST"] }
};

function dynamicApiRoute(pathname) {
  if (/^\/api\/workflows\/[^/]+\/run$/.test(pathname)) return { methods: ["POST"] };
  if (/^\/api\/workflows\/[^/]+$/.test(pathname)) return { methods: ["GET", "HEAD", "PATCH"] };
  if (/^\/api\/runs\/[^/]+\/retry$/.test(pathname)) return { methods: ["POST"] };
  if (/^\/api\/runs\/[^/]+$/.test(pathname)) return { methods: ["GET", "HEAD"] };
  if (/^\/api\/approvals\/[^/]+\/decision$/.test(pathname)) return { methods: ["POST"] };
  if (/^\/api\/packets\/[^/]+$/.test(pathname)) return { methods: ["GET", "HEAD"] };
  if (/^\/api\/knowledge\/[^/]+$/.test(pathname)) return { methods: ["DELETE"] };
  if (/^\/api\/runs$/.test(pathname)) return { methods: ["GET", "HEAD"] };
  if (/^\/api\/approvals$/.test(pathname)) return { methods: ["GET", "HEAD"] };
  return null;
}

async function readStoreSnapshot(store, scope) {
  try {
    const snapshot = await store.read();
    assertWorkspaceScope(snapshot, scope);
    return snapshot;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "WORKSPACE_STORE_UNAVAILABLE", "The local workspace store is unavailable.");
  }
}

async function readStoreHealth(store, scope) {
  const snapshot = await readStoreSnapshot(store, scope);
  return {
    status: "ready",
    kind: "json-file",
    workspaceId: snapshot.id
  };
}

function assertApiMethod(pathname, method) {
  const route = API_ROUTES[pathname] || dynamicApiRoute(pathname);
  if (!route) throw new HttpError(404, "NOT_FOUND", "The requested API route was not found.");
  if (!route.methods.includes(method)) {
    throw new HttpError(405, "METHOD_NOT_ALLOWED", "The API route does not support this method.", { Allow: route.methods.join(", ") });
  }
  return route;
}

function authDisabledError() {
  return new HttpError(404, "AUTH_NOT_ENABLED", "Authenticated sessions are not enabled in the local preview adapter.");
}

async function requireSession(request, pathname, method, { authMode, authStore }) {
  if (authMode !== "required") return null;
  const token = requestCookie(request, SESSION_COOKIE);
  const authenticated = await authStore.resolveSession(token);
  if (!authenticated) throw new HttpError(401, "AUTHENTICATION_REQUIRED", "Sign in is required for this workspace.");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrf = requestHeader(request, CSRF_HEADER);
    if (!(await authStore.csrfValid(authenticated.session, csrf))) {
      throw new HttpError(403, "CSRF_REQUIRED", "A valid session CSRF token is required for this write.");
    }
  }
  return authenticated;
}

async function handleAuthRequest(request, response, pathname, {
  authMode,
  authStore,
  store,
  scope,
  maxBodyBytes,
  isHead
}) {
  if (!pathname.startsWith("/api/auth/")) return false;
  if (authMode !== "required") throw authDisabledError();
  if (pathname === "/api/auth/me") {
    const authenticated = await requireSession(request, pathname, request.method, { authMode, authStore });
    sendJson(response, 200, { ok: true, meta: apiMeta({ ...scope, authMode }), user: authenticated.user, csrfToken: null }, { head: isHead });
    return true;
  }
  if (!isJsonContentType(request)) {
    request.resume();
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Authentication requests require Content-Type: application/json.");
  }
  const parsed = await readJsonBody(request, maxBodyBytes);
  if (pathname === "/api/auth/register") {
    const payload = registerPayload(parsed);
    const user = await authStore.createUser({ ...payload, tenantId: scope.tenantId, workspaceId: scope.workspaceId });
    const credentials = await authStore.createSession(user.id);
    await store.update((current) => ({
      ...current,
      name: payload.workspaceName,
      owner: { name: payload.name, role: "Owner" }
    }));
    sendJson(response, 201, {
      ok: true,
      meta: apiMeta({ ...scope, authMode }),
      user,
      csrfToken: credentials.csrfToken
    }, { headers: { "Set-Cookie": sessionCookie(credentials.token, credentials.maxAge) } });
    return true;
  }
  if (pathname === "/api/auth/login") {
    const payload = loginPayload(parsed);
    const user = await authStore.authenticate(payload.email, payload.password);
    if (!user) throw new HttpError(401, "INVALID_CREDENTIALS", "The email or password is not correct.");
    const credentials = await authStore.createSession(user.id);
    sendJson(response, 200, {
      ok: true,
      meta: apiMeta({ ...scope, authMode }),
      user,
      csrfToken: credentials.csrfToken
    }, { headers: { "Set-Cookie": sessionCookie(credentials.token, credentials.maxAge) } });
    return true;
  }
  if (pathname === "/api/auth/logout") {
    await requireSession(request, pathname, request.method, { authMode, authStore });
    const token = requestCookie(request, SESSION_COOKIE);
    // Logout is deliberately idempotent. If a session exists, CSRF was checked
    // by requireSession before this handler was entered.
    await authStore.revoke(token);
    sendJson(response, 200, { ok: true, meta: apiMeta({ ...scope, authMode }) }, { headers: { "Set-Cookie": sessionCookie("", 0, { clear: true }) } });
    return true;
  }
  throw new HttpError(404, "NOT_FOUND", "The requested authentication route was not found.");
}

async function handleApiRequest(request, response, pathname, store, {
  maxBodyBytes,
  idempotencyCache,
  tenantId,
  workspaceId,
  searchParams,
  requestIdValue,
  enqueueRun,
  authMode = process.env.MAKEEASE_AUTH_MODE || "local-demo",
  authStore = new AuthStore()
}) {
  assertApiMethod(pathname, request.method);
  const isHead = request.method === "HEAD";
  const adapterScope = { tenantId, workspaceId, authMode };

  if (authMode === "required") await authStore.init();
  if (pathname.startsWith("/api/auth/")) {
    const handled = await handleAuthRequest(request, response, pathname, {
      authMode,
      authStore,
      store,
      scope: adapterScope,
      maxBodyBytes,
      isHead
    });
    if (handled) return;
  }
  const authenticated = await requireSession(request, pathname, request.method, { authMode, authStore });
  if (authenticated) adapterScope.authenticatedScope = { tenantId: authenticated.user.tenantId, workspaceId: authenticated.user.workspaceId };

  if (pathname === "/api") {
    sendJson(response, 200, {
      ok: true,
      meta: apiMeta(adapterScope),
       routes: [
         "GET /api/health", "GET /api/bootstrap", "POST /api/auth/register", "POST /api/auth/login", "POST /api/auth/logout", "GET /api/auth/me", "GET /api/plans", "GET /api/workspace", "PUT|PATCH /api/workspace",
         "GET /api/connectors", "GET /api/packets", "GET /api/packets/:id",
         "GET|POST /api/workflows", "GET /api/workflows/:id", "PATCH /api/workflows/:id", "POST /api/workflows/:id/run", "GET /api/runs", "GET /api/runs/:id", "POST /api/runs/:id/retry",
         "GET /api/approvals", "POST /api/approvals/:id/decision", "GET|POST /api/knowledge", "DELETE /api/knowledge/:id",
         "GET /api/usage", "GET /api/credits", "GET /api/ledger", "GET /api/audit", "POST /api/billing/sandbox-topup", "POST /api/billing/sandbox-plan", "GET /api/export"
       ],
      capabilities: clone(ADAPTER_CAPABILITIES)
    }, { head: isHead });
    return;
  }
  if (pathname === "/api/health") {
    const scope = resolveRequestScope(request, pathname, adapterScope);
    const storage = await readStoreHealth(store, scope);
    sendJson(response, 200, {
      ok: true,
      status: "ok",
      ready: true,
      ...apiMeta(adapterScope),
      meta: apiMeta(adapterScope),
      storage,
      timestamp: new Date().toISOString()
    }, { head: isHead });
    return;
  }
  if (pathname === "/api/bootstrap") {
    const scope = resolveRequestScope(request, pathname, adapterScope);
    const snapshot = await readStoreSnapshot(store, scope);
    const bootstrap = {
      ok: true,
      meta: apiMeta(scope),
      user: authenticated?.user || null,
      csrfToken: null,
      mode: DEFAULT_MODE,
      plans: clone(DEFAULT_PLANS),
      // Provider environment configuration does not enable an executor in
      // this adapter. Never advertise a configured live model here.
      models: publicModels({}),
      templates: publicTemplates(),
      topup: { ...TOPUP },
      workspace: workspaceResponse(snapshot, scope).workspace,
      packetUsage: workspaceResponse(snapshot, scope).packetUsage
    };
    const catalog = connectorCatalog();
    if (catalog !== null) bootstrap.connectorCatalog = catalog;
    sendJson(response, 200, bootstrap, { head: isHead });
    return;
  }
  if (pathname === "/api/plans") {
    sendJson(response, 200, {
      ok: true,
      meta: apiMeta(adapterScope),
      plans: clone(DEFAULT_PLANS),
      topup: { ...TOPUP }
    }, { head: isHead });
    return;
  }

  const scopedReadRoutes = new Set(["/api/usage", "/api/credits", "/api/ledger", "/api/audit", "/api/export", "/api/workflows", "/api/runs", "/api/approvals", "/api/knowledge", "/api/connectors", "/api/packets"]);
  if (scopedReadRoutes.has(pathname) && (request.method === "GET" || isHead)) {
    const scope = resolveRequestScope(request, pathname, adapterScope);
    const snapshot = await readStoreSnapshot(store, scope);
    const limit = requestedLimit(searchParams);
    if (pathname === "/api/usage" || pathname === "/api/credits") {
      sendJson(response, 200, { ok: true, meta: apiMeta(scope), usage: clone(snapshot.usage), credits: clone(snapshot.usage), ledger: clone((snapshot.ledger || []).slice(-limit)) }, { head: isHead });
      return;
    }
    if (pathname === "/api/ledger") {
      sendJson(response, 200, { ok: true, meta: apiMeta(scope), usage: clone(snapshot.usage), ledger: clone((snapshot.ledger || []).slice(-limit)) }, { head: isHead });
      return;
    }
    if (pathname === "/api/audit") {
      const events = clone((snapshot.auditEvents || []).slice(-limit).reverse());
      sendJson(response, 200, { ok: true, meta: apiMeta(scope), events, auditEvents: events }, { head: isHead });
      return;
    }
    if (pathname === "/api/workflows") {
      sendJson(response, 200, { ok: true, meta: apiMeta(scope), workflows: clone(snapshot.workflows || []) }, { head: isHead });
      return;
    }
    if (pathname === "/api/runs") {
      sendJson(response, 200, { ok: true, meta: apiMeta(scope), runs: clone((snapshot.runs || []).slice(-limit).reverse()) }, { head: isHead });
      return;
    }
    if (pathname === "/api/approvals") {
      sendJson(response, 200, { ok: true, meta: apiMeta(scope), approvals: clone((snapshot.approvals || []).slice(-limit).reverse()) }, { head: isHead });
      return;
    }
    if (pathname === "/api/knowledge") {
      sendJson(response, 200, { ok: true, meta: apiMeta(scope), knowledge: (snapshot.sources || []).map((source) => ({ id: source.id, title: source.name, content: source.detail, kind: "Source", status: "local", ...(source.createdAt ? { createdAt: source.createdAt } : {}) })) }, { head: isHead });
      return;
    }
    if (pathname === "/api/connectors") {
      sendJson(response, 200, { ok: true, meta: apiMeta(scope), mode: "preview", connectors: connectorCatalog() || [] }, { head: isHead });
      return;
    }
    if (pathname === "/api/packets") {
      const packets = (snapshot.runs || [])
        .map((run) => run.output?.supportPacket ? {
          ...clone(run.output.supportPacket),
          runId: run.id,
          workflowId: run.workflowId,
          runStatus: run.status,
          createdAt: run.createdAt
        } : null)
        .filter(Boolean)
        .slice(0, limit);
      sendJson(response, 200, { ok: true, meta: apiMeta(scope), customerUnit: CUSTOMER_UNIT, packets }, { head: isHead });
      return;
    }
    const exported = {
      workspace: clone(snapshot),
      usage: clone(snapshot.usage),
      workflows: clone(snapshot.workflows || []),
      runs: clone(snapshot.runs || []),
      approvals: clone(snapshot.approvals || []),
      knowledge: (snapshot.sources || []).map((source) => ({ id: source.id, title: source.name, content: source.detail, status: "local" })),
      activity: clone(snapshot.activity || []),
      integrations: clone(snapshot.integrations || []),
      ledger: clone(snapshot.ledger || []),
      auditEvents: clone(snapshot.auditEvents || [])
    };
    delete exported.workspace.operations;
    sendJson(response, 200, { ok: true, meta: apiMeta(scope), export: exported, ...exported }, {
      head: isHead,
      headers: { "Content-Disposition": `attachment; filename="makeease-${scope.workspaceId}-export.json"` }
    });
    return;
  }

  const isWorkspaceRoute = pathname === "/api/workspace" || pathname === "/api/workspace/demo";
  if (isWorkspaceRoute && (request.method === "GET" || isHead)) {
    const scope = resolveRequestScope(request, pathname, adapterScope);
    const snapshot = await readStoreSnapshot(store, scope);
    sendJson(response, 200, workspaceResponse(snapshot, scope), {
      head: isHead,
      headers: { ETag: workspaceEtag(snapshot) }
    });
    return;
  }
  if (isWorkspaceRoute && (request.method === "PUT" || request.method === "PATCH")) {
    const scope = resolveRequestScope(request, pathname, adapterScope);
    if (!isJsonContentType(request)) {
      request.resume();
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Workspace writes require Content-Type: application/json.");
    }
    const key = parseIdempotencyHeader(request);
    if (!key) {
      request.resume();
      throw new HttpError(428, "IDEMPOTENCY_KEY_REQUIRED", "Workspace writes require an Idempotency-Key header.");
    }
    const ifMatch = parseIfMatch(request);
    const parsedPayload = await readJsonBody(request, maxBodyBytes);
    if (hasUnsafeKeys(parsedPayload)) {
      throw new HttpError(400, "UNSAFE_WORKSPACE_PAYLOAD", "Workspace data cannot contain secrets or unsafe object keys.");
    }
    const rawPayload = unwrapWorkspaceRequest(parsedPayload);
    const payload = request.method === "PATCH"
      ? workspacePatch(rawPayload)
      : workspaceDocument(rawPayload, { workspaceId: scope.workspaceId });
    const operationPath = "/api/workspace";
    const operationFingerprint = fingerprint({ method: request.method, pathname: operationPath, scope, payload, ifMatch });
    const cacheKey = `${scope.tenantId}:${scope.workspaceId}:${request.method}:${operationPath}:${key}`;
    let persistedReplay = false;
    const result = await idempotencyCache.execute(cacheKey, operationFingerprint, async () => {
      // PUT is retained for the legacy adapter, but a partial PUT must not
      // erase existing workspace sections. Both write methods therefore merge a
      // validated payload into the current scoped snapshot.
      const saved = await store.update((current) => {
        assertWorkspaceScope(current, scope);
        // Check within the serialized write transaction, not before queuing:
        // two clients editing one snapshot must not both win a stale write.
        const existing = findOperation(current, `workspace.${request.method.toLowerCase()}`, key, operationFingerprint);
        if (existing) {
          persistedReplay = true;
          return current;
        }
        if (ifMatch && ifMatch !== "*" && ifMatch !== workspaceEtag(current)) {
          throw new HttpError(412, "WORKSPACE_CHANGED", "The workspace changed. Read the current workspace before saving again.");
        }
        const next = mergeWorkspaceUpdate(current, payload);
        recordOperation(next, {
          operation: `workspace.${request.method.toLowerCase()}`,
          key,
          requestFingerprint: operationFingerprint,
          resourceType: "workspace",
          resourceId: scope.workspaceId
        });
        appendAudit(next, {
          eventType: "workspace.updated",
          entityType: "workspace",
          entityId: scope.workspaceId,
          requestId: requestIdValue,
          idempotencyKey: key,
          detail: "Workspace profile updated through the local adapter."
        });
        return next;
      });
      return workspaceResponse(saved, scope);
    });
    sendJson(response, 200, result.value, {
      headers: { ETag: workspaceEtag(result.value.workspace), ...(result.replayed || persistedReplay ? { "Idempotency-Replayed": "true" } : {}) }
    });
    return;
  }

  const scope = resolveRequestScope(request, pathname, adapterScope);

  const packetId = pathname.startsWith("/api/packets/")
    ? parseRouteIdentifier(pathname, "/api/packets/")
    : null;
  if (packetId && (request.method === "GET" || isHead)) {
    const snapshot = await readStoreSnapshot(store, scope);
    const packetRun = (snapshot.runs || []).find((run) => run.output?.supportPacket?.packetId === packetId);
    if (!packetRun?.output?.supportPacket) throw new HttpError(404, "PACKET_NOT_FOUND", "The requested support review packet was not found.");
    sendJson(response, 200, {
      ok: true,
      meta: apiMeta(scope),
      customerUnit: CUSTOMER_UNIT,
      packet: {
        ...clone(packetRun.output.supportPacket),
        runId: packetRun.id,
        workflowId: packetRun.workflowId,
        runStatus: packetRun.status,
        createdAt: packetRun.createdAt
      }
    }, { head: isHead });
    return;
  }

  // Workflow commands are deliberately typed and local.  They create only a
  // bounded sandbox definition; no connector or arbitrary code step can be
  // smuggled through the JSON workspace document.
  if (pathname === "/api/workflows" && request.method === "POST") {
    if (!isJsonContentType(request)) {
      request.resume();
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Workflow writes require Content-Type: application/json.");
    }
    const parsed = await readJsonBody(request, maxBodyBytes);
    if (hasUnsafeKeys(parsed)) throw new HttpError(400, "UNSAFE_WORKFLOW_PAYLOAD", "Workflow data cannot contain secrets or unsafe object keys.");
    const key = mutationKey(request, parsed);
    const payload = workflow(bodyWithoutIdempotencyKey(parsed));
    const operationFingerprint = fingerprint({ operation: "workflow.create", scope, payload });
    let replayed = false;
    let createdWorkflowId = null;
    const saved = await store.update((current) => {
      assertWorkspaceScope(current, scope);
      const existing = findOperation(current, "workflow.create", key, operationFingerprint);
      if (existing) {
        replayed = true;
        createdWorkflowId = existing.resourceId;
        return current;
      }
      const createdAt = nowIso();
      const workflowValue = {
        id: resourceId("workflow"),
        ...payload,
        status: "draft",
        runs: 0,
        credits: 0,
        createdAt,
        updatedAt: createdAt
      };
      createdWorkflowId = workflowValue.id;
      current.workflows = [...(current.workflows || []), workflowValue];
      recordOperation(current, { operation: "workflow.create", key, requestFingerprint: operationFingerprint, resourceType: "workflow", resourceId: workflowValue.id });
      appendAudit(current, { eventType: "workflow.created", entityType: "workflow", entityId: workflowValue.id, workflowId: workflowValue.id, requestId: requestIdValue, idempotencyKey: key, detail: "A bounded sandbox workflow was created." });
      appendActivity(current, "Workflow created", `${workflowValue.name} · draft`);
      return current;
    });
    const workflowValue = (saved.workflows || []).find((item) => item.id === createdWorkflowId);
    if (!workflowValue) throw new HttpError(500, "WORKFLOW_CREATE_FAILED", "The workflow could not be created.");
    sendJson(response, replayed ? 200 : 201, { ok: true, meta: apiMeta(scope), workflow: clone(workflowValue) }, { headers: replayed ? { "Idempotency-Replayed": "true" } : {} });
    return;
  }

  if (pathname === "/api/workflows" && (request.method === "GET" || isHead)) {
    // The read branch above normally handles this route; this fallback keeps
    // the control flow explicit if a future route table changes.
    const snapshot = await readStoreSnapshot(store, scope);
    sendJson(response, 200, { ok: true, meta: apiMeta(scope), workflows: clone(snapshot.workflows || []) }, { head: isHead });
    return;
  }

  const workflowId = parseRouteIdentifier(pathname, "/api/workflows/");
  if (workflowId && pathname.endsWith("/run") && request.method === "POST") {
    const runWorkflowId = parseRouteIdentifier(pathname.slice(0, -4), "/api/workflows/");
    if (!isJsonContentType(request)) {
      request.resume();
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Run requests require Content-Type: application/json.");
    }
    const parsed = await readJsonBody(request, maxBodyBytes);
    if (hasUnsafeKeys(parsed)) throw new HttpError(400, "UNSAFE_RUN_PAYLOAD", "Run data cannot contain secrets or unsafe object keys.");
    const key = mutationKey(request, parsed, { required: true });
    const payload = runPayload({ ...parsed, idempotencyKey: key });
    const operationFingerprint = fingerprint({ operation: "run.create", scope, workflowId: runWorkflowId, input: payload.input });
    let replayed = false;
    const saved = await store.update((current) => {
      assertWorkspaceScope(current, scope);
      const existingOperation = findOperation(current, "run.create", key, operationFingerprint);
      if (existingOperation) {
        replayed = true;
        return current;
      }
      const workflowValue = (current.workflows || []).find((item) => item.id === runWorkflowId);
      if (!workflowValue) throw new HttpError(404, "WORKFLOW_NOT_FOUND", "The requested workflow was not found.");
      if (workflowValue.status === "paused") throw new HttpError(409, "WORKFLOW_PAUSED", "Paused workflows cannot start new runs.");
      recomputeUsage(current);
      const budget = workflowValue.budgetCredits;
      if (!Number.isInteger(budget) || budget < 1) throw new HttpError(409, "WORKFLOW_BUDGET_INVALID", "The workflow does not have a valid credit budget.");
      if (current.usage.available < budget) throw new HttpError(409, "CREDITS_EXHAUSTED", "The workspace does not have enough available credits for this run.");
      const createdAt = nowIso();
      const runValue = {
        id: resourceId("run"),
        workflowId: workflowValue.id,
        workflowName: workflowValue.name,
        status: "queued",
        input: payload.input,
        output: null,
        error: null,
        credits: 0,
        reservedCredits: budget,
        model: workflowValue.model,
        mode: "sandbox",
        steps: workflowSteps(workflowValue),
        createdAt,
        idempotencyKey: key,
        requestHash: operationFingerprint
      };
      current.runs = [runValue, ...(current.runs || [])].slice(0, MAX_ARRAY_ITEMS);
      current.workflows = current.workflows.map((item) => item.id === workflowValue.id ? { ...item, runs: (item.runs || 0) + 1, updatedAt: createdAt } : item);
      current.usage.reserved += budget;
      recomputeUsage(current);
      appendLedger(current, { type: "reservation", amount: budget, availableDelta: -budget, reservedDelta: budget, description: "Sandbox run credits reserved.", runId: runValue.id, workflowId: workflowValue.id, idempotencyKey: key });
      recordOperation(current, { operation: "run.create", key, requestFingerprint: operationFingerprint, resourceType: "run", resourceId: runValue.id });
      appendAudit(current, { eventType: "run.created", entityType: "run", entityId: runValue.id, workflowId: workflowValue.id, runId: runValue.id, requestId: requestIdValue, idempotencyKey: key, detail: "A bounded sandbox run was queued.", metadata: { reservedCredits: budget } });
      appendActivity(current, "Sandbox run queued", `${workflowValue.name} · ${budget} credits reserved`);
      return current;
    });
    const operation = (saved.operations || []).find((item) => item.operation === "run.create" && item.key === key && item.fingerprint === operationFingerprint);
    const runValue = (saved.runs || []).find((item) => item.id === operation?.resourceId);
    if (!runValue) throw new HttpError(500, "RUN_CREATE_FAILED", "The sandbox run could not be created.");
    if (!replayed && typeof enqueueRun === "function") enqueueRun(scope, runValue.id);
    sendJson(response, replayed ? 200 : 202, { ok: true, meta: apiMeta(scope), run: clone(runValue) }, { headers: replayed ? { "Idempotency-Replayed": "true" } : {} });
    return;
  }

  if (workflowId && !pathname.endsWith("/run") && (request.method === "GET" || isHead)) {
    const snapshot = await readStoreSnapshot(store, scope);
    const workflowValue = (snapshot.workflows || []).find((item) => item.id === workflowId);
    if (!workflowValue) throw new HttpError(404, "WORKFLOW_NOT_FOUND", "The requested workflow was not found.");
    sendJson(response, 200, { ok: true, meta: apiMeta(scope), workflow: clone(workflowValue) }, { head: isHead });
    return;
  }

  if (workflowId && !pathname.endsWith("/run") && request.method === "PATCH") {
    if (!isJsonContentType(request)) {
      request.resume();
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Workflow writes require Content-Type: application/json.");
    }
    const parsed = await readJsonBody(request, maxBodyBytes);
    if (hasUnsafeKeys(parsed)) throw new HttpError(400, "UNSAFE_WORKFLOW_PAYLOAD", "Workflow data cannot contain secrets or unsafe object keys.");
    const key = mutationKey(request, parsed);
    const payload = workflow(bodyWithoutIdempotencyKey(parsed), { patch: true });
    const operationFingerprint = fingerprint({ operation: "workflow.update", scope, workflowId, payload });
    let replayed = false;
    const saved = await store.update((current) => {
      assertWorkspaceScope(current, scope);
      const existing = findOperation(current, "workflow.update", key, operationFingerprint);
      if (existing) {
        replayed = true;
        return current;
      }
      const existingWorkflow = (current.workflows || []).find((item) => item.id === workflowId);
      if (!existingWorkflow) throw new HttpError(404, "WORKFLOW_NOT_FOUND", "The requested workflow was not found.");
      const updated = { ...existingWorkflow, ...payload, updatedAt: nowIso() };
      // A PATCH may update only one graph section. Revalidate the merged graph
      // against the persisted nodes/edges so a partial write cannot leave
      // dangling references or introduce a cycle.
      if (Object.keys(payload).some((key) => ["trigger", "nodes", "edges", "policy", "retry", "connector", "connectors", "connectorMetadata"].includes(key))) {
        const graph = workflowGraph(Object.fromEntries(
          ["trigger", "nodes", "edges", "policy", "retry", "connector", "connectors", "connectorMetadata"]
            .filter((key) => updated[key] !== undefined)
            .map((key) => [key, updated[key]])
        ));
        Object.assign(updated, graph);
      }
      current.workflows = current.workflows.map((item) => item.id === workflowId ? updated : item);
      recordOperation(current, { operation: "workflow.update", key, requestFingerprint: operationFingerprint, resourceType: "workflow", resourceId: workflowId });
      appendAudit(current, { eventType: "workflow.updated", entityType: "workflow", entityId: workflowId, workflowId, requestId: requestIdValue, idempotencyKey: key, detail: "Sandbox workflow configuration updated." });
      appendActivity(current, "Workflow updated", updated.name);
      return current;
    });
    const updatedWorkflow = (saved.workflows || []).find((item) => item.id === workflowId);
    sendJson(response, replayed ? 200 : 200, { ok: true, meta: apiMeta(scope), workflow: clone(updatedWorkflow) }, { headers: replayed ? { "Idempotency-Replayed": "true" } : {} });
    return;
  }

  const retryRunId = pathname.startsWith("/api/runs/") && pathname.endsWith("/retry")
    ? parseRouteIdentifier(pathname.slice(0, -"/retry".length), "/api/runs/")
    : null;
  if (retryRunId && request.method === "POST") {
    if (!isJsonContentType(request)) {
      request.resume();
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Run retry requests require Content-Type: application/json.");
    }
    const parsed = await readJsonBody(request, maxBodyBytes, { allowEmpty: true });
    if (hasUnsafeKeys(parsed)) throw new HttpError(400, "UNSAFE_RETRY_PAYLOAD", "Run retry data cannot contain secrets or unsafe object keys.");
    runRetry(parsed);
    const key = mutationKey(request, parsed, { required: true });
    const operationFingerprint = fingerprint({ operation: "run.retry", scope, runId: retryRunId });
    let replayed = false;
    const saved = await store.update((current) => {
      assertWorkspaceScope(current, scope);
      const existing = findOperation(current, "run.retry", key, operationFingerprint);
      if (existing) {
        replayed = true;
        return current;
      }

      const failedRun = (current.runs || []).find((item) => item.id === retryRunId);
      if (!failedRun) throw new HttpError(404, "RUN_NOT_FOUND", "The requested run was not found.");
      if (failedRun.status !== "failed") throw new HttpError(409, "RUN_NOT_FAILED", "Only failed sandbox runs can be retried.");
      if (failedRun.mode !== "sandbox") throw new HttpError(409, "RUN_NOT_SANDBOX", "Only failed sandbox runs can be retried by the local adapter.");
      if ((failedRun.reservedCredits || 0) > 0) {
        throw new HttpError(409, "RUN_RESERVATION_ACTIVE", "The failed run still has an active credit reservation and cannot be retried safely.");
      }

      const workflowValue = (current.workflows || []).find((item) => item.id === failedRun.workflowId);
      if (!workflowValue) throw new HttpError(404, "WORKFLOW_NOT_FOUND", "The workflow for this run no longer exists.");
      if (workflowValue.status === "paused") throw new HttpError(409, "WORKFLOW_PAUSED", "Paused workflows cannot be retried.");

      recomputeUsage(current);
      const budget = workflowValue.budgetCredits;
      if (!Number.isInteger(budget) || budget < 1) throw new HttpError(409, "WORKFLOW_BUDGET_INVALID", "The workflow does not have a valid credit budget.");
      if (current.usage.available < budget) throw new HttpError(409, "CREDITS_EXHAUSTED", "The workspace does not have enough available credits for this retry.");

      const createdAt = nowIso();
      const sourceSteps = Array.isArray(failedRun.steps) && failedRun.steps.length
        ? failedRun.steps
        : workflowSteps(workflowValue);
      const retryValue = {
        id: resourceId("run"),
        workflowId: failedRun.workflowId,
        workflowName: failedRun.workflowName || workflowValue.name,
        status: "queued",
        input: failedRun.input === undefined ? "" : failedRun.input,
        output: null,
        error: null,
        credits: 0,
        reservedCredits: budget,
        model: failedRun.model || workflowValue.model,
        mode: "sandbox",
        steps: sourceSteps.map((step) => ({ name: step.name, status: "queued" })),
        createdAt,
        idempotencyKey: key,
        requestHash: operationFingerprint,
        retryOf: failedRun.id
      };
      current.runs = [retryValue, ...(current.runs || [])].slice(0, MAX_ARRAY_ITEMS);
      current.workflows = current.workflows.map((item) => item.id === workflowValue.id ? { ...item, runs: (item.runs || 0) + 1, updatedAt: createdAt } : item);
      current.usage.reserved += budget;
      recomputeUsage(current);
      appendLedger(current, {
        type: "reservation",
        amount: budget,
        availableDelta: -budget,
        reservedDelta: budget,
        description: "Sandbox retry credits reserved.",
        runId: retryValue.id,
        workflowId: workflowValue.id,
        idempotencyKey: key
      });
      recordOperation(current, {
        operation: "run.retry",
        key,
        requestFingerprint: operationFingerprint,
        resourceType: "run",
        resourceId: retryValue.id
      });
      appendAudit(current, {
        eventType: "run.retried",
        entityType: "run",
        entityId: retryValue.id,
        workflowId: workflowValue.id,
        runId: retryValue.id,
        requestId: requestIdValue,
        idempotencyKey: key,
        detail: "A failed sandbox run was re-queued with its original workflow and input.",
        metadata: { retryOf: failedRun.id, reservedCredits: budget }
      });
      appendActivity(current, "Sandbox run retried", `${workflowValue.name} · ${budget} credits reserved`);
      return current;
    });
    const operation = (saved.operations || []).find((item) => item.operation === "run.retry" && item.key === key && item.fingerprint === operationFingerprint);
    const retryValue = (saved.runs || []).find((item) => item.id === operation?.resourceId);
    if (!retryValue) throw new HttpError(500, "RUN_RETRY_FAILED", "The sandbox retry could not be created.");
    if (!replayed && typeof enqueueRun === "function") enqueueRun(scope, retryValue.id);
    sendJson(response, replayed ? 200 : 202, { ok: true, meta: apiMeta(scope), run: clone(retryValue) }, { headers: replayed ? { "Idempotency-Replayed": "true" } : {} });
    return;
  }

  const runId = pathname.startsWith("/api/runs/") ? parseRouteIdentifier(pathname, "/api/runs/") : null;
  if (runId && (request.method === "GET" || isHead)) {
    const snapshot = await readStoreSnapshot(store, scope);
    const runValue = (snapshot.runs || []).find((item) => item.id === runId);
    if (!runValue) throw new HttpError(404, "RUN_NOT_FOUND", "The requested run was not found.");
    sendJson(response, 200, { ok: true, meta: apiMeta(scope), run: clone(runValue) }, { head: isHead });
    return;
  }

  const approvalId = pathname.startsWith("/api/approvals/") ? parseRouteIdentifier(pathname, "/api/approvals/") : null;
  if (approvalId && pathname.endsWith("/decision") && request.method === "POST") {
    if (!isJsonContentType(request)) {
      request.resume();
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Approval decisions require Content-Type: application/json.");
    }
    const parsed = await readJsonBody(request, maxBodyBytes);
    if (hasUnsafeKeys(parsed)) throw new HttpError(400, "UNSAFE_APPROVAL_PAYLOAD", "Approval data cannot contain secrets or unsafe object keys.");
    const decisionPayload = approvalDecision(bodyWithoutIdempotencyKey(parsed));
    const key = mutationKey(request, parsed);
    const operationFingerprint = fingerprint({
      operation: "approval.decision",
      scope,
      approvalId,
      decision: decisionPayload.decision,
      reason: decisionPayload.reason || null,
      editedOutput: decisionPayload.editedOutput === undefined ? null : decisionPayload.editedOutput
    });
    let replayed = false;
    const saved = await store.update((current) => {
      assertWorkspaceScope(current, scope);
      const existing = findOperation(current, "approval.decision", key, operationFingerprint);
      if (existing) {
        replayed = true;
        return current;
      }
      const approval = (current.approvals || []).find((item) => item.id === approvalId);
      if (!approval) throw new HttpError(404, "APPROVAL_NOT_FOUND", "The requested approval was not found.");
      if (approval.status !== "pending") {
        const sameDecision = (decisionPayload.decision === "approve" && approval.status === "approved") || (decisionPayload.decision === "reject" && approval.status === "rejected");
        if (sameDecision) {
          replayed = true;
          return current;
        }
        throw new HttpError(409, "APPROVAL_ALREADY_DECIDED", "The approval already has a different decision.");
      }
      if (!approval.runId) throw new HttpError(409, "APPROVAL_NOT_ACTIONABLE", "This legacy approval has no run and cannot be decided.");
      const runValue = (current.runs || []).find((item) => item.id === approval.runId);
      if (!runValue || runValue.status !== "awaiting_approval") throw new HttpError(409, "RUN_NOT_AWAITING_APPROVAL", "The run is not waiting for an approval decision.");
      const workflowValue = (current.workflows || []).find((item) => item.id === runValue.workflowId);
      const decidedAt = nowIso();
      const approved = decisionPayload.decision === "approve";
      const reserved = runValue.reservedCredits || approval.credits || 0;
      const actual = Math.min(reserved, Math.max(0, runValue.credits || approval.credits || 0));
      const finalOutput = decisionPayload.editedOutput === undefined ? runValue.output : decisionPayload.editedOutput;
      const decisionReason = decisionPayload.reason || (approved ? "Approved by the local support reviewer." : "Rejected by the local support reviewer.");
      recomputeUsage(current);
      current.usage.reserved = Math.max(0, current.usage.reserved - reserved);
      if (approved) current.usage.used += actual;
      recomputeUsage(current);
      current.approvals = current.approvals.map((item) => item.id === approvalId ? {
        ...item,
        status: approved ? "approved" : "rejected",
        decidedAt,
        decisionReason,
        reviewerRole: "support_reviewer",
        ...(decisionPayload.editedOutput !== undefined ? { output: finalOutput, edited: true } : {})
      } : item);
      current.runs = current.runs.map((item) => item.id === runValue.id ? {
        ...item,
        status: approved ? "completed" : "rejected",
        reservedCredits: 0,
        completedAt: decidedAt,
        ...(decisionPayload.editedOutput !== undefined ? { output: finalOutput, editedAt: decidedAt } : {})
      } : item);
      if (approved && workflowValue) current.workflows = current.workflows.map((item) => item.id === workflowValue.id ? { ...item, credits: (item.credits || 0) + actual, updatedAt: decidedAt } : item);
      if (approved) {
        appendLedger(current, { type: "consumption", amount: actual, reservedDelta: -actual, usedDelta: actual, description: "Approved sandbox run consumed credits.", runId: runValue.id, workflowId: runValue.workflowId, approvalId });
        if (reserved > actual) appendLedger(current, { type: "release", amount: reserved - actual, availableDelta: reserved - actual, reservedDelta: -(reserved - actual), description: "Unused approved-run reservation released.", runId: runValue.id, workflowId: runValue.workflowId, approvalId });
      } else if (reserved) {
        appendLedger(current, { type: "release", amount: reserved, availableDelta: reserved, reservedDelta: -reserved, description: "Rejected sandbox run reservation released.", runId: runValue.id, workflowId: runValue.workflowId, approvalId });
      }
      recordOperation(current, { operation: "approval.decision", key, requestFingerprint: operationFingerprint, resourceType: "approval", resourceId: approvalId });
      appendAudit(current, { eventType: approved ? "approval.approved" : "approval.rejected", entityType: "approval", entityId: approvalId, workflowId: runValue.workflowId, runId: runValue.id, approvalId, requestId: requestIdValue, idempotencyKey: key, detail: approved ? "Support packet approved internally; no external action was performed." : "Support packet rejected and its unused reservation was released.", metadata: { reason: decisionReason, edited: decisionPayload.editedOutput !== undefined, packetId: approval.packetId || runValue.packetId || null } });
      appendActivity(current, approved ? "Support draft approved internally" : "Support draft rejected", `${approval.title} · ${decisionReason}`);
      return current;
    });
    const approval = (saved.approvals || []).find((item) => item.id === approvalId);
    const runValue = approval?.runId ? (saved.runs || []).find((item) => item.id === approval.runId) : null;
    sendJson(response, 200, { ok: true, meta: apiMeta(scope), approval: clone(approval), ...(runValue ? { run: clone(runValue) } : {}), usage: clone(saved.usage) }, { headers: replayed ? { "Idempotency-Replayed": "true" } : {} });
    return;
  }

  if (pathname === "/api/knowledge" && request.method === "POST") {
    if (!isJsonContentType(request)) {
      request.resume();
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Knowledge writes require Content-Type: application/json.");
    }
    const parsed = await readJsonBody(request, maxBodyBytes);
    if (hasUnsafeKeys(parsed)) throw new HttpError(400, "UNSAFE_KNOWLEDGE_PAYLOAD", "Knowledge data cannot contain secrets or unsafe object keys.");
    const key = mutationKey(request, parsed);
    const payload = knowledge(bodyWithoutIdempotencyKey(parsed));
    const operationFingerprint = fingerprint({ operation: "knowledge.create", scope, payload });
    let replayed = false;
    let createdKnowledgeId = null;
    const saved = await store.update((current) => {
      assertWorkspaceScope(current, scope);
      const existing = findOperation(current, "knowledge.create", key, operationFingerprint);
      if (existing) {
        replayed = true;
        createdKnowledgeId = existing.resourceId;
        return current;
      }
      const source = { id: resourceId("knowledge"), name: payload.title, detail: payload.content, status: "local", createdAt: nowIso() };
      createdKnowledgeId = source.id;
      current.sources = [...(current.sources || []), source].slice(-MAX_ARRAY_ITEMS);
      recordOperation(current, { operation: "knowledge.create", key, requestFingerprint: operationFingerprint, resourceType: "knowledge", resourceId: source.id });
      appendAudit(current, { eventType: "knowledge.created", entityType: "knowledge", entityId: source.id, requestId: requestIdValue, idempotencyKey: key, detail: "A local workspace reference was added." });
      appendActivity(current, "Knowledge reference added", source.name);
      return current;
    });
    const source = (saved.sources || []).find((item) => item.id === createdKnowledgeId);
    if (!source) throw new HttpError(500, "KNOWLEDGE_CREATE_FAILED", "The knowledge reference could not be created.");
    sendJson(response, replayed ? 200 : 201, { ok: true, meta: apiMeta(scope), knowledge: { id: source.id, title: source.name, content: source.detail, kind: "Workspace note", status: "local", ...(source.createdAt ? { createdAt: source.createdAt } : {}) } }, { headers: replayed ? { "Idempotency-Replayed": "true" } : {} });
    return;
  }

  const knowledgeId = pathname.startsWith("/api/knowledge/") ? parseRouteIdentifier(pathname, "/api/knowledge/") : null;
  if (knowledgeId && request.method === "DELETE") {
    const key = mutationKey(request, null);
    const operationFingerprint = fingerprint({ operation: "knowledge.delete", scope, knowledgeId });
    let removed;
    let replayed = false;
    const saved = await store.update((current) => {
      assertWorkspaceScope(current, scope);
      const existing = findOperation(current, "knowledge.delete", key, operationFingerprint);
      if (existing) {
        replayed = true;
        removed = (current.sources || []).find((item) => item.id === knowledgeId) || { id: knowledgeId, name: "" };
        return current;
      }
      const source = (current.sources || []).find((item) => item.id === knowledgeId);
      if (!source) throw new HttpError(404, "KNOWLEDGE_NOT_FOUND", "The requested knowledge reference was not found.");
      current.sources = (current.sources || []).filter((item) => item.id !== knowledgeId);
      removed = source;
      recordOperation(current, { operation: "knowledge.delete", key, requestFingerprint: operationFingerprint, resourceType: "knowledge", resourceId: knowledgeId });
      appendAudit(current, { eventType: "knowledge.deleted", entityType: "knowledge", entityId: knowledgeId, requestId: requestIdValue, idempotencyKey: key, detail: "A local workspace reference was removed." });
      appendActivity(current, "Knowledge reference removed", source.name);
      return current;
    });
    sendJson(response, 200, { ok: true, meta: apiMeta(scope), knowledge: removed ? { id: removed.id, title: removed.name } : null, workspace: workspaceResponse(saved, scope).workspace }, { headers: replayed ? { "Idempotency-Replayed": "true" } : {} });
    return;
  }

  if (pathname === "/api/billing/sandbox-topup" && request.method === "POST") {
    if (!isJsonContentType(request)) {
      request.resume();
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Sandbox billing writes require Content-Type: application/json.");
    }
    const parsed = await readJsonBody(request, maxBodyBytes);
    if (hasUnsafeKeys(parsed)) throw new HttpError(400, "UNSAFE_BILLING_PAYLOAD", "Billing data cannot contain secrets or unsafe object keys.");
    const key = mutationKey(request, parsed, { required: true });
    const validatedKey = sandboxTopup({ ...bodyWithoutIdempotencyKey(parsed), idempotencyKey: key });
    const operationFingerprint = fingerprint({ operation: "billing.sandbox-topup", scope, key: validatedKey });
    let replayed = false;
    const saved = await store.update((current) => {
      assertWorkspaceScope(current, scope);
      const existing = findOperation(current, "billing.sandbox-topup", key, operationFingerprint);
      if (existing) {
        replayed = true;
        return current;
      }
      current.usage.topup += TOPUP.credits;
      recomputeUsage(current);
      appendLedger(current, { type: "topup", amount: TOPUP.credits, availableDelta: TOPUP.credits, description: "Sandbox top-up simulation; no payment was processed.", idempotencyKey: key, bucket: "topup" });
      recordOperation(current, { operation: "billing.sandbox-topup", key, requestFingerprint: operationFingerprint, resourceType: "workspace", resourceId: scope.workspaceId });
      appendAudit(current, { eventType: "billing.sandbox_topup", entityType: "workspace", entityId: scope.workspaceId, requestId: requestIdValue, idempotencyKey: key, detail: "Sandbox credits were added; no payment provider was contacted.", metadata: { credits: TOPUP.credits } });
      appendActivity(current, "Sandbox credits added", `${TOPUP.credits} credits`);
      return current;
    });
    const topupLedger = (saved.ledger || []).find((entry) => entry.idempotencyKey === key && entry.type === "topup") || saved.ledger?.[saved.ledger.length - 1];
    sendJson(response, 200, { ok: true, meta: apiMeta(scope), sandbox: true, paymentProcessed: false, usage: clone(saved.usage), ledger: clone(topupLedger), ...(replayed ? { replayed: true } : {}) }, { headers: replayed ? { "Idempotency-Replayed": "true" } : {} });
    return;
  }

  if (pathname === "/api/billing/sandbox-plan" && request.method === "POST") {
    if (!isJsonContentType(request)) {
      request.resume();
      throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Sandbox billing writes require Content-Type: application/json.");
    }
    const parsed = await readJsonBody(request, maxBodyBytes);
    if (hasUnsafeKeys(parsed)) throw new HttpError(400, "UNSAFE_BILLING_PAYLOAD", "Billing data cannot contain secrets or unsafe object keys.");
    const key = mutationKey(request, parsed, { required: true });
    const validated = sandboxPlan({ ...parsed, idempotencyKey: key });
    const operationFingerprint = fingerprint({ operation: "billing.sandbox-plan", scope, planId: validated.planId });
    let replayed = false;
    const saved = await store.update((current) => {
      assertWorkspaceScope(current, scope);
      const existing = findOperation(current, "billing.sandbox-plan", key, operationFingerprint);
      if (existing) {
        replayed = true;
        return current;
      }
      const previousPlan = current.planId || current.plan;
      const next = mergeWorkspaceUpdate(current, { planId: validated.planId, plan: validated.planId });
      if (previousPlan !== validated.planId) {
        const delta = (next.usage?.included || 0) - (current.usage?.included || 0);
        if (delta) appendLedger(next, { type: "adjustment", amount: delta, availableDelta: delta, description: "Sandbox plan change simulation; no subscription was charged.", idempotencyKey: key, bucket: "included" });
      }
      recordOperation(next, { operation: "billing.sandbox-plan", key, requestFingerprint: operationFingerprint, resourceType: "workspace", resourceId: scope.workspaceId });
      appendAudit(next, { eventType: "billing.sandbox_plan", entityType: "workspace", entityId: scope.workspaceId, requestId: requestIdValue, idempotencyKey: key, detail: "Sandbox plan changed; no payment provider was contacted.", metadata: { from: previousPlan, to: validated.planId } });
      appendActivity(next, "Sandbox plan changed", validated.planId);
      return next;
    });
    sendJson(response, 200, { ok: true, meta: apiMeta(scope), sandbox: true, paymentProcessed: false, workspace: workspaceResponse(saved, scope).workspace, usage: clone(saved.usage), ...(replayed ? { replayed: true } : {}) }, { headers: replayed ? { "Idempotency-Replayed": "true" } : {} });
    return;
  }
}

function createRequestHandler({
  store = new JsonStore(),
  staticRoot = PROJECT_ROOT,
  maxBodyBytes = MAX_JSON_BODY_BYTES,
  idempotencyCache = new IdempotencyCache(),
  tenantId = DEFAULT_TENANT_ID,
  workspaceId = DEFAULT_WORKSPACE_ID,
  authMode = process.env.MAKEEASE_AUTH_MODE || "local-demo",
  authStore = new AuthStore()
} = {}) {
  const resolvedStaticRoot = path.resolve(staticRoot);
  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes <= 0) {
    throw new TypeError("maxBodyBytes must be a positive integer");
  }
  if (maxBodyBytes > MAX_JSON_BODY_BYTES) {
    throw new RangeError(`maxBodyBytes cannot exceed ${MAX_JSON_BODY_BYTES} bytes`);
  }
  let adapterTenantId;
  let adapterWorkspaceId;
  try {
    adapterTenantId = identifier(tenantId, "tenantId", { max: 128 });
    adapterWorkspaceId = identifier(workspaceId, "workspaceId", { max: 128 });
  } catch (error) {
    throw new TypeError("tenantId and workspaceId must be valid identifiers");
  }
  if (store.workspaceId && store.workspaceId !== adapterWorkspaceId) {
    throw new TypeError("store workspaceId must match the handler workspaceId");
  }
  if (!idempotencyCache || typeof idempotencyCache.execute !== "function") {
    throw new TypeError("idempotencyCache must provide an execute method");
  }

  return async function requestHandler(request, response) {
    let currentRequestId = `req_${crypto.randomUUID()}`;
    response.setHeader("X-Request-ID", currentRequestId);
    try {
      currentRequestId = requestId(request);
      response.setHeader("X-Request-ID", currentRequestId);
      const { pathname, rawPathname, searchParams } = parseRequestUrl(request.url);
      if (pathname === "/api" || pathname.startsWith("/api/")) {
        await handleApiRequest(request, response, pathname, store, {
          maxBodyBytes,
          idempotencyCache,
          tenantId: adapterTenantId,
           workspaceId: adapterWorkspaceId,
           authMode,
           authStore,
          searchParams,
          requestIdValue: currentRequestId,
          enqueueRun: (scope, runId) => {
            // Queueing uses the same serialized JSON store.  The next turn is
            // intentionally bounded and never invokes a provider or child
            // process; it only produces a deterministic local result.
            processSandboxRun(store, scope, runId).catch((error) => {
              console.error("MakeEase sandbox run error:", error && error.stack ? error.stack : error);
            });
          }
        });
      } else {
        await serveStatic(request, response, rawPathname, resolvedStaticRoot);
      }
    } catch (error) {
      if (typeof request.resume === "function") request.resume();
      if (!response.writableEnded) sendError(response, error, currentRequestId, { head: request.method === "HEAD" });
    }
  };
}

function createServer(options = {}) {
  const server = http.createServer(createRequestHandler(options));
  // Bound slow-client exposure even in the local adapter. A production edge
  // proxy should enforce the same or stricter limits before forwarding here.
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  return server;
}

async function startServer({ host = process.env.HOST || DEFAULT_HOST, port = process.env.PORT === undefined ? DEFAULT_PORT : Number(process.env.PORT), ...options } = {}) {
  if (typeof host !== "string" || !["127.0.0.1", "::1", "localhost"].includes(host.toLowerCase())) {
    throw new TypeError("The unauthenticated local adapter must bind to 127.0.0.1, ::1, or localhost.");
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new TypeError("port must be an integer from 0 to 65535.");
  const store = options.store || new JsonStore();
  await store.init();
  const server = createServer({ ...options, store });
  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.removeListener("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
  const recoveryScope = {
    tenantId: options.tenantId || DEFAULT_TENANT_ID,
    workspaceId: options.workspaceId || DEFAULT_WORKSPACE_ID
  };
  recoverSandboxRuns(store, recoveryScope).catch((error) => {
    console.error("MakeEase sandbox recovery error:", error && error.stack ? error.stack : error);
  });
  return { server, store, address: server.address() };
}

if (require.main === module) {
  startServer()
    .then(({ address }) => {
      const displayAddress = typeof address === "string" ? address : `http://${address.address}:${address.port}`;
      console.log(`MakeEase local MVP adapter listening at ${displayAddress}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  ADAPTER_NAME,
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_TENANT_ID,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_PLANS,
  DEFAULT_WORKSPACE,
  MAX_JSON_BODY_BYTES,
  IdempotencyCache,
  JsonStore,
  WORKSPACE_FILE,
  createRequestHandler,
  createServer,
  startServer
};
