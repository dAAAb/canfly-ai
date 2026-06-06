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
const DEFAULT_LIMIT = 300   // requests per window (anonymous/IP — enough for normal browsing)
const AGENT_LIMIT = 600     // requests per window (authenticated agent)

const CANONICAL_ORIGIN = 'https://canfly.ai'

/**
 * Resolve a safe Access-Control-Allow-Origin (security audit P1/H6).
 *
 * The shared helpers emit `Access-Control-Allow-Origin: *` for every endpoint.
 * Here — at the single /api chokepoint — we replace that blanket wildcard with
 * an allowlisted reflection: first-party canfly.ai (+ subdomains) and localhost
 * dev are reflected; everything else falls back to the canonical origin so a
 * third-party site cannot read authenticated API responses in a browser.
 * (No Access-Control-Allow-Credentials is set, so this is purely defence-in-depth.)
 */
function resolveAllowedOrigin(request: Request): string {
  const origin = request.headers.get('origin') || ''
  try {
    const host = new URL(origin).hostname.toLowerCase()
    if (host === 'canfly.ai' || host.endsWith('.canfly.ai') ||
        host === 'localhost' || host === '127.0.0.1') {
      return origin
    }
  } catch { /* no/!valid Origin header (server-side caller) — CORS irrelevant */ }
  return CANONICAL_ORIGIN
}

/** Overwrite the wildcard CORS origin on a response with the allowlisted value. */
function applyCorsOrigin(response: Response, request: Request): void {
  response.headers.set('Access-Control-Allow-Origin', resolveAllowedOrigin(request))
  const vary = response.headers.get('Vary')
  response.headers.set('Vary', vary ? `${vary}, Origin` : 'Origin')
}

/** Endpoints exempt from rate limiting */
function isExempt(path: string, request: Request): boolean {
  // Cron endpoints are protected by CRON_SECRET, no need for rate limiting
  if (path.startsWith('/api/cron/')) return true
  // OPTIONS preflight requests
  if (request.method === 'OPTIONS') return true
  // Same-origin requests from our own frontend (Referer or Origin matches canfly.ai)
  const origin = request.headers.get('origin') || ''
  const referer = request.headers.get('referer') || ''
  if (
    origin.endsWith('canfly.ai') ||
    referer.includes('canfly.ai')
  ) {
    return true
  }
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
    // Don't block legitimate traffic due to rate limiting infrastructure issues.
    // Still scope the CORS origin so this fallback path matches the normal one.
    const resp = await context.next()
    const fallback = new Response(resp.body, resp)
    applyCorsOrigin(fallback, context.request)
    return fallback
  }

  const rateLimitHeaders: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(Math.max(0, limit - hits)),
    'X-RateLimit-Reset': String(resetAt),
  }

  if (!allowed) {
    const limited = new Response(
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
    applyCorsOrigin(limited, context.request)
    return limited
  }

  // Allow the request, then append rate limit headers to the response
  const response = await context.next()

  // Clone response to add headers (Response may be immutable)
  const newResponse = new Response(response.body, response)
  for (const [k, v] of Object.entries(rateLimitHeaders)) {
    newResponse.headers.set(k, v)
  }
  // Tighten the wildcard CORS origin to the allowlisted value (H6).
  applyCorsOrigin(newResponse, context.request)

  return newResponse
}
