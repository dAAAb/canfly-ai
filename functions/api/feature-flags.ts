/**
 * Feature Flags API (CAN-249 / CAN-256)
 *
 * GET /api/feature-flags?flag=v3_routing&scope=global&scopeId=
 *   → { flag, scope, scopeId, enabled }
 *
 * GET /api/feature-flags?all=1
 *   → { flags: [...] }
 *
 * PATCH /api/feature-flags (admin only)
 *   body: { flag, scope?, scopeId?, enabled }
 */

import { type Env, CORS_HEADERS, json, handleOptions } from './community/_helpers'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)

  // List all flags
  if (url.searchParams.get('all') === '1') {
    const { results } = await env.DB.prepare(
      `SELECT flag_name, scope, scope_id, enabled FROM feature_flags ORDER BY flag_name, scope`
    ).all()
    return json({ flags: results })
  }

  // Single flag lookup
  const flag = url.searchParams.get('flag')
  if (!flag) return json({ error: 'Missing ?flag= parameter' }, 400)

  const scope = url.searchParams.get('scope') || 'global'
  const scopeId = url.searchParams.get('scopeId') || null

  const row = await env.DB.prepare(
    `SELECT enabled FROM feature_flags WHERE flag_name = ?1 AND scope = ?2 AND (scope_id = ?3 OR (?3 IS NULL AND scope_id IS NULL))`
  ).bind(flag, scope, scopeId).first<{ enabled: number }>()

  return json({
    flag,
    scope,
    scopeId,
    enabled: row ? Boolean(row.enabled) : false,
  })
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  // Admin auth: require CRON_SECRET as bearer token (reuse existing admin auth pattern)
  const auth = request.headers.get('authorization') || ''
  const cronSecret = env.CRON_SECRET
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return json({ error: 'Unauthorized — admin access required' }, 401)
  }

  const body = await request.json<{
    flag: string
    scope?: string
    scopeId?: string | null
    enabled: boolean
  }>()

  if (!body.flag || body.enabled === undefined) {
    return json({ error: 'Missing required fields: flag, enabled' }, 400)
  }

  const scope = body.scope || 'global'
  const scopeId = body.scopeId || null

  await env.DB.prepare(
    `INSERT INTO feature_flags (flag_name, scope, scope_id, enabled)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (flag_name, scope, scope_id) DO UPDATE SET enabled = ?4`
  ).bind(body.flag, scope, scopeId, body.enabled ? 1 : 0).run()

  return json({ flag: body.flag, scope, scopeId, enabled: body.enabled })
}
