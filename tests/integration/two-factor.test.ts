import { createOTP } from "@better-auth/utils/otp";
import { symmetricDecrypt } from "better-auth/crypto";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";
import { createAuth } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { registerActor, resetDatabase } from "../helpers";

beforeEach(resetDatabase);

const email = "dana@example.com";
const password = "correct horse battery";
const counter = () => Math.floor(Date.now() / 30_000);

// A cookie jar over the Set-Cookie lines of Better Auth, because the tests run outside a request.
function cookieHeader(response: Headers, previous = ""): Headers {
  const jar = new Map(
    previous
      .split("; ")
      .filter(Boolean)
      .map((pair) => pair.split("=", 2) as [string, string]),
  );
  for (const line of response.getSetCookie()) {
    const [pair = ""] = line.split(";");
    const at = pair.indexOf("=");
    const value = pair.slice(at + 1);
    if (value) jar.set(pair.slice(0, at), value);
    else jar.delete(pair.slice(0, at));
  }
  return new Headers({ cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") });
}

async function signIn(auth: ReturnType<typeof createAuth>) {
  const result = await auth.api.signInEmail({
    body: { email, password },
    headers: new Headers(),
    returnHeaders: true,
  });
  return { body: result.response, headers: cookieHeader(result.headers) };
}

// Better Auth encrypts with its own secret, which is a default when AUTH_SECRET is unset, as in the sandbox.
async function storedSecret(auth: ReturnType<typeof createAuth>, userId: string): Promise<string> {
  const rows = await getDb().execute<{ secret: string }>(
    sql`SELECT secret FROM two_factors WHERE user_id = ${userId}`,
  );
  return symmetricDecrypt({
    key: (await auth.$context).secret,
    data: String(rows.rows[0]?.secret),
  });
}

async function enrolledUser() {
  const actor = await registerActor(email);
  const auth = createAuth();
  const first = await signIn(auth);
  const other = await signIn(auth);
  await auth.api.enableTwoFactor({ body: { password }, headers: first.headers });
  const secret = await storedSecret(auth, actor.userId);
  const otp = createOTP(secret, { digits: 6, period: 30 });
  const enrolled = await auth.api.verifyTOTP({
    body: { code: await otp.hotp(counter() - 1) },
    headers: first.headers,
    returnHeaders: true,
  });
  return {
    auth,
    otp,
    secret,
    userId: actor.userId,
    session: cookieHeader(enrolled.headers, first.headers.get("cookie") ?? ""),
    staleSession: other.headers,
  };
}

const sessionCount = async (userId: string) => {
  const rows = await getDb().execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM sessions WHERE user_id = ${userId}`,
  );
  return rows.rows[0]?.n;
};

describe("second factor", () => {
  test("ACC-022 the stored secret is encrypted", async () => {
    const { userId, secret } = await enrolledUser();
    const rows = await getDb().execute<{ secret: string }>(
      sql`SELECT secret FROM two_factors WHERE user_id = ${userId}`,
    );
    expect(String(rows.rows[0]?.secret).includes(secret)).toBe(false);
  });

  test("ACC-023 enrolment ends every older session of the user", async () => {
    const { auth, userId, session, staleSession } = await enrolledUser();
    expect(await auth.api.getSession({ headers: staleSession })).toBeNull();
    expect((await auth.api.getSession({ headers: session }))?.user.id).toBe(userId);
    expect(await sessionCount(userId)).toBe(1);
  });

  test("ACC-024 a password alone creates no session after enrolment", async () => {
    const { auth, userId } = await enrolledUser();
    const { body, headers } = await signIn(auth);
    expect(body).toMatchObject({ twoFactorRedirect: true });
    expect(await auth.api.getSession({ headers })).toBeNull();
    expect(await sessionCount(userId)).toBe(1);
  });

  test("ACC-025 a code works once at sign-in, and a wrong code fails", async () => {
    const { auth, otp } = await enrolledUser();
    const code = await otp.hotp(counter());
    const first = await signIn(auth);
    await expect(
      auth.api.verifyTOTP({ body: { code: "000000" }, headers: first.headers }),
    ).rejects.toMatchObject({ body: { code: "INVALID_CODE" } });
    const passed = await auth.api.verifyTOTP({
      body: { code },
      headers: first.headers,
      returnHeaders: true,
    });
    expect(await auth.api.getSession({ headers: cookieHeader(passed.headers) })).not.toBeNull();
    const second = await signIn(auth);
    await expect(
      auth.api.verifyTOTP({ body: { code }, headers: second.headers }),
    ).rejects.toMatchObject({ body: { code: "INVALID_CODE" } });
  });

  test("ACC-026 turning the second factor off needs the password", async () => {
    const { auth, userId, session } = await enrolledUser();
    await expect(
      auth.api.disableTwoFactor({ body: { password: "wrong password!!" }, headers: session }),
    ).rejects.toBeTruthy();
    await auth.api.disableTwoFactor({ body: { password }, headers: session });
    const rows = await getDb().execute(
      sql`SELECT two_factor_enabled FROM users WHERE id = ${userId}`,
    );
    expect(rows.rows).toEqual([{ two_factor_enabled: false }]);
  });
});
