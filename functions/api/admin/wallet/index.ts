/**
 * Admin Wallet — CAN-286
 *
 * GET  /api/admin/wallet → return wallet address derived from MPP_PRIVATE_KEY
 *
 * Auth: Bearer CRON_SECRET
 */
import { privateKeyToAccount } from 'viem/accounts'
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
} from '../../community/_helpers'

function requireAdmin(request: Request, env: Env): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return 'Authorization required'
  const token = authHeader.slice(7)
  if (!env.CRON_SECRET || token !== env.CRON_SECRET) return 'Forbidden'
  return null
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const authError = requireAdmin(request, env)
  if (authError) return errorResponse(authError, authError === 'Forbidden' ? 403 : 401)

  const privateKey = env.MPP_PRIVATE_KEY
  if (!privateKey) return errorResponse('MPP_PRIVATE_KEY not configured', 500)

  const account = privateKeyToAccount(privateKey as `0x${string}`)

  return json({ address: account.address })
}
