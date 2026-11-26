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

**TD-10 No backup reminder (GP-009). RESOLVED.** `lib/backup.ts` decides when the owner should be told
that the export is the only copy, and the page shows it next to the export action with a one-click Export.
It stays silent unless something is genuinely at stake: never exported, five or more changes since, or a
backup older than a fortnight with changes behind it. Dismissal is recorded as a dismissal, never as an
export, so the reminder cannot be used to fake a backup that does not exist; it returns after another five
changes. A failed download is reported and does not clear the reminder. 18 tests in `lib/backup.test.ts`
plus two jsdom flow tests in `lib/app.test.tsx`.

**TD-6 Import overwrite (GP-005). RESOLVED.** Merge policy in `lib/import.ts`: a new id is added, an
existing id is never overwritten, identical substance is skipped, and a genuine difference is kept
alongside the local record under a new id named "(imported)". Six tests in `lib/import.test.ts`.

**TD-12 Gain arithmetic ignored renormalisation (GP-015). RESOLVED.** `leverage` and `findings` multiplied
a dimension's raw weight by its distance from 100 and presented the result as points of overall score. The
overall score is renormalised over the dimensions that were answered, so on a partly answered profile the
two did not agree: with conversion as the only measured dimension at 0/100, the panel promised "+20" while
closing that gap moves the score by 100. Both now use the dimension's share of the answered model, and a
test asserts that the promised gain equals the movement `scoreProfile` actually produces. Five tests in
`lib/engine.test.ts`.

**TD-13 Finding spread divided by every rule, not every open one. RESOLVED.** `findings` counted the
rules *defined* for a dimension rather than the ones that fired, while the comment and the contract say
open findings. A dimension whose other rules did not apply to this business was diluted anyway: on a
partly answered profile, `pos-missing` reported 3.3 instead of 5, and because the list is ordered by
`unlocks`, findings were ranked by a number that did not describe them. The count now comes from the fired
set. The regression test derives the expected value from `scoreProfile` and the returned findings, so it
states the contract rather than copying a constant.

## Maintainability
**TD-14 Unreadable saved data read as an empty store (GP-016). RESOLVED.** `readFallback` swallowed a
parse error and returned `[]`, so a corrupt store looked exactly like a fresh install: the app showed the
blank setup screen and the next save wrote only that one record over the file, destroying every other
business without a word. The raw bytes are now copied to a `growthpilot.businesses.v1.unreadable.<time>`
recovery key before anything replaces them, valid records in a partly readable file are kept, and if the
copy cannot be written the save is refused with a typed error rather than proceeding. The page states how
many files were preserved. Five tests in `lib/storage.test.ts`, one of which asserts the original bytes
survive a save.


**TD-11 Unanswered dimensions scored as zero gap (GP-014). RESOLVED.** `leverage` and the roadmap
treated an unmeasured dimension as a full-gap opportunity. With no answers at all it ranked every
dimension and put "website conversion +20" first purely because that weight is largest, so the 30-day plan
opened with "quick fixes in website conversion" for a business nobody had asked about. `Leverage.gain` is
now `number | null` with an `unmeasured` flag: unmeasured dimensions rank after measured gaps and are
named as unranked, the overview panel offers the questions instead of a list, and the roadmap focus says
there are no answers yet rather than inventing a priority. Five tests in `lib/engine.test.ts`.

**TD-7 Engine file concentration (GP-010). RESOLVED.** The 727-line file is now six modules by concern:
`lib/questions.ts` (dimensions, weights, question bank), `lib/profile.ts` (profile shape, `emptyProfile`,
`SCORING_VERSION`), `lib/scoring.ts` (dimension and overall scores, bands, leverage), `lib/findings.ts`
(the rules), `lib/roadmap.ts` (the plan) and `lib/site-facts.ts` (the parser). `lib/engine.ts` is a
façade that re-exports all of them, so no consumer changed. `lib/engine-facade.test.ts` states the
contract the split has to keep: every public name is re-exported and is the same binding, the question
bank does not reach into scoring or findings, and the parser does not judge what it parses. Pure moves,
so behaviour is unchanged and the existing 109 tests still pass. It had grown from 632 to 727 lines while
this entry waited.

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

1. TD-1, TD-2: only after D1 (hosting) is decided. Doing these first inverts the risk.
2. GP-012, an opt-in local error log, is the last item that needs no decision and no infrastructure: it
   records failures in the browser where they already happen, and gains an endpoint for free once TD-1
   exists. Design question first: what is stored, and how is it cleared.
3. TD-3's remaining gap, bumping the constant when weights change, needs no code: add it to the review
   checklist for any change to `DIMENSIONS` or the question weights.

Resolved so far: TD-3 (code half), TD-4, TD-5, TD-6, TD-7, TD-8, TD-9, TD-10, TD-11, TD-12, TD-13, TD-14.
