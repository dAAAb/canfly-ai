/**
 * Feature Flags API — CAN-256
 *
 * GET  /api/feature-flags?flag=name&scope=global&scopeId=xxx  — check one flag
 * GET  /api/feature-flags?all=1                                — list all flags
 * PATCH /api/feature-flags                                     — update a flag (admin auth)
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from './community/_helpers'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

/** GET — query flag state or list all */
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)

  // List all flags
  if (url.searchParams.has('all')) {
    const rows = await env.DB.prepare(
      'SELECT flag_name, scope, scope_id, enabled FROM feature_flags ORDER BY flag_name, scope'
    ).all()
    return json({ flags: rows.results })
  }

  // Query single flag
  const flag = url.searchParams.get('flag')
  if (!flag) {
    return errorResponse('Missing ?flag= parameter', 400)
  }

  const scope = url.searchParams.get('scope') || 'global'
  const scopeId = url.searchParams.get('scopeId') || null

  // Check scoped override first, then fall back to global
  let row
  if (scope !== 'global' && scopeId) {
    row = await env.DB.prepare(
      'SELECT enabled FROM feature_flags WHERE flag_name = ?1 AND scope = ?2 AND scope_id = ?3'
    ).bind(flag, scope, scopeId).first()
  }

  if (!row) {
    row = await env.DB.prepare(
      'SELECT enabled FROM feature_flags WHERE flag_name = ?1 AND scope = ?2 AND scope_id IS NULL'
    ).bind(flag, 'global').first()
  }

  if (!row) {
    return json({ flag, enabled: false, source: 'default' })
  }

  return json({ flag, enabled: row.enabled === 1, source: scope !== 'global' && scopeId ? scope : 'global' })
}

/** PATCH — update flag (requires CRON_SECRET as admin auth) */
export const onRequestPatch: PagesFunction<Env> = async ({ env, request }) => {
  // Admin auth via Bearer token (reuse CRON_SECRET)
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authorization required', 401)
  }
  const token = authHeader.slice(7)
  if (!env.CRON_SECRET || token !== env.CRON_SECRET) {
    return errorResponse('Forbidden', 403)
  }

  const body = await parseBody<{
    flag: string
    enabled: boolean
    scope?: string
    scopeId?: string | null
  }>(request)

  if (!body || !body.flag || typeof body.enabled !== 'boolean') {
    return errorResponse('Body must include flag (string) and enabled (boolean)', 400)
  }

  const scope = body.scope || 'global'
  const scopeId = body.scopeId || null

  // Upsert: try update first, insert if not found
  const updated = await env.DB.prepare(
    `UPDATE feature_flags SET enabled = ?1
     WHERE flag_name = ?2 AND scope = ?3 AND COALESCE(scope_id, '') = COALESCE(?4, '')`
  ).bind(body.enabled ? 1 : 0, body.flag, scope, scopeId).run()

  if (!updated.meta.changes) {
    await env.DB.prepare(
      'INSERT INTO feature_flags (flag_name, scope, scope_id, enabled) VALUES (?1, ?2, ?3, ?4)'
    ).bind(body.flag, scope, scopeId, body.enabled ? 1 : 0).run()
  }

  return json({ ok: true, flag: body.flag, scope, scopeId, enabled: body.enabled })
}
