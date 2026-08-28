import { describe, expect, it } from 'vitest'
import { buildRateLimitHeaders } from './rate-limit-headers'

describe('buildRateLimitHeaders', () => {
  it('emits legacy and IETF rate-limit headers', () => {
    const headers = buildRateLimitHeaders({
      limit: 300,
      hits: 4,
      resetAt: 1_800,
      now: 1_000,
    })
    expect(headers['X-RateLimit-Limit']).toBe('300')
    expect(headers['X-RateLimit-Remaining']).toBe('296')
    expect(headers['X-RateLimit-Reset']).toBe('1800')
    expect(headers['RateLimit-Limit']).toBe('300')
    expect(headers['RateLimit-Remaining']).toBe('296')
    expect(headers['RateLimit-Reset']).toBe('800')
    expect(headers['RateLimit-Policy']).toBe('300;w=3600')
  })
})
