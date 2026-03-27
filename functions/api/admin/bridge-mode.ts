/**
 * Bridge Mode Toggle API — CAN-253
 *
 * GET  /api/admin/bridge-mode  — get current bridge mode (shadow/active/off)
 * POST /api/admin/bridge-mode  — set bridge mode { mode: 'shadow' | 'active' | 'off' }
 *
 * Auth: admin only (Bearer CRON_SECRET)
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'
import { type BridgeMode, getBridgeMode } from '../../lib/shadowLogger'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

const VALID_MODES: BridgeMode[] = ['shadow', 'active', 'off']

function requireAdmin(request: Request, env: Env): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return 'Authorization required'
  const token = authHeader.slice(7)
  if (!env.CRON_SECRET || token !== env.CRON_SECRET) return 'Forbidden'
  return null
}

/** GET — current bridge mode */
export const onRequestGet: PagesFunction<Env & { BRIDGE_MODE?: string }> = async ({ env, request }) => {
  const authError = requireAdmin(request, env)
  if (authError) return errorResponse(authError, authError === 'Forbidden' ? 403 : 401)

  const mode = await getBridgeMode(env)
  return json({ mode })
}

/** POST — set bridge mode */
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const authError = requireAdmin(request, env)
  if (authError) return errorResponse(authError, authError === 'Forbidden' ? 403 : 401)

  const body = await parseBody<{ mode: BridgeMode }>(request)
  if (!body || !body.mode || !VALID_MODES.includes(body.mode)) {
    return errorResponse(`mode must be one of: ${VALID_MODES.join(', ')}`, 400)
  }

  // Update the feature flag in DB
  const enabled = body.mode === 'shadow' ? 1 : 0

  // Upsert the bridge_mode flag
  await env.DB.prepare(
    `INSERT INTO feature_flags (flag_name, scope, scope_id, enabled)
     VALUES ('v3_bridge_mode', 'global', NULL, ?1)
     ON CONFLICT (flag_name, scope, scope_id) DO UPDATE SET enabled = ?1`
  ).bind(enabled).run()

  // If switching to active mode, also enable the paperclip bridge feature flag
  if (body.mode === 'active') {
    await env.DB.prepare(
      `INSERT INTO feature_flags (flag_name, scope, scope_id, enabled)
       VALUES ('v3_paperclip_bridge', 'global', NULL, 1)
       ON CONFLICT (flag_name, scope, scope_id) DO UPDATE SET enabled = 1`
    ).bind().run()
  }

  return json({ ok: true, mode: body.mode })
}
