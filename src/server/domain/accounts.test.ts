import { describe, expect, test } from "bun:test";
import { normalizeEmail, passwordError, validateRegistration } from "./accounts";

describe("normalizeEmail", () => {
  test("trims and lowercases", () => {
    expect(normalizeEmail("  Alice@Example.COM ")).toBe("alice@example.com");
  });

  test("rejects a value without one at sign and a dotted domain", () => {
    expect(normalizeEmail("alice")).toBeNull();
    expect(normalizeEmail("a@b@example.com")).toBeNull();
    expect(normalizeEmail("alice@localhost")).toBeNull();
  });

  test("rejects non-ASCII characters", () => {
    expect(normalizeEmail("älice@example.com")).toBeNull();
  });
});

describe("passwordError", () => {
  test("accepts 12 characters with no composition rule", () => {
    expect(passwordError("correcthorse", "alice@example.com")).toBeNull();
  });

  test("rejects 11 characters", () => {
    expect(passwordError("correcthors", "alice@example.com")).toBe("Use at least 12 characters.");
  });

  test("counts characters, not bytes, for the minimum", () => {
    expect(passwordError("ééééééééééé", "alice@example.com")).not.toBeNull();
    expect(passwordError("éééééééééééé", "alice@example.com")).toBeNull();
  });

  test("rejects more than 1024 bytes", () => {
    expect(passwordError("é".repeat(513), "alice@example.com")).toBe("Use at most 1024 bytes.");
  });

  test("rejects a password that contains the email or its local part", () => {
    expect(passwordError("alice@example.com!", "alice@example.com")).not.toBeNull();
    expect(passwordError("my-ALICE-password", "alice@example.com")).not.toBeNull();
  });
});

describe("validateRegistration", () => {
  test("reports every failure at once", () => {
    const { email, errors } = validateRegistration({ name: " ", email: "x", password: "short" });
    expect(email).toBeNull();
    expect(errors.map((error) => error.field)).toEqual(["name", "email", "password"]);
  });
});
