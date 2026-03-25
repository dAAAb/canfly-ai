/**
 * Shared helpers for Community API endpoints.
 */

export interface Env {
  DB: D1Database
  AVATARS: R2Bucket
  TASK_RESULTS: R2Bucket
  WORLD_ID_APP_ID?: string
  WORLD_ID_RP_ID?: string
  WORLD_ID_ACTION?: string
  WORLD_ID_SIGNING_KEY?: string
  BASEMAIL_API_URL?: string
  BASEMAIL_API_KEY?: string
}

/** Standard CORS headers for cross-origin access */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Edit-Token, X-Wallet-Address',
}

/** Handle CORS preflight */
export function handleOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

/** Return JSON with CORS headers */
export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: CORS_HEADERS,
  })
}

/** Return error JSON with consistent format */
export function errorResponse(error: string, code: number): Response {
  return json({ error, code }, code)
}

/** Generate a random edit token (32 hex chars) */
export function generateEditToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Validate username: alphanumeric + hyphens + underscores, 2-30 chars */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{2,30}$/.test(username)
}

/** Validate agent name: alphanumeric + hyphens + underscores + spaces, 2-50 chars */
export function isValidAgentName(name: string): boolean {
  return /^[a-zA-Z0-9_ -]{2,50}$/.test(name)
}

/** Parse JSON body safely */
export async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

/** Generate a random API key (48 hex chars, prefixed with "cfa_") */
export function generateApiKey(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return 'cfa_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Generate a pairing code like CLAW-8K2M-X9F3 */
export function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I ambiguity
  const segment = (len: number) => {
    const bytes = new Uint8Array(len)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => chars[b % chars.length]).join('')
  }
  return `CLAW-${segment(4)}-${segment(4)}`
}

/** Parse integer query param with default */
export function intParam(url: URL, key: string, defaultValue: number): number {
  const val = url.searchParams.get(key)
  if (!val) return defaultValue
  const n = parseInt(val, 10)
  return isNaN(n) || n < 0 ? defaultValue : n
}
