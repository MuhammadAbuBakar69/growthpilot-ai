# Security

## Threat model, in order of what would actually hurt

1. **Cross-tenant disclosure.** One customer reading another's business profile, leads or reports.
2. **Crawl-induced SSRF.** Our fetcher used to reach internal services, cloud metadata, or a customer's
   private network.
3. **Prompt injection through crawled content** reaching a tool that can act.
4. **Credential leakage** through logs, error payloads, or a database dump.
5. **Unapproved external action**: an email sent, a post published, a budget spent without a click.
6. **Denial of wallet**: a loop that spends model budget faster than a human can notice.

## Tenant isolation

- `org_id` on every tenant table; RLS with `force row level security`; policies call
  `is_org_member(org_id)`.
- `app.user_id` is set per connection from the verified JWT, never from a request body.
- Repository layer repeats the membership predicate, so a missing policy fails closed twice.
- A test connects as a non-owner role and asserts `select` across a boundary returns zero rows.

## SSRF and crawling

The fetcher refuses, in this order:

1. schemes other than `http`/`https`;
2. hostnames resolving to private, loopback, link-local, multicast or reserved ranges - checked on the
   **resolved address**, not the hostname, and re-checked after every redirect;
3. ports other than 80/443/8080/8443;
4. redirect chains longer than 5 hops;
5. responses over 10 MB, or non-HTML content types when HTML is expected;
6. total crawl budget per audit (page count, wall clock) so a site cannot pin a worker.

Cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`) are blocked by range and by
name, because relying on either alone has failed in real incidents.

## Prompt injection

- Crawled text is data, delimited, and explicitly framed as such in the prompt.
- Per-agent tool allowlists; the website agent has no tools at all.
- Output is schema-validated, so an injected instruction cannot change the shape of what is stored.
- The manager never executes anything: it returns a strategy object, and execution is a human click.

## Secrets

- Provider keys live in the platform secret store, referenced by `token_ref`, never in a row, a log or
  a client bundle.
- `.env` files are git-ignored; `ENVIRONMENT_VARIABLES.md` documents names and shapes, never values.
- OAuth tokens are encrypted at rest with a KMS-managed key and scoped to the minimum the integration
  needs; disconnecting deletes the token, not just the status flag.

## Application surface

- Authentication by the provider (Supabase Auth); sessions are httpOnly cookies, `SameSite=Lax`.
- CSRF: state-changing routes require an `Origin` match and a double-submit token.
- All input validated with Zod at the boundary; unknown keys are rejected.
- SQL only through parameterised queries or the query builder; no string interpolation of identifiers
  except from an allowlist.
- Security headers: strict CSP without `unsafe-inline` in production, HSTS, `X-Content-Type-Options`,
  `Referrer-Policy: strict-origin-when-cross-origin`.
- Rate limits per org and per route class, with `429` and `Retry-After`.

## Auditing and data rights

- `audit_logs` is append-only, with actor, action, target, IP and a payload hash.
- Account deletion is a soft delete plus a scheduled hard purge, with export available first.
- Data export produces JSON of the org's rows plus generated reports.

## What we deliberately do not do

- No scraping that bypasses authentication or robots directives for competitor analysis.
- No storing of contact details we did not obtain lawfully; leads record `source`.
- No "AI-powered" claim about private competitor metrics. Guessed revenue is a lie with a chart.
