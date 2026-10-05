import "server-only";

import { desc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { type NewNote, type Note, notes } from "../db/schema";

export async function insertNote(db: Database, values: NewNote): Promise<Note> {
  const [note] = await db.insert(notes).values(values).returning();
  return note;
}

export function listNotes(db: Database, organizationId: string, limit: number): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(eq(notes.organizationId, organizationId))
    .orderBy(desc(notes.createdAt))
    .limit(limit);
}
