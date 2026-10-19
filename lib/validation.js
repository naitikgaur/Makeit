"use strict";

const {
  MAX_ARRAY_ITEMS,
  MAX_IDEMPOTENCY_KEY_LENGTH,
  MAX_JSON_BODY_BYTES,
  MAX_JSON_DEPTH,
  MAX_OBJECT_KEYS,
  modelDefinitions,
  planById,
  templateById
} = require("./config");

const UNSAFE_KEY = /^(?:__proto__|prototype|constructor)$/;
const SECRET_KEY = /(password|secret|token|api[-_]?key|private[-_]?key|credential|authorization)/i;

function invalid(message, details) {
  return errorWithCode("INVALID_INPUT", message, 400, details);
}

// Keep validation usable by the dependency-free local adapter. The larger
// application can replace this error factory without changing validators.
function errorWithCode(code, message, statusCode = 400, details) {
  const error = new Error(message);
  error.name = "ValidationError";
  error.code = code;
  error.statusCode = statusCode;
  if (details !== undefined) error.details = details;
  return error;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPayloadBounds(value, {
  maxDepth = MAX_JSON_DEPTH,
  maxObjectKeys = MAX_OBJECT_KEYS,
  maxArrayItems = MAX_ARRAY_ITEMS,
  maxStringLength = MAX_JSON_BODY_BYTES,
  rejectSensitiveKeys = true
} = {}, depth = 0, seen = new Set()) {
  if (typeof value === "string") {
    if (value.length > maxStringLength) throw invalid("Request data contains a string that is too long.");
    return value;
  }
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw invalid("Request data contains an invalid number.");
    return value;
  }
  if (typeof value !== "object") throw invalid("Request data contains an unsupported value.");
  if (seen.has(value)) throw invalid("Request data cannot contain circular references.");
  if (depth >= maxDepth) throw invalid("Request data is nested too deeply.");
  seen.add(value);

  if (Array.isArray(value)) {
    if (value.length > maxArrayItems) throw invalid(`Request arrays must contain ${maxArrayItems} items or fewer.`);
    for (const child of value) assertPayloadBounds(child, { maxDepth, maxObjectKeys, maxArrayItems, maxStringLength, rejectSensitiveKeys }, depth + 1, seen);
  } else {
    if (!isPlainObject(value)) throw invalid("Request data contains an unsupported object.");
    const keys = Object.keys(value);
    if (keys.length > maxObjectKeys) throw invalid(`Request objects must contain ${maxObjectKeys} fields or fewer.`);
    for (const [key, child] of Object.entries(value)) {
      if (UNSAFE_KEY.test(key) || (rejectSensitiveKeys && SECRET_KEY.test(key))) throw invalid("Request data contains a forbidden field.");
      assertPayloadBounds(child, { maxDepth, maxObjectKeys, maxArrayItems, maxStringLength, rejectSensitiveKeys }, depth + 1, seen);
    }
  }
  seen.delete(value);
  return value;
}

function assertPlainObject(value, label = "Request body", options = {}) {
  if (!isPlainObject(value)) throw invalid(`${label} must be a JSON object.`);
  assertPayloadBounds(value, options);
  return value;
}

function assertSafeObject(value, seen = new Set()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (UNSAFE_KEY.test(key) || SECRET_KEY.test(key)) throw invalid("Request data contains a forbidden field.");
    assertSafeObject(child, seen);
  }
}

function assertKeys(value, allowed, required = [], label = "Request body", options = {}) {
  assertPlainObject(value, label, options);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw invalid(`Unknown ${label.toLowerCase()} field: ${key}.`);
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) throw invalid(`Missing required field: ${key}.`);
  }
  return value;
}

function text(value, field, { min = 0, max = 500, trim = true } = {}) {
  if (typeof value !== "string") throw invalid(`${field} must be a string.`);
  const result = trim ? value.trim() : value;
  if (result.length < min || result.length > max) throw invalid(`${field} must be between ${min} and ${max} characters.`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result)) throw invalid(`${field} contains unsupported control characters.`);
  return result;
}

function identifier(value, field, { min = 1, max = 128 } = {}) {
  const result = text(value, field, { min, max });
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result)) throw invalid(`${field} contains unsupported characters.`);
  return result;
}

function idempotencyKey(value, field = "idempotencyKey") {
  const key = text(value, field, { min: 4, max: MAX_IDEMPOTENCY_KEY_LENGTH });
  if (!/^[A-Za-z0-9._:-]+$/.test(key)) throw invalid(`${field} contains unsupported characters.`);
  return key;
}

function optionalText(value, field, options = {}) {
  if (value === undefined) return undefined;
  return text(value, field, options);
}

function booleanValue(value, field) {
  if (typeof value !== "boolean") throw invalid(`${field} must be a boolean.`);
  return value;
}

function integer(value, field, { min = 0, max = 100000 } = {}) {
  if (!Number.isInteger(value) || value < min || value > max) throw invalid(`${field} must be an integer from ${min} to ${max}.`);
  return value;
}

// Workflow graphs are data, not an execution language.  Keep the graph
// contract deliberately small and bounded so that a persisted workflow can be
// rendered and audited without ever interpreting arbitrary code or secrets.
const WORKFLOW_GRAPH_FIELDS = [
  "trigger", "nodes", "edges", "policy", "retry", "connector", "connectors", "connectorMetadata"
];
const GRAPH_MAX_NODES = Math.min(MAX_ARRAY_ITEMS, 250);
const GRAPH_MAX_EDGES = Math.min(MAX_ARRAY_ITEMS, 500);
const GRAPH_MAX_CONNECTORS = Math.min(MAX_ARRAY_ITEMS, 100);
const GRAPH_MAX_PORTS = 50;
const GRAPH_MAX_STRING = 500;
const GRAPH_MAX_CONFIG_STRING = 4000;
const GRAPH_NODE_UNSAFE_TYPES = new Set([
  "code", "command", "eval", "exec", "javascript", "python", "script", "shell"
]);

function graphType(value, field, { max = 64 } = {}) {
  const result = text(value, field, { min: 1, max });
  if (!/^[A-Za-z][A-Za-z0-9._:-]*$/.test(result)) throw invalid(`${field} contains unsupported characters.`);
  return result;
}

function boundedGraphValue(value, field, { maxStringLength = GRAPH_MAX_CONFIG_STRING } = {}) {
  assertPayloadBounds(value, {
    maxStringLength,
    maxDepth: MAX_JSON_DEPTH,
    maxObjectKeys: MAX_OBJECT_KEYS,
    maxArrayItems: MAX_ARRAY_ITEMS,
    rejectSensitiveKeys: true
  });
  return value;
}

function graphObject(value, field) {
  if (!isPlainObject(value)) throw invalid(`${field} must be an object.`);
  boundedGraphValue(value, field);
  return value;
}

function graphStringList(value, field, { maxItems = GRAPH_MAX_PORTS, maxLength = 128, type = false } = {}) {
  if (!Array.isArray(value) || value.length > maxItems) throw invalid(`${field} must contain ${maxItems} items or fewer.`);
  const result = value.map((item, index) => type
    ? graphType(item, `${field}[${index}]`, { max: maxLength })
    : identifier(item, `${field}[${index}]`, { max: maxLength }));
  if (new Set(result).size !== result.length) throw invalid(`${field} must contain unique values.`);
  return result;
}

function graphPosition(value, field) {
  const position = graphObject(value, field);
  const allowed = ["x", "y"];
  for (const key of Object.keys(position)) if (!allowed.includes(key)) throw invalid(`Unknown ${field.toLowerCase()} field: ${key}.`);
  const result = {};
  for (const key of allowed) {
    if (position[key] === undefined) continue;
    if (typeof position[key] !== "number" || !Number.isFinite(position[key]) || Math.abs(position[key]) > 1000000000) {
      throw invalid(`${field}.${key} must be a finite number within the graph bounds.`);
    }
    result[key] = position[key];
  }
  if (!Object.keys(result).length) throw invalid(`${field} must include x or y.`);
  return result;
}

function graphPorts(value, field) {
  if (!Array.isArray(value) || value.length > GRAPH_MAX_PORTS) throw invalid(`${field} must contain ${GRAPH_MAX_PORTS} items or fewer.`);
  return value.map((port, index) => {
    if (typeof port === "string") return graphType(port, `${field}[${index}]`, { max: 128 });
    const item = assertKeys(
      port,
      ["id", "name", "label", "type", "description", "required", "config", "metadata"],
      [],
      `${field}[${index}]`
    );
    if (item.id === undefined && item.name === undefined && item.label === undefined) {
      throw invalid(`${field}[${index}] must include id, name, or label.`);
    }
    const result = {};
    if (item.id !== undefined) result.id = identifier(item.id, `${field}[${index}].id`, { max: 128 });
    if (item.name !== undefined) result.name = text(item.name, `${field}[${index}].name`, { max: GRAPH_MAX_STRING });
    if (item.label !== undefined) result.label = text(item.label, `${field}[${index}].label`, { max: GRAPH_MAX_STRING });
    if (item.type !== undefined) result.type = graphType(item.type, `${field}[${index}].type`);
    if (item.description !== undefined) result.description = text(item.description, `${field}[${index}].description`, { max: 1000 });
    if (item.required !== undefined) result.required = booleanValue(item.required, `${field}[${index}].required`);
    if (item.config !== undefined) result.config = graphObject(item.config, `${field}[${index}].config`);
    if (item.metadata !== undefined) result.metadata = graphObject(item.metadata, `${field}[${index}].metadata`);
    return result;
  });
}

function connectorMetadata(value, field, { requireId = true } = {}) {
  if (typeof value === "string") return identifier(value, field, { max: 128 });
  const connector = assertKeys(value, [
    "id", "type", "kind", "name", "label", "description", "category", "provider", "operation", "action", "operations", "actions", "mode",
    "status", "connected", "available", "readOnly", "sideEffects", "externalSideEffects", "capabilities", "scopes",
    "config", "metadata", "version"
  ], [], field);
  if (connector.id === undefined && connector.type === undefined && connector.kind === undefined) throw invalid(`${field} must include id, type, or kind.`);
  const result = {};
  if (connector.id !== undefined) result.id = identifier(connector.id, `${field}.id`, { max: 128 });
  if (connector.type !== undefined) result.type = graphType(connector.type, `${field}.type`);
  if (connector.kind !== undefined) result.kind = graphType(connector.kind, `${field}.kind`);
  for (const key of ["name", "label", "description", "category", "provider", "operation", "action", "mode", "version"]) {
    if (connector[key] !== undefined) {
      result[key] = text(connector[key], `${field}.${key}`, { max: key === "description" ? 1000 : GRAPH_MAX_STRING });
      if (key === "mode" && result[key].toLowerCase() === "live") throw invalid(`${field}.mode must not claim live connectivity in the local adapter.`);
    }
  }
  for (const key of ["operations", "actions"]) if (connector[key] !== undefined) {
    if (!Array.isArray(connector[key]) || connector[key].length > GRAPH_MAX_PORTS) throw invalid(`${field}.${key} must contain ${GRAPH_MAX_PORTS} items or fewer.`);
    result[key] = connector[key].map((item, index) => graphType(item, `${field}.${key}[${index}]`, { max: 128 }));
    if (new Set(result[key]).size !== result[key].length) throw invalid(`${field}.${key} must contain unique values.`);
  }
  if (connector.capabilities !== undefined) result.capabilities = graphStringList(connector.capabilities, `${field}.capabilities`, { type: true });
  if (connector.scopes !== undefined) result.scopes = graphStringList(connector.scopes, `${field}.scopes`, { type: false });
  for (const key of ["connected", "available", "readOnly"]) {
    if (connector[key] !== undefined) {
      const requested = booleanValue(connector[key], `${field}.${key}`);
      // A workflow definition can name a connector, but the local adapter
      // cannot establish or verify its account state. Never persist a claim
      // that would make metadata look like a live connection.
      result[key] = key === "connected" || key === "available" ? false : requested;
    }
  }
  for (const key of ["sideEffects", "externalSideEffects"]) if (connector[key] !== undefined) {
    if (booleanValue(connector[key], `${field}.${key}`)) throw invalid(`${field}.${key} cannot be enabled in the local sandbox.`);
    result[key] = false;
  }
  if (connector.status !== undefined) {
    const status = text(connector.status, `${field}.status`, { min: 1, max: 40 });
    if (!["connected", "not_configured", "disconnected", "available", "disabled"].includes(status)) {
      throw invalid(`${field}.status is unsupported in the local adapter.`);
    }
    // Metadata never proves a live connection. Preserve an explicitly safe
    // status, but normalize claims that this local adapter cannot verify.
    result.status = status === "connected" ? "not_configured" : status;
  }
  if (connector.config !== undefined) result.config = graphObject(connector.config, `${field}.config`);
  if (connector.metadata !== undefined) result.metadata = graphObject(connector.metadata, `${field}.metadata`);
  return result;
}

function workflowTrigger(value, field = "trigger") {
  if (typeof value === "string") return { type: graphType(value, `${field}.type`) };
  const trigger = assertKeys(value, [
    "id", "type", "kind", "name", "label", "description", "config", "event", "eventType", "connectorId",
    "schedule", "filters", "metadata", "enabled"
  ], ["type"], field);
  const result = { type: graphType(trigger.type, `${field}.type`) };
  if (trigger.kind !== undefined) result.kind = graphType(trigger.kind, `${field}.kind`);
  if (trigger.id !== undefined) result.id = identifier(trigger.id, `${field}.id`, { max: 128 });
  for (const key of ["name", "label", "description", "event", "eventType"]) {
    if (trigger[key] !== undefined) result[key] = text(trigger[key], `${field}.${key}`, { max: key === "description" ? 1000 : GRAPH_MAX_STRING });
  }
  if (trigger.connectorId !== undefined) result.connectorId = identifier(trigger.connectorId, `${field}.connectorId`, { max: 128 });
  if (trigger.schedule !== undefined) {
    if (typeof trigger.schedule === "string") result.schedule = text(trigger.schedule, `${field}.schedule`, { max: GRAPH_MAX_STRING });
    else result.schedule = graphObject(trigger.schedule, `${field}.schedule`);
  }
  if (trigger.config !== undefined) result.config = graphObject(trigger.config, `${field}.config`);
  if (trigger.filters !== undefined) result.filters = boundedGraphValue(trigger.filters, `${field}.filters`);
  if (trigger.metadata !== undefined) result.metadata = graphObject(trigger.metadata, `${field}.metadata`);
  if (trigger.enabled !== undefined) result.enabled = booleanValue(trigger.enabled, `${field}.enabled`);
  return result;
}

function workflowPolicy(value, field = "policy") {
  const policy = assertKeys(value, [
    "requiresApproval", "approvalRequired", "approval", "approvalMode", "maxCredits", "maxSteps",
    "allowedConnectors", "blockedConnectors", "allowedNodeTypes", "blockedNodeTypes", "allowExternalSideEffects",
    "externalSideEffectsAllowed", "externalSideEffects", "sideEffects", "mode", "onFailure", "requireEvidence", "evidenceRequired",
    "description", "metadata", "limits", "budget", "budgets", "approvalGate", "evidence"
  ], [], field);
  const result = {};
  for (const key of ["requiresApproval", "approvalRequired", "allowExternalSideEffects", "externalSideEffectsAllowed", "externalSideEffects", "sideEffects", "requireEvidence", "evidenceRequired"]) {
    if (policy[key] !== undefined) {
      const bool = booleanValue(policy[key], `${field}.${key}`);
      if (["allowExternalSideEffects", "externalSideEffectsAllowed", "externalSideEffects", "sideEffects"].includes(key) && bool) {
        throw invalid(`${field}.${key} cannot be enabled in the local sandbox.`);
      }
      result[key] = ["allowExternalSideEffects", "externalSideEffectsAllowed", "externalSideEffects", "sideEffects"].includes(key) ? false : bool;
    }
  }
  if (policy.approvalMode !== undefined) {
    result.approvalMode = text(policy.approvalMode, `${field}.approvalMode`, { min: 1, max: 30 });
    if (!["required", "optional", "none", "manual"].includes(result.approvalMode)) throw invalid(`${field}.approvalMode is unsupported.`);
  }
  if (policy.approval !== undefined) {
    if (typeof policy.approval === "boolean") result.approval = policy.approval;
    else if (typeof policy.approval === "string") {
      result.approval = text(policy.approval, `${field}.approval`, { min: 1, max: 30 });
      if (!["required", "optional", "none", "manual"].includes(result.approval)) throw invalid(`${field}.approval is unsupported.`);
    }
    else {
      const approval = assertKeys(policy.approval, ["required", "mode", "roles", "timeoutSeconds"], [], `${field}.approval`);
      const normalized = {};
      if (approval.required !== undefined) normalized.required = booleanValue(approval.required, `${field}.approval.required`);
      if (approval.mode !== undefined) {
        normalized.mode = text(approval.mode, `${field}.approval.mode`, { min: 1, max: 30 });
        if (!["required", "optional", "none", "manual"].includes(normalized.mode)) throw invalid(`${field}.approval.mode is unsupported.`);
      }
      if (approval.roles !== undefined) normalized.roles = graphStringList(approval.roles, `${field}.approval.roles`, { type: false, maxItems: 20 });
      if (approval.timeoutSeconds !== undefined) normalized.timeoutSeconds = integer(approval.timeoutSeconds, `${field}.approval.timeoutSeconds`, { min: 0, max: 86400 });
      result.approval = normalized;
    }
  }
  for (const key of ["maxCredits", "maxSteps"]) {
    if (policy[key] !== undefined) result[key] = integer(policy[key], `${field}.${key}`, { min: 1, max: key === "maxSteps" ? GRAPH_MAX_NODES : 100000 });
  }
  for (const key of ["allowedConnectors", "blockedConnectors"]) {
    if (policy[key] !== undefined) result[key] = graphStringList(policy[key], `${field}.${key}`, { type: false, maxItems: GRAPH_MAX_CONNECTORS });
  }
  for (const key of ["allowedNodeTypes", "blockedNodeTypes"]) {
    if (policy[key] !== undefined) result[key] = graphStringList(policy[key], `${field}.${key}`, { type: true, maxItems: GRAPH_MAX_NODES, maxLength: 64 });
  }
  if (policy.mode !== undefined) {
    result.mode = text(policy.mode, `${field}.mode`, { min: 1, max: 30 });
    if (result.mode !== "sandbox") throw invalid(`${field}.mode must be sandbox in the local adapter.`);
  }
  if (policy.onFailure !== undefined) {
    result.onFailure = text(policy.onFailure, `${field}.onFailure`, { min: 1, max: 30 });
    if (!["fail", "stop", "continue", "review"].includes(result.onFailure)) throw invalid(`${field}.onFailure is unsupported.`);
  }
  if (policy.description !== undefined) result.description = text(policy.description, `${field}.description`, { max: 1000 });
  if (policy.metadata !== undefined) result.metadata = graphObject(policy.metadata, `${field}.metadata`);
  if (policy.limits !== undefined) {
    const limits = assertKeys(policy.limits, ["maxCredits", "maxSteps"], [], `${field}.limits`);
    const normalized = {};
    if (limits.maxCredits !== undefined) normalized.maxCredits = integer(limits.maxCredits, `${field}.limits.maxCredits`, { min: 1, max: 100000 });
    if (limits.maxSteps !== undefined) normalized.maxSteps = integer(limits.maxSteps, `${field}.limits.maxSteps`, { min: 1, max: GRAPH_MAX_NODES });
    result.limits = normalized;
  }
  for (const key of ["budget", "budgets"]) if (policy[key] !== undefined) {
    const budget = assertKeys(policy[key], ["maxCredits", "credits", "maxSteps"], [], `${field}.${key}`);
    const normalized = {};
    if (budget.maxCredits !== undefined) normalized.maxCredits = integer(budget.maxCredits, `${field}.${key}.maxCredits`, { min: 1, max: 100000 });
    if (budget.credits !== undefined) normalized.credits = integer(budget.credits, `${field}.${key}.credits`, { min: 1, max: 100000 });
    if (budget.maxSteps !== undefined) normalized.maxSteps = integer(budget.maxSteps, `${field}.${key}.maxSteps`, { min: 1, max: GRAPH_MAX_NODES });
    result[key] = normalized;
  }
  if (policy.approvalGate !== undefined) result.approvalGate = booleanValue(policy.approvalGate, `${field}.approvalGate`);
  if (policy.evidence !== undefined) result.evidence = boundedGraphValue(policy.evidence, `${field}.evidence`);
  return result;
}

function workflowRetry(value, field = "retry") {
  if (typeof value === "number") return { maxAttempts: integer(value, `${field}.maxAttempts`, { min: 0, max: 10 }) };
  const retry = assertKeys(value, [
    "enabled", "maxAttempts", "maxRetries", "backoffMs", "delayMs", "strategy", "retryOn", "retryableErrors", "retryable", "on", "jitter", "exponential"
  ], [], field);
  const result = {};
  if (retry.enabled !== undefined) result.enabled = booleanValue(retry.enabled, `${field}.enabled`);
  if (retry.maxAttempts !== undefined) result.maxAttempts = integer(retry.maxAttempts, `${field}.maxAttempts`, { min: 0, max: 10 });
  if (retry.maxRetries !== undefined) result.maxRetries = integer(retry.maxRetries, `${field}.maxRetries`, { min: 0, max: 10 });
  if (retry.backoffMs !== undefined) result.backoffMs = integer(retry.backoffMs, `${field}.backoffMs`, { min: 0, max: 60000 });
  if (retry.delayMs !== undefined) result.delayMs = integer(retry.delayMs, `${field}.delayMs`, { min: 0, max: 60000 });
  if (retry.strategy !== undefined) {
    result.strategy = text(retry.strategy, `${field}.strategy`, { min: 1, max: 30 });
    if (!["fixed", "linear", "exponential", "none"].includes(result.strategy)) throw invalid(`${field}.strategy is unsupported.`);
  }
  for (const key of ["retryOn", "retryableErrors", "on"]) {
    if (retry[key] !== undefined) result[key] = graphStringList(retry[key], `${field}.${key}`, { type: false, maxItems: 20, maxLength: 128 });
  }
  if (retry.retryable !== undefined) result.retryable = booleanValue(retry.retryable, `${field}.retryable`);
  if (retry.jitter !== undefined) result.jitter = booleanValue(retry.jitter, `${field}.jitter`);
  if (retry.exponential !== undefined) result.exponential = booleanValue(retry.exponential, `${field}.exponential`);
  return result;
}

function workflowNode(value, field) {
  const node = assertKeys(value, [
    "id", "type", "kind", "name", "label", "title", "description", "connector", "connectorId", "operation", "action", "mode",
    "config", "data", "metadata", "policy", "retry", "position", "inputs", "outputs", "enabled", "version"
  ], ["id", "type"], field);
  const type = graphType(node.type, `${field}.type`);
  if (GRAPH_NODE_UNSAFE_TYPES.has(type.toLowerCase())) throw invalid(`${field}.type is not allowed in the local sandbox.`);
  const result = { id: identifier(node.id, `${field}.id`, { max: 128 }), type };
  if (node.kind !== undefined) result.kind = graphType(node.kind, `${field}.kind`);
  for (const key of ["name", "label", "title", "description", "operation", "action", "mode"]) {
    if (node[key] !== undefined) {
      result[key] = text(node[key], `${field}.${key}`, { max: key === "description" ? 1000 : GRAPH_MAX_STRING });
      if (key === "mode" && result[key] !== "sandbox") throw invalid(`${field}.mode must be sandbox in the local adapter.`);
    }
  }
  if (node.connector !== undefined) result.connector = connectorMetadata(node.connector, `${field}.connector`, { requireId: false });
  if (node.connectorId !== undefined) result.connectorId = identifier(node.connectorId, `${field}.connectorId`, { max: 128 });
  if (node.config !== undefined) result.config = graphObject(node.config, `${field}.config`);
  if (node.data !== undefined) result.data = graphObject(node.data, `${field}.data`);
  if (node.metadata !== undefined) result.metadata = graphObject(node.metadata, `${field}.metadata`);
  if (node.policy !== undefined) result.policy = workflowPolicy(node.policy, `${field}.policy`);
  if (node.retry !== undefined) result.retry = workflowRetry(node.retry, `${field}.retry`);
  if (node.position !== undefined) result.position = graphPosition(node.position, `${field}.position`);
  if (node.inputs !== undefined) result.inputs = graphPorts(node.inputs, `${field}.inputs`);
  if (node.outputs !== undefined) result.outputs = graphPorts(node.outputs, `${field}.outputs`);
  if (node.enabled !== undefined) result.enabled = booleanValue(node.enabled, `${field}.enabled`);
  if (node.version !== undefined) result.version = integer(node.version, `${field}.version`, { min: 1, max: 100000 });
  return result;
}

function workflowNodes(value, field = "nodes") {
  if (!Array.isArray(value) || value.length > GRAPH_MAX_NODES) throw invalid(`${field} must contain ${GRAPH_MAX_NODES} items or fewer.`);
  const nodes = value.map((item, index) => workflowNode(item, `${field}[${index}]`));
  const ids = nodes.map((node) => node.id);
  if (new Set(ids).size !== ids.length) throw invalid(`${field} must contain unique ids.`);
  return nodes;
}

function workflowEdges(value, nodes, field = "edges", { allowUnresolved = false, implicitNodeIds = [] } = {}) {
  if (!Array.isArray(value) || value.length > GRAPH_MAX_EDGES) throw invalid(`${field} must contain ${GRAPH_MAX_EDGES} items or fewer.`);
  const nodeIds = nodes ? new Set([...nodes.map((node) => node.id), ...implicitNodeIds]) : null;
  const seen = new Set();
  const edges = value.map((edge, index) => {
    const item = assertKeys(edge, ["id", "source", "target", "from", "to", "sourceHandle", "targetHandle", "label", "type", "condition", "when", "metadata"], [], `${field}[${index}]`);
    const sourceValue = item.source === undefined ? item.from : item.source;
    const targetValue = item.target === undefined ? item.to : item.target;
    if (sourceValue === undefined || targetValue === undefined) throw invalid(`${field}[${index}] must include source and target.`);
    const source = identifier(sourceValue, `${field}[${index}].source`, { max: 128 });
    const target = identifier(targetValue, `${field}[${index}].target`, { max: 128 });
    if (!allowUnresolved && nodeIds && (!nodeIds.has(source) || !nodeIds.has(target))) throw invalid(`${field}[${index}] references an unknown node.`);
    if (source === target) throw invalid(`${field}[${index}] cannot connect a node to itself.`);
    const result = { source, target };
    if (item.id !== undefined) result.id = identifier(item.id, `${field}[${index}].id`, { max: 128 });
    for (const key of ["sourceHandle", "targetHandle", "label"]) {
      if (item[key] !== undefined) result[key] = text(item[key], `${field}[${index}].${key}`, { max: GRAPH_MAX_STRING });
    }
    if (item.type !== undefined) result.type = graphType(item.type, `${field}[${index}].type`);
    for (const key of ["condition", "when"]) if (item[key] !== undefined) {
      result[key] = typeof item[key] === "string" ? text(item[key], `${field}[${index}].${key}`, { max: GRAPH_MAX_STRING }) : boundedGraphValue(item[key], `${field}[${index}].${key}`);
    }
    if (item.metadata !== undefined) result.metadata = graphObject(item.metadata, `${field}[${index}].metadata`);
    const identity = `${source}\u0000${target}\u0000${result.sourceHandle || ""}\u0000${result.targetHandle || ""}\u0000${result.type || ""}\u0000${JSON.stringify(result.condition ?? result.when ?? "")}`;
    if (seen.has(identity)) throw invalid(`${field} must not contain duplicate edges.`);
    seen.add(identity);
    return result;
  });

  // A bounded DAG makes rendering deterministic and prevents a graph from
  // encoding an unbounded local execution loop. Retry behavior is represented
  // by the separate retry metadata, never by a cycle in the graph.
  if (nodes) {
    const topologyIds = [...new Set([...nodes.map((node) => node.id), ...implicitNodeIds])];
    const outgoing = new Map(topologyIds.map((id) => [id, []]));
    const indegree = new Map(topologyIds.map((id) => [id, 0]));
    for (const edge of edges) {
      outgoing.get(edge.source).push(edge.target);
      indegree.set(edge.target, indegree.get(edge.target) + 1);
    }
    const queue = topologyIds.filter((id) => indegree.get(id) === 0);
    let visited = 0;
    while (queue.length) {
      const id = queue.shift();
      visited += 1;
      for (const target of outgoing.get(id)) {
        indegree.set(target, indegree.get(target) - 1);
        if (indegree.get(target) === 0) queue.push(target);
      }
    }
    if (visited !== topologyIds.length) throw invalid(`${field} must describe an acyclic graph.`);
  }
  const edgeIds = edges.map((edge) => edge.id).filter((id) => id !== undefined);
  if (new Set(edgeIds).size !== edgeIds.length) throw invalid(`${field} must contain unique ids.`);
  return edges;
}

function workflowGraphFields(value, field = "Workflow payload", { partial = false } = {}) {
  const result = {};
  let nodes;
  let trigger;
  if (value.trigger !== undefined) {
    trigger = workflowTrigger(value.trigger, `${field}.trigger`);
    result.trigger = trigger;
  }
  if (value.nodes !== undefined) {
    nodes = workflowNodes(value.nodes, `${field}.nodes`);
    result.nodes = nodes;
  }
  if (value.edges !== undefined) {
    if (!nodes && !partial) throw invalid(`${field}.edges requires nodes.`);
    const implicitNodeIds = trigger ? [...new Set([trigger.id, "trigger"].filter(Boolean))] : [];
    result.edges = workflowEdges(value.edges, nodes, `${field}.edges`, { allowUnresolved: partial && !nodes, implicitNodeIds });
  }
  if (value.policy !== undefined) result.policy = workflowPolicy(value.policy, `${field}.policy`);
  if (value.retry !== undefined) result.retry = workflowRetry(value.retry, `${field}.retry`);
  if (value.connector !== undefined) result.connector = connectorMetadata(value.connector, `${field}.connector`, { requireId: false });
  if (value.connectors !== undefined) {
    if (!Array.isArray(value.connectors) || value.connectors.length > GRAPH_MAX_CONNECTORS) throw invalid(`${field}.connectors must contain ${GRAPH_MAX_CONNECTORS} items or fewer.`);
    result.connectors = value.connectors.map((item, index) => connectorMetadata(item, `${field}.connectors[${index}]`));
    const ids = result.connectors.map((item) => typeof item === "string" ? item : (item.id || item.type || item.kind));
    if (new Set(ids).size !== ids.length) throw invalid(`${field}.connectors must contain unique ids.`);
  }
  if (value.connectorMetadata !== undefined) {
    if (Array.isArray(value.connectorMetadata)) {
      if (value.connectorMetadata.length > GRAPH_MAX_CONNECTORS) throw invalid(`${field}.connectorMetadata must contain ${GRAPH_MAX_CONNECTORS} items or fewer.`);
      result.connectorMetadata = value.connectorMetadata.map((item, index) => connectorMetadata(item, `${field}.connectorMetadata[${index}]`));
      const ids = result.connectorMetadata.map((item) => typeof item === "string" ? item : (item.id || item.type || item.kind)).filter((id) => id !== undefined);
      if (new Set(ids).size !== ids.length) throw invalid(`${field}.connectorMetadata must contain unique ids.`);
    } else result.connectorMetadata = connectorMetadata(value.connectorMetadata, `${field}.connectorMetadata`, { requireId: false });
  }
  return result;
}

function workflowGraph(body, { partial = false } = {}) {
  const value = assertKeys(body, WORKFLOW_GRAPH_FIELDS, [], "Workflow graph");
  return workflowGraphFields(value, "Workflow graph", { partial });
}

function email(value) {
  const normalized = text(value, "email", { min: 3, max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw invalid("email must be a valid email address.");
  return normalized;
}

function password(value) {
  return text(value, "password", { min: 12, max: 256, trim: false });
}

function workspacePatch(body) {
  const value = assertKeys(body, ["name", "description", "goal", "timezone"], [], "Workspace payload");
  if (!Object.keys(value).length) throw invalid("At least one workspace field is required.");
  const result = {};
  if (value.name !== undefined) result.name = text(value.name, "name", { min: 1, max: 120 });
  if (value.description !== undefined) result.description = text(value.description, "description", { max: 2000 });
  if (value.goal !== undefined) result.goal = text(value.goal, "goal", { max: 2000 });
  if (value.timezone !== undefined) {
    result.timezone = text(value.timezone, "timezone", { min: 1, max: 80 });
    if (result.timezone !== "UTC") {
      try { new Intl.DateTimeFormat("en-US", { timeZone: result.timezone }).format(); } catch { throw invalid("timezone must be a valid IANA timezone."); }
    }
  }
  return result;
}

const WORKSPACE_DOCUMENT_FIELDS = [
  "id", "name", "description", "goal", "timezone", "plan", "planId", "owner", "usage",
  "integrations", "workflows", "approvals", "activity", "sources", "settings"
];

// These fields are maintained by the server's command handlers.  They are
// accepted when a complete snapshot is read from the local store, but are not
// accepted from the legacy public PUT/PATCH workspace payloads.  Keeping the
// distinction here prevents a client from forging a run, credit, or audit
// record while retaining compatibility with the original workspace document.
const SERVER_WORKSPACE_FIELDS = ["runs", "ledger", "auditEvents", "operations"];

function workspaceArray(value, field, validator) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw invalid(`${field} must be an array.`);
  if (value.length > MAX_ARRAY_ITEMS) throw invalid(`${field} must contain ${MAX_ARRAY_ITEMS} items or fewer.`);
  const items = value.map((item, index) => validator(item, `${field}[${index}]`));
  const ids = items.map((item) => item.id).filter((id) => id !== undefined);
  if (new Set(ids).size !== ids.length) throw invalid(`${field} must contain unique ids.`);
  return items;
}

function workspaceObject(value, field, allowed, required = []) {
  return assertKeys(value, allowed, required, field);
}

function workspaceRun(value, field) {
  const runValue = workspaceObject(value, field, [
    "id", "workflowId", "workflowName", "status", "input", "output", "error", "credits",
    "reservedCredits", "model", "mode", "steps", "createdAt", "startedAt", "completedAt",
    "idempotencyKey", "requestHash", "retryOf", "packetId", "planDigest", "workflowRevision", "editedAt"
  ], ["id", "workflowId", "workflowName", "status", "credits", "createdAt"]);
  const normalized = {
    id: identifier(runValue.id, `${field}.id`, { max: 128 }),
    workflowId: identifier(runValue.workflowId, `${field}.workflowId`, { max: 128 }),
    workflowName: text(runValue.workflowName, `${field}.workflowName`, { min: 1, max: 120 }),
    status: text(runValue.status, `${field}.status`, { min: 1, max: 40 }),
    credits: integer(runValue.credits, `${field}.credits`, { min: 0, max: 1000000000 }),
    createdAt: text(runValue.createdAt, `${field}.createdAt`, { min: 1, max: 80 })
  };
  if (!["queued", "running", "awaiting_approval", "completed", "rejected", "failed"].includes(normalized.status)) {
    throw invalid(`${field}.status is unsupported.`);
  }
  if (runValue.input !== undefined) normalized.input = text(runValue.input, `${field}.input`, { max: 12000, trim: false });
  if (runValue.output !== undefined && runValue.output !== null) {
    if (typeof runValue.output === "string") normalized.output = text(runValue.output, `${field}.output`, { max: 20000, trim: false });
    else {
      assertPayloadBounds(runValue.output, { maxStringLength: 20000, maxDepth: MAX_JSON_DEPTH, maxObjectKeys: MAX_OBJECT_KEYS, maxArrayItems: MAX_ARRAY_ITEMS, rejectSensitiveKeys: true });
      normalized.output = runValue.output;
    }
  } else if (runValue.output === null) normalized.output = null;
  if (runValue.error !== undefined && runValue.error !== null) normalized.error = text(runValue.error, `${field}.error`, { max: 1000 });
  else if (runValue.error === null) normalized.error = null;
  if (runValue.reservedCredits !== undefined) normalized.reservedCredits = integer(runValue.reservedCredits, `${field}.reservedCredits`, { min: 0, max: 1000000000 });
  else normalized.reservedCredits = 0;
  if (runValue.model !== undefined) normalized.model = text(runValue.model, `${field}.model`, { min: 1, max: 200 });
  if (runValue.mode !== undefined) {
    normalized.mode = text(runValue.mode, `${field}.mode`, { min: 1, max: 30 });
    if (!["sandbox", "live"].includes(normalized.mode)) throw invalid(`${field}.mode must be sandbox or live.`);
  } else normalized.mode = "sandbox";
  if (runValue.steps !== undefined) {
    if (!Array.isArray(runValue.steps) || runValue.steps.length > MAX_ARRAY_ITEMS) throw invalid(`${field}.steps must be an array with at most ${MAX_ARRAY_ITEMS} items.`);
    normalized.steps = runValue.steps.map((step, index) => {
      const item = workspaceObject(step, `${field}.steps[${index}]`, ["name", "status", "detail"], ["name", "status"]);
      const result = {
        name: text(item.name, `${field}.steps[${index}].name`, { min: 1, max: 200 }),
        status: text(item.status, `${field}.steps[${index}].status`, { min: 1, max: 30 })
      };
      if (!["queued", "running", "completed", "failed", "skipped"].includes(result.status)) throw invalid(`${field}.steps[${index}].status is unsupported.`);
      if (item.detail !== undefined) result.detail = text(item.detail, `${field}.steps[${index}].detail`, { max: 1000 });
      return result;
    });
  } else normalized.steps = [];
  for (const key of ["startedAt", "completedAt"]) if (runValue[key] !== undefined && runValue[key] !== null) normalized[key] = text(runValue[key], `${field}.${key}`, { min: 1, max: 80 });
  if (runValue.idempotencyKey !== undefined) normalized.idempotencyKey = idempotencyKey(runValue.idempotencyKey, `${field}.idempotencyKey`);
  if (runValue.requestHash !== undefined) normalized.requestHash = text(runValue.requestHash, `${field}.requestHash`, { min: 1, max: 128 });
  if (runValue.retryOf !== undefined) normalized.retryOf = identifier(runValue.retryOf, `${field}.retryOf`, { max: 128 });
  if (runValue.packetId !== undefined) normalized.packetId = identifier(runValue.packetId, `${field}.packetId`, { max: 128 });
  if (runValue.planDigest !== undefined) normalized.planDigest = text(runValue.planDigest, `${field}.planDigest`, { min: 1, max: 128 });
  if (runValue.workflowRevision !== undefined) normalized.workflowRevision = text(runValue.workflowRevision, `${field}.workflowRevision`, { min: 1, max: 128 });
  if (runValue.editedAt !== undefined) normalized.editedAt = text(runValue.editedAt, `${field}.editedAt`, { min: 1, max: 80 });
  return normalized;
}

function workspaceLedgerEntry(value, field) {
  const entry = workspaceObject(value, field, [
    "id", "type", "amount", "availableDelta", "reservedDelta", "usedDelta", "description", "runId",
    "workflowId", "approvalId", "idempotencyKey", "createdAt", "mode", "bucket"
  ], ["id", "type", "amount", "description", "createdAt"]);
  const normalized = {
    id: identifier(entry.id, `${field}.id`, { max: 128 }),
    type: text(entry.type, `${field}.type`, { min: 1, max: 40 }),
    amount: integer(entry.amount, `${field}.amount`, { min: -1000000000, max: 1000000000 }),
    description: text(entry.description, `${field}.description`, { max: 500 }),
    createdAt: text(entry.createdAt, `${field}.createdAt`, { min: 1, max: 80 })
  };
  for (const key of ["availableDelta", "reservedDelta", "usedDelta"]) {
    if (entry[key] !== undefined) normalized[key] = integer(entry[key], `${field}.${key}`, { min: -1000000000, max: 1000000000 });
  }
  for (const key of ["runId", "workflowId", "approvalId"]) if (entry[key] !== undefined) normalized[key] = identifier(entry[key], `${field}.${key}`, { max: 128 });
  if (entry.idempotencyKey !== undefined) normalized.idempotencyKey = idempotencyKey(entry.idempotencyKey, `${field}.idempotencyKey`);
  if (entry.mode !== undefined) normalized.mode = text(entry.mode, `${field}.mode`, { min: 1, max: 30 });
  if (entry.bucket !== undefined) normalized.bucket = text(entry.bucket, `${field}.bucket`, { min: 1, max: 30 });
  return normalized;
}

function workspaceAuditEvent(value, field) {
  const event = workspaceObject(value, field, [
    "id", "eventType", "action", "actorType", "entityType", "entityId", "workflowId", "runId", "approvalId",
    "requestId", "idempotencyKey", "detail", "metadata", "createdAt"
  ], ["id", "eventType", "actorType", "createdAt"]);
  const normalized = {
    id: identifier(event.id, `${field}.id`, { max: 128 }),
    eventType: text(event.eventType, `${field}.eventType`, { min: 1, max: 100 }),
    actorType: text(event.actorType, `${field}.actorType`, { min: 1, max: 30 }),
    createdAt: text(event.createdAt, `${field}.createdAt`, { min: 1, max: 80 })
  };
  for (const key of ["action", "entityType", "entityId", "workflowId", "runId", "approvalId", "requestId"]) {
    if (event[key] !== undefined) normalized[key] = text(event[key], `${field}.${key}`, { min: 1, max: 200 });
  }
  if (event.idempotencyKey !== undefined) normalized.idempotencyKey = idempotencyKey(event.idempotencyKey, `${field}.idempotencyKey`);
  if (event.detail !== undefined) normalized.detail = text(event.detail, `${field}.detail`, { max: 1000 });
  if (event.metadata !== undefined) {
    assertPayloadBounds(event.metadata, { maxStringLength: 4000, maxDepth: MAX_JSON_DEPTH, maxObjectKeys: MAX_OBJECT_KEYS, maxArrayItems: MAX_ARRAY_ITEMS, rejectSensitiveKeys: true });
    normalized.metadata = event.metadata;
  }
  return normalized;
}

function workspaceOperation(value, field) {
  const operation = workspaceObject(value, field, ["id", "operation", "key", "fingerprint", "resourceType", "resourceId", "createdAt"], ["id", "operation", "key", "fingerprint", "resourceType", "resourceId", "createdAt"]);
  return {
    id: identifier(operation.id, `${field}.id`, { max: 128 }),
    operation: text(operation.operation, `${field}.operation`, { min: 1, max: 100 }),
    key: idempotencyKey(operation.key, `${field}.key`),
    fingerprint: text(operation.fingerprint, `${field}.fingerprint`, { min: 1, max: 128 }),
    resourceType: text(operation.resourceType, `${field}.resourceType`, { min: 1, max: 40 }),
    resourceId: identifier(operation.resourceId, `${field}.resourceId`, { max: 128 }),
    createdAt: text(operation.createdAt, `${field}.createdAt`, { min: 1, max: 80 })
  };
}

function workspaceDocument(body, { workspaceId, complete = false } = {}) {
  const root = assertPlainObject(body, "Workspace payload");
  let candidate = root;
  if (Object.prototype.hasOwnProperty.call(root, "workspace")) {
    const wrapper = assertKeys(root, ["workspace"], ["workspace"], "Workspace request");
    candidate = assertPlainObject(wrapper.workspace, "Workspace payload");
  }
  const value = assertKeys(candidate, complete ? [...WORKSPACE_DOCUMENT_FIELDS, ...SERVER_WORKSPACE_FIELDS] : WORKSPACE_DOCUMENT_FIELDS, ["name"], "Workspace payload");
  const result = {
    name: text(value.name, "name", { min: 1, max: 120 })
  };

  if (value.id !== undefined) {
    result.id = identifier(value.id, "id", { max: 128 });
    if (workspaceId && result.id !== workspaceId) {
      throw errorWithCode("WORKSPACE_MISMATCH", "The workspace does not match the requested workspace.", 403);
    }
  } else if (workspaceId) {
    result.id = workspaceId;
  }
  if (value.description !== undefined) result.description = text(value.description, "description", { max: 2000 });
  if (value.goal !== undefined) result.goal = text(value.goal, "goal", { max: 2000 });
  if (value.timezone !== undefined) {
    result.timezone = text(value.timezone, "timezone", { min: 1, max: 80 });
    if (result.timezone !== "UTC") {
      try { new Intl.DateTimeFormat("en-US", { timeZone: result.timezone }).format(); } catch { throw invalid("timezone must be a valid IANA timezone."); }
    }
  }
  if (value.plan !== undefined && value.planId !== undefined && value.plan !== value.planId) {
    throw invalid("plan and planId must refer to the same plan.");
  }
  const requestedPlan = value.planId !== undefined ? value.planId : value.plan;
  if (requestedPlan !== undefined) {
    const planId = text(requestedPlan, "planId", { min: 1, max: 30 });
    if (!planById(planId)) throw invalid("planId must refer to a supported plan.");
    // `plan` is retained as a compatibility alias for the original browser
    // adapter, while `planId` is the canonical API field.
    result.planId = planId;
    result.plan = planId;
  }
  if (value.owner !== undefined) {
    const owner = workspaceObject(value.owner, "owner", ["name", "role"], ["name", "role"]);
    result.owner = {
      name: text(owner.name, "owner.name", { min: 1, max: 120 }),
      role: text(owner.role, "owner.role", { min: 1, max: 40 })
    };
  }
  if (value.usage !== undefined) {
    const usage = workspaceObject(value.usage, "usage", [
      "included", "topup", "used", "reserved", "available", "limit", "cycleStart", "cycleEnd"
    ], ["used"]);
    const included = usage.included === undefined ? usage.limit : usage.included;
    const limit = usage.limit === undefined ? included : usage.limit;
    if (included === undefined || limit === undefined) throw invalid("usage must include a credit limit.");
    result.usage = {
      included: integer(included, "usage.included", { min: 0, max: 1000000000 }),
      topup: integer(usage.topup === undefined ? 0 : usage.topup, "usage.topup", { min: 0, max: 1000000000 }),
      used: integer(usage.used, "usage.used", { min: 0, max: 1000000000 }),
      reserved: integer(usage.reserved === undefined ? 0 : usage.reserved, "usage.reserved", { min: 0, max: 1000000000 }),
      limit: integer(limit, "usage.limit", { min: 0, max: 1000000000 })
    };
    if (result.usage.included !== result.usage.limit) throw invalid("usage.included and usage.limit must match in the local adapter.");
    if (result.usage.used + result.usage.reserved > result.usage.included + result.usage.topup) {
      throw invalid("usage.used plus usage.reserved cannot exceed the available credit balance.");
    }
    const computedAvailable = result.usage.included + result.usage.topup - result.usage.used - result.usage.reserved;
    if (usage.available !== undefined && usage.available !== computedAvailable) {
      throw invalid("usage.available must match the other credit fields.");
    }
    result.usage.available = computedAvailable;
    if (usage.cycleStart !== undefined) result.usage.cycleStart = text(usage.cycleStart, "usage.cycleStart", { max: 80 });
    if (usage.cycleEnd !== undefined) result.usage.cycleEnd = text(usage.cycleEnd, "usage.cycleEnd", { max: 80 });
  }
  if (value.integrations !== undefined) {
    result.integrations = workspaceArray(value.integrations, "integrations", (item, label) => {
      const integration = workspaceObject(item, label, [
        "id", "name", "description", "category", "connected", "detail", "status", "available"
      ], ["id", "name"]);
      if (integration.connected !== undefined) booleanValue(integration.connected, `${label}.connected`);
      if (integration.available !== undefined) booleanValue(integration.available, `${label}.available`);
      if (integration.status !== undefined) {
        const status = text(integration.status, `${label}.status`, { min: 1, max: 40 });
        if (!["connected", "not_configured", "disconnected"].includes(status)) throw invalid(`${label}.status is unsupported in the local adapter.`);
      }
      if (integration.detail !== undefined) text(integration.detail, `${label}.detail`, { max: 500 });
      return {
        id: identifier(integration.id, `${label}.id`, { max: 64 }),
        name: text(integration.name, `${label}.name`, { min: 1, max: 120 }),
        description: integration.description === undefined ? "" : text(integration.description, `${label}.description`, { max: 500 }),
        category: integration.category === undefined ? "Workspace tool" : text(integration.category, `${label}.category`, { max: 80 }),
        // The local adapter cannot establish or verify external connections.
        // Normalize legacy/demo claims instead of returning them as facts.
        connected: false,
        status: "not_configured",
        available: false,
        detail: "Not configured; external services are disabled in the local adapter."
      };
    });
  }
  if (value.workflows !== undefined) {
    result.workflows = workspaceArray(value.workflows, "workflows", (item, label) => {
      const workflow = workspaceObject(item, label, [
        "id", "name", "description", "templateId", "model", "status", "runs", "credits", "requiresApproval", "budgetCredits",
        "createdAt", "updatedAt", ...WORKFLOW_GRAPH_FIELDS
      ], ["id", "name", "status", "runs", "credits", "requiresApproval"]);
      const normalized = {
        id: identifier(workflow.id, `${label}.id`, { max: 128 }),
        name: text(workflow.name, `${label}.name`, { min: 1, max: 120 }),
        status: text(workflow.status, `${label}.status`, { min: 1, max: 30 }),
        runs: integer(workflow.runs, `${label}.runs`, { min: 0, max: 1000000000 }),
        credits: integer(workflow.credits, `${label}.credits`, { min: 0, max: 1000000000 }),
        requiresApproval: booleanValue(workflow.requiresApproval, `${label}.requiresApproval`)
      };
      if (!["draft", "active", "paused"].includes(normalized.status)) throw invalid(`${label}.status must be draft, active, or paused.`);
      if (workflow.description !== undefined) normalized.description = text(workflow.description, `${label}.description`, { max: 2000 });
      if (workflow.templateId !== undefined) {
        normalized.templateId = identifier(workflow.templateId, `${label}.templateId`, { max: 100 });
        if (!templateById(normalized.templateId)) throw invalid(`${label}.templateId must refer to a supported template.`);
      }
      if (workflow.model !== undefined) normalized.model = text(workflow.model, `${label}.model`, { min: 1, max: 200 });
      if (workflow.budgetCredits !== undefined) normalized.budgetCredits = integer(workflow.budgetCredits, `${label}.budgetCredits`, { min: 1, max: 100000 });
      if (workflow.createdAt !== undefined) normalized.createdAt = text(workflow.createdAt, `${label}.createdAt`, { min: 1, max: 80 });
      if (workflow.updatedAt !== undefined) normalized.updatedAt = text(workflow.updatedAt, `${label}.updatedAt`, { min: 1, max: 80 });
      Object.assign(normalized, workflowGraphFields(workflow, label));
      return normalized;
    });
  }
  if (value.approvals !== undefined) {
    result.approvals = workspaceArray(value.approvals, "approvals", (item, label) => {
      const approval = workspaceObject(item, label, ["id", "workflowId", "title", "detail", "credits", "runId", "status", "createdAt", "decidedAt", "output", "decisionReason", "reviewerRole", "packetId", "actionDigest", "edited"], ["id", "title", "detail", "credits"]);
      const normalized = {
        id: identifier(approval.id, `${label}.id`, { max: 128 }),
        title: text(approval.title, `${label}.title`, { min: 1, max: 200 }),
        detail: text(approval.detail, `${label}.detail`, { max: 1000 }),
        credits: integer(approval.credits, `${label}.credits`, { min: 0, max: 1000000000 })
      };
      if (approval.workflowId !== undefined) normalized.workflowId = identifier(approval.workflowId, `${label}.workflowId`, { max: 128 });
      if (approval.runId !== undefined) normalized.runId = identifier(approval.runId, `${label}.runId`, { max: 128 });
      normalized.status = approval.status === undefined ? "pending" : text(approval.status, `${label}.status`, { min: 1, max: 30 });
      if (!["pending", "approved", "rejected"].includes(normalized.status)) throw invalid(`${label}.status must be pending, approved, or rejected.`);
      if (approval.createdAt !== undefined) normalized.createdAt = text(approval.createdAt, `${label}.createdAt`, { min: 1, max: 80 });
      if (approval.decidedAt !== undefined) normalized.decidedAt = text(approval.decidedAt, `${label}.decidedAt`, { min: 1, max: 80 });
      if (approval.output !== undefined) {
        assertPayloadBounds(approval.output, { maxStringLength: 20000, maxDepth: MAX_JSON_DEPTH, maxObjectKeys: MAX_OBJECT_KEYS, maxArrayItems: MAX_ARRAY_ITEMS, rejectSensitiveKeys: true });
        normalized.output = approval.output;
      }
      for (const key of ["decisionReason", "reviewerRole", "packetId", "actionDigest"]) {
        if (approval[key] !== undefined) normalized[key] = text(approval[key], `${label}.${key}`, { min: 1, max: 500 });
      }
      if (approval.edited !== undefined) normalized.edited = booleanValue(approval.edited, `${label}.edited`);
      return normalized;
    });
  }
  if (value.activity !== undefined) {
    result.activity = workspaceArray(value.activity, "activity", (item, label) => {
      const activity = workspaceObject(item, label, ["id", "action", "detail", "createdAt", "title", "time"], []);
      const action = activity.action === undefined ? activity.title : activity.action;
      if (action === undefined) throw invalid(`${label} must include an action.`);
      const normalized = {
        ...(activity.id === undefined ? {} : { id: identifier(activity.id, `${label}.id`, { max: 128 }) }),
        action: text(action, `${label}.action`, { min: 1, max: 200 }),
        detail: activity.detail === undefined ? "" : text(activity.detail, `${label}.detail`, { max: 1000 })
      };
      if (activity.createdAt !== undefined) {
        normalized.createdAt = text(activity.createdAt, `${label}.createdAt`, { min: 1, max: 80 });
        if (!Number.isFinite(Date.parse(normalized.createdAt))) throw invalid(`${label}.createdAt must be a valid timestamp.`);
      }
      // Legacy relative labels have no trustworthy absolute timestamp. Keep
      // them as display labels rather than inventing a date for the client.
      if (activity.time !== undefined) normalized.time = text(activity.time, `${label}.time`, { min: 1, max: 80 });
      return normalized;
    });
  }
  if (value.sources !== undefined) {
    result.sources = workspaceArray(value.sources, "sources", (item, label) => {
      const source = workspaceObject(item, label, ["id", "name", "detail", "status", "createdAt"], ["id", "name", "detail", "status"]);
      const normalized = {
        id: identifier(source.id, `${label}.id`, { max: 128 }),
        name: text(source.name, `${label}.name`, { min: 1, max: 200 }),
        detail: text(source.detail, `${label}.detail`, { max: 20000 }),
        status: text(source.status, `${label}.status`, { min: 1, max: 40 })
      };
      if (source.createdAt !== undefined) normalized.createdAt = text(source.createdAt, `${label}.createdAt`, { min: 1, max: 80 });
      return normalized;
    });
  }
  if (value.settings !== undefined) {
    const settings = workspaceObject(value.settings, "settings", ["approvalMode", "smartRouting", "weeklyBrief", "darkMode"]);
    result.settings = {};
    for (const key of ["approvalMode", "smartRouting", "weeklyBrief", "darkMode"]) {
      if (settings[key] !== undefined) result.settings[key] = booleanValue(settings[key], `settings.${key}`);
    }
  }
  if (complete) {
    result.description ??= "";
    result.goal ??= "";
    result.timezone ??= "UTC";
    result.planId ??= "starter";
    result.plan ??= result.planId;
    result.owner ??= { name: "Local demo", role: "Owner" };
    if (!result.usage) {
      const included = planById(result.planId).creditLimit || 0;
      result.usage = { included, topup: 0, used: 0, reserved: 0, limit: included, available: included };
    }
    for (const field of ["integrations", "workflows", "approvals", "activity", "sources"]) result[field] ??= [];
    result.settings = { approvalMode: true, smartRouting: true, weeklyBrief: true, darkMode: false, ...result.settings };

    if (value.runs !== undefined) {
      if (!Array.isArray(value.runs) || value.runs.length > MAX_ARRAY_ITEMS) throw invalid(`runs must contain ${MAX_ARRAY_ITEMS} items or fewer.`);
      result.runs = value.runs.map((item, index) => workspaceRun(item, `runs[${index}]`));
      const ids = result.runs.map((item) => item.id);
      if (new Set(ids).size !== ids.length) throw invalid("runs must contain unique ids.");
    } else result.runs = [];
    if (value.ledger !== undefined) {
      if (!Array.isArray(value.ledger) || value.ledger.length > MAX_ARRAY_ITEMS) throw invalid(`ledger must contain ${MAX_ARRAY_ITEMS} items or fewer.`);
      result.ledger = value.ledger.map((item, index) => workspaceLedgerEntry(item, `ledger[${index}]`));
      const ids = result.ledger.map((item) => item.id);
      if (new Set(ids).size !== ids.length) throw invalid("ledger must contain unique ids.");
    } else result.ledger = [];
    if (value.auditEvents !== undefined) {
      if (!Array.isArray(value.auditEvents) || value.auditEvents.length > MAX_ARRAY_ITEMS) throw invalid(`auditEvents must contain ${MAX_ARRAY_ITEMS} items or fewer.`);
      result.auditEvents = value.auditEvents.map((item, index) => workspaceAuditEvent(item, `auditEvents[${index}]`));
      const ids = result.auditEvents.map((item) => item.id);
      if (new Set(ids).size !== ids.length) throw invalid("auditEvents must contain unique ids.");
    } else result.auditEvents = [];
    if (value.operations !== undefined) {
      if (!Array.isArray(value.operations) || value.operations.length > MAX_ARRAY_ITEMS) throw invalid(`operations must contain ${MAX_ARRAY_ITEMS} items or fewer.`);
      result.operations = value.operations.map((item, index) => workspaceOperation(item, `operations[${index}]`));
      const ids = result.operations.map((item) => item.id);
      if (new Set(ids).size !== ids.length) throw invalid("operations must contain unique ids.");
    } else result.operations = [];
  }
  return result;
}

function register(body) {
  const value = assertKeys(
    body,
    ["name", "email", "password", "workspaceName"],
    ["name", "email", "password", "workspaceName"],
    "Request body",
    { rejectSensitiveKeys: false }
  );
  return {
    name: text(value.name, "name", { min: 1, max: 120 }),
    email: email(value.email),
    password: password(value.password),
    workspaceName: text(value.workspaceName, "workspaceName", { min: 1, max: 120 })
  };
}

function login(body) {
  const value = assertKeys(
    body,
    ["email", "password"],
    ["email", "password"],
    "Request body",
    { rejectSensitiveKeys: false }
  );
  return { email: email(value.email), password: password(value.password) };
}

function workflow(body, { patch = false } = {}) {
  const allowed = ["name", "description", "templateId", "model", "budgetCredits", "requiresApproval", ...WORKFLOW_GRAPH_FIELDS];
  if (patch) allowed.push("status");
  const required = patch ? [] : ["name", "description", "templateId", "model", "budgetCredits", "requiresApproval"];
  const value = assertKeys(body, allowed, required, "Workflow payload");
  if (patch && !Object.keys(value).length) throw invalid("At least one workflow field is required.");
  const result = {};
  if (value.name !== undefined) result.name = text(value.name, "name", { min: 1, max: 120 });
  if (value.description !== undefined) result.description = text(value.description, "description", { max: 2000 });
  if (value.templateId !== undefined) {
    result.templateId = text(value.templateId, "templateId", { min: 1, max: 100 });
    if (!templateById(result.templateId)) throw invalid("templateId must refer to a supported template.");
  }
  if (value.model !== undefined) result.model = text(value.model, "model", { min: 1, max: 200 });
  if (value.budgetCredits !== undefined) result.budgetCredits = integer(value.budgetCredits, "budgetCredits", { min: 1, max: 100000 });
  if (value.requiresApproval !== undefined) result.requiresApproval = booleanValue(value.requiresApproval, "requiresApproval");
  if (value.status !== undefined) {
    result.status = text(value.status, "status", { min: 1, max: 30 });
    if (!["draft", "active", "paused"].includes(result.status)) throw invalid("status must be draft, active, or paused.");
  }
  Object.assign(result, workflowGraphFields(value, "Workflow payload", { partial: patch }));
  return result;
}

function run(body) {
  const value = assertKeys(body, ["input", "idempotencyKey"], ["input", "idempotencyKey"], "Run payload");
  let input;
  if (typeof value.input === "string") input = text(value.input, "input", { min: 1, max: 12000, trim: false });
  else if (isPlainObject(value.input) || Array.isArray(value.input)) {
    assertSafeObject(value.input);
    input = JSON.stringify(value.input);
    if (input.length > 12000) throw invalid("input must be 12000 characters or fewer.");
  } else throw invalid("input must be a string or JSON value.");
  return { input, idempotencyKey: idempotencyKey(value.idempotencyKey) };
}

function runRetry(body) {
  const value = assertKeys(body, ["idempotencyKey"], [], "Run retry payload");
  return value.idempotencyKey === undefined ? {} : { idempotencyKey: idempotencyKey(value.idempotencyKey) };
}

function knowledge(body) {
  const value = assertKeys(body, ["title", "content"], ["title", "content"], "Knowledge payload");
  return { title: text(value.title, "title", { min: 1, max: 200 }), content: text(value.content, "content", { min: 1, max: 20000, trim: false }) };
}

function approvalDecision(body) {
  const value = assertKeys(body, ["decision", "reason", "editedOutput"], ["decision"], "Approval payload");
  const decision = text(value.decision, "decision", { min: 1, max: 10 });
  if (!["approve", "reject"].includes(decision)) throw invalid("decision must be approve or reject.");
  const result = { decision };
  if (value.reason !== undefined) result.reason = text(value.reason, "reason", { min: 1, max: 1000 });
  if (value.editedOutput !== undefined) {
    assertPayloadBounds(value.editedOutput, {
      maxStringLength: 20000,
      maxDepth: MAX_JSON_DEPTH,
      maxObjectKeys: MAX_OBJECT_KEYS,
      maxArrayItems: MAX_ARRAY_ITEMS,
      rejectSensitiveKeys: true
    });
    result.editedOutput = value.editedOutput;
  }
  return result;
}

function sandboxTopup(body) {
  return idempotencyBody(body, "Sandbox top-up");
}

function idempotencyBody(body, operation) {
  const value = assertKeys(body, ["idempotencyKey"], ["idempotencyKey"], `${operation} payload`);
  return idempotencyKey(value.idempotencyKey);
}

function sandboxPlan(body) {
  const value = assertKeys(body, ["planId", "idempotencyKey"], ["planId", "idempotencyKey"], "Sandbox plan payload");
  const planId = text(value.planId, "planId", { min: 1, max: 30 });
  if (!planById(planId) || planId === "enterprise") throw invalid("planId must be starter, growth, or business.");
  return { planId, idempotencyKey: idempotencyKey(value.idempotencyKey) };
}

function checkout(body) {
  const value = assertKeys(body, ["planId", "productId"], [], "Checkout payload");
  if (value.planId === undefined && value.productId === undefined) throw invalid("planId or productId is required.");
  if (value.planId !== undefined && value.productId !== undefined) throw invalid("Provide either planId or productId, not both.");
  if (value.planId !== undefined) {
    const planId = text(value.planId, "planId", { min: 1, max: 30 });
    if (!planById(planId) || planId === "enterprise") throw invalid("That plan is not available for checkout.");
    return { planId };
  }
  const productId = text(value.productId, "productId", { min: 1, max: 30 });
  if (productId !== "topup") throw invalid("productId must be topup.");
  return { productId };
}

function modelFor(modelId, env = process.env) {
  const models = modelDefinitions(env);
  const requested = models.find((model) => model.id === modelId || model.family === modelId);
  if (!requested) throw invalid("model must refer to a supported model tier.");
  return requested;
}

module.exports = {
  isPlainObject,
  assertPayloadBounds,
  assertPlainObject,
  assertKeys,
  text,
  identifier,
  idempotencyKey,
  invalid,
  register,
  login,
  workspacePatch,
  workspaceDocument,
  workflow,
  workflowGraph,
  run,
  runRetry,
  knowledge,
  approvalDecision,
  sandboxTopup,
  idempotencyBody,
  sandboxPlan,
  checkout,
  modelFor
};
