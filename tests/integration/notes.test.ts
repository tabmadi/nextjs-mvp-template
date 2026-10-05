import { beforeEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { createNote, recentNotes } from "@/server/services/notes";

beforeEach(async () => {
  await getDb().execute(sql`TRUNCATE notes`);
});

describe("createNote", () => {
  test("stores a valid note, trimmed", async () => {
    const result = await createNote({ title: "  Release plan ", body: "Ship on Friday." });
    expect(result.ok).toBe(true);
    const notes = await recentNotes();
    expect(notes.map((note) => note.title)).toEqual(["Release plan"]);
  });

  test("stores nothing for an invalid note", async () => {
    const result = await createNote({ title: "", body: "Body." });
    expect(result).toEqual({
      ok: false,
      errors: [{ field: "title", message: "Title is required." }],
    });
    expect(await recentNotes()).toEqual([]);
  });
});
