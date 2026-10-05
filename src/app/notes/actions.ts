"use server";

import { revalidatePath } from "next/cache";
import type { FieldError } from "@/server/domain/notes";
import { createNote } from "@/server/services/notes";

export type NoteFormState = { errors: FieldError[] };

export async function createNoteAction(
  _previous: NoteFormState,
  formData: FormData,
): Promise<NoteFormState> {
  const result = await createNote({
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!result.ok) {
    return { errors: result.errors };
  }
  revalidatePath("/notes");
  return { errors: [] };
}
