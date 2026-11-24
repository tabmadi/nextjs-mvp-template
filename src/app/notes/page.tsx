import { requireActor } from "@/auth";
import { recentNotes } from "@/server/services/notes";
import { signOutAction } from "../sign-out";
import { NoteForm } from "./note-form";

export default async function NotesPage() {
  const actor = await requireActor();
  const notes = await recentNotes(actor);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
        <div className="flex gap-4 text-sm">
          <a href="/account/two-factor" className="underline">
            Second factor
          </a>
          <a href="/account/api-credentials" className="underline">
            API credentials
          </a>
          <form action={signOutAction}>
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        </div>
      </div>
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
