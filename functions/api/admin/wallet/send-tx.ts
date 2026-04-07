/**
 * Admin Wallet Send Transaction — CAN-286
 *
 * POST /api/admin/wallet/send-tx → sign and broadcast a transaction
 * Body: { to: string, data?: string, value?: string }
 *
 * Auth: Bearer CRON_SECRET
 * Private key never leaves Cloudflare.
 */
import { createWalletClient, http, parseEther } from 'viem'
import { base } from 'viem/chains'
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

  const body = await parseBody<{ to: string; data?: string; value?: string }>(request)
  if (!body || typeof body.to !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(body.to)) {
    return errorResponse('Body must include "to" (valid 0x address)', 400)
  }
  if (body.data !== undefined && (typeof body.data !== 'string' || !/^0x[0-9a-fA-F]*$/.test(body.data))) {
    return errorResponse('"data" must be a hex string (0x...)', 400)
  }

  const baseRpcUrl = (env as unknown as Record<string, string>).BASE_RPC_URL || 'https://mainnet.base.org'
  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const client = createWalletClient({
    account,
    chain: base,
    transport: http(baseRpcUrl),
  })

  const txParams: {
    to: `0x${string}`
    data?: `0x${string}`
    value?: bigint
  } = {
    to: body.to as `0x${string}`,
  }

  if (body.data) txParams.data = body.data as `0x${string}`
  if (body.value) txParams.value = parseEther(body.value)

  console.log(`[admin/wallet/send-tx] Sending tx from ${account.address} to ${body.to} value=${body.value || '0'}`)

  const hash = await client.sendTransaction(txParams)

  console.log(`[admin/wallet/send-tx] Tx hash: ${hash}`)

  return json({ hash, from: account.address })
}
