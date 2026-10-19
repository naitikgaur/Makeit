# MakeEase competitive decision

## Honest answer

MakeEase is **not yet better than all ten competitors overall**. They have deeper production infrastructure, connector breadth, support products, CRM ecosystems, RPA, and enterprise distribution.

MakeEase can be better in a narrower position:

> **A portable, approval-first automation control plane with evidence, hard cost caps, and one consistent policy model across workflows and AI actions.**

## Benchmark conclusions

| Product | Best benchmark | MakeEase response |
|---|---|---|
| Zapier | Progressive-disclosure simplicity and app breadth | Start with a guided job, then expose power progressively; use typed connector contracts and migration tooling later |
| Make | Visual composition and scenario recovery | Add evidence-rich step traces, guided recovery, and less technical support-first setup |
| n8n | Technical control, self-hosting, extensibility | Keep an exportable workflow contract, safer defaults, and a simpler nontechnical path |
| Power Automate | Enterprise governance and Microsoft ecosystem | Make policy, cost, and approval decisions visible before publish; stay connector-neutral |
| Intercom Fin | Train/test/deploy/analyze support lifecycle | Add portable knowledge, evidence freshness, explicit outcomes, and cross-system action receipts |
| Zendesk | Mature support workspace and routing | Avoid replacing the helpdesk initially; orchestrate across existing systems |
| Gorgias | Shopify-centered ecommerce CX | Add an approval-first CommerceOps package later with reconciliation and exception queues |
| Lindy | General AI coworker experience | Replace vague autonomy with roles, typed tools, risk policies, budgets, and measurable outcomes |
| Agentforce | CRM-native actions, testing, and observability | Provide open manifests, model portability, vendor-neutral connectors, and simpler pricing |
| UiPath | RPA and enterprise orchestration | Stage browser/desktop automation behind isolated workers; never make it an MVP promise |

## What is actually improved now

- Competitor research: `research/competitors/*.md`
- Support-first B2B UX redesign
- Safer local API/bootstrap and persistence behavior
- Provider-neutral AI safety contract with evidence, uncertainty, policy, budget, and evaluation
- Credit reservation/settlement fixes in the local UI
- Timeout cancellation and fail-closed live-budget logic in the executor
- Auth validator regression fix
- Storage fallback warning
- 25 automated tests passing

## Still not production-complete

Real authentication, OAuth, PostgreSQL, durable multi-tenant workers, provider integrations, payment processing, cloud deployment, secrets management, and production security/compliance are still required. The current project remains a safe local sandbox and must not be sold as a deployed SaaS yet.

## Product decision

Do not chase literal feature parity. Build the kernel around **governed execution + evidence + cost control**, then ship Support Operations first and Ecommerce Operations second.
