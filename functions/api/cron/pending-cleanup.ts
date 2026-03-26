/**
 * POST /api/cron/pending-cleanup — Cancel stale pending_payment tasks
 *
 * CAN-237: Transition-period cron that cancels tasks stuck in
 * pending_payment for more than 24 hours. After CAN-232, new API tasks
 * are created as 'paid' directly, but the basemail-inbox flow may still
 * produce pending_payment tasks during the transition.
 *
 * Protected by CRON_SECRET env var.
 */
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'

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

  // Find pending_payment tasks older than 24 hours
  const stale = await env.DB.prepare(
    `SELECT id, seller_agent, skill_name, created_at
     FROM tasks
     WHERE status = 'pending_payment'
       AND created_at < datetime('now', '-24 hours')
     LIMIT 100`
  ).all()

  if (!stale.results.length) {
    return json({ cancelled: 0, message: 'No stale pending_payment tasks found.' })
  }

  // Cancel them in batch
  const ids = stale.results.map((t) => t.id as string)
  const placeholders = ids.map((_, i) => `?${i + 1}`).join(',')

  await env.DB.prepare(
    `UPDATE tasks
     SET status = 'cancelled', completed_at = datetime('now')
     WHERE id IN (${placeholders})`
  ).bind(...ids).run()

  return json({
    cancelled: ids.length,
    task_ids: ids,
    message: `Cancelled ${ids.length} stale pending_payment tasks.`,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
