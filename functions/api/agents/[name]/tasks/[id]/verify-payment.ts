/**
 * POST /api/agents/:name/tasks/:id/verify-payment — Verify USDC payment on Base
 *
 * Accepts { tx_hash } and verifies the on-chain USDC Transfer event matches
 * the task's expected amount and seller wallet address.
 *
 * CAN-205: USDC payment verification (Base chain)
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../../../community/_helpers'

const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const BASE_RPC_DEFAULT = 'https://mainnet.base.org'
const REQUIRED_CONFIRMATIONS = 3
// ERC-20 Transfer(address,address,uint256) event signature
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
// USDC has 6 decimals
const USDC_DECIMALS = 6

interface VerifyBody {
  tx_hash: string
}

async function rpcCall(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const data = (await res.json()) as { result?: unknown; error?: { message: string } }
  if (data.error) throw new Error(data.error.message)
  return data.result
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string
  const taskId = params.id as string

  const body = await parseBody<VerifyBody>(request)
  if (!body?.tx_hash) return errorResponse('Missing required field: tx_hash', 400)

  const txHash = body.tx_hash.toLowerCase()
  if (!/^0x[a-f0-9]{64}$/.test(txHash)) return errorResponse('Invalid tx_hash format', 400)

  // Get task
  const task = await env.DB.prepare(
    `SELECT id, seller_agent, amount, currency, status, payment_tx
     FROM tasks WHERE id = ?1 AND seller_agent = ?2`
  ).bind(taskId, agentName).first()

  if (!task) return errorResponse('Task not found', 404)
  if (task.status !== 'pending_payment') {
    return json({ id: task.id, status: task.status, message: 'Task is not pending payment.' })
  }

  // Get seller wallet
  const agent = await env.DB.prepare(
    'SELECT wallet_address FROM agents WHERE name = ?1'
  ).bind(agentName).first()

  if (!agent?.wallet_address) return errorResponse('Seller agent has no wallet address configured', 400)

  const sellerWallet = (agent.wallet_address as string).toLowerCase()
  const expectedAmount = task.amount as number
  const rpcUrl = (env as unknown as Record<string, string>).BASE_RPC_URL || BASE_RPC_DEFAULT

  try {
    // Get transaction receipt
    const receipt = (await rpcCall(rpcUrl, 'eth_getTransactionReceipt', [txHash])) as {
      status: string
      blockNumber: string
      logs: Array<{ address: string; topics: string[]; data: string }>
    } | null

    if (!receipt) return errorResponse('Transaction not found on Base chain', 404)
    if (receipt.status !== '0x1') return errorResponse('Transaction reverted', 400)

    // Check confirmations
    const txBlock = parseInt(receipt.blockNumber, 16)
    const latestBlock = parseInt((await rpcCall(rpcUrl, 'eth_blockNumber', [])) as string, 16)
    const confirmations = latestBlock - txBlock

    if (confirmations < REQUIRED_CONFIRMATIONS) {
      return json({
        id: task.id,
        status: 'pending_payment',
        message: `Waiting for confirmations: ${confirmations}/${REQUIRED_CONFIRMATIONS}`,
        confirmations,
        required: REQUIRED_CONFIRMATIONS,
      }, 202)
    }

    // Find USDC Transfer event to seller
    const transferLog = receipt.logs.find((log) => {
      if (log.address.toLowerCase() !== USDC_CONTRACT.toLowerCase()) return false
      if (log.topics[0] !== TRANSFER_TOPIC) return false
      // topics[2] is the 'to' address (zero-padded)
      const toAddress = '0x' + (log.topics[2] || '').slice(26).toLowerCase()
      return toAddress === sellerWallet
    })

    if (!transferLog) {
      return errorResponse('No USDC transfer to seller wallet found in transaction', 400)
    }

    // Verify amount (data field contains uint256 amount)
    const transferredRaw = BigInt(transferLog.data)
    const transferredAmount = Number(transferredRaw) / Math.pow(10, USDC_DECIMALS)

    if (expectedAmount != null && transferredAmount < expectedAmount) {
      return errorResponse(
        `Insufficient payment: received ${transferredAmount} USDC, expected ${expectedAmount} USDC`,
        400,
      )
    }

    // Payment verified — update task status and mark execution start
    await env.DB.prepare(
      `UPDATE tasks SET status = 'paid', payment_tx = ?1, paid_at = datetime('now'),
       started_at = datetime('now')
       WHERE id = ?2`
    ).bind(txHash, taskId).run()

    return json({
      id: task.id,
      status: 'paid',
      payment: {
        tx: txHash,
        amount: transferredAmount,
        currency: 'USDC',
        chain: 'base',
        confirmations,
      },
      message: 'Payment verified successfully.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RPC call failed'
    return errorResponse(`Payment verification failed: ${message}`, 502)
  }
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
