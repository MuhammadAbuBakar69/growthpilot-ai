import { describe, expect, it, vi } from "vitest";
import {
  completeStructured, createProvider, ProviderError, ProviderUnavailable, resolveConfig,
  type Fetcher, type ProviderConfig,
} from "./providers";
import { FINDINGS_OUTPUT_SCHEMA } from "./contracts";

const config: ProviderConfig = { provider: "openai", apiKey: "test-key", model: "gpt-4o-mini" };

const openaiBody = (content: string, status = 200) =>
  new Response(
    JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 120, completion_tokens: 80 } }),
    { status, headers: { "content-type": "application/json" } },
  );

describe("provider configuration", () => {
  it("returns null when no key is configured instead of inventing one", () => {
    expect(resolveConfig({})).toBeNull();
    expect(resolveConfig({ OPENAI_API_KEY: "   " })).toBeNull();
  });

  it("prefers OpenAI when both keys exist and honours model overrides", () => {
    expect(resolveConfig({ OPENAI_API_KEY: "a", GEMINI_API_KEY: "b" })?.provider).toBe("openai");
    expect(resolveConfig({ GEMINI_API_KEY: "b", GEMINI_MODEL: "gemini-2.5-pro" })?.model).toBe("gemini-2.5-pro");
  });

  it("fails honestly when asked to complete without a provider", async () => {
    const provider = createProvider(null);
    expect(provider.id).toBe("unavailable");
    await expect(provider.complete({ system: "s", user: "u" })).rejects.toBeInstanceOf(ProviderUnavailable);
  });
});

describe("retry and failure handling", () => {
  it("retries a 429 and succeeds, reporting the attempt count", async () => {
    const fetchMock = vi.fn<Fetcher>();
    fetchMock.mockResolvedValueOnce(openaiBody("rate limited", 429));
    fetchMock.mockResolvedValueOnce(openaiBody('{"findings":[],"insufficient_data":true}'));
    const provider = createProvider(config, { fetch: fetchMock });
    const result = await provider.complete({ system: "s", user: "u", maxRetries: 2 });
    expect(result.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 80 });
  });

  it("does not retry a 400, because the request itself is wrong", async () => {
    const fetchMock = vi.fn<Fetcher>().mockResolvedValue(openaiBody("bad request", 400));
    const provider = createProvider(config, { fetch: fetchMock });
    await expect(provider.complete({ system: "s", user: "u", maxRetries: 2 })).rejects.toBeInstanceOf(ProviderError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up on a timeout instead of waiting forever", async () => {
    const hanging: Fetcher = (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    const provider = createProvider(config, { fetch: hanging });
    await expect(
      provider.complete({ system: "s", user: "u", timeoutMs: 20, maxRetries: 0 }),
    ).rejects.toThrow(/timed out/i);
  });

  it("treats an empty completion as a provider error, not an empty answer", async () => {
    const provider = createProvider(config, {
      fetch: vi.fn<Fetcher>().mockResolvedValue(openaiBody("   ")),
    });
    await expect(provider.complete({ system: "s", user: "u", maxRetries: 0 })).rejects.toThrow(/empty completion/);
  });
});

describe("structured output", () => {
  it("parses a fenced JSON answer and validates it", async () => {
    const answer = { findings: [], insufficient_data: true, missing_data_notes: ["no site facts"] };
    const provider = createProvider(config, {
      fetch: vi.fn<Fetcher>().mockResolvedValue(openaiBody("```json\n" + JSON.stringify(answer) + "\n```")),
    });
    const result = await completeStructured(provider, { system: "s", user: "u", schema: FINDINGS_OUTPUT_SCHEMA });
    expect(result.ok).toBe(true);
    expect(result.usage.outputTokens).toBe(80);
  });

  it("rejects prose that is not JSON rather than salvaging it", async () => {
    const provider = createProvider(config, {
      fetch: vi.fn<Fetcher>().mockResolvedValue(openaiBody("Here are your findings: ...")),
    });
    const result = await completeStructured(provider, { system: "s", user: "u", schema: FINDINGS_OUTPUT_SCHEMA });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/not valid JSON/);
  });

  it("rejects schema-breaking JSON at the boundary", async () => {
    const provider = createProvider(config, {
      fetch: vi.fn<Fetcher>().mockResolvedValue(openaiBody('{"findings":[{"title":"too short"}],"insufficient_data":false}')),
    });
    const result = await completeStructured(provider, { system: "s", user: "u", schema: FINDINGS_OUTPUT_SCHEMA });
    expect(result.ok).toBe(false);
  });
});
