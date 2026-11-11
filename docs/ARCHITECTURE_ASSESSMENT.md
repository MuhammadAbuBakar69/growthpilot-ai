# Architecture assessment

## The question the brief actually asks

The brief specifies ten coordinated agents, LangGraph orchestration, PostgreSQL with row-level security,
Redis queues, Playwright crawling, OAuth integrations and multi-tenant isolation. The repository is a
static page with no server. Those are not compatible, and no amount of incremental refactoring closes the
gap: three of the requirements (crawling another origin, holding provider secrets, long-running
orchestration) need a process the user does not control.

So the decision is not "which framework", it is **where execution happens**. Below are the three coherent
answers, with what each costs.

## D1 - Where does execution happen?

### Option A - Rebuild as the specified SaaS

Client + Next.js server routes + Postgres/Supabase with RLS + Redis/BullMQ + ten agents on LangGraph.

- Gains: the full brief, multi-tenancy, crawling, integration OAuth.
- Costs: a database project, a Redis instance, a worker host, provider keys, migration and RLS test
  suites, and a queue surface to operate. Weeks of work before a single user sees value.
- Risk: this exact stack was built here once and was abandoned because the deployment pointed at an empty
  integration project and the product could not be evaluated without an account. Reverting to it repeats
  the original mistake: infrastructure before evidence that the analysis is worth paying for.
- Verdict: not first.

### Option B - Two tiers (recommended)

Keep the static client as the product. Add one narrow, stateless API service that does only what a browser
cannot:

1. `POST /fetch` - SSRF-guarded fetch of a URL, returns extracted facts.
2. `POST /analyse` - runs the agent graph with server-held keys, returns validated structured output plus
   a job id for anything longer than a request.

- The deterministic engine stays in the client: it works offline, costs nothing to run, and remains the
  fallback when the API is down or the user has no key.
- No user accounts until there is a second user who is not the owner. Tenancy without customers is
  guessing at a boundary.
- Deployment: static client on Pages (already live), API on any small host. Two deployables, one contract.
- Verdict: recommended, and it can be built in the order the risk actually falls.

### Option C - Local-first with the user's own key

The browser calls Gemini or OpenAI directly with a key the user pastes, stored in IndexedDB.

- Gains: zero infrastructure, zero tenancy, works today.
- Costs: a provider key in a browser is a key the user must guard; no per-tenant rate limiting; no
  server-side prompt protection; CORS support varies by provider.
- Verdict: a good stopgap for a single technical user, not a product. Keep as a fallback path behind the
  same provider interface, not as the architecture.

## Recommended shape (Option B)

```
browser (static)                     api service (stateless)
├─ lib/engine.ts   scoring           ├─ security/url.ts   SSRF guards
├─ lib/audit.ts    page checks       ├─ agents/registry   ten specs
├─ lib/agents/*    contracts  ──────▶├─ agents/providers  openai | gemini | fake
├─ IndexedDB       local state       ├─ agents/validate   strict schemas
└─ export / import                   └─ eval/             deterministic benchmark
```

The boundary is a validated JSON contract, so either side can be replaced. The client never sees a
provider key, and the API never sees the user's stored businesses beyond the request it is answering.

## What the current code already gives the target architecture

| Requirement | State |
| --- | --- |
| Structured findings with evidence, severity, effort, confidence | Implemented and tested (`lib/audit.ts`, `lib/engine.ts`) |
| Separation of scoring, rules and parsing | Present, needs the file split (TD-7) |
| Deterministic, reproducible output | Yes: pure functions, 25 tests |
| Provider abstraction, agent registry, output validation | Landed this commit as contracts, tested offline |
| Streaming/crawling/queues/tenancy | Absent, blocked on D1 |

## Deliberate non-goals

- No client-side PDF export before the report content is proven worth exporting.
- No integration OAuth (Instagram, LinkedIn) before tenancy: tokens need somewhere safe to live.
- No LLM judge in evaluation: deterministic assertions first, model judgement only where a rule cannot
  express the requirement.
