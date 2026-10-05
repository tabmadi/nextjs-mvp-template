import type { Config } from "drizzle-kit";

export default {
  schema: "./src/server/db/schema.ts",
  // dbmate owns db/migrations, per ADR-0300. Generated Drizzle SQL never goes there.
  out: "./.drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
} satisfies Config;
