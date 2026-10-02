import type { NewNote } from "../db/schema";

export const TITLE_MAX = 120;

export type ValidationError = { field: keyof NewNote; message: string };

export function validateNote(input: { title: string; body: string }): ValidationError[] {
  const errors: ValidationError[] = [];
  if (input.title.trim().length === 0) {
    errors.push({ field: "title", message: "Title is required." });
  }
  if (input.title.length > TITLE_MAX) {
    errors.push({ field: "title", message: `Title must be ${TITLE_MAX} characters or fewer.` });
  }
  if (input.body.trim().length === 0) {
    errors.push({ field: "body", message: "Body is required." });
  }
  return errors;
}
