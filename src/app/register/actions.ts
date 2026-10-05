"use server";

import { RedirectType, redirect } from "next/navigation";
import type { RegistrationError } from "@/server/domain/accounts";
import { register } from "@/server/services/accounts";

// `values` refills the fields: React resets a form after its action. The password is never sent back.
export type RegisterFormState = {
  errors: RegistrationError[];
  values?: { name: string; email: string };
};

export async function registerAction(
  _previous: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const result = await register({ ...values, password: String(formData.get("password") ?? "") });
  if (!result.ok) {
    return { errors: result.errors, values };
  }
  redirect("/login", RedirectType.replace);
}
