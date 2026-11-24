import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";
import { getDb } from "@/server/db/client";
import { allowAttempt } from "@/server/services/rate-limit";

beforeEach(async () => {
  await getDb().execute(sql`TRUNCATE rate_limits`);
});

describe("allowAttempt", () => {
  test("SEC-006 refuses the attempt after the limit and stores no raw key", async () => {
    const rule = { limit: 2, windowSeconds: 3600 };
    expect(await allowAttempt("login", "person@example.com", rule)).toBe(true);
    expect(await allowAttempt("login", "person@example.com", rule)).toBe(true);
    expect(await allowAttempt("login", "person@example.com", rule)).toBe(false);
    const rows = await getDb().execute(sql`SELECT bucket FROM rate_limits`);
    expect(JSON.stringify(rows.rows)).not.toContain("person@example.com");
  });
});
