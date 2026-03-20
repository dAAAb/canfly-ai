/**
 * World ID Bridge Protocol — Pure browser implementation (no WASM)
 *
 * Replaces @worldcoin/idkit-core's createWorldBridgeStore with Web Crypto API.
 * Flow: generate keypair → POST /request → build deep link → poll /response → decrypt
 */

const BRIDGE_URL = 'https://bridge.worldcoin.org'

// ── Crypto helpers using Web Crypto API ──

async function generateKey(): Promise<{ key: CryptoKey; iv: Uint8Array; rawKey: Uint8Array }> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key))
  return { key, iv, rawKey }
}

function base64Encode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
}

function base64Decode(str: string): Uint8Array {
  const binary = atob(str)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

function base64UrlEncode(data: Uint8Array): string {
  return base64Encode(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
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

// ── Action encoding (matches IDKit) ──

function encodeAction(action: string): string {
  // For simple string actions, just return as-is
  // IDKit would ABI-encode complex actions, but AgentBook uses a plain string
  return action
}

// ── Signal encoding ──

async function hashSignal(signal: string): Promise<string> {
  const encoded = new TextEncoder().encode(signal)
  const hash = await crypto.subtle.digest('SHA-256', encoded)
  return '0x' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Bridge API ──

export interface BridgeSession {
  requestId: string
  connectorURI: string
  key: CryptoKey
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
): Promise<BridgeSession> {
  const { key, iv, rawKey } = await generateKey()

  const signalHash = await hashSignal(signal)

  const requestBody = JSON.stringify({
    app_id: appId,
    action: encodeAction(action),
    signal: signalHash,
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

  const keyB64 = base64UrlEncode(rawKey)
  const connectorURI = `https://world.org/verify?t=wld&i=${request_id}&k=${encodeURIComponent(keyB64)}`

  return { requestId: request_id, connectorURI, key }
}

export async function pollBridgeResult(
  session: BridgeSession,
  timeoutMs = 300000,
  intervalMs = 2000,
): Promise<BridgeResult> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const res = await fetch(`${BRIDGE_URL}/response/${session.requestId}`)

    if (res.ok) {
      const data = (await res.json()) as { iv: string; payload: string }
      if (data.iv && data.payload) {
        const decrypted = await decrypt(session.key, data.iv, data.payload)
        const result = JSON.parse(decrypted)

        if ('error_code' in result) {
          throw new Error(`World ID error: ${result.error_code}`)
        }

        return result as BridgeResult
      }
    }

    // 204 = still waiting
    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error('Verification timed out')
}
