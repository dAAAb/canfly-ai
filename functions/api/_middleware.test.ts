import { describe, expect, it } from 'vitest'
import { ensureJsonApiResponse } from './_middleware'
import { errorResponse } from './community/_helpers'

describe('ensureJsonApiResponse', () => {
  it('leaves JSON alone', () => {
    const ok = new Response('{"ok":true}', { headers: { 'Content-Type': 'application/json' } })
    expect(ensureJsonApiResponse(ok, '/api/community/health')).toBe(ok)
  })

  it('replaces an HTML SPA shell with problem+json 404', async () => {
    const html = new Response('<html><div id="root"></div></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
    const res = ensureJsonApiResponse(html, '/api/this-does-not-exist')
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toMatch(/problem\+json/)
    const body = await res.json() as { code: string; title: string }
    expect(body.code).toBe('not_found')
    expect(body.title).toContain('/api/this-does-not-exist')
  })
})

describe('errorResponse', () => {
  it('returns RFC 9457 fields and a machine-readable code', async () => {
    const res = errorResponse('Agent not found', 404, 'GET /api/community/agents')
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toMatch(/problem\+json/)
    const body = await res.json() as { code: string; error: string; hint: string }
    expect(body.code).toBe('not_found')
    expect(body.error).toBe('Agent not found')
    expect(body.hint).toContain('/api/community/agents')
  })
})
