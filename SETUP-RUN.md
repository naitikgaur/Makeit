# MakeEase setup and run guide

This guide runs the **local sandbox**. It does not provision a production service or connect a provider.

## 1. Prerequisites

- Windows PowerShell, macOS/Linux shell, or an equivalent terminal.
- Current Node.js LTS (Node 20+ recommended).
- A browser with JavaScript modules enabled.
- Synthetic or redacted demo text only.

The repository has no runtime package dependencies, so `npm install` is not required for the supported path.

## 2. Start the adapter and UI

From `makease-mvp`:

```powershell
node --version
npm start
```

Open <http://127.0.0.1:3000/>. Keep the terminal running while using the app. Stop it with `Ctrl+C`.

Verify the local health response in a second PowerShell window:

```powershell
Invoke-WebRequest http://127.0.0.1:3000/api/health | Select-Object -ExpandProperty Content
```

The response should identify the local adapter, sandbox mode, loopback storage, and `externalSideEffects: false`.

## 3. First demo path

1. Open **Workflows** and choose **Customer support triage** (or open the seeded support workflow).
2. Open **Knowledge** and add a synthetic policy such as “Duplicate charges require reviewer confirmation; do not promise a refund.”
3. Open the workflow and run a test with a redacted request, for example: “A customer reports a duplicate invoice and asks what happens next.”
4. Inspect the support review packet: intent, urgency, missing facts, policy grounding, draft-only response, escalation, evidence, credit limit, and review status.
5. Open **Review queue**. Approve internally or reject the output. Read the notice beside the decision: nothing is sent or changed outside the workspace.
6. Open **Run history** and **Insights** to inspect the local record. If a run is marked failed, use **Retry failed run**; the retry is a new linked sandbox record and the original failure remains visible.
7. Use **Export snapshot** if you need a copy of the synthetic workspace, including local packet projections, audit, and ledger records.

The useful demo outcome is a visible review decision and trace, not a claimed customer response or savings result.

## 4. Reset and data handling

### Browser demo state

Use **Settings → Reset local demo**, or run this in the browser console:

```js
window.MakeEase.reset()
```

This clears browser-local changes and reloads the page. Browser storage is not a secret store.

### Adapter JSON state

The adapter reads and writes `data/workspace.json`. Treat it as disposable synthetic state. To reset it, stop the server and restore that file from a clean checkout or a known-safe fixture; do not replace it with real workspace data. The adapter uses atomic writes and validation, but this does not make the file a production database or ledger.

## 5. Browser-only fallback

If the adapter cannot start, the error screen offers **Open browser demo**. That path is intentionally local and uses the seeded browser snapshot. It is useful for UI review only.

Optional static server:

```powershell
npx --yes serve . -l 8080
```

Open <http://127.0.0.1:8080/> and expect the browser demo fallback. A static server does not provide the adapter API.

## 6. Port and environment overrides

The adapter defaults to `HOST=127.0.0.1` and `PORT=3000`. A different loopback port can be used for a local collision:

```powershell
$env:PORT = "3010"
npm start
```

Open <http://127.0.0.1:3010/>. Non-loopback hosts such as `0.0.0.0` are rejected by design. See `ENVIRONMENT.md` before changing configuration.

## 7. Checks

```powershell
npm test
npm run smoke
npm run check
```

The checks cover the local server/API contract, persistence, bounds, loopback HTTP, local AI contract, and executor behavior. They do not establish live provider quality, OAuth, billing, production auth, or multi-tenant isolation.

For the production handoff checklist and the values you must provide later, see
[`PRODUCTION-V1-IMPLEMENTATION.md`](PRODUCTION-V1-IMPLEMENTATION.md).

## 8. Troubleshooting

| Symptom | Action |
| --- | --- |
| `EADDRINUSE` on port 3000 | Stop the other process or set a different loopback `PORT`. |
| “Workspace unavailable” | Confirm `npm start` is still running, then retry. Use browser demo only for UI-only review. |
| Health returns a store error | Stop the server and restore the synthetic `data/workspace.json`; do not repair it with customer data. |
| Page opens but changes disappear | Browser storage may be unavailable/private; changes are then memory-only for that tab. |
| A provider appears unconfigured | This is expected. The local adapter does not activate live providers or OAuth. |
| A feature appears in a contract document but not the UI | Treat the document as a target contract; use `FEATURE-MATRIX.md` and `LIMITATIONS.md` for current scope. |
