import "server-only";

import { redirect } from "next/navigation";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Actor } from "@/server/domain/authorization";
import { actorFor, currentSessionVersion, verifyCredentials } from "@/server/services/accounts";

export const { handlers, auth } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email", required: true, autoComplete: "username" },
        password: {
          label: "Password",
          type: "password",
          required: true,
          autoComplete: "current-password",
        },
      },
      authorize: (credentials) =>
        verifyCredentials(String(credentials.email ?? ""), String(credentials.password ?? "")),
    }),
  ],
  callbacks: {
    // A null token signs the user out. An increment of users.session_version ends every issued session.
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub;
      if (!userId) return null;
      const issued = user?.sessionVersion ?? token.sessionVersion;
      const current = await currentSessionVersion(userId);
      if (current === null || current !== issued) return null;
      return { ...token, sub: userId, sessionVersion: current };
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

export async function requireActor(): Promise<Actor> {
  const session = await auth();
  const actor = session?.user.id ? await actorFor(session.user.id) : null;
  if (!actor) {
    redirect("/api/auth/signin");
  }
  return actor;
}
