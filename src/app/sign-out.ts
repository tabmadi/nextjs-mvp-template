"use server";

import { headers } from "next/headers";
import { RedirectType, redirect } from "next/navigation";
import { getAuth } from "@/auth";

export async function signOutAction(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  // A replace removes the signed-in page from the history, so the back button does not return to it.
  redirect("/login", RedirectType.replace);
}
