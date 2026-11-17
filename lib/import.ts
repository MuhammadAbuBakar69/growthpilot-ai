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
 */

export interface MergeResult {
  toWrite: Profile[];
  added: number;
  duplicated: number;
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

let counter = 0;
const newId = (): string => {
  counter += 1;
  return `imported-${counter}`;
};

export function mergeImport(current: Profile[], incoming: Profile[], now = new Date()): MergeResult {
  const byId = new Map(current.map((p) => [p.id, p]));
  const taken = new Set(current.map((p) => p.id));
  const toWrite: Profile[] = [];
  let added = 0;
  let duplicated = 0;
  let identical = 0;

  for (const record of incoming) {
    const local = byId.get(record.id);
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
    let id = newId();
    while (taken.has(id)) id = newId();
    taken.add(id);
    toWrite.push({
      ...record,
      id,
      name: `${record.name} (imported)`,
      createdAt: record.createdAt,
      updatedAt: now.toISOString(),
    });
    duplicated += 1;
  }

  return { toWrite, added, duplicated, identical };
}

export function describeMerge(result: MergeResult): string {
  const parts: string[] = [];
  if (result.added) parts.push(`${result.added} added`);
  if (result.duplicated) parts.push(`${result.duplicated} kept as a copy because the id already existed`);
  if (result.identical) parts.push(`${result.identical} already identical`);
  if (!parts.length) return "Nothing to import.";
  return `Imported: ${parts.join(", ")}. Nothing was overwritten.`;
}
