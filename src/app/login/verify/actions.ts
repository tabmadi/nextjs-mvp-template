"use server";

import { headers } from "next/headers";
import { RedirectType, redirect } from "next/navigation";
import { getAuth } from "@/auth";
import { CODE_WRONG, normalizeCode } from "@/server/domain/two-factor";
import { codeError } from "@/server/services/two-factor";

export type CodeState = { error: string | null };

// The second step of sign-in: the code of the authenticator app turns the challenge into a session.
export async function verifyAction(_previous: CodeState, formData: FormData): Promise<CodeState> {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (!code) return { error: CODE_WRONG };
  try {
    await getAuth().api.verifyTOTP({ body: { code }, headers: await headers() });
  } catch (error) {
    const message = codeError(error);
    if (message) return { error: message };
    throw error;
  }
  redirect("/notes", RedirectType.replace);
}
