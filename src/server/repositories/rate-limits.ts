import "server-only";

import { sql } from "drizzle-orm";
import type { Database } from "../db/client";

/** Adds one hit to the bucket's window and returns the new count. */
export async function hitRateLimit(
  db: Database,
  bucket: string,
  windowStart: Date,
): Promise<number> {
  const result = await db.execute<{ hits: number }>(sql`
    INSERT INTO rate_limits (bucket, window_start, hits)
    VALUES (${bucket}, ${windowStart.toISOString()}, 1)
    ON CONFLICT (bucket, window_start) DO UPDATE SET hits = rate_limits.hits + 1
    RETURNING hits`);
  return Number(result.rows[0]?.hits ?? 0);
}

/** Removes windows older than `before`. */
export async function pruneRateLimits(db: Database, before: Date): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE window_start < ${before.toISOString()}`);
}
