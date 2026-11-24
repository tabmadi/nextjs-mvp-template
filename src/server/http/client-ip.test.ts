import { describe, expect, test } from "vitest";
import { clientIp, clientIpFromHeaders, inRange } from "./client-ip";

const ranges = ["172.64.0.0/13"];

describe("inRange", () => {
  test("SEC-001 matches an IPv4 address inside a range", () => {
    expect(inRange("104.16.1.2", "104.16.0.0/13")).toBe(true);
  });

  test("SEC-001 rejects an IPv4 address outside a range", () => {
    expect(inRange("104.24.0.1", "104.16.0.0/13")).toBe(false);
  });

  test("SEC-001 matches a compressed IPv6 address", () => {
    expect(inRange("2606:4700::6810:84e5", "2606:4700::/32")).toBe(true);
  });

  test("SEC-001 never matches across address families", () => {
    expect(inRange("10.0.0.1", "2606:4700::/32")).toBe(false);
  });
});

describe("clientIp", () => {
  test("SEC-002 trusts CF-Connecting-IP from a Cloudflare peer", () => {
    expect(clientIp("172.70.1.1", "203.0.113.7", ranges)).toBe("203.0.113.7");
  });

  test("SEC-003 ignores a spoofed CF-Connecting-IP from another peer", () => {
    expect(clientIp("198.51.100.4", "203.0.113.7", ranges)).toBe("198.51.100.4");
  });

  test("SEC-003 ignores a CF-Connecting-IP that is not an address", () => {
    expect(clientIp("172.70.1.1", "not-an-ip", ranges)).toBe("172.70.1.1");
  });

  test("SEC-004 reads an IPv4-mapped IPv6 peer as IPv4", () => {
    expect(clientIp("::ffff:172.70.1.1", "203.0.113.7", ranges)).toBe("203.0.113.7");
  });

  test("SEC-004 returns undefined without a peer", () => {
    expect(clientIp(undefined, "203.0.113.7", ranges)).toBeUndefined();
  });
});

describe("clientIpFromHeaders", () => {
  test("SEC-004 uses the last X-Forwarded-For entry as the peer", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.9, 172.70.1.1",
      "cf-connecting-ip": "203.0.113.7",
    });
    expect(clientIpFromHeaders(headers, ranges)).toBe("203.0.113.7");
  });

  test("SEC-003 ignores CF-Connecting-IP when the peer is not Cloudflare", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.4",
      "cf-connecting-ip": "203.0.113.7",
    });
    expect(clientIpFromHeaders(headers, ranges)).toBe("198.51.100.4");
  });
});
