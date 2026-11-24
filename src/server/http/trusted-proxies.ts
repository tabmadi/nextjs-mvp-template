import "server-only";

/**
 * The source ranges of the proxy in front of the app, such as the Cloudflare ranges, from
 * TRUSTED_PROXY_RANGES. Empty means no forwarded client address is trusted.
 */
export function trustedProxyRanges(): string[] {
  return (process.env.TRUSTED_PROXY_RANGES ?? "")
    .split(",")
    .map((range) => range.trim())
    .filter(Boolean);
}
