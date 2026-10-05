"use server";

import { RedirectType, redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { parseLoginInput } from "@/server/domain/accounts";

export type LoginFormState = { error: string | null };

export async function loginAction(
  _previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const input = parseLoginInput(
    String(formData.get("email") ?? ""),
    String(formData.get("password") ?? ""),
  );
  if (!input) {
    return { error: "Enter your email and password." };
  }
  try {
    await signIn("credentials", { ...input, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      // One message for an unknown email and a wrong password, so the page does not reveal accounts.
      return {
        error:
          error.type === "CredentialsSignin"
            ? "The email or the password is wrong."
            : "Sign-in is not available. Try again later.",
      };
    }
    throw error;
  }
  // A replace removes /login from the history, so the back button never returns to it after sign-in.
  redirect("/notes", RedirectType.replace);
}
