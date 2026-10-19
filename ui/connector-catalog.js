/*
 * Pure helpers for the connector directory.
 *
 * The API can return connector manifests from more than one generation of the
 * adapter.  Keep the compatibility work here so views can consume one small,
 * predictable shape without trusting a server field to exist or have the
 * expected type.
 */

const CATEGORY_ALL = "all";

const RISK_META = Object.freeze({
  low: {
    label: "Low risk",
    tone: "safe",
    className: "pill-teal",
    description: "Primarily read-only or low-impact access."
  },
  medium: {
    label: "Medium risk",
    tone: "caution",
    className: "pill-amber",
    description: "Review the requested scopes and intended effects."
  },
  high: {
    label: "High risk",
    tone: "warning",
    className: "pill-amber",
    description: "This connector may make consequential changes."
  },
  critical: {
    label: "Critical risk",
    tone: "danger",
    className: "pill-red",
    description: "Use an explicit approval and least-privilege policy."
  },
  unknown: {
    label: "Risk not specified",
    tone: "muted",
    className: "pill-muted",
    description: "The connector did not provide a risk classification."
  }
});

const RISK_ALIASES = Object.freeze({
  safe: "low",
  minimal: "low",
  read: "low",
  readonly: "low",
  "read-only": "low",
  moderate: "medium",
  elevated: "high",
  dangerous: "high",
  destructive: "critical",
  severe: "critical"
});

const CAPABILITY_FIELDS = Object.freeze([
  "capabilities",
  "capability",
  "capabilityLabels",
  "capability_labels",
  "actions",
  "operations",
  "tools",
  "features",
  "permissions",
  "scopes"
]);

const EFFECT_FIELDS = Object.freeze([
  "effects",
  "effect",
  "effectClass",
  "effect_class",
  "sideEffects",
  "side_effects",
  "externalEffects",
  "external_effects",
  "writes",
  "writeActions",
  "write_actions"
]);

const SETUP_FIELDS = Object.freeze([
  "setupSteps",
  "setup_steps",
  "onboardingSteps",
  "onboarding_steps",
  "installationSteps",
  "installation_steps",
  "configurationSteps",
  "configuration_steps",
  "setup",
  "onboarding",
  "installation",
  "instructions"
]);

const DESCRIPTOR_FIELDS = Object.freeze([
  "id",
  "key",
  "slug",
  "name",
  "label",
  "title",
  "displayName",
  "display_name",
  "action",
  "operation",
  "capability",
  "effect",
  "step",
  "description",
  "detail"
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readValue(value, key) {
  if (!isRecord(value) && typeof value !== "function") return undefined;
  try {
    return value[key];
  } catch {
    return undefined;
  }
}

function hasValue(value) {
  return value !== undefined && value !== null && !(typeof value === "string" && !value.trim());
}

function safeText(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

function firstValue(record, fields) {
  for (const field of fields) {
    const value = readValue(record, field);
    if (hasValue(value)) return value;
  }
  return undefined;
}

function firstText(record, fields) {
  for (const field of fields) {
    const text = safeText(readValue(record, field));
    if (text) return text;
  }
  return "";
}

function normaliseKey(value) {
  return safeText(value)
    .toLowerCase()
    .replace(/[&]/g, " and ")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function foldedText(value) {
  return safeText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function humanise(value) {
  const text = safeText(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._:/\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.split(" ").map((word) => {
    if (/^[A-Z0-9]{2,}$/.test(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

function displayLabel(value) {
  const text = safeText(value);
  if (!text) return "";
  return humanise(text);
}

function parseBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value !== 0;
  const text = foldedText(value);
  if (["true", "yes", "y", "on", "enabled", "required"].includes(text)) return true;
  if (["false", "no", "n", "off", "disabled", "optional"].includes(text)) return false;
  return fallback;
}

function explicitBoolean(record, fields) {
  for (const field of fields) {
    const value = readValue(record, field);
    if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) || typeof value === "string") {
      const text = foldedText(value);
      if (typeof value !== "string" || ["true", "false", "yes", "no", "on", "off", "enabled", "disabled", "required", "optional"].includes(text)) {
        return parseBoolean(value);
      }
    }
  }
  return undefined;
}

function splitListString(value, { splitCommas = true } = {}) {
  const text = safeText(value);
  if (!text) return [];
  const trimmed = text.trim();
  if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) || isRecord(parsed)) return parsed;
    } catch {
      // A plain label that happens to contain brackets is still useful below.
    }
  }
  const separators = splitCommas ? /[\n,|;]+/ : /\n+/;
  return trimmed.split(separators).map((item) => item.trim()).filter(Boolean);
}

function isDescriptor(value) {
  return isRecord(value) && DESCRIPTOR_FIELDS.some((field) => hasValue(readValue(value, field)));
}

/* Convert legacy string lists, arrays, and simple maps into safe entries. */
function listEntries(value, { splitCommas = true } = {}) {
  if (!hasValue(value)) return [];
  if (typeof value === "string") return splitListString(value, { splitCommas });
  if (Array.isArray(value)) return value.flatMap((item) => listEntries(item, { splitCommas }));
  if (isRecord(value)) {
    if (isDescriptor(value)) return [value];
    for (const field of ["items", "values", "list", "data", "steps", "setupSteps", "setup_steps", "instructions"]) {
      const nested = readValue(value, field);
      if (hasValue(nested)) return listEntries(nested, { splitCommas });
    }
    try {
      return Object.entries(value).flatMap(([key, item]) => {
        if (!hasValue(item) || item === false) return [];
        if (item === true) return [key];
        if (typeof item === "string" || typeof item === "number") return [{ id: key, label: item }];
        return listEntries(item, { splitCommas });
      });
    } catch {
      return [];
    }
  }
  return [value];
}

function uniqueByLabel(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = foldedText(item?.label || item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function capabilityValue(source) {
  if (Array.isArray(source)) return source;
  const explicitLabels = firstValue(source, ["capabilityLabels", "capability_labels"]);
  const capabilities = firstValue(source, CAPABILITY_FIELDS.filter((field) => !["capabilityLabels", "capability_labels"].includes(field)));
  return hasValue(capabilities) ? capabilities : explicitLabels;
}

function capabilityEntry(value) {
  if (isRecord(value)) {
    const rawLabel = firstText(value, ["label", "name", "title", "displayName", "display_name", "action", "operation", "capability", "key", "id", "type"]);
    const label = displayLabel(rawLabel);
    if (!label) return null;
    return {
      id: normaliseKey(firstText(value, ["id", "key", "slug"]) || label),
      label,
      description: firstText(value, ["description", "detail", "summary", "help"]),
      kind: displayLabel(firstText(value, ["kind", "type", "mode"])),
      effect: displayLabel(firstText(value, ["effect", "effects", "sideEffect", "side_effect"])),
      risk: normaliseRiskLevel(firstText(value, ["risk", "riskLevel", "risk_level", "severity"])),
      readOnly: explicitBoolean(value, ["readOnly", "read_only"]) ?? false,
      external: explicitBoolean(value, ["external", "externalEffect", "external_effect"]) ?? undefined
    };
  }
  const label = displayLabel(value);
  return label ? {
    id: normaliseKey(label),
    label,
    description: "",
    kind: "",
    effect: "",
    risk: "unknown",
    readOnly: false,
    external: undefined
  } : null;
}

function normalizeCapabilities(source) {
  const entries = listEntries(capabilityValue(source));
  return uniqueByLabel(entries.map(capabilityEntry).filter(Boolean));
}

function getEffectValue(source) {
  if (Array.isArray(source)) return source;
  const value = firstValue(source, EFFECT_FIELDS);
  if (hasValue(value)) return value;
  const capabilities = normalizeCapabilities(source);
  const capabilityEffects = capabilities.filter((item) => item.effect).map((item) => ({
    label: item.effect,
    kind: item.effect,
    external: item.external
  }));
  return capabilityEffects;
}

function classifyEffect(value) {
  const text = foldedText(value);
  const writes = /(write|create|update|delete|remove|send|post|publish|modify|move|archive|invite|change|charge|refund|close|revoke)/.test(text);
  const reads = /(read|list|search|fetch|view|retrieve|sync|receive|monitor|watch|lookup|inspect|export)/.test(text);
  if (writes && reads) return "mixed";
  if (writes) return "write";
  if (reads) return "read";
  return "unknown";
}

function effectEntry(value) {
  if (typeof value === "boolean") {
    return value ? { id: "external-effect", label: "Can change external data", description: "", kind: "write", external: true, requiresApproval: false } : null;
  }
  if (isRecord(value)) {
    const rawLabel = firstText(value, ["label", "name", "title", "effect", "action", "operation", "description", "detail", "id", "key"]);
    const label = displayLabel(rawLabel);
    if (!label) return null;
    const kind = classifyEffect(firstText(value, ["kind", "type", "effect", "action", "operation"]) || label);
    const external = explicitBoolean(value, ["external", "externalEffect", "external_effect", "sideEffect", "side_effect"]) ?? (kind === "write" || kind === "mixed");
    return {
      id: normaliseKey(firstText(value, ["id", "key", "slug"]) || label),
      label,
      description: firstText(value, ["description", "detail", "help"]),
      kind,
      external,
      requiresApproval: explicitBoolean(value, ["requiresApproval", "requires_approval", "approvalRequired", "approval_required"]) ?? false
    };
  }
  const label = displayLabel(value);
  if (!label) return null;
  const kind = classifyEffect(label);
  return {
    id: normaliseKey(label),
    label,
    description: "",
    kind,
    external: kind === "write" || kind === "mixed",
    requiresApproval: false
  };
}

function normalizeEffects(source) {
  return uniqueByLabel(listEntries(getEffectValue(source)).map(effectEntry).filter(Boolean));
}

function normaliseRiskLevel(value) {
  const text = foldedText(value).replace(/\s+/g, "-");
  if (!text) return "unknown";
  if (RISK_META[text]) return text;
  if (RISK_ALIASES[text]) return RISK_ALIASES[text];
  if (/critical|destruct|severe/.test(text)) return "critical";
  if (/high|danger|elevat/.test(text)) return "high";
  if (/medium|moderate|medium/.test(text)) return "medium";
  if (/low|minimal|safe|read/.test(text)) return "low";
  return "unknown";
}

function normalizeRisk(source) {
  const value = firstValue(source, ["risk", "riskLevel", "risk_level", "riskClass", "risk_class", "sensitivity", "impact", "severity"]);
  let rawLevel = value;
  let rawLabel = "";
  let description = "";
  let requiresApproval;
  if (isRecord(value)) {
    rawLevel = firstValue(value, ["level", "riskLevel", "risk_level", "severity", "value", "name"]);
    rawLabel = firstText(value, ["label", "title", "displayName", "display_name"]);
    description = firstText(value, ["description", "detail", "summary"]);
    requiresApproval = explicitBoolean(value, ["requiresApproval", "requires_approval", "approvalRequired", "approval_required"]);
  }
  const level = normaliseRiskLevel(rawLevel);
  const meta = RISK_META[level];
  const connectorApproval = explicitBoolean(source, ["requiresApproval", "requires_approval", "approvalRequired", "approval_required"]);
  return {
    level,
    label: rawLabel ? displayLabel(rawLabel) : meta.label,
    tone: meta.tone,
    className: meta.className,
    description: description || meta.description,
    requiresApproval: requiresApproval ?? connectorApproval ?? ["medium", "high", "critical"].includes(level)
  };
}

function setupValue(source) {
  const value = firstValue(source, SETUP_FIELDS);
  if (!hasValue(value)) return [];
  if (Array.isArray(value) || typeof value === "string") return value;
  if (isRecord(value)) {
    for (const field of ["steps", "setupSteps", "setup_steps", "items", "instructions", "requirements", "actions"]) {
      const nested = readValue(value, field);
      if (hasValue(nested)) return nested;
    }
    if (isDescriptor(value)) return [value];
  }
  return value;
}

function formatSetupStep(value, index = 0) {
  const item = isRecord(value) && isRecord(readValue(value, "step")) ? readValue(value, "step") : value;
  let title = "";
  let description = "";
  let required;
  let id = "";
  if (isRecord(item)) {
    title = firstText(item, ["title", "label", "name", "action", "instruction", "summary", "text", "value", "content"]);
    if (!title && typeof readValue(item, "step") === "string") title = safeText(readValue(item, "step"));
    description = firstText(item, ["description", "detail", "help", "copy", "body", "notes", "instructions"]);
    id = firstText(item, ["id", "key", "slug"]);
    required = explicitBoolean(item, ["required", "isRequired", "is_required", "optional"]);
    if (typeof readValue(item, "optional") === "boolean") required = !readValue(item, "optional");
  } else {
    title = safeText(item);
  }
  if (!title && description) title = description;
  if (!title) title = `Step ${index + 1}`;
  if (required === undefined) required = true;
  const number = index + 1;
  const label = title.trim();
  const detail = description.trim();
  return {
    id: normaliseKey(id) || `setup-step-${number}`,
    number,
    step: number,
    title: label,
    label,
    description: detail,
    detail,
    required,
    optional: !required,
    text: detail ? `${label} — ${detail}` : label
  };
}

/** Return setup steps in a stable shape suitable for an ordered list. */
export function formatSetupSteps(source) {
  const value = Array.isArray(source) ? source : setupValue(source);
  return listEntries(value, { splitCommas: false })
    .map((item, index) => formatSetupStep(item, index))
    .filter((step) => step.title);
}

export function getSetupSteps(source) {
  return formatSetupSteps(source);
}

function connectionStatus(source, connected) {
  const raw = firstText(source, ["status", "connectionStatus", "connection_status", "state", "availability"]);
  if (raw) return raw.toLowerCase().replace(/[\s-]+/g, "_");
  return connected ? "connected" : "available";
}

function connectorSource(value) {
  if (isRecord(value)) {
    const nested = firstValue(value, ["connector", "app", "integration"]);
    if (isRecord(nested) && !firstText(value, ["id", "key", "name", "provider", "label"])) return nested;
    return value;
  }
  return value;
}

function searchTextFor(connector) {
  const values = [
    connector.id,
    connector.key,
    connector.name,
    connector.provider,
    connector.description,
    connector.category,
    ...(connector.categories || []),
    ...(connector.capabilityLabels || []),
    ...(connector.effectLabels || []),
    connector.risk?.label,
    connector.risk?.description,
    ...(connector.setupSteps || []).flatMap((step) => [step.title, step.description])
  ];
  return foldedText(values.filter(Boolean).join(" "));
}

/** Normalize one raw or legacy connector manifest without mutating it. */
export function normalizeConnector(raw, index = 0) {
  const source = connectorSource(raw);
  const record = isRecord(source) ? source : {};
  const primitiveName = safeText(source);
  const id = firstText(record, ["id", "key", "connectorId", "connector_id", "slug", "provider"]) || primitiveName || `connector-${index + 1}`;
  const name = firstText(record, ["name", "label", "title", "displayName", "display_name", "provider", "service"]) || humanise(id) || `Connector ${index + 1}`;
  const provider = firstText(record, ["provider", "vendor", "service", "source"]) || name;
  const categories = listEntries(firstValue(record, ["categories", "category", "categoryName", "category_name", "group", "type", "vertical"])).map((item) => {
    if (isRecord(item)) return firstText(item, ["label", "name", "title", "id", "key"]);
    return safeText(item);
  }).filter(Boolean).filter((item, itemIndex, list) => list.findIndex((candidate) => normaliseKey(candidate) === normaliseKey(item)) === itemIndex);
  if (!categories.length) categories.push("Other");
  const connected = explicitBoolean(record, ["connected", "isConnected", "is_connected"]) ?? ["connected", "active"].includes(connectionStatus(record, false));
  const capabilities = normalizeCapabilities(record);
  const effects = normalizeEffects(record);
  const risk = normalizeRisk(record);
  const setupSteps = formatSetupSteps(record);
  const normalized = {
    id,
    key: firstText(record, ["key", "slug"]) || id,
    name,
    provider,
    description: firstText(record, ["description", "summary", "detail", "tagline", "longDescription", "long_description"]),
    category: categories[0],
    categories,
    icon: firstText(record, ["icon", "logo", "logoUrl", "logo_url"]),
    status: connectionStatus(record, connected),
    connected,
    capabilities,
    capabilityLabels: capabilities.map((item) => item.label),
    effects,
    effectLabels: effects.map((item) => item.label),
    risk,
    riskLevel: risk.level,
    requiresApproval: risk.requiresApproval,
    readOnly: explicitBoolean(record, ["readOnly", "read_only"]) ?? (effects.length > 0 && effects.every((item) => !item.external)),
    setupSteps
  };
  normalized.searchText = searchTextFor(normalized);
  return normalized;
}

function catalogEntries(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined);
  if (!isRecord(value)) return safeText(value) ? [value] : [];
  for (const field of ["connectors", "connectorCatalog", "connector_catalog", "catalog", "items", "apps", "integrations", "results", "data"]) {
    const nested = readValue(value, field);
    if (Array.isArray(nested)) return nested.filter((item) => item !== null && item !== undefined);
    if (isRecord(nested)) {
      const entries = catalogEntries(nested, depth + 1);
      if (entries.length) return entries;
    }
  }
  if (isDescriptor(value) || ["description", "category", "capabilities", "actions"].some((field) => hasValue(readValue(value, field)))) return [value];
  try {
    return Object.values(value).filter((item) => item !== null && item !== undefined);
  } catch {
    return [];
  }
}

/** Normalize an array or a wrapped server catalog response. */
export function normalizeConnectorCatalog(value) {
  return catalogEntries(value).map((item, index) => normalizeConnector(item, index));
}

function asNormalizedList(value) {
  return normalizeConnectorCatalog(value);
}

function categoryMatches(connector, category) {
  if (Array.isArray(category)) return category.some((item) => categoryMatches(connector, item));
  const target = normaliseKey(category);
  if (!target || [CATEGORY_ALL, "any", "*"].includes(target)) return true;
  const values = [connector.category, ...(connector.categories || [])];
  return values.some((value) => normaliseKey(value) === target);
}

/** Filter by category, accepting display labels, ids, or the value "all". */
export function filterConnectorsByCategory(connectors, category = CATEGORY_ALL) {
  const options = isRecord(category) ? category : { category };
  const target = options.category ?? options.categoryId ?? options.group ?? CATEGORY_ALL;
  return asNormalizedList(connectors).filter((connector) => categoryMatches(connector, target));
}

export function filterByCategory(connectors, category = CATEGORY_ALL) {
  return filterConnectorsByCategory(connectors, category);
}

/** Match every meaningful search token against connector metadata. */
export function matchesConnectorSearch(connector, query = "") {
  const normalizedQuery = foldedText(isRecord(query) ? (query.query ?? query.search ?? query.term) : query);
  if (!normalizedQuery) return true;
  const candidate = normalizeConnector(connector).searchText || searchTextFor(normalizeConnector(connector));
  return normalizedQuery.split(/\s+/).every((token) => candidate.includes(token));
}

export function matchesSearch(connector, query = "") {
  return matchesConnectorSearch(connector, query);
}

/** Apply category and optional text filtering in one pure operation. */
export function filterConnectors(connectors, categoryOrOptions = CATEGORY_ALL, query) {
  const options = isRecord(categoryOrOptions) ? categoryOrOptions : { category: categoryOrOptions, query };
  const category = options.category ?? options.categoryId ?? options.group ?? CATEGORY_ALL;
  const search = options.query ?? options.search ?? options.term ?? "";
  return filterConnectorsByCategory(connectors, category).filter((connector) => matchesConnectorSearch(connector, search));
}

export function filterConnectorCatalog(connectors, options = {}) {
  return filterConnectors(connectors, options);
}

export function getConnectorCategories(connectors) {
  const labels = [];
  const seen = new Set();
  asNormalizedList(connectors).forEach((connector) => {
    [connector.category, ...(connector.categories || [])].forEach((category) => {
      const label = safeText(category);
      const key = normaliseKey(label);
      if (label && key && !seen.has(key)) {
        seen.add(key);
        labels.push(label);
      }
    });
  });
  return labels;
}

export function getCapabilityLabels(source) {
  if (isRecord(source)) {
    const explicit = listEntries(firstValue(source, ["capabilityLabels", "capability_labels"]));
    if (explicit.length) {
      return uniqueByLabel(explicit.map((item) => ({ label: displayLabel(isRecord(item) ? firstText(item, ["label", "name", "title", "id"]) : item) })).filter((item) => item.label)).map((item) => item.label);
    }
  }
  return normalizeCapabilities(source).map((item) => item.label);
}

export function capabilityLabel(value) {
  return capabilityEntry(value)?.label || "";
}

export function getEffectLabels(source) {
  return normalizeEffects(source).map((item) => item.label);
}

/** Return risk metadata ready for a badge or explanatory line in the UI. */
export function getRiskDisplay(source) {
  const risk = isRecord(source?.risk) && source.risk.level ? source.risk : normalizeRisk(source);
  const meta = RISK_META[risk.level] || RISK_META.unknown;
  return {
    level: risk.level || "unknown",
    label: risk.label || meta.label,
    text: risk.label || meta.label,
    tone: risk.tone || meta.tone,
    className: risk.className || meta.className,
    description: risk.description || meta.description,
    requiresApproval: Boolean(risk.requiresApproval)
  };
}

export function formatRiskDisplay(source) {
  return getRiskDisplay(source).label;
}

/** Return effect labels plus a conservative read/write classification. */
export function getEffectDisplay(source) {
  const effects = normalizeEffects(source);
  const labels = effects.map((item) => item.label);
  const kind = effects.reduce((result, item) => {
    if (result === "mixed" || item.kind === "unknown") return result === "unknown" ? item.kind : result;
    if (result === "unknown") return item.kind;
    if (result !== item.kind) return "mixed";
    return result;
  }, "unknown");
  const external = effects.some((item) => item.external || item.kind === "write" || item.kind === "mixed");
  const declaredReadOnly = isRecord(source) ? explicitBoolean(source, ["readOnly", "read_only"]) : undefined;
  const readOnly = declaredReadOnly ?? (effects.length > 0 && !external);
  const label = labels.length ? labels.join(" · ") : readOnly ? "Read-only access" : "Effect details not provided";
  return {
    labels,
    effects: labels,
    label,
    text: label,
    summary: label,
    kind,
    external,
    hasExternalEffects: external,
    readOnly,
    tone: external ? "caution" : readOnly ? "safe" : "muted",
    className: external ? "pill-amber" : readOnly ? "pill-teal" : "pill-muted",
    requiresApproval: effects.some((item) => item.requiresApproval)
  };
}

export function formatEffectDisplay(source) {
  return getEffectDisplay(source).label;
}

// Short aliases make the helpers convenient to consume from a view while the
// explicit get*/format* names remain self-documenting for other callers.
export const capabilityLabels = getCapabilityLabels;
export const riskDisplay = getRiskDisplay;
export const riskLabel = formatRiskDisplay;
export const effectDisplay = getEffectDisplay;
export const effectLabels = getEffectLabels;
export const effectLabel = formatEffectDisplay;

// Compatibility names for callers migrating from earlier catalog drafts.
export const normalizeConnectorEntry = normalizeConnector;
export const normalizeCatalog = normalizeConnectorCatalog;
export const filterCatalog = filterConnectorCatalog;
export const searchMatches = matchesConnectorSearch;
export const formatCapabilityLabels = getCapabilityLabels;
export const formatCapabilities = getCapabilityLabels;
export const getCapabilityDisplay = getCapabilityLabels;
export const getRiskLabel = formatRiskDisplay;
export const getEffectSummary = formatEffectDisplay;
