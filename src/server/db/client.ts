import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

// The pool lives on globalThis so that the module reloads of `next dev` reuse it.
const state = globalThis as typeof globalThis & { pool?: Pool; database?: Database };

function getPool(): Pool {
  if (!state.pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
    }
    state.pool = new Pool({ connectionString: url });
  }
  return state.pool;
}

export function getDb(): Database {
  state.database ??= drizzle({ client: getPool(), schema });
  return state.database;
}

export async function withTransaction<T>(operation: (db: Database) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  let broken = false;
  try {
    await client.query("BEGIN");
    const result = await operation(drizzle({ client, schema }));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {
      broken = true;
    });
    throw error;
  } finally {
    // A client whose rollback failed is in an unknown state, so the pool discards it.
    client.release(broken);
  }
}

export async function closeDatabase(): Promise<void> {
  const pool = state.pool;
  state.pool = undefined;
  state.database = undefined;
  await pool?.end();
}
