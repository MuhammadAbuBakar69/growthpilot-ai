# API documentation

Base path `/api/v1`. JSON in, JSON out, ISO-8601 timestamps, UUID identifiers. Every response is
versioned by path, so a breaking change ships as `/api/v2` beside the old one.

## Envelope

```json
{ "data": { }, "meta": { "request_id": "..." } }
```

```json
{ "error": { "code": "validation_failed", "message": "url must be absolute",
             "details": [{ "field": "url", "issue": "not_a_url" }],
             "request_id": "..." } }
```

Codes are stable strings: `unauthenticated`, `forbidden`, `not_found`, `validation_failed`,
`rate_limited`, `conflict`, `upstream_unavailable`, `internal`. HTTP status codes carry the class; the
string carries the meaning, so a client can branch without parsing prose.

## Endpoint groups

| group | purpose | notable endpoints |
| :--- | :--- | :--- |
| `/auth` | session bootstrap, org switch | `POST /auth/session`, `GET /auth/me` |
| `/organizations` | tenancy | `POST /organizations`, `GET /organizations/:id/members` |
| `/business` | profile, goals | `POST /business`, `PATCH /business/:id`, `GET /business/:id/goals` |
| `/website-audits` | crawl + analyse | `POST /website-audits` -> `202 {id}`, `GET /website-audits/:id` |
| `/seo` | search findings | `GET /seo/:businessId/findings`, `POST /seo/:businessId/recheck` |
| `/marketing` | strategy | `POST /marketing/strategies`, `GET /marketing/strategies/:id` |
| `/social` | accounts, content plans | `GET /social/accounts`, `POST /social/content-plan` |
| `/leads` | acquisition | `POST /leads`, `GET /leads?scores=true`, `POST /leads/:id/drafts` |
| `/competitors` | competitor intel | `POST /competitors`, `POST /competitors/:id/analyze` |
| `/strategies` | lifecycle | `GET /strategies`, `POST /strategies/:id/approve` |
| `/roadmaps` | 30/60/90 | `POST /roadmaps/generate`, `GET /roadmaps/:businessId` |
| `/tasks` | action centre | `PATCH /tasks/:id`, `POST /tasks/:id/outcome` |
| `/agents` | runs, observability | `GET /agents/runs`, `GET /agents/runs/:id` |
| `/reports` | exports | `POST /reports`, `GET /reports/:id/download` |
| `/integrations` | connections | `GET /integrations`, `POST /integrations/:kind/connect` |

## Conventions

**Long work is a job, not a request.** Anything that crawls, calls a model, or renders a PDF returns
`202` with an id and a `Location` header. Clients poll the resource; `GET` on an audit includes
`status` and `progress`.

**Pagination is cursor-based** on `(created_at, id)`: `?limit=50&cursor=<opaque>`. Offsets drift when a
list is written to during paging, and audits are written to constantly.

**Idempotency.** `POST` endpoints that create billable work accept `Idempotency-Key`. A replay within
24h returns the original response rather than a second audit.

**Authorisation is per object, not per route.** Membership is checked in the repository layer with the
same `is_org_member` predicate the database uses, so an endpoint that forgets a check still cannot
read across tenants.

**Rate limits** are per organisation and per route class: 60/min for reads, 10/min for audit creation,
2/min for report generation. `429` carries `Retry-After`.

**External actions require an approval event.** `POST /tasks/:id/approve` is the only path to an outbound
action, and it writes `audit_logs` with actor, target and payload hash.

## OpenAPI

The spec is generated from the Zod schemas in `lib/contracts` at build time, so documentation cannot
drift from validation. Until the app layer exists (Phase 2), this document is the contract of record.
