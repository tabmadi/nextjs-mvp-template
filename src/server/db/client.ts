import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

// The pool lives on globalThis so that the module reloads of `next dev` reuse it.
const state = globalThis as typeof globalThis & { pool?: Pool; database?: Database };

export function getDb(): Database {
  if (!state.database) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
    }
    state.pool = new Pool({ connectionString: url });
    state.database = drizzle({ client: state.pool, schema });
  }
  return state.database;
}
