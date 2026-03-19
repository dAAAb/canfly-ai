import { describe, it, expect } from 'vitest'

/**
 * Tests for the wallet address matching logic used in lookup-wallet API
 * and the frontend canEdit check. This validates the case-insensitive
 * comparison that was part of the CAN-164 bug fixes.
 */

// Extracted wallet matching logic used in both API and frontend
function walletMatches(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return a.toLowerCase() === b.toLowerCase()
}

describe('wallet address matching (case-insensitive)', () => {
  it('matches identical addresses', () => {
    expect(walletMatches('0xABC123', '0xABC123')).toBe(true)
  })

  it('matches addresses with different casing', () => {
    expect(walletMatches('0xABC123def456', '0xabc123DEF456')).toBe(true)
  })

  it('matches fully lowercased vs checksummed address', () => {
    expect(
      walletMatches(
        '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      ),
    ).toBe(true)
  })

  it('does not match different addresses', () => {
    expect(walletMatches('0xABC123', '0xDEF456')).toBe(false)
  })

  it('returns false when first address is null', () => {
    expect(walletMatches(null, '0xABC123')).toBe(false)
  })

  it('returns false when second address is null', () => {
    expect(walletMatches('0xABC123', null)).toBe(false)
  })

  it('returns false when both addresses are null', () => {
    expect(walletMatches(null, null)).toBe(false)
  })

  it('does not match empty strings', () => {
    expect(walletMatches('', '0xABC123')).toBe(false)
    expect(walletMatches('0xABC123', '')).toBe(false)
  })
})

describe('basename resolution logic', () => {
  // Simulates the basename search done in lookup-wallet.ts
  function findUserByBasename(
    users: Array<{ username: string; links: string }>,
    address: string,
  ): string | null {
    if (!address.includes('.eth') && !address.includes('.base.eth')) return null
    for (const u of users) {
      try {
        const links = JSON.parse(u.links)
        if (links.basename && links.basename.toLowerCase() === address.toLowerCase()) {
          return u.username
        }
      } catch {
        // skip malformed JSON
      }
    }
    return null
  }

  it('finds user by exact basename match', () => {
    const users = [
      { username: 'alice', links: JSON.stringify({ basename: 'alice.base.eth' }) },
    ]
    expect(findUserByBasename(users, 'alice.base.eth')).toBe('alice')
  })

  it('matches basename case-insensitively', () => {
    const users = [
      { username: 'bob', links: JSON.stringify({ basename: 'Bob.Base.Eth' }) },
    ]
    expect(findUserByBasename(users, 'bob.base.eth')).toBe('bob')
  })

  it('returns null for non-.eth addresses', () => {
    const users = [
      { username: 'alice', links: JSON.stringify({ basename: 'alice.base.eth' }) },
    ]
    expect(findUserByBasename(users, '0xABC123')).toBeNull()
  })

  it('skips users with malformed JSON links', () => {
    const users = [
      { username: 'bad', links: 'not-json' },
      { username: 'good', links: JSON.stringify({ basename: 'good.base.eth' }) },
    ]
    expect(findUserByBasename(users, 'good.base.eth')).toBe('good')
  })

  it('returns null when no match found', () => {
    const users = [
      { username: 'alice', links: JSON.stringify({ basename: 'alice.base.eth' }) },
    ]
    expect(findUserByBasename(users, 'unknown.base.eth')).toBeNull()
  })
})
