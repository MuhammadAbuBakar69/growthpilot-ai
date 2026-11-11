# Technical debt

Ranked by cost of delay. "Interest" is what it costs to keep deferring.

## Architectural (blocks capability, not correctness)

**TD-1 No server execution surface.** Everything runs in the browser, so three whole categories of the
brief cannot exist here: crawling another origin, holding provider API keys, and orchestrating long
multi-agent work. Interest: every AI feature and the entire website-intelligence pipeline stays blocked
until a hosting decision is made. Cheapest exit: a single small API service (see D1 option B), not a
return to the previous stack.

**TD-2 Tenancy absent.** One browser equals one owner. No organisation, membership, role, invitation or
audit trail. Interest: sharing, team seats and paid plans are all impossible, and any future database
migration has to invent these tables from scratch. Deliberate: adding tenancy before knowing whether the
product sells to individuals or teams would guess at the wrong boundary.

**TD-3 Scoring model is not versioned.** Weights are constants. Interest: silent score drift across
deploys, which is a trust bug in the one number the product puts largest on screen. Fix is small
(`scoringVersion` on the profile, pinned at analysis time) and should happen before the next weight change,
not after.

## Correctness risks

**TD-4 Silent storage failure (GP-004).** The fallback path swallows quota errors. Interest: data the user
believes is saved. This is the highest-severity bug in the repository and it is cheap to fix.

**TD-5 Keyword-as-evidence in proof checks (GP-008).** The audit can mark testimonials "found" on the
word "reviews" alone. Interest: exactly the failure mode the product markets against. Fix: attribution
requirement.

**TD-6 Import overwrite (GP-005).** No confirmation on id collision. Interest: one careless import
destroys a stored analysis.

## Maintainability

**TD-7 Engine file concentration (GP-010).** 632 lines, five concerns. Interest: every new rule touches
the same file, so parallel work collides and review gets slower. Low risk to split, pure moves plus
re-exports, tests already cover behaviour.

**TD-8 No error boundary (GP-007).** Interest: a single render bug locks the user out of their own data,
including export.

**TD-9 Snapshot without migration (GP-011).** Interest: the format is a public contract the moment someone
exports a file. Every later change is now a compatibility question.

## Deliberately not debt

- No Tailwind: 267 lines of hand written CSS with named tokens is smaller than the config it would
  replace, and it keeps the static export free of a build plugin.
- No state library: one page, three pieces of state, all local. A store would add indirection without
  removing any.
- No component library: eleven components, none reused elsewhere.

## Order of work

1. TD-4, TD-5, TD-6: correctness, each under an hour, each testable without new infrastructure.
2. TD-3: version the score before any weight changes.
3. TD-7, TD-8: maintainability, safe mechanical work.
4. TD-1, TD-2: only after D1 is decided. Doing these first inverts the risk.
