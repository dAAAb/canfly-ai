/**
 * API-level middleware — rate limiting for all /api/* routes (CAN-270)
 *
 * Limits: 60 requests per hour per IP (default).
 * Agent-authenticated requests (Bearer cfa_*) get 120 req/hr keyed by API key prefix.
 * Cron endpoints (protected by CRON_SECRET) are exempt.
 *
 * Returns standard rate limit headers on every response:
 *   X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 * Returns 429 Too Many Requests when exceeded.
 */

import { type Env, CORS_HEADERS } from './community/_helpers'

const WINDOW_SECONDS = 3600 // 1 hour
const DEFAULT_LIMIT = 60    // requests per window (anonymous/IP)
const AGENT_LIMIT = 120     // requests per window (authenticated agent)

/** Endpoints exempt from rate limiting */
function isExempt(path: string, request: Request): boolean {
  // Cron endpoints are protected by CRON_SECRET, no need for rate limiting
  if (path.startsWith('/api/cron/')) return true
  // OPTIONS preflight requests
  if (request.method === 'OPTIONS') return true
  return false
}

/** Extract rate limit key and limit from request */
function getRateLimitKey(request: Request): { key: string; limit: number } {
  const auth = request.headers.get('authorization') || ''

  // Agent API key auth → key by API key prefix (first 12 chars)
  if (auth.startsWith('Bearer cfa_')) {
    const token = auth.slice(7)
    const prefix = token.slice(0, 16) // "cfa_" + 12 hex chars
    return { key: `agent:${prefix}`, limit: AGENT_LIMIT }
  }

  // Fall back to IP address
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  return { key: `ip:${ip}`, limit: DEFAULT_LIMIT }
}

/** Get current window start (Unix epoch truncated to hour boundary) */
function currentWindow(): number {
  return Math.floor(Date.now() / 1000 / WINDOW_SECONDS) * WINDOW_SECONDS
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const path = url.pathname

  if (isExempt(path, context.request)) {
    return context.next()
  }

  const { key, limit } = getRateLimitKey(context.request)
  const window = currentWindow()
  const resetAt = window + WINDOW_SECONDS

  let hits = 0
  let allowed = true

  try {
    // Atomic upsert: increment hit count for this key+window
    await context.env.DB.prepare(
      `INSERT INTO rate_limits (key, window, hits) VALUES (?1, ?2, 1)
       ON CONFLICT (key, window) DO UPDATE SET hits = hits + 1`
    )
      .bind(key, window)
      .run()

    // Read current count
    const row = await context.env.DB.prepare(
      `SELECT hits FROM rate_limits WHERE key = ?1 AND window = ?2`
    )
      .bind(key, window)
      .first<{ hits: number }>()

    hits = row?.hits ?? 1
    allowed = hits <= limit

    // Opportunistic cleanup: delete windows older than 2 hours (non-blocking)
    // Only run ~1% of requests to avoid overhead
    if (Math.random() < 0.01) {
      const cutoff = window - WINDOW_SECONDS * 2
      context.waitUntil(
        context.env.DB.prepare(`DELETE FROM rate_limits WHERE window < ?1`)
          .bind(cutoff)
          .run()
      )
    }
  } catch {
    // If rate limiting fails (e.g., table doesn't exist yet), allow the request
    // Don't block legitimate traffic due to rate limiting infrastructure issues
    return context.next()
  }

  const rateLimitHeaders: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, limit - hits)),
    'X-RateLimit-Reset': String(resetAt),
  }

  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${limit} requests per hour.`,
        retryAfter: resetAt - Math.floor(Date.now() / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(resetAt - Math.floor(Date.now() / 1000)),
          ...rateLimitHeaders,
          ...CORS_HEADERS,
        },
      }
    )
  }

  // Allow the request, then append rate limit headers to the response
  const response = await context.next()

  // Clone response to add headers (Response may be immutable)
  const newResponse = new Response(response.body, response)
  for (const [k, v] of Object.entries(rateLimitHeaders)) {
    newResponse.headers.set(k, v)
  }

  return newResponse
}
