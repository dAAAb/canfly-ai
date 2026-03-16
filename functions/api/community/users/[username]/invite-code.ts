/**
 * GET  /api/community/users/:username/invite-code — Get or generate owner invite code
 * Requires X-Edit-Token header.
 */
import { type Env, json, errorResponse, handleOptions, generatePairingCode } from '../../_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
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

  let inviteCode = user.owner_invite_code as string | null

  // Auto-generate if not set
  if (!inviteCode) {
    inviteCode = `INV-${generatePairingCode().slice(5)}` // e.g. INV-8K2M-X9F3
    await env.DB.prepare('UPDATE users SET owner_invite_code = ?1 WHERE username = ?2')
      .bind(inviteCode, username)
      .run()
  }

  return json({ inviteCode })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
