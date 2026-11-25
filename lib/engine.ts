/**
 * GrowthPilot's analysis engine.
 *
 * Three rules make the output trustworthy, and they are enforced here rather than in the UI:
 *
 *  1. Nothing is invented. A dimension nobody answered is `unavailable`, not zero. An unanswered
 *     question is missing data, and a score that silently treats it as failure is a lie that then
 *     drives the whole plan.
 *  2. Every number shows its formula. A score is a weighted sum of named answers, and the weights sit
 *     next to the questions in `lib/questions.ts`, so a user can disagree with the arithmetic instead
 *     of with an oracle.
 *  3. Every claim carries its evidence class. Facts parsed from the user's own HTML are `measured`;
 *     conclusions drawn from their answers are `inferred`; anything that needs data we do not have is
 *     `unavailable` and is never rendered as a finding.
 */

export * from "./questions";
export * from "./profile";
export * from "./scoring";
export * from "./findings";
export * from "./roadmap";
export * from "./site-facts";
