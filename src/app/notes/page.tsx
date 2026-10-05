import { connection } from "next/server";
import { recentNotes } from "@/server/services/notes";
import { NoteForm } from "./note-form";

export default async function NotesPage() {
  await connection();
  const notes = await recentNotes();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
      <NoteForm />
      <ul className="flex flex-col gap-4">
        {notes.map((note) => (
          <li key={note.id} className="flex flex-col gap-1">
            <span className="font-medium">{note.title}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{note.body}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
