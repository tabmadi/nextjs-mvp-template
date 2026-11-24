import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

// Signed webhooks: HMAC-SHA256 over a timestamp and the body, and no delivery to a
// private, loopback, or link-local address.

export const SIGNATURE_HEADER = "Webhook-Signature";
/** A receiver rejects a signature older than this. */
export const TOLERANCE_SECONDS = 300;

export function newWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

/** `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`. */
export function signatureHeader(secret: string, body: string, unixSeconds: number): string {
  const mac = createHmac("sha256", secret).update(`${unixSeconds}.${body}`).digest("hex");
  return `t=${unixSeconds},v1=${mac}`;
}

export function verifySignature(
  secret: string,
  body: string,
  header: string,
  nowSeconds: number,
): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((part) => part.split("=", 2) as [string, string]),
  );
  const t = Number(parts.t);
  if (!Number.isInteger(t) || Math.abs(nowSeconds - t) > TOLERANCE_SECONDS || !parts.v1)
    return false;
  const expected = Buffer.from(signatureHeader(secret, body, t).split("v1=")[1] ?? "", "hex");
  const given = Buffer.from(parts.v1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

function ipv4Number(ip: string): number {
  return ip.split(".").reduce((acc, octet) => acc * 256 + Number(octet), 0);
}

const PRIVATE_V4: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

/** Whether an address is private, loopback, link-local, or otherwise not on the public internet. */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const value = ipv4Number(ip);
    return PRIVATE_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      return (value & mask) >>> 0 === (ipv4Number(base) & mask) >>> 0;
    });
  }
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isPrivateAddress(mapped[1]);
    return (
      lower === "::" ||
      lower === "::1" ||
      /^f[cd]/.test(lower) ||
      /^fe[89ab]/.test(lower) ||
      /^ff/.test(lower) ||
      lower.startsWith("64:ff9b:") ||
      lower.startsWith("2001:db8")
    );
  }
  return true;
}

/** A webhook URL is https on the default port or a public port, with no credentials in it. */
export function validateWebhookUrl(
  value: string,
): { ok: true; url: string } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return { ok: false, error: "Enter a full URL that starts with https://." };
  }
  if (url.protocol !== "https:") return { ok: false, error: "The URL must start with https://." };
  if (url.username || url.password)
    return { ok: false, error: "Remove the user name and password from the URL." };
  if (value.length > 2000) return { ok: false, error: "Use a URL of at most 2000 characters." };
  if (
    isIP(url.hostname.replace(/^\[|\]$/g, "")) &&
    isPrivateAddress(url.hostname.replace(/^\[|\]$/g, ""))
  )
    return { ok: false, error: "The URL points to a private address." };
  return { ok: true, url: url.toString() };
}
