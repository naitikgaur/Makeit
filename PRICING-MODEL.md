# Business Automation OS — Pricing and Unit-Economics Model

**Status:** planning model for the MakeEase MVP

**Currency:** USD; monthly prices unless stated otherwise

**Important:** Every dollar value, usage limit, conversion assumption, cost rate, churn rate, and support estimate in this document is a planning assumption. None should be presented as a verified market fact, customer willingness-to-pay result, or vendor quote. Replace the assumptions with observed product telemetry, negotiated provider rates, payment-processor fees, and actual sales data before launch.

## 1. Commercial objective

The proposed Business Automation OS combines workflow execution, integrations, approvals, a company knowledge layer, and model-powered actions. The pricing model is designed to:

1. Make the subscription understandable before a customer runs a workflow.
2. Include enough usage for a small business to reach value without requiring a calculator.
3. Preserve an **80% direct gross-margin target** at the stated monthly included limits.
4. Meter expensive model and agent behavior separately from ordinary workflow runs.
5. Give workspace owners an explicit, enforceable hard spend cap.
6. Support BYOK (bring your own model-provider key) without pretending that the platform controls a customer's third-party invoice.

The 80% target is a management target, not a guarantee. Gross margin below includes modeled usage infrastructure, tenant infrastructure, per-user service cost, and expected support. It excludes product engineering, general and administrative expense, sales commissions, marketing, taxes, discounts, chargebacks, and financing costs unless a section says otherwise.

## 2. Metering definitions

These definitions are deliberately operational so product, billing, and engineering can implement the same ledger.

| Meter | Proposed definition | Billing treatment |
|---|---|---|
| **Included user** | One active named user who can sign in or be assigned work in a workspace during the billing month. A deactivated user does not consume a new seat after deactivation. | Plan includes the stated number of users. Additional users are proposed at **$20/user/month**; this price is an assumption and is not included in the tables below. |
| **Standard run** | One triggered workflow execution, including queue, worker, normal connector, logging, and approval-state overhead, excluding model-provider charges. A retry is a new run only when it is intentionally re-queued as a new execution. | Counts once per workflow execution. Included and then metered at the standard-run overage rate. |
| **AI action** | One non-heavy model decision, extraction, classification, generation, or tool-selection action. Planning envelope: up to roughly 8,000 input tokens and 2,000 output tokens, using an ordinary model route. | Counts once per action. A heavy action is not also counted as an AI action. |
| **Heavy action** | One action whose expected cost or operational risk is materially higher: long-context reasoning, multimodal/OCR processing, large retrieval context, browser/computer-use step, multi-step agent step, or another route explicitly classified as heavy. | Counts once per heavy action. It is not double-counted as an AI action. |
| **BYOK action** | An AI or heavy action routed through a customer-supplied provider key. The platform still meters and protects the action; the customer receives the model-provider invoice directly. | Included units remain included. BYOK overage uses lower platform orchestration rates shown below. |
| **Overage** | Usage above the plan's monthly included amount for a specific meter. | Billed only when the workspace owner has enabled an overage budget. No rollover of unused units. |

An ordinary workflow can therefore produce one standard run plus zero or more AI/heavy actions. The standard run and its actions are separate ledger events because they drive different costs.

## 3. Base cost assumptions

The following rates are the initial blended assumptions used in every calculation in this document.

### 3.1 Usage and account costs

| Cost component | Base assumption | What it represents |
|---|---:|---|
| Standard run direct cost | **$0.0015/run** | Queue, worker time, normal connector overhead, logging, and a small retry allowance. |
| Non-BYOK AI action direct cost | **$0.004/action** | Blended model/API cost for the assumed ordinary-model mix, plus action-specific orchestration. |
| Non-BYOK heavy action direct cost | **$0.025/action** | Blended long-context, multimodal, browser/computer-use, or multi-step-agent cost. |
| BYOK AI orchestration cost | **$0.0015/action** | Platform scheduling, authorization, telemetry, and result handling; excludes the customer's provider invoice. |
| BYOK heavy orchestration cost | **$0.008/action** | Platform cost for a heavy BYOK action; excludes the customer's provider invoice. |
| Tenant infrastructure | **$5 / $10 / $25 / $40 per month** | Shared account, database, queue, monitoring, and baseline storage allocation by plan. |
| Active-user direct cost | **$0.75/user/month** | Identity, permissions, notifications, and incremental storage allocation. |
| Support loaded rate | **$60/hour** | Planning rate for support/customer-success time, including payroll burden. |

The model treats the ordinary and heavy action costs as **blended estimates**, not permanent provider prices. When actual token-level provider invoices are available, the exact-cost formula in Section 12 should replace the blended estimate for settled billing and margin reporting.

### 3.2 Payment processing assumption

For contribution-margin and CAC payback calculations only, assume payment processing of **2.9% of the invoice plus $0.30 per monthly transaction**. This is an assumption, not a quoted processor rate. Payment processing is shown outside direct gross margin because it is a commercial transaction expense rather than workflow delivery COGS.

## 4. Proposed platform plans

The following are proposed list prices and monthly included allowances. Prices are intentionally rounded for customer comprehension; annual discounts, taxes, and negotiated enterprise terms are not modeled.

| Plan | List price / month | Included users | Standard runs / month | AI actions / month | Heavy actions / month | Recommended overage budget cap |
|---|---:|---:|---:|---:|---:|---:|
| **Starter** | **$149** | 3 | 1,000 | 1,500 | 50 | $50 |
| **Growth** | **$499** | 10 | 5,000 | 8,000 | 200 | $250 |
| **Business** | **$1,499** | 25 | 20,000 | 25,000 | 750 | $1,000 |
| **Enterprise** | **$3,499 starting price** | 50 | 50,000 | 75,000 | 2,000 | $2,500 |

The overage-budget column is the suggested maximum additional monthly invoice amount, not an automatic entitlement. The safe default for a new workspace should be **$0 authorized overage** until an owner explicitly enables a budget. Once enabled, the recommended cap gives a bounded maximum bill while preserving a path for workflows to continue beyond included units.

### 4.1 Overage rates

Overage begins only after the applicable included meter is exhausted. There is no cross-meter conversion and no rollover.

| Meter | Non-BYOK overage price | Base direct cost assumption | Illustrative unit gross margin |
|---|---:|---:|---:|
| Standard run | **$0.020/run** | $0.0015 | **92.5%** |
| AI action | **$0.030/action** | $0.0040 | **86.7%** |
| Heavy action | **$0.150/action** | $0.0250 | **83.3%** |

The rates are meant to preserve margin if usage is materially above the included amount. They also leave room for provider-rate variation, but they are not a promise that a specific provider route will remain profitable under every model mix.

### 4.2 BYOK overage rates

BYOK does not reduce the platform subscription. It changes the platform's variable cost because the customer pays the model provider directly.

| Meter | BYOK platform overage price | Platform orchestration cost assumption | Illustrative unit gross margin |
|---|---:|---:|---:|
| Standard run | **$0.020/run** | $0.0015 | **92.5%** |
| BYOK AI action | **$0.010/action** | $0.0015 | **85.0%** |
| BYOK heavy action | **$0.050/action** | $0.0080 | **84.0%** |

The customer remains responsible for provider charges, rate limits, quotas, and provider-side availability. The platform can enforce its own action count and internal cost cap, but it cannot promise a hard cap on an external provider invoice unless that provider account exposes a budget/rate-limit control that the platform can verify and enforce.

## 5. Gross margin at full included usage

This is a conservative test: it assumes a customer consumes **100% of every included meter every month**. It does not assume that actual customers will do so. The target is approximately 80% direct gross margin at that usage level.

### 5.1 Per-plan calculation

| Plan | Usage cost at included limit | Tenant infrastructure | Included-user cost | Expected support cost | Total modeled direct COGS | Gross profit at list price | Direct gross margin |
|---|---:|---:|---:|---:|---:|---:|---:|
| Starter | $8.75 | $5.00 | $2.25 | $12.00 | **$28.00** | $121.00 | **81.2%** |
| Growth | $44.50 | $10.00 | $7.50 | $35.00 | **$97.00** | $402.00 | **80.6%** |
| Business | $148.75 | $25.00 | $18.75 | $90.00 | **$282.50** | $1,216.50 | **81.2%** |
| Enterprise | $425.00 | $40.00 | $37.50 | $200.00 | **$702.50** | $2,796.50 | **79.9%** |

The usage-cost calculation is:

```text
usage cost = (standard runs × $0.0015)
           + (AI actions × $0.004)
           + (heavy actions × $0.025)
```

For example, the Growth usage cost is:

```text
(5,000 × $0.0015) + (8,000 × $0.004) + (200 × $0.025)
= $7.50 + $32.00 + $5.00
= $44.50
```

Support assumptions used in the table are approximately 0.20, 0.58, 1.50, and 3.33 hours per month for Starter through Enterprise respectively, at the $60 loaded hourly rate. These are expected monthly account-level support allocations, not a claim about actual ticket volume.

## 6. Worked billing example

Assume a Growth customer has, during one month:

- 5,500 standard runs: 500 above the included 5,000;
- 9,000 AI actions: 1,000 above the included 8,000; and
- 260 heavy actions: 60 above the included 200.

The incremental invoice is:

```text
(500 × $0.020) + (1,000 × $0.030) + (60 × $0.150)
= $10.00 + $30.00 + $9.00
= $49.00
```

The invoice is therefore **$548** before tax ($499 subscription + $49 overage), subject to the workspace's authorized overage budget. The modeled incremental direct usage cost is:

```text
(500 × $0.0015) + (1,000 × $0.004) + (60 × $0.025)
= $0.75 + $4.00 + $1.50
= $6.25
```

The full-month COGS estimate for this customer is the plan's fixed/direct allocation plus usage for all 5,500, 9,000, and 260 units, not only the overage units.

## 7. Hard spend caps and safe execution behavior

Two separate controls are required: a customer-visible invoice cap and an internal provider-cost circuit breaker.

### 7.1 Customer-visible invoice cap

```text
monthly invoice cap = plan price + authorized overage budget
```

| Plan | Subscription | Recommended overage budget | Recommended maximum monthly invoice before tax |
|---|---:|---:|---:|
| Starter | $149 | $50 | **$199** |
| Growth | $499 | $250 | **$749** |
| Business | $1,499 | $1,000 | **$2,499** |
| Enterprise | $3,499 | $2,500 | **$5,999** |

Recommended behavior:

1. Default `authorized_overage_budget_usd` to `0` for a new workspace.
2. Require an owner/admin action to enable or raise it.
3. Warn at 80% of the budget and again when the projected next action would cross it.
4. Atomically reserve estimated usage before starting a billable action; do not rely on a post-run check that can race across workers.
5. At 100%, stop accepting new billable actions and new overage runs. Keep read-only views and audit export available.
6. Checkpoint long-running workflows. Do not start a new heavy step after the cap is reached.
7. Resume only after the owner raises the budget or the next billing period begins.

Taxes, refunds, credits, and payment-processor adjustments should be represented as separate ledger entries. They should not silently increase the hard usage cap.

### 7.2 Internal provider-cost circuit breaker

The platform should also maintain an internal cost budget so a provider outage, retry loop, or unexpectedly expensive model route cannot create an unbounded bill.

Initial default: reserve **150% of modeled direct COGS at full included usage** as the workspace's internal monthly cost budget. This is a starting control and should be revisited after telemetry.

| Plan | Full-included modeled direct COGS | Initial internal cost-budget default (1.5×) |
|---|---:|---:|
| Starter | $28.00 | **$42.00** |
| Growth | $97.00 | **$145.50** |
| Business | $282.50 | **$423.75** |
| Enterprise | $702.50 | **$1,053.75** |

This internal budget is not a customer charge. It is a service-protection threshold. When it is projected to be exceeded, the system should first block or require approval for heavy actions, then ordinary AI actions, and finally new standard runs. The UI should state the reason and the amount required to resume; it must not silently discard a customer's workflow.

For a stricter margin floor, an optional policy check is:

```text
projected direct cost / projected billable revenue <= (1 - minimum gross margin floor)
```

An initial `minimum gross margin floor` of **70%** is a planning assumption. It is a warning/hold policy, not a contractual plan guarantee. The billing service should store the policy version used for every hold decision.

## 8. Customer acquisition and support assumptions

### 8.1 Fully loaded CAC assumptions

The following is a planning CAC, including marketing, sales, and initial onboarding/implementation. It is not a measured acquisition result.

| Plan | Assumed marketing/sales CAC | Assumed onboarding cost | Fully loaded CAC used below |
|---|---:|---:|---:|
| Starter | $350 | $50 | **$400** |
| Growth | $1,200 | $150 | **$1,350** |
| Business | $3,500 | $500 | **$4,000** |
| Enterprise | $10,000 | $1,500 | **$11,500** |

Support is modeled as direct account cost at $60/hour, with monthly allocations of $12, $35, $90, and $200. Fixed support leadership and non-account-specific tooling belong in fixed operating expense, not both fixed operating expense and these per-account COGS allocations.

### 8.2 Contribution and CAC payback

Monthly contribution below is after modeled direct COGS and assumed payment processing, but before CAC and fixed operating expense.

```text
payment fee = (list price × 2.9%) + $0.30
monthly contribution = list price - payment fee - modeled direct COGS
CAC payback months = fully loaded CAC / monthly contribution
```

| Plan | Monthly contribution at full included usage | Fully loaded CAC | CAC payback |
|---|---:|---:|---:|
| Starter | **$116.38** | $400 | **3.4 months** |
| Growth | **$387.23** | $1,350 | **3.5 months** |
| Business | **$1,172.73** | $4,000 | **3.4 months** |
| Enterprise | **$2,694.73** | $11,500 | **4.3 months** |

For a simple, no-expansion lifetime illustration only, assume monthly logo churn of 3.0% / 2.0% / 1.2% / 0.8% for Starter through Enterprise. Then:

```text
illustrative contribution LTV = monthly contribution / monthly logo churn
```

Those LTV values are highly sensitive to churn and are not a forecast. They exclude expansion, contraction, discounts, bad debt, taxes, and future pricing changes. They should not be used as proof of product-market fit.

## 9. Weighted base case

To make break-even calculations concrete, use this illustrative logo mix:

| Plan | Assumed share of paid logos |
|---|---:|
| Starter | 45% |
| Growth | 35% |
| Business | 17% |
| Enterprise | 3% |

Under that mix:

| Metric | Weighted assumption |
|---|---:|
| Average monthly revenue / logo | **$601.50** |
| Average modeled direct COGS / logo | **$115.65** |
| Average payment processing / logo | **$17.74** |
| Average monthly contribution / logo | **$468.11** |
| Average fully loaded CAC / new logo | **$1,677.50** |
| Weighted CAC payback | **3.6 months** |

The weighted average assumes each plan is at its included usage limit. If actual usage is lower, contribution improves; if model routing, retries, support, or connector charges are higher, it declines.

## 10. Break-even scenarios

These scenarios use the weighted base case and are intended to size the required customer count, not to forecast hiring or revenue.

### 10.1 Formula

```text
steady-state break-even logos
  = fixed monthly operating expense / weighted monthly contribution per logo

break-even MRR
  = break-even logos × weighted average monthly revenue per logo
```

Fixed operating expense includes a hypothetical product/engineering team, baseline operations, G&A, and non-variable marketing. It excludes direct COGS, payment processing, and the variable CAC required for new logos.

| Scenario | Assumed fixed operating expense / month | Break-even paid logos (rounded up) | Approximate break-even MRR |
|---|---:|---:|---:|
| Lean post-MVP team | $120,000 | **257** | **$154,586** |
| Growth team | $250,000 | **534** | **$321,201** |
| Scale team | $500,000 | **1,068** | **$642,402** |

If the company is adding 50 new logos per month, the weighted acquisition spend adds approximately:

```text
50 × $1,677.50 = $83,875 per month
```

That spend must be added to the monthly contribution requirement during the growth phase. It should not be confused with steady-state break-even after the customer base has stabilized.

### 10.2 Plan-concentration view

If the lean $120,000/month fixed-cost scenario were supplied by only one plan, the approximate requirements would be:

| All-customer plan assumption | Logos required (rounded up) | Approximate MRR |
|---|---:|---:|
| Starter only | 1,032 | $153,768 |
| Growth only | 310 | $154,690 |
| Business only | 103 | $154,397 |
| Enterprise only | 45 | $157,455 |

The similar MRR values are a consequence of dividing the same fixed cost by each plan's modeled contribution; they are not a claim that the plans will have the same sales difficulty or retention.

## 11. Sensitivity to model/API costs

The largest uncertain variable is the blended cost of non-BYOK AI and heavy actions. The table below applies a multiplier to the **AI and heavy provider-cost components only**. Standard-run infrastructure, tenant cost, user cost, and support stay at their base assumptions.

| Plan | 0.5× AI/heavy cost | 1.0× base cost | 2.0× AI/heavy cost | 3.0× AI/heavy cost |
|---|---:|---:|---:|---:|
| Starter gross margin | **83.6%** | **81.2%** | **76.3%** | **71.5%** |
| Growth gross margin | **84.3%** | **80.6%** | **73.1%** | **65.7%** |
| Business gross margin | **85.1%** | **81.2%** | **73.2%** | **65.3%** |
| Enterprise gross margin | **84.9%** | **79.9%** | **69.9%** | **59.9%** |

The base case is deliberately close to the 80% target at full included usage. At 2× model/API cost, the target is missed for every plan except that Starter remains the least exposed; at 3×, the model needs a pricing or routing response.

For the weighted logo mix, the base AI/heavy component is approximately **$46.90 per logo per month**. The resulting contribution and CAC payback sensitivity is:

| AI/heavy cost multiplier | Weighted monthly contribution | Weighted CAC payback |
|---|---:|---:|
| 0.5× | **$491.56** | **3.4 months** |
| 1.0× | **$468.11** | **3.6 months** |
| 2.0× | **$421.21** | **4.0 months** |
| 3.0× | **$374.31** | **4.5 months** |

Recommended responses if observed blended cost exceeds the base assumption:

1. Route simple tasks to a cheaper model and reserve heavy models for tasks that require them.
2. Add token/context limits and estimate cost before starting an action.
3. Give workspace owners a choice of BYOK for model-heavy workloads.
4. Reclassify expensive actions as heavy rather than allowing them to consume cheap AI units.
5. Revisit the heavy-action overage rate or included heavy-action quantity before allowing a sustained gross margin below 75%.

## 12. Execution-cost formula for engineering

The billing and execution services should use one immutable usage event per action and derive both customer charges and internal cost from that event. The following is the implementation target.

### 12.1 Blended pre-run estimate

Use this estimate for reservations, hard-cap checks, and a safe pre-run decision:

```text
estimated_direct_cost_usd =
    (standard_runs × 0.0015)
  + (non_byok_ai_actions × 0.0040)
  + (non_byok_heavy_actions × 0.0250)
  + (byok_ai_actions × 0.0015)
  + (byok_heavy_actions × 0.0080)
  + (storage_gb_months × storage_rate_usd_per_gb_month)
  + (egress_gb × egress_rate_usd_per_gb)
  + (connector_api_calls × connector_rate_usd)
  + (retries × retry_unit_cost_usd)
```

For the initial model, storage, egress, connector, and retry rates may be zero only if the service has confirmed they are immaterial. They should remain explicit fields so a future provider or connector fee is not hidden inside a generic margin number.

`non_byok_*` and `byok_*` are mutually exclusive. A heavy action is counted in the heavy field only; it is not also added to the AI-action field.

### 12.2 Exact post-run provider cost

When token and provider invoice data are available, replace the blended model component with actual cost:

```text
actual_model_cost_usd =
    Σ model_calls [
        (input_tokens / 1,000,000 × provider_input_rate_usd_per_million)
      + (cached_input_tokens / 1,000,000 × provider_cached_input_rate_usd_per_million)
      + (output_tokens / 1,000,000 × provider_output_rate_usd_per_million)
      + provider_tool_or_search_fee_usd
    ]
```

Then use:

```text
actual_direct_cost_usd =
    standard_run_infra_cost_usd
  + actual_model_cost_usd
  + heavy_action_orchestration_cost_usd
  + storage_cost_usd
  + egress_cost_usd
  + connector_cost_usd
  + retry_cost_usd
```

Do not add both the blended AI/heavy rate and the exact model cost for the same call. The blended rate is for pre-run estimation; exact provider cost is for settlement and reporting.

### 12.3 Customer overage formula

```text
billable_overage_usd =
    max(0, standard_runs - included_standard_runs) × standard_overage_rate
  + max(0, ai_actions - included_ai_actions) × ai_overage_rate
  + max(0, heavy_actions - included_heavy_actions) × heavy_overage_rate
```

For BYOK usage, use the BYOK AI/heavy overage rate for the relevant action. The invoice must then apply the hard cap:

```text
allowed_overage_usd = min(billable_overage_usd, authorized_overage_budget_usd)
monthly_invoice_before_tax = plan_price + allowed_overage_usd + seat_addons + other_approved_addons
```

If `billable_overage_usd` would exceed `authorized_overage_budget_usd`, reserve no additional overage action unless an owner raises the budget. The ledger should retain the attempted amount and the hold reason for auditability.

### 12.4 Reservation and settlement requirements

The execution service should:

- reserve estimated cost and estimated overage atomically before dispatch;
- attach a workspace, plan, billing-period, meter-type, and idempotency key to every event;
- settle against actual usage after completion;
- release unused reservation and record the variance;
- charge a failed action only when the provider/connector actually incurred cost, according to the retry policy;
- keep provider/model route, token counts, and pricing-table version for later margin analysis; and
- prevent a retry from bypassing the same monthly cap check.

## 13. Metrics and review triggers

The following should be measured weekly after launch and compared with this model:

- usage distribution by plan and by meter (p50, p90, p99);
- actual direct cost per standard run, AI action, and heavy action;
- retry rate and cost caused by retries;
- support minutes per active workspace;
- BYOK share and BYOK provider-cost incidents;
- gross margin by plan and by model route;
- overage opt-in rate and percentage of workspaces hitting caps;
- CAC by acquisition channel and plan;
- logo churn, expansion, contraction, and payment failure rate.

Suggested review triggers (also assumptions):

- review pricing if any plan is below **75% direct gross margin for two consecutive months**;
- review heavy-action classification if p95 heavy cost is more than **1.5×** the assumed $0.025;
- review included limits if more than **20%** of active workspaces hit a cap;
- review support staffing if actual support exceeds the modeled allocation by **50%**; and
- review CAC or channel spend if payback exceeds **9 months**.

## 14. Explicit exclusions and open validation work

This model does not yet include:

- annual prepayment discounts or negotiated enterprise discounts;
- taxes, refunds, chargebacks, bad debt, or currency conversion;
- reseller or sales commissions;
- data-retention/legal/security review costs by enterprise customer;
- guaranteed uptime credits;
- customer-specific implementation beyond the assumed onboarding amount;
- model provider minimums, reserved capacity, or sudden rate-card changes;
- connector vendors that charge per API call;
- expansion revenue, seat growth, or contraction; or
- the cost of making a workflow safe, reversible, and human-approved in edge cases.

Before treating the numbers as a launch plan, validate the first 30–60 days of real usage and replace each assumption with an observed value or a negotiated contract rate. The most consequential unknowns are heavy-action frequency, token distribution, retry cost, support time, CAC by channel, and whether the proposed hard caps allow customers to complete valuable workflows without surprise blocks.
