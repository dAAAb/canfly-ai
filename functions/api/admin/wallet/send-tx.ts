/**
 * Admin Wallet Send Transaction — CAN-286
 *
 * POST /api/admin/wallet/send-tx → sign and broadcast a transaction
 * Body: { to: string, data?: string, value?: string }
 *
 * Auth: Bearer CRON_SECRET
 * Private key never leaves Cloudflare.
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  parseBody,
} from '../../community/_helpers'
import { sendTransaction } from './_lib'

function requireAdmin(request: Request, env: Env): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return 'Authorization required'
  const token = authHeader.slice(7)
  if (!env.CRON_SECRET || token !== env.CRON_SECRET) return 'Forbidden'
  return null
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const authError = requireAdmin(request, env)
  if (authError) return errorResponse(authError, authError === 'Forbidden' ? 403 : 401)

  const body = await parseBody<{ to: string; data?: string; value?: string }>(request)
  if (!body || typeof body.to !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(body.to)) {
    return errorResponse('Body must include "to" (valid 0x address)', 400)
  }
  if (body.data !== undefined && (typeof body.data !== 'string' || !/^0x[0-9a-fA-F]*$/.test(body.data))) {
    return errorResponse('"data" must be a hex string (0x...)', 400)
  }

  try {
    const result = await sendTransaction(env, body)
    console.log(`[admin/wallet/send-tx] Tx hash: ${result.hash}`)
    return json(result)
  } catch (e: unknown) {
    return errorResponse((e as Error).message, 500)
  }
}
