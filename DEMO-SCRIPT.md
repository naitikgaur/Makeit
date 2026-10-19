# MakeEase v1 demo script

**Length:** 7–10 minutes  
**Audience:** founder, COO, support lead, or operations owner at a small B2B SaaS company  
**Demo mode:** local sandbox only; use synthetic or redacted text  
**Primary outcome:** show one request becoming a reviewable internal draft with visible context, budget, decision, and no external side effect

## Before the call

- Run `npm start` from `makease-mvp` and open `http://127.0.0.1:3000/`.
- Confirm the top bar says **Local preview** and the page says no external action runs.
- Use the seeded workspace or reset it with `window.MakeEase.reset()`.
- Have one short synthetic policy ready: “Refund requests require human confirmation; never promise eligibility until the reviewer checks the account.”
- Have one synthetic support request ready: “A customer reports a duplicate invoice and asks whether it can be refunded.”
- Do not use a real customer thread, API key, OAuth account, payment detail, or personal data.

## Talk track

### 0:00–1:00 — Frame the problem

Say:

> “MakeEase is for small B2B SaaS teams that need faster support drafts but do not want an opaque bot to have the final say. The v1 job is narrow: prepare a policy-grounded support result, put it in a review queue, and leave the customer-facing decision with a human.”

Set the boundary before showing the UI:

> “This is a local sandbox. Nothing here sends email, calls Gmail, charges a card, changes code, or proves customer savings.”

### 1:00–2:00 — Show the starting workflow

1. Open **Overview** and point to active workflows, awaiting review, recorded runs, and available credits.
2. Open **Workflows** and select **Customer support triage**.
3. Point out the visible sequence: manual input → workspace context → local simulation → human review.

Say:

> “The product starts from a bounded job rather than an unconstrained agent. The review policy and run limit are visible before we test it.”

### 2:00–3:00 — Add approved context

1. Open **Knowledge → Add reference**.
2. Add the synthetic refund/escalation policy.
3. Return to the workflow.

Say:

> “In the intended live product, this is where the team approves the policy and product context that can ground the draft. In this sandbox it is local reference text only; it is not a connected knowledge source.”

### 3:00–5:00 — Run one test

1. Paste the synthetic duplicate-invoice request.
2. Point to the maximum demo-credit label before pressing **Run test**.
3. Run the test and inspect the output.
4. Call out the simulation label and the line that says no provider or external action was used.

Say:

> “The result is intentionally modest and explicit. It records what was submitted, shows a deterministic local output, and does not pretend to have verified a refund, contacted a customer, or used a model provider.”

### 5:00–6:30 — Review the result

1. Open **Review queue**.
2. Show the original request, prepared output, credits held, and the approval callout.
3. Choose **Approve internally** (or reject if demonstrating the other path).

Say:

> “Approval here means the internal draft is accepted for this sandbox record. It is not permission for a hidden send. The product’s trust model is to make the decision, evidence, and boundary explicit.”

### 6:30–7:30 — Show evidence and usage

1. Open **Run history** and inspect the run trace.
2. Open **Insights** and explain that the numbers are local snapshot metrics.
3. Open **Plans & usage** and expand the credit explanation.
4. Optionally export the workspace JSON.

Say:

> “The useful object is the reviewable run: input, output, status, review decision, and usage in one place. These numbers are not billing or ROI evidence in this build.”

### 7:30–9:00 — Explain the live launch boundary

Say:

> “The first paid launch is not this local adapter. It requires one real Gmail inbox or label, approved policies, authenticated tenancy, durable runs, a managed model route, usage and billing controls, and an action-scoped approval that can save a Gmail draft without automatically sending it.”

Explain the target package: paid guided pilot first; then MakeEase Support at the documented hypothesis of $149/workspace/month with 500 support threads prepared for review, a hard cap, and no automatic send.

### 9:00–10:00 — Close with the validation question

Ask:

1. “Which repeatable support categories would you trust a reviewer-first draft to handle?”
2. “Which categories must always escalate?”
3. “What policy or product context would the reviewer need to see?”
4. “Would one inbox and a bounded monthly allowance replace enough repetitive work to justify a paid pilot?”

Do not ask whether the demo “saved hours.” Ask for a measured baseline and permission to compare reviewed outputs in the pilot.

## Do not demonstrate

- Real sign-in, OAuth, API keys, customer exports, payment details, or live provider calls.
- A seeded “connected” record as proof of connection.
- An approval title that implies a send/refund/deployment completed.
- A plan switch or top-up as a purchase.
- The local mock output as AI quality, grounding, or customer resolution evidence.
- Broad template breadth as the launch product. Keep the support wedge central.
