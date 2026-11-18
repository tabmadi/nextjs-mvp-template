import "server-only";

import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuth } from "@/server/auth";
import type { Actor } from "@/server/domain/authorization";
import { actorFor } from "@/server/services/accounts";

type Auth = ReturnType<typeof createAuth>;

// One instance per process, created on first use, so an import or a build opens no connection.
const state = globalThis as typeof globalThis & { auth?: Auth };

export function getAuth(): Auth {
  // nextCookies lets a server action set the session cookie. It is the last plugin.
  state.auth ??= createAuth([nextCookies()]);
  return state.auth;
}

export async function requireActor(): Promise<Actor> {
  // Reading the headers first marks the page as dynamic, so a build never opens the database.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  const actor = session ? await actorFor(session.user.id) : null;
  if (!actor) {
    redirect("/login");
  }
  return actor;
}
