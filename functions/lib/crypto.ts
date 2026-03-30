/**
 * AES-256-GCM field-level encryption for sensitive keys stored in D1.
 *
 * Encrypted format: "enc:v1:<base64(12-byte IV + ciphertext + 16-byte auth tag)>"
 * Backward compatible: decrypt() returns plaintext strings unchanged.
 */

const PREFIX = 'enc:v1:'

/** Import a base64-encoded 256-bit key as an AES-GCM CryptoKey. */
export async function importKey(base64Key: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

/** Encrypt plaintext → "enc:v1:<base64>" */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  // Concatenate IV + ciphertext (which includes the 16-byte auth tag)
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(cipherBuf), iv.length)
  return PREFIX + btoa(String.fromCharCode(...combined))
}

/** Decrypt "enc:v1:..." → plaintext. Returns non-encrypted strings as-is. */
export async function decrypt(value: string, key: CryptoKey): Promise<string> {
  if (!value || !value.startsWith(PREFIX)) return value
  const combined = Uint8Array.from(atob(value.slice(PREFIX.length)), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plainBuf)
}

/** Check if a value is already encrypted. */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}
