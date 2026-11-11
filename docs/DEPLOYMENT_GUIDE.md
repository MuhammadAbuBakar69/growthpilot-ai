# Deployment guide

## Environments

| environment | purpose | data |
| :--- | :--- | :--- |
| local | development | local Postgres 16 + pgvector via Docker Compose |
| preview | every pull request | ephemeral schema, seeded demo org |
| production | customers | managed Postgres with PITR, object storage, Redis |

## Components

- **Web** (Next.js) on Vercel: RSC pages, route handlers under `/api/v1`.
- **Workers** (BullMQ consumers) on a container host: audits, agent runs, report rendering. They scale
  on queue depth, not CPU.
- **Postgres** (Supabase or managed): migrations applied by CI, never by hand.
- **Redis** for queues and short-lived caches. Losing it loses no state, only in-flight work, which is
  re-enqueued from `agent_runs.state = 'queued'`.
- **Object storage** for reports and audit snapshots, served through signed URLs only.

## Local

```bash
cp .env.example .env            # fill DATABASE_URL, provider keys
docker compose up -d db redis
npm ci
npm run db:migrate              # applies db/migrations in order
npm run dev
```

## Migrations

1. Add `db/migrations/000N_name.sql`, forward-only.
2. `npm run db:migrate` locally, then CI applies to preview.
3. Production applies during a deploy step, before the new web version takes traffic.
4. Destructive change = add nullable, backfill, drop in a later release. Two deploys, never one.

## Deploy order

```
migrate -> deploy workers -> deploy web -> smoke test -> announce
```

Workers before web, because a new web version can enqueue job kinds an old worker does not understand.

## Smoke test

`npm run smoke -- --url https://app.example.com` checks: `/api/v1/health` returns `ok` with a schema
version, sign-in page renders, an authenticated call with a test token returns the test org, and one
audit of a fixture URL reaches `complete`.

## Rollback

- Web and workers: redeploy the previous build; both are stateless.
- Migrations: forward-only, so a rollback is a new compensating migration. This is why destructive
  changes take two releases.
- Queue: pause consumers, let in-flight jobs finish, then redeploy. `agent_runs` is the record of what
  ran, so a lost job is visible rather than silent.

## Monitoring

- Error tracking on web and workers, with release tags.
- Queue depth and job failure rate as first-class alerts.
- Model spend per org per day, alerting at 80% of the monthly ceiling.
- Audit status transitions alert if a queued audit exceeds 10 minutes.
