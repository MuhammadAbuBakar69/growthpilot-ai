# Product requirements

## Who it is for

Three buyers, one product, different first screens:

| segment | job to be done | success looks like |
| :--- | :--- | :--- |
| Founders of small teams (1-15 people) | "I do not know why we stopped growing" | a ranked list of three things to fix this month, with evidence |
| Agencies and freelancers | "I need a defensible audit for a client in an hour" | an exportable audit a client can read without a call |
| In-house marketers at SMBs | "Give me this month's plan that is not generic" | a calendar and roadmap their manager signs off |

## Jobs, stated as acceptance criteria

### J1 - Onboard a business and get a picture
- Collecting the profile takes under four minutes and can be resumed.
- After saving, the profile shows what is still missing and why each field matters.
- Failure: a half-filled profile is saved as a draft, never silently submitted.

### J2 - Audit a website and understand why it underperforms
- Every score links to the findings that produced it, and each finding cites what was observed.
- A check that could not run is shown as `unavailable` with the reason, never as zero.
- Failure: an unreachable site marks the audit `failed` with a readable error, and does not charge.

### J3 - Get a strategy that is specific to this business
- Each recommendation answers: problem, evidence, why it matters, what to do, how, how to measure.
- Two businesses in different industries must not receive the same top recommendation. This is
  tested, not asserted - see the AI evaluation in TESTING_GUIDE.md.
- Failure: if the model returns a plan with no evidence links, the run is rejected and retried once,
  then surfaced as `needs_review`.

### J4 - Execute and track
- Approving a recommendation creates tasks with owners and dates; nothing is executed externally
  without an explicit approval event.
- Completion records the outcome, so the next analysis can compare intent to result.

### J5 - Prove progress or admit there is none
- The performance report compares this period to the last on the metrics that had a baseline.
- Where there is no baseline it says so, and the first report establishes one.

## Non-goals for v1

- Sending cold email on the user's behalf. Drafts only, because deliverability and consent are a
  product of their own.
- Automated publishing to social platforms. Content is generated and exported; posting stays manual.
- Ad spend management.
- Inventing competitor revenue. Only public, citable observations.

## Product rules that override convenience

1. A number without a method is not shown. If we cannot say how a score was computed, we do not show
   the score.
2. Demo data is labelled in every surface it appears in, including exported PDFs.
3. Every empty state says what to do next; every error state says what happened and what still works.
4. No button exists that does not do the thing it claims.
