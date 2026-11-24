import { isIP } from "node:net";

const ZERO = BigInt(0);
const BYTE = BigInt(8);
const HEXTET = BigInt(16);

function toBigInt(address: string): { value: bigint; bits: number } | undefined {
  const version = isIP(address);
  if (version === 4) {
    const value = address
      .split(".")
      .reduce((total, part) => (total << BYTE) + BigInt(Number(part)), ZERO);
    return { value, bits: 32 };
  }
  if (version === 6) {
    const [head = "", tail = ""] = address.split("::");
    const headParts = head ? head.split(":") : [];
    const tailParts = tail ? tail.split(":") : [];
    const missing = address.includes("::") ? 8 - headParts.length - tailParts.length : 0;
    const parts = [...headParts, ...Array(missing).fill("0"), ...tailParts];
    const value = parts.reduce((total, part) => (total << HEXTET) + BigInt(`0x${part}`), ZERO);
    return { value, bits: 128 };
  }
  return undefined;
}

function unmapIpv4(address: string): string {
  return address.toLowerCase().startsWith("::ffff:") && isIP(address.slice(7)) === 4
    ? address.slice(7)
    : address;
}

export function inRange(address: string, cidr: string): boolean {
  const [network = "", prefixText = ""] = cidr.split("/");
  const ip = toBigInt(unmapIpv4(address));
  const base = toBigInt(network);
  if (!ip || !base || ip.bits !== base.bits) return false;
  const shift = BigInt(base.bits - Number(prefixText));
  return ip.value >> shift === base.value >> shift;
}

/**
 * The address of the client. `peer` is the address that opened the connection to the proxy.
 * `CF-Connecting-IP` counts only when `peer` is inside the `ranges` of the trusted proxy.
 * Returns `undefined` when `peer` is not an IP address.
 */
export function clientIp(
  peer: string | null | undefined,
  cfConnectingIp: string | null | undefined,
  ranges: readonly string[],
): string | undefined {
  const address = peer?.trim();
  if (!address || !isIP(unmapIpv4(address))) return undefined;
  const forwarded = cfConnectingIp?.trim();
  const fromCloudflare = ranges.some((range) => inRange(address, range));
  if (fromCloudflare && forwarded && isIP(forwarded)) return forwarded;
  return unmapIpv4(address);
}

/** The proxy ends TLS and appends the address of its own peer to `X-Forwarded-For`. */
export function clientIpFromHeaders(
  headers: Headers,
  ranges: readonly string[],
): string | undefined {
  const peer = headers.get("x-forwarded-for")?.split(",").at(-1);
  return clientIp(peer, headers.get("cf-connecting-ip"), ranges);
}
