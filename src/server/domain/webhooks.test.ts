import { describe, expect, test } from "vitest";
import {
  isPrivateAddress,
  newWebhookSecret,
  signatureHeader,
  validateWebhookUrl,
  verifySignature,
} from "./webhooks";

describe("webhook signatures", () => {
  const secret = newWebhookSecret();
  const body = JSON.stringify({ id: "e1", type: "payment.paid" });

  test("SEC-007 a receiver accepts what the sender signs", () => {
    const header = signatureHeader(secret, body, Math.floor(Date.now() / 1000));
    expect(verifySignature(secret, body, header, Math.floor(Date.now() / 1000))).toBe(true);
  });

  test("SEC-007 a changed body, a wrong secret, or an old timestamp fails", () => {
    const now = Math.floor(Date.now() / 1000);
    const header = signatureHeader(secret, body, now);
    expect(verifySignature(secret, `${body} `, header, now)).toBe(false);
    expect(verifySignature(newWebhookSecret(), body, header, now)).toBe(false);
    expect(verifySignature(secret, body, signatureHeader(secret, body, now - 600), now)).toBe(
      false,
    );
  });
});

describe("isPrivateAddress", () => {
  test("SEC-008 refuses private, loopback, and link-local addresses", () => {
    for (const ip of [
      "10.0.0.1",
      "127.0.0.1",
      "169.254.169.254",
      "192.168.1.1",
      "172.20.0.1",
      "::1",
      "fe80::1",
      "fd00::1",
      "::ffff:10.0.0.1",
      "0.0.0.0",
      "100.64.0.1",
    ])
      expect(isPrivateAddress(ip)).toBe(true);
  });

  test("SEC-008 accepts public addresses", () => {
    for (const ip of ["1.1.1.1", "88.99.162.113", "2606:4700:4700::1111"])
      expect(isPrivateAddress(ip)).toBe(false);
  });

  test("SEC-008 a URL with a private IP or without https is refused", () => {
    expect(validateWebhookUrl("https://10.0.0.1/hook").ok).toBe(false);
    expect(validateWebhookUrl("https://127.0.0.1/hook").ok).toBe(false);
    expect(validateWebhookUrl("http://shop.example/hook").ok).toBe(false);
    expect(validateWebhookUrl("https://shop.example/hook").ok).toBe(true);
  });
});
