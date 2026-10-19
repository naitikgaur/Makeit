# MakeEase SaaS ledger and accounting controls

**Purpose:** define the accounting and operational controls required before MakeEase can treat subscriptions, credits, and usage as a production SaaS billing system. This document is a control specification and a reconciliation of those controls to the current local demo. It does not change the demo runtime.

**Control boundary:** the payment provider is authoritative for money movement and payment state. The application ledger is authoritative for workspace entitlements, credit usage, reservations, and the processing of provider events. A general ledger (GL), tax system, or ERP remains authoritative for formal revenue recognition, tax, bank accounting, and financial statements.

## 1. Current local demo baseline

The repository contains a target API contract and a simpler local adapter. For accounting purposes, the running adapter is the authority; a documented target route is not evidence that the route exists.

| Artifact | What it currently represents | Accounting consequence |
| --- | --- | --- |
| `server.js` | A local JSON adapter. Its advertised metadata says `auth: none (local MVP)` and `billing: demo-only`; its routes are health, plans, and read/write workspace data. | It cannot establish customer identity, payment, invoice, webhook, entitlement, or audit evidence. |
| `data/workspace.json` | A sample workspace with `usage.used` and `usage.limit`, sample workflow/run counts, and approval credit amounts. | These are demo display values, not a subledger. There are no immutable events, reservation records, provider IDs, billing periods, or reconciliation keys. |
| `API-CONTRACT.md` | A desired fuller service contract. It describes atomic run reservations, sandbox billing endpoints, checkout, signed webhooks, usage fields, and immutable ledger events. | Treat these as acceptance requirements for a future implementation, not as controls currently in force. |
| `ui/api.js` and `ui/views.js` | Client expectations for usage, runs, approvals, billing, and ledger fields. The client generates idempotency keys for writes. | A client-generated key is not an idempotency control until the server persists and enforces it. Missing routes or fields must fail closed rather than be treated as paid or consumed. |
| `lib/config.js` and the duplicate plan definitions in `server.js` | Display/configuration values: Starter $25/15,000 credits, Growth $50/40,000, Business $100/90,000, and a $12/10,000-credit top-up. | Configuration is not a price book or invoice record. Production must have one versioned, server-side mapping to provider product/price IDs. |
| `lib/executor.js` | Intended run semantics such as `reserved_credits`, final actual credits, and recovery of interrupted runs, using a `db` interface. | This is a design signal for reservation controls, not proof of a durable ledger in the current adapter. |
| `README.md` | Explicitly describes local/demo state and says the credit ledger is not a payment provider. | Sandbox activity and sandbox credits must be labelled and excluded from financial reports. |

### Demo reconciliation conclusion

The current local demo has no production ledger. The JSON workspace is mutable through `PUT`/`PATCH`, is not append-only, has no authenticated workspace boundary, and does not implement subscriptions, real checkout, payment-provider webhooks, invoices, refunds, chargebacks, period close, or reconciliation. A local top-up or plan simulation, if added later, must be marked `sandbox` and must never be presented as a card charge, invoice payment, revenue event, or audit evidence.

The target contract's intended usage snapshot is:

```text
usage = included + topup - used - reserved
          with cycleStart and cycleEnd
```

That formula is useful for the future application ledger, but the present `data/workspace.json` only has `used` and `limit`. No control may infer `reserved`, `available`, a billing cycle, or a paid balance from those fields.

## 2. Systems of record and ownership

| Concern | Authoritative system | Application responsibility |
| --- | --- | --- |
| Customer, payment method, payment authentication, authorization/capture, provider fees, invoice total, tax fields, refund execution, dispute/chargeback state, and payout/settlement | Payment provider and, where applicable, tax/bank systems | Store provider IDs and a read-only projection; never invent or overwrite provider money state. Do not store card data. |
| Product/price mapping and commercial plan policy | Versioned server-side price book approved by Finance/Product; provider product/price IDs are the external keys | Snapshot the price-book version and provider IDs on each order/subscription event. Never take price or credit quantity from the browser. |
| Workspace entitlement grants, included/top-up buckets, credit expiry/revocation, usage, reservation, release, and consumption | Application credit subledger | Create immutable, workspace-scoped events in transactions. Link every event to a run, invoice line, provider event, or approved adjustment. |
| Webhook receipt and processing | Application event-inbox plus provider event ID | Verify the raw signature, persist the event and payload hash, enforce uniqueness, process idempotently, and retain failures/quarantine evidence. |
| Revenue recognition, deferred revenue/contract liability, tax filing, COGS, bank reconciliation, and financial statements | GL/ERP and Finance-approved accounting policy | Export a complete supporting subledger and reconciliation package. Do not call a credit grant “revenue” in the product database. |
| Audit trail | Append-only application audit store plus provider/GL evidence | Record actor, source, timestamps, reason, before/after references, correlation IDs, approvals, and evidence hashes. The local JSON file is not an audit store. |

The application may mirror provider status, but a mirror is not a second source of truth. If the mirror conflicts with the provider, stop entitlement-changing work, reconcile, and record the exception.

## 3. Required ledger model

Use two linked subledgers rather than one field called “credits.” Money and service units must never be mixed.

### 3.1 Provider financial-event mirror

Each event is immutable and contains at least:

- `provider`, `provider_event_id`, `provider_object_id`, event type, provider creation time, receipt time, and processing time;
- `workspace_id`, provider customer/subscription/invoice/payment/refund/dispute IDs, and the price-book version;
- amount in integer minor units, currency, tax/discount fields supplied by the provider, and the provider status;
- signature-verification result, raw-payload reference or encrypted evidence reference, payload hash, and correlation ID;
- processing status (`received`, `processed`, `ignored`, `quarantined`, `failed`), failure reason, and retry count;
- `reversal_of` or adjustment reference where the event corrects an earlier event.

The mirror has no authority to move cash. A `payment_succeeded` mirror entry can authorize an entitlement grant only after the provider event is verified and the grant transaction succeeds.

### 3.2 Application credit and usage ledger

Each credit event is append-only and contains:

- immutable `entry_id`, `workspace_id`, `event_type`, signed integer `credit_delta`, bucket (`included` or `topup`), and effective/recorded UTC timestamps;
- source reference: `invoice_id`/invoice line, provider event, run, reservation, adjustment approval, or policy version;
- `idempotency_key`, actor/service, reason, model/rate-card version where usage is involved, and correlation ID;
- `reservation_id` and `run_id` where applicable; `reversal_of` for corrections; and a payload/evidence reference.

Required event types are `grant`, `reserve`, `consume`, `release`, `expire`, `revoke`, and `adjustment`. A reservation is a hold against available credits, not consumption and not revenue. A release returns an unused hold. A consume event records actual service delivered; it must not edit the original reserve.

Recommended derived balances are:

```text
entitled = grants + positive adjustments - expires - revokes
used     = successful consume events
reserved = active reservation holds
available = entitled - used - reserved
```

The production database must enforce, transactionally:

1. No credit event is edited or deleted. Corrections append a compensating event with an explanation and approval.
2. `credit_delta` is an integer; financial amounts are integer minor units; no floating-point money is stored.
3. A run cannot reserve more than its workspace's available balance. The conditional balance check and run creation occur in one transaction.
4. A reservation has one terminal outcome. It is either fully released, or actual usage is consumed and the remainder is released; it cannot be released twice.
5. A terminal run has no active reservation. A terminal run with an unresolved provider call remains `usage_pending` and is not silently released as zero usage.
6. Every consume event references exactly one run and measured usage (or an explicitly approved sandbox classification). Sandbox events are excluded from live billing and revenue reports.
7. Every provider-backed grant has a verified provider event and a unique business key. No browser redirect, client flag, or mutable workspace field can grant credits.
8. All records are workspace-scoped. A provider customer may map to only the approved workspace(s), with transfers requiring a documented migration entry.

## 4. Operational and accounting controls

### 4.1 Subscriptions and plan changes

**Controls**

- Maintain a server-side price book with immutable provider product/price IDs, currency, amount, interval, included credits, tax treatment, effective date, and approval. The displayed amounts in the demo are seed values only.
- Store the provider subscription ID, customer ID, item/price ID, status, current period start/end, cancellation timing, quantity, and price-book version. Never use a plan name alone as a financial key.
- Create or change an entitlement only from an accepted provider state transition. A UI “choose plan” action may request checkout; it cannot activate a plan or mint credits.
- Treat upgrades, downgrades, proration, trials, pauses, cancellations, and scheduled changes as explicit provider state transitions. Record the effective date and the provider invoice or credit note that implements any proration.
- Grant recurring included credits once per paid billing period and subscription line. Use a unique key such as `(workspace, provider invoice, subscription item, period start, bucket)`.
- Do not grant a new period merely because a subscription object says “active” if the period's invoice has not met the approved payment/grace policy. Do not revoke previously delivered service merely because a webhook is delayed; apply the documented grace policy and reconcile.
- Sandbox plan changes must be visibly tagged `sandbox`, must not cycle to mint unlimited monthly credits, and must be excluded from provider, GL, and revenue exports.

**Evidence and owner:** Finance/Product approves the price book and entitlement policy; Billing Engineering owns the state machine. Retain the approval, price-book version, provider subscription/invoice IDs, and the resulting credit grant.

### 4.2 Usage and credits

**Controls**

- Keep included credits and paid top-up credits in separate buckets with separate grant source, period, expiry, and refund/revocation rules. Do not silently combine them in a single mutable counter.
- Record actual provider usage where available: model/provider, input and output units, provider request ID, response usage, rate-card version, calculation, and resulting integer credits. The current executor's token-rate calculation is a useful proposed control; it is not evidence until persisted durably.
- Version all rate cards with effective timestamps. A later rate-card edit cannot rewrite historical usage; corrections are new adjustment events linked to the original.
- For a sandbox run, record deterministic simulated usage and `mode=sandbox`; never describe it as provider usage, a card purchase, or billable revenue.
- The public `usage` projection should expose `included`, `topup`, `used`, `reserved`, `available`, `cycleStart`, and `cycleEnd`, but each value must be derivable from events. A missing value is unknown, not zero.
- Enforce workspace and workflow budgets before queueing work. Never silently escalate beyond the approved budget. If measured usage exceeds a reservation, stop or quarantine the run and create an exception; do not auto-overconsume.
- Reconcile application credits to model-provider usage and provider invoices/usage exports. Differences need a reason code (rounding, provider correction, failed call with usage, rate-card correction, or approved write-off).

**Accounting treatment:** a credit grant is an entitlement/subledger event. It is not revenue merely because it was granted or displayed.

### 4.3 Reservations and releases

**Controls**

- On run creation, atomically create the run and a reservation for its approved `budgetCredits` before queueing it. Persist the reservation amount, owner, creation time, expiry/lease policy, and idempotency key.
- A reservation may belong only to a queued, running, or approval-waiting run. A reaper/recovery process must identify stale holds and use a transactional release or `usage_pending` exception.
- On successful completion, consume actual measured credits and release the unused remainder in the same finalization transaction. The run's final `credits` is actual usage; it is not the original budget.
- On a failure before any provider call, consume zero and release the full hold. If a provider call may have occurred, retain the hold until usage/request status is known; never assume a timeout means zero usage.
- On approval or rejection, account for work already performed. Approval is an operational decision and is not a refund of consumed credits. Rejection releases only the unconsumed reservation.
- Interrupted executor recovery must be idempotent. A restart may resume or finalize a run, but it may not create a second reservation or a second consume/release event.
- Monitor reservation age, terminal runs with holds, holds over their lease, and available balances below zero. These are control exceptions, not normal user states.

**Evidence:** reservation ID, run ID, budget, actual usage, release amount, terminal status, provider request ID, and the transaction/correlation ID.

### 4.4 Refunds

**Provider responsibility:** the payment provider executes and records the monetary refund, applies its refund rules, returns a refund ID, and updates the invoice/payment object. The application must request a refund through the provider or approved support workflow; it must not mark cash as refunded by editing local JSON.

**Application controls**

- Record `refund_requested`, `refund_succeeded`, or `refund_failed` separately. Only a verified provider `refund_succeeded` event changes the application financial mirror or entitlement state.
- Link a refund to the provider payment, invoice, line item, workspace, amount, currency, reason, requester, approver, and provider refund ID. Partial refunds require line-item allocation or an approved allocation rule.
- On a successful refund, apply the approved credit policy as a separate immutable event. At minimum, revoke unspent credits attributable to the refunded purchase; do not rewrite historical consumption. If paid credits were already consumed, create a finance exception or approved receivable/write-off according to policy rather than inventing negative usage.
- A refund of a subscription invoice and a refund of a top-up are different business events. Do not use a generic “refund credits” button that obscures the source.
- Manual credit restoration or goodwill credits require maker-checker approval, reason, amount, expiry, and a link to the support/refund case. They are not provider refunds and must be reported separately.

### 4.5 Chargebacks and disputes

**Provider responsibility:** the provider owns dispute intake, evidence submission, card-network deadlines, provisional debit, reversal, and final lost/won state. The application cannot win a chargeback by changing its ledger.

**Application controls**

- Ingest dispute opened, evidence due, won, lost, and other provider-specific states as immutable financial mirror events.
- On an open dispute, flag the workspace/customer and apply the approved operational hold (for example, stop new top-up entitlement or high-risk activity) without deleting historical usage. Record who approved any exception.
- On a lost dispute, reconcile the provider debit and revoke unspent credits attributable to the disputed payment. If consumed service cannot be recovered, send the amount and usage detail to Finance for loss/receivable treatment. On a won dispute, reverse only the application hold/revocation supported by the provider event.
- Reconcile chargebacks separately from ordinary refunds. A chargeback is not a customer-requested refund and should not be netted silently.

### 4.6 Payment-provider webhooks

**Ingress controls**

1. Receive the provider's raw request body. Verify the provider signature, endpoint secret, timestamp tolerance, and expected account/environment before parsing or applying effects. Provider webhooks are not authenticated with the user's session CSRF token.
2. Persist the raw event reference, payload hash, provider event ID, signature result, receipt time, and processing status before returning success. Do not log secrets or full payment credentials.
3. Enforce a unique `(provider, account, provider_event_id)` constraint. The same event replay returns the stored result and performs no second grant, refund, or state transition.
4. Process accepted events in a database transaction or durable outbox. A transient failure is retried; a malformed, unverifiable, cross-tenant, or contradictory event is quarantined and alerted.
5. Apply a provider-specific state machine. Stale or out-of-order events must not regress a newer subscription/invoice state. Retrieve the provider object when ordering or amount is ambiguous.
6. Acknowledge only after durable receipt. A queued event may be acknowledged after the inbox record is durable, but entitlement work must remain observable until processed.

**Typical event mapping** (names vary by provider):

| Provider event | Application action |
| --- | --- |
| Checkout completed but payment pending | Record checkout linkage only; do not grant paid credits. |
| Payment intent/charge succeeded or invoice paid | Verify amount, currency, customer, price, and period; create one financial mirror and one matching grant. |
| Payment failed / invoice payment failed | Record failure and apply the documented grace policy; do not create a renewal grant. |
| Subscription created/updated/deleted | Update the projection and effective dates; do not grant solely from the subscription event. |
| Refund succeeded | Mirror the refund and create the approved unspent-credit revocation/exception. |
| Dispute opened/won/lost | Mirror the dispute and apply the approved hold/revocation/reversal. |

### 4.7 Invoice status

Persist the provider invoice ID, status, issue/due/paid timestamps, period, line items, discounts/tax, amount due/paid, currency, customer, subscription item, and a payload/version reference.

The default entitlement mapping below must be approved for the provider in use:

| Invoice state | Credit/operational treatment |
| --- | --- |
| `draft` | No grant; may change before finalization. |
| `open` or payment pending | Record receivable/pending status; no paid renewal or top-up grant. Apply only an approved grace entitlement. |
| `paid` / settled | Grant the mapped included or top-up credits once, after amount/currency/line-item validation. |
| `void` | No grant. If a grant was incorrectly issued, append a linked reversal/revocation and investigate. |
| `uncollectible` / permanently failed | No new grant; send the financial and entitlement exception to Finance/Support. |
| `past_due` or provider-specific retry state | Keep the projection accurate, do not duplicate a grant on each retry, and follow the documented grace/suspension policy. |

Never grant on an invoice-created event or a browser success page. Never mark an invoice paid from an application request. A payment retry that eventually succeeds must use the original invoice/business key and must not mint a second period.

### 4.8 Deferred revenue and revenue-recognition questions

The application ledger is a service-entitlement subledger, not a GL. Finance must approve the policy under the applicable GAAP/IFRS and tax jurisdiction before production billing. The following questions must be answered, versioned, dated, and approved:

- Do included and top-up credits create a material right or other performance obligation, and are they distinct from access to the subscription service?
- Are credits refundable, transferable, expirable, or subject to breakage? What evidence supports any breakage estimate?
- Is a fixed subscription fee allocated between platform access and credits? What standalone selling price or allocation method is used?
- Is revenue recognized as service is delivered/credits consumed, over the subscription period, or under another approved method? How are unused credits at period end treated?
- How are upgrades, downgrades, trials, cancellations, prorations, failed payments, refunds, credit notes, chargebacks, taxes, discounts, and goodwill credits treated?
- What is the approved currency/FX policy, materiality threshold, close cutoff, retention period, and late-event treatment?
- How are model-provider costs, committed minimums, and provider usage corrections classified as COGS or operating expense?

Subject to that approved policy, the application should export enough detail for entries such as:

```text
Provider collection:       Dr cash/AR; Cr contract liability or other approved account.
Service delivered:         Dr contract liability; Cr recognized revenue.
Refund/credit note:        Provider reverses cash/AR; Finance reverses the approved liability/revenue treatment.
Chargeback:                Provider debits settlement; Finance records the approved loss/receivable/contra-revenue treatment.
```

The product database must not post these entries by assumption. It should provide paid amount, credit grants, consumption, expiry/revocation, refunds, chargebacks, and ending unconsumed entitlement by invoice, workspace, currency, and period.

### 4.9 Reconciliation

Reconciliation is a three-way tie-out:

1. **Provider-to-application money mirror:** provider invoices, payments, refunds, disputes, subscriptions, and provider exports agree to the application's accepted events by ID, status, amount, currency, and period.
2. **Application money-to-credit entitlement:** each paid line item has the expected plan/top-up mapping, one grant, correct bucket, and correct billing period; each refund/dispute has the required revocation or exception.
3. **Application usage-to-execution:** run records, provider usage/request IDs, consume events, release events, and current balances satisfy the ledger invariants.

**Daily operational checks**

- Event inbox count, age, failures, quarantines, signature failures, duplicate rate, and unprocessed provider events.
- Paid invoices and successful top-ups by provider ID, currency, and amount versus financial mirror entries and credit grants.
- Refunds and chargebacks versus application adjustments and outstanding cases.
- Credit balances and reservations: no negative available balance, no duplicate grant, no terminal run with an active hold, and no stale `usage_pending` item without an owner.
- Provider model usage/usage export versus application token/credit calculations, with documented rounding and rate-card differences.

**Monthly or period-end checks**

- Provider invoice/payment/refund/dispute totals, fees, and settlement/payout reports tie to the GL/ERP and bank reconciliation owned by Finance.
- Ending included/top-up credits, consumed credits, expired/revoked credits, active reservations, and unallocated corrections tie to the application subledger.
- All exceptions have an owner, reason, due date, resolution, and approval. A report that is merely “close enough” is not a reconciliation.

### 4.10 Duplicate events and retries

- Persist and uniquely constrain provider event IDs, application idempotency keys, run IDs, reservation IDs, invoice-period grant keys, and refund/dispute IDs.
- An idempotency key is scoped to operation, workspace, authenticated actor, and request parameters. Reuse with different parameters is an error/quarantine, not a new operation.
- A retried client request returns the original durable result where safe. It must not create a second checkout, top-up, reservation, consume, release, refund request, or plan change.
- Store a payload hash. The same provider event ID with a different payload is a security/data-integrity exception.
- Do not use timestamps or descriptions as duplicate keys. Do not “deduplicate” by deleting one row; retain the duplicate evidence and mark its processing result.

### 4.11 Period close

Finance defines the close calendar, reporting timezone, cutoff, materiality, and late-event policy. The operational close checklist is:

1. Freeze the period for ordinary writes after the cutoff; allow only controlled, append-only corrections.
2. Capture provider invoice, payment, refund, dispute, fee, payout, and subscription exports plus the application event/credit-ledger snapshot. Record export IDs, timestamps, and hashes.
3. Drain or explicitly approve the webhook inbox backlog. Resolve or carry forward all material exceptions, including stale reservations and `usage_pending` runs.
4. Run the three-way reconciliation and investigate all unmatched IDs, amount/currency differences, duplicate events, and late events.
5. Produce the GL/ERP support schedule for paid, deferred/unearned, recognized, refunded, charged-back, expired/revoked, and unallocated amounts under the approved revenue policy.
6. Obtain preparer and reviewer sign-off. Record the close version and lock marker; never overwrite a closed event or snapshot.
7. Post a late event in the next open period with a link to the original period and a reversal/correction explanation, unless Finance's approved policy requires a restatement.

### 4.12 Audit evidence and access

Production evidence must be append-only or retained in an access-controlled immutable store according to the legal/tax retention policy. Evidence should include:

- versioned price-book and revenue-policy approvals;
- provider customer/subscription/invoice/payment/refund/dispute IDs and snapshots;
- raw webhook reference, payload hash, signature verification result, receipt/processing times, and retry/quarantine history;
- every credit grant, reservation, consume, release, expiry, revocation, and adjustment with run/invoice/provider references;
- provider usage/request IDs, model/rate-card version, calculation, and any correction;
- reconciliation reports, provider exports, GL/ERP tie-outs, unmatched-item reports, exception resolutions, and close sign-offs;
- actor, role, timestamp, reason, approval, correlation ID, and before/after references for manual actions.

Separate duties: a support user may request a refund or adjustment, but cannot approve and silently post it; Finance reviews financial adjustments; Engineering owns webhook/ledger processing; production administrators cannot erase events. Redact payment credentials and unnecessary personal data from logs and exports. The demo's mutable JSON file, sample activity list, browser cache/localStorage, and UI screenshots are not audit evidence.

## 5. Minimum production acceptance gates

No live checkout or paid-credit promise should be enabled until all of the following exist and are tested in provider test mode:

- authenticated, tenant-scoped durable storage with unique constraints and append-only ledger/event tables;
- one approved server-side price book mapped to provider IDs;
- verified webhook ingress with durable inbox, replay/idempotency tests, out-of-order handling, and quarantine/alerting;
- atomic reserve/consume/release behavior and recovery tests for timeout, restart, duplicate request, and provider-usage ambiguity;
- invoice, refund, and chargeback projections with approved credit-revocation policy;
- daily reconciliation and monthly close reports with Finance sign-off;
- an approved deferred-revenue/revenue-recognition policy and GL export;
- role-based access, manual-adjustment approvals, evidence retention, monitoring, backups, and restore/replay procedures.

Until these gates are met, the correct label for the current implementation is **local sandbox/demo ledger concept only**. It may illustrate usage and reservation UX, but it must not be used to assert that a customer paid, that revenue was recognized, that credits are owed, or that an audit trail exists.
