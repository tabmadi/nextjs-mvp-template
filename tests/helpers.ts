import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import type { Actor } from "@/server/domain/authorization";
import { actorFor, register } from "@/server/services/accounts";

export async function resetDatabase(): Promise<void> {
  await getDb().execute(sql`TRUNCATE users, organizations CASCADE`);
}

export async function registerActor(email: string): Promise<Actor> {
  const result = await register({ name: "Test User", email, password: "correct horse battery" });
  if (!result.ok) throw new Error(`Registration failed: ${JSON.stringify(result.errors)}`);
  const actor = await actorFor(result.userId);
  if (!actor) throw new Error("Registration created no membership.");
  return actor;
}
