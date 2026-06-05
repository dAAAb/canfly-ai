import { describe, it, expect } from 'vitest'
import { requireCronSecret } from './_helpers'

/**
 * C3: admin/cron endpoints must FAIL CLOSED. The old `if (cronSecret) {…}`
 * pattern left endpoints public whenever CRON_SECRET was unset. These tests
 * simulate the admin/cron caller role under each condition.
 */
function req(headers: Record<string, string> = {}): Request {
  return new Request('https://canfly.ai/api/admin/diagnose', { method: 'POST', headers })
}

describe('requireCronSecret (fail-closed admin/cron auth — C3)', () => {
  it('DENIES (503) when CRON_SECRET is not configured — was previously OPEN', async () => {
    const res = requireCronSecret({} as never, req({ Authorization: 'Bearer anything' }))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(503)
  })

  it('denies (401) an anonymous caller', () => {
    const res = requireCronSecret({ CRON_SECRET: 's3cret' } as never, req())
    expect(res!.status).toBe(401)
  })

  it('denies (401) a wrong secret', () => {
    const res = requireCronSecret({ CRON_SECRET: 's3cret' } as never, req({ Authorization: 'Bearer nope' }))
    expect(res!.status).toBe(401)
  })

  it('allows (null) the correct secret via Authorization: Bearer', () => {
    const res = requireCronSecret({ CRON_SECRET: 's3cret' } as never, req({ Authorization: 'Bearer s3cret' }))
    expect(res).toBeNull()
  })

  it('allows (null) the correct secret via X-Cron-Secret', () => {
    const res = requireCronSecret({ CRON_SECRET: 's3cret' } as never, req({ 'X-Cron-Secret': 's3cret' }))
    expect(res).toBeNull()
  })
})
