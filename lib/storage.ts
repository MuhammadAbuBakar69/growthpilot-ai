/**
 * Local persistence.
 *
 * There is no account, no server and no cookie: a business lives in this browser's IndexedDB until the
 * user exports it. That is a real trade - clear site data and it is gone - so every export is a
 * complete, re-importable JSON document rather than a partial dump, and the UI says where the data is.
 */
import { SCORING_VERSION, type Profile } from "./engine";

const DB_NAME = "growthpilot";
const STORE = "businesses";
const VERSION = 1;
const LS_KEY = "growthpilot.businesses.v1";

/**
 * The snapshot is a public contract: the moment someone exports a file, that file has to keep working
 * in a later build. It used to carry a version that nothing read, so the number was decoration.
 *
 * Rules now: we read any version up to ours and upcast it through explicit steps; we refuse a file
 * from a newer build with a reason instead of importing part of it and losing the rest; and we always
 * write the current version.
 */
export const SNAPSHOT_VERSION = 2;

export interface Snapshot {
  app: "growthpilot";
  version: number;
  exportedAt: string;
  businesses: Profile[];
}

/**
 * A version 1 file predates `scoringVersion`, so its answers were produced by the first weights. Marking
 * them as version 1 lets the overview say the score is stale; leaving the field absent would be read as
 * "unknown" and quietly treated as current.
 */
const upcastFromV1 = (business: Profile): Profile => ({
  ...business,
  scoringVersion: business.scoringVersion ?? 1,
});

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

const UNREADABLE_PREFIX = `${LS_KEY}.unreadable.`;

const looksLikeProfile = (value: unknown): value is Profile =>
  typeof value === "object" && value !== null && typeof (value as { id?: unknown }).id === "string";

/**
 * Saved data that cannot be parsed is the only copy of the user's work, so it is never discarded.
 *
 * Reading it as "no businesses" made a corrupt store look like a fresh install: the app offered a blank
 * setup screen and the next save wrote only that one record over the file, destroying everything else
 * without a word. The raw bytes are now copied to a recovery key before anything replaces them, and if
 * the copy cannot be written the write is refused outright. Losing the file is bad; overwriting it while
 * claiming it was empty is worse.
 */
const preserveUnreadable = (raw: string): string => {
  const key = `${UNREADABLE_PREFIX}${new Date().toISOString().replace(/[:.]/g, "-")}`;
  try {
    localStorage.setItem(key, raw);
    localStorage.removeItem(LS_KEY);
  } catch (error) {
    const failure = describeWriteFailure(error);
    throw new StorageWriteError(
      failure.code,
      "Saved data on this device could not be read, and there is no room to keep a copy, so nothing was written.",
    );
  }
  return key;
};

interface FallbackState {
  profiles: Profile[];
  unreadable: boolean;
}

const readFallbackState = (): FallbackState => {
  if (typeof localStorage === "undefined") return { profiles: [], unreadable: false };
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LS_KEY);
  } catch {
    return { profiles: [], unreadable: false };
  }
  if (!raw) return { profiles: [], unreadable: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    preserveUnreadable(raw);
    return { profiles: [], unreadable: true };
  }
  if (!Array.isArray(parsed)) {
    preserveUnreadable(raw);
    return { profiles: [], unreadable: true };
  }

  const readable = parsed.filter(looksLikeProfile);
  if (readable.length !== parsed.length) {
    preserveUnreadable(raw);
    return { profiles: readable, unreadable: true };
  }
  return { profiles: readable, unreadable: false };
};

const readFallback = (): Profile[] => readFallbackState().profiles;

/** Recovery keys written by `preserveUnreadable`, so the interface can say what was kept. */
export function unreadableBackups(): string[] {
  if (typeof localStorage === "undefined") return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(UNREADABLE_PREFIX)) keys.push(key);
    }
  } catch {
    return [];
  }
  return keys.sort();
}

/**
 * A write that did not happen is not a write.
 *
 * The first version swallowed both the IndexedDB failure and the localStorage fallback failure, so a
 * full or blocked store looked exactly like a successful save: the user kept typing into a UI that was
 * quietly discarding the work. Failures are now typed and surface in the interface.
 */
export class StorageWriteError extends Error {
  code: "quota" | "unavailable" | "unknown";
  constructor(code: "quota" | "unavailable" | "unknown", message: string) {
    super(message);
    this.name = "StorageWriteError";
    this.code = code;
  }
}

const describeWriteFailure = (error: unknown): StorageWriteError => {
  const name = (error as { name?: string } | null)?.name ?? "";
  const code = (error as { code?: number } | null)?.code;
  if (name === "QuotaExceededError" || code === 22 || code === 1014) {
    return new StorageWriteError("quota", "This browser is out of storage space for this site.");
  }
  if (name === "SecurityError" || name === "InvalidStateError") {
    return new StorageWriteError("unavailable", "This browser is blocking storage for this site.");
  }
  return new StorageWriteError("unknown", "The browser refused the write.");
};

const writeFallback = (profiles: Profile[]): void => {
  if (typeof localStorage === "undefined") {
    throw new StorageWriteError("unavailable", "No local storage is available in this browser.");
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(profiles));
  } catch (error) {
    throw describeWriteFailure(error);
  }
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
  const stamped: Profile = {
    ...profile,
    scoringVersion: SCORING_VERSION,
    updatedAt: new Date().toISOString(),
  };
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
  return { app: "growthpilot", version: SNAPSHOT_VERSION, exportedAt: new Date().toISOString(), businesses: profiles };
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
  const declaredVersion =
    typeof data === "object" && data !== null && !Array.isArray(data) && typeof (data as Snapshot).version === "number"
      ? (data as Snapshot).version
      : 1;
  if (declaredVersion > SNAPSHOT_VERSION) {
    return {
      ok: false,
      error: `That file was written by a newer version of this app (format ${declaredVersion}, this build reads up to ${SNAPSHOT_VERSION}). Update the app, then import it.`,
    };
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
      scoringVersion: typeof candidate.scoringVersion === "number" ? candidate.scoringVersion : undefined,
      createdAt: candidate.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  if (businesses.length === 0) return { ok: false, error: "No readable businesses in that file." };

  // Upcast in order, oldest first. Each step only fills what that format did not record.
  const migrated = declaredVersion < 2 ? businesses.map(upcastFromV1) : businesses;
  return { ok: true, businesses: migrated };
}

/**
 * Backup bookkeeping persistence.
 *
 * Kept in localStorage rather than IndexedDB: it is a single small record, it must be readable before the
 * database opens, and losing it is harmless (the worst case is one extra reminder). A failure here is
 * swallowed on purpose, unlike a business write, because the reminder is advisory and must never block
 * the work it is warning about.
 */
const BACKUP_KEY = "growthpilot.backup.v1";

export function readBackupState(): unknown {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeBackupState(state: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(state));
  } catch {
    // Advisory only. A browser that refuses this has already shown a harder failure elsewhere.
  }
}
