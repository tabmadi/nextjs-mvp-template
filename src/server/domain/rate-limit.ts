/** The start of the fixed window that holds `now`. */
export function windowStart(now: Date, windowSeconds: number): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

export type RateLimitRule = { limit: number; windowSeconds: number };
