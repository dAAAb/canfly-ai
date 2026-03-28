/**
 * Kill-switch admin API (CAN-249 / CAN-258)
 *
 * GET  /api/admin/kill-switch → { enabled, triggeredAt, triggeredBy, reason }
 * POST /api/admin/kill-switch → { enabled: true/false, reason?: string }
 */

import { type Env, CORS_HEADERS, json, handleOptions } from '../community/_helpers'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

/** Verify admin auth (CRON_SECRET as bearer token) */
function isAdmin(request: Request, env: Env): boolean {
  const auth = request.headers.get('authorization') || ''
  return Boolean(env.CRON_SECRET && auth === `Bearer ${env.CRON_SECRET}`)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'Unauthorized — admin access required' }, 401)
  }

  const row = await env.DB.prepare(
    `SELECT enabled, triggered_at, triggered_by, reason FROM kill_switch WHERE id = 1`
  ).first<{ enabled: number; triggered_at: string | null; triggered_by: string | null; reason: string | null }>()

  return json({
    enabled: row ? Boolean(row.enabled) : false,
    triggeredAt: row?.triggered_at ?? null,
    triggeredBy: row?.triggered_by ?? null,
    reason: row?.reason ?? null,
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'Unauthorized — admin access required' }, 401)
  }

  const body = await request.json<{ enabled: boolean; reason?: string }>()

  if (body.enabled === undefined) {
    return json({ error: 'Missing required field: enabled' }, 400)
  }

  const now = new Date().toISOString()
  const adminId = request.headers.get('x-admin-id') || 'unknown'

  if (body.enabled) {
    await env.DB.prepare(
      `UPDATE kill_switch SET enabled = 1, triggered_at = ?1, triggered_by = ?2, reason = ?3 WHERE id = 1`
    ).bind(now, adminId, body.reason || null).run()
  } else {
    await env.DB.prepare(
      `UPDATE kill_switch SET enabled = 0, triggered_at = NULL, triggered_by = NULL, reason = NULL WHERE id = 1`
    ).bind().run()
  }

  return json({
    enabled: body.enabled,
    triggeredAt: body.enabled ? now : null,
    triggeredBy: body.enabled ? adminId : null,
    reason: body.enabled ? (body.reason || null) : null,
  })
}
