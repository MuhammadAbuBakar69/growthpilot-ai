# Repository audit

Date 2026-11-11. Commit `a6e5d2e`. Method: full read of every tracked file, dependency inspection,
test run, build run, deployment inspection.

## What the repository is

2,455 lines of application code, 25 passing tests, one static page. Next.js 15 App Router with
`output: "export"`, React 19, TypeScript strict, Vitest. Three runtime dependencies (`next`, `react`,
`react-dom`), no backend, no database, no authentication, no AI provider, no network call at runtime
except loading its own assets.

Three modules carry the product: `lib/engine.ts` (questions, scoring, 28 findings, roadmap, HTML parser),
`lib/audit.ts` (19 page checks and the answer-versus-page cross-check), `lib/storage.ts` (IndexedDB with a
localStorage fallback, export and import).

## What is genuinely working

| Capability | Evidence |
| --- | --- |
| Scoring across 7 weighted dimensions, unanswered reported as unavailable | `lib/engine.test.ts` 16 tests, including renormalisation and band boundaries |
| 28 answer-driven findings with evidence class, effort and unlocked score | `lib/engine.test.ts` firing and non-firing cases |
| 19 page checks from supplied HTML, each with snippet, consequence, fix | `lib/audit.test.ts` thin page vs complete page |
| Cross-check of owner answers against page facts, contradictions and confirmations | `lib/audit.test.ts`, plus a jsdom flow that forces a testimonial contradiction end to end |
| Local persistence, export, validated import | exercised through `lib/app.test.tsx` |
| Static deployment | GitHub Pages workflow green at `a6e5d2e`; live HTML carries the real first screen |

## Issue register

Severity is business risk, not code aesthetics.

| ID | Area | Sev | Root cause | Business impact | Fix | Status |
| --- | --- | --- | --- | --- | --- | --- |
| GP-001 | Product | High | The SaaS build was removed, leaving the deterministic engine only. No model provider, no agent runtime. | The product is called an AI strategist and contains no AI. Nothing adapts to industry, brand voice or market. | Provider abstraction, agent registry, strict output validation, offline evaluation harness. Wire behind a flag so the deterministic path keeps working. | In progress (foundation landed, not wired) |
| GP-002 | Website intelligence | High | A static page cannot read another origin (CORS), and there is no server to crawl from. Analysis depends on the owner pasting page source. | A JavaScript-rendered site reads thin, so findings can be wrong about it. Owners of modern sites get a weaker product. | Server-side fetch with SSRF guards, Playwright only where rendering is required. Blocked on hosting decision (D1). | Blocked |
| GP-003 | Tenancy | High | Storage is per browser; there is no account or organisation model. | Two people cannot share a workspace; clearing site data destroys the only copy; nothing is auditable. | Postgres with RLS, or keep local-first and accept single-user scope. Decision D1. | Blocked on D1 |
| GP-004 | Storage | Medium | `saveProfile` catches every IndexedDB failure and falls back to localStorage, where a quota error is swallowed silently. | A user can believe the work is saved when it is not. Silent data loss is the worst failure mode for a planning tool. | Propagate write failure to the UI, show a persistent banner, offer export. | Open |
| GP-005 | Import | Medium | `parseSnapshot` accepts any `id` and overwrites a stored business without asking. | Importing a colleague's file can replace your own analysis without a prompt. | Ask before replacing an id that exists; surface a diff count. | Open |
| GP-006 | Scoring | Medium | Weights and questions are constants with no model version. | A profile saved before a weight change silently changes score after deploy, with no record of why. | Store `scoringVersion` on the profile; pin the model per analysis; show the version in the report. | Open |
| GP-007 | Resilience | Medium | No React error boundary. | One panel throwing blanks the entire workspace, and the user cannot reach Data to export. | Per-tab boundary with a recovery action. | Open |
| GP-008 | Audit accuracy | Medium | Proof checks treat keyword presence as evidence. "Reviews" in a sentence marks the testimonial check found. | A page can score well on proof without containing any. This is the exact false positive class the product claims to avoid. | Require attribution for `found`: a quoted block, a name plus role, or a rating figure. Demote keyword-only to `unclear`. | Open |
| GP-009 | Access to data | Low | Export is a manual button; nothing reminds the user it is the only copy. | Users lose work they assumed was backed up. | Reminder after N changes since last export; optional File System Access handle. | Open |
| GP-010 | Maintainability | Medium | `lib/engine.ts` is 632 lines mixing question banks, scoring, rules, roadmap and the HTML parser. | Any change to one concern risks the others; the file is now the main obstacle to parallel work. | Split into `questions.ts`, `scoring.ts`, `findings.ts`, `roadmap.ts`, `site-facts.ts` with the parser re-exported. | Open |
| GP-011 | Contracts | Low | Snapshot format has `version: 1` but no migration path; import accepts anything shaped right. | Future format changes will either reject old exports or mis-read them. | Versioned snapshot with explicit upcasters and a schema test. | Open |
| GP-012 | Observability | Low | No telemetry, no error reporting. Failures exist only in the user's browser console. | Bugs are invisible unless reported by hand. | Opt-in local error log plus optional endpoint once a backend exists. | Open |
| GP-013 | Documentation | Low | `docs/ARCHITECTURE.md` predates the audit layer and the flat design system. | New contributors read a stale picture. | Rewritten with this audit. | Done |

## Duplicate or dead code

None found. No `any`, no `@ts-ignore`, no `console.log`, no TODOs, no stub components, no mock data
presented as real. Every number on screen is computed from stored input or parsed HTML, and every
finding carries its evidence class. Verified by grep across `app/`, `lib/`, `components/`.

## Verdict

The repository is small, honest and well tested, and it is not the system the brief describes. The gap
is not code quality, it is missing infrastructure: no server, no tenancy, no model provider, no crawling.
Those four absences are architectural, not defects, and closing them changes the deployment shape. See
`ARCHITECTURE_ASSESSMENT.md` for the decision and `IMPLEMENTATION_PLAN.md` for the sequence.
