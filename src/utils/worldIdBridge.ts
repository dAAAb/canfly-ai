/**
 * World ID Bridge Protocol — Pure browser implementation (no WASM)
 *
 * Replaces @worldcoin/idkit-core's createWorldBridgeStore with Web Crypto API.
 * Flow: generate keypair → POST /request → build deep link → poll /response → decrypt
 */

import { keccak256, toHex } from 'viem'

const BRIDGE_URL = 'https://bridge.worldcoin.org'

// ── Crypto helpers using Web Crypto API ──

async function generateKey(): Promise<{ key: CryptoKey; iv: Uint8Array; rawKey: Uint8Array }> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key))
  return { key, iv, rawKey }
}

// Standard base64 (NOT base64url) — matches IDKit's Buffer.toString('base64')
function base64Encode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
}

function base64Decode(str: string): Uint8Array {
  const binary = atob(str)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

async function encrypt(key: CryptoKey, iv: Uint8Array, plaintext: string): Promise<{ payload: string; iv: string }> {
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return {
    payload: base64Encode(new Uint8Array(ciphertext)),
    iv: base64Encode(iv),
  }
}

async function decrypt(key: CryptoKey, ivB64: string, payloadB64: string): Promise<string> {
  const iv = base64Decode(ivB64)
  const ciphertext = base64Decode(payloadB64)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

// ── Signal hashing (must match IDKit's generateSignal / hashToField) ──
// IDKit does: keccak256(input) >> 8n  (to fit in BN254 field)
export function hashToField(input: string): string {
  // For hex strings (like our keccak256 output), hash the raw bytes
  const hash = keccak256(toHex(new TextEncoder().encode(input)))
  // Right-shift by 8 bits to fit in BN254 scalar field
  const bigVal = BigInt(hash) >> 8n
  return `0x${bigVal.toString(16).padStart(64, '0')}`
}

// ── Bridge API ──

export interface BridgeSession {
  requestId: string
  connectorURI: string
  key: CryptoKey
  rawKey: Uint8Array  // needed for sessionStorage persistence
}

// ── Session persistence (survives mobile redirect) ──

const SESSION_KEY = 'canfly_agentbook_bridge'

interface StoredSession {
  requestId: string
  connectorURI: string
  rawKey: string  // base64
  agentName: string
  createdAt: number
}

export function saveBridgeSession(session: BridgeSession, agentName: string): void {
  const stored: StoredSession = {
    requestId: session.requestId,
    connectorURI: session.connectorURI,
    rawKey: base64Encode(session.rawKey),
    agentName,
    createdAt: Date.now(),
  }
  // Use localStorage (not sessionStorage) — survives iOS Safari app switching
  localStorage.setItem(SESSION_KEY, JSON.stringify(stored))
}

export async function loadBridgeSession(agentName: string): Promise<BridgeSession | null> {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredSession
    // Expire after 5 min
    if (Date.now() - stored.createdAt > 300_000) { localStorage.removeItem(SESSION_KEY); return null }
    if (stored.agentName !== agentName) return null

    const rawKey = base64Decode(stored.rawKey)
    const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
    return { requestId: stored.requestId, connectorURI: stored.connectorURI, key, rawKey }
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function clearBridgeSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export interface BridgeResult {
  merkle_root: string
  nullifier_hash: string
  proof: string
  verification_level?: string
  credential_type?: string
}

export async function createBridgeSession(
  appId: string,
  action: string,
  signal: string,
  returnTo?: string,
  /** Pre-computed signal hash — if provided, skips internal hashToField.
   *  Use when the contract signal uses packed encoding (e.g. abi.encodePacked(agent, nonce)). */
  signalHash?: string,
): Promise<BridgeSession> {
  const { key, iv, rawKey } = await generateKey()

  // Use pre-computed hash if provided, otherwise hash the raw signal string
  const signalDigest = signalHash || hashToField(signal)
  console.log(`[WorldID Bridge] signal=${signal} signalDigest=${signalDigest}`)

  const requestBody = JSON.stringify({
    app_id: appId,
    action,  // Simple string action, no encoding needed
    signal: signalDigest,
    credential_types: ['orb'],
    verification_level: 'orb',
  })

  const encrypted = await encrypt(key, iv, requestBody)

  const res = await fetch(`${BRIDGE_URL}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(encrypted),
  })

  if (!res.ok) throw new Error(`Bridge request failed: ${res.status}`)

  const { request_id } = (await res.json()) as { request_id: string }

  // Key must be standard base64 (not base64url!) — matches IDKit's exportKey
  const keyB64 = base64Encode(rawKey)
  const connectorURI =
    `https://world.org/verify?t=wld&i=${request_id}&k=${encodeURIComponent(keyB64)}` +
    (returnTo ? `&return_to=${encodeURIComponent(returnTo)}` : '')

  return { requestId: request_id, connectorURI, key, rawKey }
}

/**
 * Single poll attempt — returns result if available, null if not yet.
 * Exported so callers can do one-shot checks (e.g. on visibilitychange).
 */
export async function pollBridgeOnce(session: BridgeSession): Promise<BridgeResult | null> {
  try {
    const res = await fetch(`${BRIDGE_URL}/response/${session.requestId}`)
    console.log(`[WorldID Bridge] poll status=${res.status}`)

    // Not ready yet — user hasn't verified in World App
    if (res.status === 404 || res.status === 204) {
      return null
    }

    // Non-200 — retryable, don't crash
    if (res.status !== 200) {
      console.warn(`[WorldID Bridge] unexpected status ${res.status}, will retry`)
      return null
    }

    // Safely parse response body
    // Bridge returns nested format: { status: "initialized"|"retrieved"|"completed", response: null | {iv, payload} }
    let data: { status?: string; response?: { iv?: string; payload?: string } | null; iv?: string; payload?: string }
    try {
      const text = await res.text()
      console.log(`[WorldID Bridge] raw response (first 300 chars):`, text.substring(0, 300))
      data = JSON.parse(text)
    } catch {
      console.warn('[WorldID Bridge] response is not valid JSON, treating as not-ready')
      return null
    }

    // Handle nested bridge format: { status, response }
    // status "initialized" = request created, waiting for World App to scan
    // status "retrieved"   = World App scanned QR, user verifying
    // status "completed"   = verification done, encrypted payload in response
    if (data.status) {
      console.log(`[WorldID Bridge] bridge status: ${data.status}`)

      if (data.status === 'initialized' || data.status === 'retrieved') {
        // Not done yet — keep polling
        return null
      }

      if (data.status === 'completed') {
        const inner = data.response
        if (!inner || !inner.iv || !inner.payload) {
          console.warn('[WorldID Bridge] completed but response missing iv/payload:', JSON.stringify(data).substring(0, 300))
          return null
        }

        let decrypted: string
        try {
          decrypted = await decrypt(session.key, inner.iv, inner.payload)
        } catch (decryptErr) {
          console.warn('[WorldID Bridge] decryption failed — session key mismatch?', decryptErr)
          clearBridgeSession()
          return null
        }

        console.log(`[WorldID Bridge] decrypted:`, decrypted.substring(0, 200))
        const result = JSON.parse(decrypted)

        if ('error_code' in result) {
          throw new Error(`World ID error: ${result.error_code}`)
        }

        return result as BridgeResult
      }

      // Unknown status — log and keep polling
      console.warn(`[WorldID Bridge] unknown bridge status: ${data.status}`)
      return null
    }

    // Fallback: flat format { iv, payload } (legacy or direct bridge format)
    const iv = data.iv
    const payload = data.payload
    if (!iv || !payload) {
      console.warn('[WorldID Bridge] 200 response has no status and no iv/payload:', JSON.stringify(data).substring(0, 200))
      clearBridgeSession()
      return null
    }

    let decrypted: string
    try {
      decrypted = await decrypt(session.key, iv, payload)
    } catch (decryptErr) {
      console.warn('[WorldID Bridge] decryption failed — session key mismatch?', decryptErr)
      clearBridgeSession()
      return null
    }

    console.log(`[WorldID Bridge] decrypted:`, decrypted.substring(0, 200))
    const result = JSON.parse(decrypted)

    if ('error_code' in result) {
      throw new Error(`World ID error: ${result.error_code}`)
    }

    return result as BridgeResult
  } catch (e) {
    console.warn('[WorldID Bridge] poll error:', e)
    throw e instanceof Error ? e : new Error('Unknown bridge polling error')
  }
}

export async function pollBridgeResult(
  session: BridgeSession,
  timeoutMs = 300000,
  intervalMs = 2000,
): Promise<BridgeResult> {
  const deadline = Date.now() + timeoutMs

  // Immediate first check (no delay)
  const immediate = await pollBridgeOnce(session)
  if (immediate) return immediate

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, intervalMs))

    const result = await pollBridgeOnce(session)
    if (result) return result
  }

  throw new Error('Verification timed out')
}
