import { describe, expect, it } from "vitest";
import * as engine from "./engine";
import * as findings from "./findings";
import * as profile from "./profile";
import * as questions from "./questions";
import * as roadmap from "./roadmap";
import * as scoring from "./scoring";
import * as siteFacts from "./site-facts";

/**
 * The engine was one 727-line file; it is now six modules behind a façade.
 *
 * Every consumer (components, storage, audit, the tests themselves) still imports from `lib/engine`,
 * which is what made the split safe to do at all. This test is what keeps it safe: it states that the
 * façade exposes the whole contract, and that each name is the very same binding rather than a copy that
 * could drift. A future move that forgets a re-export fails here instead of in a page nobody opened.
 */
const modules = { findings, profile, questions, roadmap, scoring, siteFacts };

describe("engine façade", () => {
  it("re-exports every public name from every module", () => {
    const missing: string[] = [];
    for (const [moduleName, module] of Object.entries(modules)) {
      for (const name of Object.keys(module)) {
        if (!(name in engine)) missing.push(`${moduleName}.${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("re-exports the same binding, not a re-implementation", () => {
    for (const module of Object.values(modules)) {
      for (const [name, value] of Object.entries(module)) {
        expect((engine as Record<string, unknown>)[name], name).toBe(value);
      }
    }
  });

  it("keeps the module boundaries that motivated the split", () => {
    // The question bank must not depend on scoring or findings; a cycle here would undo the point.
    expect(Object.keys(questions)).not.toContain("scoreProfile");
    expect(Object.keys(questions)).not.toContain("findings");
    // Scoring must not reach into the roadmap.
    expect(Object.keys(scoring)).not.toContain("roadmap");
    // The parser stays unaware of scoring: it reports facts, it does not judge them.
    expect(Object.keys(siteFacts)).not.toContain("scoreProfile");
    expect(Object.keys(siteFacts).sort()).toEqual(
      expect.arrayContaining(["extractSiteFacts"]),
    );
  });

  it("still exports the single names every consumer relies on", () => {
    for (const name of [
      "DIMENSIONS",
      "QUESTIONS",
      "questionsFor",
      "SCORING_VERSION",
      "emptyProfile",
      "scoreProfile",
      "leverage",
      "findings",
      "roadmap",
      "extractSiteFacts",
    ]) {
      expect(engine).toHaveProperty(name);
    }
  });
});
