"use server";

import { redirect } from "next/navigation";
import type { RegistrationError } from "@/server/domain/accounts";
import { register } from "@/server/services/accounts";

export type RegisterFormState = { errors: RegistrationError[] };

export async function registerAction(
  _previous: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const result = await register({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!result.ok) {
    return { errors: result.errors };
  }
  redirect("/api/auth/signin?callbackUrl=/notes");
}
