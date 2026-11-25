import type { Effort, Finding } from "./findings";
import { findings } from "./findings";
import { leverage } from "./scoring";
import type { Profile } from "./profile";

/**
 * The 30-day plan, built from open findings and their effort.
 */

export interface RoadmapStage {
  window: "30 days" | "60 days" | "90 days";
  focus: string;
  items: Finding[];
}

const EFFORT_WEIGHT: Record<Effort, number> = { S: 0, M: 1, L: 2 };

export function roadmap(profile: Profile): RoadmapStage[] {
  const all = findings(profile);
  const small = all.filter((f) => f.effort === "S").slice(0, 4);
  const chosen = new Set(small.map((f) => f.id));
  const medium = all.filter((f) => f.effort === "M" && !chosen.has(f.id)).slice(0, 4);
  medium.forEach((f) => chosen.add(f.id));
  const large = all.filter((f) => f.effort === "L" && !chosen.has(f.id)).slice(0, 3);

  // Only a measured dimension can be named as the focus. Naming the heaviest weight when nothing is
  // answered turned an absence of data into an instruction, which is the one thing this engine promises
  // not to do.
  const ranked = leverage(profile);
  const measured = ranked.find((l) => l.gain !== null) ?? null;
  const focusFor = (fallback: string) => {
    if (measured) return fallback.replace("{dim}", measured.label.toLowerCase());
    return ranked.length > 0
      ? "No answers yet, so nothing can be ranked: the questions come first, and every finding below is provisional until they are answered."
      : fallback.replace("{dim}", "the weakest dimension");
  };

  return [
    { window: "30 days", focus: focusFor("Quick fixes in {dim}: each is a small effort with a visible effect."), items: small },
    { window: "60 days", focus: "Structural work that needs a few weeks of consistency, not a weekend."+"" , items: medium },
    { window: "90 days", focus: "Bets that change what the business can reach: new surfaces, new offers, new proof.", items: large },
  ];
}

export const effortWeight = (e: Effort): number => EFFORT_WEIGHT[e];
