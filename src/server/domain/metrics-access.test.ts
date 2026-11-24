import { describe, expect, test } from "vitest";
import { metricsAccessAllowed } from "./metrics-access";

describe("metricsAccessAllowed", () => {
  test("SEC-005 accepts the expected bearer token", () => {
    expect(metricsAccessAllowed("Bearer s3cret", "s3cret")).toBe(true);
  });

  test("SEC-005 refuses a wrong token", () => {
    expect(metricsAccessAllowed("Bearer wrong!", "s3cret")).toBe(false);
  });

  test("SEC-005 refuses a missing header", () => {
    expect(metricsAccessAllowed(null, "s3cret")).toBe(false);
  });

  test("SEC-005 refuses every request when no token is configured", () => {
    expect(metricsAccessAllowed("Bearer ", undefined)).toBe(false);
    expect(metricsAccessAllowed("Bearer ", "")).toBe(false);
  });
});
