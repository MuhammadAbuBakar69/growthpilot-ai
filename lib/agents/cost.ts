/** Token accounting and an explicit price table, so spend is a number rather than a surprise. */
import type { Usage } from "./providers";

export interface Price { inputPerMillion: number; outputPerMillion: number; currency: "USD" }

/** Prices as published on 2026-11-11. Unknown models are refused rather than guessed at zero. */
export const PRICES: Record<string, Price> = {
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6, currency: "USD" },
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10, currency: "USD" },
  "gemini-2.5-flash": { inputPerMillion: 0.3, outputPerMillion: 2.5, currency: "USD" },
  "gemini-2.5-pro": { inputPerMillion: 1.25, outputPerMillion: 10, currency: "USD" },
};

export function estimateCost(model: string, usage: Usage): number | null {
  const price = PRICES[model];
  if (!price) return null;
  const cost = (usage.inputTokens / 1_000_000) * price.inputPerMillion + (usage.outputTokens / 1_000_000) * price.outputPerMillion;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export interface Budget { maxTokensPerRun: number; maxCostPerRunUsd: number }

export const DEFAULT_BUDGET: Budget = { maxTokensPerRun: 60_000, maxCostPerRunUsd: 0.25 };

export interface Ledger { runs: number; inputTokens: number; outputTokens: number; costUsd: number }

export const emptyLedger = (): Ledger => ({ runs: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 });

/** Returns the updated ledger, or an error when the next run would cross the budget. */
export function charge(
  ledger: Ledger,
  model: string,
  usage: Usage,
  budget: Budget = DEFAULT_BUDGET,
): { ok: true; ledger: Ledger } | { ok: false; error: string } {
  const cost = estimateCost(model, usage);
  if (cost === null) return { ok: false, error: `No price configured for ${model}; refusing to record an unknown spend` };
  const next: Ledger = {
    runs: ledger.runs + 1,
    inputTokens: ledger.inputTokens + usage.inputTokens,
    outputTokens: ledger.outputTokens + usage.outputTokens,
    costUsd: Math.round((ledger.costUsd + cost) * 1_000_000) / 1_000_000,
  };
  if (next.inputTokens + next.outputTokens > budget.maxTokensPerRun) {
    return { ok: false, error: `Token budget exceeded: ${next.inputTokens + next.outputTokens}/${budget.maxTokensPerRun}` };
  }
  if (next.costUsd > budget.maxCostPerRunUsd) {
    return { ok: false, error: `Cost budget exceeded: $${next.costUsd}/$${budget.maxCostPerRunUsd}` };
  }
  return { ok: true, ledger: next };
}
