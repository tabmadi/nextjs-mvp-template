import { afterAll } from "bun:test";
import { closeDatabase } from "@/server/db/client";

// Database tests never run against the development database.
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error("TEST_DATABASE_URL is not set. Copy .env.example to .env.");
}
process.env.DATABASE_URL = url;

afterAll(closeDatabase);
