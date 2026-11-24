"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { RedirectType, redirect } from "next/navigation";
import { getAuth } from "@/auth";
import { normalizeEmail, passwordError } from "@/server/domain/accounts";
import { RATE_LIMITS } from "@/server/domain/rate-limit";
import { clientIpFromHeaders } from "@/server/http/client-ip";
import { trustedProxyRanges } from "@/server/http/trusted-proxies";
import { allowAttempt } from "@/server/services/rate-limit";

const LIMITED = "Too many requests. Try again in one hour.";

export type ForgotState = { sent: boolean; error: string | null };

// One message for a known and an unknown email, so the page does not show which accounts exist.
export async function forgotAction(
  _previous: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { sent: false, error: "Enter your email." };
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders, trustedProxyRanges()) ?? "unknown";
  const allowed =
    (await allowAttempt("forgot:ip", ip, RATE_LIMITS.forgotPerIp)) &&
    (await allowAttempt("forgot:email", email, RATE_LIMITS.forgotPerEmail));
  if (!allowed) return { sent: false, error: LIMITED };
  await getAuth().api.requestPasswordReset({ body: { email }, headers: requestHeaders });
  return { sent: true, error: null };
}

export type ResetState = { error: string | null };

/** Sets a password from a link. The token works once, then every session ends. */
export async function resetAction(_previous: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password !== String(formData.get("confirm") ?? "")) {
    return { error: "The two passwords differ. Type the same password twice." };
  }
  // The email is not known before the token is used, so the policy checks the password alone here.
  const problem = passwordError(password, "");
  if (problem) return { error: problem };
  const requestHeaders = await headers();
  const ip = clientIpFromHeaders(requestHeaders, trustedProxyRanges()) ?? "unknown";
  if (!(await allowAttempt("reset:ip", ip, RATE_LIMITS.resetPerIp))) return { error: LIMITED };
  try {
    await getAuth().api.resetPassword({
      body: { token, newPassword: password },
      headers: requestHeaders,
    });
  } catch (error) {
    if (isAPIError(error)) return { error: "This link expired or was used. Ask for a new link." };
    throw error;
  }
  redirect("/login?reset=1", RedirectType.replace);
}
