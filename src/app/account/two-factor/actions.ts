"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { RedirectType, redirect } from "next/navigation";
import { getAuth, requireActor } from "@/auth";
import { CODE_WRONG, normalizeCode } from "@/server/domain/two-factor";
import { codeError, type Enrolment, enrolmentView } from "@/server/services/two-factor";

export type CodeState = { error: string | null };
export type EnrolState = { error: string | null; enrolment?: Enrolment };
export type DisableState = { error: string | null };

/** The password proves the person at this session before a new second factor is set. */
export async function startAction(_previous: EnrolState, formData: FormData): Promise<EnrolState> {
  await requireActor();
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Enter your password." };
  try {
    const result = await getAuth().api.enableTwoFactor({
      body: { password },
      headers: await headers(),
    });
    if (!("totpURI" in result) || !result.totpURI) return { error: "Setup failed. Try again." };
    return { error: null, enrolment: await enrolmentView(result.totpURI) };
  } catch (error) {
    if (isAPIError(error)) return { error: "The password is wrong." };
    throw error;
  }
}

/** The first code turns the second factor on. The guard of ADR-0304 then ends older sessions. */
export async function confirmAction(_previous: CodeState, formData: FormData): Promise<CodeState> {
  await requireActor();
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (!code) return { error: CODE_WRONG };
  try {
    await getAuth().api.verifyTOTP({ body: { code }, headers: await headers() });
  } catch (error) {
    const message = codeError(error);
    if (message) return { error: message };
    throw error;
  }
  redirect("/account/two-factor", RedirectType.replace);
}

export async function disableAction(
  _previous: DisableState,
  formData: FormData,
): Promise<DisableState> {
  await requireActor();
  const password = String(formData.get("password") ?? "");
  if (!password) return { error: "Enter your password." };
  try {
    await getAuth().api.disableTwoFactor({ body: { password }, headers: await headers() });
  } catch (error) {
    if (isAPIError(error)) return { error: "The password is wrong." };
    throw error;
  }
  redirect("/account/two-factor", RedirectType.replace);
}
