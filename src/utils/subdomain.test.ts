import { describe, it, expect } from 'vitest'
import {
  detectSubdomain,
  isUserSubdomain,
  profileSubdomainHost,
  profileSubdomainUrl,
  profilePathUrl,
} from './subdomain'

describe('detectSubdomain', () => {
  it('reads a user host such as peter.canfly.ai', () => {
    expect(detectSubdomain('peter.canfly.ai')).toBe('peter')
    expect(detectSubdomain('Peter.canfly.ai')).toBe('peter')
    expect(detectSubdomain('daaab.canfly.ai:8788')).toBe('daaab')
  })

  it('ignores the apex and www', () => {
    expect(detectSubdomain('canfly.ai')).toBeNull()
    expect(detectSubdomain('www.canfly.ai')).toBeNull()
    expect(detectSubdomain('CANFLY.AI')).toBeNull()
  })

  it('ignores reserved infrastructure hosts', () => {
    expect(detectSubdomain('api.canfly.ai')).toBeNull()
    expect(detectSubdomain('cdn.canfly.ai')).toBeNull()
    expect(detectSubdomain('staging.canfly.ai')).toBeNull()
    expect(detectSubdomain('admin.canfly.ai')).toBeNull()
  })

  it('ignores nested hosts and unrelated domains', () => {
    expect(detectSubdomain('foo.bar.canfly.ai')).toBeNull()
    expect(detectSubdomain('peter.canfly.ai.evil.com')).toBeNull()
    expect(detectSubdomain('localhost')).toBeNull()
    expect(detectSubdomain('canfly-ai.pages.dev')).toBeNull()
  })
})

describe('isUserSubdomain', () => {
  it('is true only for a real user host', () => {
    expect(isUserSubdomain('alice.canfly.ai')).toBe(true)
    expect(isUserSubdomain('www.canfly.ai')).toBe(false)
  })
})

describe('profile URL helpers', () => {
  it('keeps display-case usernames on the share host', () => {
    expect(profileSubdomainHost('Peter')).toBe('Peter.canfly.ai')
    expect(profileSubdomainUrl('Peter')).toBe('https://Peter.canfly.ai/')
    expect(profileSubdomainUrl('Peter', '/agent/LittleLobster')).toBe(
      'https://Peter.canfly.ai/agent/LittleLobster',
    )
  })

  it('builds the /u/ fallback used on the apex site', () => {
    expect(profilePathUrl('Peter')).toBe('https://canfly.ai/u/Peter')
    expect(profilePathUrl('Peter', '/agent/X')).toBe('https://canfly.ai/u/Peter/agent/X')
  })
})
