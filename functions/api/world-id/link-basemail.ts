/**
 * POST /api/world-id/link-basemail
 * Store a discovered BaseMail handle in the verification record.
 * Body: { username, basemail_handle }
 * Auth: X-Edit-Token or X-Wallet-Address
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'
import { authenticateRequest } from '../_auth'

interface LinkBody {
  username: string
  basemail_handle: string
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const body = await parseBody<LinkBody>(request)
  if (!body?.username || !body?.basemail_handle) return errorResponse('Missing fields', 400)

  // Verify the authenticated user matches the requested username
  if (auth.username !== body.username) return errorResponse('Unauthorized', 403)

  await env.DB.prepare(
    'UPDATE world_id_verifications SET basemail_handle = ?1 WHERE username = ?2'
  ).bind(body.basemail_handle, body.username).run()

  return json({ ok: true })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
