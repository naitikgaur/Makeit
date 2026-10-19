# Runtime security model

This document defines the runtime-security boundary for a production MakeEase-style automation platform. It is design guidance, not evidence that these controls are implemented in the local MVP.

## Security position

Treat all connector responses, email, documents, web pages, downloaded files, model output, workflow input, and customer-supplied code as **untrusted**. A value being returned by an authenticated connector does not make it an instruction or a trusted program. Authentication establishes who supplied a value; it does not establish that the value is safe to render, execute, or pass to another tool.

The control plane must remain a policy and orchestration service. It must not execute customer code, run a browser, parse arbitrary files with native helpers, or make a connector call on behalf of an untrusted worker without a policy decision. Untrusted work belongs in a short-lived data-plane worker with an explicit capability set.

The minimum production shape is:

```text
authenticated request
        |
        v
control plane -> policy/quota check -> durable queue
        |                                  |
        +-> secret broker (scoped lease)   v
        +-> append-only audit         isolated worker
                                           |
                              egress/connector gateway
                                           |
                                      external service
```

The worker returns typed results and evidence references. It does not receive control-plane credentials, a general-purpose cloud role, a host mount, or an unrestricted network route.

## Trust zones and isolation profiles

Use separate profiles rather than one worker policy for every kind of step:

| Profile | Intended work | Default boundary |
| --- | --- | --- |
| `declarative` | Mapping, filtering, templated transformations | No code execution and no network; bounded in-process implementation in a trusted service or isolated worker |
| `connector` | A platform-owned adapter calling one approved provider | Connector-specific worker or gateway; only the provider endpoints and scopes needed for that adapter |
| `code` | Customer JavaScript/Python or another programmable step | Ephemeral sandbox; no network, secrets, host/filesystem access, or package installation unless separately granted |
| `browser` | Browser/RPA navigation, DOM work, screenshots, and downloads | One disposable browser profile in a VM-backed or equivalently isolated managed worker; egress and actions are policy-controlled |

Customer code and browser content are hostile-workload profiles. A shared-kernel container alone is not a sufficient security boundary for arbitrary customer code or a browser exposed to hostile web content. Use a microVM (for example, a Firecracker- or Kata-like boundary) or a managed execution service with an equivalent isolation contract. A sandboxed container runtime such as gVisor can be a useful additional layer, but it does not remove the need for least privilege, network denial, resource limits, and patching.

## 1. Connector data and prompt-injection resistance

Connector data is data, not policy. The following rules apply before data is stored, rendered, embedded in a model prompt, or passed to a tool:

* Validate against a typed schema with limits on total bytes, string length, collection length, nesting depth, attachment count, and decompressed size. Reject malformed or ambiguous values; do not silently coerce an object into executable configuration.
* Preserve a provenance label such as `connector:gmail` or `browser:example.com`. Delimit and label external content in model context. System and platform policy instructions must be separate from connector content, and model output must never be treated as authorization.
* Sanitize HTML, Markdown, SVG, filenames, and rich text before display or indexing. Disable active content and external resource loading in the renderer. Escape spreadsheet cells beginning with formula characters when exporting to CSV or a spreadsheet.
* Scan attachments and archives in quarantine. Enforce archive expansion limits and reject symlink entries, device entries, path traversal, and excessive compression ratios. Do not send an unscanned file to a native parser or a browser worker.
* Treat instructions in an email, ticket, document, web page, or model response as untrusted text. They cannot grant a new connector scope, change a destination, reveal a secret, disable an approval, or relax a sandbox. Tool calls must be independently validated by the policy service.
* Use safe parsers and isolated conversion workers for formats with a history of parser vulnerabilities. Do not execute macros, embedded scripts, or active document content.
* Keep raw content out of ordinary logs. Store evidence by an opaque artifact ID with encryption, tenant scope, retention, and access audit.

For LLM-assisted steps, enforce output schemas and allowlists after generation. A model may propose an action; only the control plane can authorize a typed action whose target, connector, tenant, budget, and approval state have been checked.

## 2. Customer code steps

Never run customer code in the HTTP process, queue consumer, scheduler, browser host, or a process with cloud or database credentials. The runtime should:

1. Resolve the workflow and its immutable step policy in the control plane.
2. Start a fresh, signed, minimal image or VM for the run. Pin the image by digest and record the digest, runtime version, policy version, and dependency lock in the audit event.
3. Run as a dedicated non-root UID with a rootless user namespace where possible. Drop all Linux capabilities; deny privilege escalation, setuid/setgid, `ptrace`, raw sockets, device access, host PID/IPC/UTS namespaces, and access to the container runtime socket.
4. Mount a read-only root filesystem and an empty, quota-limited work directory. Provide only declared input files. Do not mount the host, the application source tree, a Kubernetes service-account token, or a cloud metadata path.
5. Deny network by default. If a capability is approved, route it through the egress policy below rather than giving the process an unrestricted interface.
6. Make package installation unavailable during a run. Build dependencies in a reviewed, reproducible pipeline, scan them, lock versions, and sign the resulting image. A customer-requested package is a dependency review event, not a reason to grant the worker internet access.
7. Return a typed, size-limited result. Store large outputs as scoped artifacts, not in queue messages or logs. Destroy the worker after completion, timeout, or failure.

Use cgroup v2 and a supervisor outside the sandbox so a runaway process cannot disable its own watchdog. A process that needs a stronger boundary than the selected runtime must be placed on a dedicated worker pool or denied.

## 3. Browser and RPA work

Browser automation has two hostile inputs: customer instructions and arbitrary sites. A production browser runner should have all of the following properties:

* One fresh browser profile per run and no reuse of personal, operator, or another tenant's cookies, local storage, passwords, extensions, downloads, or cache.
* A patched, pinned browser version running as non-root inside a disposable VM-backed worker. Disable extension installation, developer tools exposed to the customer, native messaging, arbitrary clipboard/desktop integration, camera/microphone/geolocation, and access to the host display or input devices.
* A separate browser process and OS sandbox from the orchestrator. Do not automate the operator's desktop or a browser profile on the API server.
* An explicit domain and port allowlist. Re-check every redirect and navigation target; protect against DNS rebinding, IPv4/IPv6 alternate forms, localhost, loopback, link-local, private, multicast, Unix-socket, and cloud-metadata destinations.
* Limits on tabs, navigation count, page time, download bytes, screenshot size, DOM size, and total run time. Put downloads in quarantine for scanning and provide them to later steps only as scoped artifacts.
* Page text, DOM attributes, images, OCR, and downloaded documents remain untrusted. Text on a page cannot authorize a payment, disclose a token, or change the domain policy. High-impact actions such as sending, deleting, purchasing, publishing, or changing access require a typed action policy and, where configured, a human approval.
* No persistent browser credentials in the worker. If a login is required, use a short-lived, least-privileged account or a brokered session that is scoped to the tenant, destination, and run. Do not put credentials into screenshots, prompts, DOM logs, or artifacts.

For sites with a supported API, prefer a connector adapter over RPA. RPA is the higher-risk fallback because a browser exploit or malicious page can attack the browser process; the VM boundary and rapid patching are required controls, not optional hardening.

## 4. Secrets and connector credentials

Secrets belong in a dedicated secret manager backed by a KMS/HSM-capable key hierarchy, not in source, images, workflow JSON, browser storage, ordinary database columns, logs, or customer artifacts.

* Store each credential under a tenant- and connector-scoped namespace. Use envelope encryption, rotation, revocation, expiry, and an access record for every lease. Per-tenant data-encryption keys or an equivalent cryptographic separation are preferred for higher-sensitivity tenants.
* Use OAuth tokens and service accounts with the narrowest scopes, audience, repository, mailbox, or project permissions possible. Prefer short-lived exchange tokens over long-lived bearer tokens.
* Issue a worker a capability token or one-time secret lease only after the policy check. Bind it to tenant, run, connector, operation, destination, expiry, and nonce. The worker must not receive a broad platform role or a secret manager master credential.
* Prefer a brokered connector call or a read-only secret file descriptor/mount with restrictive permissions over ordinary environment variables. Environment variables are easy for child processes, crash reports, and diagnostics to capture. If a code step can read a secret, assume the code can exfiltrate it and constrain egress accordingly.
* Redact secrets before logs, traces, exceptions, metrics, model context, screenshots, browser recordings, crash dumps, and exported audit data. Redaction is defense in depth; it must not be the only control.
* Rotate on schedule and on suspected exposure. Revoke the lease when a run ends or is killed. Do not retry a failed side effect with an expired or broader credential.

The secret broker, KMS, and audit sink are control-plane services. A worker can request a narrowly scoped operation; it cannot enumerate secrets or change policy.

## 5. Network egress

The default worker network policy is deny-all. Egress is a capability that must be granted per step, tenant, connector, destination, method, and budget.

* Put internet access behind a separate egress proxy or connector gateway. Do not give arbitrary customer code a default route or direct DNS access.
* Match exact approved hostnames and ports, preferably to a platform-owned connector endpoint. Resolve and validate destinations in the gateway, and evaluate every redirect. Block loopback, private and reserved IPv4/IPv6 ranges, link-local addresses, multicast, Unix sockets, cloud instance metadata endpoints, and alternate numeric/IP encodings to prevent SSRF and DNS-rebinding bypasses.
* Require normal TLS certificate and hostname validation. Use mTLS or signed gateway requests where supported. Never accept a certificate exception because a workflow requested it.
* Enforce per-tenant and per-run byte, request, concurrency, rate, and time limits. Apply method and path restrictions for high-risk providers. Separate inbound webhooks from worker egress and authenticate them independently.
* Give the worker a pull-only, mutually authenticated channel to the control plane. No inbound connection from the public internet should terminate on a worker or node.
* Record the policy decision, resolved destination, connector, method class, byte counts, and result code in audit telemetry without recording authorization headers or bodies by default.

An allowlist is not enough if DNS, redirects, proxies, or IPv6 are left unrestricted. SSRF tests must cover all of those paths.

## 6. Filesystem and artifact access

Every run gets an isolated, temporary workspace. The root filesystem is read-only; the writable area is an ephemeral filesystem mounted with `nodev`, `nosuid`, and, where compatible, `noexec`, with a strict byte quota. Mask or restrict `/proc`, `/sys`, device nodes, kernel interfaces, and host sockets.

Do not use host-path mounts, shared application directories, the Docker/containerd socket, or a host home directory. Do not rely on a path prefix check alone: canonicalize paths, reject `..`, null bytes, symlink and hardlink escapes, special files, and races between validation and open. Use descriptor-relative safe opens where available.

Use an artifact service for inputs and outputs. Give a worker a short-lived, tenant/run-scoped artifact token instead of bucket-wide credentials. Use opaque object keys, encryption at rest, content-type and size validation, malware scanning, retention/expiry, and immutable hashes for evidence. Keep artifacts and caches partitioned by tenant and run; never use a global filename or cache key derived only from user input.

Destroy the workspace and revoke artifact access on completion, cancellation, timeout, and worker health failure. Pooled workers must be scrubbed and re-imaged or otherwise verified clean before another tenant is assigned. If that cannot be proven, use one-run workers.

## 7. Process, resource, and queue limits

Apply limits at the worker supervisor and cgroup level; `ulimit` alone is not sufficient. At minimum configure:

* CPU quota, memory limit, memory swap policy, process/PID limit, file-descriptor limit, ephemeral disk quota, I/O quota, and network byte/request quota.
* Wall-clock deadline and CPU-time deadline, maximum child processes, maximum threads, maximum open files, maximum output bytes, maximum log bytes, and maximum result depth/size.
* Browser-specific tab, navigation, page, download, screenshot, and DOM limits.
* Queue concurrency, per-tenant rate limits, retry budgets, backoff, and an idempotency key for every side effect. Reserve credits/quota before dispatch and release or settle them exactly once.

The external supervisor must kill the entire process tree and revoke leases after a deadline. Handle OOM and repeated crashes as security events, quarantine the image or worker, and avoid automatically retrying a side effect whose completion is unknown.

## 8. Auditability and incident evidence

Audit events must be append-only from the application perspective and written to a separate, access-controlled sink. A tenant may read its scoped history but may not alter, delete, or forge it. Use tamper-evident storage or object lock for the retention period, synchronized timestamps, and a monotonic event ID or sequence per run.

At minimum record:

* tenant, authenticated actor or service identity, session/request ID, workflow, run, step, approval, and idempotency key;
* policy version and decision, worker/VM identity, image and browser digest, runtime version, and region;
* connector and operation class, destination policy, secret lease ID (never the secret), artifact IDs and hashes, resource usage, retries, timeout/kill reason, and result status;
* high-impact approval and rejection events, login/credential changes, export/deletion requests, administrative access, and denied security operations.

Do not place full connector bodies, secrets, tokens, passwords, page screenshots, or arbitrary customer content in routine logs. If evidence is necessary, store it as a separately encrypted, tenant-scoped artifact with a declared retention period and audited access. Provide security alerts for denied egress, sandbox policy violations, tenant mismatches, unusual secret access, image drift, repeated OOMs, and suspected worker escape. Audit records must be sufficient to reconstruct what was authorized without becoming a second data leak.

## 9. Tenant boundaries

Tenant identity is derived from the authenticated session or service identity on the server. Never trust a client-supplied workspace or tenant ID for authorization. Every object, queue message, cache entry, artifact, secret lease, metric, trace, and audit event carries a server-derived tenant ID and is checked against it.

Required controls include:

* Database row-level authorization or an equivalent server-side repository boundary, with negative tests for tenant substitution, stale sessions, replay, and confused-deputy paths. The database connection, object-store prefix, and queue consumer must be tenant-aware; filtering only in the UI is not isolation.
* Per-tenant encryption scope, quotas, rate limits, concurrency limits, retention, export, and deletion. Avoid shared mutable caches and global temporary filenames. Include tenant IDs in cache keys and invalidate them on permission changes.
* Queue partitioning or verified tenant labels so a job cannot be delivered to the wrong worker. A worker accepts a signed job only when tenant, run, capability, expiry, and nonce match the assignment it received.
* No cross-tenant browser profiles, cookies, connector tokens, model conversation memory, prompt caches, or artifact directories. Clear all in-memory and on-disk state when a run ends.
* Pooled worker isolation with a VM-backed boundary for hostile profiles. Offer dedicated nodes, dedicated workers, region selection, or a stronger isolation tier for regulated or high-sensitivity tenants. A shared cluster must not be presented as equivalent to a dedicated tenant boundary.
* Just-in-time, least-privileged support access with reason, expiry, tenant approval where required, and an audit trail. Operators must not use a tenant's connector credentials from a personal browser.

For customer-hosted or otherwise untrusted managed workers, treat the worker host as outside the platform trust boundary. Send only data and capabilities that the tenant has authorized, use mTLS and signed jobs, and disable features that require an attested runtime when the worker cannot provide that assurance.

## 10. Linux container and managed-worker baseline

For a lower-risk platform-owned adapter, a hardened Linux container can be appropriate when it is rootless, non-root, read-only, capability-dropped, seccomp-restricted, protected by AppArmor/SELinux, isolated from host namespaces and devices, and governed by cgroup v2. Use minimal signed images, dependency scanning, SBOMs, regular kernel/runtime patching, node pools with no sensitive host workloads, and admission policies that reject privileged pods, host networking, host PID/IPC, host paths, and runtime sockets.

For arbitrary customer code or browser/RPA, use the same container controls inside a microVM or an equivalently isolated managed runner. A managed worker should:

1. Pull jobs over a mutually authenticated, outbound-only channel.
2. Verify a signed, expiring job envelope containing tenant, run, capabilities, policy version, and nonce.
3. Fetch inputs through scoped artifact tokens and obtain only the approved secret leases.
4. Execute one run in a disposable sandbox, report typed output and telemetry, and never accept public inbound traffic.
5. Revoke leases, delete or cryptographically discard temporary state, and return to a clean image or terminate.

The worker service must expose posture (runtime version, image digest, region, isolation tier, patch status) to policy. A platform should not silently send secrets or regulated data to a worker whose isolation or residency is unknown.

## 11. What is appropriate for the current local MVP

The current project is a local, dependency-free demo. Its stated behavior has no real authentication, no real connector calls, no customer code execution, no browser/RPA execution, no payment provider, and no external side effects. That is the correct security scope for this slice.

Keep the following boundaries in the MVP:

* Keep the server bound to loopback (`127.0.0.1`) for local use. Do not expose it with `HOST=0.0.0.0`, port forwarding, or a shared development machine when demo data is present.
* Use synthetic data only. Do not paste real API keys, OAuth tokens, passwords, customer exports, or sensitive browser content into the demo. `localStorage` and the local JSON file are not encrypted secret storage, tenant isolation, or an audit ledger.
* Keep integration buttons, approvals, billing, and model behavior as explicit local simulation. Do not add a child-process execution path, a shell command feature, real connector credentials, or a local-desktop browser automation shortcut to make the demo appear live.
* Preserve bounded request parsing, static path traversal defenses, content security headers, and unsafe-key/secret rejection already present in the local adapter. These are useful local hygiene controls, not a production authorization boundary.
* Run the local process under an ordinary OS account and protect the project directory with normal OS permissions. Do not run it as an administrator/root account.
* Treat the local data directory as disposable demo state. Reset it before sharing a copy, do not commit secrets, and do not use this adapter as a publicly reachable service.

It is acceptable for the MVP to omit the production queue, secret manager, cgroup sandbox, egress proxy, tenant database, append-only audit sink, and managed worker fleet because no untrusted execution or real integration is enabled. It is not acceptable to describe their absence as a production security posture.

## 12. Production gates and verification

Before enabling live connectors, require authenticated tenant scoping, server-side authorization, CSRF/session protections, a durable queue, scoped secrets, egress policy, artifact isolation, resource limits, and append-only audit events. Before enabling customer code, require the VM-backed sandbox, signed images/dependency policy, deny-by-default network, killable process tree, and escape-testing evidence. Before enabling browser/RPA, require a disposable browser worker, domain/action policy, download quarantine, no desktop-profile access, browser patching, and human approval for configured high-impact actions.

Security verification should include, at minimum:

* container and microVM escape tests, privilege/namespace/device checks, image admission and patch tests;
* SSRF tests for redirects, DNS rebinding, IPv4/IPv6 encodings, private and metadata addresses, proxy bypasses, and webhook confusion;
* tenant-swap tests across API, database, queues, caches, artifacts, browser profiles, secrets, logs, and exports;
* secret-leak tests in logs, traces, exceptions, model context, screenshots, crash dumps, and downloaded artifacts;
* fork-bomb, memory exhaustion, archive bomb, output flood, browser tab/download flood, timeout, cancellation, and retry/idempotency tests;
* malicious document, HTML/SVG, macro, attachment, prompt-injection, and browser-page tests;
* audit tamper, retention/deletion, operator-access, key-rotation, worker-reimage, and incident-recovery tests.

Record the exact runtime, kernel, image, browser, policy, and test versions. Re-run the relevant tests after changing the worker image, sandbox, browser, egress gateway, secret broker, queue, or tenant authorization code.

## Assumptions

* This file describes the target platform; it does not claim that the local MVP implements these production controls.
* The local MVP is run by one trusted OS user on a developer machine, with synthetic data and no real credentials.
* External connector responses and web pages remain untrusted even after successful authentication.
* "Managed worker" may mean a platform-operated worker or a customer-hosted worker. The latter cannot be trusted for secrets or protected data without an attested, policy-approved runtime.
* No real credentials were used or included in preparing this guidance.
