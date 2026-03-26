/**
 * POST /api/cron/sla-timeout — Scan for SLA-expired escrow tasks and auto-refund
 *
 * Runs on a schedule (external cron or Cloudflare Worker trigger).
 * Protected by CRON_SECRET env var.
 *
 * Logic:
 *   1. Find tasks with escrow_status='deposited' and sla_deadline past now
 *   2. Update each to status='timeout', escrow_status='refunded'
 *   3. Increment seller timeout_count via trust score recalc
 *   4. Return list of timed-out tasks (buyers can claim on-chain refund)
 *
 * CAN-217: SLA timeout auto-refund
 */
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'
import { recalcTrustScore } from '../agents/_trust'

interface TimeoutResult {
  id: string
  seller_agent: string
  buyer_agent: string | null
  amount: number | null
  currency: string | null
  escrow_tx: string | null
  sla_deadline: string
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  // Auth: require CRON_SECRET header or Bearer token
  const cronSecret = (env as unknown as Record<string, string>).CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('Authorization')
    const cronHeader = request.headers.get('X-Cron-Secret')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cronHeader
    if (token !== cronSecret) {
      return errorResponse('Unauthorized', 401)
    }
  }

  // 1. Find expired SLA tasks with active escrow deposits
  const now = new Date().toISOString()
  const expired = await env.DB.prepare(
    `SELECT id, seller_agent, buyer_agent, amount, currency, escrow_tx, sla_deadline
     FROM tasks
     WHERE escrow_status = 'deposited'
       AND sla_deadline IS NOT NULL
       AND sla_deadline < ?1
       AND status IN ('paid', 'executing')
     ORDER BY sla_deadline ASC
     LIMIT 100`
  ).bind(now).all()

  if (!expired.results || expired.results.length === 0) {
    return json({ timed_out: [], count: 0, message: 'No expired SLA tasks found.' })
  }

  const timedOut: TimeoutResult[] = []
  const sellersToRecalc = new Set<string>()

  // 2. Mark each expired task as timed out
  for (const task of expired.results) {
    await env.DB.prepare(
      `UPDATE tasks SET
         status = 'timeout',
         escrow_status = 'refunded'
       WHERE id = ?1 AND escrow_status = 'deposited'`
    ).bind(task.id).run()

    timedOut.push({
      id: task.id as string,
      seller_agent: task.seller_agent as string,
      buyer_agent: task.buyer_agent as string | null,
      amount: task.amount as number | null,
      currency: task.currency as string | null,
      escrow_tx: task.escrow_tx as string | null,
      sla_deadline: task.sla_deadline as string,
    })

    sellersToRecalc.add(task.seller_agent as string)
  }

  // 3. Recalculate trust scores for affected sellers
  for (const seller of sellersToRecalc) {
    await recalcTrustScore(env, seller)
  }

  return json({
    timed_out: timedOut,
    count: timedOut.length,
    sellers_updated: Array.from(sellersToRecalc),
    message: `${timedOut.length} task(s) timed out. Buyers can claim on-chain refund via TaskEscrow.refund().`,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
