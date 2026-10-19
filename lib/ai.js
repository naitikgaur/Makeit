"use strict";

/*
 * Provider-neutral AI boundary for the local MakeEase demo.
 *
 * This module intentionally contains no network client, environment lookup,
 * provider SDK, credential handling, or tool executor.  It is a deterministic
 * mock adapter that gives the rest of the product a stable contract while a
 * real provider boundary is still being designed.
 */

const crypto = require("node:crypto");

const CONTRACT_VERSION = "1.1";
const EVALUATION_VERSION = "1.0";
const ACTION_POLICY_VERSION = "1.0";
const ACTION_PLAN_VERSION = "1.0";
const SUPPORT_PACKET_VERSION = "1.0";
const PROVENANCE_VERSION = "1.0";
const HUMAN_REVIEW_POLICY_VERSION = "1.0";
const ADAPTER_MODE = "mock";
const PROVIDER_ID = "local-mock";
const DEFAULT_MODEL = "mock-balanced";
const MAX_INPUT_CHARS = 12000;
const MAX_OUTPUT_CHARS = 18000;
const MAX_DOCUMENTS = 100;
const MAX_DOCUMENT_CHARS = 8000;
const MAX_CONTEXT_CHARS = 12000;
const MAX_SCHEMA_FIELDS = 50;
const MAX_TOOL_PROPOSALS = 12;
const MAX_REPLAY_ENTRIES = 256;
const MAX_SUPPORT_EVIDENCE = 24;
const MAX_SUPPORT_SOURCES = 24;
const TOOL_EXECUTION_REFUSAL_CODE = "UNRESTRICTED_TOOL_EXECUTION_REFUSED";
const PROMPT_INJECTION_BLOCKED_CODE = "PROMPT_INJECTION_BLOCKED";
const IDEMPOTENCY_KEY_REUSE_CODE = "IDEMPOTENCY_KEY_REUSE";
const SUPPORT_URGENCY_LEVELS = Object.freeze(["low", "medium", "high", "critical"]);
const SUPPORT_ESCALATION_LEVELS = Object.freeze(["none", "human_review", "specialist_review", "security_review"]);
const ACTION_RISK_CLASSES = Object.freeze([
  "read_only",
  "draft_only",
  "human_review_required",
  "external_side_effect",
  "destructive",
  "blocked"
]);
const DEFAULT_ESTIMATED_OUTPUT_TOKENS = Object.freeze({
  classification: 128,
  extraction: 256,
  drafting: 256,
  retrieval: 256,
  tool_proposal: 192
});

class AIContractError extends TypeError {
  constructor(code, message, details) {
    super(message);
    this.name = "AIContractError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function fail(code, message, details) {
  throw new AIContractError(code, message, details);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isUnsafeKey(key) {
  return /^(?:__proto__|prototype|constructor)$/i.test(key);
}

function isSecretKey(key) {
  if (/^(?:estimatedoutput|maxoutput|input|output|total)tokens$/i.test(String(key).replace(/[_-]/g, ""))) return false;
  return /(?:password|secret|token|api[-_]?key|private[-_]?key|credential|authorization)/i.test(key);
}

function assertSafeValue(value, seen = new Set(), label = "input", depth = 0) {
  if (depth > 30) fail("INPUT_TOO_LARGE", `${label} exceeds the maximum JSON nesting depth.`);
  if (value === null || value === undefined) return;
  const type = typeof value;
  if (["string", "number", "boolean"].includes(type)) {
    if (type === "number" && !Number.isFinite(value)) fail("INVALID_INPUT", `${label} must contain finite numbers.`);
    return;
  }
  if (type === "bigint" || type === "function" || type === "symbol") {
    fail("INVALID_INPUT", `${label} contains an unsupported value.`);
  }
  if (type !== "object") fail("INVALID_INPUT", `${label} contains an unsupported value.`);
  if (seen.has(value)) fail("INVALID_INPUT", `${label} cannot contain circular data.`);
  seen.add(value);

  if (Array.isArray(value)) {
    if (value.length > MAX_DOCUMENTS * 2) fail("INPUT_TOO_LARGE", `${label} contains too many items.`);
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) fail("UNSAFE_INPUT", `${label} contains unsupported symbol properties.`);
    for (const key of ownKeys) {
      if (key === "length") continue;
      if (!/^(?:0|[1-9]\d*)$/.test(key) || Number(key) >= value.length) fail("UNSAFE_INPUT", `${label} contains unsupported array properties.`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || descriptor.enumerable !== true || !Object.hasOwn(descriptor, "value")) fail("INVALID_INPUT", `${label} cannot contain hidden properties or accessors.`);
    }
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      assertSafeValue(descriptor?.value, seen, `${label}[${index}]`, depth + 1);
    }
    seen.delete(value);
    return;
  }
  if (!isPlainObject(value)) fail("INVALID_INPUT", `${label} must contain plain JSON data.`);
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) fail("UNSAFE_INPUT", `${label} contains unsupported symbol properties.`);
  if (ownKeys.length > 200) fail("INPUT_TOO_LARGE", `${label} contains too many fields.`);
  for (const key of ownKeys) {
    if (isUnsafeKey(key)) fail("UNSAFE_INPUT", `${label} contains an unsafe object key.`);
    if (isSecretKey(key)) fail("SECRET_INPUT_REJECTED", `${label} cannot contain credential or secret fields.`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || descriptor.enumerable !== true || !Object.hasOwn(descriptor, "value")) fail("INVALID_INPUT", `${label} cannot contain hidden properties or accessors.`);
    assertSafeValue(descriptor.value, seen, `${label}.${key}`, depth + 1);
  }
  seen.delete(value);
}

function safeCopy(value, seen = new Set()) {
  assertSafeValue(value, seen);
  if (value === null || value === undefined || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => safeCopy(item));
  const result = {};
  for (const key of Object.keys(value).sort()) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    result[key] = safeCopy(descriptor.value);
  }
  return result;
}

function stableStringify(value) {
  return JSON.stringify(safeCopy(value));
}

function normalizeText(value, label = "input", { max = MAX_INPUT_CHARS, trim = true, allowEmpty = false } = {}) {
  let text;
  if (typeof value === "string") text = value;
  else if (isPlainObject(value) || Array.isArray(value)) text = stableStringify(value);
  else if (value === null || value === undefined) text = "";
  else fail("INVALID_INPUT", `${label} must be text or JSON data.`);

  if ([...text].some((character) => {
    const code = character.charCodeAt(0);
    return (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
  })) fail("INVALID_INPUT", `${label} contains unsupported control characters.`);
  if (text.length > max) fail("INPUT_TOO_LARGE", `${label} must be ${max} characters or fewer.`);
  const normalized = trim ? text.trim() : text;
  if (!allowEmpty && !normalized) fail("INVALID_INPUT", `${label} cannot be empty.`);
  return normalized;
}

function inputText(value, label = "input", options = {}) {
  assertSafeValue(value, new Set(), label);
  if (typeof value === "string") return normalizeText(value, label, options);
  if (isPlainObject(value)) {
    for (const key of ["text", "content", "input", "query"]) {
      if (typeof value[key] === "string") return normalizeText(value[key], label, options);
    }
  }
  return normalizeText(value, label, options);
}

function optionObject(options, label = "options") {
  if (options === undefined || options === null) return {};
  assertSafeValue(options, new Set(), label);
  if (!isPlainObject(options)) fail("INVALID_OPTIONS", `${label} must be a JSON object.`);
  return options;
}

function boundedInteger(value, fallback, min, max, label) {
  if (value === undefined) return fallback;
  const result = Number(value);
  if (!Number.isInteger(result) || result < min || result > max) fail("INVALID_OPTIONS", `${label} must be an integer from ${min} to ${max}.`);
  return result;
}

function boundedNumber(value, fallback, min, max, label) {
  if (value === undefined) return fallback;
  const result = value;
  if (typeof result !== "number" || !Number.isFinite(result) || result < min || result > max) fail("INVALID_OPTIONS", `${label} must be a number from ${min} to ${max}.`);
  return result;
}

function normalizeIdempotencyKey(value, label = "idempotencyKey") {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length < 4 || value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    fail("INVALID_OPTIONS", `${label} must contain 4-128 letters, numbers, or . _ : - characters.`);
  }
  return value;
}

function digest(...parts) {
  return crypto.createHash("sha256").update(parts.map((part) => String(part)).join("\u001f"), "utf8").digest("hex").slice(0, 16);
}

const MODEL_DEFINITIONS = Object.freeze({
  "mock-fast": Object.freeze({
    id: "mock-fast",
    label: "Mock Fast",
    provider: PROVIDER_ID,
    mode: ADAPTER_MODE,
    capabilities: Object.freeze(["classification", "extraction", "retrieval", "tool_proposal"]),
    rates: Object.freeze({ inputPer1k: 0.5, outputPer1k: 1 })
  }),
  "mock-balanced": Object.freeze({
    id: "mock-balanced",
    label: "Mock Balanced",
    provider: PROVIDER_ID,
    mode: ADAPTER_MODE,
    capabilities: Object.freeze(["classification", "extraction", "drafting", "retrieval", "tool_proposal"]),
    rates: Object.freeze({ inputPer1k: 1, outputPer1k: 2 })
  }),
  "mock-safe": Object.freeze({
    id: "mock-safe",
    label: "Mock Safe",
    provider: PROVIDER_ID,
    mode: ADAPTER_MODE,
    capabilities: Object.freeze(["classification", "extraction", "drafting", "retrieval", "tool_proposal"]),
    rates: Object.freeze({ inputPer1k: 0.75, outputPer1k: 1.5 })
  })
});

const DEFAULT_ROUTES = Object.freeze({
  classification: "mock-fast",
  extraction: "mock-balanced",
  drafting: "mock-balanced",
  retrieval: "mock-fast",
  tool_proposal: "mock-safe"
});

const TASK_ALIASES = Object.freeze({
  classify: "classification",
  classification: "classification",
  classify_request: "classification",
  extract: "extraction",
  extraction: "extraction",
  extract_fields: "extraction",
  draft: "drafting",
  drafting: "drafting",
  compose: "drafting",
  retrieve: "retrieval",
  retrieval: "retrieval",
  retrieve_context: "retrieval",
  context: "retrieval",
  tool: "tool_proposal",
  tools: "tool_proposal",
  tool_proposal: "tool_proposal",
  propose_tools: "tool_proposal"
});

function normalizeTask(task) {
  if (typeof task !== "string") fail("UNSUPPORTED_TASK", "The requested AI task must be a supported task name.");
  const key = task.trim().toLowerCase().replace(/[-\s]+/g, "_");
  const normalized = Object.hasOwn(TASK_ALIASES, key) ? TASK_ALIASES[key] : null;
  if (!normalized) fail("UNSUPPORTED_TASK", "The requested AI task is not supported by the local adapter.");
  return normalized;
}

function publicModel(model) {
  return {
    id: model.id,
    label: model.label,
    provider: model.provider,
    mode: model.mode,
    capabilities: [...model.capabilities]
  };
}

function availableModels() {
  return Object.values(MODEL_DEFINITIONS).map(publicModel);
}

function requestedModelId(requested) {
  if (requested === undefined || requested === null || requested === "") return null;
  if (typeof requested === "string") return requested.trim();
  if (isPlainObject(requested)) {
    assertSafeValue(requested, new Set(), "model");
    if (typeof requested.id === "string") return requested.id.trim();
  }
  fail("INVALID_OPTIONS", "model must be a model id string.");
}

function requestedBudget(options) {
  const value = options.budgetCredits ?? options.maxCostCredits ?? options.maxCredits;
  return value === undefined ? null : boundedNumber(value, null, 0, 1000000, "budgetCredits");
}

function routeEstimate(task, model, options) {
  const input = options.input ?? options.prompt ?? options.text ?? "";
  const output = options.output ?? options.completion ?? "";
  const requestedOutputTokens = options.estimatedOutputTokens ?? options.maxOutputTokens;
  const outputTokens = requestedOutputTokens === undefined
    ? (output ? estimateTokens(output) : DEFAULT_ESTIMATED_OUTPUT_TOKENS[task] || 128)
    : boundedInteger(requestedOutputTokens, 0, 0, 100000, "estimatedOutputTokens");
  const cost = costFromTokenCounts(model, estimateTokens(input), outputTokens);
  return { ...cost, basis: requestedOutputTokens === undefined && !output ? "task_default_output" : "caller_estimate" };
}

function routeModel(task, options = {}) {
  const normalizedTask = normalizeTask(task);
  const opts = typeof options === "string" ? { model: options } : optionObject(options);
  const requested = requestedModelId(opts.model ?? opts.modelId);
  for (const key of ["allowBudgetFallback", "allowFallback"]) {
    if (opts[key] !== undefined && typeof opts[key] !== "boolean") fail("INVALID_OPTIONS", `${key} must be a boolean.`);
  }
  const budget = requestedBudget(opts);
  const selectedId = requested || DEFAULT_ROUTES[normalizedTask];
  let selected = Object.hasOwn(MODEL_DEFINITIONS, selectedId) ? MODEL_DEFINITIONS[selectedId] : null;
  if (!selected) fail("UNSUPPORTED_MODEL", "The local adapter only supports its declared mock models.");
  if (!selected.capabilities.includes(normalizedTask)) {
    fail("MODEL_TASK_UNSUPPORTED", "The selected mock model does not support this task.");
  }
  let estimate = routeEstimate(normalizedTask, selected, opts);
  let fallback = false;
  let reason = requested ? "requested_model" : "task_default";
  if (budget !== null && estimate.totalCredits > budget) {
    if (opts.allowBudgetFallback === false || opts.allowFallback === false) {
      fail("BUDGET_EXCEEDED", "The requested model exceeds the approved local AI budget.", {
        budgetCredits: budget,
        estimatedCredits: estimate.totalCredits,
        modelId: selected.id
      });
    }
    const affordable = Object.values(MODEL_DEFINITIONS)
      .filter((candidate) => candidate.capabilities.includes(normalizedTask))
      .map((candidate) => ({ model: candidate, estimate: routeEstimate(normalizedTask, candidate, opts) }))
      .filter((candidate) => candidate.estimate.totalCredits <= budget)
      .sort((left, right) => left.estimate.totalCredits - right.estimate.totalCredits || left.model.id.localeCompare(right.model.id));
    if (!affordable.length) {
      fail("BUDGET_EXCEEDED", "No declared local model can satisfy the approved AI budget.", {
        budgetCredits: budget,
        estimatedCredits: estimate.totalCredits,
        task: normalizedTask
      });
    }
    const affordableRoute = affordable[0];
    selected = affordableRoute.model;
    estimate = affordableRoute.estimate;
    fallback = selected.id !== (requested || DEFAULT_ROUTES[normalizedTask]);
    reason = "budget_fallback";
  }
  const route = {
    task: normalizedTask,
    id: selected.id,
    modelId: selected.id,
    label: selected.label,
    provider: selected.provider,
    mode: selected.mode,
    model: publicModel(selected),
    requestedModel: requested,
    fallback,
    reason,
    estimatedCost: estimate,
    budget: {
      requestedCredits: budget,
      estimatedCredits: estimate.totalCredits,
      withinBudget: budget === null ? null : estimate.totalCredits <= budget,
      strategy: budget === null ? "unbounded" : (fallback ? "cheapest_affordable" : "requested_or_task_default")
    }
  };
  return route;
}

function valueForEstimate(value) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return stableStringify(value);
}

function estimateTokens(value) {
  const text = valueForEstimate(value);
  if (!text) return 0;
  return Math.max(1, Math.ceil(Buffer.byteLength(text, "utf8") / 4));
}

function roundCredits(value) {
  return Math.round(value * 1000) / 1000;
}

function costFromTokenCounts(selected, inputTokens, outputTokens) {
  const inputCredits = roundCredits((inputTokens / 1000) * selected.rates.inputPer1k);
  const outputCredits = roundCredits((outputTokens / 1000) * selected.rates.outputPer1k);
  return {
    estimated: true,
    billing: "not_charged",
    currency: "demo-credits",
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCredits,
    outputCredits,
    totalCredits: roundCredits(inputCredits + outputCredits)
  };
}

function resolveCostModel(model) {
  const id = requestedModelId(model) || DEFAULT_MODEL;
  const selected = Object.hasOwn(MODEL_DEFINITIONS, id) ? MODEL_DEFINITIONS[id] : null;
  if (!selected) fail("UNSUPPORTED_MODEL", "Cost estimates require a declared local mock model.");
  return selected;
}

function estimateCost(input, output = "", model = DEFAULT_MODEL) {
  const selected = resolveCostModel(model && model.model ? model.model.id : model);
  const inputTokens = estimateTokens(input);
  const outputTokens = estimateTokens(output);
  return costFromTokenCounts(selected, inputTokens, outputTokens);
}

const INJECTION_RULES = Object.freeze([
  Object.freeze({
    code: "IGNORE_INSTRUCTIONS",
    severity: "high",
    description: "Attempts to replace or override the governing instructions.",
    pattern: /\b(?:ignore|disregard|forget|override|bypass)\b.{0,100}\b(?:previous|prior|system|developer|all|these)\b.{0,60}\b(?:instructions?|rules?|messages?)\b/i
  }),
  Object.freeze({
    code: "ROLE_HIJACK",
    severity: "high",
    description: "Attempts to assign a new privileged role or system identity.",
    pattern: /\b(?:you are now|act as|pretend to be|roleplay as)\b.{0,100}\b(?:system|developer|administrator|root|unrestricted|unfiltered)\b/i
  }),
  Object.freeze({
    code: "PROMPT_EXFILTRATION",
    severity: "high",
    description: "Requests hidden prompts, credentials, or internal policy text.",
    pattern: /\b(?:reveal|show|print|leak|dump|repeat|expose)\b.{0,100}\b(?:system prompt|developer message|hidden prompt|credentials?|api keys?|secrets?|private key|tokens?|cookies?)\b/i
  }),
  Object.freeze({
    code: "TOOL_OVERRIDE",
    severity: "high",
    description: "Requests direct command, function, shell, or tool execution.",
    pattern: /(?:^|[.!?\n])\s*(?:call|run|execute|invoke|use)\b.{0,80}\b(?:tool|function|command|shell|browser|api)\b/i
  }),
  Object.freeze({
    code: "DATA_EXFILTRATION",
    severity: "medium",
    description: "Requests private workspace data outside the supplied task context.",
    pattern: /\b(?:export|send|forward|upload|copy)\b.{0,80}\b(?:all|private|customer|workspace|internal)\b.{0,80}\b(?:data|records|messages|documents|files)\b/i
  }),
  Object.freeze({
    code: "FAKE_AUTHORITY",
    severity: "high",
    description: "Claims system, developer, administrator, or approval authority inside untrusted content.",
    pattern: /(?:^|[.!?\n\[])[\s]*(?:system|developer|assistant|administrator|admin|owner)\s+(?:message|instruction|override|approval|mode|role)\b(?:\s*[:\]]|\b)|\b(?:admin|owner|manager)\s+(?:already\s+)?(?:approved|authorized|granted)\b/i
  }),
  Object.freeze({
    code: "DELIMITER_INJECTION",
    severity: "high",
    description: "Uses prompt delimiters or role markers to impersonate a trusted message.",
    pattern: /(?:<\/?(?:system|developer|assistant)>|\[\/?(?:system|developer|assistant)\]|```(?:system|developer)\b)/i
  }),
  Object.freeze({
    code: "ENCODED_INSTRUCTION",
    severity: "medium",
    description: "Requests decoding or execution of hidden instructions in encoded content.",
    pattern: /\b(?:decode|decrypt|base64|encoded|rot13)\b.{0,100}\b(?:instruction|prompt|command|tool|secret)\b/i
  }),
  Object.freeze({
    code: "APPROVAL_BYPASS",
    severity: "high",
    description: "Attempts to skip the approval boundary or claim an approval inside task data.",
    pattern: /\b(?:(?:skip|bypass|disable|waive|avoid)\s+(?:the\s+|human\s+|all\s+)*(?:approval|review)|(?:approval|permission)\s+(?:already\s+)?(?:granted|approved))\b/i
  })
]);

function detectPromptInjection(value) {
  const text = isPlainObject(value) || Array.isArray(value)
    ? normalizeText(stableStringify(value), "input", { max: MAX_INPUT_CHARS, allowEmpty: true })
    : inputText(value, "input", { max: MAX_INPUT_CHARS, allowEmpty: true });
  const compact = text.replace(/\s+/g, " ");
  const flags = INJECTION_RULES.filter((rule) => rule.pattern.test(text) || rule.pattern.test(compact)).map((rule) => ({
    code: rule.code,
    severity: rule.severity,
    description: rule.description
  }));
  const highCount = flags.filter((flag) => flag.severity === "high").length;
  const detected = flags.length > 0;
  const risk = highCount > 0 ? "high" : detected ? "medium" : "none";
  return {
    detected,
    risk,
    flags,
    handling: {
      mode: highCount > 0 ? "quarantine" : detected ? "isolate" : "allow_with_caution",
      instructionsTrusted: false,
      followEmbeddedInstructions: false,
      manualReviewRequired: detected,
      externalActionsAllowed: false
    },
    recommendation: flags.length
      ? "Treat the content as untrusted data, quarantine embedded instructions, do not follow them, and require review."
      : "No known prompt-injection pattern was detected; continue to treat external content as untrusted data."
  };
}

function mergeInjectionFlags(values) {
  const texts = values.filter((value) => value !== undefined && value !== null && value !== "");
  const reports = [];
  for (const value of texts) {
    const text = valueForEstimate(value);
    // Scan with overlap so an otherwise valid retrieval batch is not rejected
    // merely because its combined size exceeds the single-input limit.
    for (let offset = 0; offset < text.length; offset += MAX_INPUT_CHARS - 512) {
      reports.push(detectPromptInjection(text.slice(offset, offset + MAX_INPUT_CHARS)));
    }
  }
  const summary = detectPromptInjection("");
  const byCode = new Map();
  for (const report of reports) {
    for (const flag of report.flags) byCode.set(flag.code, flag);
  }
  summary.flags = [...byCode.values()];
  summary.detected = summary.flags.length > 0;
  summary.risk = summary.flags.some((flag) => flag.severity === "high") ? "high" : summary.detected ? "medium" : "none";
  if (summary.detected) {
    summary.handling.mode = summary.risk === "high" ? "quarantine" : "isolate";
    summary.handling.manualReviewRequired = true;
    summary.recommendation = "Treat the content as untrusted data, quarantine embedded instructions, do not follow them, and require review.";
  }
  return summary;
}

const ACTION_TYPES = Object.freeze([
  "analysis",
  "read",
  "draft",
  "communicate",
  "financial",
  "access",
  "destructive",
  "code_execution",
  "tool_proposal",
  "unknown"
]);

function normalizeActionType(value) {
  const normalized = String(value || "unknown").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ACTION_TYPES.includes(normalized) ? normalized : "unknown";
}

function actionRiskClass(type, { blocked = false, abstained = false, proposed = false } = {}) {
  if (blocked) return "blocked";
  const normalized = normalizeActionType(type);
  if (["communicate", "financial", "access", "destructive", "code_execution", "unknown"].includes(normalized)) return "external_side_effect";
  if (abstained || proposed) return "human_review_required";
  if (normalized === "draft" || normalized === "tool_proposal") return "draft_only";
  return "read_only";
}

function actionPolicy(type, { proposed = false, blocked = false, abstained = false, tool = null } = {}) {
  const normalizedType = normalizeActionType(type);
  const sideEffect = ["communicate", "financial", "access", "destructive", "code_execution", "unknown"].includes(normalizedType);
  const requiresApproval = proposed || sideEffect || normalizedType === "draft";
  return {
    version: ACTION_POLICY_VERSION,
    type: normalizedType,
    riskClass: actionRiskClass(normalizedType, { blocked, abstained, proposed }),
    tool,
    sideEffect,
    externalAction: sideEffect,
    status: blocked ? "blocked" : requiresApproval ? "review" : "allowed",
    requiresApproval,
    approval: requiresApproval ? "required_before_use" : "not_required",
    executable: false
  };
}

function evidenceItem(sourceId, sourceType, quote, supports, extra = {}) {
  const boundedQuote = String(quote).slice(0, 1000);
  return {
    sourceId: String(sourceId),
    sourceType: String(sourceType),
    quote: normalizeText(boundedQuote, "evidence quote", { max: 1000, trim: false }),
    truncated: String(quote).length > boundedQuote.length,
    supports: String(supports),
    ...extra
  };
}

function groundingDescriptor(evidence = [], limitations = [], status, unsupportedClaims = []) {
  const safeEvidence = evidence.filter(Boolean);
  const safeLimitations = [...new Set(limitations.filter(Boolean).map(String))];
  const resolvedStatus = status || (safeEvidence.length
    ? (safeLimitations.length ? "partial" : "grounded")
    : "insufficient_evidence");
  return {
    status: resolvedStatus,
    evidence: safeEvidence,
    evidenceCount: safeEvidence.length,
    limitations: safeLimitations,
    unsupportedClaims: [...new Set(unsupportedClaims.filter(Boolean).map(String))]
  };
}

function refusalDescriptor() {
  return {
    allowed: false,
    status: "refused",
    mode: "proposal-only",
    code: TOOL_EXECUTION_REFUSAL_CODE,
    reason: "The local adapter never executes unrestricted tools or external side effects.",
    sideEffectsPerformed: false,
    actionPolicy: actionPolicy("unknown", { blocked: true }),
    approvalRequired: true,
    humanReviewRequired: true
  };
}

function safetyFor(...values) {
  return {
    promptInjection: mergeInjectionFlags(values),
    toolExecution: refusalDescriptor()
  };
}

function operationActionPolicy(operation, safety, result) {
  const type = {
    classification: "analysis",
    extraction: "analysis",
    drafting: "draft",
    retrieval: "read",
    tool_proposal: "tool_proposal",
    tool_execution: "unknown"
  }[operation] || "unknown";
  const injectionDetected = Boolean(safety?.promptInjection?.detected);
  const uncertain = Boolean(result?.uncertainty?.abstained || result?.uncertainty?.level === "high");
  const requiresApproval = injectionDetected || uncertain || operation === "drafting" || operation === "tool_proposal" || operation === "tool_execution";
  const policy = actionPolicy(type, { blocked: injectionDetected, abstained: uncertain });
  return {
    ...policy,
    status: injectionDetected ? "blocked" : (requiresApproval ? "review" : "allowed"),
    requiresApproval,
    approval: requiresApproval ? (injectionDetected ? "manual_review_before_use" : "required_before_use") : "not_required"
  };
}

function approvalDescriptor(operation, safety, policy, result) {
  const injectionDetected = Boolean(safety?.promptInjection?.detected);
  const required = Boolean(policy?.requiresApproval);
  let status = required ? "pending" : "not_required";
  let reason = required ? "Review the local result before it is used for an external or consequential action." : "This local result has no external side effect.";
  if (injectionDetected) {
    status = "manual_review";
    reason = "Prompt-injection indicators were detected; a reviewer must validate the untrusted content before use.";
  } else if (result?.uncertainty?.abstained || result?.uncertainty?.level === "high") {
    status = "manual_review";
    reason = "Evidence or confidence is insufficient for automatic use; a reviewer must resolve the uncertainty.";
  } else if (operation === "tool_proposal") {
    reason = "Every tool proposal requires explicit approval and remains non-executable in this adapter.";
  } else if (operation === "drafting") {
    reason = "A draft is reviewable content only; approval is required before any external use.";
  }
  return {
    required,
    status,
    scope: operation,
    reason,
    executionAuthorized: false,
    bypassable: false
  };
}

function uniqueEvidenceIds(grounding) {
  return [...new Set((Array.isArray(grounding?.evidence) ? grounding.evidence : [])
    .map((item) => item && typeof item.sourceId === "string" ? item.sourceId : null)
    .filter(Boolean))].sort();
}

function actionPlanFor(operation, result, grounding, safety, policy, approval) {
  const injectionDetected = Boolean(safety?.promptInjection?.detected);
  const abstained = Boolean(result?.uncertainty?.abstained || result?.uncertainty?.level === "high");
  const evidenceIds = uniqueEvidenceIds(grounding);
  const actions = [];

  if (operation === "tool_proposal" && Array.isArray(result?.proposals)) {
    for (const proposal of result.proposals) {
      if (!isPlainObject(proposal) || typeof proposal.tool !== "string") continue;
      const proposalPolicy = isPlainObject(proposal.actionPolicy) ? proposal.actionPolicy : actionPolicy("unknown", { proposed: true, blocked: true, tool: proposal.tool });
      const proposalEvidenceIds = evidenceIds.slice();
      const actionBody = {
        type: normalizeActionType(proposalPolicy.type),
        riskClass: proposalPolicy.riskClass || actionRiskClass(proposalPolicy.type, { blocked: proposalPolicy.status === "blocked" || injectionDetected, proposed: true }),
        tool: proposal.tool,
        arguments: isPlainObject(proposal.arguments) ? safeCopy(proposal.arguments) : {},
        status: proposalPolicy.status === "blocked" || injectionDetected ? "blocked" : "review",
        requiresApproval: true,
        executable: false,
        evidenceIds: proposalEvidenceIds,
        actionPolicy: { ...proposalPolicy, executable: false }
      };
      actions.push({
        id: `action-${digest(ACTION_PLAN_VERSION, operation, actions.length, stableStringify(actionBody))}`,
        ...actionBody
      });
    }
  } else {
    const actionBody = {
      type: normalizeActionType(policy?.type),
      riskClass: policy?.riskClass || actionRiskClass(policy?.type, { blocked: injectionDetected, abstained }),
      tool: policy?.tool || null,
      arguments: { operation },
      status: injectionDetected ? "blocked" : policy?.requiresApproval || abstained ? "review" : "ready",
      requiresApproval: Boolean(policy?.requiresApproval),
      executable: false,
      evidenceIds,
      actionPolicy: { ...(policy || actionPolicy("unknown")), executable: false }
    };
    actions.push({
      id: `action-${digest(ACTION_PLAN_VERSION, operation, stableStringify(actionBody))}`,
      ...actionBody
    });
  }

  const status = injectionDetected
    ? "blocked"
    : abstained
      ? "abstained"
      : approval?.required
        ? "review"
        : "ready";
  const riskClasses = [...new Set(actions.map((action) => action.riskClass).filter((riskClass) => ACTION_RISK_CLASSES.includes(riskClass)))];
  const reviewPolicy = humanReviewPolicy({
    required: Boolean(approval?.required || policy?.requiresApproval || injectionDetected || abstained),
    reasons: [
      ...(injectionDetected ? ["Prompt-injection indicators were detected and quarantined."] : []),
      ...(abstained ? ["The result abstained because evidence or confidence was insufficient."] : []),
      ...(approval?.required ? ["Review is required before any consequential use."] : [])
    ],
    status: injectionDetected || abstained ? "manual_review" : approval?.required ? "pending" : "not_required",
    actionRisk: { externalAction: riskClasses.includes("external_side_effect") || riskClasses.includes("destructive") },
    escalation: { level: injectionDetected ? "security_review" : abstained ? "human_review" : "none" }
  });
  const body = {
    version: ACTION_PLAN_VERSION,
    operation,
    status,
    deterministic: true,
    executable: false,
    sideEffectsAllowed: false,
    requiresApproval: Boolean(approval?.required || policy?.requiresApproval),
    approvalStatus: approval?.status || "not_required",
    policyVersion: ACTION_POLICY_VERSION,
    riskClasses,
    humanReviewPolicy: reviewPolicy,
    evidenceIds,
    actions,
    limitations: [...new Set([
      ...(Array.isArray(grounding?.limitations) ? grounding.limitations : []),
      ...(injectionDetected ? ["Prompt-injection content is quarantined and cannot authorize an action."] : []),
      ...(abstained ? ["The result abstained because its evidence or confidence is insufficient for automatic use."] : [])
    ])],
    quarantine: injectionDetected
      ? { status: "quarantined", flags: (safety.promptInjection.flags || []).map((flag) => flag.code) }
      : null
  };
  const planDigest = digest("action-plan", stableStringify(body));
  return {
    ...body,
    id: `plan-${planDigest}`,
    digest: planDigest
  };
}

function inspectActionPlan(plan) {
  const failures = [];
  if (!isPlainObject(plan)) return { valid: false, failures: ["plan_shape"] };
  if (plan.version !== ACTION_PLAN_VERSION) failures.push("version");
  if (typeof plan.operation !== "string" || !Object.hasOwn(DEFAULT_ROUTES, plan.operation)) failures.push("operation");
  if (!["ready", "review", "abstained", "blocked"].includes(plan.status)) failures.push("status");
  if (!["not_required", "pending", "manual_review"].includes(plan.approvalStatus)) failures.push("approval_status");
  if (plan.deterministic !== true || plan.executable !== false || plan.sideEffectsAllowed !== false) failures.push("execution_boundary");
  if (typeof plan.requiresApproval !== "boolean" || typeof plan.approvalStatus !== "string") failures.push("approval_shape");
  if (!Array.isArray(plan.evidenceIds) || plan.evidenceIds.some((id) => typeof id !== "string" || !id)) failures.push("evidence_ids");
  if (!Array.isArray(plan.actions)) failures.push("actions_shape");
  else {
    for (const action of plan.actions) {
      if (!isPlainObject(action) || typeof action.id !== "string" || !ACTION_TYPES.includes(action.type)
        || typeof action.executable !== "boolean" || action.executable !== false
       || typeof action.requiresApproval !== "boolean" || !Array.isArray(action.evidenceIds)
        || !ACTION_RISK_CLASSES.includes(action.riskClass)
        || !isPlainObject(action.actionPolicy) || action.actionPolicy.executable !== false
        || action.actionPolicy.version !== ACTION_POLICY_VERSION || action.actionPolicy.type !== action.type
        || action.actionPolicy.riskClass !== action.riskClass
        || action.actionPolicy.requiresApproval !== action.requiresApproval
        || !["ready", "review", "blocked"].includes(action.status)) {
        failures.push("action_shape");
        break;
      }
    }
  }
  if (typeof plan.digest !== "string" || typeof plan.id !== "string" || !plan.id.startsWith("plan-")) failures.push("digest");
  else {
    const { id, digest: suppliedDigest, ...body } = plan;
    const expectedDigest = digest("action-plan", stableStringify(body));
    if (suppliedDigest !== expectedDigest || id !== `plan-${expectedDigest}`) failures.push("digest");
  }
  return { valid: failures.length === 0, failures };
}

const validateActionPlan = inspectActionPlan;

function applyConfidenceThreshold(result, threshold) {
  if (typeof result.confidence !== "number" || result.confidence >= threshold || result.grounding?.status === "blocked") return result;
  const reason = `Heuristic confidence is below the minimum ${threshold}; use manual review.`;
  return {
    ...result,
    uncertainty: {
      level: "high",
      reasons: [...new Set([...(result.uncertainty?.reasons || []), reason])],
      abstained: true
    }
  };
}

function envelope(operation, route, input, output, result, safety, options = {}) {
  const cost = estimateCost(input, output, route.model.id);
  const budget = route.budget
    ? {
        ...route.budget,
        actualCredits: cost.totalCredits,
        withinBudget: route.budget.requestedCredits === null ? null : cost.totalCredits <= route.budget.requestedCredits,
        status: route.budget.requestedCredits === null
          ? "unbounded"
          : (cost.totalCredits <= route.budget.requestedCredits ? "within_budget" : "exceeded")
      }
    : null;
  if (budget && budget.requestedCredits !== null && !budget.withinBudget) {
    fail("BUDGET_EXCEEDED", "The local AI result exceeds the approved budget.", {
      budgetCredits: budget.requestedCredits,
      actualCredits: budget.actualCredits,
      modelId: route.model.id
    });
  }
  const action = operationActionPolicy(operation, safety, result);
  const approval = approvalDescriptor(operation, safety, action, result);
  const grounding = result && result.grounding
    ? result.grounding
    : groundingDescriptor(result && Array.isArray(result.evidence) ? result.evidence : [], ["The operation did not expose claim-level evidence."]);
  const confidence = result && typeof result.confidence === "number" ? result.confidence : null;
  const uncertainty = result && result.uncertainty
    ? result.uncertainty
    : {
        level: confidence === null ? "unknown" : confidence >= 0.8 ? "low" : "medium",
        reasons: confidence === null ? ["No calibrated operation confidence was available."] : [],
        abstained: false
      };
  const inputDigest = digest(valueForEstimate(input));
  const resultDigest = digest(valueForEstimate(result));
  const idempotencyKey = normalizeIdempotencyKey(options.idempotencyKey);
  const actionPlan = actionPlanFor(operation, result, grounding, safety, action, approval);
  const replayKey = digest("replay", CONTRACT_VERSION, ACTION_PLAN_VERSION, operation, route.model.id, inputDigest, resultDigest, valueForEstimate(route), valueForEstimate(safety), valueForEstimate({ ...options, idempotencyKey: undefined }));
  const requestId = digest(CONTRACT_VERSION, ACTION_POLICY_VERSION, ACTION_PLAN_VERSION, operation, route.model.id, inputDigest, resultDigest, valueForEstimate(route), valueForEstimate(safety), idempotencyKey || "");
  return {
    ok: true,
    contractVersion: CONTRACT_VERSION,
    operation,
    mode: ADAPTER_MODE,
    provider: PROVIDER_ID,
    model: {
      ...route.model,
      requestedModel: route.requestedModel,
      routeReason: route.reason
    },
    result,
    grounding,
    confidence,
    confidenceKind: "deterministic_heuristic_not_probability",
    uncertainty,
    actionPolicy: action,
    actionPlan,
    approval,
    safety,
    budget,
    usage: {
      estimated: true,
      method: "utf8_bytes_divided_by_four",
      inputTokens: cost.inputTokens,
      outputTokens: cost.outputTokens,
      totalTokens: cost.totalTokens
    },
    cost,
    trace: {
      requestId,
      deterministic: true,
      replayKey,
      idempotencyKey,
      replay: {
        deterministic: true,
        idempotent: Boolean(idempotencyKey),
        cache: idempotencyKey ? "adapter-local" : "stateless",
        key: replayKey
      },
      evaluation: {
        version: EVALUATION_VERSION,
        hook: "local-contract",
        actionPolicyVersion: ACTION_POLICY_VERSION,
        actionPlanVersion: ACTION_PLAN_VERSION,
        minConfidence: route.minConfidence,
        inputDigest,
        resultDigest
      }
    }
  };
}

const CLASSIFICATION_RULES = Object.freeze([
  Object.freeze({ label: "support", terms: Object.freeze(["help", "issue", "question", "customer", "support", "unable", "problem"]) }),
  Object.freeze({ label: "sales", terms: Object.freeze(["buy", "pricing", "price", "demo", "trial", "interested", "proposal", "lead"]) }),
  Object.freeze({ label: "engineering", terms: Object.freeze(["bug", "error", "stack", "deploy", "code", "repository", "build", "api", "engineering"]) }),
  Object.freeze({ label: "billing", terms: Object.freeze(["invoice", "payment", "charge", "refund", "subscription", "credit", "billing"]) }),
  Object.freeze({ label: "operations", terms: Object.freeze(["workflow", "process", "briefing", "schedule", "report", "operations", "approval"]) })
]);

function classifyText(text, promptInjection) {
  if (promptInjection.detected) {
    return {
      label: "security_review",
      confidence: 0.99,
      alternatives: [],
      matchedTerms: [],
      reason: "Prompt-injection indicators require human review before the content is acted on.",
      evidence: [],
      grounding: groundingDescriptor([], ["Untrusted instruction content was quarantined."], "blocked"),
      uncertainty: {
        level: "high",
        reasons: ["The content contains prompt-injection indicators.", "The requested business intent was intentionally not inferred."],
        abstained: true
      }
    };
  }
  const lower = text.toLowerCase();
  const ranked = CLASSIFICATION_RULES.map((rule) => {
    const matchedTerms = rule.terms.filter((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower));
    return { label: rule.label, score: matchedTerms.length, matchedTerms };
  }).sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
  const best = ranked[0];
  const label = best.score ? best.label : "general";
  const confidence = best.score ? Math.min(0.96, 0.56 + best.score * 0.08) : 0.4;
  const evidence = best.matchedTerms.map((term) => {
    const match = new RegExp(`\\b${escapeRegExp(term)}\\b`, "i").exec(text);
    return evidenceItem("input", "input", match[0], `classification:${label}`, { term, start: match.index, end: match.index + match[0].length });
  });
  const uncertaintyReasons = [];
  if (!best.score) uncertaintyReasons.push("No supported category keywords were found.");
  if (best.score === 1) uncertaintyReasons.push("Only one matching category signal was found.");
  const tied = best.score > 0 && ranked[1].score === best.score;
  if (tied) uncertaintyReasons.push("Multiple categories have equally strong keyword signals.");
  return {
    label,
    confidence: Number(confidence.toFixed(2)),
    alternatives: ranked.filter((item) => item.score > 0 && item.label !== label).slice(0, 3).map((item) => ({
      label: item.label,
      confidence: Number(Math.max(0.2, confidence - 0.08 * (best.score - item.score + 1)).toFixed(2))
    })),
    matchedTerms: best.matchedTerms,
    reason: best.score ? `Matched ${best.matchedTerms.join(", ")} keywords.` : "No supported category keywords were found.",
    evidence,
    grounding: groundingDescriptor(evidence, uncertaintyReasons),
    uncertainty: {
      level: tied || !best.score ? "high" : best.score >= 2 ? "low" : "medium",
      reasons: uncertaintyReasons,
      abstained: !best.score || tied
    }
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fieldLabels(name) {
  const spaced = String(name).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  const aliases = {
    email: ["email", "email address"],
    name: ["name", "full name"],
    company: ["company", "organization", "organisation", "org"],
    priority: ["priority", "urgency", "severity"],
    amount: ["amount", "total", "price", "cost"],
    date: ["date", "due date", "deadline"],
    summary: ["summary", "overview"],
    description: ["description", "details"]
  };
  return [...new Set([spaced, ...(aliases[String(name).toLowerCase()] || [])])].filter(Boolean);
}

function parseSchema(schema) {
  assertSafeValue(schema, new Set(), "schema");
  const validateFields = (fields) => {
    if (!fields.length || fields.length > MAX_SCHEMA_FIELDS) fail("INVALID_SCHEMA", `schema must contain 1-${MAX_SCHEMA_FIELDS} fields.`);
    const names = new Set();
    for (const field of fields) {
      if (!field.name || field.name.length > 100 || field.name !== field.name.trim() || names.has(field.name)) {
        fail("INVALID_SCHEMA", "schema field names must be unique, non-empty, trimmed strings of at most 100 characters.");
      }
      if (isUnsafeKey(field.name)) fail("UNSAFE_INPUT", "schema contains an unsafe field name.");
      if (isSecretKey(field.name)) fail("SECRET_INPUT_REJECTED", "schema cannot request credential or secret fields.");
      if (!["string", "number", "integer", "boolean", "array", "string[]", "enum", "object", "json"].includes(field.type)) {
        fail("INVALID_SCHEMA", `schema field ${field.name} has an unsupported type.`);
      }
      if (field.type === "enum" && (!field.enum || !field.enum.length)) fail("INVALID_SCHEMA", "enum fields require non-empty choices.");
      names.add(field.name);
    }
    return fields;
  };
  if (Array.isArray(schema)) {
    if (!schema.length || schema.length > MAX_SCHEMA_FIELDS) fail("INVALID_SCHEMA", `schema must contain 1-${MAX_SCHEMA_FIELDS} fields.`);
    return validateFields(schema.map((name) => {
      if (typeof name !== "string" || !name.trim()) fail("INVALID_SCHEMA", "schema field names must be non-empty strings.");
      return { name: name.trim(), type: "string", required: false, enum: null };
    }));
  }
  if (!isPlainObject(schema)) fail("INVALID_SCHEMA", "schema must be an array or JSON object.");
  const source = isPlainObject(schema.fields) ? schema.fields : isPlainObject(schema.properties) ? schema.properties : schema;
  const requiredFields = new Set(Array.isArray(schema.required) ? schema.required.filter((name) => typeof name === "string") : []);
  if (Array.isArray(schema.fields)) {
    return validateFields(schema.fields.map((name) => {
      if (typeof name !== "string" || !name.trim()) fail("INVALID_SCHEMA", "schema field names must be non-empty strings.");
      return { name: name.trim(), type: "string", required: requiredFields.has(name), enum: null };
    }));
  }
  const names = Object.keys(source);
  if (!names.length || names.length > MAX_SCHEMA_FIELDS) fail("INVALID_SCHEMA", `schema must contain 1-${MAX_SCHEMA_FIELDS} fields.`);
  return validateFields(names.map((name) => {
    if (isUnsafeKey(name) || isSecretKey(name)) fail("SECRET_INPUT_REJECTED", "schema cannot request credential or secret fields.");
    const spec = source[name];
    if (typeof spec === "string") return { name, type: spec.toLowerCase(), required: requiredFields.has(name), enum: null };
    if (!isPlainObject(spec)) fail("INVALID_SCHEMA", `schema field ${name} must be a type or field definition.`);
    const type = typeof spec.type === "string" ? spec.type.toLowerCase() : "string";
    const required = spec.required === true || (spec.required === undefined && requiredFields.has(name));
    const values = spec.enum === undefined ? null : spec.enum;
    if (values !== null && (!Array.isArray(values) || !values.length || values.length > 20 || values.some((item) => typeof item !== "string" || !item.trim()))) {
      fail("INVALID_SCHEMA", `schema enum for ${name} must contain up to 20 strings.`);
    }
    return { name, type, required, enum: values ? [...values] : null };
  }));
}

function findFieldValue(text, name) {
  for (const label of fieldLabels(name)) {
    const escaped = escapeRegExp(label);
    const labeled = new RegExp(`(?:^|[\\n;,|])\\s*${escaped}\\s*(?::|=|-|\\bis\\b)\\s*([^\\n;|]+)`, "i").exec(text);
    if (labeled && labeled[1]) return { raw: labeled[1].trim(), quote: labeled[0], start: labeled.index };
  }
  return null;
}

function coerceFieldValue(raw, field) {
  if (raw === null || raw === undefined || raw === "") return null;
  let value = String(raw).trim().replace(/[.。]+$/, "");
  if (!value) return null;
  if (field.enum) {
    const canonical = field.enum.find((item) => item.toLowerCase() === value.toLowerCase());
    if (canonical === undefined) return null;
    value = canonical;
  }
  switch (field.type) {
    case "number":
    case "integer": {
      if (!/^[+-]?\$?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) return null;
      const numeric = Number(value.replace(/[$,]/g, ""));
      if (!Number.isFinite(numeric)) return null;
      return field.type === "integer" && !Number.isSafeInteger(numeric) ? null : numeric;
    }
    case "boolean": {
      if (/^(true|yes|y|1)$/i.test(value)) return true;
      if (/^(false|no|n|0)$/i.test(value)) return false;
      return null;
    }
    case "array":
    case "string[]":
      return value.split(/\s*(?:,|;)\s*/).filter(Boolean).slice(0, 20);
    case "enum":
      if (!field.enum) return value;
      return field.enum.find((item) => item.toLowerCase() === value.toLowerCase()) || null;
    case "object":
    case "json":
      try {
        const parsed = JSON.parse(value);
        assertSafeValue(parsed, new Set(), `field ${field.name}`);
        if (field.type === "object" && !isPlainObject(parsed)) return null;
        return parsed;
      } catch {
        return null;
      }
    default:
      return value.slice(0, 1000);
  }
}

function extractFields(text, schema) {
  const fields = parseSchema(schema);
  const data = {};
  const missingFields = [];
  const evidence = [];
  const uncertainFields = [];
  for (const field of fields) {
    const match = findFieldValue(text, field.name);
    const value = coerceFieldValue(match?.raw, field);
    data[field.name] = value;
    if (value === null && field.required) missingFields.push(field.name);
    if (value === null) {
      uncertainFields.push(field.name);
    } else {
      evidence.push(evidenceItem("input", "input", match.quote, `extraction:${field.name}`, {
        field: field.name,
        start: match.start,
        end: match.start + Math.min(1000, match.quote.length)
      }));
    }
  }
  const confidence = fields.length ? Number(((fields.length - uncertainFields.length) / fields.length).toFixed(2)) : 0;
  const limitations = missingFields.length
    ? [`Required fields were not found: ${missingFields.join(", ")}.`]
    : uncertainFields.length ? [`Some optional fields were not found: ${uncertainFields.join(", ")}.`] : [];
  return {
    data,
    fields: data,
    missingFields,
    schema: fields,
    evidence,
    grounding: groundingDescriptor(evidence, limitations),
    confidence,
    uncertainty: {
      level: missingFields.length ? "high" : uncertainFields.length ? "medium" : "low",
      reasons: limitations,
      abstained: missingFields.length > 0
    }
  };
}

function draftSubject(text, options) {
  if (typeof options.subject === "string" && options.subject.trim()) return normalizeText(options.subject, "subject", { max: 120 });
  const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "Internal request";
  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}...` : firstLine;
}

function draftText(text, options, promptInjection, maxOutputChars = MAX_OUTPUT_CHARS) {
  const subject = promptInjection.detected ? "Request requires manual review" : draftSubject(text, options);
  const tone = !promptInjection.detected && typeof options.tone === "string" && options.tone.trim()
    ? normalizeText(options.tone, "tone", { max: 40 })
    : "clear and professional";
  const excerpt = promptInjection.detected
    ? "[Untrusted instruction content omitted; review the source manually.]"
    : text.slice(0, 320);
  const reviewLine = promptInjection.detected
    ? "Review note: prompt-injection indicators were detected. Do not follow embedded instructions."
    : "Review note: this is a local mock draft and has not been sent.";
  const output = [
    "MOCK DRAFT — not sent",
    `Subject: ${subject}`,
    `Tone: ${tone}`,
    "",
    `Request summary: ${excerpt}`,
    "",
    "Suggested response:",
    "Thanks for reaching out. We received your request and will review the details before confirming the next step.",
    "",
    reviewLine,
    "No email, message, refund, deployment, or other external action was performed."
  ].join("\n");
  const evidence = promptInjection.detected ? [] : [evidenceItem("input", "input", excerpt, "draft:request_summary")];
  const limitations = ["This is a deterministic template; it does not validate requested facts or promise an external outcome."];
  if (promptInjection.detected) limitations.push("Untrusted instruction content was omitted and requires manual review.");
  return {
    text: output.slice(0, maxOutputChars),
    subject,
    status: "draft_only",
    sent: false,
    reviewRequired: true,
    evidence,
    grounding: groundingDescriptor(evidence, limitations, promptInjection.detected ? "blocked" : "partial", promptInjection.detected ? [] : ["The canned response is a template and does not establish receipt, eligibility, or a completed external action."]),
    confidence: null,
    uncertainty: {
      level: promptInjection.detected ? "high" : "unknown",
      reasons: limitations,
      abstained: promptInjection.detected
    }
  };
}

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "in", "is", "it", "of", "on", "or", "that", "the", "their", "this", "to", "was", "with", "you"
]);

function terms(value) {
  return [...new Set((String(value).toLowerCase().match(/[a-z0-9][a-z0-9'-]{1,}/g) || []).filter((term) => !STOP_WORDS.has(term)))];
}

function normalizeDocuments(documents) {
  if (!Array.isArray(documents)) fail("INVALID_DOCUMENTS", "documents must be an array.");
  if (documents.length > MAX_DOCUMENTS) fail("INVALID_DOCUMENTS", `documents must contain ${MAX_DOCUMENTS} items or fewer.`);
  const normalized = documents.map((document, index) => {
    if (typeof document === "string") {
      return { id: `document-${index + 1}`, title: `Document ${index + 1}`, content: normalizeText(document, `documents[${index}]`, { max: MAX_DOCUMENT_CHARS }) };
    }
    if (!isPlainObject(document)) fail("INVALID_DOCUMENTS", `documents[${index}] must be text or an object.`);
    assertSafeValue(document, new Set(), `documents[${index}]`);
    const content = document.content ?? document.text ?? document.body;
    if (typeof content !== "string") fail("INVALID_DOCUMENTS", `documents[${index}] must contain content text.`);
    const title = document.title === undefined ? `Document ${index + 1}` : normalizeText(document.title, `documents[${index}].title`, { max: 200 });
    const id = document.id === undefined ? `document-${index + 1}` : normalizeText(document.id, `documents[${index}].id`, { max: 100 });
    return { id, title, content: normalizeText(content, `documents[${index}].content`, { max: MAX_DOCUMENT_CHARS }) };
  });
  if (new Set(normalized.map((document) => document.id)).size !== normalized.length) {
    fail("INVALID_DOCUMENTS", "Document IDs must be unique so evidence references are unambiguous.");
  }
  return normalized;
}

function makeSnippet(content, queryTerms, maxChars = 320) {
  const lower = content.toLowerCase();
  const firstMatch = queryTerms.map((term) => lower.indexOf(term)).filter((index) => index >= 0).sort((a, b) => a - b)[0];
  const start = content.length <= maxChars || firstMatch === undefined ? 0 : Math.max(0, firstMatch - 80);
  const end = Math.min(content.length, start + Math.min(320, maxChars));
  return { text: content.slice(start, end), start, end, truncated: start > 0 || end < content.length };
}

function rankDocuments(query, documents, limit, maxChars, blockedByMetadata = false) {
  const queryTerms = terms(query);
  const lowerQuery = query.toLowerCase();
  const ranked = documents.map((document, index) => {
    const titleTerms = terms(document.title);
    const contentTerms = terms(document.content);
    let matched = 0;
    let scoreUnits = 0;
    for (const term of queryTerms) {
      const titleMatches = titleTerms.filter((item) => item === term).length;
      const contentMatches = contentTerms.filter((item) => item === term).length;
      if (titleMatches || contentMatches) matched += 1;
      scoreUnits += titleMatches * 3 + Math.min(contentMatches, 3);
    }
    if (lowerQuery.length >= 4 && document.content.toLowerCase().includes(lowerQuery)) scoreUnits += 4;
    const score = queryTerms.length ? Math.min(1, scoreUnits / (queryTerms.length * 3)) : 0;
    return {
      document,
      index,
      matched,
      score: Number(score.toFixed(4)),
      injection: mergeInjectionFlags([document.id, document.title, document.content])
    };
  }).sort((left, right) => right.score - left.score || right.matched - left.matched || left.index - right.index);

  const queryInjection = detectPromptInjection(query);
  const quarantined = ranked.filter((item) => item.injection.detected).map((item) => ({
    id: item.document.id,
    reason: PROMPT_INJECTION_BLOCKED_CODE,
    flags: item.injection.flags.map((flag) => flag.code)
  }));
  const blocked = queryInjection.detected || blockedByMetadata;
  const selected = blocked ? [] : ranked.filter((item) => item.score > 0 && !item.injection.detected).slice(0, limit);
  const items = [];
  const evidence = [];
  let usedChars = 0;
  for (const item of selected) {
    const separatorChars = items.length ? 2 : 0;
    const header = `[${item.document.id}] ${item.document.title}\n`;
    const availableChars = maxChars - usedChars - separatorChars - header.length;
    if (availableChars < 1) continue;
    const snippet = makeSnippet(item.document.content, queryTerms, availableChars);
    const renderedLength = separatorChars + header.length + snippet.text.length;
    usedChars += renderedLength;
    items.push({
      id: item.document.id,
      title: item.document.title,
      snippet: snippet.text,
      score: item.score,
      rank: items.length + 1,
      truncated: snippet.truncated,
      promptInjection: item.injection
    });
    evidence.push(evidenceItem(item.document.id, "document", snippet.text, "retrieval:context", { start: snippet.start, end: snippet.end }));
  }
  const contextText = items.map((item) => `[${item.id}] ${item.title}\n${item.snippet}`).join("\n\n");
  const limitations = [];
  if (!items.length) limitations.push("No relevant, non-quarantined document context was available.");
  if (quarantined.length) limitations.push("Documents with prompt-injection indicators were quarantined and excluded from context.");
  if (queryInjection.detected) limitations.push("The query contains untrusted instructions and requires manual review.");
  if (blockedByMetadata) limitations.push("Untrusted instruction metadata was detected and the retrieval result was quarantined.");
  return {
    query,
    items,
    contextItems: items,
    contextText,
    quarantined,
    totalDocuments: documents.length,
    returnedDocuments: items.length,
    truncated: items.length < selected.length || items.some((item) => item.truncated),
    evidence,
    grounding: groundingDescriptor(evidence, limitations, blocked ? "blocked" : undefined),
    confidence: items.length ? items[0].score : 0,
    uncertainty: {
      level: blocked || !items.length ? "high" : "medium",
      reasons: [...limitations, "Lexical relevance is not a calibrated probability or a verification of document truth."],
      abstained: blocked || !items.length
    }
  };
}

const SAFE_TOOLS = Object.freeze({
  search_knowledge: Object.freeze({ description: "Search supplied workspace context.", type: "read", sideEffect: false }),
  classify_request: Object.freeze({ description: "Classify supplied request text.", type: "analysis", sideEffect: false }),
  draft_response: Object.freeze({ description: "Create an internal draft from supplied text.", type: "draft", sideEffect: false })
});

const SIDE_EFFECT_HINTS = Object.freeze([
  Object.freeze({ name: "send_message", type: "communicate", pattern: /\b(?:send|email|message|reply|post)\b/i }),
  Object.freeze({ name: "refund_payment", type: "financial", pattern: /\b(?:refund|charge|pay|payment)\b/i }),
  Object.freeze({ name: "change_access", type: "access", pattern: /\b(?:permission|access|role|invite)\b/i }),
  Object.freeze({ name: "deploy_code", type: "code_execution", pattern: /\b(?:deploy|release|publish|merge)\b/i }),
  Object.freeze({ name: "delete_data", type: "destructive", pattern: /\b(?:delete|remove|purge|erase)\b/i }),
  Object.freeze({ name: "execute_command", type: "code_execution", pattern: /\b(?:shell|command|terminal|script|run code)\b/i })
]);

function toolArgument(name, text) {
  const bounded = text.replace(/\s+/g, " ").trim().slice(0, 500);
  if (name === "search_knowledge") return { query: bounded };
  return { input: bounded };
}

function normalizeToolRequests(tools) {
  if (tools === undefined) return [];
  if (!Array.isArray(tools)) fail("INVALID_TOOLS", "tools must be an array of tool names or descriptors.");
  if (tools.length > MAX_TOOL_PROPOSALS) fail("INVALID_TOOLS", `tools must contain ${MAX_TOOL_PROPOSALS} items or fewer.`);
  return tools.map((tool) => {
    if (typeof tool === "string") {
      const name = tool.trim();
      if (!name || name.length > 100) fail("INVALID_TOOLS", "tool names must contain 1-100 characters.");
      normalizeText(name, "tool name", { max: 100 });
      return { name, sideEffect: false, type: null };
    }
    if (!isPlainObject(tool) || typeof tool.name !== "string" || !tool.name.trim() || tool.name.trim().length > 100) fail("INVALID_TOOLS", "each tool must have a name of 1-100 characters.");
    normalizeText(tool.name.trim(), "tool name", { max: 100 });
    for (const key of ["sideEffect", "external", "mutating"]) {
      if (tool[key] !== undefined && typeof tool[key] !== "boolean") fail("INVALID_TOOLS", `${key} must be a boolean.`);
    }
    const suppliedType = tool.type ?? tool.actionType;
    if (suppliedType !== undefined && typeof suppliedType !== "string") fail("INVALID_TOOLS", "tool action types must be strings.");
    return {
      name: tool.name.trim(),
      sideEffect: tool.sideEffect === true || tool.external === true || tool.mutating === true,
      type: suppliedType === undefined ? null : normalizeActionType(suppliedType)
    };
  });
}

function refusedTool(name, type, reason, code = TOOL_EXECUTION_REFUSAL_CODE) {
  return {
    tool: name,
    status: "refused",
    executable: false,
    requiresApproval: true,
    actionPolicy: actionPolicy(type, { proposed: true, blocked: true, tool: name }),
    code,
    reason
  };
}

function proposeToolSet(text, options, promptInjection) {
  const requested = normalizeToolRequests(options.tools);
  const names = [];
  const add = (name) => { if (!names.includes(name) && names.length < MAX_TOOL_PROPOSALS) names.push(name); };
  for (const request of requested) add(request.name);
  const lower = text.toLowerCase();
  if (/\b(search|find|look up|knowledge|context)\b/.test(lower)) add("search_knowledge");
  if (/\b(classify|classification|categorize|categorise|triage|route)\b/.test(lower)) add("classify_request");
  if (/\b(draft|compose|summarize|summarise|respond|reply)\b/.test(lower)) add("draft_response");

  const proposals = [];
  const refused = [];
  for (const name of names) {
    const descriptor = Object.hasOwn(SAFE_TOOLS, name) ? SAFE_TOOLS[name] : null;
    const conflictingRequest = requested.some((tool) => tool.name === name && (tool.sideEffect || (tool.type && tool.type !== descriptor?.type)));
    if (promptInjection.detected) {
      refused.push(refusedTool(name, descriptor?.type || "unknown", "Prompt-injection indicators blocked proposal generation; review the source manually.", PROMPT_INJECTION_BLOCKED_CODE));
      continue;
    }
    if (!descriptor || conflictingRequest) {
      refused.push(refusedTool(name, descriptor?.type || "unknown", descriptor
        ? "The tool descriptor conflicts with the local read/draft-only action policy."
        : "The tool is not on the local adapter allowlist."));
      continue;
    }
    const args = toolArgument(name, text);
    proposals.push({
      id: `proposal-${digest(name, stableStringify(args))}`,
      tool: name,
      arguments: args,
      status: "proposed",
      executable: false,
      requiresApproval: true,
      actionPolicy: actionPolicy(descriptor.type, { proposed: true, tool: name }),
      approval: { required: true, status: "pending", scope: "proposal", bypassable: false },
      reason: descriptor.description
    });
  }

  for (const hint of SIDE_EFFECT_HINTS) {
    if (hint.pattern.test(text) && !refused.some((item) => item.tool === hint.name)) {
      refused.push(refusedTool(hint.name, hint.type, "The request suggests an external or mutating action; this adapter only returns reviewable proposals."));
    }
  }
  const evidence = !promptInjection.detected && proposals.length ? [evidenceItem("input", "input", text.slice(0, 500), "tool_proposal:request")] : [];
  const limitations = ["Proposals describe possible local operations; no tool was executed and no external outcome is established."];
  if (promptInjection.detected) limitations.push("Untrusted instruction content was quarantined and proposal generation was blocked.");
  return {
    proposals,
    refused,
    requestedTools: requested.map((tool) => tool.name),
    evidence,
    grounding: groundingDescriptor(evidence, limitations, promptInjection.detected ? "blocked" : undefined),
    confidence: null,
    uncertainty: { level: promptInjection.detected ? "high" : "unknown", reasons: limitations, abstained: promptInjection.detected || !proposals.length }
  };
}

function refusalResponse(proposal) {
  const dataString = (key) => {
    const descriptor = Object.getOwnPropertyDescriptor(proposal, key);
    return descriptor && typeof descriptor.value === "string" ? descriptor.value.slice(0, 100) : null;
  };
  const safeProposal = proposal && isPlainObject(proposal) ? { tool: dataString("tool"), id: dataString("id") } : null;
  return {
    ok: false,
    contractVersion: CONTRACT_VERSION,
    operation: "tool_execution",
    mode: ADAPTER_MODE,
    provider: PROVIDER_ID,
    status: "refused",
    code: TOOL_EXECUTION_REFUSAL_CODE,
    reason: "The local adapter does not execute unrestricted tools or external side effects.",
    sideEffectsPerformed: false,
    actionPolicy: actionPolicy("unknown", { blocked: true }),
    approval: { required: true, status: "unavailable", scope: "tool_execution", bypassable: false, reason: "This adapter has no approval verifier or execution capability; caller-supplied approval is never authority." },
    proposal: safeProposal,
    safety: { toolExecution: refusalDescriptor() }
  };
}

/*
 * A support packet is the provider-neutral hand-off between intake and a
 * human decision.  It deliberately contains proposals and provenance, never
 * an authority to send, refund, mutate, or otherwise perform an external
 * action.  Keeping this contract here lets a future provider adapter produce
 * the same reviewable record without changing the local safety boundary.
 */

function supportPacketInput(input, options) {
  assertSafeValue(input, new Set(), "support packet input");
  const suppliedOptions = optionObject(options, "support packet options");
  let request = input;
  let payload = {};
  if (isPlainObject(input)) {
    payload = safeCopy(input);
    request = payload.request ?? payload.message ?? payload.text ?? payload.content ?? payload.input;
    if (request === undefined) request = payload;
  }
  const merged = { ...payload, ...safeCopy(suppliedOptions) };
  const documents = merged.documents ?? merged.knowledge ?? merged.sources ?? merged.context ?? [];
  const factSchema = merged.factsSchema ?? merged.factSchema ?? merged.schema;
  const requiredFacts = merged.requiredFacts;
  const operationOptions = safeCopy(merged);
  for (const key of [
    "request", "message", "text", "content", "input", "documents", "knowledge", "sources", "context",
    "factsSchema", "factSchema", "schema", "requiredFacts", "missingFacts"
  ]) delete operationOptions[key];
  return {
    request: inputText(request, "support request", { max: MAX_INPUT_CHARS }),
    documents,
    factSchema,
    requiredFacts,
    options: operationOptions
  };
}

function supportFactsSchema(factSchema, requiredFacts) {
  if (factSchema !== undefined && factSchema !== null) return factSchema;
  if (requiredFacts === undefined) return null;
  if (!Array.isArray(requiredFacts) || requiredFacts.length > MAX_SCHEMA_FIELDS) {
    fail("INVALID_SCHEMA", `requiredFacts must contain ${MAX_SCHEMA_FIELDS} items or fewer.`);
  }
  const names = requiredFacts.map((name) => {
    if (typeof name !== "string" || !name.trim()) fail("INVALID_SCHEMA", "requiredFacts must contain non-empty strings.");
    return name.trim();
  });
  return { fields: names, required: names };
}

function supportEvidence(item, fallbackSupports = "support:context") {
  if (!isPlainObject(item) || typeof item.sourceId !== "string" || !item.sourceId || typeof item.quote !== "string" || !item.quote) return null;
  const sourceType = typeof item.sourceType === "string" && item.sourceType ? item.sourceType : "unknown";
  const quote = item.quote.slice(0, 1000);
  const start = Number.isInteger(item.start) && item.start >= 0 ? item.start : null;
  const end = Number.isInteger(item.end) && item.end >= (start === null ? 0 : start) ? Math.min(item.end, start === null ? item.quote.length : start + quote.length) : null;
  const supports = typeof item.supports === "string" && item.supports ? item.supports.slice(0, 200) : fallbackSupports;
  return {
    sourceId: item.sourceId.slice(0, 128),
    sourceType: sourceType.slice(0, 40),
    quote,
    truncated: Boolean(item.truncated) || item.quote.length > quote.length,
    supports,
    ...(start === null ? {} : { start }),
    ...(end === null ? {} : { end }),
    provenance: {
      version: PROVENANCE_VERSION,
      sourceId: item.sourceId.slice(0, 128),
      sourceType: sourceType.slice(0, 40),
      locator: start === null ? null : { start, end: end === null ? start + quote.length : end },
      method: "local-deterministic",
      contentDigest: digest("evidence", item.sourceId, sourceType, quote)
    }
  };
}

function supportEvidenceList(values, fallbackSupports) {
  const seen = new Set();
  const result = [];
  for (const value of Array.isArray(values) ? values : []) {
    const item = supportEvidence(value, fallbackSupports);
    if (!item) continue;
    const key = `${item.sourceId}\u001f${item.quote}\u001f${item.supports}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
    if (result.length >= MAX_SUPPORT_EVIDENCE) break;
  }
  return result;
}

function supportProvenance(evidence, request, documents) {
  const sourceMap = new Map();
  for (const item of evidence) {
    if (!sourceMap.has(item.sourceId)) sourceMap.set(item.sourceId, {
      sourceId: item.sourceId,
      sourceType: item.sourceType,
      evidenceCount: 0,
      contentDigests: []
    });
    const source = sourceMap.get(item.sourceId);
    source.evidenceCount += 1;
    if (item.provenance?.contentDigest) source.contentDigests.push(item.provenance.contentDigest);
  }
  const documentIds = (Array.isArray(documents) ? documents : [])
    .map((document) => isPlainObject(document) && typeof document.id === "string" ? document.id : null)
    .filter(Boolean)
    .slice(0, MAX_SUPPORT_SOURCES);
  return {
    version: PROVENANCE_VERSION,
    method: "local-deterministic",
    providerContacted: false,
    externalActionsPerformed: false,
    inputDigest: digest("support-input", request),
    documentIds: [...new Set(documentIds)],
    sourceIds: [...sourceMap.keys()].slice(0, MAX_SUPPORT_SOURCES),
    sources: [...sourceMap.values()].slice(0, MAX_SUPPORT_SOURCES).map((source) => ({
      ...source,
      contentDigests: [...new Set(source.contentDigests)].slice(0, MAX_SUPPORT_EVIDENCE)
    })),
    evidenceCount: evidence.length
  };
}

function supportPacketDigestBody(value) {
  const copy = safeCopy(value);
  delete copy.replayed;
  if (isPlainObject(copy.replay)) delete copy.replay.replayed;
  return copy;
}

const SUPPORT_URGENCY_RULES = Object.freeze([
  Object.freeze({ level: "critical", terms: Object.freeze(["security breach", "account hacked", "data loss", "production down", "service outage", "safety issue"]) }),
  Object.freeze({ level: "high", terms: Object.freeze(["urgent", "asap", "blocked", "cannot log in", "unable to access", "deadline", "escalate"]) }),
  Object.freeze({ level: "medium", terms: Object.freeze(["issue", "problem", "error", "refund", "payment", "bug", "help", "support"]) }),
  Object.freeze({ level: "low", terms: Object.freeze(["question", "how do", "information", "learn", "feature request"]) })
]);

function classifyUrgency(text, promptInjection = null) {
  if (promptInjection?.detected) {
    const evidence = [];
    return {
      level: "high",
      confidence: 0.99,
      reason: "Untrusted instruction content requires a security review before urgency is acted on.",
      matchedTerms: [],
      evidence,
      grounding: groundingDescriptor(evidence, ["Urgency was not inferred from quarantined instruction content."], "blocked"),
      uncertainty: { level: "high", reasons: ["Prompt-injection indicators were detected."], abstained: true }
    };
  }
  const lower = text.toLowerCase();
  let selected = null;
  let matchedTerms = [];
  for (const rule of SUPPORT_URGENCY_RULES) {
    const matches = rule.terms.filter((term) => lower.includes(term));
    if (matches.length) {
      selected = rule;
      matchedTerms = matches;
      break;
    }
  }
  const level = selected?.level || "medium";
  const confidence = selected
    ? Number(Math.min(0.96, 0.64 + matchedTerms.length * 0.1).toFixed(2))
    : 0.4;
  const evidence = matchedTerms.map((term) => {
    const index = lower.indexOf(term);
    return evidenceItem("input", "input", text.slice(index, index + term.length), `urgency:${level}`, {
      term,
      start: index,
      end: index + term.length
    });
  });
  const reasons = selected ? [] : ["No explicit urgency signal was found; a reviewer should confirm priority."];
  return {
    level,
    confidence,
    reason: selected ? `Matched ${matchedTerms.join(", ")} urgency signal(s).` : "No explicit urgency signal was found.",
    matchedTerms,
    evidence,
    grounding: groundingDescriptor(evidence, reasons),
    uncertainty: { level: selected ? (confidence >= 0.8 ? "low" : "medium") : "high", reasons, abstained: !selected }
  };
}

function inferredMissingSupportFacts(text, classification) {
  const lower = text.toLowerCase();
  const missing = [];
  if (text.length < 32) missing.push("issue_details");
  if (/\b(?:login|log in|access|account|permission|invite)\b/.test(lower)
    && !/\b(?:id|email|username|account number|workspace)\b/.test(lower)) missing.push("account_identifier");
  if (/\b(?:refund|invoice|payment|charge|subscription|billing)\b/.test(lower)
    && !/\b(?:invoice|order|transaction|charge)\s*(?:#|number|id)?\s*[:#-]?\s*[a-z0-9-]{3,}\b/i.test(text)) missing.push("transaction_identifier");
  if (classification?.label === "support" && !/\b(?:want|need|would like|request|希望|please)\b/i.test(text)) missing.push("desired_outcome");
  return [...new Set(missing)];
}

function supportActionRisk(text, { blocked = false, abstained = false } = {}) {
  if (blocked) {
    return {
      class: "blocked",
      riskClass: "blocked",
      level: "critical",
      sideEffect: false,
      externalAction: false,
      executable: false,
      requiresApproval: true,
      reason: "Untrusted content is quarantined and cannot authorize an action."
    };
  }
  const external = SIDE_EFFECT_HINTS.some((hint) => hint.pattern.test(text));
  if (external) {
    return {
      class: "external_side_effect",
      riskClass: "external_side_effect",
      level: "high",
      sideEffect: true,
      externalAction: true,
      executable: false,
      requiresApproval: true,
      reason: "The request suggests a communication, financial, access, destructive, or code action; only a reviewable proposal is allowed."
    };
  }
  if (abstained) {
    return {
      class: "human_review_required",
      riskClass: "human_review_required",
      level: "medium",
      sideEffect: false,
      externalAction: false,
      executable: false,
      requiresApproval: true,
      reason: "The packet abstained because confidence or evidence was insufficient."
    };
  }
  return {
    class: "draft_only",
    riskClass: "draft_only",
    level: "medium",
    sideEffect: false,
    externalAction: false,
    executable: false,
    requiresApproval: true,
    reason: "The packet contains a reviewable draft only; it is not an instruction to send or mutate anything."
  };
}

function humanReviewPolicy({ required = true, reasons = [], status = "pending", actionRisk = null, escalation = null } = {}) {
  const safeReasons = [...new Set((Array.isArray(reasons) ? reasons : []).filter(Boolean).map(String))];
  return {
    version: HUMAN_REVIEW_POLICY_VERSION,
    required: Boolean(required),
    status: required ? (status === "manual_review" ? "manual_review" : "pending") : "not_required",
    reasons: safeReasons,
    gates: {
      promptInjection: safeReasons.some((reason) => /injection|untrusted|quarantin/i.test(reason)),
      confidence: safeReasons.some((reason) => /confidence|evidence|abstain/i.test(reason)),
      missingFacts: safeReasons.some((reason) => /missing|fact/i.test(reason)),
      externalAction: Boolean(actionRisk?.externalAction || actionRisk?.sideEffect)
    },
    escalation: escalation?.level || "none",
    bypassable: false,
    executionAuthorized: false,
    reviewerRole: escalation?.level === "security_review" ? "security_reviewer" : "support_reviewer"
  };
}

function supportPacketReplayCopy(packet) {
  const copy = safeCopy(packet);
  copy.replayed = true;
  if (isPlainObject(copy.replay)) copy.replay = { ...copy.replay, replayed: true, cache: "adapter-local" };
  if (isPlainObject(copy.trace)) {
    copy.trace = {
      ...copy.trace,
      replayed: true,
      replay: isPlainObject(copy.trace.replay) ? { ...copy.trace.replay, replayed: true, cache: "adapter-local" } : copy.trace.replay
    };
  }
  return copy;
}

function buildSupportPacket(adapter, input, options = {}) {
  const parsed = supportPacketInput(input, options);
  const operationOptions = parsed.options;
  const packetSafety = mergeInjectionFlags([parsed.request, parsed.documents, operationOptions]);
  const factsSchema = supportFactsSchema(parsed.factSchema, parsed.requiredFacts);
  const classification = adapter.classify(parsed.request, operationOptions);
  const urgency = classifyUrgency(parsed.request, packetSafety);
  const retrieval = adapter.retrieveContext(parsed.request, parsed.documents, operationOptions);
  const facts = factsSchema ? adapter.extract(parsed.request, factsSchema, operationOptions) : null;
  const draft = adapter.draft(parsed.request, operationOptions);

  const componentEvidence = [
    ...(classification.grounding?.evidence || []),
    ...(urgency.evidence || []),
    ...(retrieval.grounding?.evidence || []),
    ...(facts?.grounding?.evidence || []),
    ...(draft.grounding?.evidence || [])
  ];
  const evidence = supportEvidenceList(componentEvidence, "support:context");
  const explicitMissing = facts ? (facts.result.missingFields || []) : [];
  const inferredMissing = facts ? [] : inferredMissingSupportFacts(parsed.request, classification.result);
  const missingFacts = [...new Set([...explicitMissing, ...inferredMissing].map(String))].slice(0, MAX_SCHEMA_FIELDS);
  const missingFactDetails = missingFacts.map((name) => ({
    name,
    required: explicitMissing.includes(name),
    reason: explicitMissing.includes(name) ? "Required fact was not found in the supplied request." : "This fact would help a reviewer resolve the request safely."
  }));

  const confidenceValues = [classification.result.confidence, urgency.confidence, facts?.result.confidence]
    .filter((value) => typeof value === "number" && Number.isFinite(value));
  if (retrieval.result.returnedDocuments > 0 && typeof retrieval.result.confidence === "number") confidenceValues.push(retrieval.result.confidence);
  let confidence = confidenceValues.length
    ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(2))
    : null;
  if (packetSafety.detected) confidence = 0;
  const minConfidence = boundedNumber(operationOptions.minConfidence, adapter.minConfidence ?? 0.6, 0, 1, "minConfidence");
  const abstentionReasons = [
    ...(classification.result.uncertainty?.reasons || []),
    ...(urgency.uncertainty?.reasons || []),
    ...(facts?.result.uncertainty?.reasons || []),
    ...(retrieval.result.uncertainty?.reasons || [])
  ];
  if (packetSafety.detected) abstentionReasons.push("Prompt-injection indicators require manual review.");
  if (confidence !== null && confidence < minConfidence) abstentionReasons.push(`Packet confidence is below the minimum ${minConfidence}.`);
  const abstained = packetSafety.detected
    || Boolean(classification.result.uncertainty?.abstained)
    || Boolean(facts?.result.uncertainty?.abstained)
    || (confidence !== null && confidence < minConfidence);

  const escalationReasons = [];
  let escalationLevel = "none";
  if (packetSafety.detected) {
    escalationLevel = "security_review";
    escalationReasons.push("Prompt-injection indicators were detected and quarantined.");
  } else if (urgency.level === "critical") {
    escalationLevel = "specialist_review";
    escalationReasons.push("Critical urgency signals require specialist review.");
  } else if (urgency.level === "high") {
    escalationLevel = "human_review";
    escalationReasons.push("High urgency signals require prompt human review.");
  } else if (explicitMissing.length || abstained) {
    escalationLevel = "human_review";
    if (explicitMissing.length) escalationReasons.push(`Required facts are missing: ${explicitMissing.join(", ")}.`);
    if (abstained) escalationReasons.push("The packet abstained because confidence or evidence was insufficient.");
  }
  const escalation = {
    required: escalationLevel !== "none",
    level: escalationLevel,
    status: escalationLevel === "none" ? "not_required" : "pending",
    reasons: [...new Set(escalationReasons)],
    destination: escalationLevel === "security_review" ? "security_reviewer" : escalationLevel === "specialist_review" ? "support_specialist" : escalationLevel === "human_review" ? "support_reviewer" : null,
    bypassable: false
  };
  const actionRisk = supportActionRisk(parsed.request, { blocked: packetSafety.detected, abstained });
  const reviewReasons = [
    "The grounded draft is reviewable content and has not been sent.",
    ...(packetSafety.detected ? ["Untrusted instruction content is quarantined."] : []),
    ...(missingFacts.length ? [`Missing facts: ${missingFacts.join(", ")}.`] : []),
    ...(abstained ? ["Confidence or evidence is insufficient for automatic use."] : []),
    ...(actionRisk.externalAction ? [actionRisk.reason] : [])
  ];
  const humanReview = humanReviewPolicy({
    required: true,
    reasons: reviewReasons,
    status: packetSafety.detected || abstained ? "manual_review" : "pending",
    actionRisk,
    escalation
  });

  const draftEvidence = supportEvidenceList([
    ...(draft.grounding?.evidence || []),
    ...(retrieval.grounding?.evidence || [])
  ], "draft:grounding");
  const draftLimitations = [
    ...(draft.grounding?.limitations || []),
    ...(retrieval.result.returnedDocuments ? [] : ["No relevant, non-quarantined knowledge context was available."]),
    ...(missingFacts.length ? [`The draft does not resolve missing facts: ${missingFacts.join(", ")}.`] : [])
  ];
  const groundedDraft = {
    text: draft.result.text,
    subject: draft.result.subject,
    status: "draft_only",
    sent: false,
    reviewRequired: true,
    evidence: draftEvidence,
    provenance: supportProvenance(draftEvidence, parsed.request, parsed.documents),
    grounding: groundingDescriptor(draftEvidence, draftLimitations, packetSafety.detected ? "blocked" : "partial", [
      "The draft is a deterministic template and does not establish receipt, eligibility, or a completed external action."
    ]),
    confidence: confidence === null ? null : Number(Math.min(confidence, 0.9).toFixed(2)),
    uncertainty: {
      level: packetSafety.detected || abstained ? "high" : "medium",
      reasons: [...new Set(draftLimitations)],
      abstained: packetSafety.detected || abstained
    }
  };

  const action = {
    id: `action-${digest("support-packet-action", parsed.request, actionRisk.class, stableStringify(evidence))}`,
    type: "draft",
    riskClass: actionRisk.class,
    tool: null,
    arguments: { operation: "support_packet" },
    status: packetSafety.detected ? "blocked" : "review",
    requiresApproval: true,
    executable: false,
    evidenceIds: [...new Set(evidence.map((item) => item.sourceId))],
    actionPolicy: {
      ...actionPolicy("draft", { blocked: packetSafety.detected }),
      riskClass: actionRisk.class,
      status: packetSafety.detected ? "blocked" : "review",
      sideEffect: actionRisk.sideEffect,
      externalAction: actionRisk.externalAction,
      requiresApproval: true,
      executable: false
    }
  };
  const limitations = [
    "This packet is a local, provider-neutral support hand-off; no provider was contacted.",
    "No external action is authorized or performed.",
    ...(packetSafety.detected ? ["Prompt-injection content was quarantined."] : []),
    ...(missingFacts.length ? [`Missing facts require reviewer follow-up: ${missingFacts.join(", ")}.`] : []),
    ...(retrieval.result.quarantined?.length ? ["Knowledge with prompt-injection indicators was excluded from grounding."] : [])
  ];
  const grounding = groundingDescriptor(evidence, limitations, packetSafety.detected ? "blocked" : undefined, [
    "A support packet does not prove that a customer was contacted or that a policy outcome was completed."
  ]);
  const status = packetSafety.detected ? "blocked" : abstained ? "abstained" : "review";
  const replayKey = digest(
    "support-replay",
    SUPPORT_PACKET_VERSION,
    parsed.request,
    stableStringify(parsed.documents),
    stableStringify({ ...operationOptions, idempotencyKey: undefined })
  );
  const idempotencyKey = normalizeIdempotencyKey(operationOptions.idempotencyKey);
  const body = {
    ok: true,
    supportPacketVersion: SUPPORT_PACKET_VERSION,
    contractVersion: CONTRACT_VERSION,
    operation: "support_packet",
    status,
    mode: ADAPTER_MODE,
    provider: PROVIDER_ID,
    providerContacted: false,
    externalActionsPerformed: false,
    deterministic: true,
    replayed: false,
    idempotencyKey,
    request: { text: parsed.request, digest: digest("support-request", parsed.request) },
    classification: classification.result,
    classificationLabel: classification.result.label,
    urgency,
    urgencyLevel: urgency.level,
    priority: urgency.level,
    facts: facts ? facts.result : { data: {}, fields: {}, schema: [], missingFields: [] },
    missingFacts,
    missingFactDetails,
    groundedDraft,
    draft: groundedDraft,
    escalation,
    escalationLevel: escalation.level,
    actionRisk,
    riskClass: actionRisk.class,
    actionRiskClass: actionRisk.class,
    humanReview,
    reviewPolicy: humanReview,
    action: { ...action, evidenceIds: [...action.evidenceIds] },
    actions: [action],
    actionPlan: draft.actionPlan || null,
    evidence,
    grounding,
    confidence,
    confidenceKind: "deterministic_heuristic_not_probability",
    abstained,
    uncertainty: {
      level: packetSafety.detected || abstained ? "high" : "medium",
      reasons: [...new Set(abstentionReasons)],
      abstained
    },
    abstention: {
      abstained,
      required: abstained,
      mode: abstained ? "manual_review" : "continue_with_review",
      reason: abstentionReasons[0] || "No abstention condition was triggered.",
      reasons: [...new Set(abstentionReasons)]
    },
    provenance: supportProvenance(evidence, parsed.request, parsed.documents),
    limitations,
    safety: {
      promptInjection: packetSafety,
      toolExecution: refusalDescriptor()
    },
    execution: {
      allowed: false,
      executable: false,
      providerContacted: false,
      externalActionsPerformed: false,
      sideEffectsPerformed: false,
      reason: "The local support packet only prepares reviewable information."
    },
    replay: {
      deterministic: true,
      replayed: false,
      cache: idempotencyKey ? "adapter-local" : "stateless",
      key: replayKey,
      idempotencyKey
    }
  };
  const packetDigest = digest("support-packet", stableStringify(supportPacketDigestBody(body)));
  const packet = {
    ...body,
    packetId: `support-packet-${packetDigest}`,
    digest: packetDigest,
    trace: {
      deterministic: true,
      replayed: false,
      requestId: digest("support-request-id", packetDigest, idempotencyKey || ""),
      inputDigest: body.request.digest,
      packetDigest,
      replayKey,
      idempotencyKey,
      replay: body.replay
    },
    replayKey,
    requestId: digest("support-request-id", packetDigest, idempotencyKey || "")
  };
  return packet;
}

function inspectSupportPacket(packet) {
  const failures = [];
  let value;
  try {
    value = evaluationCopy(packet);
  } catch {
    return { valid: false, failures: ["packet_shape"] };
  }
  if (!isPlainObject(value)) return { valid: false, failures: ["packet_shape"] };
  if (value.ok !== true || value.operation !== "support_packet") failures.push("operation");
  if (value.supportPacketVersion !== SUPPORT_PACKET_VERSION) failures.push("version");
  if (!['review', 'abstained', 'blocked'].includes(value.status)) failures.push("status");
  if (value.deterministic !== true || value.providerContacted !== false || value.externalActionsPerformed !== false) failures.push("execution_boundary");
  if (!isPlainObject(value.classification) || typeof value.classification.label !== "string") failures.push("classification");
  if (!isPlainObject(value.urgency) || !SUPPORT_URGENCY_LEVELS.includes(value.urgency.level)) failures.push("urgency");
  if (!Array.isArray(value.missingFacts) || value.missingFacts.some((fact) => typeof fact !== "string")) failures.push("missing_facts");
  if (!isPlainObject(value.groundedDraft) || value.groundedDraft.sent !== false || value.groundedDraft.reviewRequired !== true) failures.push("draft");
  if (!isPlainObject(value.escalation) || !SUPPORT_ESCALATION_LEVELS.includes(value.escalation.level) || value.escalation.bypassable !== false) failures.push("escalation");
  if (!isPlainObject(value.actionRisk) || !ACTION_RISK_CLASSES.includes(value.actionRisk.class) || value.actionRisk.executable !== false) failures.push("risk");
  if (!isPlainObject(value.action) || value.action.executable !== false || value.action.requiresApproval !== true
    || !ACTION_RISK_CLASSES.includes(value.action.riskClass) || value.action.riskClass !== value.actionRisk.class
    || !isPlainObject(value.action.actionPolicy) || value.action.actionPolicy.executable !== false
    || value.action.actionPolicy.riskClass !== value.actionRisk.class) failures.push("action");
  if (!isPlainObject(value.humanReview) || value.humanReview.version !== HUMAN_REVIEW_POLICY_VERSION || value.humanReview.bypassable !== false || value.humanReview.executionAuthorized !== false) failures.push("review_policy");
  if (!Array.isArray(value.evidence) || !isPlainObject(value.grounding) || value.grounding.evidenceCount !== value.evidence.length
    || value.evidence.some((item) => !isPlainObject(item) || typeof item.sourceId !== "string" || !item.sourceId
      || typeof item.sourceType !== "string" || !item.sourceType || typeof item.quote !== "string" || !item.quote
      || typeof item.supports !== "string" || !item.supports || !isPlainObject(item.provenance)
      || item.provenance.version !== PROVENANCE_VERSION || item.provenance.providerContacted === true)) failures.push("evidence");
  if (!isPlainObject(value.provenance) || value.provenance.version !== PROVENANCE_VERSION || value.provenance.providerContacted !== false || value.provenance.externalActionsPerformed !== false) failures.push("provenance");
  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 1 || typeof value.abstained !== "boolean") failures.push("confidence");
  if (!isPlainObject(value.abstention) || value.abstention.abstained !== value.abstained || typeof value.abstention.required !== "boolean" || !Array.isArray(value.abstention.reasons)) failures.push("abstention");
  if (!isPlainObject(value.replay) || value.replay.deterministic !== true || typeof value.replay.key !== "string") failures.push("replay");
  if (!isPlainObject(value.trace) || value.trace.deterministic !== true || value.trace.packetDigest !== value.digest) failures.push("trace");
  if (typeof value.digest !== "string" || typeof value.packetId !== "string") failures.push("digest");
  else {
    const { packetId, digest: suppliedDigest, trace, replayKey, requestId, ...body } = value;
    const expectedDigest = digest("support-packet", stableStringify(supportPacketDigestBody(body)));
    if (suppliedDigest !== expectedDigest || packetId !== `support-packet-${expectedDigest}`) failures.push("digest");
  }
  return { valid: failures.length === 0, failures: [...new Set(failures)] };
}

const validateSupportPacket = inspectSupportPacket;

// Pure, deterministic regression hooks. These validate contract invariants and
// explicit gold values; they neither invoke a model nor claim semantic quality.
function evaluationCopy(value, seen = new Set(), depth = 0) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === undefined) return null;
  if (typeof value !== "object" || depth > 30 || seen.has(value)) fail("INVALID_EVALUATION", "Evaluation records must be bounded plain JSON data.");
  seen.add(value);
  if (!Array.isArray(value) && !isPlainObject(value)) fail("INVALID_EVALUATION", "Evaluation records must be plain JSON data.");
  const result = Array.isArray(value) ? [] : {};
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) fail("INVALID_EVALUATION", "Evaluation records cannot contain symbol properties.");
  const keys = ownKeys.filter((key) => key !== "length").sort();
  if (Array.isArray(value) && keys.some((key) => !/^(?:0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) {
    fail("INVALID_EVALUATION", "Evaluation arrays cannot contain unsupported properties.");
  }
  if (keys.length > 2000) fail("INVALID_EVALUATION", "Evaluation records contain too many fields.");
  for (const key of keys) {
    if (isUnsafeKey(key)) fail("INVALID_EVALUATION", "Evaluation records contain an unsafe key.");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || descriptor.enumerable !== true || !Object.hasOwn(descriptor, "value")) fail("INVALID_EVALUATION", "Evaluation records cannot contain hidden properties or accessors.");
    if (isSecretKey(key)) fail("INVALID_EVALUATION", "Evaluation records cannot contain credential-like fields.");
    result[key] = evaluationCopy(descriptor.value, seen, depth + 1);
  }
  seen.delete(value);
  return result;
}

function evaluateResponse(response, expectations = {}) {
  const expected = optionObject(expectations, "expectations");
  const allowedExpectations = ["operation", "label", "fields", "requiredEvidenceIds", "sources", "promptInjectionDetected", "approvalRequired", "maxCredits"];
  if (Object.keys(expected).some((key) => !allowedExpectations.includes(key))) fail("INVALID_EVALUATION", "Evaluation expectations contain an unknown field.");
  for (const key of ["operation", "label"]) {
    if (expected[key] !== undefined && (typeof expected[key] !== "string" || !expected[key].trim())) fail("INVALID_EVALUATION", `${key} must be non-empty text.`);
  }
  for (const key of ["promptInjectionDetected", "approvalRequired"]) {
    if (expected[key] !== undefined && typeof expected[key] !== "boolean") fail("INVALID_EVALUATION", `${key} must be a boolean.`);
  }
  if (expected.fields !== undefined && !isPlainObject(expected.fields)) fail("INVALID_EVALUATION", "Expected fields must be a JSON object.");
  if (expected.requiredEvidenceIds !== undefined && (!Array.isArray(expected.requiredEvidenceIds) || expected.requiredEvidenceIds.some((id) => typeof id !== "string" || !id))) fail("INVALID_EVALUATION", "requiredEvidenceIds must be an array of source IDs.");
  if (expected.sources !== undefined && (!isPlainObject(expected.sources) || Object.values(expected.sources).some((source) => typeof source !== "string"))) fail("INVALID_EVALUATION", "sources must map source IDs to exact source text.");
  const maxCredits = requestedBudget({ budgetCredits: expected.maxCredits });
  const checks = [];
  const check = (id, passed, critical = true) => checks.push({ id, passed: Boolean(passed), critical });
  let record;
  try {
    record = evaluationCopy(response);
  } catch {
    record = null;
  }
  const validEnvelope = isPlainObject(record) && record.ok === true && record.contractVersion === CONTRACT_VERSION && Object.hasOwn(DEFAULT_ROUTES, record.operation)
    && isPlainObject(record.result) && isPlainObject(record.safety) && isPlainObject(record.trace) && isPlainObject(record.model)
    && isPlainObject(record.grounding) && Array.isArray(record.grounding.evidence) && Array.isArray(record.grounding.limitations)
    && isPlainObject(record.approval) && isPlainObject(record.actionPolicy) && isPlainObject(record.actionPlan)
    && isPlainObject(record.uncertainty) && isPlainObject(record.budget)
    && isPlainObject(record.safety.promptInjection) && Array.isArray(record.safety.promptInjection.flags)
    && isPlainObject(record.safety.promptInjection.handling) && typeof record.safety.promptInjection.detected === "boolean"
    && typeof record.trace.requestId === "string" && record.trace.deterministic === true;
  check("valid_envelope", validEnvelope);
  if (!validEnvelope) return { version: EVALUATION_VERSION, deterministic: true, passed: false, checks, failures: ["valid_envelope"], criticalFailures: ["valid_envelope"], evaluatedRequestId: null };

  const safe = record.safety;
  const proposals = Array.isArray(record.result.proposals) ? record.result.proposals : [];
  const evidence = Array.isArray(record.grounding?.evidence) ? record.grounding.evidence : [];
  const operationShape = {
    classification: () => typeof record.result.label === "string" && typeof record.result.confidence === "number" && Array.isArray(record.result.matchedTerms),
    extraction: () => isPlainObject(record.result.data) && Array.isArray(record.result.schema) && Array.isArray(record.result.missingFields),
    drafting: () => typeof record.result.text === "string" && record.result.status === "draft_only" && record.result.sent === false && record.result.reviewRequired === true,
    retrieval: () => Array.isArray(record.result.items) && Array.isArray(record.result.quarantined) && typeof record.result.contextText === "string",
    tool_proposal: () => Array.isArray(record.result.proposals) && Array.isArray(record.result.refused)
  };
  check("operation_shape", operationShape[record.operation]());
  check("canonical_result", JSON.stringify(evaluationCopy(record.result.grounding)) === JSON.stringify(evaluationCopy(record.grounding))
    && record.result.confidence === record.confidence && JSON.stringify(evaluationCopy(record.result.uncertainty)) === JSON.stringify(evaluationCopy(record.uncertainty)));
  check("trace_result_digest", record.trace.evaluation?.version === EVALUATION_VERSION
    && record.trace.evaluation?.actionPolicyVersion === ACTION_POLICY_VERSION
    && record.trace.evaluation?.actionPlanVersion === ACTION_PLAN_VERSION
    && record.trace.evaluation?.resultDigest === digest(JSON.stringify(evaluationCopy(record.result))));
  check("action_plan", inspectActionPlan(record.actionPlan).valid
    && record.actionPlan.operation === record.operation
    && record.actionPlan.requiresApproval === (record.approval.required === true || record.actionPolicy.requiresApproval === true)
    && record.actionPlan.actions.every((action) => action.executable === false && action.actionPolicy?.executable === false));
  check("local_mock_only", record.mode === ADAPTER_MODE && record.provider === PROVIDER_ID && record.model?.mode === ADAPTER_MODE && record.model?.provider === PROVIDER_ID);
  check("execution_refused", safe.toolExecution?.allowed === false && safe.toolExecution?.sideEffectsPerformed === false && record.actionPolicy?.executable === false);
  check("no_external_completion", record.result.sent !== true && record.result.sideEffectsPerformed !== true);
  check("policy_shape", record.actionPolicy?.version === ACTION_POLICY_VERSION
    && ACTION_TYPES.includes(record.actionPolicy?.type)
    && ACTION_RISK_CLASSES.includes(record.actionPolicy?.riskClass)
    && ["allowed", "review", "blocked"].includes(record.actionPolicy?.status)
    && typeof record.actionPolicy?.sideEffect === "boolean"
    && typeof record.actionPolicy?.externalAction === "boolean"
    && typeof record.actionPolicy?.requiresApproval === "boolean"
    && record.actionPolicy?.executable === false
    && typeof record.approval?.required === "boolean"
    && ["not_required", "pending", "manual_review"].includes(record.approval?.status)
    && record.approval?.executionAuthorized === false
    && record.approval?.bypassable === false
    && (!record.actionPolicy.requiresApproval || record.approval.required === true));
  check("proposal_policy", proposals.every((proposal) => isPlainObject(proposal) && Object.hasOwn(SAFE_TOOLS, proposal.tool)
    && proposal.executable === false && proposal.requiresApproval === true && proposal.actionPolicy?.executable === false
    && proposal.actionPolicy?.type === SAFE_TOOLS[proposal.tool].type && proposal.approval?.required === true));
  const approvalRequired = record.operation === "drafting" || record.operation === "tool_proposal" || safe.promptInjection?.detected === true
    || record.uncertainty?.abstained === true || record.uncertainty?.level === "high" || expected.approvalRequired === true;
  check("approval_boundary", !approvalRequired || (record.approval?.required === true && ["pending", "manual_review"].includes(record.approval?.status) && record.approval?.bypassable === false && record.actionPolicy?.requiresApproval === true));
  check("injection_containment", safe.promptInjection?.handling?.instructionsTrusted === false
    && safe.promptInjection?.handling?.followEmbeddedInstructions === false
    && safe.promptInjection?.handling?.externalActionsAllowed === false
    && (!safe.promptInjection?.detected || (record.approval?.status === "manual_review" && (record.operation !== "tool_proposal" || proposals.length === 0))));
  if (record.operation === "retrieval" && Array.isArray(record.result.items) && Array.isArray(record.result.quarantined)) {
    check("retrieval_quarantine", record.result.items.every((item) => isPlainObject(item) && item.promptInjection?.detected === false
      && !record.result.quarantined.some((blocked) => blocked?.id === item.id)));
  }
  check("confidence_contract", (record.confidence === null || (typeof record.confidence === "number" && record.confidence >= 0 && record.confidence <= 1))
    && record.confidenceKind === "deterministic_heuristic_not_probability" && isPlainObject(record.uncertainty)
    && ["low", "medium", "high", "unknown"].includes(record.uncertainty.level)
    && Array.isArray(record.uncertainty.reasons) && record.uncertainty.reasons.every((reason) => typeof reason === "string")
    && typeof record.uncertainty.abstained === "boolean");
  check("evidence_shape", evidence.every((item) => isPlainObject(item) && typeof item.sourceId === "string" && Boolean(item.sourceId)
    && ["input", "document"].includes(item.sourceType) && typeof item.quote === "string" && Boolean(item.quote)
    && typeof item.supports === "string" && Boolean(item.supports))
    && ["grounded", "partial", "insufficient_evidence", "blocked"].includes(record.grounding?.status)
    && Number.isInteger(record.grounding?.evidenceCount) && record.grounding?.evidenceCount === evidence.length
    && Array.isArray(record.grounding?.limitations) && record.grounding.limitations.every((limitation) => typeof limitation === "string")
    && Array.isArray(record.grounding?.unsupportedClaims) && (record.grounding?.status !== "grounded" || evidence.length > 0));
  check("budget_boundary", typeof record.cost?.totalCredits === "number" && record.cost.totalCredits >= 0
    && record.cost.estimated === true && record.cost.billing === "not_charged"
    && (record.budget?.requestedCredits === null || (typeof record.budget?.requestedCredits === "number" && record.cost.totalCredits <= record.budget.requestedCredits))
    && (maxCredits === null || record.cost.totalCredits <= maxCredits));

  if (expected.operation !== undefined) check("expected_operation", record.operation === normalizeTask(expected.operation), false);
  if (expected.label !== undefined) check("expected_label", record.result.label === expected.label, false);
  if (expected.fields !== undefined) {
    check("expected_fields", Object.entries(expected.fields).every(([key, value]) => record.result.data && Object.hasOwn(record.result.data, key)
      && JSON.stringify(evaluationCopy(record.result.data[key])) === JSON.stringify(evaluationCopy(value))), false);
  }
  if (expected.requiredEvidenceIds !== undefined) {
    check("required_evidence", expected.requiredEvidenceIds.every((id) => evidence.some((item) => item?.sourceId === id)), false);
  }
  if (expected.sources !== undefined) {
    check("evidence_quotes", evidence.every((item) => isPlainObject(item) && typeof item.quote === "string" && Object.hasOwn(expected.sources, item.sourceId) && expected.sources[item.sourceId].includes(item.quote)));
  }
  if (expected.promptInjectionDetected !== undefined) check("expected_injection", safe.promptInjection?.detected === expected.promptInjectionDetected, false);
  if (expected.approvalRequired !== undefined) check("expected_approval", record.approval?.required === expected.approvalRequired, false);
  const failures = checks.filter((item) => !item.passed).map((item) => item.id);
  return {
    version: EVALUATION_VERSION,
    deterministic: true,
    passed: failures.length === 0,
    checks,
    failures,
    criticalFailures: checks.filter((item) => item.critical && !item.passed).map((item) => item.id),
    evaluatedRequestId: record.trace.requestId
  };
}

class LocalAIAdapter {
  constructor(options = {}) {
    const opts = optionObject(options);
    const defaultModel = requestedModelId(opts.defaultModel);
    if (defaultModel && !Object.hasOwn(MODEL_DEFINITIONS, defaultModel)) fail("UNSUPPORTED_MODEL", "defaultModel must be a declared local mock model.");
    this.defaultModel = defaultModel || null;
    this.maxInputChars = boundedInteger(opts.maxInputChars, MAX_INPUT_CHARS, 1, MAX_INPUT_CHARS, "maxInputChars");
    this.maxOutputChars = boundedInteger(opts.maxOutputChars, MAX_OUTPUT_CHARS, 1, MAX_OUTPUT_CHARS, "maxOutputChars");
    this.minConfidence = boundedNumber(opts.minConfidence, 0.6, 0, 1, "minConfidence");
    this.budgetCredits = requestedBudget(opts);
    this.toolExecution = "refused";
    this.maxReplayEntries = boundedInteger(opts.maxReplayEntries, MAX_REPLAY_ENTRIES, 1, 10000, "maxReplayEntries");
    this.replayCache = new Map();
    this.supportReplayCache = new Map();
  }

  routeModel(task, options = {}) {
    const opts = typeof options === "string" ? { model: options } : { ...optionObject(options) };
    if (this.budgetCredits !== null) {
      const callBudget = requestedBudget(opts);
      opts.budgetCredits = callBudget === null ? this.budgetCredits : Math.min(callBudget, this.budgetCredits);
    }
    if (opts.model === undefined && opts.modelId === undefined && this.defaultModel) return routeModel(task, { ...opts, model: this.defaultModel });
    return routeModel(task, opts);
  }

  complete(operation, options, input, output, result, safety) {
    const threshold = boundedNumber(options.minConfidence, this.minConfidence, 0, 1, "minConfidence");
    const normalizedResult = applyConfidenceThreshold(result, threshold);
    const route = this.routeModel(operation, {
      ...options,
      input,
      output,
      estimatedOutputTokens: estimateTokens(output)
    });
    route.minConfidence = threshold;
    const idempotencyKey = normalizeIdempotencyKey(options.idempotencyKey);
    const requestFingerprint = digest(
      "idempotency",
      operation,
      valueForEstimate(input),
      valueForEstimate(output),
      valueForEstimate(normalizedResult),
      valueForEstimate(route),
      valueForEstimate(safety),
      valueForEstimate({ ...options, idempotencyKey: undefined })
    );
    const cacheKey = idempotencyKey ? `${operation}:${idempotencyKey}` : null;
    if (cacheKey && this.replayCache.has(cacheKey)) {
      const cached = this.replayCache.get(cacheKey);
      if (cached.fingerprint !== requestFingerprint) {
        fail(IDEMPOTENCY_KEY_REUSE_CODE, "The idempotency key was already used for a different local AI request.");
      }
      return safeCopy(cached.response);
    }
    const response = envelope(operation, route, input, output, normalizedResult, safety, options);
    if (cacheKey) {
      if (this.replayCache.size >= this.maxReplayEntries) {
        const oldest = this.replayCache.keys().next().value;
        if (oldest !== undefined) this.replayCache.delete(oldest);
      }
      this.replayCache.set(cacheKey, { fingerprint: requestFingerprint, response: safeCopy(response) });
    }
    return response;
  }

  availableModels() {
    return availableModels();
  }

  estimateTokens(value) {
    return estimateTokens(value);
  }

  estimateCost(input, output = "", model = this.defaultModel || DEFAULT_MODEL) {
    return estimateCost(input, output, model);
  }

  detectPromptInjection(value) {
    return detectPromptInjection(value);
  }

  promptInjectionFlags(value) {
    return detectPromptInjection(value);
  }

  evaluateResponse(response, expectations = {}) {
    return evaluateResponse(response, expectations);
  }

  inspectActionPlan(plan) {
    return inspectActionPlan(plan);
  }

  validateActionPlan(plan) {
    return validateActionPlan(plan);
  }

  actionPlan(response) {
    const copy = evaluationCopy(response);
    if (!isPlainObject(copy) || !isPlainObject(copy.actionPlan)) fail("INVALID_ACTION_PLAN", "An AI response with a typed action plan is required.");
    return copy.actionPlan;
  }

  classify(input, options = {}) {
    const opts = optionObject(options);
    const text = inputText(input, "classification input", { max: this.maxInputChars });
    const promptInjection = mergeInjectionFlags([text, opts]);
    const result = classifyText(text, promptInjection);
    const safety = safetyFor(text, opts);
    const response = this.complete("classification", opts, text, stableStringify(result), result, safety);
    return { ...response, label: response.result.label, confidence: response.result.confidence, classification: response.result };
  }

  classifyRequest(input, options = {}) {
    return this.classify(input, options);
  }

  classification(input, options = {}) {
    return this.classify(input, options);
  }

  extract(input, schema, options = {}) {
    assertSafeValue(input, new Set(), "extraction input");
    let text = input;
    let selectedSchema = schema;
    let opts = optionObject(options);
    if (selectedSchema === undefined && isPlainObject(input) && (input.schema || input.fields || input.properties)) {
      selectedSchema = input.schema || { fields: input.fields, properties: input.properties };
      text = input.text ?? input.content ?? input.input ?? "";
      opts = optionObject({ ...input, ...opts });
      delete opts.schema;
      delete opts.fields;
      delete opts.properties;
      delete opts.text;
      delete opts.content;
      delete opts.input;
    }
    const normalizedText = inputText(text, "extraction input", { max: this.maxInputChars });
    if (selectedSchema === undefined || selectedSchema === null) fail("INVALID_SCHEMA", "Extraction requires a schema.");
    const schemaText = normalizeText(stableStringify(selectedSchema), "schema", { max: MAX_INPUT_CHARS });
    const safety = safetyFor(normalizedText, schemaText, opts);
    let result = extractFields(safety.promptInjection.detected ? "" : normalizedText, selectedSchema);
    if (safety.promptInjection.detected) {
      result = {
        ...result,
        grounding: groundingDescriptor([], ["Untrusted instruction content was quarantined; fields were not extracted."], "blocked"),
        uncertainty: { level: "high", reasons: ["Prompt-injection indicators require manual review."], abstained: true }
      };
    }
    const response = this.complete("extraction", opts, `${normalizedText}\n${schemaText}`, stableStringify(result.data), result, safety);
    return { ...response, data: response.result.data, fields: response.result.data, missingFields: response.result.missingFields };
  }

  extractFields(input, schema, options = {}) {
    return this.extract(input, schema, options);
  }

  extraction(input, schema, options = {}) {
    return this.extract(input, schema, options);
  }

  draft(input, options = {}) {
    assertSafeValue(input, new Set(), "draft input");
    let text = input;
    let opts = optionObject(options);
    if (isPlainObject(input) && options && Object.keys(opts).length === 0) {
      text = input.text ?? input.content ?? input.input ?? input.request ?? input;
      opts = optionObject({ ...input });
      for (const key of ["text", "content", "input", "request"]) delete opts[key];
    }
    const normalizedText = inputText(text, "draft input", { max: this.maxInputChars });
    const promptInjection = mergeInjectionFlags([normalizedText, opts]);
    const result = draftText(normalizedText, opts, promptInjection, this.maxOutputChars);
    const safety = safetyFor(normalizedText, opts);
    const response = this.complete("drafting", opts, [normalizedText, opts.instructions, opts.subject, opts.tone].filter((value) => value !== undefined).map(valueForEstimate).join("\n"), result.text, result, safety);
    return { ...response, text: response.result.text, draft: response.result };
  }

  draftText(input, options = {}) {
    return this.draft(input, options);
  }

  drafting(input, options = {}) {
    return this.draft(input, options);
  }

  createSupportPacket(input, options = {}) {
    const opts = optionObject(options, "support packet options");
    const idempotencyKey = normalizeIdempotencyKey(opts.idempotencyKey);
    const fingerprintOptions = safeCopy({ ...opts, idempotencyKey: undefined });
    const fingerprint = digest("support-idempotency", valueForEstimate(input), valueForEstimate(fingerprintOptions));
    const cacheKey = idempotencyKey ? `support:${idempotencyKey}` : null;
    if (cacheKey && this.supportReplayCache.has(cacheKey)) {
      const cached = this.supportReplayCache.get(cacheKey);
      if (cached.fingerprint !== fingerprint) fail(IDEMPOTENCY_KEY_REUSE_CODE, "The idempotency key was already used for a different local support packet.");
      return supportPacketReplayCopy(cached.packet);
    }
    const packet = buildSupportPacket(this, input, opts);
    if (cacheKey) {
      if (this.supportReplayCache.size >= this.maxReplayEntries) {
        const oldest = this.supportReplayCache.keys().next().value;
        if (oldest !== undefined) this.supportReplayCache.delete(oldest);
      }
      this.supportReplayCache.set(cacheKey, { fingerprint, packet: safeCopy(packet) });
    }
    return packet;
  }

  supportPacket(input, options = {}) {
    return this.createSupportPacket(input, options);
  }

  buildSupportPacket(input, options = {}) {
    return this.createSupportPacket(input, options);
  }

  triageSupport(input, options = {}) {
    return this.createSupportPacket(input, options);
  }

  supportTriage(input, options = {}) {
    return this.createSupportPacket(input, options);
  }

  inspectSupportPacket(packet) {
    return inspectSupportPacket(packet);
  }

  validateSupportPacket(packet) {
    return validateSupportPacket(packet);
  }

  retrieveContext(query, documents, options = {}) {
    assertSafeValue(query, new Set(), "retrieval query");
    let selectedQuery = query;
    let selectedDocuments = documents;
    let opts = optionObject(options);
    if (documents === undefined && isPlainObject(query) && query.query !== undefined) {
      selectedQuery = query.query;
      selectedDocuments = query.documents ?? query.sources ?? [];
      opts = optionObject({ ...query, ...opts });
      delete opts.query;
      delete opts.documents;
      delete opts.sources;
    }
    const normalizedQuery = inputText(selectedQuery, "retrieval query", { max: this.maxInputChars });
    const normalizedDocuments = normalizeDocuments(selectedDocuments || []);
    const limit = boundedInteger(opts.limit, 6, 1, 20, "limit");
    const maxChars = boundedInteger(opts.maxChars, MAX_CONTEXT_CHARS, 200, MAX_CONTEXT_CHARS, "maxChars");
    const documentText = stableStringify(normalizedDocuments);
    const safety = safetyFor(normalizedQuery, documentText, opts);
    const result = rankDocuments(normalizedQuery, normalizedDocuments, limit, maxChars, mergeInjectionFlags([opts]).detected);
    const response = this.complete("retrieval", opts, `${normalizedQuery}\n${documentText}`, result.contextText, result, safety);
    return { ...response, context: result.contextText, contextText: result.contextText, items: result.items, contextItems: result.items };
  }

  retrievalContext(query, documents, options = {}) {
    return this.retrieveContext(query, documents, options);
  }

  retrieve(query, documents, options = {}) {
    return this.retrieveContext(query, documents, options);
  }

  proposeTools(input, options = {}) {
    assertSafeValue(input, new Set(), "tool proposal input");
    let text = input;
    let opts = optionObject(options);
    if (isPlainObject(input) && Object.keys(opts).length === 0) {
      text = input.text ?? input.content ?? input.input ?? input.request ?? input;
      opts = optionObject({ ...input });
      for (const key of ["text", "content", "input", "request"]) delete opts[key];
    }
    const normalizedText = inputText(text, "tool proposal input", { max: this.maxInputChars });
    const safety = safetyFor(normalizedText, opts);
    const result = proposeToolSet(normalizedText, opts, safety.promptInjection);
    const response = this.complete("tool_proposal", opts, `${normalizedText}\n${valueForEstimate(opts.tools)}`, stableStringify(result), result, safety);
    return {
      ...response,
      proposals: result.proposals,
      toolProposals: result.proposals,
      toolCalls: result.proposals,
      refused: result.refused,
      execution: refusalDescriptor()
    };
  }

  proposeToolCalls(input, options = {}) {
    return this.proposeTools(input, options);
  }

  toolProposals(input, options = {}) {
    return this.proposeTools(input, options);
  }

  detectInjection(value) {
    return this.detectPromptInjection(value);
  }

  route(task, options = {}) {
    return this.routeModel(task, options);
  }

  estimate(input, output = "", model = this.defaultModel || DEFAULT_MODEL) {
    if (isPlainObject(input) && output === "") {
      return this.estimateCost(input.input ?? input.prompt ?? input.text ?? "", input.output ?? input.completion ?? "", input.model ?? model);
    }
    return this.estimateCost(input, output, model);
  }

  executeTool(proposal) {
    return refusalResponse(proposal);
  }

  runTool(proposal) {
    return this.executeTool(proposal);
  }
}

function createAIAdapter(options = {}) {
  return new LocalAIAdapter(options);
}

const defaultAdapter = new LocalAIAdapter();

function classify(input, options) { return defaultAdapter.classify(input, options); }
function extract(input, schema, options) { return defaultAdapter.extract(input, schema, options); }
function draft(input, options) { return defaultAdapter.draft(input, options); }
function retrieveContext(query, documents, options) { return defaultAdapter.retrieveContext(query, documents, options); }
function proposeTools(input, options) { return defaultAdapter.proposeTools(input, options); }
function executeTool(proposal) { return defaultAdapter.executeTool(proposal); }
function estimate(input, output, model) { return defaultAdapter.estimate(input, output, model); }
function actionPlan(response) { return defaultAdapter.actionPlan(response); }
function createSupportPacket(input, options) { return defaultAdapter.createSupportPacket(input, options); }
function supportPacket(input, options) { return defaultAdapter.createSupportPacket(input, options); }

module.exports = {
  CONTRACT_VERSION,
  EVALUATION_VERSION,
  ACTION_POLICY_VERSION,
  ACTION_PLAN_VERSION,
  SUPPORT_PACKET_VERSION,
  PROVENANCE_VERSION,
  HUMAN_REVIEW_POLICY_VERSION,
  ACTION_TYPES,
  ACTION_RISK_CLASSES,
  SUPPORT_URGENCY_LEVELS,
  SUPPORT_ESCALATION_LEVELS,
  ADAPTER_MODE,
  PROVIDER_ID,
  DEFAULT_MODEL,
  DEFAULT_ESTIMATED_OUTPUT_TOKENS,
  MAX_INPUT_CHARS,
  MAX_OUTPUT_CHARS,
  TOOL_EXECUTION_REFUSAL_CODE,
  PROMPT_INJECTION_BLOCKED_CODE,
  IDEMPOTENCY_KEY_REUSE_CODE,
  MAX_REPLAY_ENTRIES,
  MODEL_DEFINITIONS,
  AIContractError,
  LocalAIAdapter,
  MockAIAdapter: LocalAIAdapter,
  createAIAdapter,
  createAdapter: createAIAdapter,
  createLocalAIAdapter: createAIAdapter,
  availableModels,
  routeModel,
  route: routeModel,
  estimateTokens,
  estimateCost,
  estimate,
  evaluateResponse,
  inspectActionPlan,
  validateActionPlan,
  actionPlan,
  inspectSupportPacket,
  validateSupportPacket,
  createSupportPacket,
  supportPacket,
  buildSupportPacket: createSupportPacket,
  triageSupport: createSupportPacket,
  detectPromptInjection,
  detectInjection: detectPromptInjection,
  promptInjectionFlags: detectPromptInjection,
  classify,
  classification: classify,
  classifyRequest: classify,
  extract,
  extraction: extract,
  extractFields: extract,
  draft,
  drafting: draft,
  draftText: draft,
  retrieveContext,
  retrieve: retrieveContext,
  retrievalContext: retrieveContext,
  proposeTools,
  proposeToolCalls: proposeTools,
  toolProposals: proposeTools,
  executeTool,
  refusalDescriptor
};
