/**
 * Shared helpers for Community API endpoints.
 */

export interface Env {
  DB: D1Database
  AVATARS: R2Bucket
  TASK_RESULTS: R2Bucket
  PRIVY_APP_ID?: string
  WORLD_ID_APP_ID?: string
  WORLD_ID_RP_ID?: string
  WORLD_ID_ACTION?: string
  WORLD_ID_SIGNING_KEY?: string
  BASEMAIL_API_URL?: string
  BASEMAIL_API_KEY?: string
  CRON_SECRET?: string
  GEMINI_API_KEY?: string
  OPENAI_API_KEY?: string
  ZEABUR_WEBHOOK_SECRET?: string
  ZEABUR_ADMIN_API_KEY?: string
  ENCRYPTION_KEY?: string
  // MPP (Machine Payments Protocol)
  MPP_ENABLED?: string
  MPP_SECRET_KEY?: string
  MPP_PRIVATE_KEY?: string
}

/** Standard CORS headers for cross-origin access */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Edit-Token, X-Wallet-Address, X-Buyer-Wallet, X-Canfly-Api-Key, X-Canfly-Channel, X-Canfly-Sender-Type, Payment, Payment-Method',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Payment-Receipt',
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

/** Validate agent name (slug format): lowercase alphanumeric + hyphens, 2-40 chars */
export function isValidAgentName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,38}[a-z0-9]$/.test(name) && !name.includes('--')
}

/**
 * Convert any string into a valid agent slug.
 * "My Second Zeabur Lobster" → "my-second-zeabur-lobster"
 */
export function toAgentSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')  // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')       // trim leading/trailing hyphens
    .replace(/-{2,}/g, '-')        // collapse consecutive hyphens
    .slice(0, 40)                  // max 40 chars
    .replace(/-+$/, '')            // trim trailing hyphen after slice
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

/** Pairing code validity period: 7 days */
export const PAIRING_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000

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

/** Generate a pairing code expiry timestamp (ISO string for D1) */
export function pairingCodeExpires(): string {
  return new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString().replace('T', ' ').slice(0, 19)
}

/** Parse integer query param with default */
export function intParam(url: URL, key: string, defaultValue: number): number {
  const val = url.searchParams.get(key)
  if (!val) return defaultValue
  const n = parseInt(val, 10)
  return isNaN(n) || n < 0 ? defaultValue : n
}
