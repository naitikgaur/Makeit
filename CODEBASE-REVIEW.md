# MakeEase MVP codebase review

> **Historical review note:** This document records the pre-v1 integration findings. The missing bootstrap/full-lifecycle route findings were addressed in the current local adapter; use `README.md`, `FEATURE-MATRIX.md`, and `LIMITATIONS.md` for the current boundary.

**Review date:** 2026-10-16  
**Scope:** All files currently present in `makease-mvp`, including the browser UI, `server.js`, `lib/`, the JSON fixture, API contract, README, and the configured smoke test.  
**Review constraint:** Documentation-only change. No application code was modified.

## Executive summary

The repository contains two partially overlapping implementations:

1. A runnable, dependency-free JSON-file adapter in `server.js` with a narrow legacy API.
2. A newer full-stack design in `API-CONTRACT.md`, `ui/api.js`, and `lib/`, which expects authentication, SQLite, workflows, runs, approvals, billing, and provider execution.

They are not connected. The current UI calls `GET /api/bootstrap`, but the runnable server does not define that route, so the app reaches a 404 connection error before sign-in. The newer server-side path cannot currently be loaded because `lib/validation.js` requires a missing `lib/database.js`.

The green smoke test is therefore useful evidence for the legacy handler only; it does not demonstrate that the product flow works or that the full-stack modules are loadable. The current server also permits unauthenticated reads and writes to the shared workspace, and its configurable host can expose that behavior beyond loopback. This is acceptable only for a deliberately isolated local demo and must be treated as a release blocker before any network exposure.

**Overall assessment:** useful defensive groundwork exists in the legacy adapter, but the repository is not a coherent runnable full-stack MVP yet. The next increment should establish one authoritative runtime/API before adding more UI or provider behavior.

## Verification performed

| Command/check | Actual result |
| --- | --- |
| `npm test` | **Passed.** `server smoke tests passed (handler imported without binding a port)` |
| `npm run smoke` | **Passed.** Same `server-smoke.js` test suite passed. |
| `node --check` on `app.js`, all `ui/*.js`, `server.js`, `server-smoke.js`, and all `lib/*.js` | **Passed.** No syntax errors reported. |
| `node -e "require('./lib/validation')"` | **Failed.** `MODULE_NOT_FOUND: Cannot find module './database'`. |
| Isolated server probe: `GET /api/bootstrap` | **404** `NOT_FOUND`; this is the first request made by `ui/main.js`. |
| Isolated server probe: unauthenticated `PATCH /api/workspace` | **200** and persisted the supplied workspace name. |
| Isolated server probe: `GET /lib/auth.js` | **200**; server implementation source is publicly served. |

The isolated probe used a temporary workspace file and loopback server; it did not modify the checked-in `data/workspace.json`.

## Prioritized findings

### P0 — The runnable server and UI/API contract are incompatible

**Affected files:** `server.js:466-523`, `ui/api.js:27-94`, `ui/main.js:156-175`, `API-CONTRACT.md:13-33`, `package.json:7-10`.

The UI boot sequence calls `/api/bootstrap`, then expects authentication and workspace routes such as `/api/auth/demo`, `/api/workflows`, `/api/runs/:id`, `/api/knowledge`, and `/api/export`. `server.js` exposes only `/api`, `/api/health`, `/api/plans`, and the legacy `/api/workspace`/`/api/workspace/demo` routes. The runtime probe returned 404 for `/api/bootstrap`.

**Impact:** Starting the documented static server cannot produce a working product flow. Even starting `npm start` produces a server that cannot satisfy the UI. This is a complete integration failure, not a missing edge case.

**Smallest useful correction:** Decide which implementation is authoritative. The recommended next slice is to make one server entry point serve the UI and implement the contract in vertical order: bootstrap → sandbox session → workspace snapshot → workflow create/run → approval. Add a contract smoke test that performs the same first requests as the browser. Alternatively, explicitly retire the new UI/contract and restore a self-contained legacy demo; keeping both paths active will continue to create drift.

### P0 — Workspace data is unauthenticated and mutable over the network

**Affected files:** `server.js:466-523`, `server.js:554-569`.

`GET`, `PUT`, and `PATCH` on `/api/workspace` require no session, authorization, or CSRF token. `/api/workspace/demo` is an additional unrestricted alias. The server defaults to `127.0.0.1`, but `HOST` is configurable, so setting `HOST=0.0.0.0` exposes a shared read/write workspace to any reachable client. The isolated probe confirmed that an unauthenticated PATCH returned 200 and changed persisted data.

**Impact:** Any network client can read workspace information, overwrite the entire JSON document, or merge arbitrary fields. The contract explicitly requires same-origin sessions, CSRF protection, and authenticated workspace scoping.

**Smallest useful correction:** Keep the legacy adapter hard-bound to loopback and reject non-loopback hosts unless an explicit development-only flag is set, or implement the contract’s session middleware before permitting writes. Use `HttpOnly`, `Secure` (when deployed over TLS), `SameSite` session cookies, per-session CSRF tokens, workspace ownership checks, and remove the demo alias from live routing. Add tests for unauthenticated GET/PUT/PATCH, cross-workspace access, expired sessions, and CSRF failures.

### P0 — The intended full-stack server cannot load

**Affected files:** `lib/validation.js:1-4`; missing `lib/database.js`; `lib/executor.js:3-5`; `API-CONTRACT.md:3`.

`lib/validation.js` imports `errorWithCode` from `./database`, but no such file exists. `lib/executor.js` imports validation and is consequently unusable through the normal dependency chain. None of the `lib/` modules is wired into `server.js`, and there is no SQLite/database entry point despite the contract declaring Node 24 built-in SQLite as the runtime.

**Impact:** A basic production-module load check fails before any request handling. The test command does not catch it because it imports only `server.js`, so the repository can report green while the intended backend is absent.

**Smallest useful correction:** Implement the database boundary (schema migrations, connection lifecycle, transaction helpers, workspace scoping, and the `errorWithCode` error contract) before adding route code, or remove the orphaned full-stack modules until they are ready. Make `npm test` import every production module and exercise one database-backed vertical slice.

### P1 — The static file root exposes internal server modules

**Affected files:** `server.js:397-450`, `server.js:114-122`.

The server serves the project root and blocks only a small set of root filenames plus the `data` directory. It does not block `lib/`, so `GET /lib/auth.js` returned 200. Other implementation and contract files are also reachable unless separately denied.

**Impact:** Source disclosure makes internal security assumptions and future implementation mistakes visible. If a secret, debug fixture, or operational file is later added under an allowed path, it may become public without a routing change.

**Smallest useful correction:** Serve an explicit `public/` directory containing only `index.html`, `app.js`, `ui/`, and `styles.css`, or use an allowlist of public extensions/files. Keep `lib/`, `data/`, package metadata, contracts, and operational files outside the static root. Add tests for every private directory and for symlinked paths.

### P1 — Data shapes and demo semantics contradict the contract

**Affected files:** `server.js:66-103`, `data/workspace.json`, `ui/main.js:114-126`, `ui/views.js:56-90,99-114,220-223`, `API-CONTRACT.md:5-14,35-44`.

The checked-in fixture contains invented usage, completed activity, approvals, and connected Gmail/Slack/GitHub records. The contract requires empty genuine workspaces, no invented histories or integration health, and integration records with `status:'not_configured'`/`available:false`. The legacy server returns `workspace.plan` and `usage:{used,limit}`, while the UI/contract expect `planId`, `included`, `topup`, `reserved`, `available`, timestamps, approval statuses, run IDs, and normalized integration fields.

The UI’s fallback normalization prevents a crash, but it silently renders incomplete or misleading state: usage becomes mostly unavailable, legacy approvals are filtered out because they have no `status`, legacy activity uses `title/time` while the UI reads `action/createdAt`, and connected legacy integrations are displayed through the newer not-configured path.

**Impact:** A future route implementation can appear to work while showing blanks, omitting real records, or presenting demo state as current workspace truth. This is a high regression risk because the fallback hides contract violations.

**Smallest useful correction:** Define one versioned snapshot schema and validate it at the server boundary. Migrate or replace the fixture with an explicitly named sandbox fixture that cannot be used as production data. Remove permissive fallback field mapping once the server and client share the schema; make missing required fields an observable error in development and a structured response in production.

### P1 — Response and error envelopes do not follow the published API

**Affected files:** `server.js:333-363,487-523`, `ui/api.js:50-60`, `API-CONTRACT.md:13`.

The contract requires successful responses to include `{ ok: true, ... }` and failures to include `{ ok: false, error: { code, message } }`. `server.js` adds `ok:true` only to `/api/health`; ordinary success responses omit it, and `sendError` omits `ok:false`. The client currently tolerates the omission, but other consumers and future middleware will not have a stable envelope.

**Impact:** Contract consumers cannot reliably distinguish a successful response from an unrecognized legacy payload. Error handling, generated clients, and observability will diverge as routes are added.

**Smallest useful correction:** Centralize response construction so every route uses the same success/error envelope and status policy. Add response-shape assertions to contract tests, including 400, 401, 403, 404, 409, 413, 415, 429, 500, and provider-timeout cases.

### P1 — Provider timeout does not cancel the underlying request

**Affected files:** `lib/executor.js:26-39,167-225`.

`withTimeout` rejects the race when the deadline expires, but `generateLive` creates an `AbortController` and never calls `controller.abort()`. The provider fetch can therefore continue after the run is marked failed. Provider responses are also parsed with unrestricted `response.json()` before `maxOutputChars` is applied, so the output cap does not cap response-body memory use.

**Impact:** Timed-out runs can continue consuming provider resources and occupy network/socket capacity after the executor has freed a concurrency slot. A large provider response can cause avoidable memory pressure. This also makes credit accounting and run status less trustworthy.

**Smallest useful correction:** Make timeout ownership explicit: create the controller in the timeout wrapper, abort it in the timeout path, and translate aborts to a stable error code. Apply response status, content-length, and streaming byte limits before parsing. Test timeout cancellation, malformed/oversized provider responses, and late provider completion after a failed run.

### P1 — The only green test suite is too narrow to protect the product

**Affected files:** `package.json:7-10`, `server-smoke.js:37-119`.

The configured test/smoke command exercises a hand-built handler with a temporary JSON store. It does not bind a real HTTP server, load the browser module graph, import `lib/validation` or `lib/executor`, test authentication/CSRF, exercise the published routes, verify schema compatibility, or run a browser interaction. Its static-file checks do not include the `lib/` disclosure found above.

**Impact:** The current suite passes while the first browser request fails and a production module cannot be required. Regressions in API contracts, browser behavior, credit reservation, or provider safety will not be detected.

**Smallest useful correction:** Add dependency-free `node:test` coverage for the contract and domain modules, using an injected database/transport. Add a real loopback HTTP smoke path for bootstrap → sandbox login → workspace read → workflow/run/approval. Add a browser smoke check when the browser harness is selected. Make module loading and schema validation part of the default `npm test` command, and add CI execution with a supported Node version.

### P2 — Idempotency keys are generated inconsistently and are not durable in the UI

**Affected files:** `ui/api.js:14-17,27-35,80-93`, `ui/main.js:444-475`, `API-CONTRACT.md:25,29-32`.

Every non-GET request gets an `Idempotency-Key` header, while `runWorkflow` also generates a different key in the JSON body. Keys are generated inside the request call and are not retained for reconciliation. A network/5xx response is marked `uncertain`, but most mutation handlers only show a toast; repeating the action creates another key. `editorUncertain` is set but not rendered or used to force verification.

**Impact:** Once the backend exists, a timeout after commit can cause duplicate workflow runs, credit reservations, approvals, or sandbox billing mutations. Header-vs-body precedence is unspecified.

**Smallest useful correction:** Generate one operation key at intent creation, send it in the one documented location, persist it through reconciliation, and make the server enforce a unique `(workspace, operation, idempotency_key)` result. On uncertain responses, show a verify/reconcile state rather than offering an unqualified repeat.

### P2 — Successful logout leaves a permanent client-side busy key

**Affected file:** `ui/main.js:265-286`.

`handleLogout` calls `begin("logout", element)` but does not call `finish("logout")` on success. Because `pendingKeys` survives the state transition, a later sign-out attempt in the same page session is ignored by `begin`.

**Impact:** After signing back in without a full page reload, sign-out can become a no-op. This is a small but concrete regression in a core session boundary.

**Smallest useful correction:** Clear the operation in a `finally` block (or clear all transient pending keys when resetting session state), and add a two-session UI/controller regression test.

### P2 — README, package metadata, and the contract describe different products

**Affected files:** `README.md:1-37`, `package.json:1-10`, `API-CONTRACT.md:1-3,46-47`.

The README describes a browser demo with `localStorage` and `window.MakeEase.reset()`, but no `localStorage` or `window.MakeEase` implementation exists. It tells users to run `npx serve .`, which serves no `/api/bootstrap` endpoint. `npm start` exists but is not documented. The package name/description, directory name, brand, legacy adapter name, and contract terminology also vary (`makease`/`makeease`, `plan`/`planId`, `topUp`/`topup`, camelCase UI fields/snake_case executor fields).

**Impact:** New contributors follow instructions that cannot launch the current app, and naming drift makes contract migrations easy to get subtly wrong.

**Smallest useful correction:** Update README and package metadata after the runtime decision. Document the one supported start command, Node version, sandbox behavior, endpoint surface, data location, environment variables, reset/migration process, and security boundary. Adopt one naming convention at each transport/domain boundary and record explicit mapping only where persistence requires it.

## Maintainability and module-boundary assessment

### Strengths worth preserving

- `server.js` has useful defensive primitives: JSON body size limits, content-type checks, path traversal checks using both lexical and real paths, atomic writes, no-store JSON responses, and several security headers (`server.js:188-239,284-353,376-449`).
- The UI consistently uses `escapeHtml` for rendered data, and output/knowledge content is escaped before insertion (`ui/utils.js:4-12`, `ui/views.js`).
- Password hashing and token comparison primitives use `scrypt` and timing-safe comparison (`lib/auth.js:23-45,67-72`). They still need to be wired into an actual session store and cookie policy.
- The executor labels sandbox output explicitly and avoids claiming external side effects (`lib/executor.js:130-164`).
- The current smoke test checks several meaningful legacy boundaries: body limits, unsafe keys, path traversal, private root files, persistence, and disabled CORS (`server-smoke.js:43-113`).

### Boundaries that need consolidation

- `server.js` combines routing, static serving, persistence, response formatting, security policy, and legacy domain fixtures in one 598-line module. Split transport, public-file serving, storage, and domain services so each can be tested without a global filesystem.
- `ui/main.js` combines global DOM initialization, state, navigation, mutation orchestration, polling, modal behavior, and event delegation in one 735-line module. Extract a small state/controller layer and inject the API transport; keep renderers pure so contract and edge-case tests do not require a browser.
- `ui/views.js` contains many long, hand-built HTML templates. The existing escaping is a good baseline, but component-sized render functions and a single typed/validated view model would reduce repeated fallbacks and make accessibility regressions easier to review.
- `lib/validation.js`, `lib/auth.js`, and `lib/executor.js` are intended as domain modules but have no stable database/service interfaces, no shared error module, and no entry point. Define interfaces before adding more route handlers.
- `lib/executor.js` imports `modelFor` but does not use it (`lib/executor.js:3-5`), which is a small signal that validation responsibility is not yet settled between route and executor.

## Recommended next implementation increments

1. **Runtime decision and vertical contract slice (P0).** Pick the full-stack contract or the legacy demo, remove the other path from the default runtime, and make `npm start` launch the same API the UI calls. Add a bootstrap/session/workspace contract test.
2. **Database and schema boundary (P0).** Add the missing database module, migrations/schema versioning, workspace scoping, transaction helpers, and a shared error type. Test persistence, restart recovery, and concurrent writes before implementing more routes.
3. **Security perimeter (P0).** Enforce authentication, CSRF, tenant authorization, secure session cookies, rate limits, and a public static root. Fail closed when a local-only server is configured for a non-loopback host without an explicit development switch.
4. **Workflow/run/credit vertical slice (P1).** Implement create/update/run/get-run with atomic reservation, durable idempotency, approval transitions, and ledger events. Verify no duplicate charge/run on retries and that rejected/failed runs release reservations correctly.
5. **Executor hardening (P1).** Add cancellation, bounded provider responses, provider URL policy, graceful shutdown, interrupted-run recovery, structured error codes, and tests for timeout/provider failure paths.
6. **Client contract cleanup and testability (P1/P2).** Remove silent legacy field fallbacks, centralize API response decoding, inject `fetch`, make uncertain mutations reconcile by key, and cover logout, auth expiry, polling, and refresh failures.
7. **Fixture and documentation cleanup (P2).** Replace production-looking synthetic records with an explicit sandbox fixture, align README/package metadata/API contract, document environment and migration commands, and add the exact smoke commands to CI.

## Review conclusion

The legacy handler passes its own smoke checks and contains several good local-safety controls, but the requested long-lived-codebase standard is not met yet: the browser/API contract is broken at startup, the intended backend is incomplete, authentication boundaries are absent in the runnable server, and the test suite cannot see those failures. Resolve the first three P0 increments before extending workflows, billing, integrations, or provider functionality.

## Changed files

- `CODEBASE-REVIEW.md` — added this review. No application code, fixture, contract, or test file was changed.
