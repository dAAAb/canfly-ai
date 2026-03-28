/**
 * Shadow Mode admin API (CAN-249 / CAN-259)
 *
 * GET  /api/admin/shadow-mode → { bridgeMode, updatedAt, updatedBy }
 * POST /api/admin/shadow-mode → { bridgeMode: 'shadow' | 'active' }
 *
 * GET  /api/admin/shadow-mode?logs=1&limit=50 → { logs: [...] }
 */

import { type Env, json, handleOptions } from '../community/_helpers'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

function isAdmin(request: Request, env: Env): boolean {
  const auth = request.headers.get('authorization') || ''
  return Boolean(env.CRON_SECRET && auth === `Bearer ${env.CRON_SECRET}`)
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'Unauthorized — admin access required' }, 401)
  }

  const url = new URL(request.url)

  // Return audit logs
  if (url.searchParams.get('logs') === '1') {
    const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 200)
    const { results } = await env.DB.prepare(
      `SELECT * FROM shadow_audit_log ORDER BY created_at DESC LIMIT ?1`
    ).bind(limit).all()
    return json({ logs: results })
  }

  // Return current bridge mode
  const row = await env.DB.prepare(
    `SELECT bridge_mode, updated_at, updated_by FROM bridge_config WHERE id = 1`
  ).first<{ bridge_mode: string; updated_at: string; updated_by: string | null }>()

  return json({
    bridgeMode: row?.bridge_mode ?? 'shadow',
    updatedAt: row?.updated_at ?? null,
    updatedBy: row?.updated_by ?? null,
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isAdmin(request, env)) {
    return json({ error: 'Unauthorized — admin access required' }, 401)
  }

  const body = await request.json<{ bridgeMode: 'shadow' | 'active' }>()

  if (!body.bridgeMode || !['shadow', 'active'].includes(body.bridgeMode)) {
    return json({ error: 'bridgeMode must be "shadow" or "active"' }, 400)
  }

  const now = new Date().toISOString()
  const adminId = request.headers.get('x-admin-id') || 'unknown'

  await env.DB.prepare(
    `UPDATE bridge_config SET bridge_mode = ?1, updated_at = ?2, updated_by = ?3 WHERE id = 1`
  ).bind(body.bridgeMode, now, adminId).run()

  return json({
    bridgeMode: body.bridgeMode,
    updatedAt: now,
    updatedBy: adminId,
  })
}
