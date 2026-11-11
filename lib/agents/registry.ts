/**
 * Agent registry. Ten specs, each a declarative record rather than a class: the runtime reads these to
 * build a request, so an agent cannot quietly acquire a tool, a model or an output shape it was not
 * given here. Nothing in this file calls a model.
 */
import { FINDINGS_OUTPUT_SCHEMA, type JsonSchema } from "./contracts";

export type AgentId =
  | "business_intelligence"
  | "website_analysis"
  | "seo_intelligence"
  | "marketing_strategy"
  | "social_intelligence"
  | "acquisition"
  | "competitor_intelligence"
  | "growth_planning"
  | "performance_evaluation"
  | "growth_manager";

export type ExecutionStatus = "declared" | "ready" | "unavailable";

export interface ModelConfig {
  provider: "openai" | "gemini" | "fake";
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AgentSpec {
  id: AgentId;
  name: string;
  responsibility: string;
  system: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  /** Allowlisted tool names. An empty list means the agent reasons over supplied context only. */
  tools: string[];
  model: ModelConfig;
  timeoutMs: number;
  maxRetries: number;
  status: ExecutionStatus;
}

const CONTEXT_INPUT: JsonSchema = {
  type: "object",
  required: ["business"],
  properties: {
    business: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 1 },
        industry: { type: "string" },
        description: { type: "string" },
        audience: { type: "string" },
        offer: { type: "string" },
        goal: { type: "string" },
      },
    },
    evidence: { type: "array", items: { type: "string" } },
  },
};

const spec = (s: Omit<AgentSpec, "status" | "maxRetries"> & { maxRetries?: number }): AgentSpec => ({
  status: "declared",
  maxRetries: s.maxRetries ?? 2,
  ...s,
});

const BASE_SYSTEM = `You are one specialist in a business growth analysis. Rules that are not negotiable:
1. Every finding must cite evidence supplied in the input, verbatim. No evidence, no finding.
2. If the input cannot support a confident finding, set insufficient_data true and explain what is missing.
3. Never invent metrics, competitors, customers, reviews or traffic figures.
4. Recommendations must be executable by the owner alone, without hiring.
5. Return only the JSON object described by the schema. No prose around it.`;

export const AGENTS: Record<AgentId, AgentSpec> = {
  business_intelligence: spec({
    id: "business_intelligence", name: "Business Intelligence",
    responsibility: "Identify what the business sells, to whom, and where the model leaks value.",
    system: `${BASE_SYSTEM}\nFocus: positioning and business model fit. Ignore channel tactics.`,
    inputSchema: CONTEXT_INPUT, outputSchema: FINDINGS_OUTPUT_SCHEMA, tools: [],
    model: { provider: "gemini", model: "gemini-2.5-flash", temperature: 0.2, maxTokens: 2000 },
    timeoutMs: 45_000,
  }),
  website_analysis: spec({
    id: "website_analysis", name: "Website Analysis",
    responsibility: "Turn parsed page facts into conversion and clarity findings.",
    system: `${BASE_SYSTEM}\nFocus only on facts measured from the page. Quote them exactly. Treat missing facts as missing, not as failures.`,
    inputSchema: {
      type: "object", required: ["business", "siteFacts"],
      properties: { ...CONTEXT_INPUT.properties, siteFacts: { type: "object", required: [] } },
    },
    outputSchema: FINDINGS_OUTPUT_SCHEMA, tools: [],
    model: { provider: "gemini", model: "gemini-2.5-flash", temperature: 0.2, maxTokens: 2200 },
    timeoutMs: 45_000,
  }),
  seo_intelligence: spec({
    id: "seo_intelligence", name: "SEO Intelligence",
    responsibility: "Judge findability from titles, headings, text volume and structure.",
    system: `${BASE_SYSTEM}\nFocus on what search engines can read. No keyword-volume claims without data.`,
    inputSchema: CONTEXT_INPUT, outputSchema: FINDINGS_OUTPUT_SCHEMA, tools: [],
    model: { provider: "gemini", model: "gemini-2.5-flash", temperature: 0.2, maxTokens: 1800 },
    timeoutMs: 45_000,
  }),
  marketing_strategy: spec({
    id: "marketing_strategy", name: "Marketing Strategy",
    responsibility: "Choose the two or three moves that fit this owner's time and goal.",
    system: `${BASE_SYSTEM}\nFocus on sequence and leverage. Reject anything this owner cannot run weekly.`,
    inputSchema: CONTEXT_INPUT, outputSchema: FINDINGS_OUTPUT_SCHEMA, tools: [],
    model: { provider: "gemini", model: "gemini-2.5-pro", temperature: 0.3, maxTokens: 2400 },
    timeoutMs: 60_000,
  }),
  social_intelligence: spec({
    id: "social_intelligence", name: "Social Media Intelligence",
    responsibility: "Assess social presence from authorised analytics or public observations only.",
    system: `${BASE_SYSTEM}\nNever assume a metric a platform does not expose. State unavailability plainly.`,
    inputSchema: CONTEXT_INPUT, outputSchema: FINDINGS_OUTPUT_SCHEMA, tools: [],
    model: { provider: "gemini", model: "gemini-2.5-flash", temperature: 0.2, maxTokens: 1800 },
    timeoutMs: 45_000,
  }),
  acquisition: spec({
    id: "acquisition", name: "Customer Acquisition",
    responsibility: "Define the ideal customer and the cheapest repeatable route to them.",
    system: `${BASE_SYSTEM}\nNever fabricate companies, contacts or intent. Describe the profile, not invented leads.`,
    inputSchema: CONTEXT_INPUT, outputSchema: FINDINGS_OUTPUT_SCHEMA, tools: [],
    model: { provider: "gemini", model: "gemini-2.5-flash", temperature: 0.25, maxTokens: 2000 },
    timeoutMs: 45_000,
  }),
  competitor_intelligence: spec({
    id: "competitor_intelligence", name: "Competitor Intelligence",
    responsibility: "Compare positioning against named competitors that were supplied.",
    system: `${BASE_SYSTEM}\nOnly use competitors present in the input. Inventing a competitor is a failure.`,
    inputSchema: CONTEXT_INPUT, outputSchema: FINDINGS_OUTPUT_SCHEMA, tools: [],
    model: { provider: "gemini", model: "gemini-2.5-flash", temperature: 0.2, maxTokens: 1800 },
    timeoutMs: 45_000,
  }),
  growth_planning: spec({
    id: "growth_planning", name: "Growth Planning",
    responsibility: "Sequence validated findings into a 30/60/90 plan with dependencies.",
    system: `${BASE_SYSTEM}\nPlan only from findings already validated. Every task needs a success criterion.`,
    inputSchema: {
      type: "object", required: ["business", "findings"],
      properties: { ...CONTEXT_INPUT.properties, findings: { type: "array", items: { type: "object", required: [] } } },
    },
    outputSchema: FINDINGS_OUTPUT_SCHEMA, tools: [],
    model: { provider: "gemini", model: "gemini-2.5-pro", temperature: 0.2, maxTokens: 2600 },
    timeoutMs: 60_000,
  }),
  performance_evaluation: spec({
    id: "performance_evaluation", name: "Performance Evaluation",
    responsibility: "Judge whether completed work moved a metric, and say so plainly.",
    system: `${BASE_SYSTEM}\nNever infer improvement without before and after measurements.`,
    inputSchema: CONTEXT_INPUT, outputSchema: FINDINGS_OUTPUT_SCHEMA, tools: [],
    model: { provider: "gemini", model: "gemini-2.5-flash", temperature: 0.1, maxTokens: 1600 },
    timeoutMs: 45_000,
  }),
  growth_manager: spec({
    id: "growth_manager", name: "Central Growth Manager",
    responsibility: "Choose which specialists run, reconcile their conflicts, produce one diagnosis.",
    system: `${BASE_SYSTEM}
You coordinate specialists and never invent their output.
6. Drop any finding whose evidence is not present in the supplied results.
7. When two specialists conflict, keep the one with evidence and note the conflict.
8. Never call another agent: the runtime decides which agents run, not you.`,
    inputSchema: {
      type: "object", required: ["business", "specialistResults"],
      properties: { ...CONTEXT_INPUT.properties, specialistResults: { type: "array", items: { type: "object", required: [] } } },
    },
    outputSchema: FINDINGS_OUTPUT_SCHEMA,
    tools: [], // the manager resolves, it does not fetch; orchestration lives in the runtime
    model: { provider: "gemini", model: "gemini-2.5-pro", temperature: 0.15, maxTokens: 3200 },
    timeoutMs: 90_000, maxRetries: 1,
  }),
};

export const AGENT_IDS = Object.keys(AGENTS) as AgentId[];

export const getAgent = (id: AgentId): AgentSpec => AGENTS[id];

/** Which specialists a request needs, given the data that actually exists. */
export function planAgents(input: { hasSiteFacts: boolean; hasSocialData: boolean; hasCompetitors: boolean }): AgentId[] {
  const chosen: AgentId[] = ["business_intelligence"];
  if (input.hasSiteFacts) chosen.push("website_analysis", "seo_intelligence");
  if (input.hasCompetitors) chosen.push("competitor_intelligence");
  if (input.hasSocialData) chosen.push("social_intelligence");
  chosen.push("marketing_strategy", "acquisition", "growth_planning");
  chosen.push("growth_manager");
  return chosen;
}
