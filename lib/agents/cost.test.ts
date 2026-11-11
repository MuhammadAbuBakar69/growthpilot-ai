import { describe, expect, it } from "vitest";
import { charge, emptyLedger, estimateCost } from "./cost";

describe("cost accounting", () => {
  it("prices known models per million tokens", () => {
    expect(estimateCost("gpt-4o-mini", { inputTokens: 1_000_000, outputTokens: 0 })).toBeCloseTo(0.15, 6);
    expect(estimateCost("gemini-2.5-pro", { inputTokens: 0, outputTokens: 1_000_000 })).toBeCloseTo(10, 6);
  });

  it("refuses to price an unknown model rather than assuming zero", () => {
    expect(estimateCost("mystery-model-9", { inputTokens: 10, outputTokens: 10 })).toBeNull();
  });

  it("accumulates a ledger and blocks the run that would cross the budget", () => {
    const first = charge(emptyLedger(), "gpt-4o-mini", { inputTokens: 1000, outputTokens: 500 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.ledger.runs).toBe(1);
    expect(first.ledger.costUsd).toBeGreaterThan(0);

    const over = charge(first.ledger, "gpt-4o-mini", { inputTokens: 10_000_000, outputTokens: 0 });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.error).toMatch(/Token budget exceeded/);
  });

  it("refuses an unpriced model inside charge as well", () => {
    const result = charge(emptyLedger(), "mystery-model-9", { inputTokens: 1, outputTokens: 1 });
    expect(result.ok).toBe(false);
  });
});
