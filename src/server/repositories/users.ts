import "server-only";

import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { type NewUser, type User, users } from "../db/schema";

export async function insertUser(db: Database, values: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(values).returning();
  return user;
}

export async function findUserByEmail(db: Database, email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

export async function findSessionVersion(db: Database, userId: string): Promise<number | null> {
  const [row] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.sessionVersion ?? null;
}
