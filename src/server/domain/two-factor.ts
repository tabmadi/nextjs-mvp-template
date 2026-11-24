import { createHash } from "node:crypto";

/** The name that an authenticator app shows. A project sets its own product name. */
export const TOTP_ISSUER = "MVP";
export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;

/** A code is valid for one step on each side of now, so a claim outlives its widest window. */
export const USED_CODE_SECONDS = 4 * TOTP_PERIOD_SECONDS;

export const CODE_WRONG = "The code is wrong or was used. Enter the newest code from your app.";
export const CODE_LIMITED = "Too many codes. Wait 5 minutes and try again.";

/** The six digits of a code, or null. A space inside the code is allowed. */
export function normalizeCode(code: string): string | null {
  const clean = code.replace(/\s/g, "");
  return /^\d{6}$/.test(clean) ? clean : null;
}

export function usedCodeHash(userId: string, code: string): Buffer {
  return createHash("sha256").update(`${userId}:${code}`).digest();
}

/** The base32 key of an otpauth URI, in groups of four for manual entry. */
export function manualKey(totpUri: string): string {
  const secret = new URL(totpUri).searchParams.get("secret") ?? "";
  return secret.replace(/(.{4})/g, "$1 ").trim();
}
