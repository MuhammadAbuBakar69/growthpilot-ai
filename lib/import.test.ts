import { describe, expect, it } from "vitest";
import { describeMerge, mergeImport } from "./import";
import { emptyProfile, type Profile } from "./engine";

const profile = (over: Partial<Profile> = {}): Profile => ({
  ...emptyProfile(),
  id: "b1",
  name: "Stitch Co",
  website: "https://stitch.example",
  industry: "Textiles",
  ...over,
});

describe("import policy", () => {
  it("adds a business that is not present", () => {
    const result = mergeImport([], [profile()]);
    expect(result.added).toBe(1);
    expect(result.toWrite).toHaveLength(1);
    expect(result.toWrite[0].id).toBe("b1");
  });

  it("never overwrites a local business that shares an id", () => {
    const local = profile({ description: "the version I have been editing" });
    const incoming = profile({ description: "an older snapshot from another browser" });

    const result = mergeImport([local], [incoming]);

    expect(result.duplicated).toBe(1);
    expect(result.toWrite).toHaveLength(1);
    const written = result.toWrite[0];
    expect(written.id).not.toBe("b1");
    expect(written.name).toBe("Stitch Co (imported)");
    expect(written.description).toBe(incoming.description);
    // The local record is untouched because it was never in the write list.
    expect(result.toWrite.some((p) => p.id === local.id)).toBe(false);
  });

  it("skips a record that is identical in substance", () => {
    const local = profile();
    const result = mergeImport([local], [{ ...local, updatedAt: "2030-01-01T00:00:00.000Z" }]);
    expect(result.identical).toBe(1);
    expect(result.toWrite).toHaveLength(0);
  });

  it("treats differing answers and site facts as different substance", () => {
    const local = profile({ answers: { pos_1: 3 } });
    const incoming = profile({ answers: { pos_1: 0 } });
    expect(mergeImport([local], [incoming]).duplicated).toBe(1);
  });

  it("keeps every copy when two imports collide with each other", () => {
    const first = mergeImport([], [profile()]);
    const second = mergeImport([...first.toWrite], [profile({ description: "third version" })]);
    expect(second.duplicated).toBe(1);
    expect(second.toWrite[0].id).not.toBe("b1");
  });

  it("describes the outcome in words a user can act on", () => {
    const result = mergeImport([profile()], [profile({ description: "different" })]);
    expect(describeMerge(result)).toContain("Nothing was overwritten");
    expect(describeMerge({ toWrite: [], added: 0, duplicated: 0, identical: 0 })).toBe("Nothing to import.");
  });
});
