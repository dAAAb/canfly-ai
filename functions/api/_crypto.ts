/**
 * Shared crypto helpers for task tokens.
 */

/** Derive a deterministic view token from task ID + server secret (HMAC-SHA256) */
export async function deriveViewToken(taskId: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(taskId))
  // Use first 16 bytes as hex = 32-char token
  return Array.from(new Uint8Array(sig).slice(0, 16), b => b.toString(16).padStart(2, '0')).join('')
}
