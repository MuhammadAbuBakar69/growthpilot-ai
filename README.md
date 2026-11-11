<div align="center">

# GrowthPilot AI

**An AI growth strategist that has to show its evidence.**

Website and business analysis, a ten-agent strategy pipeline, a 30/60/90 roadmap, an action centre that
tracks what you actually shipped, and reports that separate what was **measured** from what the model
**hypothesised**.

</div>

## Status: Phase 1 of 12, and nothing is pretending otherwise

This repository is at the end of the architecture phase. What exists today is the part that is
expensive to change later and cheap to review now:

| piece | state |
| :--- | :--- |
| Database schema, 26 tables, enums, indexes | written, parses as PostgreSQL, pushed |
| Tenant isolation (RLS on 24 tenant tables) | written, statically verified in CI |
| Architecture, PRD, agent contracts, security model, roadmap | written |
| Application code | **not started** (Phase 2) |
| Live deployment | **not deployed** |

There is no dashboard to click yet, and no screenshot of one. Anything else would be a mock-up, and a
mock-up is exactly the failure mode this project's own rules forbid.

## The one design decision everything else follows

A growth recommendation is only worth the evidence behind it. So evidence has a class, and it is
stored, not implied:

- `measured` - we fetched it and can cite the URL or API response.
- `inferred` - derived from measurements by a stated method (a score with its formula attached).
- `hypothesis` - the model's reasoning, useful and unproven.
- `unavailable` - the check could not run; it is shown as unavailable, never as a zero.

That is enforced in three places: the `evidence_class` enum on `findings`, `scores` and
`recommendations`; the agent output schemas; and the report renderer, which will not print a
hypothesis in a findings section.

## Layout

```
db/migrations/0001_init.sql   the schema: identity, business profile, audits, strategy, tasks,
                              leads, agents, reports, ops
db/policies/0002_rls.sql      row-level security, explicit per table
docs/                         architecture, PRD, schema notes, API, agents, security, roadmap
scripts/check_schema.py       CI gate: parse both SQL files, prove RLS coverage
```

## Run the checks

```bash
python -m pip install pglast
python scripts/check_schema.py
# check_schema: 59 statements, 26 tables, 24 tenant tables, all RLS-enforced
```

## What Phase 2 delivers

Next.js app shell with auth, organisation creation, and the onboarding flow that writes a
`business_profiles` row, then one real website audit against a live URL. Nothing in that list needs a
model call, which is deliberate: the plumbing has to be provably correct before an LLM is allowed to
write into it.

The full sequence, with exit criteria per phase, is in [docs/IMPLEMENTATION_ROADMAP.md](docs/IMPLEMENTATION_ROADMAP.md).

## Licence

Proprietary. All rights reserved.
