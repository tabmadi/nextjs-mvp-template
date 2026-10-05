import "server-only";

import { desc } from "drizzle-orm";
import type { Database } from "../db/client";
import { type NewNote, type Note, notes } from "../db/schema";

export async function insertNote(db: Database, values: NewNote): Promise<Note> {
  const [note] = await db.insert(notes).values(values).returning();
  return note;
}

export function listNotes(db: Database, limit: number): Promise<Note[]> {
  return db.select().from(notes).orderBy(desc(notes.createdAt)).limit(limit);
}
