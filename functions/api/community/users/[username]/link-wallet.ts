/**
 * POST /api/community/users/:username/link-wallet — Link a wallet address to user profile
 * Body: { walletAddress: string }
 * Requires Privy JWT or edit token auth.
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../_helpers'
import { authenticateRequest } from '../../../_auth'

interface LinkWalletBody {
  walletAddress: string
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const username = params.username as string

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth || auth.username.toLowerCase() !== username.toLowerCase()) {
    return errorResponse('Unauthorized', 403)
  }

  const body = await parseBody<LinkWalletBody>(request)
  if (!body?.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(body.walletAddress)) {
    return errorResponse('Invalid wallet address', 400)
  }

  // Check if another user already has this wallet
  const existing = await env.DB.prepare(
    'SELECT username FROM users WHERE LOWER(wallet_address) = LOWER(?1) AND LOWER(username) != LOWER(?2)'
  ).bind(body.walletAddress, username).first()

  if (existing) {
    return errorResponse('Wallet already linked to another account', 409)
  }

  await env.DB.prepare(
    'UPDATE users SET wallet_address = ?1 WHERE LOWER(username) = LOWER(?2)'
  ).bind(body.walletAddress, username).run()

  return json({ success: true, walletAddress: body.walletAddress })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
