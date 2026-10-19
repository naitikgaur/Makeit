"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs").promises;
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { test } = require("node:test");

const {
  DEFAULT_WORKSPACE,
  JsonStore,
  createRequestHandler
} = require("./server");
const {
  approvalDecision,
  run,
  workflow
} = require("./lib/validation");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeHeaders(key, extra = {}) {
  return { "content-type": "application/json", "idempotency-key": key, ...extra };
}

function invokeRequest(handler, request) {
  const chunks = [];
  const response = {
    statusCode: 200,
    headers: {},
    writableEnded: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = String(value);
    },
    end(chunk) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      this.writableEnded = true;
    }
  };

  return Promise.resolve(handler(request, response)).then(() => ({
    statusCode: response.statusCode,
    headers: response.headers,
    body: Buffer.concat(chunks).toString("utf8"),
    json() {
      return JSON.parse(this.body);
    }
  }));
}

function invoke(handler, { method = "GET", url = "/", headers = {}, body = "" } = {}) {
  const request = Readable.from(body ? [Buffer.from(body)] : []);
  request.method = method;
  request.url = url;
  request.headers = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return invokeRequest(handler, request);
}

function invokeAborted(handler, { method = "PATCH", url = "/api/workspace", headers = {}, body = "{}" } = {}) {
  const request = new Readable({ read() {} });
  request.method = method;
  request.url = url;
  request.headers = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  const pending = invokeRequest(handler, request);
  queueMicrotask(() => request.emit("aborted"));
  return pending;
}

function assertError(response, code) {
  const payload = response.json();
  assert.equal(response.statusCode >= 400, true);
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, code);
  assert.equal(payload.error.requestId, response.headers["x-request-id"]);
  assert.ok(payload.error.message);
  return payload;
}

async function withWorkspace(initialValue, callback) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "makeease-contract-"));
  const filePath = path.join(directory, "data", "workspace.json");
  const store = new JsonStore(filePath, clone(initialValue));
  const handler = createRequestHandler({ store });
  try {
    return await callback({ directory, filePath, store, handler });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("bootstrap and workspace snapshots expose a stable local-v1 contract", async () => {
  await withWorkspace(DEFAULT_WORKSPACE, async ({ handler }) => {
    const api = await invoke(handler, { url: "/api" });
    assert.equal(api.statusCode, 200);
    const apiPayload = api.json();
    assert.equal(apiPayload.ok, true);
    assert.equal(apiPayload.meta.contractVersion, "local-v1");
    assert.equal(apiPayload.meta.mode, "sandbox");
    assert.equal(apiPayload.meta.externalSideEffects, false);
    assert.equal(apiPayload.meta.idempotency.durable, true);
    assert.ok(apiPayload.routes.includes("GET /api/bootstrap"));
    assert.ok(apiPayload.routes.includes("GET /api/workspace"));
    assert.ok(apiPayload.routes.includes("PUT|PATCH /api/workspace"));

    const bootstrap = await invoke(handler, { url: "/api/bootstrap" });
    assert.equal(bootstrap.statusCode, 200);
    const bootstrapPayload = bootstrap.json();
    assert.equal(bootstrapPayload.ok, true);
    assert.equal(bootstrapPayload.mode, "sandbox");
    assert.equal(bootstrapPayload.user, null);
    assert.equal(bootstrapPayload.csrfToken, null);
    assert.deepEqual(bootstrapPayload.topup, { price: 12, credits: 10000 });
    assert.ok(bootstrapPayload.plans.length >= 3);
    assert.ok(bootstrapPayload.templates.length > 0);
    assert.ok(bootstrapPayload.models.length > 0);
    assert.ok(bootstrapPayload.models.every((model) => Object.keys(model).sort().join(",") === "configured,id,label"));
    assert.ok(bootstrapPayload.models.every((model) => model.configured === false));
    assert.equal(bootstrapPayload.workspace.id, "demo-workspace");
    assert.equal(bootstrapPayload.workspace.planId, "starter");
    assert.equal(bootstrapPayload.workspace.usage.available, 15000);
    assert.equal(bootstrapPayload.workspace.workflows.length, 0);
    assert.deepEqual(bootstrapPayload.workspace.runs, [], "the bootstrap snapshot does not invent run history");
    assert.equal(bootstrapPayload.workspace.approvals.length, 0);
    assert.ok(bootstrapPayload.workspace.integrations.every((item) => item.status === "not_configured" && item.connected === false && item.available === false));
    assert.doesNotMatch(JSON.stringify(bootstrapPayload.models), /apiKey|baseUrl|password|secret/i);

    const workspace = await invoke(handler, { url: "/api/workspace" });
    assert.equal(workspace.statusCode, 200);
    const workspacePayload = workspace.json();
    assert.equal(workspacePayload.ok, true);
    for (const key of ["activity", "approvals", "integrations", "knowledge", "ledger", "meta", "ok", "runs", "usage", "workspace", "workflows"]) {
      assert.ok(Object.prototype.hasOwnProperty.call(workspacePayload, key), `workspace response is missing ${key}`);
    }
    assert.equal(workspacePayload.meta.contractVersion, "local-v1");
    assert.equal(workspacePayload.workspace.id, bootstrapPayload.workspace.id);
    assert.deepEqual(workspacePayload.usage, bootstrapPayload.workspace.usage);
    assert.deepEqual(workspacePayload.workflows, []);
    assert.deepEqual(workspacePayload.runs, []);
    assert.deepEqual(workspacePayload.approvals, []);
    assert.deepEqual(workspacePayload.ledger, []);
    assert.deepEqual(workspacePayload.auditEvents || [], []);
    assert.equal(workspacePayload.integrations.every((item) => item.status === "not_configured"), true);
  });
});

async function waitForRun(handler, runId) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await invoke(handler, { url: `/api/runs/${runId}` });
    assert.equal(response.statusCode, 200);
    const runValue = response.json().run;
    if (!["queued", "running"].includes(runValue.status)) return runValue;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error(`run ${runId} did not settle within the deterministic local polling bound`);
}

test("workflow, run, approval, ledger, and audit lifecycle settles exactly once", async () => {
  await withWorkspace(DEFAULT_WORKSPACE, async ({ handler, filePath }) => {
    const workflowRequest = {
      name: "Contract triage",
      description: "Prepare an internal support plan.",
      templateId: "customer-support-triage",
      model: "gpt-oss",
      budgetCredits: 20,
      requiresApproval: true
    };
    const created = await invoke(handler, {
      method: "POST",
      url: "/api/workflows",
      headers: writeHeaders("contract-workflow-create"),
      body: JSON.stringify(workflowRequest)
    });
    assert.equal(created.statusCode, 201);
    const createdWorkflow = created.json().workflow;
    assert.match(createdWorkflow.id, /^workflow-/);
    assert.equal(createdWorkflow.status, "draft");
    assert.equal(createdWorkflow.runs, 0);
    assert.equal(createdWorkflow.credits, 0);

    const workflowReplay = await invoke(handler, {
      method: "POST",
      url: "/api/workflows",
      headers: writeHeaders("contract-workflow-create"),
      body: JSON.stringify(workflowRequest)
    });
    assert.equal(workflowReplay.statusCode, 200);
    assert.equal(workflowReplay.headers["idempotency-replayed"], "true");
    assert.equal(workflowReplay.json().workflow.id, createdWorkflow.id);

    const activated = await invoke(handler, {
      method: "PATCH",
      url: `/api/workflows/${createdWorkflow.id}`,
      headers: writeHeaders("contract-workflow-activate"),
      body: JSON.stringify({ status: "active" })
    });
    assert.equal(activated.statusCode, 200);
    assert.equal(activated.json().workflow.status, "active");

    const queued = await invoke(handler, {
      method: "POST",
      url: `/api/workflows/${createdWorkflow.id}/run`,
      headers: writeHeaders("contract-run-1"),
      body: JSON.stringify({ input: "Customer cannot access their account." })
    });
    assert.equal(queued.statusCode, 202);
    const queuedRun = queued.json().run;
    assert.match(queuedRun.id, /^run-/);
    assert.equal(queuedRun.status, "queued");
    assert.equal(queuedRun.mode, "sandbox");
    assert.equal(queuedRun.reservedCredits, 20);
    assert.equal(queuedRun.credits, 0);
    assert.ok(queuedRun.steps.length > 0);

    const runReplay = await invoke(handler, {
      method: "POST",
      url: `/api/workflows/${createdWorkflow.id}/run`,
      headers: writeHeaders("contract-run-1"),
      body: JSON.stringify({ input: "Customer cannot access their account." })
    });
    assert.equal(runReplay.statusCode, 200);
    assert.equal(runReplay.headers["idempotency-replayed"], "true");
    assert.equal(runReplay.json().run.id, queuedRun.id);

    const settled = await waitForRun(handler, queuedRun.id);
    assert.equal(settled.status, "awaiting_approval", JSON.stringify(settled));
    assert.equal(settled.mode, "sandbox");
    assert.equal(settled.reservedCredits, 20);
    assert.ok(settled.credits >= 1 && settled.credits <= 20);
    assert.equal(settled.output.sideEffectsPerformed, false);
    assert.match(settled.output.note, /No AI provider, connector, email, deployment, payment/);
    assert.ok(settled.steps.every((step) => step.status === "completed"));

    const pending = await invoke(handler, { url: "/api/approvals" });
    assert.equal(pending.statusCode, 200);
    const approval = pending.json().approvals.find((item) => item.runId === queuedRun.id);
    assert.ok(approval);
    assert.equal(approval.status, "pending");
    assert.equal(approval.credits, settled.credits);

    const usageBeforeDecision = (await invoke(handler, { url: "/api/usage" })).json().usage;
    assert.equal(usageBeforeDecision.reserved, 20);
    assert.equal(usageBeforeDecision.used, 0);

    const approved = await invoke(handler, {
      method: "POST",
      url: `/api/approvals/${approval.id}/decision`,
      headers: writeHeaders("contract-approval-1"),
      body: JSON.stringify({ decision: "approve" })
    });
    assert.equal(approved.statusCode, 200);
    assert.equal(approved.json().approval.status, "approved");
    assert.equal(approved.json().run.status, "completed");
    assert.equal(approved.json().run.reservedCredits, 0);
    assert.equal(approved.json().usage.reserved, 0);
    assert.equal(approved.json().usage.used, settled.credits);

    const ledgerAfterApproval = (await invoke(handler, { url: "/api/ledger" })).json().ledger;
    assert.deepEqual(ledgerAfterApproval.map((entry) => entry.type), ["reservation", "consumption", "release"]);
    assert.equal(ledgerAfterApproval[0].amount, 20);
    assert.equal(ledgerAfterApproval[1].amount, settled.credits);
    assert.equal(ledgerAfterApproval[2].amount, 20 - settled.credits);

    const approvalReplay = await invoke(handler, {
      method: "POST",
      url: `/api/approvals/${approval.id}/decision`,
      headers: writeHeaders("contract-approval-1"),
      body: JSON.stringify({ decision: "approve" })
    });
    assert.equal(approvalReplay.statusCode, 200);
    assert.equal(approvalReplay.headers["idempotency-replayed"], "true");
    assert.equal(approvalReplay.json().usage.used, settled.credits);
    assert.equal((await invoke(handler, { url: "/api/ledger" })).json().ledger.length, 3);

    const audit = (await invoke(handler, { url: "/api/audit" })).json().events;
    assert.ok(audit.some((event) => event.eventType === "workflow.created"));
    assert.ok(audit.some((event) => event.eventType === "run.created"));
    assert.ok(audit.some((event) => event.eventType === "approval.created"));
    assert.ok(audit.some((event) => event.eventType === "approval.approved"));
    assert.ok(audit.every((event) => event.createdAt && event.detail));

    const reopened = await new JsonStore(filePath).read();
    assert.equal(reopened.runs.find((item) => item.id === queuedRun.id).status, "completed");
    assert.equal(reopened.approvals.find((item) => item.id === approval.id).status, "approved");
    assert.equal(reopened.usage.reserved, 0);
    assert.equal(reopened.usage.used, settled.credits);
    assert.equal(reopened.ledger.length, 3);
  });
});

test("sandbox top-up is explicit, side-effect-free, and idempotent", async () => {
  await withWorkspace(DEFAULT_WORKSPACE, async ({ handler }) => {
    const first = await invoke(handler, {
      method: "POST",
      url: "/api/billing/sandbox-topup",
      headers: writeHeaders("contract-topup-1"),
      body: JSON.stringify({})
    });
    assert.equal(first.statusCode, 200);
    const firstPayload = first.json();
    assert.equal(firstPayload.sandbox, true);
    assert.equal(firstPayload.paymentProcessed, false);
    assert.equal(firstPayload.usage.topup, 10000);
    assert.equal(firstPayload.usage.available, 25000);
    assert.equal(firstPayload.ledger.type, "topup");

    const replay = await invoke(handler, {
      method: "POST",
      url: "/api/billing/sandbox-topup",
      headers: writeHeaders("contract-topup-1"),
      body: JSON.stringify({})
    });
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.headers["idempotency-replayed"], "true");
    assert.equal(replay.json().usage.topup, 10000);
    assert.equal((await invoke(handler, { url: "/api/ledger" })).json().ledger.length, 1);
  });
});

test("usage plan changes preserve consumed, reserved, and top-up credits across restarts", async () => {
  const initial = {
    id: "demo-workspace",
    name: "Credit Boundary",
    plan: "growth",
    planId: "growth",
    usage: { included: 40000, limit: 40000, used: 900, reserved: 100, topup: 5000 },
    integrations: [],
    workflows: [],
    approvals: [],
    activity: [],
    sources: [],
    settings: {}
  };

  await withWorkspace(initial, async ({ filePath, handler }) => {
    const before = await invoke(handler, { url: "/api/workspace" });
    assert.deepEqual(before.json().usage, {
      included: 40000,
      topup: 5000,
      used: 900,
      reserved: 100,
      limit: 40000,
      available: 44000
    });

    const upgraded = await invoke(handler, {
      method: "PUT",
      url: "/api/workspace",
      headers: writeHeaders("contract-plan-business"),
      body: JSON.stringify({ name: "Credit Boundary", planId: "business" })
    });
    assert.equal(upgraded.statusCode, 200);
    const upgradedPayload = upgraded.json();
    assert.equal(upgradedPayload.workspace.planId, "business");
    assert.deepEqual(upgradedPayload.usage, {
      included: 90000,
      topup: 5000,
      used: 900,
      reserved: 100,
      limit: 90000,
      available: 94000
    });

    const replay = await invoke(handler, {
      method: "PUT",
      url: "/api/workspace",
      headers: writeHeaders("contract-plan-business"),
      body: JSON.stringify({ name: "Credit Boundary", planId: "business" })
    });
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.headers["idempotency-replayed"], "true");
    assert.deepEqual(replay.json().usage, upgradedPayload.usage);

    const reopened = new JsonStore(filePath);
    assert.deepEqual((await reopened.read()).usage, upgradedPayload.usage);

    const downgraded = await invoke(handler, {
      method: "PUT",
      url: "/api/workspace",
      headers: writeHeaders("contract-plan-growth"),
      body: JSON.stringify({ name: "Credit Boundary", planId: "growth" })
    });
    assert.equal(downgraded.statusCode, 200);
    assert.deepEqual(downgraded.json().usage, {
      included: 40000,
      topup: 5000,
      used: 900,
      reserved: 100,
      limit: 40000,
      available: 44000
    });
  });

  await withWorkspace({
    ...initial,
    plan: "business",
    planId: "business",
    usage: { included: 90000, limit: 90000, used: 89000, reserved: 1000, topup: 0 }
  }, async ({ filePath, handler }) => {
    const blocked = await invoke(handler, {
      method: "PUT",
      url: "/api/workspace",
      headers: writeHeaders("contract-overbudget-downgrade"),
      body: JSON.stringify({ name: "Credit Boundary", planId: "growth" })
    });
    assert.equal(blocked.statusCode, 409);
    assertError(blocked, "PLAN_LIMIT_EXCEEDED");
    const persisted = await new JsonStore(filePath).read();
    assert.equal(persisted.planId, "business");
    assert.deepEqual(persisted.usage, {
      included: 90000,
      topup: 0,
      used: 89000,
      reserved: 1000,
      limit: 90000,
      available: 0
    });
  });
});

test("malformed and aborted writes reject with stable errors without mutating the workspace", async () => {
  await withWorkspace(DEFAULT_WORKSPACE, async ({ handler, store }) => {
    const invalidLength = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: { ...writeHeaders("contract-invalid-length"), "content-length": "not-a-number" },
      body: JSON.stringify({ name: "Must not apply" })
    });
    assert.equal(invalidLength.statusCode, 400);
    assertError(invalidLength, "INVALID_CONTENT_LENGTH");

    const emptyBody = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders("contract-empty-body"),
      body: ""
    });
    assert.equal(emptyBody.statusCode, 400);
    assertError(emptyBody, "INVALID_JSON");

    const aborted = await invokeAborted(handler, {
      headers: writeHeaders("contract-aborted-body")
    });
    assert.equal(aborted.statusCode, 400);
    assertError(aborted, "REQUEST_ABORTED");

    const snapshot = await store.read();
    assert.equal(snapshot.name, "Local demo workspace");
    assert.equal(snapshot.usage.used, 0);
  });
});

test("static serving blocks private files and traversal while retaining security headers", async () => {
  await withWorkspace(DEFAULT_WORKSPACE, async ({ handler }) => {
    for (const pathname of [
      "/server.js",
      "/server-smoke.js",
      "/package.json",
      "/README.md",
      "/API-CONTRACT.md",
      "/lib/auth.js",
      "/lib/config.js",
      "/data/workspace.json",
      "/.git/config",
      "/server-run.log"
    ]) {
      const response = await invoke(handler, { url: pathname });
      assert.equal(response.statusCode, 404, pathname);
      assertError(response, "NOT_FOUND");
    }

    const traversal = await invoke(handler, { url: "/%2e%2e/server.js" });
    assert.equal(traversal.statusCode, 403);
    assertError(traversal, "PATH_TRAVERSAL_BLOCKED");

    const index = await invoke(handler, { url: "/" });
    assert.equal(index.statusCode, 200);
    assert.match(index.headers["content-type"], /^text\/html/);
    assert.equal(index.headers["x-content-type-options"], "nosniff");
    assert.equal(index.headers["x-frame-options"], "DENY");
    assert.equal(index.headers["access-control-allow-origin"], undefined);

    const publicModule = await invoke(handler, { url: "/ui/api.js" });
    assert.equal(publicModule.statusCode, 200);
    assert.match(publicModule.headers["content-type"], /^text\/javascript/);

    const head = await invoke(handler, { method: "HEAD", url: "/ui/api.js" });
    assert.equal(head.statusCode, 200);
    assert.equal(head.body, "");
    assert.ok(Number(head.headers["content-length"]) > 0);
  });
});

test("JsonStore round trips normalized data and preserves the last good file after a rejected write", async () => {
  const initial = {
    id: "demo-workspace",
    name: "Persistence Boundary",
    plan: "starter",
    planId: "starter",
    usage: { included: 15000, limit: 15000, used: 12, reserved: 3, topup: 10 },
    integrations: [],
    workflows: [],
    approvals: [],
    activity: [],
    sources: [],
    settings: { darkMode: false }
  };

  await withWorkspace(initial, async ({ filePath, store }) => {
    const first = await store.read();
    const saved = await store.update((current) => ({
      ...current,
      name: "Round-tripped workspace",
      settings: { ...current.settings, darkMode: true }
    }));
    assert.equal(saved.name, "Round-tripped workspace");
    assert.equal(saved.settings.darkMode, true);
    assert.equal(saved.usage.available, first.usage.available);

    const beforeRejectedWrite = await fs.readFile(filePath, "utf8");
    await assert.rejects(
      store.replace({ name: "Invalid replacement", usage: { included: 15000, limit: 15000, used: 1000000001 } }),
      (error) => error && error.code === "INVALID_INPUT"
    );
    assert.equal(await fs.readFile(filePath, "utf8"), beforeRejectedWrite);

    const reopened = new JsonStore(filePath);
    assert.deepEqual(await reopened.read(), saved);
  });
});

test("workflow, run, and approval validators reject malformed lifecycle commands", () => {
  assert.deepEqual(workflow({
    name: "Support triage",
    description: "Prepare a reviewable response.",
    templateId: "customer-support-triage",
    model: "gpt-oss",
    budgetCredits: 20,
    requiresApproval: true
  }), {
    name: "Support triage",
    description: "Prepare a reviewable response.",
    templateId: "customer-support-triage",
    model: "gpt-oss",
    budgetCredits: 20,
    requiresApproval: true
  });
  assert.deepEqual(workflow({ status: "active" }, { patch: true }), { status: "active" });
  assert.deepEqual(run({ input: { request: "Review this support issue" }, idempotencyKey: "run-contract-1" }), {
    input: JSON.stringify({ request: "Review this support issue" }),
    idempotencyKey: "run-contract-1"
  });
  assert.deepEqual(approvalDecision({ decision: "approve" }), { decision: "approve" });

  assert.throws(() => workflow({
    name: "Unsupported",
    description: "No",
    templateId: "missing-template",
    model: "gpt-oss",
    budgetCredits: 1,
    requiresApproval: true
  }), (error) => error.code === "INVALID_INPUT");
  assert.throws(() => run({ input: { token: "must-not-cross-boundary" }, idempotencyKey: "run-secret-1" }), (error) => error.code === "INVALID_INPUT");
  assert.throws(() => approvalDecision({ decision: "send" }), (error) => error.code === "INVALID_INPUT");
});

test("failed sandbox runs can be retried exactly once without rewriting the original record", async () => {
  const initial = {
    ...clone(DEFAULT_WORKSPACE),
    workflows: [{
      id: "retry-workflow",
      name: "Retryable support flow",
      description: "A bounded flow with a recoverable failure.",
      templateId: "customer-support-triage",
      model: "gpt-oss",
      status: "active",
      runs: 1,
      credits: 0,
      budgetCredits: 20,
      requiresApproval: true,
      createdAt: "2026-10-17T00:00:00.000Z"
    }],
    runs: [{
      id: "failed-run-1",
      workflowId: "retry-workflow",
      workflowName: "Retryable support flow",
      status: "failed",
      input: "A customer reports a duplicate invoice.",
      output: null,
      error: "Synthetic provider timeout before completion.",
      credits: 0,
      reservedCredits: 0,
      model: "gpt-oss",
      mode: "sandbox",
      steps: [{ name: "Understand the request", status: "failed", detail: "Synthetic failure." }],
      createdAt: "2026-10-17T00:01:00.000Z",
      completedAt: "2026-10-17T00:01:01.000Z"
    }]
  };

  await withWorkspace(initial, async ({ handler, store, filePath }) => {
    const retried = await invoke(handler, {
      method: "POST",
      url: "/api/runs/failed-run-1/retry",
      headers: writeHeaders("contract-retry-1"),
      body: "{}"
    });
    assert.equal(retried.statusCode, 202);
    const retryRun = retried.json().run;
    assert.equal(retryRun.status, "queued");
    assert.equal(retryRun.retryOf, "failed-run-1");
    assert.equal(retryRun.input, initial.runs[0].input);
    assert.equal(retryRun.reservedCredits, 20);

    const replay = await invoke(handler, {
      method: "POST",
      url: "/api/runs/failed-run-1/retry",
      headers: writeHeaders("contract-retry-1"),
      body: "{}"
    });
    assert.equal(replay.statusCode, 200);
    assert.equal(replay.headers["idempotency-replayed"], "true");
    assert.equal(replay.json().run.id, retryRun.id);

    const settled = await waitForRun(handler, retryRun.id);
    assert.equal(settled.status, "awaiting_approval");

    const restartedHandler = createRequestHandler({ store: new JsonStore(filePath) });
    const restartReplay = await invoke(restartedHandler, {
      method: "POST",
      url: "/api/runs/failed-run-1/retry",
      headers: writeHeaders("contract-retry-1"),
      body: "{}"
    });
    assert.equal(restartReplay.statusCode, 200);
    assert.equal(restartReplay.headers["idempotency-replayed"], "true");
    assert.equal(restartReplay.json().run.id, retryRun.id);

    const current = await store.read();
    assert.equal(current.runs.find((item) => item.id === "failed-run-1").status, "failed");
    assert.equal(current.runs.filter((item) => item.retryOf === "failed-run-1").length, 1);
    assert.equal(current.ledger.filter((item) => item.runId === retryRun.id && item.type === "reservation").length, 1);
    assert.ok(current.auditEvents.some((event) => event.eventType === "run.retried" && event.metadata?.retryOf === "failed-run-1"));

    const duplicateActiveRetry = await invoke(handler, {
      method: "POST",
      url: `/api/runs/${retryRun.id}/retry`,
      headers: writeHeaders("contract-retry-different"),
      body: "{}"
    });
    assert.equal(duplicateActiveRetry.statusCode, 409);
    assertError(duplicateActiveRetry, "RUN_NOT_FAILED");
  });
});

function assertNoSecretKeys(value, label = "value", seen = new Set(), allowedKeys = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (!allowedKeys.has(key)) {
      assert.doesNotMatch(key, /(password|secret|token|api[-_]?key|private[-_]?key|credential|authorization)/i, `${label} exposes a secret-bearing key: ${key}`);
    }
    assertNoSecretKeys(child, `${label}.${key}`, seen, allowedKeys);
  }
}

function assertSafeEvidenceShape(value, label = "evidence", seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) assertSafeEvidenceShape(child, `${label}[${index}]`, seen);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assert.doesNotMatch(key, /(password|secret|token|api[-_]?key|private[-_]?key|credential|authorization)/i, `${label} contains a credential field: ${key}`);
    if (/^(?:quote|snippet|content|detail|text)$/i.test(key) && typeof child === "string") {
      assert.ok(child.length <= 20000, `${label}.${key} must remain bounded`);
    }
    assertSafeEvidenceShape(child, `${label}.${key}`, seen);
  }
}

test("the canonical workflow graph persists and becomes the exact sandbox step sequence", async () => {
  await withWorkspace(DEFAULT_WORKSPACE, async ({ handler, filePath }) => {
    const graph = [
      "Understand the request",
      "Search company knowledge",
      "Draft a response plan",
      "Request internal approval"
    ];
    const createPayload = {
      name: "Graph persistence boundary",
      description: "Keep a support graph reviewable and bounded.",
      templateId: "customer-support-triage",
      model: "gpt-oss",
      budgetCredits: 24,
      requiresApproval: true
    };
    const created = await invoke(handler, {
      method: "POST",
      url: "/api/workflows",
      headers: writeHeaders("graph-persistence-create"),
      body: JSON.stringify(createPayload)
    });
    assert.equal(created.statusCode, 201);
    const workflowValue = created.json().workflow;
    assert.equal(workflowValue.templateId, "customer-support-triage");
    assert.deepEqual(workflowValue, {
      ...createPayload,
      id: workflowValue.id,
      status: "draft",
      runs: 0,
      credits: 0,
      createdAt: workflowValue.createdAt,
      updatedAt: workflowValue.updatedAt
    });

    const persistedBeforeRun = await new JsonStore(filePath).read();
    assert.deepEqual(persistedBeforeRun.workflows[0], workflowValue, "the validated graph definition must survive a store reopen");

    const activated = await invoke(handler, {
      method: "PATCH",
      url: `/api/workflows/${workflowValue.id}`,
      headers: writeHeaders("graph-persistence-activate"),
      body: JSON.stringify({ status: "active" })
    });
    assert.equal(activated.statusCode, 200);

    const queued = await invoke(handler, {
      method: "POST",
      url: `/api/workflows/${workflowValue.id}/run`,
      headers: writeHeaders("graph-persistence-run"),
      body: JSON.stringify({ input: "A customer needs help with a duplicate invoice." })
    });
    assert.equal(queued.statusCode, 202);
    assert.deepEqual(queued.json().run.steps.map((step) => [step.name, step.status]), graph.map((name) => [name, "queued"]));

    const settled = await waitForRun(handler, queued.json().run.id);
    assert.equal(settled.status, "awaiting_approval");
    assert.deepEqual(settled.steps.map((step) => step.name), graph);
    assert.ok(settled.steps.every((step) => step.status === "completed"));
    assert.deepEqual(settled.output.plan, graph, "the output plan must derive from the persisted graph, not a client-supplied step list");
    assert.equal(settled.output.mode, "sandbox");
    assert.equal(settled.output.deterministic, true);
    assert.equal(settled.output.sideEffectsPerformed, false);

    const reopened = await new JsonStore(filePath).read();
    const reopenedRun = reopened.runs.find((runValue) => runValue.id === queued.json().run.id);
    assert.deepEqual(reopenedRun.steps.map((step) => step.name), graph);
    assert.ok(reopenedRun.steps.every((step) => step.status === "completed"));
  });
});

test("connector previews stay disconnected and secret-free across snapshots, writes, and export", async () => {
  await withWorkspace(DEFAULT_WORKSPACE, async ({ handler }) => {
    const bootstrap = await invoke(handler, { url: "/api/bootstrap" });
    const bootstrapPayload = bootstrap.json();
    assert.equal(bootstrap.statusCode, 200);
    // csrfToken is a required, null local-adapter contract field; it is not a
    // credential in this no-auth mode. Any non-null future value must be
    // covered by an auth-specific test rather than treated as a catalog fact.
    assertNoSecretKeys(bootstrapPayload, "bootstrap", new Set(), new Set(["csrfToken"]));
    assert.ok(bootstrapPayload.workspace.integrations.length >= 6);
    assert.ok(bootstrapPayload.workspace.integrations.every((connector) => {
      return connector.connected === false
        && connector.available === false
        && connector.status === "not_configured"
        && /not configured/i.test(connector.detail);
    }));
    assert.ok(Array.isArray(bootstrapPayload.connectorCatalog));
    assert.ok(bootstrapPayload.connectorCatalog.length >= 40);
    assert.ok(new Set(bootstrapPayload.connectorCatalog.map((connector) => connector.category)).size >= 9);
    assert.ok(bootstrapPayload.connectorCatalog.every((connector) => {
      return connector.connected === false
        && connector.available === false
        && connector.status === "not_configured"
        && connector.availability === "preview";
    }));

    const attemptedConnection = await invoke(handler, {
      method: "PUT",
      url: "/api/workspace",
      headers: writeHeaders("connector-preview-write"),
      body: JSON.stringify({
        name: "Connector preview workspace",
        integrations: [{
          id: "gmail",
          name: "Gmail",
          connected: true,
          available: true,
          status: "connected",
          detail: "Connected with an external account"
        }]
      })
    });
    assert.equal(attemptedConnection.statusCode, 200);
    const savedConnector = attemptedConnection.json().workspace.integrations.find((connector) => connector.id === "gmail");
    assert.deepEqual({
      connected: savedConnector.connected,
      available: savedConnector.available,
      status: savedConnector.status
    }, { connected: false, available: false, status: "not_configured" });
    assert.match(savedConnector.detail, /external services are disabled/i);

    const workspace = await invoke(handler, { url: "/api/workspace" });
    assertNoSecretKeys(workspace.json(), "workspace");
    assert.ok(workspace.json().integrations.every((connector) => connector.connected === false && connector.available === false));

    const exported = await invoke(handler, { url: "/api/export" });
    assert.equal(exported.statusCode, 200);
    const exportPayload = exported.json();
    assertNoSecretKeys(exportPayload, "export");
    assert.equal(Object.prototype.hasOwnProperty.call(exportPayload.export.workspace, "operations"), false);
    assert.ok(exportPayload.export.integrations.every((connector) => connector.status === "not_configured" && connector.connected === false && connector.available === false));
  });
});

test("support output and any exposed packet/evidence records remain bounded and non-authoritative", async () => {
  await withWorkspace(DEFAULT_WORKSPACE, async ({ handler }) => {
    const knowledge = await invoke(handler, {
      method: "POST",
      url: "/api/knowledge",
      headers: writeHeaders("evidence-safe-knowledge"),
      body: JSON.stringify({
        title: "Refund policy",
        content: "Refunds require owner review and remain internal until approved."
      })
    });
    assert.equal(knowledge.statusCode, 201);

    const created = await invoke(handler, {
      method: "POST",
      url: "/api/workflows",
      headers: writeHeaders("evidence-safe-workflow"),
      body: JSON.stringify({
        name: "Evidence-safe support flow",
        description: "Prepare a grounded internal support packet.",
        templateId: "customer-support-triage",
        model: "gpt-oss",
        budgetCredits: 32,
        requiresApproval: true
      })
    });
    const workflowValue = created.json().workflow;
    await invoke(handler, {
      method: "PATCH",
      url: `/api/workflows/${workflowValue.id}`,
      headers: writeHeaders("evidence-safe-activate"),
      body: JSON.stringify({ status: "active" })
    });
    const queued = await invoke(handler, {
      method: "POST",
      url: `/api/workflows/${workflowValue.id}/run`,
      headers: writeHeaders("evidence-safe-run"),
      body: JSON.stringify({ input: "A customer asks whether a duplicate invoice can be refunded." })
    });
    const settled = await waitForRun(handler, queued.json().run.id);
    assert.equal(settled.status, "awaiting_approval");
    assert.equal(settled.output.sideEffectsPerformed, false);
    assert.match(settled.output.note, /No AI provider, connector, email, deployment, payment/);
    assert.ok(Array.isArray(settled.output.knowledge));
    assert.equal(settled.output.knowledge[0].title, "Refund policy");
    assert.equal(settled.output.knowledge[0].detail, "Refunds require owner review and remain internal until approved.");
    assertNoSecretKeys(settled.output, "run.output");
    assertSafeEvidenceShape(settled.output, "run.output");
    for (const field of ["packet", "supportPacket", "evidence", "grounding", "claims"]) {
      if (Object.prototype.hasOwnProperty.call(settled.output, field)) {
        assertSafeEvidenceShape(settled.output[field], `run.output.${field}`);
      }
    }

    const exported = await invoke(handler, { url: "/api/export" });
    assert.equal(exported.statusCode, 200);
    assertNoSecretKeys(exported.json(), "evidence export");
    assertSafeEvidenceShape(exported.json().export, "evidence export");
  });
});

test("budget, approval, and idempotency boundaries reject unsafe repeats without charging twice", async () => {
  const lowBudgetWorkspace = {
    ...clone(DEFAULT_WORKSPACE),
    usage: { included: 10, limit: 10, used: 0, reserved: 0, topup: 0 }
  };
  await withWorkspace(lowBudgetWorkspace, async ({ handler, store }) => {
    const payload = {
      name: "Budget boundary workflow",
      description: "A workflow that cannot reserve more than the available balance.",
      templateId: "customer-support-triage",
      model: "gpt-oss",
      budgetCredits: 11,
      requiresApproval: true
    };
    const created = await invoke(handler, {
      method: "POST",
      url: "/api/workflows",
      headers: writeHeaders("budget-boundary-create"),
      body: JSON.stringify(payload)
    });
    assert.equal(created.statusCode, 201);
    const workflowValue = created.json().workflow;

    const reusedKey = await invoke(handler, {
      method: "POST",
      url: "/api/workflows",
      headers: writeHeaders("budget-boundary-create"),
      body: JSON.stringify({ ...payload, name: "Different payload" })
    });
    assert.equal(reusedKey.statusCode, 409);
    assertError(reusedKey, "IDEMPOTENCY_KEY_REUSE");

    const activated = await invoke(handler, {
      method: "PATCH",
      url: `/api/workflows/${workflowValue.id}`,
      headers: writeHeaders("budget-boundary-activate"),
      body: JSON.stringify({ status: "active" })
    });
    assert.equal(activated.statusCode, 200);

    const exhausted = await invoke(handler, {
      method: "POST",
      url: `/api/workflows/${workflowValue.id}/run`,
      headers: writeHeaders("budget-boundary-run"),
      body: JSON.stringify({ input: "This reservation is larger than the available balance." })
    });
    assert.equal(exhausted.statusCode, 409);
    assertError(exhausted, "CREDITS_EXHAUSTED");
    const unchanged = await store.read();
    assert.equal(unchanged.runs.length, 0);
    assert.equal(unchanged.ledger.length, 0);
    assert.deepEqual(unchanged.usage, { included: 10, topup: 0, used: 0, reserved: 0, limit: 10, available: 10 });
  });

  await withWorkspace(DEFAULT_WORKSPACE, async ({ handler }) => {
    const created = await invoke(handler, {
      method: "POST",
      url: "/api/workflows",
      headers: writeHeaders("approval-boundary-create"),
      body: JSON.stringify({
        name: "Approval boundary workflow",
        description: "Keep the internal decision one-way and replay-safe.",
        templateId: "customer-support-triage",
        model: "gpt-oss",
        budgetCredits: 20,
        requiresApproval: true
      })
    });
    const workflowValue = created.json().workflow;
    await invoke(handler, {
      method: "PATCH",
      url: `/api/workflows/${workflowValue.id}`,
      headers: writeHeaders("approval-boundary-activate"),
      body: JSON.stringify({ status: "active" })
    });
    const queued = await invoke(handler, {
      method: "POST",
      url: `/api/workflows/${workflowValue.id}/run`,
      headers: writeHeaders("approval-boundary-run"),
      body: JSON.stringify({ input: "Review this internal support request." })
    });
    const settled = await waitForRun(handler, queued.json().run.id);
    const approval = (await invoke(handler, { url: "/api/approvals" })).json().approvals.find((item) => item.runId === queued.json().run.id);
    assert.ok(approval);

    const rejected = await invoke(handler, {
      method: "POST",
      url: `/api/approvals/${approval.id}/decision`,
      headers: writeHeaders("approval-boundary-reject"),
      body: JSON.stringify({ decision: "reject" })
    });
    assert.equal(rejected.statusCode, 200);
    assert.equal(rejected.json().approval.status, "rejected");
    assert.equal(rejected.json().run.status, "rejected");
    assert.equal(rejected.json().usage.used, 0);
    assert.equal(rejected.json().usage.reserved, 0);

    const sameDecision = await invoke(handler, {
      method: "POST",
      url: `/api/approvals/${approval.id}/decision`,
      headers: writeHeaders("approval-boundary-reject-replay"),
      body: JSON.stringify({ decision: "reject" })
    });
    assert.equal(sameDecision.statusCode, 200);
    assert.equal(sameDecision.headers["idempotency-replayed"], "true");
    assert.equal(sameDecision.json().usage.used, 0);

    const differentDecision = await invoke(handler, {
      method: "POST",
      url: `/api/approvals/${approval.id}/decision`,
      headers: writeHeaders("approval-boundary-approve-after-reject"),
      body: JSON.stringify({ decision: "approve" })
    });
    assert.equal(differentDecision.statusCode, 409);
    assertError(differentDecision, "APPROVAL_ALREADY_DECIDED");
    assert.equal((await invoke(handler, { url: "/api/ledger" })).json().ledger.filter((entry) => entry.type === "release").length, 1);
    assert.equal(settled.output.sideEffectsPerformed, false);
  });
});

test("all browser UI assets are available as public static modules without leaking private files", async () => {
  await withWorkspace(DEFAULT_WORKSPACE, async ({ handler }) => {
    const assets = ["/", "/app.js", "/styles.css", "/ui/main.js", "/ui/views.js", "/ui/api.js", "/ui/icons.js", "/ui/utils.js"];
    for (const pathname of assets) {
      const response = await invoke(handler, { url: pathname });
      assert.equal(response.statusCode, 200, pathname);
      assert.ok(Number(response.headers["content-length"]) > 0, pathname);
      assert.match(response.headers["content-type"], /^(?:text\/html|text\/javascript|text\/css)/, pathname);
      assert.match(response.headers["content-security-policy"], /default-src 'self'/, pathname);

      const head = await invoke(handler, { method: "HEAD", url: pathname });
      assert.equal(head.statusCode, 200, `HEAD ${pathname}`);
      assert.equal(head.body, "", `HEAD ${pathname} must not send a body`);
      assert.equal(head.headers["content-length"], response.headers["content-length"], `HEAD ${pathname} preserves the asset length`);
    }

    const views = await invoke(handler, { url: "/ui/views.js" });
    assert.match(views.body, /Preview connection/);
    assert.match(views.body, /No account access in this demo/);
    assert.match(views.body, /Connection state in this preview is simulated/);
  });
});
