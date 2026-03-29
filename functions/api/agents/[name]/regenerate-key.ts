/**
 * POST /api/agents/:name/regenerate-key — Regenerate CanFly API key
 *
 * Only the agent's owner (authenticated via Privy JWT / edit token) can regenerate.
 * Returns the new API key (shown once, then never again).
 */
import { type Env, json, errorResponse, handleOptions, generateApiKey } from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request, params }) => {
  const agentName = params.name as string

  // Auth: must be the agent's owner
  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) {
    return errorResponse('Authentication required', 401)
  }

  // Verify agent exists and caller is owner
  const agent = await env.DB.prepare(
    'SELECT name, owner_username FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ name: string; owner_username: string | null }>()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }
  if (agent.owner_username !== auth.username) {
    return errorResponse('Only the agent owner can regenerate the API key', 403)
  }

  // Generate new key
  const newApiKey = generateApiKey()

  // Update both api_key and edit_token (they share the same value for agent self-auth)
  await env.DB.prepare(
    `UPDATE agents SET api_key = ?1, edit_token = ?1, updated_at = datetime('now') WHERE name = ?2`
  ).bind(newApiKey, agentName).run()

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'api_key_regenerated', ?2)`
  ).bind(agentName, JSON.stringify({ by: auth.username })).run()

  return json({
    agentName,
    apiKey: newApiKey,
    message: 'API key regenerated. Save this key — it will not be shown again.',
  })
}
