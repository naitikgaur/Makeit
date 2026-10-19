"use strict";

// This module is deliberately metadata-only.  It describes the connector
// surface that MakeEase may support; it does not contain credentials, OAuth
// details, provider clients, network addresses, or connection state from a
// real account.  Every entry is forced to the same preview state below so a
// newly added catalog row cannot accidentally claim that it is live.

const PREVIEW_AVAILABILITY = "preview";
const NOT_CONFIGURED_STATUS = "not_configured";
const DEFAULT_LIMIT = 50;
const MAX_CONNECTOR_RESULTS = 100;
const MAX_LOOKUP_LENGTH = 120;

const CONNECTOR_CATEGORIES = Object.freeze([
  "Communication",
  "Support",
  "CRM",
  "Ecommerce",
  "Finance",
  "Productivity",
  "Engineering",
  "Data",
  "Browser/Desktop Automation"
]);

function setupStepsFor(resource) {
  return [
    `Define the ${resource} data and workspace scope.`,
    "Choose a least-privilege account or resource when provider authorization is added.",
    "Review requested permissions, retention, and representative sample fields.",
    "Run a local preview; this catalog does not authorize or call the provider."
  ];
}

function createConnector({ id, name, category, description, capabilities, setupResource, riskClass, effectClass }) {
  const setupSteps = setupStepsFor(setupResource || name);
  const connector = {
    id,
    name,
    category,
    description: `${description} Public metadata only; no live provider connection is available.`,
    capabilities: Object.freeze([...capabilities]),
    // `setup` is retained as a concise bootstrap alias for clients that use
    // the same vocabulary as workflow templates.  Both fields are frozen.
    setupSteps: Object.freeze([...setupSteps]),
    setup: Object.freeze([...setupSteps]),
    riskClass,
    effectClass,
    availability: PREVIEW_AVAILABILITY,
    status: NOT_CONFIGURED_STATUS,
    available: false,
    connected: false
  };
  return Object.freeze(connector);
}

const CONNECTOR_CATALOG = Object.freeze([
  // Communication
  createConnector({
    id: "gmail",
    name: "Gmail",
    category: "Communication",
    description: "Preview mailbox search, message context, and reply drafting for a scoped Gmail workflow.",
    capabilities: ["Read message metadata", "Search messages by label or sender", "Prepare draft replies"],
    setupResource: "Gmail mailbox or label",
    riskClass: "medium",
    effectClass: "draft"
  }),
  createConnector({
    id: "outlook",
    name: "Microsoft Outlook",
    category: "Communication",
    description: "Preview mail and folder context for a scoped Microsoft 365 workflow.",
    capabilities: ["Read mail metadata", "Filter messages and folders", "Prepare draft replies"],
    setupResource: "Outlook mailbox or folder",
    riskClass: "medium",
    effectClass: "draft"
  }),
  createConnector({
    id: "slack",
    name: "Slack",
    category: "Communication",
    description: "Preview channel and thread context without joining a workspace or posting a message.",
    capabilities: ["Read channel messages", "Search conversations", "Prepare channel reply drafts"],
    setupResource: "Slack workspace and channel",
    riskClass: "medium",
    effectClass: "draft"
  }),
  createConnector({
    id: "microsoft-teams",
    name: "Microsoft Teams",
    category: "Communication",
    description: "Preview team and channel context for a future Microsoft Teams workflow.",
    capabilities: ["Read channel messages", "Search team conversations", "Prepare reply drafts"],
    setupResource: "Teams team and channel",
    riskClass: "medium",
    effectClass: "draft"
  }),
  createConnector({
    id: "twilio",
    name: "Twilio",
    category: "Communication",
    description: "Preview message and delivery metadata without sending SMS or voice traffic.",
    capabilities: ["Read message metadata", "Inspect delivery status", "Prepare outbound message drafts"],
    setupResource: "Twilio messaging service",
    riskClass: "high",
    effectClass: "write"
  }),

  // Support
  createConnector({
    id: "zendesk",
    name: "Zendesk",
    category: "Support",
    description: "Preview ticket, requester, and help-center context for support triage.",
    capabilities: ["Read ticket fields", "Search requester and organization context", "Prepare ticket reply drafts"],
    setupResource: "Zendesk account and ticket view",
    riskClass: "medium",
    effectClass: "draft"
  }),
  createConnector({
    id: "intercom",
    name: "Intercom",
    category: "Support",
    description: "Preview conversation and user context without replying to a customer.",
    capabilities: ["Read conversation context", "Search contact attributes", "Prepare conversation reply drafts"],
    setupResource: "Intercom workspace and inbox",
    riskClass: "medium",
    effectClass: "draft"
  }),
  createConnector({
    id: "freshdesk",
    name: "Freshdesk",
    category: "Support",
    description: "Preview support tickets and customer context for a bounded service workflow.",
    capabilities: ["Read ticket metadata", "Search customer records", "Prepare ticket reply drafts"],
    setupResource: "Freshdesk account and queue",
    riskClass: "medium",
    effectClass: "draft"
  }),
  createConnector({
    id: "gorgias",
    name: "Gorgias",
    category: "Support",
    description: "Preview support conversations and order context for ecommerce service review.",
    capabilities: ["Read conversation context", "Inspect linked order metadata", "Prepare response drafts"],
    setupResource: "Gorgias helpdesk and queue",
    riskClass: "medium",
    effectClass: "draft"
  }),
  createConnector({
    id: "helpscout",
    name: "Help Scout",
    category: "Support",
    description: "Preview mailbox conversations and customer context without changing a thread.",
    capabilities: ["Read mailbox threads", "Search customer profiles", "Prepare reply drafts"],
    setupResource: "Help Scout mailbox",
    riskClass: "medium",
    effectClass: "draft"
  }),

  // CRM
  createConnector({
    id: "hubspot",
    name: "HubSpot",
    category: "CRM",
    description: "Preview contacts, companies, deals, and activity context for revenue workflows.",
    capabilities: ["Read contact and company records", "Search deal pipelines", "Prepare activity note drafts"],
    setupResource: "HubSpot portal and object scope",
    riskClass: "medium",
    effectClass: "write"
  }),
  createConnector({
    id: "salesforce",
    name: "Salesforce",
    category: "CRM",
    description: "Preview selected Salesforce records and report context without mutating CRM data.",
    capabilities: ["Read scoped object records", "Inspect report metadata", "Prepare record update proposals"],
    setupResource: "Salesforce org and object scope",
    riskClass: "high",
    effectClass: "write"
  }),
  createConnector({
    id: "pipedrive",
    name: "Pipedrive",
    category: "CRM",
    description: "Preview people, organizations, and deal context for a bounded sales workflow.",
    capabilities: ["Read people and organization records", "Search deals and stages", "Prepare activity proposals"],
    setupResource: "Pipedrive workspace and pipeline",
    riskClass: "medium",
    effectClass: "write"
  }),
  createConnector({
    id: "zoho-crm",
    name: "Zoho CRM",
    category: "CRM",
    description: "Preview CRM modules and pipeline context without creating or updating records.",
    capabilities: ["Read scoped CRM modules", "Search leads and deals", "Prepare field update proposals"],
    setupResource: "Zoho CRM organization and modules",
    riskClass: "medium",
    effectClass: "write"
  }),

  // Ecommerce
  createConnector({
    id: "shopify",
    name: "Shopify",
    category: "Ecommerce",
    description: "Preview storefront products, orders, and fulfillment context without changing a store.",
    capabilities: ["Read product and inventory metadata", "Search order context", "Prepare catalog or order proposals"],
    setupResource: "Shopify store and resource scope",
    riskClass: "high",
    effectClass: "write"
  }),
  createConnector({
    id: "woocommerce",
    name: "WooCommerce",
    category: "Ecommerce",
    description: "Preview store catalog and order context for a future WooCommerce workflow.",
    capabilities: ["Read product metadata", "Search order records", "Prepare catalog change proposals"],
    setupResource: "WooCommerce store and resource scope",
    riskClass: "high",
    effectClass: "write"
  }),
  createConnector({
    id: "bigcommerce",
    name: "BigCommerce",
    category: "Ecommerce",
    description: "Preview catalog, customer, and order context without publishing a store change.",
    capabilities: ["Read catalog metadata", "Search customer and order records", "Prepare product update proposals"],
    setupResource: "BigCommerce store and channel",
    riskClass: "high",
    effectClass: "write"
  }),
  createConnector({
    id: "amazon-seller",
    name: "Amazon Seller Central",
    category: "Ecommerce",
    description: "Preview seller catalog and order metadata without changing listings or fulfillment.",
    capabilities: ["Read listing metadata", "Inspect order summaries", "Prepare listing review proposals"],
    setupResource: "Amazon seller account and marketplace",
    riskClass: "high",
    effectClass: "write"
  }),

  // Finance
  createConnector({
    id: "stripe",
    name: "Stripe",
    category: "Finance",
    description: "Preview payment, customer, and product metadata without charging, refunding, or transferring funds.",
    capabilities: ["Read payment and customer metadata", "Inspect product and subscription context", "Prepare refund review proposals"],
    setupResource: "Stripe account and object scope",
    riskClass: "high",
    effectClass: "financial"
  }),
  createConnector({
    id: "quickbooks",
    name: "QuickBooks Online",
    category: "Finance",
    description: "Preview accounting records and report context without posting a transaction.",
    capabilities: ["Read invoice and customer metadata", "Inspect account and report context", "Prepare transaction review proposals"],
    setupResource: "QuickBooks company and accounting scope",
    riskClass: "high",
    effectClass: "financial"
  }),
  createConnector({
    id: "xero",
    name: "Xero",
    category: "Finance",
    description: "Preview invoices, contacts, and accounting context without reconciling or posting entries.",
    capabilities: ["Read invoice and contact metadata", "Inspect account context", "Prepare reconciliation review proposals"],
    setupResource: "Xero organization and accounting scope",
    riskClass: "high",
    effectClass: "financial"
  }),
  createConnector({
    id: "plaid",
    name: "Plaid",
    category: "Finance",
    description: "Preview consented account and transaction metadata without initiating a transfer.",
    capabilities: ["Read account metadata", "Inspect transaction summaries", "Prepare cash-flow review context"],
    setupResource: "Plaid institution item and data scope",
    riskClass: "high",
    effectClass: "financial"
  }),
  createConnector({
    id: "ramp",
    name: "Ramp",
    category: "Finance",
    description: "Preview spend and receipt metadata without approving spend or changing a card policy.",
    capabilities: ["Read transaction metadata", "Inspect receipt and spend context", "Prepare policy review proposals"],
    setupResource: "Ramp workspace and spend scope",
    riskClass: "high",
    effectClass: "financial"
  }),

  // Productivity
  createConnector({
    id: "notion",
    name: "Notion",
    category: "Productivity",
    description: "Preview pages and databases for a governed knowledge workflow without editing a page.",
    capabilities: ["Read page content metadata", "Search databases", "Prepare page update drafts"],
    setupResource: "Notion workspace and shared pages",
    riskClass: "medium",
    effectClass: "draft"
  }),
  createConnector({
    id: "google-drive",
    name: "Google Drive",
    category: "Productivity",
    description: "Preview scoped files and folders without downloading or changing shared documents.",
    capabilities: ["List scoped files and folders", "Search file metadata", "Prepare document organization proposals"],
    setupResource: "Google Drive shared folder",
    riskClass: "medium",
    effectClass: "draft"
  }),
  createConnector({
    id: "google-calendar",
    name: "Google Calendar",
    category: "Productivity",
    description: "Preview calendar availability and event context without creating or moving an event.",
    capabilities: ["Read event metadata", "Inspect availability windows", "Prepare event drafts"],
    setupResource: "Google Calendar and calendar scope",
    riskClass: "medium",
    effectClass: "draft"
  }),
  createConnector({
    id: "airtable",
    name: "Airtable",
    category: "Productivity",
    description: "Preview base and table records for structured team operations without changing a row.",
    capabilities: ["Read table records", "Search views and fields", "Prepare row update proposals"],
    setupResource: "Airtable base and table scope",
    riskClass: "medium",
    effectClass: "write"
  }),
  createConnector({
    id: "asana",
    name: "Asana",
    category: "Productivity",
    description: "Preview projects and tasks for planning workflows without assigning or completing work.",
    capabilities: ["Read project and task metadata", "Search assignees and due dates", "Prepare task update proposals"],
    setupResource: "Asana workspace and project",
    riskClass: "medium",
    effectClass: "write"
  }),
  createConnector({
    id: "trello",
    name: "Trello",
    category: "Productivity",
    description: "Preview boards, lists, and cards without moving a card or posting a comment.",
    capabilities: ["Read board and card metadata", "Search lists and labels", "Prepare card update proposals"],
    setupResource: "Trello workspace and board",
    riskClass: "medium",
    effectClass: "write"
  }),

  // Engineering
  createConnector({
    id: "github",
    name: "GitHub",
    category: "Engineering",
    description: "Preview repository, issue, and pull-request context without changing source control.",
    capabilities: ["Read repository metadata", "Search issues and pull requests", "Prepare issue or pull-request drafts"],
    setupResource: "GitHub organization and repository",
    riskClass: "high",
    effectClass: "write"
  }),
  createConnector({
    id: "gitlab",
    name: "GitLab",
    category: "Engineering",
    description: "Preview projects, issues, and merge-request context without pushing code or changing a project.",
    capabilities: ["Read project metadata", "Search issues and merge requests", "Prepare merge-request drafts"],
    setupResource: "GitLab group and project",
    riskClass: "high",
    effectClass: "write"
  }),
  createConnector({
    id: "linear",
    name: "Linear",
    category: "Engineering",
    description: "Preview issues and project context without assigning, closing, or editing an issue.",
    capabilities: ["Read issue metadata", "Search projects and cycles", "Prepare issue update proposals"],
    setupResource: "Linear workspace and team",
    riskClass: "medium",
    effectClass: "write"
  }),
  createConnector({
    id: "jira",
    name: "Jira",
    category: "Engineering",
    description: "Preview Jira project and issue context without transitioning or commenting on an issue.",
    capabilities: ["Read issue fields", "Search projects and sprints", "Prepare issue transition proposals"],
    setupResource: "Jira site and project",
    riskClass: "high",
    effectClass: "write"
  }),
  createConnector({
    id: "sentry",
    name: "Sentry",
    category: "Engineering",
    description: "Preview error, issue, and release context for diagnosis without changing monitoring state.",
    capabilities: ["Read issue and event metadata", "Search releases and tags", "Prepare incident context"],
    setupResource: "Sentry organization and project",
    riskClass: "medium",
    effectClass: "read-only"
  }),
  createConnector({
    id: "pagerduty",
    name: "PagerDuty",
    category: "Engineering",
    description: "Preview incidents and service metadata without acknowledging or escalating an incident.",
    capabilities: ["Read incident metadata", "Inspect service ownership", "Prepare incident response proposals"],
    setupResource: "PagerDuty account and service",
    riskClass: "high",
    effectClass: "write"
  }),

  // Data
  createConnector({
    id: "postgresql",
    name: "PostgreSQL",
    category: "Data",
    description: "Preview schema and bounded read-query metadata without executing a write query.",
    capabilities: ["Inspect approved schema metadata", "Prepare bounded read queries", "Preview result shape"],
    setupResource: "PostgreSQL database and read-only role",
    riskClass: "high",
    effectClass: "read-only"
  }),
  createConnector({
    id: "snowflake",
    name: "Snowflake",
    category: "Data",
    description: "Preview warehouse metadata and bounded analytical query plans without changing data.",
    capabilities: ["Inspect approved schemas", "Prepare bounded analytical queries", "Preview result shape"],
    setupResource: "Snowflake account, warehouse, and read role",
    riskClass: "high",
    effectClass: "read-only"
  }),
  createConnector({
    id: "bigquery",
    name: "Google BigQuery",
    category: "Data",
    description: "Preview datasets and bounded query plans without starting a live query or export.",
    capabilities: ["Inspect dataset metadata", "Prepare bounded read queries", "Preview estimated result fields"],
    setupResource: "BigQuery project, dataset, and read role",
    riskClass: "high",
    effectClass: "read-only"
  }),
  createConnector({
    id: "databricks",
    name: "Databricks",
    category: "Data",
    description: "Preview catalogs and analytical context without running a notebook or changing a workspace.",
    capabilities: ["Inspect catalog metadata", "Prepare bounded SQL queries", "Preview table and result shape"],
    setupResource: "Databricks workspace and SQL warehouse",
    riskClass: "high",
    effectClass: "read-only"
  }),
  createConnector({
    id: "redshift",
    name: "Amazon Redshift",
    category: "Data",
    description: "Preview warehouse schemas and bounded read-query plans without modifying a cluster.",
    capabilities: ["Inspect schema metadata", "Prepare bounded read queries", "Preview result shape"],
    setupResource: "Redshift cluster and read-only role",
    riskClass: "high",
    effectClass: "read-only"
  }),

  // Browser/desktop automation
  createConnector({
    id: "browser-automation",
    name: "Browser automation",
    category: "Browser/Desktop Automation",
    description: "Preview a policy-bounded browser task without opening a user profile or submitting a form.",
    capabilities: ["Inspect an allowlisted page", "Extract visible fields", "Prepare a click or form-action plan"],
    setupResource: "disposable browser session and allowlisted domain",
    riskClass: "high",
    effectClass: "browser-control"
  }),
  createConnector({
    id: "playwright",
    name: "Playwright",
    category: "Browser/Desktop Automation",
    description: "Preview deterministic browser steps against an allowlisted test surface without a live session.",
    capabilities: ["Plan semantic browser actions", "Capture page evidence", "Prepare form-submission previews"],
    setupResource: "Playwright worker and allowlisted test domain",
    riskClass: "high",
    effectClass: "browser-control"
  }),
  createConnector({
    id: "desktop-automation",
    name: "Desktop automation",
    category: "Browser/Desktop Automation",
    description: "Preview bounded desktop UI actions without controlling the user's desktop or reading its profile.",
    capabilities: ["Plan visible UI actions", "Capture step evidence", "Prepare an operator-review action plan"],
    setupResource: "isolated desktop worker and application allowlist",
    riskClass: "high",
    effectClass: "browser-control"
  })
]);

const CONNECTOR_INDEX = new Map(CONNECTOR_CATALOG.map((connector) => [connector.id, connector]));

function cloneConnector(connector) {
  if (!connector) return null;
  return {
    id: connector.id,
    name: connector.name,
    category: connector.category,
    description: connector.description,
    capabilities: [...connector.capabilities],
    setupSteps: [...connector.setupSteps],
    setup: [...connector.setupSteps],
    riskClass: connector.riskClass,
    effectClass: connector.effectClass,
    availability: PREVIEW_AVAILABILITY,
    status: NOT_CONFIGURED_STATUS,
    available: false,
    connected: false
  };
}

function lookupText(value) {
  if (typeof value !== "string") return "";
  const result = value.trim().toLowerCase();
  return result.length > MAX_LOOKUP_LENGTH ? "" : result;
}

function boundedLimit(options) {
  const requested = typeof options === "number" ? options : options && options.limit;
  if (!Number.isInteger(requested)) return DEFAULT_LIMIT;
  return Math.max(0, Math.min(MAX_CONNECTOR_RESULTS, requested));
}

function publicConnectors(options = {}) {
  const limit = boundedLimit(options);
  return CONNECTOR_CATALOG.slice(0, limit).map(cloneConnector);
}

function connectorById(id) {
  const key = lookupText(id);
  if (!key) return null;
  return cloneConnector(CONNECTOR_INDEX.get(key));
}

function connectorsByCategory(category, options = {}) {
  const key = lookupText(category);
  if (!key) return [];
  const limit = boundedLimit(options);
  return CONNECTOR_CATALOG
    .filter((connector) => connector.category.toLowerCase() === key)
    .slice(0, limit)
    .map(cloneConnector);
}

function findConnectors(query, options = {}) {
  const key = lookupText(query);
  if (!key) return [];
  const limit = boundedLimit(options);
  return CONNECTOR_CATALOG
    .filter((connector) => {
      const haystack = [connector.id, connector.name, connector.category, connector.description, ...connector.capabilities]
        .join(" ")
        .toLowerCase();
      return haystack.includes(key);
    })
    .slice(0, limit)
    .map(cloneConnector);
}

function connectorCategories() {
  return [...CONNECTOR_CATEGORIES];
}

module.exports = {
  PREVIEW_AVAILABILITY,
  NOT_CONFIGURED_STATUS,
  DEFAULT_LIMIT,
  MAX_CONNECTOR_RESULTS,
  CONNECTOR_CATEGORIES,
  CONNECTOR_CATALOG,
  // `CONNECTORS` is a readable alias for bootstrap callers; the underlying
  // catalog is frozen and every helper returns detached public copies.
  CONNECTORS: CONNECTOR_CATALOG,
  connectorById,
  connectorsByCategory,
  connectorCategories,
  findConnectors,
  publicConnectors
};
