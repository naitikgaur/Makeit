"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs").promises;
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");

const { JsonStore, MAX_JSON_BODY_BYTES, createRequestHandler, startServer } = require("./server");
const { hashPassword, hashToken, safeEqualToken, verifyPassword } = require("./lib/auth");
const { publicPlans } = require("./lib/config");
const { login, register, sandboxPlan, workspaceDocument, workspacePatch } = require("./lib/validation");

function writeHeaders(extra = {}, key = `smoke-${Date.now()}-${Math.random().toString(16).slice(2)}`) {
  return { "content-type": "application/json", "idempotency-key": key, ...extra };
}

function invoke(handler, { method = "GET", url = "/", headers = {}, body = "" } = {}) {
  const request = Readable.from(body ? [Buffer.from(body)] : []);
  request.method = method;
  request.url = url;
  request.headers = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));

  const chunks = [];
  const response = {
    statusCode: 200,
    headers: {},
    writableEnded: false,
    setHeader(name, value) { this.headers[name.toLowerCase()] = String(value); },
    end(chunk) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      this.writableEnded = true;
    }
  };

  return Promise.resolve(handler(request, response)).then(() => ({
    statusCode: response.statusCode,
    headers: response.headers,
    body: Buffer.concat(chunks).toString("utf8"),
    json() { return JSON.parse(this.body); }
  }));
}

function assertSuccessEnvelope(response) {
  const payload = response.json();
  assert.equal(payload.ok, true);
  assert.ok(payload.meta);
  return payload;
}

function assertErrorEnvelope(response, code) {
  const payload = response.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.error.code, code);
  assert.equal(payload.error.requestId, response.headers["x-request-id"]);
  assert.ok(payload.error.message);
  return payload;
}

async function main() {
  const passwordHash = hashPassword("correct horse battery staple");
  assert.equal(verifyPassword("correct horse battery staple", passwordHash), true);
  assert.equal(verifyPassword("incorrect horse battery staple", passwordHash), false);
  const tokenHash = hashToken("smoke-token");
  assert.equal(safeEqualToken("smoke-token", tokenHash), true);
  assert.equal(safeEqualToken("different-token", tokenHash), false);
  assert.throws(() => hashPassword("short"), TypeError);
  assert.throws(() => workspacePatch({ marker: "unknown" }), (error) => error.code === "INVALID_INPUT");
  assert.deepEqual(login({ email: "Owner@Example.com", password: "correct horse battery staple" }), {
    email: "owner@example.com",
    password: "correct horse battery staple"
  });
  assert.equal(register({
    name: "Owner",
    email: "Owner@Example.com",
    password: "correct horse battery staple",
    workspaceName: "Example Workspace"
  }).email, "owner@example.com");
  assert.throws(() => workspaceDocument({ name: "Mismatch", plan: "starter", planId: "growth" }, { workspaceId: "demo-workspace" }), (error) => error.code === "INVALID_INPUT");
  assert.deepEqual(sandboxPlan({ planId: "growth", idempotencyKey: "smoke-plan" }), { planId: "growth", idempotencyKey: "smoke-plan" });
  assert.throws(() => workspaceDocument({ name: "Bad usage", usage: { used: 10, limit: 100, reserved: 91 } }), (error) => error.code === "INVALID_INPUT");
  assert.throws(() => workspaceDocument({ name: "Bad usage", usage: { used: 10, limit: 100, available: 100 } }), (error) => error.code === "INVALID_INPUT");
  assert.throws(() => workspaceDocument({ name: "Bad integrations", integrations: [{ id: "gmail", name: "Gmail", connected: "yes" }] }), (error) => error.code === "INVALID_INPUT");
  assert.throws(() => workspaceDocument({ name: "Duplicate integrations", integrations: [{ id: "gmail", name: "Gmail" }, { id: "gmail", name: "Gmail" }] }), (error) => error.code === "INVALID_INPUT");
  const normalizedDocument = workspaceDocument({
    id: "demo-workspace",
    name: "Normalized",
    planId: "growth",
    usage: { used: 10, limit: 100 },
    integrations: [{ id: "gmail", name: "Gmail", connected: true, detail: "Connected" }],
    approvals: [{ id: "approval", title: "Review draft", detail: "Internal review", credits: 2 }],
    activity: [{ title: "Created", detail: "Local", time: "Recently" }]
  }, { workspaceId: "demo-workspace" });
  assert.equal(normalizedDocument.plan, "growth");
  assert.equal(normalizedDocument.planId, "growth");
  assert.deepEqual(normalizedDocument.usage, {
    included: 100,
    topup: 0,
    used: 10,
    reserved: 0,
    limit: 100,
    available: 90
  });
  assert.equal(normalizedDocument.integrations[0].status, "not_configured");
  assert.equal(normalizedDocument.integrations[0].connected, false);
  assert.equal(normalizedDocument.approvals[0].status, "pending");
  assert.equal(normalizedDocument.activity[0].action, "Created");
  assert.equal(normalizedDocument.activity[0].time, "Recently");
  assert.equal(normalizedDocument.activity[0].createdAt, undefined, "legacy relative dates must not become invented timestamps");
  assert.deepEqual(workspaceDocument(normalizedDocument, { workspaceId: "demo-workspace" }), normalizedDocument, "normalization must be stable across restarts");

  const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "makeease-mvp-smoke-"));
  try {
    const store = new JsonStore(path.join(tempDirectory, "data", "workspace.json"));
    const handler = createRequestHandler({ store });

    const health = await invoke(handler, { url: "/api/health" });
    assert.equal(health.statusCode, 200);
    const healthPayload = health.json();
    assert.equal(healthPayload.ok, true);
    assert.equal(healthPayload.adapter, "makeease-local-mvp-adapter");
    assert.equal(healthPayload.ready, true);
    assert.equal(healthPayload.storage.status, "ready");
    assert.equal(healthPayload.meta.contractVersion, "local-v1");
    assert.equal(healthPayload.mode, "sandbox");
    assert.match(health.headers["x-request-id"], /^req_/);
    assert.equal(health.headers["access-control-allow-origin"], undefined, "CORS must be disabled by default");

    const bootstrap = await invoke(handler, { url: "/api/bootstrap" });
    assert.equal(bootstrap.statusCode, 200);
    const bootstrapPayload = assertSuccessEnvelope(bootstrap);
    assert.equal(bootstrapPayload.mode, "sandbox");
    assert.equal(bootstrapPayload.user, null);
    assert.equal(bootstrapPayload.csrfToken, null);
    assert.ok(bootstrapPayload.models.length > 0);
    assert.ok(bootstrapPayload.models.every((model) => model.configured === false));
    assert.ok(bootstrapPayload.templates.length > 0);
    assert.deepEqual(bootstrapPayload.topup, { price: 12, credits: 10000 });
    assert.deepEqual(bootstrapPayload.plans, publicPlans());
    assert.equal(bootstrapPayload.workspace.id, "demo-workspace");
    assert.equal(bootstrapPayload.meta.externalSideEffects, false);
    assert.equal(bootstrapPayload.meta.idempotency.durable, true);

    const bootstrapHead = await invoke(handler, { method: "HEAD", url: "/api/bootstrap" });
    assert.equal(bootstrapHead.statusCode, 200);
    assert.equal(bootstrapHead.body, "");
    assert.ok(Number(bootstrapHead.headers["content-length"]) > 0);

    assert.equal(bootstrapPayload.meta.contractVersion, "local-v1");
    assert.ok(bootstrapPayload.models.every((model) => Object.keys(model).sort().join(",") === "configured,id,label"), "Bootstrap models must not expose provider credentials");
    assert.ok(bootstrapPayload.workspace.integrations.every((integration) => integration.status === "not_configured" && integration.connected === false));

    const plans = await invoke(handler, { url: "/api/plans" });
    assert.equal(plans.statusCode, 200);
    const plansPayload = assertSuccessEnvelope(plans);
    assert.ok(Array.isArray(plansPayload.plans));
    assert.equal(plansPayload.plans[0].id, "starter");
    assert.deepEqual(plansPayload.plans, publicPlans());
    assert.deepEqual(plansPayload.topup, { price: 12, credits: 10000 });
    assert.equal(plansPayload.plans.find((plan) => plan.id === "enterprise").topUp, null);

    const initialWorkspace = await invoke(handler, { url: "/api/workspace" });
    assert.equal(initialWorkspace.statusCode, 200);
    const initialWorkspacePayload = assertSuccessEnvelope(initialWorkspace);
    assert.equal(initialWorkspacePayload.workspace.id, "demo-workspace");
    assert.equal(initialWorkspacePayload.workspace.planId, "starter");
    assert.equal(initialWorkspacePayload.usage.available, 15000);
    assert.equal(initialWorkspacePayload.usage.used, 0);
    assert.equal(initialWorkspacePayload.workflows.length, 0);
    assert.equal(initialWorkspacePayload.activity.length, 0);
    assert.equal(initialWorkspacePayload.approvals.length, 0);
    assert.equal(initialWorkspacePayload.integrations[0].connected, false);
    assert.equal(initialWorkspacePayload.integrations[0].status, "not_configured");
    assert.match(initialWorkspace.headers.etag, /^"workspace-[a-f0-9]{64}"$/);
    await fs.access(path.join(tempDirectory, "data", "workspace.json"));

    const demoAlias = await invoke(handler, {
      url: "/api/workspace/demo",
      headers: { "x-tenant-id": "demo-tenant", "x-workspace-id": "demo-workspace" }
    });
    assert.equal(demoAlias.statusCode, 200);
    const demoAliasPayload = assertSuccessEnvelope(demoAlias);
    assert.equal(demoAliasPayload.meta.tenantId, "demo-tenant");

    const savedWorkspace = await invoke(handler, {
      method: "PUT",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-put-1"),
      body: JSON.stringify({ workspace: { name: "Smoke Workspace" } })
    });
    assert.equal(savedWorkspace.statusCode, 200);
    const savedWorkspacePayload = assertSuccessEnvelope(savedWorkspace);
    assert.equal(savedWorkspacePayload.workspace.id, "demo-workspace");
    assert.equal(savedWorkspacePayload.workspace.integrations.length, 6, "partial PUT must preserve existing workspace sections");
    assert.notEqual(savedWorkspace.headers.etag, initialWorkspace.headers.etag);

    const planAlias = await invoke(handler, {
      method: "PUT",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-plan-alias"),
      body: JSON.stringify({ name: "Smoke Workspace", planId: "growth" })
    });
    assert.equal(planAlias.statusCode, 200);
    assert.equal(planAlias.json().workspace.planId, "growth");
    assert.equal(planAlias.json().workspace.plan, "growth");
    assert.equal(planAlias.json().usage.included, 40000);
    assert.equal(planAlias.json().usage.used, 0);
    assert.equal(planAlias.json().usage.available, 40000);

    const unavailablePlan = await invoke(handler, {
      method: "PUT",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-custom-plan"),
      body: JSON.stringify({ name: "Smoke Workspace", planId: "enterprise" })
    });
    assert.equal(unavailablePlan.statusCode, 400);
    assertErrorEnvelope(unavailablePlan, "PLAN_NOT_AVAILABLE");

    const persistedWorkspace = await invoke(handler, { url: "/api/workspace" });
    assert.equal(assertSuccessEnvelope(persistedWorkspace).workspace.name, "Smoke Workspace");

    const savedPatch = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-patch-1"),
      body: JSON.stringify({ description: "Persisted through the strict patch schema." })
    });
    assert.equal(savedPatch.statusCode, 200);
    assert.equal(assertSuccessEnvelope(savedPatch).workspace.description, "Persisted through the strict patch schema.");

    const replayedPatch = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-patch-1"),
      body: JSON.stringify({ description: "Persisted through the strict patch schema." })
    });
    assert.equal(replayedPatch.statusCode, 200);
    assert.equal(replayedPatch.headers["idempotency-replayed"], "true");
    assertSuccessEnvelope(replayedPatch);

    const aliasReplay = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace/demo",
      headers: writeHeaders({}, "smoke-patch-1"),
      body: JSON.stringify({ description: "Persisted through the strict patch schema." })
    });
    assert.equal(aliasReplay.statusCode, 200);
    assert.equal(aliasReplay.headers["idempotency-replayed"], "true", "aliases must share one idempotency scope");

    const staleWrite = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({ "if-match": initialWorkspace.headers.etag }, "smoke-stale"),
      body: JSON.stringify({ name: "Stale overwrite" })
    });
    assert.equal(staleWrite.statusCode, 412);
    assertErrorEnvelope(staleWrite, "WORKSPACE_CHANGED");

    const freshWrite = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({ "if-match": savedPatch.headers.etag }, "smoke-fresh"),
      body: JSON.stringify({ goal: "Keep the persisted profile coherent." })
    });
    assert.equal(freshWrite.statusCode, 200);

    const concurrentWrites = await Promise.all([
      invoke(handler, {
        method: "PATCH",
        url: "/api/workspace",
        headers: writeHeaders({ "if-match": freshWrite.headers.etag }, "smoke-concurrent-a"),
        body: JSON.stringify({ description: "First editor" })
      }),
      invoke(handler, {
        method: "PATCH",
        url: "/api/workspace",
        headers: writeHeaders({ "if-match": freshWrite.headers.etag }, "smoke-concurrent-b"),
        body: JSON.stringify({ description: "Second editor" })
      })
    ]);
    assert.deepEqual(concurrentWrites.map((result) => result.statusCode).sort(), [200, 412], "one concurrent editor must observe a stale snapshot");

    const mergedWrites = await Promise.all([
      invoke(handler, { method: "PATCH", url: "/api/workspace", headers: writeHeaders({}, "smoke-merge-name"), body: JSON.stringify({ name: "Concurrent Workspace" }) }),
      invoke(handler, { method: "PATCH", url: "/api/workspace", headers: writeHeaders({}, "smoke-merge-timezone"), body: JSON.stringify({ timezone: "Europe/London" }) })
    ]);
    assert.ok(mergedWrites.every((result) => result.statusCode === 200));
    const reopenedStore = new JsonStore(path.join(tempDirectory, "data", "workspace.json"));
    const reopenedWorkspace = await reopenedStore.read();
    assert.equal(reopenedWorkspace.name, "Concurrent Workspace");
    assert.equal(reopenedWorkspace.timezone, "Europe/London");
    assert.equal(reopenedWorkspace.goal, "Keep the persisted profile coherent.");

    const invalidPrecondition = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({ "if-match": "unquoted-or-weak" }, "smoke-bad-precondition"),
      body: JSON.stringify({ name: "Should not apply" })
    });
    assert.equal(invalidPrecondition.statusCode, 400);
    assertErrorEnvelope(invalidPrecondition, "INVALID_IF_MATCH");

    const invalidUsage = await invoke(handler, {
      method: "PUT",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-invalid-usage"),
      body: JSON.stringify({ name: "Should not apply", usage: { used: 20000, limit: 15000 } })
    });
    assert.equal(invalidUsage.statusCode, 400);
    assertErrorEnvelope(invalidUsage, "INVALID_INPUT");

    const largeSnapshotBody = JSON.stringify({
      name: "Must not erase the previous snapshot",
      sources: Array.from({ length: 200 }, (_, index) => ({ id: `source-${index}`, name: "n".repeat(50), detail: "x".repeat(180), status: "local" }))
    });
    assert.ok(Buffer.byteLength(largeSnapshotBody) < MAX_JSON_BODY_BYTES, "test exercises the persisted size limit rather than the request body limit");
    const oversizedWorkspace = await invoke(handler, { method: "PUT", url: "/api/workspace", headers: writeHeaders({}, "smoke-store-limit"), body: largeSnapshotBody });
    assert.equal(oversizedWorkspace.statusCode, 413);
    assertErrorEnvelope(oversizedWorkspace, "WORKSPACE_TOO_LARGE");
    assert.equal((await store.read()).name, "Concurrent Workspace", "a rejected save must preserve the previous workspace");

    const quotaStore = new JsonStore(path.join(tempDirectory, "quota-workspace.json"), {
      id: "demo-workspace", name: "Quota Workspace", plan: "growth", usage: { used: 20000, limit: 40000, reserved: 1000, topup: 5000 }
    });
    const quotaHandler = createRequestHandler({ store: quotaStore });
    const quotaUpgrade = await invoke(quotaHandler, { method: "PUT", url: "/api/workspace", headers: writeHeaders({}, "smoke-upgrade"), body: JSON.stringify({ name: "Quota Workspace", plan: "business" }) });
    assert.equal(quotaUpgrade.statusCode, 200);
    assert.equal(quotaUpgrade.json().usage.used, 20000);
    assert.equal(quotaUpgrade.json().usage.reserved, 1000);
    assert.equal(quotaUpgrade.json().usage.topup, 5000);
    assert.equal(quotaUpgrade.json().usage.available, 74000);
    const quotaDowngrade = await invoke(quotaHandler, { method: "PUT", url: "/api/workspace", headers: writeHeaders({}, "smoke-downgrade"), body: JSON.stringify({ name: "Quota Workspace", plan: "growth" }) });
    assert.equal(quotaDowngrade.statusCode, 200);
    assert.equal(quotaDowngrade.json().usage.available, 24000, "switching away and back must not mint a fresh usage allowance");
    const overBudgetDowngrade = await invoke(quotaHandler, { method: "PUT", url: "/api/workspace", headers: writeHeaders({}, "smoke-overbudget-downgrade"), body: JSON.stringify({ name: "Quota Workspace", plan: "starter" }) });
    assert.equal(overBudgetDowngrade.statusCode, 409);
    assertErrorEnvelope(overBudgetDowngrade, "PLAN_LIMIT_EXCEEDED");
    assert.equal((await quotaStore.read()).planId, "growth");

    const reusedKey = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-patch-1"),
      body: JSON.stringify({ description: "A different request cannot reuse the key." })
    });
    assert.equal(reusedKey.statusCode, 409);
    assertErrorEnvelope(reusedKey, "IDEMPOTENCY_KEY_REUSE");

    const missingIdempotencyKey = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "Should not be applied." })
    });
    assert.equal(missingIdempotencyKey.statusCode, 428);
    assertErrorEnvelope(missingIdempotencyKey, "IDEMPOTENCY_KEY_REQUIRED");

    const wrongContentType = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({ "content-type": "text/plain" }, "smoke-content-type"),
      body: "{}"
    });
    assert.equal(wrongContentType.statusCode, 415);
    assertErrorEnvelope(wrongContentType, "UNSUPPORTED_MEDIA_TYPE");

    const secretPayload = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-secret"),
      body: JSON.stringify({ apiKey: "should-not-be-persisted" })
    });
    assert.equal(secretPayload.statusCode, 400);
    assertErrorEnvelope(secretPayload, "UNSAFE_WORKSPACE_PAYLOAD");

    const smallHandler = createRequestHandler({ store, maxBodyBytes: 32 });
    const oversized = await invoke(smallHandler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-oversized"),
      body: JSON.stringify({ value: "x".repeat(64) })
    });
    assert.equal(oversized.statusCode, 413);
    assertErrorEnvelope(oversized, "PAYLOAD_TOO_LARGE");

    const unknownField = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-unknown-field"),
      body: JSON.stringify({ marker: "must be rejected" })
    });
    assert.equal(unknownField.statusCode, 400);
    assertErrorEnvelope(unknownField, "INVALID_INPUT");

    const tooManyFields = Object.fromEntries(Array.from({ length: 101 }, (_, index) => [`field${index}`, "x"]));
    const boundedObject = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-bounded-object"),
      body: JSON.stringify(tooManyFields)
    });
    assert.equal(boundedObject.statusCode, 400);
    assertErrorEnvelope(boundedObject, "INVALID_INPUT");

    const invalidJson = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-invalid-json"),
      body: "{not-json"
    });
    assert.equal(invalidJson.statusCode, 400);
    assertErrorEnvelope(invalidJson, "INVALID_JSON");

    const invalidIdempotency = await invoke(handler, {
      method: "PATCH",
      url: "/api/workspace",
      headers: writeHeaders({}, "bad key with spaces"),
      body: JSON.stringify({ name: "Should not be applied." })
    });
    assert.equal(invalidIdempotency.statusCode, 400);
    assertErrorEnvelope(invalidIdempotency, "INVALID_IDEMPOTENCY_KEY");

    const wrongTenant = await invoke(handler, {
      url: "/api/workspace",
      headers: { "x-tenant-id": "another-tenant" }
    });
    assert.equal(wrongTenant.statusCode, 404);
    assertErrorEnvelope(wrongTenant, "TENANT_NOT_FOUND");

    const wrongBootstrapScope = await invoke(handler, { url: "/api/bootstrap", headers: { "x-workspace-id": "another-workspace" } });
    assert.equal(wrongBootstrapScope.statusCode, 404);
    assertErrorEnvelope(wrongBootstrapScope, "WORKSPACE_NOT_FOUND");

    const malformedRequestId = await invoke(handler, { url: "/api/health", headers: { "x-request-id": ["duplicate-one", "duplicate-two"] } });
    assert.equal(malformedRequestId.statusCode, 400);
    assertErrorEnvelope(malformedRequestId, "INVALID_HEADER");

    const wrongWorkspace = await invoke(handler, {
      url: "/api/workspace",
      headers: { "x-workspace-id": "another-workspace" }
    });
    assert.equal(wrongWorkspace.statusCode, 404);
    assertErrorEnvelope(wrongWorkspace, "WORKSPACE_NOT_FOUND");

    const mismatchedBodyWorkspace = await invoke(handler, {
      method: "PUT",
      url: "/api/workspace",
      headers: writeHeaders({}, "smoke-mismatched-body"),
      body: JSON.stringify({ id: "another-workspace", name: "Should not be applied." })
    });
    assert.equal(mismatchedBodyWorkspace.statusCode, 403);
    assertErrorEnvelope(mismatchedBodyWorkspace, "WORKSPACE_MISMATCH");

    const staticIndex = await invoke(handler, { url: "/" });
    assert.equal(staticIndex.statusCode, 200);
    assert.match(staticIndex.body, /MakeEase/);

    const privateFile = await invoke(handler, { url: "/server.js" });
    assert.equal(privateFile.statusCode, 404);
    const privateLibrary = await invoke(handler, { url: "/lib/auth.js" });
    assert.equal(privateLibrary.statusCode, 404);
    const privateNotes = await invoke(handler, { url: "/API-CONTRACT.md" });
    assert.equal(privateNotes.statusCode, 404);
    const privateLog = await invoke(handler, { url: "/server-run.log" });
    assert.equal(privateLog.statusCode, 404);
    const publicModule = await invoke(handler, { url: "/ui/api.js" });
    assert.equal(publicModule.statusCode, 200);
    const normalizedPrivateFile = await invoke(handler, { url: "/./server.js" });
    assert.equal(normalizedPrivateFile.statusCode, 404);
    const traversal = await invoke(handler, { url: "/%2e%2e/server.js" });
    assert.equal(traversal.statusCode, 403);
    assertErrorEnvelope(traversal, "PATH_TRAVERSAL_BLOCKED");

    const missing = await invoke(handler, { url: "/api/not-a-route" });
    assert.equal(missing.statusCode, 404);
    assertErrorEnvelope(missing, "NOT_FOUND");
    assert.ok(missing.headers["x-request-id"]);

    const missingHead = await invoke(handler, { method: "HEAD", url: "/api/not-a-route" });
    assert.equal(missingHead.statusCode, 404);
    assert.equal(missingHead.body, "");

    const corruptPath = path.join(tempDirectory, "corrupt-workspace.json");
    await fs.writeFile(corruptPath, "{not-json", "utf8");
    const corruptStore = new JsonStore(corruptPath);
    const corruptHandler = createRequestHandler({ store: corruptStore });
    for (const url of ["/api/health", "/api/bootstrap", "/api/workspace"]) {
      const failedRead = await invoke(corruptHandler, { url });
      assert.equal(failedRead.statusCode, 503);
      assertErrorEnvelope(failedRead, "WORKSPACE_STORE_UNAVAILABLE");
      assert.equal(failedRead.body.includes(tempDirectory), false, "filesystem paths must not leak to the client");
    }
    const corruptWrite = await invoke(corruptHandler, { method: "PUT", url: "/api/workspace", headers: writeHeaders({}, "smoke-corrupt"), body: JSON.stringify({ name: "Do not erase corrupt data" }) });
    assert.equal(corruptWrite.statusCode, 503);
    assert.equal(await fs.readFile(corruptPath, "utf8"), "{not-json", "startup/write failures must preserve the existing file");
    await assert.rejects(startServer({ host: "127.0.0.1", port: 0, store: corruptStore }), (error) => error.code === "WORKSPACE_STORE_UNAVAILABLE");

    await assert.rejects(startServer({ host: "0.0.0.0", port: 0, store }), TypeError);
    await assert.rejects(startServer({ host: "127.0.0.1", port: -1, store }), TypeError);

    const { server, address } = await startServer({ host: "127.0.0.1", port: 0, store: reopenedStore });
    try {
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const browserBootstrap = await fetch(`${baseUrl}/api/bootstrap`);
      assert.equal(browserBootstrap.status, 200);
      assert.equal((await browserBootstrap.json()).workspace.name, "Concurrent Workspace");
      const browserSnapshot = await fetch(`${baseUrl}/api/workspace`);
      const browserEtag = browserSnapshot.headers.get("etag");
      await browserSnapshot.json();
      const browserSave = await fetch(`${baseUrl}/api/workspace`, {
        method: "PATCH",
        headers: writeHeaders({ "if-match": browserEtag }, "smoke-http-save"),
        body: JSON.stringify({ name: "Browser HTTP Workspace" })
      });
      assert.equal(browserSave.status, 200);
      assert.equal((await browserSave.json()).workspace.name, "Browser HTTP Workspace");
      const browserHealth = await fetch(`${baseUrl}/api/health`, { method: "HEAD" });
      assert.equal(browserHealth.status, 200);
      assert.equal(await browserHealth.text(), "");
    } finally {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeAllConnections?.();
      });
    }
    const restartedHandler = createRequestHandler({ store: new JsonStore(path.join(tempDirectory, "data", "workspace.json")) });
    const persistedBootstrap = await invoke(restartedHandler, { url: "/api/bootstrap" });
    assert.equal(persistedBootstrap.json().workspace.name, "Browser HTTP Workspace");

    assert.equal(MAX_JSON_BODY_BYTES, 64 * 1024);
    console.log("server smoke tests passed (contracts, persistence, concurrency, and loopback HTTP)");
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
