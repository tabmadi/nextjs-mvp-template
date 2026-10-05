import "server-only";

import { getDb } from "../db/client";
import type { Note } from "../db/schema";
import { type FieldError, type NoteInput, validateNote } from "../domain/notes";
import { insertNote, listNotes } from "../repositories/notes";

export type CreateNoteResult = { ok: true; note: Note } | { ok: false; errors: FieldError[] };

export async function createNote(input: NoteInput): Promise<CreateNoteResult> {
  const errors = validateNote(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  const note = await insertNote(getDb(), { title: input.title.trim(), body: input.body.trim() });
  return { ok: true, note };
}

export function recentNotes(): Promise<Note[]> {
  return listNotes(getDb(), 20);
}
