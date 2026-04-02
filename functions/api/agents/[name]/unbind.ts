/**
 * POST /api/agents/:name/unbind — Unbind agent from owner
 *
 * Sets owner_username to NULL and generates a new pairing code so the agent
 * can be claimed by someone else. The agent record and all its data (skills,
 * ratings, etc.) remain intact.
 *
 * Auth: Only the current owner (Privy JWT / edit token) can unbind.
 *
 * ⚠️  This is irreversible for the caller — once unbound, only the new pairing
 *     code holder (or admin) can re-claim the agent.
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  generatePairingCode,
  pairingCodeExpires,
} from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request, params }) => {
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
    return errorResponse('Agent is already unbound (no owner)', 400)
  }
  if (agent.owner_username !== auth.username) {
    return errorResponse('Only the agent owner can unbind', 403)
  }

  // Generate new pairing code for future claiming
  const pairingCode = generatePairingCode()
  const expires = pairingCodeExpires()

  await env.DB.prepare(
    `UPDATE agents SET owner_username = NULL, pairing_code = ?1, pairing_code_expires = ?2,
     updated_at = datetime('now') WHERE name = ?3`
  ).bind(pairingCode, expires, agentName).run()

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'unbound', ?2)`
  ).bind(agentName, JSON.stringify({ previousOwner: agent.owner_username })).run()

  return json({
    agentName,
    unbound: true,
    pairingCode,
    expiresAt: expires,
    message: `Agent unbound from ${agent.owner_username}. A new pairing code has been generated for re-claiming.`,
  })
}
