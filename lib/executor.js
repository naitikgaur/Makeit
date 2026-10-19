"use strict";

const crypto = require("node:crypto");
const { modelDefinitions } = require("./config");
const {
  ACTION_PLAN_VERSION,
  ACTION_POLICY_VERSION,
  SUPPORT_PACKET_VERSION,
  HUMAN_REVIEW_POLICY_VERSION,
  ACTION_RISK_CLASSES,
  createSupportPacket,
  validateSupportPacket,
  detectPromptInjection
} = require("./ai");

const RECEIPT_VERSION = "1.0";
const LOCAL_MODE = "sandbox";
const LOCAL_PROVIDER = "local-mock";
const MAX_RETRIES = 3;
const MAX_RETRY_BACKOFF_MS = 5000;
const MAX_RECEIPT_STEPS = 24;
const MAX_RECEIPT_EVIDENCE = 24;
const MAX_RECEIPT_TEXT = 50000;
const MAX_RECEIPT_DETAIL = 1000;
const RISK_CLASSES = new Set(ACTION_RISK_CLASSES || [
  "read_only",
  "draft_only",
  "human_review_required",
  "external_side_effect",
  "destructive",
  "blocked"
]);
const ACTION_TYPES = new Set([
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

function stableSerialize(value, seen = new Set()) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (seen.has(value)) return '"[Circular]"';
  seen.add(value);
  let result;
  if (Array.isArray(value)) result = `[${value.map((item) => stableSerialize(item, seen)).join(",")}]`;
  else result = `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key], seen)}`).join(",")}}`;
  seen.delete(value);
  return result;
}

function digest(...parts) {
  return crypto.createHash("sha256").update(parts.map((part) => String(part)).join("\u001f"), "utf8").digest("hex").slice(0, 16);
}

function riskClassForAction(action, { blocked = false, requiresApproval = false } = {}) {
  if (blocked || action?.status === "blocked") return "blocked";
  if (typeof action?.riskClass === "string" && RISK_CLASSES.has(action.riskClass)) return action.riskClass;
  if (action?.actionPolicy?.riskClass && RISK_CLASSES.has(action.actionPolicy.riskClass)) return action.actionPolicy.riskClass;
  if (["destructive", "financial", "access", "communicate", "code_execution", "unknown"].includes(action?.type)) return "external_side_effect";
  if (requiresApproval || action?.type === "draft" || action?.type === "tool_proposal") return "human_review_required";
  if (["analysis", "read"].includes(action?.type)) return "read_only";
  return "draft_only";
}

function normalizedReviewPolicy(plan, riskClasses = []) {
  const requiresApproval = Boolean(plan?.requiresApproval || plan?.approvalStatus === "pending" || plan?.approvalStatus === "manual_review");
  const blocked = plan?.status === "blocked" || riskClasses.includes("blocked");
  const external = riskClasses.includes("external_side_effect") || riskClasses.includes("destructive");
  const reasons = [
    ...(requiresApproval ? ["The local action plan requires human review before use."] : []),
    ...(blocked ? ["The action plan is blocked by the local safety policy."] : []),
    ...(external ? ["The plan contains an external-side-effect risk class and cannot execute in the sandbox."] : [])
  ];
  return {
    version: HUMAN_REVIEW_POLICY_VERSION || "1.0",
    required: requiresApproval || blocked || external,
    status: blocked ? "manual_review" : (requiresApproval || external ? "pending" : "not_required"),
    reasons,
    gates: {
      promptInjection: Boolean(plan?.quarantine),
      confidence: plan?.status === "abstained",
      missingFacts: false,
      externalAction: external
    },
    escalation: blocked ? "security_review" : external ? "specialist_review" : requiresApproval ? "human_review" : "none",
    bypassable: false,
    executionAuthorized: false,
    reviewerRole: blocked ? "security_reviewer" : external ? "support_specialist" : "support_reviewer"
  };
}

function normalizedEvidence(evidence) {
  if (!Array.isArray(evidence)) return [];
  return evidence.slice(0, MAX_RECEIPT_EVIDENCE).map((item) => {
    const sourceId = typeof item?.sourceId === "string" ? item.sourceId.slice(0, 128) : "unknown";
    const sourceType = typeof item?.sourceType === "string" ? item.sourceType.slice(0, 40) : "unknown";
    const quote = typeof item?.quote === "string" ? item.quote.slice(0, 1000) : "";
    const supports = typeof item?.supports === "string" ? item.supports.slice(0, 200) : "";
    if (!quote) return null;
    const provenance = item?.provenance && typeof item.provenance === "object" ? {
      version: typeof item.provenance.version === "string" ? item.provenance.version.slice(0, 20) : "1.0",
      sourceId,
      sourceType,
      method: typeof item.provenance.method === "string" ? item.provenance.method.slice(0, 40) : "local-deterministic",
      contentDigest: typeof item.provenance.contentDigest === "string" ? item.provenance.contentDigest.slice(0, 64) : digest("evidence", sourceId, sourceType, quote),
      locator: item.provenance.locator && typeof item.provenance.locator === "object"
        ? {
            start: Number.isInteger(item.provenance.locator.start) ? Math.max(0, item.provenance.locator.start) : null,
            end: Number.isInteger(item.provenance.locator.end) ? Math.max(0, item.provenance.locator.end) : null
          }
        : null
    } : {
      version: "1.0",
      sourceId,
      sourceType,
      method: "local-deterministic",
      contentDigest: digest("evidence", sourceId, sourceType, quote),
      locator: null
    };
    return {
      sourceId,
      sourceType,
      quote,
      supports,
      ...(item?.truncated === true ? { truncated: true } : {}),
      provenance
    };
  }).filter(Boolean);
}

function supportPacketReceiptSummary(packet) {
  if (!packet || typeof packet !== "object") return null;
  const checked = validateSupportPacket(packet);
  const safe = checked.valid ? packet : null;
  if (!safe) return {
    valid: false,
    version: SUPPORT_PACKET_VERSION || "1.0",
    status: "invalid",
    providerContacted: false,
    externalActionsPerformed: false,
    reason: "The generated support packet failed local contract validation."
  };
  return {
    valid: true,
    version: safe.supportPacketVersion,
    packetId: String(safe.packetId).slice(0, 160),
    digest: String(safe.digest).slice(0, 64),
    status: String(safe.status).slice(0, 30),
    confidence: typeof safe.confidence === "number" ? safe.confidence : null,
    abstained: safe.abstained === true,
    classification: typeof safe.classificationLabel === "string" ? safe.classificationLabel.slice(0, 80) : null,
    urgency: typeof safe.urgencyLevel === "string" ? safe.urgencyLevel.slice(0, 20) : null,
    missingFacts: Array.isArray(safe.missingFacts) ? safe.missingFacts.slice(0, 50).map((value) => String(value).slice(0, 100)) : [],
    escalation: safe.escalation && typeof safe.escalation === "object" ? {
      required: safe.escalation.required === true,
      level: typeof safe.escalation.level === "string" ? safe.escalation.level.slice(0, 30) : "none",
      status: typeof safe.escalation.status === "string" ? safe.escalation.status.slice(0, 30) : "not_required"
    } : null,
    riskClass: safe.actionRisk && typeof safe.actionRisk.class === "string" ? safe.actionRisk.class.slice(0, 40) : "human_review_required",
    evidenceIds: Array.isArray(safe.evidence) ? [...new Set(safe.evidence.map((item) => item?.sourceId).filter((id) => typeof id === "string"))].slice(0, MAX_RECEIPT_EVIDENCE) : [],
    provenance: safe.provenance && typeof safe.provenance === "object" ? {
      version: typeof safe.provenance.version === "string" ? safe.provenance.version.slice(0, 20) : "1.0",
      inputDigest: typeof safe.provenance.inputDigest === "string" ? safe.provenance.inputDigest.slice(0, 64) : null,
      sourceIds: Array.isArray(safe.provenance.sourceIds) ? safe.provenance.sourceIds.slice(0, MAX_RECEIPT_EVIDENCE).map((id) => String(id).slice(0, 128)) : [],
      evidenceCount: Number.isInteger(safe.provenance.evidenceCount) ? safe.provenance.evidenceCount : 0
    } : null,
    providerContacted: false,
    externalActionsPerformed: false
  };
}

function boundedReviewPolicy(policy, fallback) {
  const source = policy && typeof policy === "object" ? policy : fallback;
  const reasons = Array.isArray(source?.reasons) ? source.reasons.slice(0, 12).map((reason) => String(reason).slice(0, 300)) : [];
  const gates = source?.gates && typeof source.gates === "object" ? {
    promptInjection: source.gates.promptInjection === true,
    confidence: source.gates.confidence === true,
    missingFacts: source.gates.missingFacts === true,
    externalAction: source.gates.externalAction === true
  } : { promptInjection: false, confidence: false, missingFacts: false, externalAction: false };
  return {
    version: typeof source?.version === "string" ? source.version.slice(0, 20) : HUMAN_REVIEW_POLICY_VERSION || "1.0",
    required: source?.required === true,
    status: ["not_required", "pending", "manual_review"].includes(source?.status) ? source.status : "manual_review",
    reasons,
    gates,
    escalation: typeof source?.escalation === "string" ? source.escalation.slice(0, 40) : "human_review",
    bypassable: false,
    executionAuthorized: false,
    reviewerRole: typeof source?.reviewerRole === "string" ? source.reviewerRole.slice(0, 60) : "support_reviewer"
  };
}

function boundedQuarantine(quarantine) {
  if (!quarantine || typeof quarantine !== "object") return null;
  const result = {};
  for (const key of ["status", "reason"]) {
    if (typeof quarantine[key] === "string") result[key] = quarantine[key].slice(0, 100);
  }
  for (const key of ["flags", "inputFlags"]) {
    if (Array.isArray(quarantine[key])) result[key] = quarantine[key].slice(0, 24).map((flag) => String(flag).slice(0, 80));
  }
  if (Array.isArray(quarantine.documents)) {
    result.documents = quarantine.documents.slice(0, 24).map((document) => ({
      id: String(document?.id || "unknown").slice(0, 128),
      flags: Array.isArray(document?.flags) ? document.flags.slice(0, 24).map((flag) => String(flag).slice(0, 80)) : []
    }));
  }
  return result;
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function sleepTick() {
  return new Promise((resolve) => setImmediate(resolve));
}

function sleep(ms, signal) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let timer;
    const onAbort = () => {
      clearTimeout(timer);
      const error = new Error("The bounded retry delay was aborted.");
      error.code = "RUN_TIMEOUT";
      error.retryable = false;
      reject(error);
    };
    timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function timeoutError() {
  const error = new Error("The bounded run timed out.");
  error.code = "RUN_TIMEOUT";
  error.retryable = true;
  return error;
}

function providerError(message, code = "PROVIDER_ERROR") {
  const error = new Error(message);
  error.code = code;
  error.retryable = !new Set(["MODEL_NOT_CONFIGURED", "BUDGET_EXCEEDED", "WORKFLOW_MISSING", "POLICY_BLOCKED", "LIVE_PROVIDER_DISABLED", "PROVIDER_EMPTY"]).has(code);
  return error;
}

async function withTimeout(promiseFactory, timeoutMs) {
  if (typeof promiseFactory !== "function") throw new TypeError("promiseFactory must be a function");
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 120000) throw new TypeError("timeoutMs must be an integer from 1 to 120000");
  const controller = new AbortController();
  let timer;
  let settled = false;
  let timedOut = false;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      if (!settled) {
        timedOut = true;
        controller.abort();
        reject(timeoutError());
      }
    }, timeoutMs);
  });
  const operation = Promise.resolve()
    .then(() => promiseFactory(controller.signal))
    .catch((error) => {
      if (timedOut) throw timeoutError();
      throw error;
    });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    settled = true;
    clearTimeout(timer);
  }
}

function isRetryable(error) {
  if (!error) return false;
  if (typeof error.retryable === "boolean") return error.retryable;
  return ["RUN_TIMEOUT", "PROVIDER_ERROR", "PROVIDER_RATE_LIMIT", "PROVIDER_UNAVAILABLE"].includes(error.code);
}

async function withRetries(operation, {
  maxRetries = 0,
  backoffMs = 25,
  maxBackoffMs = MAX_RETRY_BACKOFF_MS,
  shouldRetry = isRetryable,
  signal
} = {}) {
  if (typeof operation !== "function") throw new TypeError("operation must be a function");
  const retries = clampInteger(maxRetries, 0, MAX_RETRIES, 0);
  const initialBackoff = clampInteger(backoffMs, 0, MAX_RETRY_BACKOFF_MS, 25);
  const maxBackoff = clampInteger(maxBackoffMs, initialBackoff, MAX_RETRY_BACKOFF_MS, MAX_RETRY_BACKOFF_MS);
  const errors = [];
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    if (signal?.aborted) throw timeoutError();
    try {
      const value = await operation(attempt);
      return { value, attempts: attempt, retries: attempt - 1, errors };
    } catch (error) {
      errors.push({ attempt, code: error?.code || "ERROR" });
      if (attempt > retries || !shouldRetry(error, attempt)) {
        if (error && typeof error === "object") {
          error.attempts = attempt;
          error.retries = attempt - 1;
          error.errors = errors.slice();
        }
        throw error;
      }
      const delay = Math.min(maxBackoff, initialBackoff * (2 ** (attempt - 1)));
      await sleep(delay, signal);
    }
  }
  throw providerError("The bounded retry loop did not produce a result.", "RETRY_EXHAUSTED");
}

function safeJson(value, label = "value", depth = 0, seen = new Set()) {
  if (depth > 20) throw providerError(`${label} is nested too deeply.`, "POLICY_BLOCKED");
  if (value === null || value === undefined || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.length > 50000) throw providerError(`${label} is too large.`, "POLICY_BLOCKED");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw providerError(`${label} contains an invalid number.`, "POLICY_BLOCKED");
    return value;
  }
  if (typeof value !== "object" || seen.has(value)) throw providerError(`${label} must be bounded JSON data.`, "POLICY_BLOCKED");
  seen.add(value);
  const result = Array.isArray(value) ? [] : {};
  const ownKeys = Reflect.ownKeys(value);
  const keys = Object.keys(value);
  if (ownKeys.some((key) => typeof key !== "string")
    || ownKeys.filter((key) => key !== "length").length !== keys.length
    || (Array.isArray(value) && keys.some((key) => !/^(?:0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) {
    throw providerError(`${label} contains unsupported properties.`, "POLICY_BLOCKED");
  }
  if (keys.length > (Array.isArray(value) ? 250 : 100)) throw providerError(`${label} contains too many values.`, "POLICY_BLOCKED");
  for (const key of keys.sort()) {
    if (/^(?:__proto__|prototype|constructor)$/i.test(key) || /(?:password|secret|token|api[-_]?key|credential)/i.test(key)) {
      throw providerError(`${label} contains a forbidden field.`, "POLICY_BLOCKED");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || descriptor.enumerable !== true || !Object.hasOwn(descriptor, "value")) {
      throw providerError(`${label} cannot contain accessors or hidden values.`, "POLICY_BLOCKED");
    }
    result[key] = safeJson(descriptor.value, `${label}.${key}`, depth + 1, seen);
  }
  seen.delete(value);
  return result;
}

function normalizeActionPlan(plan, { operation = null, maxSteps = 24 } = {}) {
  let value;
  try {
    value = safeJson(plan, "actionPlan");
  } catch (error) {
    return { valid: false, plan: null, failures: [error.code || "POLICY_BLOCKED"] };
  }
  const failures = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) failures.push("plan_shape");
  if (value?.version !== ACTION_PLAN_VERSION) failures.push("version");
  if (operation && value?.operation !== operation) failures.push("operation");
  if (!['ready', 'review', 'abstained', 'blocked'].includes(value?.status)) failures.push("status");
  if (!['not_required', 'pending', 'manual_review'].includes(value?.approvalStatus)) failures.push("approval_status");
  if (value?.deterministic !== true || value?.executable !== false || value?.sideEffectsAllowed !== false) failures.push("execution_boundary");
  if (typeof value?.requiresApproval !== "boolean") failures.push("approval_boundary");
  if (!Array.isArray(value?.actions) || value.actions.length > maxSteps) failures.push("step_limit");
  else {
    for (const action of value.actions) {
      const inferredRiskClass = riskClassForAction(action, {
        blocked: value.status === "blocked" || action?.status === "blocked",
        requiresApproval: action?.requiresApproval === true
      });
      if (!RISK_CLASSES.has(inferredRiskClass)) failures.push("risk_class");
      if (action && typeof action === "object") {
        action.riskClass = inferredRiskClass;
        if (action.actionPolicy && typeof action.actionPolicy === "object") action.actionPolicy.riskClass = inferredRiskClass;
      }
      if (!action || typeof action !== "object" || !ACTION_TYPES.has(action.type) || typeof action.id !== "string"
        || action.executable !== false || action.actionPolicy?.executable !== false
        || typeof action.requiresApproval !== "boolean" || !Array.isArray(action.evidenceIds)
        || action.actionPolicy?.version !== "1.0" || action.actionPolicy?.type !== action.type
        || action.actionPolicy?.riskClass !== inferredRiskClass
        || action.actionPolicy?.requiresApproval !== action.requiresApproval
        || !['ready', 'review', 'blocked'].includes(action.status)) {
        failures.push("action_policy");
        break;
      }
      if ((action.actionPolicy.sideEffect === true || action.actionPolicy.externalAction === true
        || inferredRiskClass === "external_side_effect" || inferredRiskClass === "destructive")
        && (value.status !== "blocked" || action.status !== "blocked")) {
        failures.push("side_effect_policy");
        break;
      }
    }
  }
  if (!Array.isArray(value?.evidenceIds) || value.evidenceIds.some((id) => typeof id !== "string" || !id)) failures.push("evidence");
  if (!Array.isArray(value?.limitations)) failures.push("limitations");
  if (typeof value?.id !== "string" || typeof value?.digest !== "string" || !value.id.startsWith("plan-")) failures.push("digest");
  else {
    const { id, digest: suppliedDigest, ...body } = value;
    const expectedDigest = digest("action-plan", stableSerialize(body));
    if (suppliedDigest !== expectedDigest || id !== `plan-${expectedDigest}`) failures.push("digest");
  }
  return { valid: failures.length === 0, plan: value, failures: [...new Set(failures)] };
}

function planFromLocalRun(run, workflow, knowledge, maxSteps) {
  const input = String(run?.input || "");
  const inputSafety = detectPromptInjection(input);
  const quarantined = [];
  const safeKnowledge = [];
  for (const item of Array.isArray(knowledge) ? knowledge : []) {
    const report = detectPromptInjection(`${item?.id || ""} ${item?.title || ""} ${item?.content || ""}`);
    if (report.detected) quarantined.push({ id: String(item?.id || "unknown"), flags: report.flags.map((flag) => flag.code) });
    else safeKnowledge.push(item);
  }
  const steps = Array.isArray(run?.steps) ? run.steps.slice(0, maxSteps) : [];
  const actions = (steps.length ? steps : [{ name: "Review the supplied request" }]).map((step, index) => {
    const name = String(step?.name || `Step ${index + 1}`).slice(0, 200);
    const type = /search|knowledge|context|collect|read/i.test(name) ? "read"
      : /draft|write|compose|brief/i.test(name) ? "draft"
        : /send|email|message|refund|delete|deploy|access|permission/i.test(name) ? "unknown" : "analysis";
    const requiresApproval = inputSafety.detected || quarantined.length > 0 || workflow?.requires_approval !== false
      || ["draft", "unknown"].includes(type);
    const sideEffect = ["communicate", "financial", "access", "destructive", "code_execution", "unknown"].includes(type);
    const blockedAction = inputSafety.detected || quarantined.length > 0 || sideEffect;
    const riskClass = blockedAction ? "blocked" : requiresApproval ? "human_review_required" : type === "draft" ? "draft_only" : "read_only";
    const actionPolicy = {
      version: ACTION_POLICY_VERSION || "1.0",
      type,
      riskClass,
      tool: null,
      sideEffect,
      externalAction: sideEffect,
      status: blockedAction ? "blocked" : requiresApproval ? "review" : "allowed",
      requiresApproval,
      approval: requiresApproval ? "required_before_use" : "not_required",
      executable: false
    };
    return {
      id: `action-${digest("local-action", index, name, type)}`,
      type,
      riskClass,
      tool: null,
      arguments: { step: name },
      status: blockedAction ? "blocked" : requiresApproval ? "review" : "ready",
      requiresApproval,
      executable: false,
      evidenceIds: ["input", ...safeKnowledge.slice(0, 6).map((item) => String(item.id || item.title || "knowledge"))],
      actionPolicy
    };
  });
  const evidenceIds = ["input", ...safeKnowledge.slice(0, 6).map((item) => String(item.id || item.title || "knowledge"))];
  const requiresApproval = inputSafety.detected || quarantined.length > 0 || workflow?.requires_approval !== false
    || actions.some((action) => action.requiresApproval);
  const status = inputSafety.detected || quarantined.length || actions.some((action) => action.actionPolicy.sideEffect)
    ? "blocked" : requiresApproval ? "review" : "ready";
  const body = {
    version: ACTION_PLAN_VERSION,
    operation: "workflow_execution",
    status,
    deterministic: true,
    executable: false,
    sideEffectsAllowed: false,
    requiresApproval,
    approvalStatus: requiresApproval ? "manual_review" : "not_required",
    policyVersion: "1.0",
    evidenceIds: [...new Set(evidenceIds)],
    actions,
    riskClasses: [...new Set(actions.map((action) => action.riskClass))],
    humanReviewPolicy: normalizedReviewPolicy({
      status,
      requiresApproval,
      approvalStatus: requiresApproval ? "manual_review" : "not_required",
      quarantine: inputSafety.detected || quarantined.length
    }, actions.map((action) => action.riskClass)),
    limitations: [
      "This local execution plan is reviewable only; no provider or external action is enabled.",
      ...(inputSafety.detected ? ["Prompt-injection indicators in the request were quarantined."] : []),
      ...(quarantined.length ? ["Knowledge with prompt-injection indicators was quarantined."] : [])
    ],
    quarantine: inputSafety.detected || quarantined.length
      ? { status: "quarantined", inputFlags: inputSafety.flags.map((flag) => flag.code), documents: quarantined }
      : null
  };
  const planDigest = digest("action-plan", stableSerialize(body));
  return { ...body, id: `plan-${planDigest}`, digest: planDigest };
}

function buildExecutionReceipt({
  runId = null,
  workspaceId = null,
  workflowId = null,
  idempotencyKey = null,
  plan = null,
  status = "completed",
  attempts = 1,
  retries = Math.max(0, attempts - 1),
  retryErrors = [],
  timeoutMs = null,
  elapsedMs = null,
  output = "",
  credits = 0,
  estimatedCredits = credits,
  budgetCredits = null,
  evidence = [],
  error = null,
  steps = [],
  replayed = false,
  supportPacket = null,
  bounds = {}
} = {}) {
  const normalizedPlan = normalizeActionPlan(plan || {
    version: ACTION_PLAN_VERSION,
    operation: "workflow_execution",
    status: "blocked",
    deterministic: true,
    executable: false,
    sideEffectsAllowed: false,
    requiresApproval: true,
    approvalStatus: "manual_review",
    policyVersion: "1.0",
    evidenceIds: [],
    actions: [],
    limitations: ["No typed plan was supplied."],
    quarantine: null,
    id: "plan-missing",
    digest: "missing"
  });
  const safePlan = normalizedPlan.plan || null;
  const safeOutput = typeof output === "string" ? output.slice(0, MAX_RECEIPT_TEXT) : "";
  const safeEvidence = normalizedEvidence(evidence);
  const normalizedStatus = ["queued", "running", "awaiting_approval", "completed", "blocked", "failed", "replayed"].includes(status)
    ? status
    : "failed";
  const riskClasses = safePlan
    ? [...new Set((Array.isArray(safePlan.actions) ? safePlan.actions : []).map((action) => riskClassForAction(action, {
      blocked: safePlan.status === "blocked" || action?.status === "blocked",
      requiresApproval: action?.requiresApproval === true
    })))].filter((riskClass) => RISK_CLASSES.has(riskClass))
    : [];
  const reviewPolicy = safePlan
    ? (safePlan.humanReviewPolicy && typeof safePlan.humanReviewPolicy === "object"
      ? boundedReviewPolicy(safePlan.humanReviewPolicy, normalizedReviewPolicy(safePlan, riskClasses))
      : normalizedReviewPolicy(safePlan, riskClasses))
    : boundedReviewPolicy(null, normalizedReviewPolicy({ status: "blocked", requiresApproval: true, approvalStatus: "manual_review" }, ["blocked"]));
  const packetSummary = supportPacketReceiptSummary(supportPacket);
  const receipt = {
    version: RECEIPT_VERSION,
    status: normalizedStatus,
    runId: runId === null ? null : String(runId).slice(0, 160),
    workspaceId: workspaceId === null ? null : String(workspaceId).slice(0, 160),
    workflowId: workflowId === null ? null : String(workflowId).slice(0, 160),
    mode: LOCAL_MODE,
    provider: LOCAL_PROVIDER,
    providerContacted: false,
    externalActionsPerformed: false,
    deterministic: true,
    replayed: Boolean(replayed),
    idempotencyKey: typeof idempotencyKey === "string" ? idempotencyKey.slice(0, 128) : null,
    plan: safePlan ? {
      id: String(safePlan.id).slice(0, 160),
      digest: String(safePlan.digest).slice(0, 80),
      version: String(safePlan.version).slice(0, 20),
      status: String(safePlan.status).slice(0, 30)
    } : null,
    steps: Array.isArray(steps) ? steps.slice(0, MAX_RECEIPT_STEPS).map((step) => ({
      index: Number.isInteger(step?.index) ? step.index : null,
      name: typeof step?.name === "string" ? step.name.slice(0, 200) : "unknown",
      status: typeof step?.status === "string" ? step.status.slice(0, 30) : "unknown",
      detail: typeof step?.detail === "string" ? step.detail.slice(0, 500) : ""
    })) : [],
    attempts: clampInteger(attempts, 1, MAX_RETRIES + 1, 1),
    retries: clampInteger(retries, 0, MAX_RETRIES, 0),
    retryErrors: Array.isArray(retryErrors) ? retryErrors.slice(0, MAX_RETRIES).map((item) => ({
      attempt: Number.isInteger(item?.attempt) ? item.attempt : null,
      code: typeof item?.code === "string" ? item.code.slice(0, 80) : "ERROR"
    })) : [],
    timeoutMs: timeoutMs === null ? null : clampInteger(timeoutMs, 1, 120000, 15000),
    elapsedMs: elapsedMs === null ? null : finiteNonNegative(elapsedMs),
    usage: {
      credits: finiteNonNegative(credits),
      estimatedCredits: finiteNonNegative(estimatedCredits),
      budgetCredits: budgetCredits === null ? null : finiteNonNegative(budgetCredits),
      withinBudget: budgetCredits === null ? null : finiteNonNegative(credits) <= finiteNonNegative(budgetCredits),
      enforcement: budgetCredits === null || finiteNonNegative(estimatedCredits) <= finiteNonNegative(budgetCredits) ? "within_budget" : "capped_to_reservation"
    },
    outputDigest: digest("output", safeOutput),
    evidenceIds: safePlan ? [...new Set((safePlan.evidenceIds || []).filter((id) => typeof id === "string").map((id) => id.slice(0, 128)))] : [],
    evidence: safeEvidence,
    provenance: {
      version: "1.0",
      method: "local-deterministic",
      sourceIds: [...new Set(safeEvidence.map((item) => item.sourceId))],
      evidenceCount: safeEvidence.length,
      evidenceDigest: digest("receipt-evidence", stableSerialize(safeEvidence)),
      providerContacted: false,
      externalActionsPerformed: false
    },
    riskClasses,
    actionRisk: {
      primary: riskClasses.includes("blocked") ? "blocked" : riskClasses.includes("external_side_effect") ? "external_side_effect" : riskClasses.includes("human_review_required") ? "human_review_required" : riskClasses[0] || "read_only",
      classes: riskClasses,
      executable: false,
      sideEffectsAllowed: false
    },
    humanReviewPolicy: reviewPolicy,
    supportPacket: packetSummary,
    bounds: {
      maxSteps: clampInteger(bounds.maxSteps, 1, MAX_RECEIPT_STEPS, MAX_RECEIPT_STEPS),
      maxOutputChars: clampInteger(bounds.maxOutputChars, 1000, MAX_RECEIPT_TEXT, MAX_RECEIPT_TEXT),
      maxEvidence: MAX_RECEIPT_EVIDENCE,
      timeoutMs: timeoutMs === null ? null : clampInteger(timeoutMs, 1, 120000, 15000),
      maxRetries: clampInteger(bounds.maxRetries, 0, MAX_RETRIES, MAX_RETRIES),
      bounded: true
    },
    quarantine: boundedQuarantine(safePlan?.quarantine),
    error: error ? { code: String(error.code || "RUN_FAILED").slice(0, 80), message: String(error.message || "The run failed.").slice(0, 300) } : null
  };
  receipt.replayKey = digest("replay", workspaceId || "local", workflowId || "workflow", idempotencyKey || runId || "run", receipt.plan?.digest || "", receipt.outputDigest, receipt.supportPacket?.digest || "");
  receipt.receiptId = `receipt-${digest(stableSerialize(receipt))}`;
  return receipt;
}

async function executeLocalPlan({ plan, input = "", budgetCredits = null, credits = null, output = "", idempotencyKey = null, cache = null, runId = null, workspaceId = null, workflowId = null, supportPacket = null } = {}) {
  const normalized = normalizeActionPlan(plan);
  if (!normalized.valid) {
    const error = providerError("The typed action plan failed local policy validation.", "POLICY_BLOCKED");
    error.details = { failures: normalized.failures };
    throw error;
  }
  if (supportPacket !== null && !validateSupportPacket(supportPacket).valid) {
    throw providerError("The supplied support packet failed local contract validation.", "POLICY_BLOCKED");
  }
  if (idempotencyKey !== null && idempotencyKey !== undefined
    && (typeof idempotencyKey !== "string" || idempotencyKey.length < 4 || idempotencyKey.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey))) {
    throw providerError("The local execution idempotency key is invalid.", "INVALID_IDEMPOTENCY_KEY");
  }
  if (budgetCredits !== null && budgetCredits !== undefined
    && (typeof budgetCredits !== "number" || !Number.isFinite(budgetCredits) || budgetCredits < 0)) {
    throw providerError("The local execution budget must be a finite non-negative number.", "INVALID_BUDGET");
  }
  const key = idempotencyKey ? `${workspaceId || "local"}:${idempotencyKey}` : null;
  const estimatedCredits = credits === null || credits === undefined
    ? Math.max(1, Math.ceil((String(input).length + String(output).length) / 120))
    : finiteNonNegative(credits);
  const fingerprint = digest("local-execution", stableSerialize(normalized.plan), input, output, budgetCredits, estimatedCredits, supportPacket ? stableSerialize(supportPacket) : "");
  if (key && cache?.has(key)) {
    const entry = cache.get(key);
    if (entry.fingerprint !== fingerprint) throw providerError("The idempotency key was already used for a different local execution.", "IDEMPOTENCY_KEY_REUSE");
    return { ...entry.result, receipt: { ...entry.result.receipt, replayed: true } };
  }
  if (budgetCredits !== null && estimatedCredits > finiteNonNegative(budgetCredits)) throw providerError("The local execution exceeded its approved budget.", "BUDGET_EXCEEDED");
  const status = normalized.plan.status === "blocked" ? "blocked" : normalized.plan.requiresApproval ? "awaiting_approval" : "completed";
  const result = {
    ok: status !== "blocked",
    output: String(output).slice(0, 50000),
    credits: estimatedCredits,
    actionPlan: normalized.plan,
    supportPacket,
    receipt: buildExecutionReceipt({
      runId,
      workspaceId,
      workflowId,
      idempotencyKey,
      plan: normalized.plan,
      status,
      output,
      credits: estimatedCredits,
      estimatedCredits,
      budgetCredits,
      supportPacket,
      bounds: { maxSteps: 24, maxOutputChars: MAX_RECEIPT_TEXT, maxRetries: 0 }
    })
  };
  if (key && cache) cache.set(key, { fingerprint, result });
  return result;
}

class RunExecutor {
  constructor({ db, mode = "sandbox", env = process.env, maxConcurrent = 2, timeoutMs = 15000, maxSteps = 12, maxOutputChars = 18000, maxRetries = 1, retryBackoffMs = 50, now = () => Date.now() } = {}) {
    this.db = db;
    this.mode = mode === "mock" || mode === "local" ? "sandbox" : mode;
    if (this.mode !== "sandbox") throw providerError("Only the local sandbox executor is enabled.", "LIVE_PROVIDER_DISABLED");
    this.env = env;
    this.maxConcurrent = Math.max(1, Math.min(8, Number(maxConcurrent) || 2));
    this.timeoutMs = Math.max(1000, Math.min(120000, Number(timeoutMs) || 15000));
    this.maxSteps = Math.max(1, Math.min(24, Number(maxSteps) || 12));
    this.maxOutputChars = Math.max(1000, Math.min(50000, Number(maxOutputChars) || 18000));
    this.maxRetries = clampInteger(maxRetries, 0, MAX_RETRIES, 1);
    this.retryBackoffMs = clampInteger(retryBackoffMs, 0, MAX_RETRY_BACKOFF_MS, 50);
    this.now = now;
    this.queue = [];
    this.queued = new Set();
    this.running = 0;
    this.started = false;
    this.replayCache = new Map();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.db.reconcileInterruptedRuns();
    const pending = this.db.all("SELECT id, workspace_id FROM runs WHERE status = 'queued' ORDER BY created_at LIMIT 250");
    for (const run of pending) this.enqueue(run.workspace_id, run.id);
    this.pump();
  }

  enqueue(workspaceId, runId) {
    const key = `${workspaceId}:${runId}`;
    if (this.queued.has(key)) return;
    this.queued.add(key);
    this.queue.push({ workspaceId, runId, key });
    if (this.started) this.pump();
  }

  pump() {
    while (this.running < this.maxConcurrent && this.queue.length) {
      const item = this.queue.shift();
      this.running += 1;
      this.runOne(item).catch((error) => {
        console.error("MakeEase executor error:", error && error.stack ? error.stack : error);
      }).finally(() => {
        this.running -= 1;
        this.queued.delete(item.key);
        this.pump();
      });
    }
  }

  async runOne(item) {
    const run = this.db.getRun(item.workspaceId, item.runId);
    if (!run || !["queued", "running"].includes(run.status)) return;
    const idempotencyKey = run.idempotencyKey || run.idempotency_key || run.id;
    const requestFingerprint = digest("run", item.workspaceId, run.workflow_id, run.input, run.model, stableSerialize(run.steps || []));
    const replayKey = `${item.workspaceId}:${idempotencyKey}`;
    const cached = this.replayCache.get(replayKey);
    if (cached) {
      if (cached.fingerprint !== requestFingerprint) {
        this.finalizeFailure(item, "IDEMPOTENCY_KEY_REUSE", "The local run idempotency key was already used for a different request.", {
          runId: item.runId,
          workspaceId: item.workspaceId,
          idempotencyKey,
          status: "failed"
        });
        return;
      }
      try {
        this.db.finalizeRun({
          workspaceId: item.workspaceId,
          runId: item.runId,
          status: cached.result.status,
          output: cached.result.output,
          credits: cached.result.credits,
          receipt: { ...cached.result.receipt, replayed: true },
          actionPlan: cached.result.actionPlan,
          approvalTitle: `Review internal completion for ${cached.workflowName || "workflow"}`
        });
      } catch (error) {
        console.error("MakeEase executor replay finalization error:", error && error.stack ? error.stack : error);
      }
      return;
    }
    try {
      const current = this.db.markRunRunning(item.workspaceId, item.runId);
      if (current.status !== "running") return;
      const workflow = this.db.getWorkflow(item.workspaceId, current.workflow_id);
      if (!workflow) throw providerError("The workflow no longer exists.", "WORKFLOW_MISSING");
      const steps = current.steps.slice(0, this.maxSteps);
      const stepReceipts = [];
      let stepIndex = 0;
      for (const step of steps) {
        this.db.updateStep(item.workspaceId, item.runId, stepIndex, "running", "Bounded internal step started.");
        await sleepTick();
        stepIndex += 1;
        const detail = this.stepDetail(step.name, this.mode);
        this.db.updateStep(item.workspaceId, item.runId, stepIndex - 1, "completed", detail);
        stepReceipts.push({ index: stepIndex - 1, name: step.name, status: "completed", detail });
      }
      const knowledge = this.db.getKnowledgeForPrompt(item.workspaceId);
      const generatedRun = await withTimeout((signal) => withRetries(
        (attempt) => this.generate(current, workflow, knowledge, signal, attempt),
        { maxRetries: this.maxRetries, backoffMs: this.retryBackoffMs, signal }
      ), this.timeoutMs);
      const generated = generatedRun.value;
      const output = String(generated.output || "").slice(0, this.maxOutputChars);
      const normalizedPlan = normalizeActionPlan(generated.actionPlan, { operation: "workflow_execution", maxSteps: this.maxSteps });
      if (!normalizedPlan.valid) throw providerError("The local action plan failed policy validation.", "POLICY_BLOCKED");
      const status = normalizedPlan.plan.status === "blocked"
        ? "blocked"
        : (normalizedPlan.plan.status === "abstained" || normalizedPlan.plan.requiresApproval || workflow.requires_approval
          ? "awaiting_approval"
          : "completed");
      const estimatedCredits = Math.max(1, Math.ceil(Number(generated.credits) || 1));
      const budgetCredits = Number(current.reserved_credits);
      // Sandbox accounting never charges beyond the reservation. Keep the
      // deterministic estimate in the receipt while settling only the
      // approved amount, so a local simulation cannot overrun its budget.
      const credits = Number.isFinite(budgetCredits) ? clamp(estimatedCredits, 1, Math.max(1, budgetCredits)) : estimatedCredits;
      const receipt = buildExecutionReceipt({
        runId: item.runId,
        workspaceId: item.workspaceId,
        workflowId: current.workflow_id,
        idempotencyKey,
        plan: normalizedPlan.plan,
        status,
        attempts: generatedRun.attempts,
        retries: generatedRun.retries,
        retryErrors: generatedRun.errors,
        timeoutMs: this.timeoutMs,
        elapsedMs: this.now() - (current.started_at ? Date.parse(current.started_at) || this.now() : this.now()),
        output,
        credits,
        budgetCredits: Number.isFinite(budgetCredits) ? budgetCredits : null,
        estimatedCredits,
        evidence: generated.evidence || [],
        steps: stepReceipts,
        supportPacket: generated.supportPacket || null,
        bounds: {
          maxSteps: this.maxSteps,
          maxOutputChars: this.maxOutputChars,
          maxRetries: this.maxRetries
        }
      });
      this.db.finalizeRun({
        workspaceId: item.workspaceId,
        runId: item.runId,
        status,
        output,
        credits,
        receipt,
        actionPlan: normalizedPlan.plan,
        evidence: generated.evidence || [],
        approvalTitle: `Review internal completion for ${workflow.name}`
      });
      this.replayCache.set(replayKey, {
        fingerprint: requestFingerprint,
        workflowName: workflow.name,
        result: { status, output, credits, receipt, actionPlan: normalizedPlan.plan }
      });
      if (this.replayCache.size > 256) this.replayCache.delete(this.replayCache.keys().next().value);
    } catch (error) {
      const detail = error && error.code === "RUN_TIMEOUT" ? "Run exceeded the bounded execution timeout." : (error?.message || "The run could not be completed.");
      this.finalizeFailure(item, error?.code || "RUN_FAILED", detail, {
        runId: item.runId,
        workspaceId: item.workspaceId,
        workflowId: run.workflow_id,
        idempotencyKey,
        status: "failed",
        attempts: error?.attempts || 1,
        retries: error?.retries || 0,
        retryErrors: error?.errors || [],
        timeoutMs: this.timeoutMs,
        error
      });
    }
  }

  finalizeFailure(item, code, detail, receiptOptions = {}) {
    try {
      const fresh = this.db.getRun(item.workspaceId, item.runId);
      if (fresh && ["queued", "running"].includes(fresh.status)) {
        const receipt = buildExecutionReceipt({ ...receiptOptions, status: "failed", error: { code, message: detail } });
        this.db.finalizeRun({ workspaceId: item.workspaceId, runId: item.runId, status: "failed", output: null, credits: 0, errorMessage: detail, receipt });
      }
    } catch (finalizeError) {
      console.error("MakeEase executor finalization error:", finalizeError && finalizeError.stack ? finalizeError.stack : finalizeError);
    }
  }

  stepDetail(name, mode) {
    return `Local mock step completed: ${name}. No AI provider, network request, or external side effect was used.`;
  }

  async generate(run, workflow, knowledge, signal) {
    const selected = modelDefinitions(this.env).find((model) => model.id === run.model || model.family === run.model);
    if (!selected) throw providerError("The selected model is not supported.", "MODEL_NOT_CONFIGURED");
    // The MVP executor never crosses a provider/network boundary. Provider
    // configuration is intentionally ignored in sandbox mode.
    return this.generateSandbox(run, workflow, knowledge);
  }

  generateSandbox(run, workflow, knowledge) {
    const inputSafety = detectPromptInjection(run.input);
    const cleanInput = inputSafety.detected
      ? "[Untrusted instruction content quarantined for manual review.]"
      : (run.input.length > 4000 ? `${run.input.slice(0, 4000)}…` : run.input);
    const safeKnowledge = knowledge.filter((item) => !detectPromptInjection(`${item.id || ""} ${item.title || ""} ${item.content || ""}`).detected);
    const quarantinedKnowledge = knowledge.length - safeKnowledge.length;
    const relevant = safeKnowledge.slice(0, 6).map((item) => `- ${item.title}: ${item.content.slice(0, 500)}`);
    const knowledgeBlock = relevant.length ? relevant.join("\n") : "- No non-quarantined workspace knowledge was available.";
    const output = [
      "SANDBOX SIMULATION — deterministic demo output; this is not AI output.",
      `Workflow: ${workflow.name}`,
      `Input: ${cleanInput}`,
      "",
      "Draft internal plan:",
      ...(workflow.template_id ? this.db.getTemplateSteps(workflow.template_id).map((step, index) => `${index + 1}. ${step}`) : ["1. Review the supplied request"]),
      "",
      "Knowledge considered:",
      knowledgeBlock,
      ...(quarantinedKnowledge ? [`${quarantinedKnowledge} knowledge item(s) were quarantined for prompt-injection review.`] : []),
      "",
      "No email, deployment, refund, message, or other external action was performed. Approval only authorizes internal completion."
    ].join("\n");
    const chars = run.input.length + knowledge.reduce((sum, item) => sum + item.content.length, 0) + output.length;
    const actionPlan = planFromLocalRun(run, workflow, knowledge, this.maxSteps);
    const safety = detectPromptInjection([
      run.input,
      ...knowledge.map((item) => `${item.id || ""} ${item.title || ""} ${item.content || ""}`)
    ].join("\n"));
    const supportDocumentIds = new Set();
    const supportDocuments = knowledge.map((item, index) => {
      const baseId = String(item.id || item.title || `knowledge-${index + 1}`).slice(0, 100) || `knowledge-${index + 1}`;
      let id = baseId;
      let suffix = 2;
      while (supportDocumentIds.has(id)) id = `${baseId.slice(0, 90)}-${suffix++}`;
      supportDocumentIds.add(id);
      return {
        id,
        title: String(item.title || `Knowledge ${index + 1}`),
        content: String(item.content || "")
      };
    });
    const supportPacket = createSupportPacket({
      request: run.input,
      documents: supportDocuments
    }, {
      minConfidence: workflow.requires_approval === false ? 0.6 : 0.7
    });
    return {
      output,
      credits: Math.max(1, Math.ceil(chars / 120)),
      actionPlan,
      evidence: inputSafety.detected ? [] : [{ sourceId: "input", sourceType: "input", quote: cleanInput.slice(0, 1000), supports: "workflow:request" }],
      safety,
      supportPacket,
      providerContacted: false
    };
  }

  async generateLive(run, workflow, knowledge, selected, signal) {
    throw providerError("Live provider execution is disabled in the local adapter.", "LIVE_PROVIDER_DISABLED");
  }

  async callOpenAiCompatible(model, prompt, maxTokens, signal) {
    throw providerError("Live provider execution is disabled in the local adapter.", "LIVE_PROVIDER_DISABLED");
  }

  async callAnthropic(model, prompt, maxTokens, signal) {
    throw providerError("Live provider execution is disabled in the local adapter.", "LIVE_PROVIDER_DISABLED");
  }
}

module.exports = {
  ACTION_PLAN_VERSION,
  RECEIPT_VERSION,
  RunExecutor,
  buildExecutionReceipt,
  executeLocalPlan,
  normalizeActionPlan,
  planFromLocalRun,
  withRetries,
  withTimeout
};
