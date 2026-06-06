import { describe, it, expect } from 'vitest'
import { onRequestPost } from './confirm'

/**
 * H1 (escrow confirm/reject was UI-broken: backend required the buyer agent's
 * api_key, which the dashboard never sent) + H9 (confirm must be idempotent).
 *
 * These simulate the buyer/attacker roles hitting POST /confirm. We use the
 * api_key authorization path (no Privy JWT needed) and the early-return paths
 * (403 / idempotent-200 / state-400) which resolve before any trust recalc.
 */
function mockEnv(taskRow: unknown, buyerRow: unknown) {
  return {
    PRIVY_APP_ID: undefined,
    DB: {
      prepare(sql: string) {
        return {
          bind() {
            return {
              first: async () => {
                if (/FROM tasks/i.test(sql)) return taskRow
                if (/FROM agents/i.test(sql)) return buyerRow
                return null
              },
              run: async () => ({ success: true }),
            }
          },
        }
      },
    },
  } as never
}

const ctx = (env: unknown, headers: Record<string, string> = {}) => ({
  env,
  params: { name: 'seller-bot', id: 'task-1' },
  request: new Request('https://canfly.ai/api/agents/seller-bot/tasks/task-1/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: '{}',
  }),
}) as never

const completedTask = { id: 'task-1', buyer_agent: 'buyer-bot', seller_agent: 'seller-bot', status: 'completed', escrow_status: 'completed' }
const buyer = { name: 'buyer-bot', api_key: 'cfa_correct', owner_username: 'alice' }

describe('escrow confirm authorization + idempotency (H1/H9)', () => {
  it('rejects an unauthenticated attacker (403)', async () => {
    const res = await onRequestPost(ctx(mockEnv(completedTask, buyer)))
    expect(res.status).toBe(403)
  })

  it('rejects a wrong API key (403) — cannot confirm on another buyer’s behalf', async () => {
    const res = await onRequestPost(ctx(mockEnv(completedTask, buyer), { Authorization: 'Bearer cfa_wrong' }))
    expect(res.status).toBe(403)
  })

  it('is idempotent: a duplicate confirm on an already-released escrow returns 200', async () => {
    const released = { ...completedTask, escrow_status: 'released' }
    const res = await onRequestPost(ctx(mockEnv(released, buyer), { Authorization: 'Bearer cfa_correct' }))
    expect(res.status).toBe(200)
    const body = await res.json() as { escrow?: { status?: string } }
    expect(body.escrow?.status).toBe('released')
  })

  it('the legit buyer passes auth but is blocked by state when task is not completed (400, not 403)', async () => {
    const notDone = { ...completedTask, status: 'paid' }
    const res = await onRequestPost(ctx(mockEnv(notDone, buyer), { Authorization: 'Bearer cfa_correct' }))
    expect(res.status).toBe(400)
  })
})
