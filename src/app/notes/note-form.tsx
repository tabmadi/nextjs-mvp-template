"use client";

import { useActionState } from "react";
import { createNoteAction, type NoteFormState } from "./actions";

const initialState: NoteFormState = { errors: [] };

export function NoteForm() {
  const [state, formAction, pending] = useActionState(createNoteAction, initialState);
  const errorFor = (field: "title" | "body") =>
    state.errors.find((error) => error.field === field)?.message;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input
        name="title"
        placeholder="Title"
        className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
      />
      {errorFor("title") && <p className="text-sm text-red-600">{errorFor("title")}</p>}
      <textarea
        name="body"
        placeholder="Body"
        rows={3}
        className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700"
      />
      {errorFor("body") && <p className="text-sm text-red-600">{errorFor("body")}</p>}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Add note
      </button>
    </form>
  );
}
