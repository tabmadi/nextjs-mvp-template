import "server-only";

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { type ApiCredential, apiCredentials, idempotencyKeys } from "../db/schema";

export async function insertApiCredential(
  db: Database,
  values: {
    organizationId: string;
    name: string;
    keyHash: string;
    displayPrefix: string;
    createdBy: string;
  },
): Promise<ApiCredential> {
  const [row] = await db.insert(apiCredentials).values(values).returning();
  return row;
}

export function listApiCredentials(db: Database, organizationId: string): Promise<ApiCredential[]> {
  return db
    .select()
    .from(apiCredentials)
    .where(eq(apiCredentials.organizationId, organizationId))
    .orderBy(desc(apiCredentials.createdAt));
}

export async function revokeApiCredential(
  db: Database,
  organizationId: string,
  id: string,
): Promise<boolean> {
  const rows = await db
    .update(apiCredentials)
    .set({ revokedAt: sql`now()` })
    .where(
      and(
        eq(apiCredentials.id, id),
        eq(apiCredentials.organizationId, organizationId),
        isNull(apiCredentials.revokedAt),
      ),
    )
    .returning({ id: apiCredentials.id });
  return rows.length === 1;
}

/** Finds an active credential by the hash of its secret. The unique index makes it one lookup. */
export async function findActiveCredentialByHash(
  db: Database,
  keyHash: string,
): Promise<ApiCredential | undefined> {
  const [row] = await db
    .select()
    .from(apiCredentials)
    .where(and(eq(apiCredentials.keyHash, keyHash), isNull(apiCredentials.revokedAt)))
    .limit(1);
  return row;
}

/** Records use at most once a minute, so each request does not write. */
export async function touchApiCredential(db: Database, id: string): Promise<void> {
  await db
    .update(apiCredentials)
    .set({ lastUsedAt: sql`now()` })
    .where(
      and(
        eq(apiCredentials.id, id),
        sql`(${apiCredentials.lastUsedAt} IS NULL OR ${apiCredentials.lastUsedAt} < now() - interval '1 minute')`,
      ),
    );
}

/** Claims an idempotency key. Returns the stored row when another request claimed it first. */
export async function claimIdempotencyKey(
  db: Database,
  organizationId: string,
  key: string,
  requestHash: string,
) {
  const inserted = await db
    .insert(idempotencyKeys)
    .values({ organizationId, key, requestHash })
    .onConflictDoNothing()
    .returning({ key: idempotencyKeys.key });
  if (inserted.length === 1) return { claimed: true as const };
  const [row] = await db
    .select()
    .from(idempotencyKeys)
    .where(and(eq(idempotencyKeys.organizationId, organizationId), eq(idempotencyKeys.key, key)))
    .limit(1);
  return { claimed: false as const, row };
}

export async function storeIdempotentResponse(
  db: Database,
  organizationId: string,
  key: string,
  statusCode: number,
  response: unknown,
): Promise<void> {
  await db
    .update(idempotencyKeys)
    .set({ statusCode, response })
    .where(and(eq(idempotencyKeys.organizationId, organizationId), eq(idempotencyKeys.key, key)));
}

export async function releaseIdempotencyKey(
  db: Database,
  organizationId: string,
  key: string,
): Promise<void> {
  await db
    .delete(idempotencyKeys)
    .where(and(eq(idempotencyKeys.organizationId, organizationId), eq(idempotencyKeys.key, key)));
}
