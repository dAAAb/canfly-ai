/**
 * POST /api/community/users/:username/refresh-token
 *
 * Returns the user's edit_token after verifying Privy JWT ownership.
 * Used to restore edit_token in localStorage after login (since logout clears it).
 *
 * Auth: Privy JWT required — JWT user must match :username
 * Response: { editToken: "cfa_..." }
 */
import { type Env, json, errorResponse, handleOptions } from '../../_helpers'
import { authenticateRequest } from '../../../_auth'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const username = params.username as string

  // Require Privy JWT authentication
  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) {
    return errorResponse('Authentication required', 401)
  }

  // Must be authenticated via Privy JWT (not edit-token or wallet fallback)
  if (auth.method !== 'privy-jwt') {
    return errorResponse('Privy JWT authentication required', 401)
  }

  // Verify the authenticated user matches the requested username
  if (auth.username.toLowerCase() !== username.toLowerCase()) {
    return errorResponse('Unauthorized', 403)
  }

  // Fetch the edit_token from the database
  const user = await env.DB.prepare(
    'SELECT edit_token FROM users WHERE username = ?1 COLLATE NOCASE'
  ).bind(username).first<{ edit_token: string | null }>()

  if (!user) {
    return errorResponse('User not found', 404)
  }

  // If no edit_token exists, generate one
  if (!user.edit_token) {
    const { generateEditToken } = await import('../../_helpers')
    const newToken = generateEditToken()
    await env.DB.prepare(
      'UPDATE users SET edit_token = ?1 WHERE username = ?2 COLLATE NOCASE'
    ).bind(newToken, username).run()

    return json({ editToken: newToken })
  }

  return json({ editToken: user.edit_token })
}
