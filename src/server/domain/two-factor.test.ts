import { describe, expect, test } from "vitest";
import { manualKey, normalizeCode, usedCodeHash } from "./two-factor";

describe("two-factor codes", () => {
  test("ACC-025 a code is six digits, and a space inside it is allowed", () => {
    expect(normalizeCode("123 456")).toBe("123456");
    expect(normalizeCode("12345")).toBeNull();
    expect(normalizeCode("12345a")).toBeNull();
  });

  test("ACC-025 a used code is stored only as a hash bound to its user", () => {
    const a = usedCodeHash("user-a", "123456");
    expect(a.toString("hex")).not.toContain("123456");
    expect(a.equals(usedCodeHash("user-b", "123456"))).toBe(false);
  });

  test("ACC-022 the manual key is the secret of the URI in groups of four", () => {
    expect(manualKey("otpauth://totp/MVP:a?secret=ABCDEFGHIJKLMNOP&issuer=MVP")).toBe(
      "ABCD EFGH IJKL MNOP",
    );
  });
});
