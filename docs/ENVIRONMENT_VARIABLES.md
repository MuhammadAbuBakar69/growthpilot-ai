# Environment variables

Names and shapes only. Values live in the secret store; nothing here is a credential.

## Required

| name | shape | used by | notes |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `postgres://user:pass@host:5432/db` | web, workers, migrations | pooled connection string |
| `DIRECT_URL` | same, unpooled | migrations | migrations cannot run through a pooler |
| `REDIS_URL` | `redis://host:6379` | workers | queues |
| `AUTH_SECRET` | 32+ random bytes, base64 | web | cookie signing |
| `APP_URL` | absolute URL | web, workers | OAuth redirects, email links |

## AI providers

| name | used by | notes |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | manager, planning agents | primary for long-context synthesis |
| `OPENAI_API_KEY` | structured-output agents | JSON schema enforcement |
| `AI_MONTHLY_BUDGET_USD` | runtime guard | per-business ceiling enforced by the manager |
| `AI_MAX_TOKENS_PER_RUN` | runtime guard | hard cap per agent run |

Provider selection is by capability, not by name: `lib/agents/providers` maps a requirement
(`json_schema`, `long_context`, `cheap_classification`) to a configured provider, so swapping one out is
a config change.

## Website intelligence

| name | used by | notes |
| :--- | :--- | :--- |
| `PAGESPEED_API_KEY` | audit worker | optional; without it, performance checks report `unavailable` rather than guessing |
| `CRAWL_USER_AGENT` | fetcher | identifies us honestly; no spoofing |
| `CRAWL_MAX_PAGES` | fetcher | per-audit ceiling, default 25 |

## Integrations (all optional, each independently gated)

| name | scope needed |
| :--- | :--- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Search Console read, Analytics 4 read |
| `META_APP_ID` / `META_APP_SECRET` | Instagram/Facebook page insights read |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | organisation page read |
| `YOUTUBE_API_KEY` | channel statistics read |

An integration without credentials is shown as `not_configured` in the UI, with the exact variable
name that is missing. It is never shown as connected.

## Operational

| name | default | notes |
| :--- | :--- | :--- |
| `LOG_LEVEL` | `info` | `debug` must never be set in production |
| `SENTRY_DSN` | unset | error tracking; unset means logs only |
| `DEMO_MODE` | `false` | when true, seeds labelled sample data and refuses external calls |
| `RATE_LIMIT_READ_PER_MIN` | `60` | per organisation |
| `RATE_LIMIT_AUDIT_PER_MIN` | `10` | per organisation |
