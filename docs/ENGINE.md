# The engine

`lib/engine.ts` is pure: the same profile always produces the same score, findings and plan. That is the
property that makes the output arguable.

## Scoring

21 questions, each worth 0-3. Each question belongs to exactly one of seven dimensions, and each
dimension carries a fixed weight:

| Dimension | Weight | What it measures |
| --- | --- | --- |
| Positioning | 15% | Can a stranger tell what this is and who it is for |
| Offer & pricing | 15% | Is there one clear offer with a visible price and a low-risk first step |
| Website conversion | 20% | Does the site convert the traffic it already has |
| Content & findability | 15% | Can it be found and understood without a salesperson |
| Acquisition | 15% | Does more than one channel work, repeatably |
| Trust & proof | 10% | Is there evidence that the thing delivers |
| Measurement | 10% | Can an improvement be told apart from luck |

`dimension score = round(100 × earned / possible)` over answered questions only.
`overall = round(Σ weight × dimension score ÷ Σ weight)` over *scored* dimensions only.

Two consequences, both intentional:

- A dimension with no answers has `score: null` and `evidence: "unavailable"`. It contributes nothing.
- Answering one dimension fully yields that dimension's score as the overall, with `completeness` low -
  an honest but narrow reading, which the UI states in a banner below 60%.

Bands: under 40 fragile, 40-59 early, 60-74 solid, 75+ compounding.

## Findings

A finding is a rule with a predicate over the profile. Each carries:

- `severity` (critical → low) - how much growth it blocks,
- `effort` (S/M/L) - what the fix costs in calendar time,
- `evidence` - `measured` if it came from parsed HTML, `inferred` if from an answer,
- `unlocks` - the score it is worth, `weight × headroom × impact ÷ (5 × open rules in that dimension)`.

`unlocks` orders the list. It is a ranking device, not a forecast, and the UI says so.

Rules only fire on data that exists: an unanswered question produces no finding, and a `site-*` rule
cannot fire without supplied HTML.

## Roadmap

Findings are bucketed by effort: S into 30 days, M into 60, L into 90, capped per stage so a plan stays
doable. Nothing is scheduled on a calendar the user did not set.

## Site facts

`extractSiteFacts(html)` is a regex parser over supplied HTML - no network, no DOM, no headless browser.
It reports title, meta description, H1 list, H2 count, word count, action-word count, form/phone/email
presence, image count with missing alt, social links, price mention and viewport meta. Word counts
exclude script and style content, which is why a client-rendered page reads as thin.

## Adding a rule

1. Add it to `RULES` with a predicate, effort, impact and evidence class.
2. Add a test in `lib/engine.test.ts` that proves it fires on the bad case and *does not* fire when the
   datum is missing.
3. If it needs a new fact, add it to `SiteFacts` and to `extractSiteFacts`, and test the parser on
   malformed input.
