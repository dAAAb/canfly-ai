/**
 * Admin Wallet — CAN-286
 *
 * GET  /api/admin/wallet → return wallet address + balance
 *
 * Auth: Bearer CRON_SECRET
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
} from '../../community/_helpers'
import { getMPPAddress, getBalance } from './_lib'

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

  try {
    const balance = await getBalance(env)
    return json(balance)
  } catch (e: unknown) {
    return errorResponse((e as Error).message, 500)
  }
}
