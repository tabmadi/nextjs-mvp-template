import "server-only";

import { type BetterAuthPlugin, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "./db/client";
import { accounts, sessions, users, verifications } from "./db/schema";
import { hashPassword, verifyPassword } from "./passwords";

// Better Auth signs users in and keeps their sessions, per ADR-0304. Registration stays in the
// accounts service, so the user and its personal organization are created in one transaction.
export function createAuth(plugins: BetterAuthPlugin[] = []) {
  return betterAuth({
    secret: process.env.AUTH_SECRET,
    baseURL: process.env.AUTH_URL,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    // PostgreSQL generates every id.
    advanced: { database: { generateId: false } },
    session: { expiresIn: 8 * 60 * 60, updateAge: 60 * 60 },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      // The policy applies where a password is set, so an older password still signs in.
      minPasswordLength: 1,
      maxPasswordLength: 1024,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    plugins,
  });
}
