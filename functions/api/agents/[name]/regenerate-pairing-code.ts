/**
 * POST /api/agents/:name/regenerate-pairing-code
 *
 * Regenerate a pairing code for an agent so a new owner can claim it.
 *
 * Auth (any of):
 *   - Agent's own API key (Authorization: Bearer cfa_*)
 *   - Agent's owner (Privy JWT / edit token)
 *
 * Conditions:
 *   - Agent must exist
 *   - Agent must be ownerless (owner_username IS NULL) OR caller is the owner
 *
 * Returns: { pairingCode, expiresAt }
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

  // Look up the agent
  const agent = await env.DB.prepare(
    'SELECT name, owner_username, api_key FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ name: string; owner_username: string | null; api_key: string | null }>()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }

  // Auth: check agent API key first, then user auth
  const authHeader = request.headers.get('authorization') || ''
  let authorized = false

  // Path 1: Agent self-auth via API key (Bearer cfa_*)
  if (authHeader.startsWith('Bearer cfa_')) {
    const token = authHeader.slice(7)
    if (agent.api_key && token === agent.api_key) {
      authorized = true
    }
  }

  // Path 2: Owner auth via Privy JWT / edit token
  if (!authorized) {
    const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
    if (auth && agent.owner_username && auth.username === agent.owner_username) {
      authorized = true
    }
  }

  if (!authorized) {
    return errorResponse('Authentication required. Use the agent API key or authenticate as the owner.', 401)
  }

  // Generate new pairing code
  const pairingCode = generatePairingCode()
  const expires = pairingCodeExpires()

  await env.DB.prepare(
    `UPDATE agents SET pairing_code = ?1, pairing_code_expires = ?2, updated_at = datetime('now')
     WHERE name = ?3`
  ).bind(pairingCode, expires, agentName).run()

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'pairing_code_regenerated', ?2)`
  ).bind(agentName, JSON.stringify({ hasOwner: !!agent.owner_username })).run()

  return json({
    agentName,
    pairingCode,
    expiresAt: expires,
    message: `New pairing code generated. Valid for 7 days. Use this code to claim the agent.`,
  })
}
