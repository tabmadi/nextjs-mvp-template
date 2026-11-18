import "server-only";

import { getDb, withTransaction } from "../db/client";
import {
  PERSONAL_ORGANIZATION_NAME,
  type RegistrationError,
  type RegistrationInput,
  validateRegistration,
} from "../domain/accounts";
import type { Actor } from "../domain/authorization";
import { hashPassword } from "../passwords";
import {
  findFirstMembership,
  insertMembership,
  insertOrganization,
} from "../repositories/organizations";
import { deleteSessions, insertCredentialAccount, insertUser } from "../repositories/users";

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; errors: RegistrationError[] };

export async function register(input: RegistrationInput): Promise<RegisterResult> {
  const { email, errors } = validateRegistration(input);
  if (!email || errors.length > 0) {
    return { ok: false, errors };
  }
  const passwordHash = await hashPassword(input.password);
  try {
    const userId = await withTransaction(async (db) => {
      const user = await insertUser(db, { email, name: input.name.trim() });
      await insertCredentialAccount(db, user.id, passwordHash);
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

// Ends every session of a user. Better Auth reads the sessions table on each request.
export function endSessions(userId: string): Promise<void> {
  return deleteSessions(getDb(), userId);
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
