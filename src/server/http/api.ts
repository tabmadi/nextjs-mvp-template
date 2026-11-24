import "server-only";

import { bearerCredential } from "../domain/api-credentials";
import type { Actor } from "../domain/authorization";
import { authenticateApiCredential, runIdempotent } from "../services/api-credentials";
import { allowAttempt } from "../services/rate-limit";

// The public API of ADR-0303. Every error has one shape: { error: { code, message } }.

export function apiError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): Response {
  return Response.json({ error: { code, message } }, { status, headers });
}

const API_RATE_LIMIT = { limit: 300, windowSeconds: 60 };

type ApiActor = Actor & { credentialId: string };
type Handler = (request: Request, actor: ApiActor) => Promise<Response>;

/** Authenticates `Authorization: Bearer sk_...`, applies the limit of the credential, and maps errors. */
export function withApiCredential(handler: Handler) {
  return async (request: Request) => {
    const secret = bearerCredential(request.headers.get("authorization"));
    if (!secret) {
      return apiError(
        401,
        "unauthenticated",
        "Send a credential as `Authorization: Bearer sk_...`.",
      );
    }
    const actor = await authenticateApiCredential(secret);
    if (!actor) return apiError(401, "unauthenticated", "This credential is unknown or revoked.");
    if (!(await allowAttempt("api:credential", actor.credentialId, API_RATE_LIMIT))) {
      return apiError(429, "rate_limited", "Too many requests. Retry in one minute.", {
        "retry-after": "60",
      });
    }
    try {
      return await handler(request, actor);
    } catch (error) {
      console.error("api error", error);
      return apiError(500, "internal_error", "Something failed on our side. Retry the request.");
    }
  };
}

/** Runs a write once for its `Idempotency-Key`, when the request sends one. */
export async function idempotent(
  request: Request,
  actor: ApiActor,
  body: string,
  operation: () => Promise<{ status: number; body: unknown }>,
): Promise<Response> {
  const key = request.headers.get("idempotency-key");
  if (key !== null && (key.length === 0 || key.length > 255)) {
    return apiError(400, "invalid_idempotency_key", "An Idempotency-Key has 1 to 255 characters.");
  }
  const result = key
    ? await runIdempotent(actor.organizationId, key, body, operation)
    : await operation();
  return Response.json(result.body, {
    status: result.status,
    headers: key ? { "idempotency-key": key } : undefined,
  });
}
