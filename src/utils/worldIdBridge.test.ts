import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveBridgeSession, loadBridgeSession, clearBridgeSession } from './worldIdBridge'
import type { BridgeSession } from './worldIdBridge'

// Helper to create a real CryptoKey for testing
async function makeTestSession(): Promise<BridgeSession> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key))
  return {
    requestId: 'test-request-123',
    connectorURI: 'https://world.org/verify?t=wld&i=test-request-123&k=abc',
    key,
    rawKey,
  }
}

describe('worldIdBridge session persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and loads a bridge session', async () => {
    const session = await makeTestSession()
    saveBridgeSession(session, 'myAgent')

    const loaded = await loadBridgeSession('myAgent')
    expect(loaded).not.toBeNull()
    expect(loaded!.requestId).toBe('test-request-123')
    expect(loaded!.connectorURI).toBe(session.connectorURI)
  })

  it('returns null when no session stored', async () => {
    const loaded = await loadBridgeSession('myAgent')
    expect(loaded).toBeNull()
  })

  it('returns null for wrong agent name', async () => {
    const session = await makeTestSession()
    saveBridgeSession(session, 'agentA')

    const loaded = await loadBridgeSession('agentB')
    expect(loaded).toBeNull()
  })

  it('returns null for expired session (>5 min)', async () => {
    const session = await makeTestSession()
    saveBridgeSession(session, 'myAgent')

    // Manually expire the session
    const raw = JSON.parse(localStorage.getItem('canfly_agentbook_bridge')!)
    raw.createdAt = Date.now() - 400_000 // 6+ minutes ago
    localStorage.setItem('canfly_agentbook_bridge', JSON.stringify(raw))

    const loaded = await loadBridgeSession('myAgent')
    expect(loaded).toBeNull()
  })

  it('clearBridgeSession removes the stored session', async () => {
    const session = await makeTestSession()
    saveBridgeSession(session, 'myAgent')
    expect(localStorage.getItem('canfly_agentbook_bridge')).not.toBeNull()

    clearBridgeSession()
    expect(localStorage.getItem('canfly_agentbook_bridge')).toBeNull()
  })

  it('handles corrupted localStorage gracefully', async () => {
    localStorage.setItem('canfly_agentbook_bridge', 'not valid json{{{')

    const loaded = await loadBridgeSession('myAgent')
    expect(loaded).toBeNull()
    // Should also clean up the corrupted entry
    expect(localStorage.getItem('canfly_agentbook_bridge')).toBeNull()
  })

  it('loaded session can encrypt/decrypt', async () => {
    const session = await makeTestSession()
    saveBridgeSession(session, 'myAgent')

    const loaded = await loadBridgeSession('myAgent')
    expect(loaded).not.toBeNull()

    // Verify the loaded key works for encrypt/decrypt
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const plaintext = 'hello world'
    const encoded = new TextEncoder().encode(plaintext)
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, loaded!.key, encoded)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, loaded!.key, ciphertext)
    expect(new TextDecoder().decode(decrypted)).toBe(plaintext)
  })
})
