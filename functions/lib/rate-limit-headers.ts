/** Shared rate-limit header builder (legacy X-RateLimit-* + IETF RateLimit-*). */

export const RATE_LIMIT_WINDOW_SECONDS = 3600

export function buildRateLimitHeaders(args: {
  limit: number
  hits: number
  resetAt: number
  now?: number
}): Record<string, string> {
  const remaining = Math.max(0, args.limit - args.hits)
  const now = args.now ?? Math.floor(Date.now() / 1000)
  const resetIn = Math.max(0, args.resetAt - now)
  return {
    'X-RateLimit-Limit': String(args.limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(args.resetAt),
    'RateLimit-Limit': String(args.limit),
    'RateLimit-Remaining': String(remaining),
    'RateLimit-Reset': String(resetIn),
    'RateLimit-Policy': `${args.limit};w=${RATE_LIMIT_WINDOW_SECONDS}`,
  }
}
