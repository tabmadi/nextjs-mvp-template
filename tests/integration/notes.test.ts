import { beforeEach, describe, expect, test } from "bun:test";
import { ForbiddenError } from "@/server/domain/authorization";
import { createNote, recentNotes } from "@/server/services/notes";
import { registerActor, resetDatabase } from "../helpers";

beforeEach(resetDatabase);

describe("createNote", () => {
  test("stores a valid note, trimmed, in the organization of the actor", async () => {
    const alice = await registerActor("alice@example.com");
    const result = await createNote(alice, { title: "  Release plan ", body: "Ship on Friday." });
    expect(result.ok).toBe(true);
    const notes = await recentNotes(alice);
    expect(notes.map((note) => [note.title, note.organizationId])).toEqual([
      ["Release plan", alice.organizationId],
    ]);
  });

  test("stores nothing for an invalid note", async () => {
    const alice = await registerActor("alice@example.com");
    const result = await createNote(alice, { title: "", body: "Body." });
    expect(result).toEqual({
      ok: false,
      errors: [{ field: "title", message: "Title is required." }],
    });
    expect(await recentNotes(alice)).toEqual([]);
  });
});

describe("recentNotes", () => {
  test("never returns the notes of another organization", async () => {
    const alice = await registerActor("alice@example.com");
    const bob = await registerActor("bob@example.com");
    await createNote(alice, { title: "Alice only", body: "Private." });
    expect(await recentNotes(bob)).toEqual([]);
  });

  test("refuses an actor whose role does not allow reading", async () => {
    const alice = await registerActor("alice@example.com");
    const outsider = { ...alice, role: "guest" as never };
    expect(() => recentNotes(outsider)).toThrow(ForbiddenError);
  });
});
