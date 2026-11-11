# Project architecture

## Shape

Three runtimes, one boundary:

```
Browser ── Next.js App Router (RSC + client islands)
             │  server actions / route handlers: /api/v1/*
             ▼
        Node service layer  ── BullMQ workers (audits, agent runs, reports)
             │                        │
             ▼                        ▼
        PostgreSQL 16 + pgvector   Object storage (reports, snapshots)
             ▲
             └── LangGraph orchestrator (10 agents, shared business context)
```

The web app never talks to a model directly and never holds a provider key. Every AI call happens in
the worker, behind a job, because agent runs take tens of seconds and a request that holds a socket
for that long is a request that will time out on someone's train.

## Layers and what may import what

| layer | may import | must never import |
| :--- | :--- | :--- |
| `app/` (routes, UI) | `lib/server/*` via server actions | provider SDKs, `db/` directly |
| `lib/server/` (use cases) | `lib/db`, `lib/agents` contracts | React, request objects |
| `lib/db/` (repositories) | pg client, generated types | business rules |
| `lib/agents/` | provider SDKs, `lib/db` read models | HTTP handlers |
| `workers/` | everything server-side | React |

The rule that matters in review: **a route handler contains no business logic**, and an agent
contains no SQL. Both are cheap to enforce with an import-boundary test in CI.

## Runtime decisions

**Next.js with route handlers, not a separate NestJS service.** The spec allows either. One deployable
removes a network hop, a second auth implementation and a duplicated type boundary, and the background
work already lives in workers. If the API outgrows it, `lib/server/` is the seam to lift out, because
nothing in it imports Next.

**Postgres as the queue source of truth.** BullMQ needs Redis; job *state* is also written to an
`agent_runs` row so a Redis flush cannot lose the fact that a run happened. Redis is allowed to be
ephemeral here, which is the only way to operate it without heroics.

**pgvector for business knowledge.** Personas, past recommendations and competitor observations are
embedded so the manager agent can retrieve the user's own history rather than re-deriving it. This is
the difference between a strategist that remembers your last audit and one that starts fresh every
morning.

**Supabase for auth and storage, plain Postgres for everything else.** Auth is the one part of a SaaS
that is genuinely hard to get right, and Supabase gives JWT + RLS integration for free. The schema
does not depend on Supabase-specific tables (`app_users` mirrors the provider), so a move to
self-hosted auth is a data migration, not a rewrite.

## Request path for a website audit

1. `POST /api/v1/website-audits` validates the URL, checks org membership, inserts a `queued` row.
2. It enqueues `audit.crawl`. The response is `202` with the audit id. Nothing blocks.
3. The worker crawls with Playwright under SSRF guardrails (see SECURITY.md), writes `website_pages`.
4. Deterministic checks run first: titles, meta, headings, alt text, canonical, sitemap, redirects,
   Core Web Vitals from PageSpeed when a key exists. These produce `measured` findings and category
   scores with their methodology attached.
5. Only then does the Website Agent see the measurements, with the instruction that it may add
   `hypothesis` findings but may not restate a measured value as its own opinion.
6. Status flips to `complete`; a notification row is written; the UI polls or receives a push.

## Multi-tenancy and isolation

Every tenant table carries `org_id` and is protected by RLS with `force row level security`, so even
the table owner role is subject to policies. `app.user_id` is set per connection from the verified
JWT. Tests connect as a non-superuser app role and assert cross-tenant reads return zero rows; that
test is the reason `force` is there.

## What would make us change this

- If audit throughput passes ~10k/day, Playwright in-process stops being viable and crawling moves to
  a dedicated browser pool. The seam is `workers/audit`, which already speaks in jobs, not requests.
- If the ten agents become individually deployable, LangGraph moves to a service and `agent_runs`
  becomes the transport. The output schemas are already the contract.
