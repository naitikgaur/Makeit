# MakeEase full-stack MVP contract

This supersedes the browser-only demo. Existing planner files and legacy JSON data must not be modified. Runtime: Node 20+ with built-in Node modules; plain browser ES modules, no build required. Local first, not certified for public production deployment.

**Implementation note:** The default checked-in local adapter uses one loopback demo scope with no sign-in, session cookie, CSRF token, OAuth, payment webhook, or live-provider route. Set `MAKEEASE_AUTH_MODE=required` to exercise the opt-in session-cookie and CSRF path. OAuth, billing, and live-provider rows remain target contracts. Support packet routes are implemented locally and remain non-authoritative preview records.

## Product decisions
- MakeEase Support $149 / 500 support review packets; MakeEase Team $499 / expanded capacity; Custom by agreement. Internal demo credits remain a sandbox meter and are not the customer-facing unit.
- Top-up $12 / 10,000 credits. All model tiers accessible on all plans, subject to configured provider and credit budget.
- Sandbox simulation is explicit, never described as a live integration or real AI output. Real provider keys are server environment configuration only.
- Empty genuine workspaces, no invented savings, run rates, customer histories or integration health.
- External side effects are not implemented in this slice; approvals authorize internal completion only, never pretend to send email or deploy code.

## Transport
All responses JSON `{ ok: true, ... }`; failures `{ ok: false, error: { code, message } }` with appropriate HTTP status. Same-origin session cookie, no browser-stored credentials. Authenticated writes require `X-CSRF-Token` from bootstrap and JSON Content-Type. All data is scoped to the authenticated workspace.

## API
- `GET /api/bootstrap` -> `{user:null|{id,name,email},csrfToken:null|string,mode:'sandbox'|'live',plans,models,templates,topup:{price:12,credits:10000}}`. Models `{id,label,configured}`; templates `{id,name,description,category,steps:string[]}`.
- `POST /api/auth/register` `{name,email,password,workspaceName}` -> user and csrfToken. Password min 12 chars.
- `POST /api/auth/login` `{email,password}` -> user and csrfToken.
- `POST /api/auth/demo` `{}` -> user and csrfToken; local sandbox only, isolated workspace with templates, no real credentials or synthetic completed runs.
- `POST /api/auth/logout` `{}`.
- `GET /api/workspace` -> `{workspace,usage,workflows,runs,approvals,knowledge,activity,integrations,ledger}`.
- `GET /api/connectors` -> `{mode:'preview',connectors}`. Catalog metadata never represents an OAuth grant or live provider.
- `GET /api/packets` -> `{customerUnit:'support_review_packet',packets}`. `GET /api/packets/:id` returns one bounded support review packet.
- `PATCH /api/workspace` `{name,description,goal,timezone}`.
- `POST /api/workflows` `{name,description,templateId,model,budgetCredits,requiresApproval}` -> `{workflow}`.
- `PATCH /api/workflows/:id` same fields plus `status` -> `{workflow}`.
- `POST /api/workflows/:id/run` `{input,idempotencyKey}` -> `{run}` (202 if queued). Must reserve credits atomically first. No automatic external writes.
- `GET /api/runs/:id` -> `{run}`.
- `POST /api/runs/:id/retry` `{idempotencyKey}` -> `{run}` (202 if queued). Only failed sandbox runs may be retried; the original run remains immutable and the retry carries `retryOf`.
- `POST /api/approvals/:id/decision` `{decision:'approve'|'reject',reason?,editedOutput?}`. Repeat decision cannot charge twice; approval never sends.
- `POST /api/knowledge` `{title,content}`; `DELETE /api/knowledge/:id` -> `{ok:true}`.
- `POST /api/billing/sandbox-topup` `{idempotencyKey}`. Explicit simulation, no payment; sandbox only.
- `POST /api/billing/sandbox-plan` `{planId,idempotencyKey}`. Explicit simulation; no cycling plans to repeatedly mint monthly credits.
- `POST /api/billing/checkout` `{planId}` OR `{productId:'topup'}` -> `{url}` if Stripe configured, otherwise clear 503. Price IDs server-side only.
- `POST /api/billing/webhook` signed raw Stripe payload; isolated from session CSRF, never unverified credit grant.
- `GET /api/audit` and `GET /api/ledger` -> bounded local evidence and credit-ledger records.
- `GET /api/export` -> scoped JSON downloadable workspace, excludes secrets.

## Snapshot shapes
- workspace `{id,name,description,goal,timezone,planId}`
- usage `{included,topup,used,reserved,available,cycleStart,cycleEnd}`
- workflow `{id,name,description,templateId,model,budgetCredits,requiresApproval,status:'draft'|'active'|'paused',createdAt}`
- run `{id,workflowId,workflowName,status:'queued'|'running'|'awaiting_approval'|'completed'|'rejected'|'failed',input,output,credits,model,mode,steps:[{name,status,detail}],error,createdAt,retryOf?}`
- approval `{id,runId,title,status:'pending'|'approved'|'rejected',createdAt}`
- knowledge `{id,title,content,createdAt}`
- activity `{id,action,detail,createdAt}`
- integration `{id,name,description,category,status:'not_configured',available:false}` (no fake connect buttons)
- ledger `{id,type,amount,description,runId,createdAt}`. Immutable events managed by server, never arbitrary client writes.

## UI and execution
Sign in or open explicit sandbox -> dashboard -> template gallery -> workflow editor with step graph and configuration -> bounded test run -> inspect output/steps -> internal approval -> ledger and execution history -> billing/settings/knowledge. Poll pending runs only while necessary. No localStorage business authority; cache only visual preferences. Never auto-purchase, never silently escalate beyond approved budget. Unknown or missing credentials disable live behavior.
