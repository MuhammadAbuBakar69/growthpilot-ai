import { DIMENSIONS, questionsFor, type Dimension, type DimensionId, type Evidence } from "./questions";
import type { Profile } from "./profile";

/**
 * Scoring. Every number here shows its formula, and an unanswered dimension is `unavailable`, never zero.
 */

export interface DimensionScore {
  id: DimensionId;
  label: string;
  weight: number;
  score: number | null;
  earned: number;
  possible: number;
  answered: number;
  asked: number;
  evidence: Evidence;
}

export interface ScoreResult {
  overall: number | null;
  band: Band | null;
  dimensions: DimensionScore[];
  answered: number;
  asked: number;
  completeness: number;
}

export interface Band {
  key: "fragile" | "early" | "solid" | "compounding";
  label: string;
  meaning: string;
}

const BANDS: Band[] = [
  { key: "fragile", label: "Fragile", meaning: "Growth depends on the owner remembering to do things. Fix the basics before spending on traffic." },
  { key: "early", label: "Early", meaning: "The pieces exist but do not reinforce each other. A small number of changes can move the number a lot." },
  { key: "solid", label: "Solid", meaning: "The machine works when fed. The next gain comes from widening one channel, not fixing five." },
  { key: "compounding", label: "Compounding", meaning: "Each channel feeds the next. Protect what works and raise price or volume deliberately." },
];

export const bandFor = (overall: number): Band =>
  overall >= 75 ? BANDS[3] : overall >= 60 ? BANDS[2] : overall >= 40 ? BANDS[1] : BANDS[0];

export function scoreDimension(dimension: Dimension, answers: Record<string, number>): DimensionScore {
  const asked = questionsFor(dimension.id);
  let earned = 0;
  let possible = 0;
  let answered = 0;
  for (const q of asked) {
    const value = answers[q.id];
    if (typeof value !== "number" || Number.isNaN(value)) continue;
    const clamped = Math.max(0, Math.min(3, value));
    earned += clamped;
    possible += 3;
    answered += 1;
  }
  return {
    id: dimension.id,
    label: dimension.label,
    weight: dimension.weight,
    // An unanswered dimension has no score. Reporting 0 would invent a fact.
    score: possible === 0 ? null : Math.round((earned / possible) * 100),
    earned,
    possible,
    answered,
    asked: asked.length,
    evidence: possible === 0 ? "unavailable" : "inferred",
  };
}

export function scoreProfile(profile: Profile): ScoreResult {
  const dimensions = DIMENSIONS.map((d) => scoreDimension(d, profile.answers));
  const scored = dimensions.filter((d) => d.score !== null);
  const totalWeight = scored.reduce((sum, d) => sum + d.weight, 0);
  // Weights are renormalised over what was actually answered, and completeness says how much of the
  // picture that is. The alternative - scoring unanswered dimensions as zero - punishes a user for a
  // question they never saw.
  const overall =
    totalWeight === 0
      ? null
      : Math.round(scored.reduce((sum, d) => sum + d.weight * (d.score as number), 0) / totalWeight);
  const asked = dimensions.reduce((sum, d) => sum + d.asked, 0);
  const answered = dimensions.reduce((sum, d) => sum + d.answered, 0);
  return {
    overall,
    band: overall === null ? null : bandFor(overall),
    dimensions,
    answered,
    asked,
    completeness: asked === 0 ? 0 : Math.round((answered / asked) * 100),
  };
}

export interface Leverage {
  id: DimensionId;
  label: string;
  /** Points of overall score available here, or null when nothing is known about this dimension. */
  gain: number | null;
  /** The dimension score, or null when unanswered. Never 0: unanswered is not failure. */
  score: number | null;
  /** True when no question in this dimension has been answered, so there is no gap to measure. */
  unmeasured: boolean;
}

/**
 * Where the next point of score is cheapest: weight x distance from perfect.
 *
 * The distance is only knowable for a dimension that has been answered. Treating a missing score as 0
 * made the list confidently wrong: with no answers at all it ranked every dimension as a full-gap
 * opportunity, with "website conversion +20" at the top purely because it carries the largest weight,
 * and the 30-day plan then opened with "quick fixes in website conversion" for a business nobody had
 * asked a single question about. Unmeasured dimensions are now reported as unmeasured and rank last;
 * they are a reason to answer the questions, not a work item.
 */
export function leverage(profile: Profile): Leverage[] {
  // The overall score is renormalised over the dimensions that were actually answered, so one point of a
  // dimension is worth weight/totalWeight of the whole, not weight. Using the raw weight understated every
  // gap on a partly answered profile: with only conversion answered at 0/100 the panel promised "+20",
  // while closing that gap moves the overall score by the full 100. The number shown has to be the number
  // the arithmetic will actually produce.
  const totalWeight = DIMENSIONS.reduce((sum, d) => {
    const s = scoreDimension(d, profile.answers);
    return s.score === null ? sum : sum + d.weight;
  }, 0);

  return DIMENSIONS.map((d) => {
    const s = scoreDimension(d, profile.answers);
    const unmeasured = s.score === null;
    const share = totalWeight === 0 ? 0 : d.weight / totalWeight;
    return {
      id: d.id,
      label: d.label,
      score: s.score,
      unmeasured,
      gain: unmeasured ? null : Number((share * (100 - (s.score as number))).toFixed(1)),
    };
  })
    .filter((l) => l.gain === null || l.gain > 0)
    .sort((a, b) => {
      // Measured gaps first, largest first; unmeasured dimensions after them, by weight as a tie-break
      // so the list still reads in a stable order.
      if (a.gain === null && b.gain === null) {
        return (DIMENSIONS.find((d) => d.id === b.id)?.weight ?? 0) - (DIMENSIONS.find((d) => d.id === a.id)?.weight ?? 0);
      }
      if (a.gain === null) return 1;
      if (b.gain === null) return -1;
      return b.gain - a.gain;
    });
}
