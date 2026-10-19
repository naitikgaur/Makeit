"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { test } = require("node:test");
const { DEFAULT_WORKSPACE, JsonStore, createRequestHandler } = require("./server");
const { AuthStore } = require("./lib/auth-store");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requestFor({ method = "GET", url, headers = {}, body = "" }) {
  const request = Readable.from([body]);
  request.method = method;
  request.url = url;
  request.headers = { ...headers };
  return request;
}

function invoke(handler, { method = "GET", url, headers = {}, body = "" }) {
  return new Promise((resolve, reject) => {
    const request = requestFor({ method, url, headers, body });
    const chunks = [];
    const response = {
      headers: {},
      statusCode: 200,
      writableEnded: false,
      setHeader(name, value) { this.headers[String(name).toLowerCase()] = String(value); },
      end(chunk) {
        if (chunk !== undefined) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        this.writableEnded = true;
        resolve({ statusCode: this.statusCode, headers: this.headers, json: () => JSON.parse(Buffer.concat(chunks).toString("utf8")) });
      }
    };
    Promise.resolve(handler(request, response)).catch(reject);
  });
}

function headers(key) {
  return { "content-type": "application/json", "idempotency-key": key };
}

async function withWorkspace(callback) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "makeease-v1-"));
  const filePath = path.join(directory, "workspace.json");
  const store = new JsonStore(filePath, clone(DEFAULT_WORKSPACE));
  await store.init();
  const handler = createRequestHandler({ store });
  try {
    return await callback({ handler, store });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function waitForRun(handler, runId) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await invoke(handler, { url: `/api/runs/${runId}` });
    const run = response.json().run;
    if (!["queued", "running"].includes(run.status)) return run;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error("run did not settle");
}

test("v1 support packet routes expose a bounded review artifact", async () => {
  await withWorkspace(async ({ handler }) => {
    const created = await invoke(handler, {
      method: "POST",
      url: "/api/workflows",
      headers: headers("v1-workflow-create"),
      body: JSON.stringify({
        name: "Support packet v1",
        description: "Prepare a support draft for review.",
        templateId: "customer-support-triage",
        model: "gpt-oss",
        budgetCredits: 20,
        requiresApproval: true
      })
    });
    assert.equal(created.statusCode, 201);
    const workflow = created.json().workflow;
    await invoke(handler, {
      method: "PATCH",
      url: `/api/workflows/${workflow.id}`,
      headers: headers("v1-workflow-activate"),
      body: JSON.stringify({ status: "active" })
    });
    const queued = await invoke(handler, {
      method: "POST",
      url: `/api/workflows/${workflow.id}/run`,
      headers: headers("v1-run-create"),
      body: JSON.stringify({ input: "A customer asks whether a duplicate invoice can be refunded." })
    });
    const run = await waitForRun(handler, queued.json().run.id);
    assert.equal(run.status, "awaiting_approval");
    assert.match(run.packetId, /^support-packet-/);
    assert.equal(run.output.supportPacket.providerContacted, false);
    assert.equal(run.output.supportPacket.groundedDraft.sent, false);
    assert.equal(run.output.supportPacket.groundedDraft.reviewRequired, true);
    assert.ok(run.output.supportPacket.evidence.length <= 8);

    const packets = await invoke(handler, { url: "/api/packets" });
    assert.equal(packets.statusCode, 200);
    assert.equal(packets.json().customerUnit, "support_review_packet");
    assert.equal(packets.json().packets[0].packetId, run.packetId);
    const detail = await invoke(handler, { url: `/api/packets/${run.packetId}` });
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().packet.digest, run.output.supportPacket.digest);
  });
});

test("v1 approval decisions preserve reviewer evidence and edited packet output", async () => {
  await withWorkspace(async ({ handler }) => {
    // The test store starts from the clean default; create the same workflow
    // through the public command so the assertion covers the real lifecycle.
    const created = await invoke(handler, {
      method: "POST",
      url: "/api/workflows",
      headers: headers("v1-approval-workflow"),
      body: JSON.stringify({ name: "Reviewable support", description: "Support review", templateId: "customer-support-triage", model: "gpt-oss", budgetCredits: 20, requiresApproval: true })
    });
    assert.equal(created.statusCode, 201);
    const id = created.json().workflow.id;
    await invoke(handler, { method: "PATCH", url: `/api/workflows/${id}`, headers: headers("v1-approval-activate"), body: JSON.stringify({ status: "active" }) });
    const runResponse = await invoke(handler, { method: "POST", url: `/api/workflows/${id}/run`, headers: headers("v1-approval-run"), body: JSON.stringify({ input: "Please review this account access request." }) });
    const run = await waitForRun(handler, runResponse.json().run.id);
    const approvals = await invoke(handler, { url: "/api/approvals" });
    const approval = approvals.json().approvals.find((item) => item.runId === run.id);
    assert.ok(approval);
    const decision = await invoke(handler, {
      method: "POST",
      url: `/api/approvals/${approval.id}/decision`,
      headers: headers("v1-approval-decision"),
      body: JSON.stringify({
        decision: "approve",
        reason: "Reviewed against the support policy.",
        editedOutput: { ...run.output, reviewerEdit: "Approved after human review." }
      })
    });
    assert.equal(decision.statusCode, 200);
    assert.equal(decision.json().approval.status, "approved");
    assert.equal(decision.json().approval.reviewerRole, "support_reviewer");
    assert.equal(decision.json().approval.decisionReason, "Reviewed against the support policy.");
    assert.equal(decision.json().approval.edited, true);
    assert.equal(decision.json().run.output.reviewerEdit, "Approved after human review.");
  });
});

test("required auth mode binds sessions, CSRF, and workspace access", async () => {
  await withWorkspace(async ({ store }) => {
    const authPath = path.join(os.tmpdir(), `makeease-auth-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    const authStore = new AuthStore(authPath);
    const handler = createRequestHandler({ store, authMode: "required", authStore });
    try {
      const register = await invoke(handler, {
        method: "POST",
        url: "/api/auth/register",
        body: JSON.stringify({ name: "Demo Reviewer", email: "reviewer@example.com", password: "a sufficiently long password", workspaceName: "Authenticated support workspace" }),
        headers: { "content-type": "application/json" }
      });
      assert.equal(register.statusCode, 201);
      const cookie = register.headers["set-cookie"].split(";", 1)[0];
      const csrfToken = register.json().csrfToken;
      const unauthenticated = await invoke(handler, { url: "/api/health" });
      assert.equal(unauthenticated.statusCode, 401);
      const bootstrap = await invoke(handler, { url: "/api/bootstrap", headers: { cookie } });
      assert.equal(bootstrap.statusCode, 200);
      assert.equal(bootstrap.json().user.email, "reviewer@example.com");
      const missingCsrf = await invoke(handler, {
        method: "PATCH",
        url: "/api/workspace",
        headers: { cookie, "content-type": "application/json", "idempotency-key": "auth-missing-csrf" },
        body: JSON.stringify({ description: "blocked without csrf" })
      });
      assert.equal(missingCsrf.statusCode, 403);
      const saved = await invoke(handler, {
        method: "PATCH",
        url: "/api/workspace",
        headers: { cookie, "x-csrf-token": csrfToken, "content-type": "application/json", "idempotency-key": "auth-with-csrf" },
        body: JSON.stringify({ description: "authenticated workspace" })
      });
      assert.equal(saved.statusCode, 200);
      const logout = await invoke(handler, { method: "POST", url: "/api/auth/logout", headers: { cookie, "x-csrf-token": csrfToken, "content-type": "application/json" }, body: "{}" });
      assert.equal(logout.statusCode, 200);
      const afterLogout = await invoke(handler, { url: "/api/bootstrap", headers: { cookie } });
      assert.equal(afterLogout.statusCode, 401);
    } finally {
      await fs.rm(authPath, { force: true });
    }
  });
});
