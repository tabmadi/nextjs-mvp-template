import { describe, expect, test } from "bun:test";
import { TITLE_MAX, validateNote } from "./notes";

describe("validateNote", () => {
  test("NOTE-001 accepts a populated note", () => {
    expect(validateNote({ title: "Release plan", body: "Ship on Friday." })).toEqual([]);
  });

  test("NOTE-002 rejects a blank title", () => {
    expect(validateNote({ title: "   ", body: "Body." })).toEqual([
      { field: "title", message: "Title is required." },
    ]);
  });

  test("NOTE-003 rejects a title over the limit", () => {
    const errors = validateNote({ title: "x".repeat(TITLE_MAX + 1), body: "Body." });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.field).toBe("title");
  });

  test("NOTE-004 reports every failure at once", () => {
    expect(validateNote({ title: "", body: "" })).toHaveLength(2);
  });
});
