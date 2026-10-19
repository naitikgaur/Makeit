# MakeEase plain-language product review

> **Historical review note:** This document captures an earlier pre-integration state. The current adapter exposes `/api/bootstrap` and bounded workflow/run/approval/knowledge/usage/audit/export routes described in `README.md`; production auth, OAuth, billing, and external effects remain intentionally unavailable.

**Reviewer lens:** a first-time, nontechnical owner of a small business or one-person startup.

**Overall verdict:** MakeEase has a promising and unusually reassuring idea: turn repetitive work into a bounded AI draft, show what happened, and let a person review it before it is treated as complete. The interface has a calm, professional structure and several good safety signals. However, the value is hidden behind technical language, the meaning of an approval is not fully clear, and the documented first-use path currently leads to a connection error before the dashboard appears.

## What is clear

- The main working path is visible once the app is loaded: choose a workflow template, configure it, enter a test request, inspect the output and run trace, then review the result.
- The workflow canvas is a useful visual explanation. `Trigger → Context → Model → Review → Result` makes the basic idea easier to grasp than the phrase “AI operations dashboard.”
- The product makes a real effort to be honest. The `Sandbox`/`Live workspace` badge, “No external side effect is implied by an approval,” and billing messages that say a sandbox action does not charge a card are strong trust signals.
- The dashboard gives a clear sense of what needs attention: available credits, reserved credits, active workflows, pending reviews, next steps, and recent activity.
- The plan amounts are easy to spot: Starter is $25 for 15,000 credits per month, Growth is $50 for 40,000, Business is $100 for 90,000, and Enterprise is custom. The separate 10,000-credit/$12 top-up is also easy to find.
- Empty states generally tell me what I can do next, such as creating a workflow, adding knowledge, or opening the review inbox.

## What is confusing

### 1. The launch instructions and the current product disagree

This is the most serious first-time experience problem.

The README tells a nontechnical person to serve the folder with `npx --yes serve .`, says opening `index.html` works, and describes local browser state. The current UI in `ui/main.js` starts by requesting `/api/bootstrap`, and `ui/api.js` expects authentication, workspace, workflow, approval, knowledge, billing, and run endpoints. The folder's current `server.js` does not provide `/api/bootstrap` or those current routes. I checked the local server response: `/api/bootstrap` returns 404.

In practical terms, a person following the README does not reach the product. They see a connection error and a `Retry` button. They cannot evaluate the templates, sandbox, credits, or approvals. The README and runtime need one agreed launch story before copy or visual polish can do its job.

There are other signs that the README describes an older product:

- It says “mock integrations” have buttons, while the current UI says it does not expose fake connect actions.
- It promises CSV export, while the current UI offers JSON export.
- It says `localStorage` keeps demo changes and mentions `window.MakeEase.reset()`, but the current UI is API-driven and the reviewed UI code does not use those mechanisms.
- It describes “company brain / knowledge-source” and “workspace safety settings,” while the current navigation calls these `Knowledge` and `Settings` without explaining the relationship.

### 2. The value proposition is polished but too abstract

“Make work easier to review,” “Observable operations,” “bounded workflows,” “keep context close,” “internal completion,” and “scoped workspace” sound credible to a product or engineering team, but they do not immediately tell a small-business owner what will improve in daily life.

I can infer the benefit after reading several screens, but the first screen should answer three plain questions:

1. What work can MakeEase help with?
2. What happens when I use it?
3. What will it never do without my permission?

The templates provide good examples—customer support triage, lead follow-up, weekly business briefing, and engineering issue assistant—but those examples arrive after sign-in. Put one or two of them in the first-screen explanation.

### 3. “Approval” sounds like an external action, then is described as internal only

The review inbox contains names such as `Reply to priority customer`, `Send lead follow-up`, and `Create GitHub pull request`. Those titles make me think approving will send an email, contact a lead, or change GitHub. The page later says an approval only authorizes internal completion and does not send email, deploy code, or change an external system.

The safety policy is good, but the labels make it feel like the product is taking something away after I click in. Rename the items to match the current behavior, for example:

- `Review draft reply for priority customer`
- `Review proposed lead follow-up`
- `Review proposed GitHub change`

Then say directly: “Approve marks this internal draft as reviewed. In this version, it does not send a message or change another service.” If a future version will perform an external action, show that action and its exact consequence before the decision.

### 4. Credits are visible but not understandable yet

The dashboard shows `Used`, `Reserved`, `Available`, and `Included / top-up`. A technical user may understand this, but a first-time owner will ask:

- What is one credit?
- Does the model choice change the number of credits used?
- Why are credits reserved before a run?
- When do reserved credits become available again?
- Do unused monthly credits roll over?
- Do top-up credits expire?
- What happens if the budget is too small or the run fails?

“After current reservations” is a helpful hint, but it is not enough to make the numbers feel like money or a quota that I can safely plan around. The billing page also calls the plan terms “exact” while leaving these important rules unstated.

Add a small, plain-language explanation near the first credit total. For example:

> **How credits work:** each run has a maximum budget. MakeEase reserves that maximum while the run is in progress, then records the amount actually used. Your available balance is what remains after used and reserved credits.

Only add the last sentence if it matches the real accounting rules. The product should also publish the definition of a credit, rollover/expiry rules, failed-run behavior, and whether overages are blocked or billed.

### 5. Pricing feels precise, but not fully trustworthy yet

The exact dollar and credit amounts are a good start. The sandbox modal is also commendably explicit that it does not process a payment. Before I would pay, I would still want to see:

- that the displayed price is billed monthly;
- what happens to unused included and top-up credits;
- whether there is any overage or automatic top-up;
- what “Enterprise custom” includes at a high level;
- whether I can cancel or change plans and when the change takes effect;
- what I will see before a real charge is made.

The live button says `Open checkout`, which is safer than silently charging, but it should say what the checkout will confirm: for example, “Review monthly plan and payment details.” The sandbox label should be visible before a person opens a confirmation dialog, not only inside it.

### 6. The first workflow form asks for too much too soon

The create-workflow dialog asks for a name, description, template, model, credit budget, and review setting. `Model`, `credit budget`, and `review policy` are not beginner-friendly choices without defaults or examples. A model can also show `Provider not configured`, which sounds like a broken setup rather than a clear limitation.

For a first run, let me pick a template and describe the outcome. Preselect a safe available model and a suggested maximum budget, then put advanced settings behind “Adjust limits.” Explain the review checkbox as:

> **Show me the draft before it is marked complete**

Also distinguish `Save draft`, `Run test`, and `Activate`. The current combination of `Pause`, `Activate`, and `Execute` leaves me unsure which button is needed after creating a workflow.

## Does the value proposition make sense?

**Partly.** I understand the product as a safer way to use AI for routine business work: it uses supplied context, stays within a credit budget, shows its work, and waits for a human review. That is a credible value proposition for a small team that is nervous about automation.

The first screen does not yet make the outcome concrete enough. “Observable operations” is a category label, not a benefit. “Make work easier to review” describes the control mechanism, not the result I get. The product should lead with the result and then use reviewability as the reason to trust it.

Suggested first-screen copy:

> **Turn repetitive business work into drafts you can review.**
>
> MakeEase helps you prepare support replies, lead follow-ups, and weekly briefs using your own instructions and notes. Every test has a credit limit, shows its output, and waits for your approval. In the sandbox, nothing is emailed, posted, charged, or changed outside this workspace.

Suggested buttons:

- `Try the sandbox — no card needed`
- `Create an account`

Suggested small reassurance below the buttons:

> Start with a blank workspace. No real integrations or external actions are used in the sandbox.

## What a first-time user would expect next

1. **After following the README:** the app should open and offer a sandbox or account creation. Right now the UI instead fails its bootstrap request and offers only `Retry`.
2. **On the welcome screen:** I expect a simple explanation, a visible “no card/no external actions” statement, and a clear sandbox path.
3. **After entering the workspace:** I expect a short three-step checklist, not a list of infrastructure terms. The natural order is: choose a template, add optional business context, run a test, review the result.
4. **When creating a workflow:** I expect the app to suggest a usable default and explain what the maximum credit budget means.
5. **When running:** I expect to see a clear estimate or maximum cost before pressing `Execute`, and to know whether the test is simulation or real AI.
6. **When reviewing:** I expect to see the request, the draft output, the model, the credits used/reserved, and exactly what approving or rejecting changes.
7. **After approval:** I expect a plain-language confirmation such as “Saved as internally approved.” If no external action occurs, say that again briefly instead of leaving me wondering whether an email or update was sent.

## Concrete copy and flow changes

### Highest priority: make the product reachable

Choose one of these and make both the README and the UI match it:

- **Full-stack path:** document the actual server command, implement the `/api/bootstrap` and related routes used by the current UI, and state whether the user should start with sandbox or an account.
- **Static demo path:** restore a self-contained static demo and its local state behavior, and make the UI stop requesting unavailable API routes.

Do not tell a first-time user to run a static file server when the first screen requires a separate API service. Add a short “If you see a connection error” note with a real next step, not just `Retry`.

### Rewrite the README for the current experience

The README should state, in plain language:

- what MakeEase helps a person do;
- whether this folder is a static demo or a full-stack local app;
- the exact start command;
- how to enter the sandbox;
- what is simulated and what is real;
- the current export format (JSON or CSV);
- whether integrations can actually be connected;
- what credits and approvals mean;
- what is not implemented yet.

### Simplify the onboarding sequence

Use a visible checklist:

1. `Choose a workflow` — start with support triage, lead follow-up, or a weekly brief.
2. `Add your instructions` — optional policy or reference text.
3. `Run a test` — see the draft and the maximum credit budget first.
4. `Review and finish` — approve the internal draft or reject it.

Make integration setup optional until a workflow actually needs it. The current “Review integration setup” step can make the product seem blocked even though the sandbox workflow can be useful without a connected provider.

### Add a tiny credit glossary

Place it beside the dashboard and billing numbers, with the actual rules filled in:

> **Included:** monthly credits in your plan. **Reserved:** held for a run that has started. **Used:** credits consumed by finished work. **Available:** credits you can still use. **Top-up:** extra credits you choose to buy.

Show a simple total such as `15,000 included + 10,000 top-up credits` rather than only `Included / top-up`.

### Make approval consequences explicit

Change the page heading from the more abstract `Keep the decision in your hands` to something like `Review drafts before they are marked complete`. Keep the warmer line as supporting text if desired. Add an outcome sentence next to the buttons and use labels such as `Approve draft` and `Reject draft`.

### Give integrations a useful explanation

If integrations cannot be connected in this version, say:

> **Integrations are not connected in this demo.** You can still try the workflow templates and sandbox runs. In a connected deployment, an administrator will set up provider access here.

Do not show old connected examples beside a current message that says nothing is configured. That combination undermines the otherwise careful honesty of the product.

## Assumptions and evidence

- I evaluated the implemented UI labels, screen flow, styling cues, README, API contract, and local server behavior as the product a new user would receive in this folder.
- I treated `API-CONTRACT.md` and the current `ui/` code as the intended newer experience, and the README/`server.js` mismatch as a release-blocking documentation/runtime problem rather than assuming an unseen hosted service.
- I did not use real credentials, payment details, AI providers, or external integrations.
- `npm test` passed (`server smoke tests passed`), but that check does not exercise the current UI bootstrap request. A local request to `/api/bootstrap` returned 404, which is why the launch problem is called out above.

## Changed files

- Created `PLAIN-LANGUAGE-REVIEW.md` only.
- No runtime files, data files, or configuration files were changed.
