/**
 * POST /api/agents/:name/heartbeat — Agent Heartbeat API
 *
 * Agents call this periodically (recommended: every 60s) to report liveness.
 * Updates lastSeen timestamp and heartbeat_status.
 *
 * Status logic:
 *   🟢 live  — heartbeat within last 5 minutes
 *   🟡 idle  — heartbeat 5–30 minutes ago
 *   🔴 off   — no heartbeat for >30 minutes
 *
 * Auth: Bearer {apiKey} (same as agent self-update)
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const name = params.name as string

  // Extract Bearer token
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authorization: Bearer {apiKey} required', 401)
  }
  const apiKey = authHeader.slice(7)

  // Verify agent exists and API key matches
  const agent = await env.DB.prepare(
    'SELECT name, api_key FROM agents WHERE name = ?1'
  )
    .bind(name)
    .first()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }
  if (!agent.api_key || agent.api_key !== apiKey) {
    return errorResponse('Invalid API key', 403)
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  await env.DB.prepare(
    `UPDATE agents SET last_heartbeat = ?1, heartbeat_status = 'live', updated_at = datetime('now')
     WHERE name = ?2`
  )
    .bind(now, name)
    .run()

  return json({
    name,
    status: 'live',
    lastSeen: now,
    nextHeartbeatRecommended: '60s',
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
