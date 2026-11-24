import "server-only";

import { createHash } from "node:crypto";
import { getDb } from "../db/client";
import { type RateLimitRule, windowStart } from "../domain/rate-limit";
import { hitRateLimit } from "../repositories/rate-limits";

/** Counts one attempt and returns whether it is within the rule. The key is hashed before storage. */
export async function allowAttempt(
  scope: string,
  key: string,
  rule: RateLimitRule,
): Promise<boolean> {
  const digest = createHash("sha256").update(key).digest("hex").slice(0, 32);
  const hits = await hitRateLimit(
    getDb(),
    `${scope}:${digest}`,
    windowStart(new Date(), rule.windowSeconds),
  );
  return hits <= rule.limit;
}
