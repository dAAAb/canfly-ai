/**
 * DELETE /api/agents/:name — Remove agent from platform
 *
 * Permanently deletes the agent record and all associated data (skills,
 * chat sessions, telegram connections, etc. via CASCADE). Zeabur deployments
 * are NOT deleted — the service keeps running, it just loses its CanFly link.
 *
 * Auth: Only the current owner (Privy JWT / edit token) can remove.
 *
 * Body: { confirmName: string } — must match agent name to prevent accidents.
 *
 * ⚠️  This is irreversible. The agent name becomes available for re-registration.
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  parseBody,
} from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'

interface RemoveBody {
  confirmName: string
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestDelete: PagesFunction<Env> = async ({ env, request, params }) => {
  const agentName = params.name as string

  // Auth: must be the agent's owner
  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) {
    return errorResponse('Authentication required', 401)
  }

  const agent = await env.DB.prepare(
    'SELECT name, owner_username FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ name: string; owner_username: string | null }>()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }
  if (!agent.owner_username) {
    return errorResponse('Only the agent owner can remove it. This agent has no owner.', 403)
  }
  if (agent.owner_username !== auth.username) {
    return errorResponse('Only the agent owner can remove it', 403)
  }

  // Require confirmation: body must include { confirmName: "agent-name" }
  const body = await parseBody<RemoveBody>(request)
  if (!body || body.confirmName !== agentName) {
    return errorResponse(
      `Confirmation required. Send { "confirmName": "${agentName}" } to confirm deletion.`,
      400
    )
  }

  // Clean up non-FK tables (activity_log, trust_scores, ratings)
  await env.DB.prepare(
    `DELETE FROM activity_log WHERE entity_type = 'agent' AND entity_id = ?1`
  ).bind(agentName).run()

  try {
    await env.DB.prepare('DELETE FROM trust_scores WHERE agent_name = ?1').bind(agentName).run()
  } catch { /* table may not exist */ }

  try {
    await env.DB.prepare(
      'DELETE FROM ratings WHERE rater_agent = ?1 OR rated_agent = ?1'
    ).bind(agentName).run()
  } catch { /* table may not exist */ }

  // Delete the agent — CASCADE handles skills, pending_bindings, chat_sessions,
  // chat_messages, telegram_connections. Zeabur deployments get agent_name = NULL.
  await env.DB.prepare('DELETE FROM agents WHERE name = ?1').bind(agentName).run()

  // Log removal (under the user, since agent entity is gone)
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('user', ?1, 'agent_removed', ?2)`
  ).bind(auth.username, JSON.stringify({ agentName })).run()

  return json({
    removed: true,
    agentName,
    message: `Agent "${agentName}" has been permanently removed from the platform.`,
  })
}
