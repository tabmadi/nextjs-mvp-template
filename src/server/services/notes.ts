import "server-only";

import { getDb } from "../db/client";
import type { Note } from "../db/schema";
import { type Actor, allowed, ForbiddenError } from "../domain/authorization";
import { type FieldError, type NoteInput, validateNote } from "../domain/notes";
import { insertNote, listNotes } from "../repositories/notes";

export type CreateNoteResult = { ok: true; note: Note } | { ok: false; errors: FieldError[] };

export async function createNote(actor: Actor, input: NoteInput): Promise<CreateNoteResult> {
  if (!allowed(actor, "note:create", { organizationId: actor.organizationId })) {
    throw new ForbiddenError("note:create");
  }
  const errors = validateNote(input);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  const note = await insertNote(getDb(), {
    organizationId: actor.organizationId,
    title: input.title.trim(),
    body: input.body.trim(),
  });
  return { ok: true, note };
}

export function recentNotes(actor: Actor): Promise<Note[]> {
  if (!allowed(actor, "note:read", { organizationId: actor.organizationId })) {
    throw new ForbiddenError("note:read");
  }
  return listNotes(getDb(), actor.organizationId, 20);
}
