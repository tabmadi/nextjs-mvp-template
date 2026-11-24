import "server-only";

import { and, eq, lt, ne, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { sessions, totpUsedCodes } from "../db/schema";
import { USED_CODE_SECONDS, usedCodeHash } from "../domain/two-factor";

/** Claims a code for its user. The primary key makes two concurrent claims end with one winner. */
export async function claimCode(db: Database, userId: string, code: string): Promise<boolean> {
  await db
    .delete(totpUsedCodes)
    .where(and(eq(totpUsedCodes.userId, userId), lt(totpUsedCodes.expiresAt, sql`now()`)));
  const rows = await db
    .insert(totpUsedCodes)
    .values({
      userId,
      codeHash: usedCodeHash(userId, code),
      expiresAt: sql`now() + make_interval(secs => ${USED_CODE_SECONDS})`,
    })
    .onConflictDoNothing()
    .returning({ userId: totpUsedCodes.userId });
  return rows.length === 1;
}

/** Gives back a claim for a code that failed, so a typo never blocks the real code. */
export async function releaseCode(db: Database, userId: string, code: string): Promise<void> {
  await db
    .delete(totpUsedCodes)
    .where(
      and(eq(totpUsedCodes.userId, userId), eq(totpUsedCodes.codeHash, usedCodeHash(userId, code))),
    );
}

export async function deleteSessionsExcept(
  db: Database,
  userId: string,
  token: string,
): Promise<void> {
  await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.token, token)));
}
