import "server-only";

import { hash, verify } from "@node-rs/argon2";
import { getDb, withTransaction } from "../db/client";
import {
  normalizeEmail,
  PERSONAL_ORGANIZATION_NAME,
  type RegistrationError,
  type RegistrationInput,
  validateRegistration,
} from "../domain/accounts";
import type { Actor } from "../domain/authorization";
import {
  findFirstMembership,
  insertMembership,
  insertOrganization,
} from "../repositories/organizations";
import { findSessionVersion, findUserByEmail, insertUser } from "../repositories/users";

// @node-rs/argon2 hashes with Argon2id by default and returns a PHC string, per ADR-0304.
const argon2Options = { memoryCost: 65_536, timeCost: 3, parallelism: 1, outputLen: 32 };

// An unknown email is verified against this hash, so the response time does not reveal the account.
const unknownUserHash =
  "$argon2id$v=19$m=65536,t=3,p=1$zBczGYxBFZNJFMdUpPtuRw$orl6Rx9eQi+wAo/I7QpoCrK/I/l5xGGIsRuLh+g/rRQ";

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; errors: RegistrationError[] };

export type SessionUser = { id: string; email: string; sessionVersion: number };

export async function register(input: RegistrationInput): Promise<RegisterResult> {
  const { email, errors } = validateRegistration(input);
  if (!email || errors.length > 0) {
    return { ok: false, errors };
  }
  const passwordHash = await hash(input.password, argon2Options);
  try {
    const userId = await withTransaction(async (db) => {
      const user = await insertUser(db, { email, name: input.name.trim(), passwordHash });
      const organization = await insertOrganization(db, PERSONAL_ORGANIZATION_NAME);
      await insertMembership(db, {
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
      });
      return user.id;
    });
    return { ok: true, userId };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        errors: [{ field: "email", message: "An account with this email already exists." }],
      };
    }
    throw error;
  }
}

export async function verifyCredentials(
  rawEmail: string,
  password: string,
): Promise<SessionUser | null> {
  const email = normalizeEmail(rawEmail);
  const user = email ? await findUserByEmail(getDb(), email) : undefined;
  const valid = await verify(user?.passwordHash ?? unknownUserHash, password);
  return user && valid
    ? { id: user.id, email: user.email, sessionVersion: user.sessionVersion }
    : null;
}

export function currentSessionVersion(userId: string): Promise<number | null> {
  return findSessionVersion(getDb(), userId);
}

export async function actorFor(userId: string): Promise<Actor | null> {
  const membership = await findFirstMembership(getDb(), userId);
  return membership
    ? { userId, organizationId: membership.organizationId, role: membership.role }
    : null;
}

// Drizzle wraps the driver error, so the PostgreSQL code sits on the error or on its cause.
function isUniqueViolation(error: unknown): boolean {
  const codeOf = (value: unknown) =>
    typeof value === "object" && value !== null && "code" in value ? value.code : undefined;
  const cause =
    typeof error === "object" && error !== null && "cause" in error ? error.cause : undefined;
  return codeOf(error) === "23505" || codeOf(cause) === "23505";
}
