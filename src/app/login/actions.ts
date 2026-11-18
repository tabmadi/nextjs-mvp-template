"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { RedirectType, redirect } from "next/navigation";
import { getAuth } from "@/auth";
import { parseLoginInput } from "@/server/domain/accounts";

// `email` refills the field: React resets a form after its action, and a failed sign-in keeps what the user typed.
export type LoginFormState = { error: string | null; email?: string };

export async function loginAction(
  _previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const input = parseLoginInput(
    String(formData.get("email") ?? ""),
    String(formData.get("password") ?? ""),
  );
  if (!input) {
    return { error: "Enter your email and password.", email: String(formData.get("email") ?? "") };
  }
  try {
    await getAuth().api.signInEmail({ body: input, headers: await headers() });
  } catch (error) {
    if (isAPIError(error)) {
      // One message for an unknown email, a malformed email, and a wrong password, so the page does not reveal accounts.
      const wrong = ["INVALID_EMAIL_OR_PASSWORD", "INVALID_EMAIL"].includes(
        String(error.body?.code),
      );
      return {
        email: input.email,
        error: wrong
          ? "The email or the password is wrong."
          : "Sign-in is not available. Try again later.",
      };
    }
    throw error;
  }
  // A replace removes /login from the history, so the back button never returns to it after sign-in.
  redirect("/notes", RedirectType.replace);
}
