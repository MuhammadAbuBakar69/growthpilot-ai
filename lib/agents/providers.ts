/**
 * One provider interface, three implementations: OpenAI, Gemini, and an explicit unavailable state.
 *
 * The unavailable path matters as much as the working ones. No key configured, a provider that does not
 * answer, or a schema that does not validate must all produce a labelled failure the UI can render as
 * "AI analysis unavailable, here is the deterministic report instead". Nothing here ever returns
 * invented content to fill a gap.
 */
import { validate, type JsonSchema, type ValidationResult } from "./contracts";

export class ProviderUnavailable extends Error {
  readonly code = "provider_unavailable";
  constructor(reason: string) {
    super(reason);
    this.name = "ProviderUnavailable";
  }
}

export class ProviderError extends Error {
  readonly code = "provider_error";
  readonly status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
  }
}

export interface ProviderConfig {
  provider: "openai" | "gemini";
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface CompletionRequest {
  system: string;
  user: string;
  schema?: JsonSchema;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface Usage { inputTokens: number; outputTokens: number }

export interface CompletionResult {
  text: string;
  usage: Usage;
  provider: string;
  model: string;
  attempts: number;
}

export interface Provider {
  readonly id: string;
  readonly model: string;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}

export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

const DEFAULT_TIMEOUT = 45_000;
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Reads configuration from the environment. Returns null when nothing is configured, never a placeholder. */
export function resolveConfig(env: Record<string, string | undefined>): ProviderConfig | null {
  const openai = env.OPENAI_API_KEY?.trim();
  if (openai) {
    return { provider: "openai", apiKey: openai, model: env.OPENAI_MODEL?.trim() || "gpt-4o-mini", baseUrl: env.OPENAI_BASE_URL?.trim() };
  }
  const gemini = env.GEMINI_API_KEY?.trim();
  if (gemini) {
    return { provider: "gemini", apiKey: gemini, model: env.GEMINI_MODEL?.trim() || "gemini-2.5-flash" };
  }
  return null;
}

export function createProvider(config: ProviderConfig | null, deps: { fetch?: Fetcher } = {}): Provider {
  if (!config || !config.apiKey.trim()) {
    return {
      id: "unavailable",
      model: "none",
      complete: async () => {
        throw new ProviderUnavailable("No model provider is configured. Deterministic analysis only.");
      },
    };
  }
  const fetcher: Fetcher = deps.fetch ?? ((input, init) => fetch(input, init));
  const base = config.provider === "openai" ? (config.baseUrl ?? "https://api.openai.com/v1") : "https://generativelanguage.googleapis.com/v1beta";

  const attempt = async (req: CompletionRequest): Promise<CompletionResult> => {
    const timeout = req.timeoutMs ?? DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const url =
        config.provider === "openai"
          ? `${base}/chat/completions`
          : `${base}/models/${encodeURIComponent(config.model)}:generateContent`;
      const body =
        config.provider === "openai"
          ? {
              model: config.model,
              temperature: req.temperature ?? 0.2,
              max_tokens: req.maxTokens ?? 2000,
              ...(req.schema ? { response_format: { type: "json_object" } } : {}),
              messages: [
                { role: "system", content: req.system },
                { role: "user", content: req.user },
              ],
            }
          : {
              systemInstruction: { parts: [{ text: req.system }] },
              contents: [{ role: "user", parts: [{ text: req.user }] }],
              generationConfig: {
                temperature: req.temperature ?? 0.2,
                maxOutputTokens: req.maxTokens ?? 2000,
                ...(req.schema ? { responseMimeType: "application/json" } : {}),
              },
            };
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (config.provider === "openai") headers.authorization = `Bearer ${config.apiKey}`;
      else headers["x-goog-api-key"] = config.apiKey;

      const res = await fetcher(url, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new ProviderError(`${config.provider} responded ${res.status}: ${detail.slice(0, 200)}`, res.status);
      }
      const json = (await res.json()) as Record<string, unknown>;
      const text =
        config.provider === "openai"
          ? String((((json.choices as { message?: { content?: string } }[])?.[0]?.message?.content) ?? ""))
          : String((((json.candidates as { content?: { parts?: { text?: string }[] } }[])?.[0]?.content?.parts ?? [])
              .map((p) => p.text ?? "")
              .join("")));
      if (!text.trim()) throw new ProviderError("Provider returned an empty completion", 502);

      const usageRaw = (json.usage ?? (json.usageMetadata as Record<string, number> | undefined) ?? {}) as Record<string, number>;
      const usage: Usage = {
        inputTokens: Number(usageRaw.prompt_tokens ?? usageRaw.promptTokenCount ?? 0),
        outputTokens: Number(usageRaw.completion_tokens ?? usageRaw.candidatesTokenCount ?? 0),
      };
      return { text, usage, provider: config.provider, model: config.model, attempts: 0 };
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    id: config.provider,
    model: config.model,
    async complete(req) {
      const maxRetries = req.maxRetries ?? 2;
      let lastError: unknown;
      for (let i = 0; i <= maxRetries; i += 1) {
        try {
          const result = await attempt(req);
          return { ...result, attempts: i + 1 };
        } catch (error) {
          lastError = error;
          const status = error instanceof ProviderError ? error.status : 0;
          const retryable = status === 0 || RETRYABLE.has(status);
          if (!retryable || i === maxRetries) break;
          // Jittered exponential backoff: 400ms, 1200ms, 3600ms plus up to 200ms of jitter.
          await sleep(400 * 3 ** i + Math.random() * 200);
        }
      }
      if (lastError instanceof ProviderError || lastError instanceof ProviderUnavailable) throw lastError;
      const reason = lastError instanceof Error ? lastError.message : String(lastError);
      throw new ProviderError(reason.includes("abort") ? "Provider timed out" : reason, 0);
    },
  };
}

/**
 * Validated completion: parse, then check against the agent's output schema, then return. A model answer
 * that does not satisfy the contract is an error, not a finding. Repairs are never attempted by guessing.
 */
export async function completeStructured<T>(
  provider: Provider,
  req: CompletionRequest & { schema: JsonSchema },
): Promise<ValidationResult<T> & { usage: Usage; raw: string }> {
  const result = await provider.complete(req);
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, ""));
  } catch {
    return {
      ok: false,
      errors: ["response was not valid JSON"],
      usage: result.usage,
      raw: result.text.slice(0, 400),
    };
  }
  const checked = validate<T>(parsed, req.schema);
  return { ...checked, usage: result.usage, raw: result.text.slice(0, 400) };
}
