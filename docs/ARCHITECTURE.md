# Architecture and the decisions behind it

## Shape

One static page. React client components, no route handlers, no middleware, no database. `next build`
with `output: "export"` writes `out/`; GitHub Pages serves it. There is no runtime to configure, so
there is no environment variable to get wrong.

## Decisions

**Local-first storage over accounts.** The product is a diagnosis of one business by its owner. Nothing
about that needs a shared server, and everything about a server adds friction (sign-up) and risk (a
tenant boundary to get wrong). Businesses live in IndexedDB behind `lib/storage.ts`, with a
`localStorage` fallback so the app still works when IndexedDB is unavailable. Export produces a complete,
re-importable snapshot; import validates before writing and refuses with a reason.

**Pasted HTML over crawling.** A crawl needs a server and a proxy; a CORS-blocked `fetch` from the page
cannot read another origin. Rather than ship a half-working fetch, the app asks for the page source and
parses it in the tab. That is a smaller claim honestly made, and it keeps the promise that nothing
leaves the browser.

**Rules over a language model.** Every finding is a predicate you can read in `lib/engine.ts`, with its
evidence class attached. A model would produce more fluent prose and less reproducible output, and this
product's value is that its claims can be checked.

**Static export over a platform.** The previous deployment depended on a hosting platform, a database
project and two environment variables; it broke because the deployment pointed at a different database
than the app was built against. A static bundle has no such failure mode.

## Testing

- `lib/engine.test.ts` - scoring maths, band boundaries, clamping, renormalisation, rule firing and
  non-firing, roadmap de-duplication, and the HTML parser including malformed input.
- `lib/app.test.tsx` - renders the real page in jsdom: first run has no sign-in, creating a business
  moves to Questions, answering scores it, findings and three plan stages appear, and an unanswered
  business shows "Nothing scored yet" instead of zero.

## Next

1. Optional fetch of a same-origin page the user owns, if a static host can serve it.
2. A shareable read-only report as a URL fragment (data in the link, still no server).
3. Sector-specific question sets, keeping the weights explicit per sector.
