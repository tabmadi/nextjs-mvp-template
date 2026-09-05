import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is unset. Copy .env.example to .env.");
}

export const db = drizzle({ client: new SQL(url), schema });
