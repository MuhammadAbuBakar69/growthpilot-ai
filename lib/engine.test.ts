import { describe, expect, it } from "vitest";
import {
  DIMENSIONS, QUESTIONS, bandFor, emptyProfile, extractSiteFacts, findings, leverage, roadmap, scoreProfile,
} from "./engine";
import type { Profile } from "./engine";

const base = (over: Partial<Profile> = {}): Profile => ({ ...emptyProfile(), id: "t", ...over });

const allAnswers = (points: number): Record<string, number> =>
  Object.fromEntries(QUESTIONS.map((q) => [q.id, points]));

describe("scoring", () => {
  it("treats an unanswered dimension as unavailable, never as zero", () => {
    const s = scoreProfile(base());
    expect(s.overall).toBeNull();
    expect(s.band).toBeNull();
    expect(s.dimensions.every((d) => d.score === null && d.evidence === "unavailable")).toBe(true);
  });

  it("renormalises weights over answered dimensions instead of diluting the score", () => {
    const only = base({ answers: { pos_what: 3, pos_who: 3, pos_why: 3 } });
    const s = scoreProfile(only);
    expect(s.dimensions.find((d) => d.id === "positioning")?.score).toBe(100);
    expect(s.overall).toBe(100);
    expect(s.completeness).toBeLessThan(50);
  });

  it("computes the weighted overall from per-dimension scores", () => {
    const p = base({ answers: { ...allAnswers(0), con_cta: 3, con_fold: 3, con_steps: 3, con_contact: 3 } });
    const s = scoreProfile(p);
    const conversion = s.dimensions.find((d) => d.id === "conversion")!;
    expect(conversion.score).toBe(100);
    // Every dimension answered, only conversion perfect: the overall is conversion's 0.2 weight.
    expect(s.overall).toBe(20);
    const allZero = scoreProfile(base({ answers: allAnswers(0) }));
    expect(allZero.overall).toBe(0);
    expect(allZero.band?.key).toBe("fragile");
  });

  it("bands at the documented boundaries", () => {
    expect(bandFor(39).key).toBe("fragile");
    expect(bandFor(40).key).toBe("early");
    expect(bandFor(59).key).toBe("early");
    expect(bandFor(60).key).toBe("solid");
    expect(bandFor(74).key).toBe("solid");
    expect(bandFor(75).key).toBe("compounding");
  });

  it("clamps out-of-range answers and ignores unknown question ids", () => {
    const p = base({ answers: { pos_what: 99, pos_who: -5, nope: 3 } });
    const d = scoreProfile(p).dimensions.find((x) => x.id === "positioning")!;
    expect(d.earned).toBe(3);
    expect(d.answered).toBe(2);
  });
});

describe("findings", () => {
  it("produces nothing when nothing has been answered", () => {
    expect(findings(base())).toHaveLength(0);
  });

  it("fires on weak answers and orders by unlocked score", () => {
    const p = base({ answers: { con_cta: 0, con_fold: 0, con_contact: 0, pos_what: 0, pos_who: 0, pos_why: 0 } });
    const f = findings(p);
    expect(f.length).toBeGreaterThan(2);
    expect(f.map((x) => x.id)).toContain("con-cta");
    expect(f.every((x) => x.evidence === "inferred")).toBe(true);
    const unlocks = f.map((x) => x.unlocks);
    expect(unlocks).toEqual([...unlocks].sort((a, b) => b - a));
  });

  it("never reports a measured finding without supplied HTML", () => {
    const p = base({ answers: allAnswers(0) });
    expect(findings(p).some((f) => f.evidence === "measured")).toBe(false);
  });

  it("reports measured findings from supplied HTML", () => {
    const html = "<html><head><title>Hi</title></head><body><h1>A</h1><h1>B</h1><img src=x></body></html>";
    const p = base({ answers: allAnswers(3), site: extractSiteFacts(html) });
    const ids = findings(p).map((f) => f.id);
    expect(ids).toContain("site-viewport");
    expect(ids).toContain("site-alt");
    expect(ids).toContain("site-h1");
    expect(findings(p).every((f) => f.evidence === "measured")).toBe(true);
  });
});

describe("roadmap", () => {
  it("splits work into three windows and never duplicates a finding", () => {
    const p = base({ answers: allAnswers(0) });
    const stages = roadmap(p);
    expect(stages.map((s) => s.window)).toEqual(["30 days", "60 days", "90 days"]);
    const ids = stages.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(stages[0].items.every((i) => i.effort === "S")).toBe(true);
  });
});

describe("leverage", () => {
  it("ranks dimensions by weight times distance from perfect", () => {
    const p = base({ answers: { ...allAnswers(0), con_cta: 3, con_fold: 3, con_steps: 3, con_contact: 3 } });
    const l = leverage(p);
    expect(l.every((x) => x.gain >= 0)).toBe(true);
    const gains = l.map((x) => x.gain);
    expect(gains).toEqual([...gains].sort((a, b) => b - a));
    expect(l.some((x) => x.id === "conversion")).toBe(false);
  });
});

describe("extractSiteFacts", () => {
  const html = `<!doctype html><html><head>
    <title>Custom textile embroidery in Karachi | Stitch Co</title>
    <meta name="description" content="Small-batch embroidery for uniforms and hotels.">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head><body>
    <h1>Embroidery for uniforms</h1><h2>How it works</h2>
    <p>Call us on +92 300 1234567 or email hello@stitch.co from 25 PKR per piece.</p>
    <form action="/q"><input name="a"></form>
    <img src="a.jpg" alt="Finished uniform"><img src="b.jpg">
    <a href="https://instagram.com/stitchco">Instagram</a>
    <a href="mailto:hello@stitch.co">Email</a>
  </body></html>`;

  it("extracts the facts a finding can be built on", () => {
    const f = extractSiteFacts(html, "https://stitch.co");
    expect(f.title).toBe("Custom textile embroidery in Karachi | Stitch Co");
    expect(f.titleLength).toBeGreaterThan(15);
    expect(f.metaDescription).toContain("Small-batch");
    expect(f.h1).toEqual(["Embroidery for uniforms"]);
    expect(f.h2Count).toBe(1);
    expect(f.viewportMeta).toBe(true);
    expect(f.hasForm).toBe(true);
    expect(f.hasPhone).toBe(true);
    expect(f.hasEmail).toBe(true);
    expect(f.imageCount).toBe(2);
    expect(f.imagesMissingAlt).toBe(1);
    expect(f.socialLinks).toContain("instagram");
    expect(f.mentionsPrice).toBe(true);
    expect(f.wordCount).toBeGreaterThan(10);
    expect(f.source).toBe("supplied-html");
  });

  it("is deterministic", () => {
    expect(extractSiteFacts(html)).toEqual(extractSiteFacts(html));
  });

  it("handles empty and malformed input without throwing", () => {
    for (const bad of ["", "<html", "no tags here", "<title></title>"]) {
      expect(() => extractSiteFacts(bad)).not.toThrow();
    }
    expect(extractSiteFacts("").h1).toEqual([]);
    expect(extractSiteFacts("").titleLength).toBe(0);
  });
});

describe("dimension weights", () => {
  it("sum to one so the overall score is on the same scale as a dimension", () => {
    const total = DIMENSIONS.reduce((s, d) => s + d.weight, 0);
    expect(Math.round(total * 100)).toBe(100);
  });

  it("every question belongs to a real dimension and every dimension has questions", () => {
    for (const q of QUESTIONS) expect(DIMENSIONS.some((d) => d.id === q.dimension)).toBe(true);
    for (const d of DIMENSIONS) expect(QUESTIONS.filter((q) => q.dimension === d.id).length).toBeGreaterThanOrEqual(3);
  });
});
