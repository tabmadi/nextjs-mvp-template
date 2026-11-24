import "server-only";

import { type BetterAuthPlugin, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins/two-factor";
import { getDb } from "./db/client";
import { accounts, sessions, twoFactors, users, verifications } from "./db/schema";
import { TOTP_DIGITS, TOTP_ISSUER, TOTP_PERIOD_SECONDS } from "./domain/two-factor";
import { appUrl, sendMail } from "./mail/send";
import { passwordChangedMail, resetPasswordMail } from "./mail/templates";
import { hashPassword, verifyPassword } from "./passwords";
import { singleUseTotp } from "./single-use-totp";

// Better Auth signs users in and keeps their sessions, per ADR-0304. Registration stays in the
// accounts service, so the user and its personal organization are created in one transaction.
// The app mounts no Better Auth route, so every call passes through a server action.
export function createAuth(plugins: BetterAuthPlugin[] = []) {
  return betterAuth({
    appName: TOTP_ISSUER,
    secret: process.env.AUTH_SECRET,
    baseURL: process.env.AUTH_URL,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
        twoFactor: twoFactors,
      },
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
      // A reset link works once for 30 minutes, and a finished reset ends every session.
      resetPasswordTokenExpiresIn: 30 * 60,
      revokeSessionsOnPasswordReset: true,
      // The link opens the reset page of the app, which calls Better Auth through a server action.
      sendResetPassword: async ({ user, token }) => {
        await sendMail(resetPasswordMail(user.email, appUrl(`/password/reset?token=${token}`)));
      },
      onPasswordReset: async ({ user }) => {
        await sendMail(passwordChangedMail(user.email));
      },
    },
    plugins: [
      twoFactor({
        issuer: TOTP_ISSUER,
        totpOptions: { digits: TOTP_DIGITS, period: TOTP_PERIOD_SECONDS },
      }),
      singleUseTotp(),
      ...plugins,
    ],
  });
}
