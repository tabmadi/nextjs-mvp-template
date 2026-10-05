import { describe, expect, test } from "bun:test";
import { type Actor, allowed } from "./authorization";

const member: Actor = { userId: "u1", organizationId: "o1", role: "member" };
const admin: Actor = { userId: "u2", organizationId: "o1", role: "admin" };

describe("allowed", () => {
  test("lets a member read and create notes in their organization", () => {
    expect(allowed(member, "note:read", { organizationId: "o1" })).toBe(true);
    expect(allowed(member, "note:create", { organizationId: "o1" })).toBe(true);
  });

  test("denies every action in another organization", () => {
    expect(allowed(admin, "note:read", { organizationId: "o2" })).toBe(false);
  });

  test("limits organization management to owners and admins", () => {
    expect(allowed(member, "organization:manage", { organizationId: "o1" })).toBe(false);
    expect(allowed(admin, "organization:manage", { organizationId: "o1" })).toBe(true);
  });
});
