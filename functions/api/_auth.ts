/**
 * Centralized authentication module for CanFly API (CAN-278)
 *
 * Supports three auth methods (checked in order):
 *   1. Privy JWT (Authorization: Bearer <jwt>) — cryptographically verified
 *   2. Edit Token (X-Edit-Token header) — DB-verified shared secret
 *   3. Wallet Address (X-Wallet-Address header) — DEPRECATED, logged for monitoring
 *
 * Privy JWTs are ES256 tokens verified against Privy's JWKS endpoint.
 * This runs on Cloudflare Workers (Web Crypto API, no Node.js).
 */

import { type Env } from './community/_helpers'

// ── Types ────────────────────────────────────────────────────────────

export interface AuthResult {
  /** Authenticated CanFly username */
  username: string
  /** How the user was authenticated */
  method: 'privy-jwt' | 'edit-token' | 'wallet-address'
  /** Wallet address (from verified JWT or header) */
  walletAddress: string | null
  /** Privy user ID (did:privy:...) — only present for JWT auth */
  privyUserId: string | null
}

interface JWK {
  kty: string
  crv: string
  x: string
  y: string
  kid: string
  use?: string
  alg?: string
}

interface JWKSResponse {
  keys: JWK[]
}

interface PrivyJWTPayload {
  sub: string       // did:privy:...
  iss: string       // privy.io
  aud: string       // app ID
  iat: number
  exp: number
  sid?: string       // session ID
  [key: string]: unknown
}

// ── JWKS Cache ───────────────────────────────────────────────────────

const JWKS_CACHE_TTL = 600 // 10 minutes
let cachedJWKS: { keys: CryptoKey[]; jwks: JWK[]; fetchedAt: number } | null = null

/** Fetch and cache Privy JWKS public keys */
async function getPrivyPublicKeys(appId: string): Promise<{ cryptoKey: CryptoKey; kid: string }[]> {
  const now = Date.now() / 1000

  if (cachedJWKS && (now - cachedJWKS.fetchedAt) < JWKS_CACHE_TTL) {
    return cachedJWKS.keys.map((key, i) => ({ cryptoKey: key, kid: cachedJWKS!.jwks[i].kid }))
  }

  const url = `https://auth.privy.io/api/v1/apps/${appId}/jwks`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch Privy JWKS: ${res.status}`)
  }

  const data = await res.json() as JWKSResponse
  const keys: CryptoKey[] = []

  for (const jwk of data.keys) {
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') continue
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    )
    keys.push(cryptoKey)
  }

  cachedJWKS = { keys, jwks: data.keys, fetchedAt: now }
  return keys.map((key, i) => ({ cryptoKey: key, kid: data.keys[i].kid }))
}

// ── JWT Verification ─────────────────────────────────────────────────

/** Base64url decode to Uint8Array */
function base64urlDecode(str: string): Uint8Array {
  // Add padding
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4)
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/** Verify a Privy JWT and return the decoded payload */
async function verifyPrivyJWT(
  token: string,
  appId: string,
): Promise<PrivyJWTPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, signatureB64] = parts

  // Decode header to get kid
  let header: { kid?: string; alg?: string }
  try {
    header = JSON.parse(new TextDecoder().decode(base64urlDecode(headerB64)))
  } catch {
    return null
  }

  if (header.alg !== 'ES256') return null

  // Decode payload
  let payload: PrivyJWTPayload
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)))
  } catch {
    return null
  }

  // Validate claims
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) return null           // expired
  if (payload.iss !== 'privy.io') return null                  // wrong issuer
  if (payload.aud !== appId) return null                       // wrong audience

  // Verify signature
  const publicKeys = await getPrivyPublicKeys(appId)
  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const signature = base64urlDecode(signatureB64)

  // ES256 signature is r||s, each 32 bytes
  if (signature.length !== 64) return null

  for (const { cryptoKey, kid } of publicKeys) {
    // If header has kid, only try matching key
    if (header.kid && kid !== header.kid) continue

    try {
      const valid = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        cryptoKey,
        signature,
        signedData,
      )
      if (valid) return payload
    } catch {
      // Try next key
    }
  }

  // If verification failed, try refetching JWKS (key rotation)
  cachedJWKS = null
  const freshKeys = await getPrivyPublicKeys(appId)
  for (const { cryptoKey, kid } of freshKeys) {
    if (header.kid && kid !== header.kid) continue
    try {
      const valid = await crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        cryptoKey,
        signature,
        signedData,
      )
      if (valid) return payload
    } catch {
      // Try next key
    }
  }

  return null
}

// ── Main Auth Function ───────────────────────────────────────────────

/**
 * Authenticate a request using the best available method.
 *
 * Order: Privy JWT → Edit Token → Wallet Address (deprecated)
 *
 * Returns null if authentication fails.
 */
export async function authenticateRequest(
  request: Request,
  db: D1Database,
  appId: string | undefined,
): Promise<AuthResult | null> {
  const authHeader = request.headers.get('Authorization') || ''
  const editToken = request.headers.get('X-Edit-Token')
  const walletAddress = request.headers.get('X-Wallet-Address')

  // ── Method 1: Privy JWT ──
  if (authHeader.startsWith('Bearer ') && !authHeader.startsWith('Bearer cfa_')) {
    const token = authHeader.slice(7)
    if (appId && token.includes('.')) {
      const payload = await verifyPrivyJWT(token, appId)
      if (payload) {
        // Look up user by privy_user_id first, then by wallet from linked accounts
        const privyUserId = payload.sub

        // Try to find user by privy_user_id
        const userByPrivy = await db.prepare(
          'SELECT username, wallet_address FROM users WHERE privy_user_id = ?1'
        ).bind(privyUserId).first<{ username: string; wallet_address: string | null }>()

        if (userByPrivy) {
          return {
            username: userByPrivy.username,
            method: 'privy-jwt',
            walletAddress: userByPrivy.wallet_address,
            privyUserId,
          }
        }

        // Fallback: try to find user by wallet address from header
        // (for users who haven't linked privy_user_id yet)
        if (walletAddress) {
          const userByWallet = await db.prepare(
            'SELECT username FROM users WHERE LOWER(wallet_address) = LOWER(?1)'
          ).bind(walletAddress).first<{ username: string }>()

          if (userByWallet) {
            // Backfill privy_user_id for next time
            await db.prepare(
              'UPDATE users SET privy_user_id = ?1 WHERE username = ?2 AND privy_user_id IS NULL'
            ).bind(privyUserId, userByWallet.username).run()

            return {
              username: userByWallet.username,
              method: 'privy-jwt',
              walletAddress,
              privyUserId,
            }
          }
        }

        // JWT is valid but no matching user in DB
        return null
      }
    }
  }

  // ── Method 2: Edit Token ──
  if (editToken) {
    // Check against users table
    const user = await db.prepare(
      'SELECT username, wallet_address FROM users WHERE edit_token = ?1'
    ).bind(editToken).first<{ username: string; wallet_address: string | null }>()

    if (user) {
      return {
        username: user.username,
        method: 'edit-token',
        walletAddress: user.wallet_address,
        privyUserId: null,
      }
    }
  }

  // ── Method 3: Wallet Address (DEPRECATED — no cryptographic verification) ──
  if (walletAddress) {
    const user = await db.prepare(
      'SELECT username, wallet_address FROM users WHERE LOWER(wallet_address) = LOWER(?1)'
    ).bind(walletAddress).first<{ username: string; wallet_address: string | null }>()

    if (user) {
      // Log deprecation warning (non-blocking)
      console.warn(`[auth] DEPRECATED: Request authenticated via bare X-Wallet-Address for user ${user.username}. Migrate to Privy JWT.`)
      return {
        username: user.username,
        method: 'wallet-address',
        walletAddress: user.wallet_address,
        privyUserId: null,
      }
    }
  }

  return null
}
