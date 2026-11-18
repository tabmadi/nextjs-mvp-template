import "server-only";

import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { accounts, type NewUser, sessions, type User, users } from "../db/schema";

export async function insertUser(db: Database, values: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(values).returning();
  return user;
}

export async function findUserByEmail(db: Database, email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

// A credential account holds the Argon2id hash of the password, where Better Auth reads it.
export async function insertCredentialAccount(
  db: Database,
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db
    .insert(accounts)
    .values({ userId, accountId: userId, providerId: "credential", password: passwordHash });
}

export async function deleteSessions(db: Database, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
