# MakeEase environment and configuration guide

This guide describes the **checked-in local sandbox** and names the configuration a future production deployment will need. It contains no credentials. Environment variables are process configuration, not a substitute for authentication, a secret manager, or a production control plane.

## Safe local defaults

| Variable | Local default | Meaning | Safe local guidance |
| --- | --- | --- | --- |
| `HOST` | `127.0.0.1` | Adapter bind host | Keep loopback. The server rejects `0.0.0.0` and other non-loopback hosts. |
| `PORT` | `3000` | Adapter HTTP port | Use any free local port from `0`–`65535`; update the browser URL if changed. |
| `MAKEEASE_AUTH_MODE` | `local-demo` | `required` enables session-cookie, workspace-bound auth and CSRF rehearsal | Use `required` for an authenticated rehearsal; replace the local auth JSON store with the production tenant database before exposure. |
| `MAKEEASE_DATA_PATH` | `./data/workspace.json` | Local workspace file location | Keep synthetic local data here; production uses the relational store described in `DATABASE-SCHEMA.md`. |

PowerShell example:

```powershell
$env:HOST = "127.0.0.1"
$env:PORT = "3000"
npm start
```

The local adapter does not load `.env` files automatically. Set variables in the process environment, a shell profile, or a process manager only when you understand the boundary. Do not commit a real `.env` file.

## Provider variable names in the codebase

The executor/config modules define these names for a future provider-backed runtime. They are **not a way to turn the current browser demo into a live integration**. The current server advertises sandbox mode and calls `publicModels({})`, so its bootstrap models remain unconfigured and its UI has no provider execution path.

| Variable | Used for | Local status | Production requirement |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI-compatible provider credential | Do not set for the local demo | Store as a vault/KMS secret reference, never in source, browser state, logs, prompts, or exports. |
| `OPENAI_BASE_URL` | OpenAI-compatible provider endpoint | Not used by the local adapter | Allowlist the endpoint, validate TLS/egress, and bind it to an approved model route. |
| `OPENAI_MODEL_GPT_OSS` | OpenAI-compatible logical/model ID | Not used by the local adapter | Pin and evaluate the route; record model/provider version per run. |
| `ANTHROPIC_API_KEY` | Anthropic provider credential | Do not set for the local demo | Use secret leases and provider-specific access policy. |
| `ANTHROPIC_BASE_URL` | Anthropic endpoint override | Defaults in module code to Anthropic's public URL when used | Permit only approved destinations and verify account/environment. |
| `ANTHROPIC_MODEL_SONNET` | Anthropic Sonnet model ID | Not used by the local adapter | Pin, evaluate, and meter the selected model route. |
| `ANTHROPIC_MODEL_OPUS` | Anthropic Opus model ID | Not used by the local adapter | Pin, evaluate, and meter the selected model route. |
| `MAKEEASE_TOKEN_RATES_JSON` | Planning rates keyed by model | Not a billing ledger | Replace estimates with versioned, server-owned provider usage/rate records before charging or settling. |
| `MAKEEASE_GPT_OSS_INPUT_CREDITS_PER_1K` / `MAKEEASE_GPT_OSS_OUTPUT_CREDITS_PER_1K` | Fallback demo credit rates | Planning/config values only | Use an approved versioned rate card; never accept rates from a browser. |
| `MAKEEASE_SONNET_INPUT_CREDITS_PER_1K` / `MAKEEASE_SONNET_OUTPUT_CREDITS_PER_1K` | Fallback demo credit rates | Planning/config values only | Same rate-card and reconciliation requirements. |
| `MAKEEASE_OPUS_INPUT_CREDITS_PER_1K` / `MAKEEASE_OPUS_OUTPUT_CREDITS_PER_1K` | Fallback demo credit rates | Planning/config values only | Same rate-card and reconciliation requirements. |

`DEFAULT_DB_PATH` in `lib/config.js` points to a future user-home SQLite location. The current server uses `data/workspace.json`; the database path is not a supported production or local-UI switch. Do not assume a database exists because the constant is present.

## Configuration invariants

- **Mode:** local adapter mode is `sandbox`; no local variable should be used to present it as `live`.
- **Network:** loopback-only for the default local adapter. The opt-in auth rehearsal is not a production deployment; do not expose either mode through LAN binding, port forwarding, a tunnel, or a reverse proxy.
- **Secrets:** no API keys, OAuth tokens, passwords, payment credentials, or customer exports in environment examples, fixtures, `data/workspace.json`, browser storage, logs, or screenshots.
- **Data:** use synthetic or redacted input only. Delete/reset demo data before sharing a copy.
- **Billing:** the current plan/top-up values are demo display values; no payment provider is configured or invoked.
- **Providers:** a configured variable alone must not grant a connection, select a live model, or authorize an external action.

## Production configuration prerequisites

Before a production process can use provider variables, it also needs:

1. authenticated organization/workspace/environment context;
2. a secret broker/vault with short-lived, audited leases and rotation;
3. a model registry and route policy with data handling, region, capability, and cost metadata;
4. egress allowlists, TLS verification, timeouts, response limits, cancellation, and retry policy;
5. durable run/usage/ledger records with reservation and settlement;
6. redacted structured logs and append-only audit evidence;
7. provider health, incident pause, backup/restore, and deletion/retention controls; and
8. synthetic evaluation plus red-team evidence before enabling a live route.

For deployment configuration, use `PLATFORM-ROADMAP.md` and `RUNTIME-SECURITY.md`; for money/usage configuration, use `LEDGER-CONTROLS.md` and `PRICING-FINAL-DECISION.md`.
