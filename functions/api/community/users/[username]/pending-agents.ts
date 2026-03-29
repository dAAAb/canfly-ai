/**
 * GET /api/community/users/:username/pending-agents — List agents pending confirmation
 * Auth: X-Edit-Token header OR X-Wallet-Address header matching the user's wallet.
 * Returns agents that registered with this user's owner_invite_code.
 */
import { type Env, json, errorResponse, handleOptions } from '../../_helpers'
import { authenticateRequest } from '../../../_auth'

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const username = params.username as string

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)
  if (auth.username !== username) return errorResponse('Unauthorized', 403)

  const user = await env.DB.prepare(
    'SELECT username, owner_invite_code FROM users WHERE username = ?1'
  )
    .bind(username)
    .first()

  if (!user) return errorResponse('User not found', 404)

  const inviteCode = user.owner_invite_code as string | null
  if (!inviteCode) {
    return json({ pendingAgents: [] })
  }

  // Find pending bindings for this invite code
  const result = await env.DB.prepare(
    `SELECT b.id AS binding_id, b.created_at AS binding_created_at,
            a.name, a.avatar_url, a.bio, a.model, a.platform
     FROM agent_pending_bindings b
     JOIN agents a ON a.name = b.agent_name
     WHERE b.owner_invite = ?1 AND b.status = 'pending'
     ORDER BY b.created_at DESC`
  )
    .bind(inviteCode)
    .all()

  // Fetch skills for each agent
  const pendingAgents = await Promise.all(
    result.results.map(async (row: Record<string, unknown>) => {
      const skillsResult = await env.DB.prepare(
        'SELECT name, slug, description FROM skills WHERE agent_name = ?1'
      )
        .bind(row.name as string)
        .all()

      return {
        bindingId: row.binding_id,
        name: row.name,
        avatarUrl: row.avatar_url,
        bio: row.bio,
        model: row.model,
        platform: row.platform,
        skills: skillsResult.results,
        createdAt: row.binding_created_at,
      }
    })
  )

  return json({ pendingAgents })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
