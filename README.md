<div align="center">

# GrowthPilot AI

**An AI growth strategist that has to show its evidence.**

Website and business analysis, a ten-agent strategy pipeline, a 30/60/90 roadmap, an action centre that
tracks what you actually shipped, and reports that separate what was **measured** from what the model
**hypothesised**.

</div>

## Live

- **App:** deploy target is Vercel (`growthpilot-ai`). Import the repo at vercel.com/new and set the
  three environment variables below; the free tier is enough.
- **Database:** Supabase project `wndscbclaxiaenkzyuap` (ap-south-1) — 26 tables, RLS on all of them,
  95 policies, `create_workspace()` and the `my_workspaces` view applied.

Vercel hosts the app; it does not store the data. Supabase is the database, and it is the reason a
stranger's session can read nothing: row-level security runs in Postgres, not in the UI.

### Verified end to end (2026-11-11)

| Check | Result |
| --- | --- |
| Sign-up creates a mirrored `app_users` row | pass |
| `create_workspace()` creates org + owner membership + profile in one transaction | pass |
| Owner sees their workspace | 1 row |
| A second signed-in user sees the same tables | 0 rows |
| Cross-tenant insert | rejected, 403 |
| Cross-tenant read of a known profile id | empty |
| Anonymous read of `business_profiles` | empty |

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

### Deploy checklist (Vercel)

1. Project connected to `MuhammadAbuBakar69/growthpilot-ai`, Production Branch = `main`.
2. Environment variables (Production **and** Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Push to `main` — that is what creates the production deployment; connecting the repo alone does not.
4. Open `/api/health`. It answers `200 {"ok":true,"database":"reachable"}` when the build is wired
   correctly, and names the missing variable when it is not. That is the first thing to check after a
   deploy, before clicking around the UI.

### Which database is the deployment using?

`GET /api/health` reports `projectRef`. That field exists because a deployment can be wired to a
Supabase project this repo cannot reach: Vercel's Supabase integration provisions a project in its own
account and injects `NEXT_PUBLIC_SUPABASE_*` itself. A fresh integration project has no tables, so the
dashboard fails with `Could not find the table 'public.my_workspaces'` while every other check looks
healthy.

Fix, in order of preference:

1. Point the deployment at this repo's project (fully migrated, 26 tables, 95 policies, isolation
   verified): set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel, redeploy,
   then confirm `projectRef` in `/api/health`.
2. Keep the integration's project: paste `db/apply_all.sql` into its SQL editor once. That file is
   generated from the migrations by `scripts/gen_apply_all.py`, and CI fails if it drifts.
