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

**TD-3 Scoring model versioning. RESOLVED.** `SCORING_VERSION` lives in `lib/engine.ts`, every write
stamps it, and the overview states plainly when a saved score predates the current weights instead of
presenting an old number as current. Remaining gap: nothing forces the constant to be bumped when weights
change, which is a review discipline rather than code.

## Correctness risks

**TD-4 Silent storage failure (GP-004). RESOLVED.** Writes raise a typed `StorageWriteError` carrying
`quota`, `unavailable` or `unknown`; the page shows a persistent "Not saved" strip that does not dismiss
itself and points at Export. See `lib/storage.ts` and the fallback tests in `lib/storage.test.ts`.

**TD-5 Keyword-as-evidence in proof checks (GP-008). RESOLVED.** Proof of testimonials now requires an
attributed quote or a rating figure; a keyword-only mention is downgraded to "unclear" and no longer
confirms a strong owner claim. See `proofOfTestimonials` in `lib/audit.ts`, six tests in
`lib/audit.test.ts`.

**TD-6 Import overwrite (GP-005). RESOLVED.** Merge policy in `lib/import.ts`: a new id is added, an
existing id is never overwritten, identical substance is skipped, and a genuine difference is kept
alongside the local record under a new id named "(imported)". Six tests in `lib/import.test.ts`.

## Maintainability

**TD-7 Engine file concentration (GP-010).** 632 lines, five concerns. Interest: every new rule touches
the same file, so parallel work collides and review gets slower. Low risk to split, pure moves plus
re-exports, tests already cover behaviour.

**TD-8 No error boundary (GP-007). RESOLVED.** `components/Boundary.tsx` wraps the overview, findings,
plan and questions panels, so a failing section states what happened in place and the rest of the
workspace, including Export, stays usable.

**TD-9 Snapshot without migration (GP-011). RESOLVED.** `SNAPSHOT_VERSION` is written on export and read
on import. Files from older formats are upcast through explicit steps (v1 gains `scoringVersion: 1`, so a
stale score is labelled rather than mistaken for current), and a file from a newer build is refused with a
reason instead of being partially imported. Tests in `lib/storage.test.ts`.

## Deliberately not debt

- No Tailwind: 267 lines of hand written CSS with named tokens is smaller than the config it would
  replace, and it keeps the static export free of a build plugin.
- No state library: one page, three pieces of state, all local. A store would add indirection without
  removing any.
- No component library: eleven components, none reused elsewhere.

## Order of work

1. TD-7: split the engine by concern. The only remaining item that needs no decision and no new
   infrastructure; pure moves plus re-exports, with the existing suite as the safety net.
2. TD-1, TD-2: only after D1 (hosting) is decided. Doing these first inverts the risk.
3. TD-3's remaining gap, bumping the constant when weights change, needs no code: add it to the review
   checklist for any change to `DIMENSIONS` or the question weights.

Resolved so far: TD-4, TD-5, TD-6, TD-8, TD-9, and the code half of TD-3.
