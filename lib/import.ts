import type { Profile } from "./engine";

/**
 * Import policy.
 *
 * Importing used to write every record straight into storage keyed by its own id, so a snapshot taken
 * from another browser silently replaced the business already open under that id. There was no prompt,
 * no diff and no copy left behind: an import could destroy the only version of a profile.
 *
 * The rule now: an id that is not present is added. An id that is present is never overwritten. If the
 * incoming record is byte-identical in substance it is skipped; if it differs, it is kept alongside the
 * local one under a new id and marked as an imported copy, so both survive and the user can choose.
 *
 * The same rule applies inside the file. Two exports pasted together, or a snapshot edited in a text
 * editor, can carry one id twice, and writing both under that key lets the second replace the first
 * while the summary reports two additions. A repeat is therefore treated exactly like a local collision.
 */

export interface MergeResult {
  toWrite: Profile[];
  added: number;
  /** Kept as a copy because the store already had that id. */
  duplicated: number;
  /** Kept as a copy because the file repeated that id. */
  repeated: number;
  identical: number;
}

const sameSubstance = (a: Profile, b: Profile): boolean =>
  a.name === b.name &&
  a.website === b.website &&
  a.industry === b.industry &&
  a.description === b.description &&
  a.audience === b.audience &&
  a.offer === b.offer &&
  a.goal === b.goal &&
  a.monthlyRevenue === b.monthlyRevenue &&
  JSON.stringify(a.answers ?? {}) === JSON.stringify(b.answers ?? {}) &&
  JSON.stringify(a.site ?? null) === JSON.stringify(b.site ?? null);

const IMPORTED_SUFFIX = " (imported)";

let counter = 0;
const newId = (): string => {
  counter += 1;
  return `imported-${counter}`;
};

/**
 * A record kept alongside another under a fresh id, so neither copy is lost.
 *
 * The name is marked once. Importing an already imported copy used to stack the suffix
 * ("Studio (imported) (imported) (imported)"), which made a real business look like a mistake.
 */
const copyOf = (record: Profile, now: Date, taken: Set<string>): Profile => {
  let id = newId();
  while (taken.has(id)) id = newId();
  taken.add(id);
  return {
    ...record,
    id,
    name: record.name.endsWith(IMPORTED_SUFFIX) ? record.name : `${record.name}${IMPORTED_SUFFIX}`,
    createdAt: record.createdAt,
    updatedAt: now.toISOString(),
  };
};

export function mergeImport(current: Profile[], incoming: Profile[], now = new Date()): MergeResult {
  const byId = new Map(current.map((p) => [p.id, p]));
  // Every id in play is reserved before any copy is named: the store's ids *and* the file's own ids,
  // including ones further down the file. A generated `imported-1` used to be handed out while the file
  // still carried a record under that same id, so two writes shared a key and the later one won silently,
  // which is the exact loss this policy exists to prevent.
  const taken = new Set(current.map((p) => p.id));
  for (const record of incoming) taken.add(record.id);
  // The first record seen for each id in this file, so a repeat can be compared and reported honestly.
  const seenIncoming = new Map<string, Profile>();
  const toWrite: Profile[] = [];
  let added = 0;
  let duplicated = 0;
  let repeated = 0;
  let identical = 0;

  for (const record of incoming) {
    const local = byId.get(record.id);
    const earlierInFile = seenIncoming.get(record.id);
    if (earlierInFile) {
      if (sameSubstance(earlierInFile, record)) {
        identical += 1;
        continue;
      }
      toWrite.push(copyOf(record, now, taken));
      repeated += 1;
      continue;
    }
    seenIncoming.set(record.id, record);
    if (!local) {
      toWrite.push(record);
      taken.add(record.id);
      added += 1;
      continue;
    }
    if (sameSubstance(local, record)) {
      identical += 1;
      continue;
    }
    toWrite.push(copyOf(record, now, taken));
    duplicated += 1;
  }

  return { toWrite, added, duplicated, repeated, identical };
}

export function describeMerge(result: MergeResult): string {
  const parts: string[] = [];
  if (result.added) parts.push(`${result.added} added`);
  if (result.duplicated) parts.push(`${result.duplicated} kept as a copy because the id already existed`);
  if (result.repeated) parts.push(`${result.repeated} kept as a copy because the file repeated its id`);
  if (result.identical) parts.push(`${result.identical} already identical`);
  if (!parts.length) return "Nothing to import.";
  return `Imported: ${parts.join(", ")}. Nothing was overwritten.`;
}
