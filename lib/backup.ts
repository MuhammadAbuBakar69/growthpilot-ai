/**
 * Backup awareness.
 *
 * Export is the only copy of this work that survives the browser, but nothing in the product ever said so
 * at the moment it mattered. A user could answer forty questions, close the laptop and lose everything
 * while the interface gave no hint that a backup had never been taken.
 *
 * This module is deliberately pure: it decides *what to say* and nothing else. Persistence lives in
 * `storage.ts`, and every function here is total, so a missing or corrupt record can never throw.
 */

/** How many saved changes accumulate before the reminder is worth showing again. */
export const BACKUP_THRESHOLD = 5;

/** A backup older than this, with changes since, is worth mentioning even below the count threshold. */
export const BACKUP_STALE_DAYS = 14;

export interface BackupState {
  /** ISO instant of the last successful export, or null if one has never been taken. */
  lastExportAt: string | null;
  /** Saved changes since that export. Counts edits, not distinct businesses. */
  changesSinceExport: number;
  /**
   * Change count at which the owner dismissed the reminder, or null if never dismissed.
   *
   * Dismissal is not an export and must never be recorded as one: pretending a backup exists is the exact
   * failure this module is meant to prevent. It only buys quiet until real work piles up again.
   */
  dismissedAtChanges: number | null;
}

export const emptyBackupState: BackupState = { lastExportAt: null, changesSinceExport: 0, dismissedAtChanges: null };

/** Read a state back from storage without trusting its shape. */
export function normaliseBackupState(raw: unknown): BackupState {
  if (!raw || typeof raw !== "object") return { ...emptyBackupState };
  const value = raw as Partial<BackupState>;
  const changes =
    typeof value.changesSinceExport === "number" && Number.isFinite(value.changesSinceExport)
      ? Math.max(0, Math.floor(value.changesSinceExport))
      : 0;
  const stamp =
    typeof value.lastExportAt === "string" && !Number.isNaN(Date.parse(value.lastExportAt))
      ? value.lastExportAt
      : null;
  const dismissed =
    typeof value.dismissedAtChanges === "number" && Number.isFinite(value.dismissedAtChanges)
      ? Math.max(0, Math.floor(value.dismissedAtChanges))
      : null;
  return { lastExportAt: stamp, changesSinceExport: changes, dismissedAtChanges: dismissed };
}

/** A change was saved. */
export function recordChange(state: BackupState): BackupState {
  const current = normaliseBackupState(state);
  return { ...current, changesSinceExport: current.changesSinceExport + 1 };
}

/** An export completed, so nothing is outstanding. */
export function markExported(now: Date = new Date()): BackupState {
  return { lastExportAt: now.toISOString(), changesSinceExport: 0, dismissedAtChanges: null };
}

/** The owner saw the reminder and does not want it again yet. Records no export. */
export function dismissReminder(state: BackupState): BackupState {
  const current = normaliseBackupState(state);
  return { ...current, dismissedAtChanges: current.changesSinceExport };
}

export type BackupLevel = "none" | "suggest";

export interface BackupPrompt {
  level: BackupLevel;
  /** Ready to render. Empty when the level is "none". */
  text: string;
}

const NONE: BackupPrompt = { level: "none", text: "" };

const daysSince = (iso: string, now: Date): number => {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - then) / 86_400_000);
};

/**
 * Decide whether to remind the owner to export.
 *
 * Silence is the default: a reminder that fires constantly is ignored, and a reminder that fires when
 * there is nothing at stake teaches the user to dismiss it. It speaks up only when unsaved work exists
 * (never exported, a batch of changes, or a stale backup with changes behind it).
 */
export function backupPrompt(
  state: BackupState,
  businessCount: number,
  now: Date = new Date(),
): BackupPrompt {
  if (businessCount <= 0) return NONE;

  const current = normaliseBackupState(state);

  // A dismissal silences the reminder only until enough new work accumulates behind it.
  if (
    current.dismissedAtChanges !== null &&
    current.changesSinceExport - current.dismissedAtChanges < BACKUP_THRESHOLD
  ) {
    return NONE;
  }

  if (current.lastExportAt === null) {
    return {
      level: "suggest",
      text:
        businessCount === 1
          ? "This business exists only in this browser. Export a copy before you clear site data or switch devices."
          : `These ${businessCount} businesses exist only in this browser. Export a copy before you clear site data or switch devices.`,
    };
  }

  if (current.changesSinceExport >= BACKUP_THRESHOLD) {
    return {
      level: "suggest",
      text: `${current.changesSinceExport} changes since your last export on ${current.lastExportAt.slice(0, 10)}. Export to keep them.`,
    };
  }

  const age = daysSince(current.lastExportAt, now);
  if (age >= BACKUP_STALE_DAYS && current.changesSinceExport > 0) {
    return {
      level: "suggest",
      text: `Last export was ${age} days ago and you have changed things since. Export a fresh copy.`,
    };
  }

  return NONE;
}

/** Short human status for the data panel, always present, never alarmist. */
export function backupSummary(state: BackupState, now: Date = new Date()): string {
  const current = normaliseBackupState(state);
  if (current.lastExportAt === null) return "Never exported";
  const age = daysSince(current.lastExportAt, now);
  if (age <= 0) return "Exported today";
  if (age === 1) return "Exported yesterday";
  return `Exported ${age} days ago`;
}
