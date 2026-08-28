import { describe, expect, it } from 'vitest'
import { rewriteV1Path } from './api-v1'

describe('rewriteV1Path', () => {
  it('maps /api/v1 to /api', () => {
    expect(rewriteV1Path('/api/v1')).toBe('/api')
    expect(rewriteV1Path('/api/v1/')).toBe('/api')
  })

  it('strips the v1 prefix from nested paths', () => {
    expect(rewriteV1Path('/api/v1/openapi.json')).toBe('/api/openapi.json')
    expect(rewriteV1Path('/api/v1/community/agents')).toBe('/api/community/agents')
  })
})
