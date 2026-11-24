/** The start of the fixed window that holds `now`. */
export function windowStart(now: Date, windowSeconds: number): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

export type RateLimitRule = { limit: number; windowSeconds: number };

/** The limits of the sign-in pages, per ADR-0304. */
export const RATE_LIMITS = {
  totpPerUser: { limit: 5, windowSeconds: 5 * 60 },
  forgotPerIp: { limit: 10, windowSeconds: 60 * 60 },
  forgotPerEmail: { limit: 3, windowSeconds: 60 * 60 },
  resetPerIp: { limit: 10, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;
