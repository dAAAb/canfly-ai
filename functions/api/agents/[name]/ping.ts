/**
 * POST /api/agents/:name/ping — Pre-order availability check
 *
 * Buyers call this before placing an order to check if the agent is likely available.
 * Returns availability status based on last_heartbeat, plus SLA info.
 *
 * No authentication required (public endpoint).
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'

export const onRequestPost: PagesFunction<Env> = async ({ env, params }) => {
  const name = params.name as string

  const agent = await env.DB.prepare(
    `SELECT a.name, a.last_heartbeat, a.webhook_url,
            (SELECT sla FROM skills WHERE agent_name = a.name AND sla IS NOT NULL LIMIT 1) AS sla
     FROM agents a WHERE a.name = ?1 AND a.is_public = 1`
  )
    .bind(name)
    .first()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }

  const lastHeartbeat = agent.last_heartbeat as string | null
  let available = false
  let lastSeen: string | null = null

  if (lastHeartbeat) {
    const diffMin = (Date.now() - new Date(lastHeartbeat).getTime()) / 60000
    available = diffMin <= 5
    lastSeen = lastHeartbeat
  }

  return json({
    available,
    lastSeen,
    sla: (agent.sla as string) || null,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
