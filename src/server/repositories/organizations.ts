import "server-only";

import { asc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { type Membership, memberships, organizations } from "../db/schema";

export async function insertOrganization(db: Database, name: string): Promise<{ id: string }> {
  const [organization] = await db
    .insert(organizations)
    .values({ name })
    .returning({ id: organizations.id });
  return organization;
}

export async function insertMembership(
  db: Database,
  values: Pick<Membership, "organizationId" | "userId" | "role">,
): Promise<void> {
  await db.insert(memberships).values(values);
}

export async function findFirstMembership(
  db: Database,
  userId: string,
): Promise<Membership | undefined> {
  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .orderBy(asc(memberships.createdAt))
    .limit(1);
  return membership;
}
