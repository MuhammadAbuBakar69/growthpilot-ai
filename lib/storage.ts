/**
 * Local persistence.
 *
 * There is no account, no server and no cookie: a business lives in this browser's IndexedDB until the
 * user exports it. That is a real trade - clear site data and it is gone - so every export is a
 * complete, re-importable JSON document rather than a partial dump, and the UI says where the data is.
 */
import type { Profile } from "./engine";

const DB_NAME = "growthpilot";
const STORE = "businesses";
const VERSION = 1;
const LS_KEY = "growthpilot.businesses.v1";

export interface Snapshot {
  app: "growthpilot";
  version: 1;
  exportedAt: string;
  businesses: Profile[];
}

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb-unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb-failed"));
  });

const readFallback = (): Profile[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Profile[]) : [];
  } catch {
    return [];
  }
};

const writeFallback = (profiles: Profile[]): void => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(profiles));
};

export async function listProfiles(): Promise<Profile[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as Profile[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return readFallback().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  const stamped: Profile = { ...profile, updatedAt: new Date().toISOString() };
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(stamped);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    const rest = readFallback().filter((p) => p.id !== stamped.id);
    writeFallback([...rest, stamped]);
  }
}

export async function deleteProfile(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    writeFallback(readFallback().filter((p) => p.id !== id));
  }
}

export function toSnapshot(profiles: Profile[]): Snapshot {
  return { app: "growthpilot", version: 1, exportedAt: new Date().toISOString(), businesses: profiles };
}

/**
 * Accepts a snapshot this app wrote, or a bare array of businesses. Validates before writing: a
 * half-parsed import that silently drops fields is worse than a refusal that says why.
 */
export function parseSnapshot(raw: string): { ok: true; businesses: Profile[] } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  const list = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null && Array.isArray((data as Snapshot).businesses)
      ? (data as Snapshot).businesses
      : null;
  if (!list) return { ok: false, error: "No businesses array found in that file." };

  const businesses: Profile[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) continue;
    const candidate = item as Partial<Profile>;
    if (typeof candidate.id !== "string" || typeof candidate.name !== "string") continue;
    businesses.push({
      id: candidate.id,
      name: candidate.name,
      website: candidate.website ?? "",
      industry: candidate.industry ?? "",
      description: candidate.description ?? "",
      audience: candidate.audience ?? "",
      offer: candidate.offer ?? "",
      goal: candidate.goal ?? "leads",
      monthlyRevenue: typeof candidate.monthlyRevenue === "number" ? candidate.monthlyRevenue : null,
      channels: Array.isArray(candidate.channels) ? candidate.channels.filter((c) => typeof c === "string") : [],
      answers: typeof candidate.answers === "object" && candidate.answers !== null ? candidate.answers : {},
      site: candidate.site ?? null,
      createdAt: candidate.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  if (businesses.length === 0) return { ok: false, error: "No readable businesses in that file." };
  return { ok: true, businesses };
}
