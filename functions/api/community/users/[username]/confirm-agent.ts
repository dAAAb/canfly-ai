/**
 * POST /api/community/users/:username/confirm-agent — Confirm a pending agent binding
 * Body: { bindingId: number }
 * Requires X-Edit-Token header.
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../_helpers'
import { authenticateRequest } from '../../../_auth'

interface ConfirmBody {
  bindingId: number
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const username = params.username as string

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)
  if (auth.username !== username) return errorResponse('Unauthorized', 403)

  // Fetch user record for owner_invite_code (needed for binding verification)
  const user = await env.DB.prepare(
    'SELECT username, owner_invite_code FROM users WHERE username = ?1'
  )
    .bind(username)
    .first()

  if (!user) return errorResponse('User not found', 404)

  const body = await parseBody<ConfirmBody>(request)
  if (!body || !body.bindingId) {
    return errorResponse('bindingId is required', 400)
  }

  // Verify binding belongs to this user's invite code and is pending
  const binding = await env.DB.prepare(
    `SELECT id, agent_name, owner_invite, status
     FROM agent_pending_bindings WHERE id = ?1`
  )
    .bind(body.bindingId)
    .first()

  if (!binding) return errorResponse('Binding not found', 404)
  if (binding.owner_invite !== user.owner_invite_code) {
    return errorResponse('Binding does not belong to this user', 403)
  }
  if (binding.status !== 'pending') {
    return errorResponse('Binding is not pending', 400)
  }

  const agentName = binding.agent_name as string

  // Confirm binding + set agent owner
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE agent_pending_bindings SET status = 'confirmed', confirmed_at = datetime('now') WHERE id = ?1`
    ).bind(body.bindingId),
    env.DB.prepare(
      `UPDATE agents SET owner_username = ?1 WHERE name = ?2`
    ).bind(username, agentName),
  ])

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'binding_confirmed', ?2)`
  )
    .bind(agentName, JSON.stringify({ owner: username }))
    .run()

  return json({ confirmed: true, agentName })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
