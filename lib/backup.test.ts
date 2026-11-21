import { describe, expect, it } from "vitest";
import {
  BACKUP_STALE_DAYS,
  BACKUP_THRESHOLD,
  backupPrompt,
  backupSummary,
  dismissReminder,
  emptyBackupState,
  markExported,
  normaliseBackupState,
  recordChange,
} from "./backup";

const at = (iso: string) => new Date(iso);

describe("backup state", () => {
  it("counts a change without ever mutating the input", () => {
    const before = { ...emptyBackupState };
    const after = recordChange(before);
    expect(after.changesSinceExport).toBe(1);
    expect(before.changesSinceExport).toBe(0);
  });

  it("clears the outstanding count when an export completes", () => {
    let state = emptyBackupState;
    for (let i = 0; i < 4; i += 1) state = recordChange(state);
    const exported = markExported(at("2026-11-21T09:00:00Z"));
    expect(exported.changesSinceExport).toBe(0);
    expect(exported.lastExportAt).toBe("2026-11-21T09:00:00.000Z");
  });

  it("survives a corrupt stored record instead of throwing", () => {
    expect(normaliseBackupState(null)).toEqual(emptyBackupState);
    expect(normaliseBackupState("nonsense")).toEqual(emptyBackupState);
    expect(normaliseBackupState({ lastExportAt: "not-a-date", changesSinceExport: -7 })).toEqual({
      lastExportAt: null,
      changesSinceExport: 0,
      dismissedAtChanges: null,
    });
  });
});

describe("when to remind", () => {
  const now = at("2026-11-21T09:00:00Z");

  it("stays silent when there is nothing saved", () => {
    expect(backupPrompt(emptyBackupState, 0, now).level).toBe("none");
  });

  it("speaks up when work has never been exported", () => {
    const prompt = backupPrompt(emptyBackupState, 1, now);
    expect(prompt.level).toBe("suggest");
    expect(prompt.text).toContain("only in this browser");
  });

  it("pluralises for several businesses", () => {
    expect(backupPrompt(emptyBackupState, 3, now).text).toContain("These 3 businesses");
  });

  it("stays quiet right after a successful export", () => {
    const state = markExported(now);
    expect(backupPrompt(state, 1, now).level).toBe("none");
  });

  it("reminds once enough changes have piled up", () => {
    let state = markExported(at("2026-11-20T09:00:00Z"));
    for (let i = 0; i < BACKUP_THRESHOLD - 1; i += 1) state = recordChange(state);
    expect(backupPrompt(state, 1, now).level).toBe("none");

    state = recordChange(state);
    const prompt = backupPrompt(state, 1, now);
    expect(prompt.level).toBe("suggest");
    expect(prompt.text).toContain(String(BACKUP_THRESHOLD));
  });

  it("reminds about an old export that has changes behind it", () => {
    const state = recordChange(markExported(at("2026-10-01T09:00:00Z")));
    const prompt = backupPrompt(state, 1, now);
    expect(prompt.level).toBe("suggest");
    expect(prompt.text).toContain("days ago");
  });

  it("does not nag about an old export with nothing new in it", () => {
    const state = markExported(at("2026-10-01T09:00:00Z"));
    expect(backupPrompt(state, 1, now).level).toBe("none");
  });

  it("does not treat a corrupt timestamp as infinitely stale", () => {
    const state = normaliseBackupState({ lastExportAt: "garbage", changesSinceExport: 1 });
    // No valid export is on record, so this falls back to the never-exported message, not an age claim.
    const prompt = backupPrompt(state, 1, now);
    expect(prompt.level).toBe("suggest");
    expect(prompt.text).toContain("only in this browser");
  });
});

describe("summary line", () => {
  const now = at("2026-11-21T09:00:00Z");

  it("says never exported when there is no record", () => {
    expect(backupSummary(emptyBackupState, now)).toBe("Never exported");
  });

  it("reads naturally for today, yesterday and longer", () => {
    expect(backupSummary(markExported(now), now)).toBe("Exported today");
    expect(backupSummary(markExported(at("2026-11-20T09:00:00Z")), now)).toBe("Exported yesterday");
    expect(backupSummary(markExported(at("2026-11-14T09:00:00Z")), now)).toBe("Exported 7 days ago");
  });

  it("uses the stale window it advertises", () => {
    const older = new Date(now.getTime() - (BACKUP_STALE_DAYS + 1) * 86_400_000);
    expect(backupSummary(markExported(older), now)).toContain(`${BACKUP_STALE_DAYS + 1} days ago`);
  });
});

describe("dismissal is not a backup", () => {
  const now = at("2026-11-21T09:00:00Z");

  it("never records an export when the owner dismisses", () => {
    const state = dismissReminder(emptyBackupState);
    expect(state.lastExportAt).toBeNull();
    expect(backupSummary(state, now)).toBe("Never exported");
  });

  it("silences the reminder without pretending anything was saved", () => {
    const dismissed = dismissReminder(emptyBackupState);
    expect(backupPrompt(dismissed, 1, now).level).toBe("none");
  });

  it("speaks up again once real work piles up behind the dismissal", () => {
    let state = dismissReminder(emptyBackupState);
    for (let i = 0; i < BACKUP_THRESHOLD; i += 1) state = recordChange(state);
    expect(backupPrompt(state, 1, now).level).toBe("suggest");
  });

  it("clears the dismissal on a real export", () => {
    const state = markExported(now);
    expect(state.dismissedAtChanges).toBeNull();
  });
});
