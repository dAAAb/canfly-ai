/**
 * POST /api/community/users/:username/confirm-agent — Confirm a pending agent binding
 * Body: { bindingId: number }
 * Requires X-Edit-Token header.
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../_helpers'

interface ConfirmBody {
  bindingId: number
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const username = params.username as string
  const editToken = request.headers.get('X-Edit-Token')

  if (!editToken) {
    return errorResponse('X-Edit-Token header required', 401)
  }

  const user = await env.DB.prepare(
    'SELECT username, edit_token, owner_invite_code FROM users WHERE username = ?1'
  )
    .bind(username)
    .first()

  if (!user) return errorResponse('User not found', 404)
  if (user.edit_token !== editToken) return errorResponse('Invalid edit token', 403)

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
