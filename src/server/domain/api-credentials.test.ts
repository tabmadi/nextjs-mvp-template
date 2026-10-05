import { describe, expect, test } from "bun:test";
import { API_CREDENTIAL_PREFIX, hashApiCredential, newApiCredential } from "./api-credentials";

describe("newApiCredential", () => {
  test("returns a prefixed secret with at least 128 random bits", () => {
    const { secret } = newApiCredential();
    expect(secret.startsWith(API_CREDENTIAL_PREFIX)).toBe(true);
    const randomPart = secret.slice(API_CREDENTIAL_PREFIX.length);
    expect(Buffer.from(randomPart, "base64url").length * 8).toBeGreaterThanOrEqual(128);
  });

  test("stores a hash that verifies the same secret", () => {
    const { secret, hash, displayPrefix } = newApiCredential();
    expect(hashApiCredential(secret)).toBe(hash);
    expect(hash).not.toContain(secret);
    expect(secret.startsWith(displayPrefix)).toBe(true);
  });

  test("never repeats a secret", () => {
    expect(newApiCredential().secret).not.toBe(newApiCredential().secret);
  });
});
