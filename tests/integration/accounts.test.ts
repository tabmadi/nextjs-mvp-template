import { beforeEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { currentSessionVersion, register, verifyCredentials } from "@/server/services/accounts";
import { registerActor, resetDatabase } from "../helpers";

beforeEach(resetDatabase);

describe("register", () => {
  test("creates a personal organization with the user as owner", async () => {
    const actor = await registerActor("alice@example.com");
    expect(actor.role).toBe("owner");
    const result = await getDb().execute(
      sql`SELECT name FROM organizations WHERE id = ${actor.organizationId}`,
    );
    expect(result.rows).toEqual([{ name: "Personal workspace" }]);
  });

  test("stores an Argon2id PHC hash, never the password", async () => {
    await registerActor("alice@example.com");
    const result = await getDb().execute(sql`SELECT password_hash FROM users`);
    expect(String(result.rows[0]?.password_hash)).toStartWith("$argon2id$v=19$");
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

describe("verifyCredentials", () => {
  test("returns the session user for the right password", async () => {
    const actor = await registerActor("alice@example.com");
    const user = await verifyCredentials(" Alice@Example.com ", "correct horse battery");
    expect(user).toEqual({ id: actor.userId, email: "alice@example.com", sessionVersion: 0 });
  });

  test("returns null for a wrong password or an unknown email", async () => {
    await registerActor("alice@example.com");
    expect(await verifyCredentials("alice@example.com", "wrong password!!")).toBeNull();
    expect(await verifyCredentials("nobody@example.com", "correct horse battery")).toBeNull();
  });
});

describe("currentSessionVersion", () => {
  test("follows the stored version, so an increment ends issued sessions", async () => {
    const actor = await registerActor("alice@example.com");
    expect(await currentSessionVersion(actor.userId)).toBe(0);
    await getDb().execute(sql`UPDATE users SET session_version = session_version + 1`);
    expect(await currentSessionVersion(actor.userId)).toBe(1);
  });
});
