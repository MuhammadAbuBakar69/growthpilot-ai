import { describe, expect, it } from "vitest";
import { FINDINGS_OUTPUT_SCHEMA, validate } from "./contracts";
import { AGENT_IDS, AGENTS, planAgents } from "./registry";

const finding = {
  title: "No visible price on the page",
  category: "conversion",
  severity: "high",
  evidence: ["Prices from 25 PKR per piece"],
  root_cause_hypothesis: "Price is quoted per order on a call",
  business_impact: "Buyers who need a range leave before enquiring",
  recommendation: "Publish a starting price next to the offer",
  implementation_steps: ["Add a from-price to the hero"],
  estimated_effort: "small",
  success_metrics: ["Enquiry rate"],
  confidence: 0.7,
};

describe("agent output contracts", () => {
  it("accepts a well formed structured output", () => {
    const result = validate({ findings: [finding], insufficient_data: false }, FINDINGS_OUTPUT_SCHEMA);
    expect(result.ok).toBe(true);
  });

  it("rejects a finding with no evidence instead of trusting it", () => {
    const result = validate({ findings: [{ ...finding, evidence: [] }], insufficient_data: false }, FINDINGS_OUTPUT_SCHEMA);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/evidence/);
  });

  it("rejects confidence outside 0-1 and unknown severity", () => {
    const bad = validate({ findings: [{ ...finding, confidence: 1.4 }], insufficient_data: false }, FINDINGS_OUTPUT_SCHEMA);
    expect(bad.ok).toBe(false);
    const severity = validate({ findings: [{ ...finding, severity: "catastrophic" }], insufficient_data: false }, FINDINGS_OUTPUT_SCHEMA);
    expect(severity.ok).toBe(false);
  });

  it("rejects unknown keys rather than silently dropping them", () => {
    const result = validate({ findings: [{ ...finding, invented_metric: "4.2x" }], insufficient_data: false }, FINDINGS_OUTPUT_SCHEMA);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/not in schema/);
  });

  it("requires the insufficient_data flag, so an empty result is a statement not an omission", () => {
    const result = validate({ findings: [] }, FINDINGS_OUTPUT_SCHEMA);
    expect(result.ok).toBe(false);
  });
});

describe("agent registry", () => {
  it("declares exactly the ten agents in the brief", () => {
    expect(AGENT_IDS).toHaveLength(10);
    expect(AGENT_IDS).toContain("growth_manager");
  });

  it("gives every agent an id that matches its key, rules and a model", () => {
    for (const id of AGENT_IDS) {
      const agent = AGENTS[id];
      expect(agent.id).toBe(id);
      expect(agent.system.length).toBeGreaterThan(200);
      expect(agent.system).toMatch(/No evidence, no finding/);
      expect(agent.model.provider).not.toBe("");
      expect(agent.timeoutMs).toBeGreaterThan(0);
    }
  });

  it("gives the growth manager no tools, because the runtime decides who runs", () => {
    expect(AGENTS.growth_manager.tools).toEqual([]);
    expect(AGENTS.growth_manager.system).toMatch(/Never call another agent/);
  });

  it("plans specialists from the data that actually exists", () => {
    const bare = planAgents({ hasSiteFacts: false, hasSocialData: false, hasCompetitors: false });
    expect(bare).toEqual([
      "business_intelligence", "marketing_strategy", "acquisition", "growth_planning", "growth_manager",
    ]);
    const full = planAgents({ hasSiteFacts: true, hasSocialData: true, hasCompetitors: true });
    expect(full).toContain("competitor_intelligence");
    expect(full).toContain("website_analysis");
    expect(full[full.length - 1]).toBe("growth_manager");
  });
});
