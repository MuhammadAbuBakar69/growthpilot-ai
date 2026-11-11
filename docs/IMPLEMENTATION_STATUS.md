# Implementation status

Commit at time of writing: this commit. Date 2026-11-11.

## Classification

### Fully implemented and tested

| Item | Evidence |
| --- | --- |
| Scoring engine, 7 weighted dimensions, unavailable instead of zero | `lib/engine.test.ts` (16) |
| 28 answer-driven findings with evidence class, effort, unlocked score | `lib/engine.test.ts` |
| 19 page checks with snippet, consequence, fix | `lib/audit.test.ts` (5) |
| Answer-versus-page cross-check, contradictions and confirmations | `lib/audit.test.ts` + jsdom flow |
| Local persistence, export, validated import | `lib/app.test.tsx` (4) |
| Strict agent output contracts and schema validation | `lib/agents/contracts.test.ts` (9) |
| Ten-agent registry and data-driven agent planning | `lib/agents/contracts.test.ts` |
| Provider abstraction with timeout, retry, usage, unavailable state | `lib/agents/providers.test.ts` (10) |
| Cost table, ledger, budget refusal | `lib/agents/cost.test.ts` (4) |
| SSRF guard: literals, encoded spellings, internal names, metadata, redirect hops, resolved addresses | `lib/security/url.test.ts` (11) |
| Static deployment | GitHub Pages workflow, green |

Total: 55 tests, all offline, no network and no credentials required to run them.

### Implemented, awaiting external credentials

| Item | Missing |
| --- | --- |
| Live model calls through the provider | `GEMINI_API_KEY` or `OPENAI_API_KEY` |
| Server-side fetch using the SSRF guard | a host for the API service + D1 approval |

### Partially implemented

| Item | What exists | What is missing |
| --- | --- | --- |
| AI analysis | Contracts, registry, validation, budgets | Orchestration runtime, context assembly, wiring into the UI |
| Website intelligence | Parser and 19 checks over supplied HTML | Crawling another origin |
| Evaluation | Deterministic tests of the engine | Fixture corpus, model-quality benchmarks |

### Not implemented

Multi-tenant accounts and RLS, Redis/BullMQ queues, Playwright rendering, social OAuth integrations,
content generation pipeline, lead sourcing, performance tracking, job API surface, dashboards, PDF reports.

### Blocked

| Item | Blocked on |
| --- | --- |
| Any server capability | Decision D1 (see `ARCHITECTURE_ASSESSMENT.md`) |
| Live agents | provider key |
| Tenancy | whether this sells to individuals or teams |

## Required environment variables (for the API service, none for the client)

```
GEMINI_API_KEY=      # or OPENAI_API_KEY
GEMINI_MODEL=        # optional, defaults to gemini-2.5-flash
OPENAI_MODEL=        # optional, defaults to gpt-4o-mini
OPENAI_BASE_URL=     # optional, for OpenAI-compatible gateways
```

Nothing is set today, and the app runs correctly with none of them: the deterministic analysis is the
product and the AI layer is additive.

## Production readiness assessment

The deployed client is production ready **for what it claims**: a static, local-first analysis with
deterministic output, no server to breach, no data leaving the browser, a tested export path, and a
labelled limit on what it can see. It is not the multi-agent SaaS in the brief, and no part of this
document should be read as saying otherwise.

Readiness by area: build yes, types yes, lint-equivalent (tsc strict) yes, tests yes (55), deployment yes,
observability no, tenancy no, AI runtime no, benchmark no.

## Rollback

Every change this session is additive or a git commit on `main`. Rollback is `git revert`, and the
deployed client has no server-side state to migrate.
