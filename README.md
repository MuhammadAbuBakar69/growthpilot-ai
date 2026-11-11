# GrowthPilot

A growth analysis for a real business: a scored diagnosis, findings that state their evidence, and a
30/60/90 plan. It opens straight into the app. **No account, no sign-in, no server, no database.**

Live: https://muhammadabubakar69.github.io/growthpilot-ai/

## Why it has no backend

An earlier version of this project was a multi-tenant SaaS on Supabase with row-level security, auth
middleware and a Vercel deployment. It worked, and it was the wrong shape for the job: a business owner
had to sign up, confirm an email and create a workspace before seeing anything, and their answers then
lived on a server that had to be secured, migrated and paid for.

This version keeps the part that matters - the analysis - and removes the part that was friction. The
app is a single static page. Your business is stored in your own browser, and the only network request
the page ever makes is loading its own files.

## The three rules the engine follows

1. **Nothing is invented.** An unanswered dimension is reported as `unavailable`, never as zero, and no
   finding is built on a question you skipped. The overall score renormalises over what you actually
   answered, and shows how complete that is.
2. **Every number shows its formula.** A dimension score is `earned / possible × 100` over that
   dimension's answers; the overall score is the weighted sum of dimension scores, weights in
   `lib/engine.ts` (`positioning 15, offer 15, conversion 20, content 15, acquisition 15, trust 10,
   measurement 10`). You can disagree with the arithmetic instead of with an oracle.
3. **Every claim carries its evidence class.** `measured` comes from HTML you supplied and parses the
   same way every time; `inferred` comes from your answers; `hypothesis` is never shown as a finding;
   `unavailable` means the data does not exist here.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 19 tests: engine maths + a full click-through of the app
npm run build    # static export into out/
```

`npm run build` writes plain files. `NEXT_PUBLIC_BASE_PATH=/growthpilot-ai npm run build` produces the
same site ready for a project page; that is what CI does.

## What it does

- **Questions** across seven dimensions, each answer worth 0-3 points and each dimension weighted.
- **Overview**: the score, its band, where the next points are cheapest (weight × distance from 100).
- **Findings**: 21 rules over your answers plus 7 over parsed HTML - severity, effort, and the score
  each one unlocks, ordered by that number.
- **Plan**: small effort in 30 days, medium in 60, large bets in 90.
- **Website**: paste your page source (`Ctrl+U`) and it is parsed in the tab: title, meta description,
  H1s, word count, forms, contact routes, images missing alt text, viewport tag, social links.
- **Data**: everything exportable as one JSON file and re-importable, because the browser is the only
  copy.

## Limitations, stated plainly

- There is no crawl. A page rendered by JavaScript looks thinner than it is, because the parsing works
  on HTML you paste, and the findings say so where it matters.
- Findings are rule-based, not model-generated. That is deliberate: a rule you can read and argue with
  beats a paragraph you cannot reproduce.
- Data lives in one browser. Clearing site data deletes it; export first.

## Layout

```
app/            page shell, one client component tree, no server routes
components/     Overview, Findings, Roadmap, Questions, Website, DataVault, Setup
lib/engine.ts   scoring, findings and roadmap - pure functions
lib/storage.ts  IndexedDB with a localStorage fallback, plus export/import
lib/*.test.*    19 tests
docs/           ENGINE.md (the model), ARCHITECTURE.md (the decisions)
```
