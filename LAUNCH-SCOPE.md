# MakeEase v1 launch scope

**Status:** production launch target and decision record. The repository itself remains a local sandbox; this file does not certify live capability.

## Launch decision

MakeEase should launch around one job:

> Turn an incoming support thread into a policy-grounded triage result, draft reply, and escalation recommendation that a human reviews before any customer-facing action.

The external category is **reviewable AI support operations**, not a general automation OS, autonomous support agent, helpdesk replacement, or “AI employee.” The broader Business Automation OS thesis remains an internal architecture and expansion direction.

## First customer

### Ideal customer profile

- B2B SaaS company of roughly 5–30 people.
- One shared Gmail support inbox or clearly scoped support label.
- A recurring support queue that interrupts a founder, COO, or one-to-three-person support/operations team.
- Existing policies or product context that can be approved and kept current.
- A named reviewer who wants faster drafts but retains responsibility for the final customer communication.

### Poor initial fit

- Very low-volume teams with no repeatable support categories.
- Buyers seeking autonomous sending on day one.
- A full omnichannel helpdesk replacement, engineering deployment tool, finance/refund system, or broad integration program.
- A team unwilling to provide policy context or review early outputs.

## Production launch package (target)

The approved commercial hypothesis in `PRICING-FINAL-DECISION.md` is:

| Offer | Target package |
| --- | --- |
| Guided pilot | **$299 one-time for 30 days**; one inbox/label, one workflow, two reviewers, 150 support review packets, and bounded setup/review service. No automatic renewal. |
| MakeEase Support | **$149/workspace/month**; one Gmail inbox or label, three named reviewers, one support workflow, 500 support threads prepared for review per month, approved policy/context records, review queue, history, export, and a hard stop by default. |
| Day-one external effect | No automatic customer-facing send. If the production Gmail capability is live and explicitly scoped, an approved result may be saved as a draft; the reviewer still sends it. |

These prices and allowances are hypotheses to validate with a paid pilot. They are not the current local plan values and must not be enabled by copying the document into the UI.

## In scope for the first paid cohort

1. Configure one Gmail inbox or label with the smallest practical read scope.
2. Import or paste approved refund, SLA, escalation, tone, and product context.
3. Classify intent and urgency, identify missing information, and recommend escalation.
4. Prepare a concise grounded draft with visible supporting context and uncertainty.
5. Place the result in a review queue where a reviewer can approve, edit, reject, or escalate.
6. Save an approved result as a Gmail draft only after the production connection and action policy are verified.
7. Keep a durable record of source thread, context, workflow/model/policy versions, usage, output, reviewer, decision, and provider receipt or clear failure.
8. Enforce hard usage/cost caps, bounded attempts, pause behavior, idempotency, and an emergency stop.

## Explicitly out of launch scope

- Automatic sending, refunds, deployments, pull requests, code changes, account changes, or other irreversible external actions.
- Slack, GitHub, Notion, Stripe, Linear, broad marketplace coverage, and omnichannel helpdesk replacement.
- An unconstrained workflow builder, arbitrary code execution, browser/RPA automation, or multi-agent autonomy.
- A company-wide knowledge graph without source permissions, freshness, deletion, and retention controls.
- Model shopping as the primary customer decision; use a tested logical route instead.
- Enterprise SSO/SCIM, custom residency, dedicated infrastructure, and procurement commitments before a buyer and implementation path exist.
- Universal “cheapest,” “fully autonomous,” “zero hallucination,” or percentage-savings claims.

## Launch acceptance gates

The paid package is not launchable until the following are real and tested:

- authenticated, tenant-scoped durable storage and role/permission checks;
- one production API path that matches the browser and has contract coverage;
- Gmail OAuth with least privilege, disconnect/revocation handling, and a verified source/draft boundary;
- production secret references in a vault/KMS boundary; no credentials in browser payloads, prompts, logs, exports, or fixtures;
- durable queue/worker execution with bounded retries, cancellation, restart recovery, and idempotent operations;
- a governed managed model route, synthetic evaluation results, prompt/context versioning, and cost/latency bounds;
- approval records bound to the exact action/payload/version, with expiry and no approval-as-success ambiguity;
- usage/packet reservation and settlement that cannot be changed by the client;
- verified payment webhooks, an approved price book, tax/refund/chargeback handling, and a separate financial ledger;
- append-only activity/audit evidence, redacted export, monitoring, backups, restore/replay, retention, deletion, and incident response;
- customer documentation that names the sandbox/live boundary and emergency pause procedure.

## Launch evidence

Activation is `first_approved_support_draft`: one scoped inbox, one confirmed policy/context record, one real or explicitly labeled sample thread processed, a human approval/edit, and a saved/copyable draft with visible history. A connection, template selection, sandbox run, or dashboard screenshot alone is not activation.

Track actual prepared packets, approved-as-is, edited, rejected, escalated, failed, review latency, cost per packet, provider failures, support minutes, cap hits, pilot conversion, and retention. Do not turn seeded demo values into ROI or customer outcome claims.
