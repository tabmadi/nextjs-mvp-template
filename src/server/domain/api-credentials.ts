import { createHash, randomBytes } from "node:crypto";

export const API_CREDENTIAL_PREFIX = "sk_";

export type NewApiCredential = { secret: string; hash: string; displayPrefix: string };

// 24 random bytes give 192 bits, above the 128-bit floor of ADR-0304.
export function newApiCredential(): NewApiCredential {
  const secret = API_CREDENTIAL_PREFIX + randomBytes(24).toString("base64url");
  return { secret, hash: hashApiCredential(secret), displayPrefix: secret.slice(0, 10) };
}

export function hashApiCredential(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}
