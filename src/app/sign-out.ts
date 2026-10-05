"use server";

import { RedirectType, redirect } from "next/navigation";
import { signOut } from "@/auth";

export async function signOutAction(): Promise<void> {
  await signOut({ redirect: false });
  // A replace removes the signed-in page from the history, so the back button does not return to it.
  redirect("/login", RedirectType.replace);
}
