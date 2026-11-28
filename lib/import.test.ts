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


  it("keeps both records when the file itself repeats an id", () => {
    // Two exports concatenated by hand, or a file edited in a text editor, can contain the same id twice.
    // Writing both under one key means the second silently replaces the first, which is the exact loss
    // this policy exists to prevent.
    const fromLaptop = profile({ id: "dup", description: "written on the laptop" });
    const fromDesktop = profile({ id: "dup", description: "written on the desktop" });

    const result = mergeImport([], [fromLaptop, fromDesktop]);

    expect(result.added).toBe(1);
    expect(result.repeated).toBe(1);
    expect(result.toWrite).toHaveLength(2);
    const keys = result.toWrite.map((p) => p.id);
    expect(new Set(keys).size).toBe(2);
    expect(result.toWrite[1].name).toBe("Stitch Co (imported)");
    expect(result.toWrite[1].description).toBe(fromDesktop.description);
    expect(result.toWrite[0].description).toBe(fromLaptop.description);
  });

  it("skips an in-file repeat that carries identical substance", () => {
    const first = profile({ id: "dup" });
    const result = mergeImport([], [first, { ...first, updatedAt: "2030-01-01T00:00:00.000Z" }]);
    expect(result.toWrite).toHaveLength(1);
    expect(result.identical).toBe(1);
    expect(result.repeated).toBe(0);
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
    expect(describeMerge({ toWrite: [], added: 0, duplicated: 0, repeated: 0, identical: 0 })).toBe(
      "Nothing to import.",
    );
    // A repeat inside the file is reported for what it was, not folded into the local-collision count.
    const repeated = mergeImport([], [profile({ id: "r1" }), profile({ id: "r1", description: "other" })]);
    expect(describeMerge(repeated)).toContain("the file repeated its id");
  });
});

describe("a generated copy never takes an id the file already carries", () => {
  const now = new Date("2026-11-28T00:00:00Z");
  const p = (id: string, name: string) => ({ ...emptyProfile(), id, name });

  it("skips a reserved id instead of handing out a duplicate key", () => {
    const current = [p("a", "Local A")];
    const incoming = [p("a", "Incoming A"), p("imported-1", "Carried copy")];
    const result = mergeImport(current, incoming, now);
    const ids = result.toWrite.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    // The file's own record keeps its id; the copy is the one that moves.
    expect(ids).toContain("imported-1");
    expect(result.duplicated).toBe(1);
    expect(result.added).toBe(1);
  });

  it("marks a copy once, however many times it is imported", () => {
    const current = [p("a", "Studio")];
    const incoming = [p("a", "Studio renamed")];
    const first = mergeImport(current, incoming, now);
    expect(first.toWrite[0].name).toBe("Studio renamed (imported)");

    const second = mergeImport(current, first.toWrite, now);
    expect(second.toWrite[0].name).toBe("Studio renamed (imported)");
  });

  it("still keeps two distinct copies of one id under distinct keys", () => {
    const current = [p("a", "Local A")];
    const incoming = [p("a", "One"), p("a", "Two")];
    const result = mergeImport(current, incoming, now);
    const ids = result.toWrite.map((r) => r.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
