"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { RunExecutor, withTimeout } = require("./executor");

test("withTimeout aborts the provider signal before rejecting", async () => {
  let aborted = false;
  await assert.rejects(
    withTimeout((signal) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => {
        aborted = true;
        reject(new Error("aborted"));
      }, { once: true });
    }), 10),
    (error) => error && error.code === "RUN_TIMEOUT"
  );
  assert.equal(aborted, true);
});

test("withTimeout returns a settled provider result", async () => {
  const result = await withTimeout(async () => "ok", 100);
  assert.equal(result, "ok");
});

test("withTimeout keeps the timeout result when an aborted provider settles later", async () => {
  let aborted = false;
  let resolveProvider;
  const pending = withTimeout((signal) => {
    signal.addEventListener("abort", () => { aborted = true; }, { once: true });
    return new Promise((resolve) => { resolveProvider = resolve; });
  }, 10);

  await assert.rejects(pending, (error) => error && error.code === "RUN_TIMEOUT");
  assert.equal(aborted, true);
  resolveProvider("late provider result");
  await new Promise((resolve) => setImmediate(resolve));
});

test("RunExecutor bounds sandbox steps and enters approval without external side effects", async () => {
  const stepUpdates = [];
  const finalizations = [];
  const queuedRun = {
    id: "run-approval-1",
    status: "queued",
    input: "Review the customer request",
    model: "gpt-oss",
    reserved_credits: 10,
    steps: [{ name: "Understand the request" }, { name: "Draft a response" }, { name: "Ignored step" }]
  };
  const workflow = { name: "Customer support triage", requires_approval: true };
  const db = {
    getRun() { return queuedRun; },
    markRunRunning() { return { ...queuedRun, status: "running" }; },
    getWorkflow() { return workflow; },
    getKnowledgeForPrompt() { return [{ title: "Support policy", content: "Responses require owner review." }]; },
    updateStep(...args) { stepUpdates.push(args); },
    finalizeRun(result) { finalizations.push(result); }
  };

  const executor = new RunExecutor({ db, mode: "sandbox", maxSteps: 2, timeoutMs: 1000 });
  await executor.runOne({ workspaceId: "demo-workspace", runId: queuedRun.id, key: `demo-workspace:${queuedRun.id}` });

  assert.deepEqual(stepUpdates.map(([, , index, status]) => [index, status]), [
    [0, "running"],
    [0, "completed"],
    [1, "running"],
    [1, "completed"]
  ]);
  assert.equal(finalizations.length, 1);
  assert.equal(finalizations[0].status, "awaiting_approval");
  assert.ok(finalizations[0].credits >= 1);
  assert.ok(finalizations[0].credits <= queuedRun.reserved_credits);
  assert.match(finalizations[0].output, /SANDBOX SIMULATION/);
  assert.match(finalizations[0].output, /No email, deployment, refund/);
  assert.equal(finalizations[0].approvalTitle, "Review internal completion for Customer support triage");
});

test("RunExecutor caps a completed sandbox result at its reserved credit budget", async () => {
  const finalizations = [];
  const queuedRun = {
    id: "run-complete-1",
    status: "queued",
    input: "x".repeat(2000),
    model: "gpt-oss",
    reserved_credits: 1,
    steps: []
  };
  const db = {
    getRun() { return queuedRun; },
    markRunRunning() { return { ...queuedRun, status: "running" }; },
    getWorkflow() { return { name: "Internal briefing", requires_approval: false }; },
    getKnowledgeForPrompt() { return []; },
    updateStep() {},
    finalizeRun(result) { finalizations.push(result); }
  };

  const executor = new RunExecutor({ db, mode: "sandbox", timeoutMs: 1000 });
  await executor.runOne({ workspaceId: "demo-workspace", runId: queuedRun.id, key: `demo-workspace:${queuedRun.id}` });

  assert.equal(finalizations.length, 1);
  assert.equal(finalizations[0].status, "completed");
  assert.equal(finalizations[0].credits, 1);
});
