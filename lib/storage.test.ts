import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SCORING_VERSION, emptyProfile } from "./engine";
import { StorageWriteError, listProfiles, parseSnapshot, saveProfile } from "./storage";

/**
 * The fallback path is the one that matters here: in a browser without IndexedDB (private mode, some
 * webviews) every write goes through localStorage, and that is where a quota error used to disappear.
 */
const store = new Map<string, string>();

const fakeLocalStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", fakeLocalStorage);
  vi.stubGlobal("indexedDB", undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("local persistence", () => {
  it("persists a business and reads it back", async () => {
    await saveProfile({ ...emptyProfile(), id: "b1", name: "Stitch Co" });
    const rows = await listProfiles();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Stitch Co");
  });

  it("stamps the current scoring model on every write", async () => {
    await saveProfile({ ...emptyProfile(), id: "b2", name: "Stitch Co" });
    const [row] = await listProfiles();
    expect(row.scoringVersion).toBe(SCORING_VERSION);
  });

  it("reports a full store instead of pretending the save worked", async () => {
    vi.stubGlobal("localStorage", {
      ...fakeLocalStorage,
      setItem: () => {
        const error = new Error("full");
        error.name = "QuotaExceededError";
        throw error;
      },
    });
    const attempt = saveProfile({ ...emptyProfile(), id: "b3", name: "Stitch Co" });
    await expect(attempt).rejects.toBeInstanceOf(StorageWriteError);
    await expect(attempt).rejects.toMatchObject({ code: "quota" });
    expect(store.size).toBe(0);
  });

  it("distinguishes blocked storage from a full one", async () => {
    vi.stubGlobal("localStorage", {
      ...fakeLocalStorage,
      setItem: () => {
        const error = new Error("blocked");
        error.name = "SecurityError";
        throw error;
      },
    });
    await expect(saveProfile({ ...emptyProfile(), id: "b4", name: "Stitch Co" })).rejects.toMatchObject({
      code: "unavailable",
    });
  });
});

describe("snapshot import", () => {
  it("rejects a file that is not a GrowthPilot export", () => {
    expect(parseSnapshot('{"app":"something-else"}')).toMatchObject({ ok: false });
    expect(parseSnapshot("not json at all")).toMatchObject({ ok: false });
  });

  it("accepts a real export and keeps every business", () => {
    const snapshot = JSON.stringify({
      app: "growthpilot",
      version: 1,
      exportedAt: new Date().toISOString(),
      businesses: [{ ...emptyProfile(), id: "x1", name: "Stitch Co" }],
    });
    const parsed = parseSnapshot(snapshot);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.businesses[0].name).toBe("Stitch Co");
  });
});
