import "server-only";

import { createHash } from "node:crypto";
import { getDb } from "../db/client";
import {
  API_CREDENTIAL_NAME_MAX,
  hashApiCredential,
  newApiCredential,
} from "../domain/api-credentials";
import { type Actor, allowed, ForbiddenError } from "../domain/authorization";
import * as repo from "../repositories/api-credentials";

function check(actor: Actor) {
  if (!allowed(actor, "organization:manage", { organizationId: actor.organizationId })) {
    throw new ForbiddenError("organization:manage");
  }
}

export type CreatedCredential =
  | { ok: true; secret: string; displayPrefix: string }
  | { ok: false; error: string };

/** Creates a credential and returns its secret. The secret is shown once and never stored, per ADR-0304. */
export async function createApiCredential(
  actor: Actor,
  rawName: string,
): Promise<CreatedCredential> {
  check(actor);
  const name = rawName.trim();
  if (name.length === 0 || name.length > API_CREDENTIAL_NAME_MAX) {
    return { ok: false, error: `Enter a name of 1 to ${API_CREDENTIAL_NAME_MAX} characters.` };
  }
  const credential = newApiCredential();
  await repo.insertApiCredential(getDb(), {
    organizationId: actor.organizationId,
    name,
    keyHash: credential.hash,
    displayPrefix: credential.displayPrefix,
    createdBy: actor.userId,
  });
  return { ok: true, secret: credential.secret, displayPrefix: credential.displayPrefix };
}

export function listApiCredentials(actor: Actor) {
  check(actor);
  return repo.listApiCredentials(getDb(), actor.organizationId);
}

export function revokeApiCredential(actor: Actor, id: string) {
  check(actor);
  return repo.revokeApiCredential(getDb(), actor.organizationId, id);
}

/**
 * The actor of an API call: the organization of the credential, with the member role, so a
 * credential reads and creates data but never manages the organization. Null for an unknown or
 * revoked credential.
 */
export async function authenticateApiCredential(
  secret: string,
): Promise<(Actor & { credentialId: string }) | null> {
  const db = getDb();
  const row = await repo.findActiveCredentialByHash(db, hashApiCredential(secret));
  if (!row) return null;
  await repo.touchApiCredential(db, row.id);
  return {
    credentialId: row.id,
    userId: row.createdBy ?? "",
    organizationId: row.organizationId,
    role: "member",
  };
}

export type IdempotentResponse = { status: number; body: unknown };

/**
 * Runs `operation` once for an `Idempotency-Key`. A retry with the same body gets the stored
 * response. A retry with another body, or while the first runs, gets an error response.
 */
export async function runIdempotent(
  organizationId: string,
  key: string,
  requestBody: string,
  operation: () => Promise<IdempotentResponse>,
): Promise<IdempotentResponse> {
  const db = getDb();
  const requestHash = createHash("sha256").update(requestBody).digest("hex");
  const claim = await repo.claimIdempotencyKey(db, organizationId, key, requestHash);
  if (!claim.claimed) {
    const row = claim.row;
    if (!row || row.requestHash !== requestHash) {
      return {
        status: 422,
        body: {
          error: {
            code: "idempotency_key_reused",
            message: "This Idempotency-Key was used with another request body.",
          },
        },
      };
    }
    if (row.statusCode === null) {
      return {
        status: 409,
        body: {
          error: {
            code: "request_in_progress",
            message: "A request with this Idempotency-Key is still running. Retry later.",
          },
        },
      };
    }
    return { status: row.statusCode, body: row.response };
  }
  try {
    const result = await operation();
    // A server error is not stored, so a retry runs again.
    if (result.status >= 500) await repo.releaseIdempotencyKey(db, organizationId, key);
    else await repo.storeIdempotentResponse(db, organizationId, key, result.status, result.body);
    return result;
  } catch (error) {
    await repo.releaseIdempotencyKey(db, organizationId, key);
    throw error;
  }
}
