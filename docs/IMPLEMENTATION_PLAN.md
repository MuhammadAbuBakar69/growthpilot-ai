# Implementation plan

Gated on decision **D1** in `ARCHITECTURE_ASSESSMENT.md`. Phases are ordered so the live product never
stops working and every phase is independently valuable.

## P0 - Foundations (this commit, no infrastructure)

- Provider abstraction with OpenAI, Gemini and an explicit `unavailable` state; timeouts, retry with
  backoff on 429/5xx, token accounting and per-model cost estimate.
- Agent registry with ten specs: identifier, responsibility, system instructions, input and output
  schemas, permitted tools, model config, timeout, retry policy, execution status.
- Strict schema validation for agent output, no dependency, no silent coercion.
- SSRF guard: URL normalisation, scheme and port allowlist, private and loopback and link-local IPv4/IPv6
  and cloud metadata rejection, redirect re-validation, embedded credential rejection.
- 30 new tests, all offline.

Acceptance: `npx tsc --noEmit` clean, `npm test` green, no change to shipped UI behaviour.
Status: delivered.

## P1 - Correctness debt (no infrastructure, ~half a day)

- TD-4: storage write failures surface in the UI instead of being swallowed.
- TD-5: proof checks require attribution before marking `found`.
- TD-6: import asks before replacing an existing id.
- TD-3: `scoringVersion` pinned per analysis.

Acceptance: one test per item, plus a manual pass through the three flows.

## P2 - API service skeleton (needs a host)

- `POST /fetch` using the SSRF guard, HTML to facts, response identical in shape to `SiteFacts`.
- `POST /analyse` returning a job id; `GET /jobs/:id` for status and result.
- Request validation, correlation id, rate limit, structured logs, 4xx/5xx envelope.
- Provider keys server-side only; `.env.example` names every variable and nothing ships a real one.

Acceptance: contract tests against a fake provider, crawler tested against a local fixture server,
cross-origin and private-address requests rejected in tests.
Blocked on: host choice, provider key (Gemini or OpenAI), and approval to deploy.

## P3 - Agent graph on the API

- Orchestration with checkpoints, per-agent logs, cancellation, partial failure recovery, depth and
  tool-call limits, token and cost budgets.
- Only after: the evaluation harness in P4 exists to prove a graph change did not regress quality.

## P4 - Evaluation harness

- Six fixture business profiles (e-commerce, software, agency, freelancer, local service, SaaS startup).
- Deterministic assertions: schema validity, evidence attribution present, no recommendation without a
  finding, no score without sufficient data.
- Baselines committed, so a prompt or model change is compared numerically, not vibed.

## P5 - Tenancy, integrations, observability

Only if D1 resolves toward multi-user: Postgres with RLS, membership and roles, wallet-level quotas, then
social integrations, then cost dashboards. Each requires its own approval step.

## Explicitly out of scope until approved

Crawling external sites, deploying an API, storing provider keys, contacting real leads, publishing
content, and any destructive database operation.

## Blockers

| Blocker | Needed from you | Blocks |
| --- | --- | --- |
| D1 decision | A pick between A, B, C | P2 onwards |
| Provider credential | Gemini or OpenAI key, held server-side | live agent calls |
| Host for the API | Render, Fly, Vercel functions or a VPS | P2 deployment |
| Tenancy scope | individuals or teams | P5 |
