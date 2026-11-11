# Implementation roadmap

Twelve phases. Each has an exit criterion that is a test or a demonstrable behaviour, not a feeling.
The order is chosen so that no phase needs an LLM to be correct: models arrive in Phase 5, after the
plumbing they write into has been proved.

| # | phase | deliverable | exit criterion |
| :-: | :--- | :--- | :--- |
| 1 | Architecture | schema, RLS, docs | `check_schema.py` green; schema parses; RLS on every tenant table **(done)** |
| 2 | Auth + shell | Next.js app, sign-in, org creation, app shell, design tokens | a user can sign in, create an org, and see an empty but real dashboard |
| 3 | Onboarding + profile | onboarding flow, `business_profiles` write path, goals | profile persists, is editable, and resumes after a reload |
| 4 | Website engine | crawler with SSRF guard, deterministic checks, scores with methodology | audit of a live URL produces measured findings and a recomputable score |
| 5 | Strategist | manager + website + business agents, evidence classes | recommendation cites a measured finding, and a hypothesis is visibly labelled |
| 6 | Orchestration | LangGraph graph, `agent_runs`, budgets, retries | a full run completes or degrades, with cost recorded |
| 7 | Marketing + social | strategy generator, content calendar, platform assessments | a calendar is produced per platform, not duplicated copy |
| 8 | Acquisition + competitor | ICP, lead scoring with criteria, competitor comparison | lead score explains every criterion; competitor findings cite URLs |
| 9 | Roadmap + action centre | 30/60/90 generation, tasks, approvals, outcomes | approving a recommendation creates dated tasks; completion records an outcome |
| 10 | Reporting + integrations | PDF/CSV exports, OAuth flows for GSC/GA4/Meta/LinkedIn/YouTube | a report downloads with evidence classes intact; integration disconnect revokes tokens |
| 11 | Hardening | e2e, security, load, accessibility | isolation test, SSRF test suite, axe clean on core pages, p95 under budget |
| 12 | Launch | deploy, monitoring, runbooks, docs | live deployment with error tracking and a rollback that has been rehearsed |

## Sequencing notes

**Phase 4 before 5, always.** A model looking at a website it cannot measure produces plausible
garbage at speed. Deterministic checks first means the model is arguing with numbers instead of
inventing them.

**Phase 6 before 7.** Ten agents without cost accounting and retries is a way to burn a month of budget
in an afternoon.

**Phase 11 is not a phase.** Tests are written with each phase; Phase 11 is where they are made
adversarial.

## Current state

Phase 1 is complete. The next commit opens Phase 2 with the app shell and auth, and its definition of
done is: sign in, create an organisation, land on a dashboard that reads its own name from the
database.
