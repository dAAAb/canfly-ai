/**
 * POST /api/world-id/link-basemail
 * Store a discovered BaseMail handle in the verification record.
 * Body: { username, basemail_handle }
 * Auth: X-Edit-Token or X-Wallet-Address
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'

interface LinkBody {
  username: string
  basemail_handle: string
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const editToken = request.headers.get('X-Edit-Token')
  const walletHeader = request.headers.get('X-Wallet-Address')
  if (!editToken && !walletHeader) return errorResponse('Auth required', 401)

  const body = await parseBody<LinkBody>(request)
  if (!body?.username || !body?.basemail_handle) return errorResponse('Missing fields', 400)

  const user = await env.DB.prepare(
    'SELECT username, edit_token, wallet_address FROM users WHERE username = ?1'
  ).bind(body.username).first()
  if (!user) return errorResponse('User not found', 404)

  const tokenOk = editToken && user.edit_token === editToken
  const walletOk = walletHeader && user.wallet_address &&
    walletHeader.toLowerCase() === (user.wallet_address as string).toLowerCase()
  if (!tokenOk && !walletOk) return errorResponse('Unauthorized', 403)

  await env.DB.prepare(
    'UPDATE world_id_verifications SET basemail_handle = ?1 WHERE username = ?2'
  ).bind(body.basemail_handle, body.username).run()

  return json({ ok: true })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
