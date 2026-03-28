/**
 * POST /api/cron/escrow-auto-release — Auto-release escrow for unconfirmed completed tasks
 *
 * Runs on a schedule (external cron or Cloudflare Worker trigger).
 * Protected by CRON_SECRET env var.
 *
 * Logic:
 *   1. Find tasks with escrow_status='completed' and completed_at older than 7 days
 *   2. Auto-release: update escrow_status to 'released', set confirmed_at
 *   3. Recalculate seller trust scores
 *   4. Return list of auto-released tasks
 *
 * CAN-265: Escrow auto-release after buyer inaction (7-day timeout)
 */
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'
import { recalcTrustScore } from '../agents/_trust'

const AUTO_RELEASE_DAYS = 7

interface ReleaseResult {
  id: string
  seller_agent: string
  buyer_agent: string | null
  amount: number | null
  currency: string | null
  completed_at: string
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

  // 1. Find completed escrow tasks where buyer hasn't confirmed within 7 days
  const cutoff = new Date(Date.now() - AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const stale = await env.DB.prepare(
    `SELECT id, seller_agent, buyer_agent, amount, currency, completed_at
     FROM tasks
     WHERE escrow_status = 'completed'
       AND completed_at IS NOT NULL
       AND completed_at < ?1
       AND status = 'completed'
     ORDER BY completed_at ASC
     LIMIT 100`
  ).bind(cutoff).all()

  if (!stale.results || stale.results.length === 0) {
    return json({ released: [], count: 0, message: 'No stale escrow tasks found.' })
  }

  const released: ReleaseResult[] = []
  const sellersToRecalc = new Set<string>()

  // 2. Auto-release each stale task
  for (const task of stale.results) {
    await env.DB.prepare(
      `UPDATE tasks SET
         escrow_status = 'released',
         confirmed_at = datetime('now')
       WHERE id = ?1 AND escrow_status = 'completed'`
    ).bind(task.id).run()

    released.push({
      id: task.id as string,
      seller_agent: task.seller_agent as string,
      buyer_agent: task.buyer_agent as string | null,
      amount: task.amount as number | null,
      currency: task.currency as string | null,
      completed_at: task.completed_at as string,
    })

    sellersToRecalc.add(task.seller_agent as string)
  }

  // 3. Recalculate trust scores for affected sellers
  for (const seller of sellersToRecalc) {
    await recalcTrustScore(env, seller)
  }

  return json({
    released,
    count: released.length,
    sellers_updated: Array.from(sellersToRecalc),
    auto_release_days: AUTO_RELEASE_DAYS,
    message: `${released.length} task(s) auto-released after ${AUTO_RELEASE_DAYS} days without buyer confirmation. Sellers can claim on-chain via TaskEscrow.releaseAfterDispute().`,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
