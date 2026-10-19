"use strict";

const path = require("node:path");
const os = require("node:os");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;
const DEFAULT_TENANT_ID = "demo-tenant";
const DEFAULT_WORKSPACE_ID = "demo-workspace";
const API_CONTRACT_VERSION = "local-v1";
const PRODUCT_VERSION = "1.0.0";
const DEFAULT_MODE = "sandbox";
const CUSTOMER_UNIT = "support_review_packet";
const SUPPORT_PACKET_LIMIT = 500;
const SUPPORT_HISTORY_DAYS = 90;
const SUPPORT_REVIEWER_LIMIT = 3;
const MAX_JSON_BODY_BYTES = 64 * 1024;
const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_IDEMPOTENCY_ENTRIES = 1000;
const MAX_JSON_DEPTH = 12;
const MAX_OBJECT_KEYS = 100;
const MAX_ARRAY_ITEMS = 250;
const MAX_AUTH_TOKEN_LENGTH = 512;
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_SESSION_AGE_MS = SESSION_TTL_SECONDS * 1000;
const DEFAULT_DB_PATH = path.join(os.homedir(), ".makeease", "makeease.sqlite");

// These are deliberately local, side-effect-free service boundaries. A future
// deployment can replace one boundary at a time without changing route code or
// allowing the local adapter to silently call a real provider.
const ADAPTER_CAPABILITIES = Object.freeze({
  auth: Object.freeze({ mode: "local-demo", provider: null, externalSideEffects: false }),
  oauth: Object.freeze({ mode: "not-configured", provider: null, externalSideEffects: false }),
  ai: Object.freeze({ mode: "sandbox-only", provider: null, externalSideEffects: false }),
  billing: Object.freeze({ mode: "demo-only", provider: null, externalSideEffects: false }),
  support: Object.freeze({
    mode: "approval-first-preview",
    customerUnit: CUSTOMER_UNIT,
    packetLimit: SUPPORT_PACKET_LIMIT,
    automaticSend: false,
    externalSideEffects: false
  })
});

const TOPUP = Object.freeze({ price: 12, credits: 10000 });

const PLAN_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "starter",
    name: "MakeEase Support",
    price: 149,
    currency: "USD",
    interval: "month",
    creditLimit: 15000,
    credits: 15000,
    topUp: TOPUP,
    customerUnit: CUSTOMER_UNIT,
    packetLimit: SUPPORT_PACKET_LIMIT,
    reviewerLimit: SUPPORT_REVIEWER_LIMIT,
    historyDays: SUPPORT_HISTORY_DAYS,
    automaticSend: false,
    description: "One support workflow for a small B2B SaaS team.",
    features: ["One Gmail scope placeholder", "Three reviewers", "500 support review packets"]
  }),
  Object.freeze({
    id: "growth",
    name: "MakeEase Team",
    price: 499,
    currency: "USD",
    interval: "month",
    creditLimit: 40000,
    credits: 40000,
    topUp: TOPUP,
    customerUnit: CUSTOMER_UNIT,
    packetLimit: 1000,
    reviewerLimit: 10,
    historyDays: 365,
    automaticSend: false,
    description: "More support capacity and review controls for a growing team.",
    features: ["Everything in Support", "Expanded packet capacity", "Team review controls"]
  }),
  Object.freeze({
    id: "business",
    name: "MakeEase Custom",
    price: null,
    currency: "USD",
    interval: "month",
    creditLimit: 90000,
    credits: 90000,
    topUp: TOPUP,
    customerUnit: CUSTOMER_UNIT,
    packetLimit: 2500,
    reviewerLimit: 25,
    historyDays: 730,
    automaticSend: false,
    description: "Custom capacity, security, and implementation support.",
    features: ["Custom packet capacity", "Advanced approvals", "Implementation support"]
  }),
  Object.freeze({
    id: "enterprise",
    name: "Enterprise",
    price: null,
    currency: "USD",
    interval: "custom",
    creditLimit: null,
    credits: null,
    topUp: null,
    customerUnit: CUSTOMER_UNIT,
    packetLimit: null,
    reviewerLimit: null,
    historyDays: null,
    automaticSend: false,
    description: "Custom limits, controls, and implementation support.",
    features: ["Custom credit volume", "SSO and advanced controls", "Dedicated implementation"]
  })
]);

const TEMPLATE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "customer-support-triage",
    name: "Customer support triage",
    description: "Classify an incoming customer request and draft a safe response plan.",
    category: "Support",
    steps: ["Understand the request", "Search company knowledge", "Draft a response plan", "Request internal approval"]
  }),
  Object.freeze({
    id: "new-lead-follow-up",
    name: "New lead follow-up",
    description: "Turn a lead brief into a concise, reviewable follow-up draft.",
    category: "Growth",
    steps: ["Summarize the lead", "Match relevant knowledge", "Draft follow-up options", "Request internal approval"]
  }),
  Object.freeze({
    id: "weekly-business-briefing",
    name: "Weekly business briefing",
    description: "Create a structured internal briefing from the supplied operating context.",
    category: "Operations",
    steps: ["Collect the supplied context", "Identify themes", "Draft a briefing", "Highlight open questions"]
  }),
  Object.freeze({
    id: "engineering-issue-assistant",
    name: "Engineering issue assistant",
    description: "Break an engineering issue into a bounded internal implementation plan.",
    category: "Engineering",
    steps: ["Parse the issue", "Find relevant knowledge", "Draft implementation steps", "List verification checks"]
  })
]);

function envBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return /^(1|true|yes|on)$/i.test(String(value));
}

function finitePositive(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function configuredModelId(value, fallback) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function parseRates(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const result = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== "object") continue;
      const input = Number(value.inputPer1k ?? value.input);
      const output = Number(value.outputPer1k ?? value.output);
      if (Number.isFinite(input) && input >= 0 && Number.isFinite(output) && output >= 0) {
        result[key] = { inputPer1k: input, outputPer1k: output };
      }
    }
    return Object.keys(result).length ? result : fallback;
  } catch {
    return fallback;
  }
}

function modelDefinitions(env = process.env) {
  const gptId = configuredModelId(env.OPENAI_MODEL_GPT_OSS, "gpt-oss");
  const sonnetId = configuredModelId(env.ANTHROPIC_MODEL_SONNET, "anthropic-sonnet");
  const opusId = configuredModelId(env.ANTHROPIC_MODEL_OPUS, "anthropic-opus");
  const rates = parseRates(env.MAKEEASE_TOKEN_RATES_JSON, {
    "gpt-oss": {
      inputPer1k: finitePositive(env.MAKEEASE_GPT_OSS_INPUT_CREDITS_PER_1K, 1),
      outputPer1k: finitePositive(env.MAKEEASE_GPT_OSS_OUTPUT_CREDITS_PER_1K, 3)
    },
    "anthropic-sonnet": {
      inputPer1k: finitePositive(env.MAKEEASE_SONNET_INPUT_CREDITS_PER_1K, 2),
      outputPer1k: finitePositive(env.MAKEEASE_SONNET_OUTPUT_CREDITS_PER_1K, 6)
    },
    "anthropic-opus": {
      inputPer1k: finitePositive(env.MAKEEASE_OPUS_INPUT_CREDITS_PER_1K, 5),
      outputPer1k: finitePositive(env.MAKEEASE_OPUS_OUTPUT_CREDITS_PER_1K, 15)
    }
  });

  return [
    {
      id: gptId,
      family: "gpt-oss",
      label: "gpt-oss",
      configured: Boolean(env.OPENAI_API_KEY && env.OPENAI_BASE_URL && env.OPENAI_MODEL_GPT_OSS),
      provider: "openai-compatible",
      baseUrl: env.OPENAI_BASE_URL || null,
      apiKey: env.OPENAI_API_KEY || null,
      rates: rates[gptId] || rates["gpt-oss"]
    },
    {
      id: sonnetId,
      family: "anthropic-sonnet",
      label: "Anthropic Sonnet",
      configured: Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_MODEL_SONNET),
      provider: "anthropic",
      baseUrl: env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
      apiKey: env.ANTHROPIC_API_KEY || null,
      rates: rates[sonnetId] || rates["anthropic-sonnet"]
    },
    {
      id: opusId,
      family: "anthropic-opus",
      label: "Anthropic Opus",
      configured: Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_MODEL_OPUS),
      provider: "anthropic",
      baseUrl: env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
      apiKey: env.ANTHROPIC_API_KEY || null,
      rates: rates[opusId] || rates["anthropic-opus"]
    }
  ];
}

function publicPlans() {
  return PLAN_DEFINITIONS.map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    creditLimit: plan.creditLimit,
    credits: plan.credits,
    topUp: plan.topUp ? { ...plan.topUp } : null,
    customerUnit: plan.customerUnit,
    packetLimit: plan.packetLimit,
    reviewerLimit: plan.reviewerLimit,
    historyDays: plan.historyDays,
    automaticSend: plan.automaticSend,
    description: plan.description,
    features: [...plan.features]
  }));
}

function publicTemplates() {
  return TEMPLATE_DEFINITIONS.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    steps: [...template.steps]
  }));
}

function publicModels(env = process.env) {
  return modelDefinitions(env).map((model) => ({ id: model.id, label: model.label, configured: model.configured }));
}

function planById(id) {
  return PLAN_DEFINITIONS.find((plan) => plan.id === id) || null;
}

function templateById(id) {
  return TEMPLATE_DEFINITIONS.find((template) => template.id === id) || null;
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_TENANT_ID,
  DEFAULT_WORKSPACE_ID,
  API_CONTRACT_VERSION,
  PRODUCT_VERSION,
  DEFAULT_MODE,
  CUSTOMER_UNIT,
  SUPPORT_PACKET_LIMIT,
  SUPPORT_HISTORY_DAYS,
  SUPPORT_REVIEWER_LIMIT,
  DEFAULT_DB_PATH,
  MAX_JSON_BODY_BYTES,
  MAX_WEBHOOK_BODY_BYTES,
  MAX_IDEMPOTENCY_KEY_LENGTH,
  IDEMPOTENCY_TTL_MS,
  MAX_IDEMPOTENCY_ENTRIES,
  MAX_JSON_DEPTH,
  MAX_OBJECT_KEYS,
  MAX_ARRAY_ITEMS,
  MAX_AUTH_TOKEN_LENGTH,
  SESSION_TTL_SECONDS,
  MAX_SESSION_AGE_MS,
  ADAPTER_CAPABILITIES,
  TOPUP,
  PLAN_DEFINITIONS,
  TEMPLATE_DEFINITIONS,
  modelDefinitions,
  planById,
  templateById,
  publicPlans,
  publicModels,
  publicTemplates,
  envBoolean
};
