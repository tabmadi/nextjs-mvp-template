import { beforeEach, describe, expect, test } from "bun:test";
import { isAPIError } from "better-auth/api";
import { sql } from "drizzle-orm";
import { createAuth } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { hashPassword } from "@/server/passwords";
import { insertCredentialAccount } from "@/server/repositories/users";
import { endSessions, register } from "@/server/services/accounts";
import { registerActor, resetDatabase } from "../helpers";

beforeEach(resetDatabase);

// No nextCookies plugin, so the tests run outside a Next.js request and pass the cookie by hand.
const auth = createAuth();

async function signIn(email: string, password: string): Promise<Headers> {
  const response = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
  if (!response.ok) throw new Error(`Sign-in failed with ${response.status}`);
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

async function signInError(email: string, password: string): Promise<string | undefined> {
  try {
    await auth.api.signInEmail({ body: { email, password } });
  } catch (error) {
    if (isAPIError(error)) return String(error.body?.code);
    throw error;
  }
  return undefined;
}

describe("register", () => {
  test("creates a personal organization with the user as owner", async () => {
    const actor = await registerActor("alice@example.com");
    expect(actor.role).toBe("owner");
    const result = await getDb().execute(
      sql`SELECT name FROM organizations WHERE id = ${actor.organizationId}`,
    );
    expect(result.rows).toEqual([{ name: "Personal workspace" }]);
  });

  test("stores an Argon2id PHC hash in a credential account, never the password", async () => {
    const actor = await registerActor("alice@example.com");
    const result = await getDb().execute(
      sql`SELECT provider_id, account_id, password FROM accounts WHERE user_id = ${actor.userId}`,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.provider_id).toBe("credential");
    expect(result.rows[0]?.account_id).toBe(actor.userId);
    expect(String(result.rows[0]?.password)).toStartWith("$argon2id$v=19$");
  });

  test("rejects a duplicate email in any case", async () => {
    await registerActor("alice@example.com");
    const result = await register({
      name: "Alice",
      email: "ALICE@example.com",
      password: "correct horse battery",
    });
    expect(result).toEqual({
      ok: false,
      errors: [{ field: "email", message: "An account with this email already exists." }],
    });
  });

  test("creates nothing for an invalid registration", async () => {
    const result = await register({ name: "Bob", email: "bob@example.com", password: "short" });
    expect(result.ok).toBe(false);
    const count = await getDb().execute(sql`SELECT count(*)::int AS n FROM organizations`);
    expect(count.rows).toEqual([{ n: 0 }]);
  });
});

describe("sign-in", () => {
  test("opens a session for the right password", async () => {
    const actor = await registerActor("alice@example.com");
    const session = await auth.api.getSession({
      headers: await signIn("Alice@Example.com", "correct horse battery"),
    });
    expect(session?.user.id).toBe(actor.userId);
  });

  test("accepts a password set before the current policy", async () => {
    const [user] = await getDb()
      .insert(users)
      .values({ email: "legacy@example.com", name: "Legacy" })
      .returning();
    await insertCredentialAccount(getDb(), user.id, await hashPassword("abc"));
    const session = await auth.api.getSession({
      headers: await signIn("legacy@example.com", "abc"),
    });
    expect(session?.user.id).toBe(user.id);
  });

  test("gives one error for a wrong password and an unknown email", async () => {
    await registerActor("alice@example.com");
    expect(await signInError("alice@example.com", "wrong password!!")).toBe(
      "INVALID_EMAIL_OR_PASSWORD",
    );
    expect(await signInError("nobody@example.com", "correct horse battery")).toBe(
      "INVALID_EMAIL_OR_PASSWORD",
    );
  });

  test("creates no user for an unknown email", async () => {
    await signInError("nobody@example.com", "correct horse battery");
    const count = await getDb().execute(sql`SELECT count(*)::int AS n FROM users`);
    expect(count.rows).toEqual([{ n: 0 }]);
  });

  test("rejects a sign-up through Better Auth, so every user comes from register", async () => {
    let code: string | undefined;
    try {
      await auth.api.signUpEmail({
        body: { name: "Eve", email: "eve@example.com", password: "correct horse battery" },
      });
    } catch (error) {
      if (isAPIError(error)) code = String(error.body?.code);
    }
    expect(code).toBeDefined();
    const count = await getDb().execute(sql`SELECT count(*)::int AS n FROM users`);
    expect(count.rows).toEqual([{ n: 0 }]);
  });
});

describe("endSessions", () => {
  test("ends every issued session of the user", async () => {
    const actor = await registerActor("alice@example.com");
    const headers = await signIn("alice@example.com", "correct horse battery");
    expect((await auth.api.getSession({ headers }))?.user.id).toBe(actor.userId);
    await endSessions(actor.userId);
    expect(await auth.api.getSession({ headers })).toBeNull();
  });
});
