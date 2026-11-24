import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createAuth } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { registerActor, resetDatabase } from "../helpers";

beforeEach(resetDatabase);
afterEach(() => vi.restoreAllMocks());

const email = "erin@example.com";
const password = "correct horse battery";
const auth = createAuth();

// Without SMTP_HOST the app writes each mail to the log, so the tests read the link from there.
function mailLog() {
  const lines: string[] = [];
  vi.spyOn(console, "warn").mockImplementation((line: unknown) => {
    if (String(line).startsWith("mail to ")) lines.push(String(line));
  });
  return lines;
}

async function resetToken(lines: string[]): Promise<string> {
  await vi.waitFor(() => expect(lines.some((line) => line.includes("token="))).toBe(true));
  const line = lines.find((entry) => entry.includes("token=")) ?? "";
  return new URL(line.slice(line.indexOf("http")).split("\n")[0] ?? "").searchParams.get(
    "token",
  ) as string;
}

const sessionCount = async (userId: string) => {
  const rows = await getDb().execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM sessions WHERE user_id = ${userId}`,
  );
  return rows.rows[0]?.n;
};

describe("password reset", () => {
  test("ACC-027 a request for an unknown email answers the same and sends no mail", async () => {
    const lines = mailLog();
    const result = await auth.api.requestPasswordReset({ body: { email: "nobody@example.com" } });
    expect(result).toMatchObject({ status: true });
    expect(lines).toEqual([]);
  });

  test("ACC-028 ACC-029 a reset link sets the password once and ends every session", async () => {
    const actor = await registerActor(email);
    await auth.api.signInEmail({ body: { email, password } });
    expect(await sessionCount(actor.userId)).toBe(1);
    const lines = mailLog();
    await auth.api.requestPasswordReset({ body: { email } });
    const token = await resetToken(lines);
    await auth.api.resetPassword({ body: { token, newPassword: "a new long password" } });
    expect(await sessionCount(actor.userId)).toBe(0);
    await expect(
      auth.api.resetPassword({ body: { token, newPassword: "another long password" } }),
    ).rejects.toBeTruthy();
    await auth.api.signInEmail({ body: { email, password: "a new long password" } });
    await vi.waitFor(() =>
      expect(lines.some((line) => line.includes("Your password changed"))).toBe(true),
    );
  });

  test("ACC-030 a reset link stops working after 30 minutes", async () => {
    await registerActor(email);
    const lines = mailLog();
    await auth.api.requestPasswordReset({ body: { email } });
    const token = await resetToken(lines);
    await getDb().execute(
      sql`UPDATE verifications SET expires_at = now() - interval '1 second' WHERE identifier LIKE ${"reset-password:%"}`,
    );
    await expect(
      auth.api.resetPassword({ body: { token, newPassword: "a new long password" } }),
    ).rejects.toBeTruthy();
  });
});
