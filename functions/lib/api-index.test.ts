import { describe, expect, it } from 'vitest'
import { apiIndexDocument } from './api-index'

describe('apiIndexDocument', () => {
  it('points agents at OpenAPI, MCP, and docs', () => {
    const doc = apiIndexDocument()
    expect(doc.version).toBe('1')
    expect(doc.openapi).toContain('/api/openapi.json')
    expect(doc.mcp).toContain('/mcp')
    expect(doc.docs).toContain('/developers')
  })
})
