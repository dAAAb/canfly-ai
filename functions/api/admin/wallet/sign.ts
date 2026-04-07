/**
 * Admin Wallet Sign — CAN-286
 *
 * POST /api/admin/wallet/sign → SIWE message signature
 * Body: { message: string }
 *
 * Auth: Bearer CRON_SECRET
 * Private key never leaves Cloudflare.
 */
import { privateKeyToAccount } from 'viem/accounts'
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  parseBody,
} from '../../community/_helpers'

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

  const privateKey = env.MPP_PRIVATE_KEY
  if (!privateKey) return errorResponse('MPP_PRIVATE_KEY not configured', 500)

  const body = await parseBody<{ message: string }>(request)
  if (!body || typeof body.message !== 'string' || !body.message) {
    return errorResponse('Body must include "message" (string)', 400)
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const signature = await account.signMessage({ message: body.message })

  console.log(`[admin/wallet/sign] Signed SIWE message for ${account.address}`)

  return json({ signature, address: account.address })
}
