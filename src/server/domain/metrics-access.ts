import { timingSafeEqual } from "node:crypto";

/**
 * Whether a request may read the metrics. The expected token comes from the environment.
 * An empty expected token refuses every request, so a missing setting never opens the endpoint.
 */
export function metricsAccessAllowed(
  authorization: string | null,
  expectedToken: string | undefined,
): boolean {
  if (!expectedToken || !authorization?.startsWith("Bearer ")) return false;
  const given = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(expectedToken);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
