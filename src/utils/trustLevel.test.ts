import { describe, it, expect } from 'vitest'
import { getTrustLevel } from './trustLevel'

describe('getTrustLevel', () => {
  it('returns "orb" for orb verification level', () => {
    expect(getTrustLevel({ verification_level: 'orb' })).toBe('orb')
  })

  it('returns "orb" case-insensitively', () => {
    expect(getTrustLevel({ verification_level: 'Orb' })).toBe('orb')
  })

  it('returns "world" for device verification level', () => {
    expect(getTrustLevel({ verification_level: 'device' })).toBe('world')
  })

  it('returns "world" for "world" verification level', () => {
    expect(getTrustLevel({ verification_level: 'world' })).toBe('world')
  })

  it('returns "world" for "worldid" verification level', () => {
    expect(getTrustLevel({ verification_level: 'worldid' })).toBe('world')
  })

  it('returns "wallet" when wallet_address is present but no verification', () => {
    expect(getTrustLevel({ wallet_address: '0xABC123' })).toBe('wallet')
  })

  it('returns "unverified" when no wallet and no verification', () => {
    expect(getTrustLevel({})).toBe('unverified')
  })

  it('returns "unverified" when wallet_address is null', () => {
    expect(getTrustLevel({ wallet_address: null, verification_level: null })).toBe('unverified')
  })

  it('prioritizes orb over wallet', () => {
    expect(getTrustLevel({ verification_level: 'orb', wallet_address: '0x123' })).toBe('orb')
  })

  it('prioritizes world over wallet', () => {
    expect(getTrustLevel({ verification_level: 'device', wallet_address: '0x123' })).toBe('world')
  })
})
