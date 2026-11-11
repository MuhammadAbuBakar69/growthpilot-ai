/**
 * The contract every agent output has to satisfy before anything downstream may use it.
 *
 * A model that returns plausible prose is not an analysis. These schemas are strict by default
 * (unknown keys rejected, required keys required) and validation never coerces: a missing confidence is
 * an error, not a zero. The point is that a malformed answer fails loudly at the boundary instead of
 * becoming a confident finding on a business owner's screen.
 */

export type SchemaType = "object" | "array" | "string" | "number" | "boolean";

export interface JsonSchema {
  type: SchemaType;
  description?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  enum?: readonly string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
}

export type ValidationResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const typeOf = (v: unknown): string =>
  v === null ? "null" : Array.isArray(v) ? "array" : typeof v;

function check(value: unknown, schema: JsonSchema, path: string, errors: string[]): void {
  const actual = typeOf(value);
  if (actual !== schema.type) {
    errors.push(`${path}: expected ${schema.type}, got ${actual}`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value as string)) {
    errors.push(`${path}: expected one of ${schema.enum.join(", ")}, got ${String(value)}`);
  }
  if (schema.type === "string") {
    const s = value as string;
    if (schema.minLength !== undefined && s.trim().length < schema.minLength) {
      errors.push(`${path}: shorter than ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && s.length > schema.maxLength) {
      errors.push(`${path}: longer than ${schema.maxLength} characters`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(s)) {
      errors.push(`${path}: does not match ${schema.pattern}`);
    }
  }
  if (schema.type === "number") {
    const n = value as number;
    if (!Number.isFinite(n)) errors.push(`${path}: not a finite number`);
    if (schema.minimum !== undefined && n < schema.minimum) errors.push(`${path}: below minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && n > schema.maximum) errors.push(`${path}: above maximum ${schema.maximum}`);
  }
  if (schema.type === "array") {
    const arr = value as unknown[];
    if (schema.minItems !== undefined && arr.length < schema.minItems) {
      errors.push(`${path}: needs at least ${schema.minItems} item(s)`);
    }
    if (schema.maxItems !== undefined && arr.length > schema.maxItems) {
      errors.push(`${path}: allows at most ${schema.maxItems} items`);
    }
    if (schema.items) arr.forEach((item, i) => check(item, schema.items as JsonSchema, `${path}[${i}]`, errors));
  }
  if (schema.type === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in obj)) errors.push(`${path}.${key}: required`);
    }
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (key in obj) check(obj[key], sub, `${path}.${key}`, errors);
    }
    if (schema.properties) {
      for (const key of Object.keys(obj)) {
        if (!(key in schema.properties)) errors.push(`${path}.${key}: not in schema`);
      }
    }
  }
}

export function validate<T = unknown>(value: unknown, schema: JsonSchema): ValidationResult<T> {
  const errors: string[] = [];
  check(value, schema, "$", errors);
  return errors.length === 0 ? { ok: true, value: value as T } : { ok: false, errors };
}

/** Structured output, as section 6 of the brief defines it. Nothing outside this shape may be stored. */
export const FINDING_SCHEMA: JsonSchema = {
  type: "object",
  required: [
    "title", "category", "severity", "evidence", "root_cause_hypothesis",
    "business_impact", "recommendation", "implementation_steps",
    "estimated_effort", "success_metrics", "confidence",
  ],
  properties: {
    title: { type: "string", minLength: 8, maxLength: 140 },
    category: {
      type: "string",
      enum: [
        "website", "seo", "positioning", "content", "social",
        "acquisition", "conversion", "competition", "retention", "efficiency",
      ],
    },
    severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
    evidence: { type: "array", items: { type: "string", minLength: 8 }, minItems: 1, maxItems: 12 },
    root_cause_hypothesis: { type: "string", minLength: 12 },
    business_impact: { type: "string", minLength: 12 },
    recommendation: { type: "string", minLength: 12 },
    implementation_steps: { type: "array", items: { type: "string", minLength: 4 }, minItems: 1, maxItems: 10 },
    estimated_effort: { type: "string", enum: ["small", "medium", "large"] },
    success_metrics: { type: "array", items: { type: "string", minLength: 4 }, minItems: 1, maxItems: 6 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
};

export const FINDINGS_OUTPUT_SCHEMA: JsonSchema = {
  type: "object",
  required: ["findings", "insufficient_data"],
  properties: {
    findings: { type: "array", items: FINDING_SCHEMA, minItems: 0, maxItems: 12 },
    // Section 6: when the evidence is not there, say so instead of scoring.
    insufficient_data: { type: "boolean" },
    missing_data_notes: { type: "array", items: { type: "string" }, maxItems: 8 },
  },
};

export interface AgentFinding {
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  evidence: string[];
  root_cause_hypothesis: string;
  business_impact: string;
  recommendation: string;
  implementation_steps: string[];
  estimated_effort: "small" | "medium" | "large";
  success_metrics: string[];
  confidence: number;
}

export interface FindingsOutput {
  findings: AgentFinding[];
  insufficient_data: boolean;
  missing_data_notes?: string[];
}
