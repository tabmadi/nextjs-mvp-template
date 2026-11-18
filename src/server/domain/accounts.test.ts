import { describe, expect, test } from "bun:test";
import { normalizeEmail, parseLoginInput, passwordError, validateRegistration } from "./accounts";

describe("normalizeEmail", () => {
  test("ACC-001 trims and lowercases", () => {
    expect(normalizeEmail("  Alice@Example.COM ")).toBe("alice@example.com");
  });

  test("ACC-002 rejects a value without one at sign and a dotted domain", () => {
    expect(normalizeEmail("alice")).toBeNull();
    expect(normalizeEmail("a@b@example.com")).toBeNull();
    expect(normalizeEmail("alice@localhost")).toBeNull();
  });

  test("ACC-002 rejects non-ASCII characters", () => {
    expect(normalizeEmail("älice@example.com")).toBeNull();
  });
});

describe("passwordError", () => {
  test("ACC-003 accepts 12 characters with no composition rule", () => {
    expect(passwordError("correcthorse", "alice@example.com")).toBeNull();
  });

  test("ACC-003 rejects 11 characters", () => {
    expect(passwordError("correcthors", "alice@example.com")).toBe("Use at least 12 characters.");
  });

  test("ACC-003 counts characters, not bytes, for the minimum", () => {
    expect(passwordError("ééééééééééé", "alice@example.com")).not.toBeNull();
    expect(passwordError("éééééééééééé", "alice@example.com")).toBeNull();
  });

  test("ACC-004 rejects more than 1024 bytes", () => {
    expect(passwordError("é".repeat(513), "alice@example.com")).toBe("Use at most 1024 bytes.");
  });

  test("ACC-005 rejects a password that contains the email or its local part", () => {
    expect(passwordError("alice@example.com!", "alice@example.com")).not.toBeNull();
    expect(passwordError("my-ALICE-password", "alice@example.com")).not.toBeNull();
  });
});

describe("validateRegistration", () => {
  test("ACC-006 reports every failure at once", () => {
    const { email, errors } = validateRegistration({ name: " ", email: "x", password: "short" });
    expect(email).toBeNull();
    expect(errors.map((error) => error.field)).toEqual(["name", "email", "password"]);
  });
});

describe("parseLoginInput", () => {
  test("ACC-011 applies no password policy, so an older short password still reaches the check", () => {
    expect(parseLoginInput(" alice@example.com ", "abc")).toEqual({
      email: "alice@example.com",
      password: "abc",
    });
  });

  test("ACC-004 rejects an empty field and a password over the hashing bound", () => {
    expect(parseLoginInput("", "correct horse battery")).toBeNull();
    expect(parseLoginInput("alice@example.com", "")).toBeNull();
    expect(parseLoginInput("alice@example.com", "é".repeat(513))).toBeNull();
  });
});
