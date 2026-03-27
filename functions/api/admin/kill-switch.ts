/**
 * Kill-switch API — CAN-258
 *
 * GET  /api/admin/kill-switch  — returns current kill-switch state
 * POST /api/admin/kill-switch  — toggle { enabled: true/false, reason: string }
 *
 * Auth: admin only (Bearer CRON_SECRET)
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

/** Verify admin auth via Bearer token (CRON_SECRET) */
function requireAdmin(request: Request, env: Env): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return 'Authorization required'
  const token = authHeader.slice(7)
  if (!env.CRON_SECRET || token !== env.CRON_SECRET) return 'Forbidden'
  return null
}

/** GET — current kill-switch state */
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const authError = requireAdmin(request, env)
  if (authError) return errorResponse(authError, authError === 'Forbidden' ? 403 : 401)

  const row = await env.DB.prepare(
    'SELECT enabled, triggered_at, triggered_by, reason FROM kill_switch WHERE id = 1'
  ).first()

  if (!row) {
    return json({ enabled: false, triggered_at: null, triggered_by: null, reason: null })
  }

  return json({
    enabled: row.enabled === 1,
    triggered_at: row.triggered_at,
    triggered_by: row.triggered_by,
    reason: row.reason,
  })
}

/** POST — toggle kill-switch */
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const authError = requireAdmin(request, env)
  if (authError) return errorResponse(authError, authError === 'Forbidden' ? 403 : 401)

  const body = await parseBody<{ enabled: boolean; reason?: string }>(request)
  if (!body || typeof body.enabled !== 'boolean') {
    return errorResponse('Body must include enabled (boolean)', 400)
  }

  const triggeredAt = body.enabled ? new Date().toISOString() : null
  const triggeredBy = body.enabled ? 'admin' : null
  const reason = body.reason || null

  await env.DB.prepare(
    `UPDATE kill_switch SET enabled = ?1, triggered_at = ?2, triggered_by = ?3, reason = ?4 WHERE id = 1`
  ).bind(body.enabled ? 1 : 0, triggeredAt, triggeredBy, reason).run()

  return json({
    ok: true,
    enabled: body.enabled,
    triggered_at: triggeredAt,
    triggered_by: triggeredBy,
    reason,
  })
}
