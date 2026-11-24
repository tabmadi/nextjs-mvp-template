import { apiError, idempotent, withApiCredential } from "@/server/http/api";
import { createNote, recentNotes } from "@/server/services/notes";

// The notes of the organization of the credential, per ADR-0303.

export const GET = withApiCredential(async (_request, actor) => {
  const notes = await recentNotes(actor);
  return Response.json({
    data: notes.map((note) => ({
      id: note.id,
      title: note.title,
      body: note.body,
      createdAt: note.createdAt,
    })),
  });
});

export const POST = withApiCredential(async (request, actor) => {
  const body = await request.text();
  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return apiError(400, "invalid_json", "The body is not JSON.");
  }
  const { title, body: text } = (input ?? {}) as { title?: unknown; body?: unknown };
  return idempotent(request, actor, body, async () => {
    const result = await createNote(actor, {
      title: String(title ?? ""),
      body: String(text ?? ""),
    });
    if (!result.ok) {
      return {
        status: 422,
        body: { error: { code: "invalid_note", message: result.errors[0]?.message ?? "" } },
      };
    }
    const { note } = result;
    return {
      status: 201,
      body: { id: note.id, title: note.title, body: note.body, createdAt: note.createdAt },
    };
  });
});
