import "server-only";

import { isAPIError } from "better-auth/api";
import QRCode from "qrcode";
import { CODE_LIMITED, CODE_WRONG, manualKey } from "../domain/two-factor";

export type Enrolment = { manualKey: string; qrSvg: string };

export async function enrolmentView(totpUri: string): Promise<Enrolment> {
  return {
    manualKey: manualKey(totpUri),
    qrSvg: await QRCode.toString(totpUri, { type: "svg", margin: 1, errorCorrectionLevel: "M" }),
  };
}

/** The message for a failed code check of Better Auth, or null for another error. */
export function codeError(error: unknown): string | null {
  if (!isAPIError(error)) return null;
  const code = String(error.body?.code);
  if (code === "INVALID_TWO_FACTOR_COOKIE") return "Your sign-in expired. Sign in again.";
  if (["TOTP_RATE_LIMITED", "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE"].includes(code))
    return CODE_LIMITED;
  if (code.includes("LOCKED")) return CODE_LIMITED;
  return CODE_WRONG;
}
