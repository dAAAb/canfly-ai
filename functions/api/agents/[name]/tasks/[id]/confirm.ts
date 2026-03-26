/**
 * POST /api/agents/:name/tasks/:id/confirm — Buyer confirms delivery, releases escrow
 *
 * Called by the buyer agent after seller completes the task.
 * Verifies on-chain Released event if tx_hash provided, updates DB.
 *
 * CAN-216: Task confirm/reject API
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../../../community/_helpers'
import { recalcTrustScore, recalcBuyerTrustScore } from '../../../_trust'

const BASE_RPC_DEFAULT = 'https://mainnet.base.org'
const REQUIRED_CONFIRMATIONS = 3
// TaskEscrow Released(bytes32 indexed taskId, address indexed seller, uint256 amount)
// keccak256("Released(bytes32,address,uint256)")
// keccak256("Released(bytes32,address,uint256)")
const RELEASED_TOPIC = '0xc8fa66dff4b9073528c3f1bf21a8dc9a18fdf09847e88e96188bc953aef519f0'

interface ConfirmBody {
  tx_hash?: string  // On-chain confirm tx hash (optional — if omitted, DB-only update)
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

  // Auth: Bearer {apiKey} — buyer authenticates with their own API key
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authorization: Bearer {apiKey} required', 401)
  }
  const apiKey = authHeader.slice(7)

  // Get task
  const task = await env.DB.prepare(
    `SELECT id, buyer_agent, seller_agent, status, escrow_tx, escrow_status,
            amount, currency, completed_at
     FROM tasks WHERE id = ?1 AND seller_agent = ?2`
  ).bind(taskId, agentName).first()

  if (!task) return errorResponse('Task not found', 404)

  // Verify buyer identity via API key
  if (!task.buyer_agent) return errorResponse('Task has no buyer agent', 400)

  const buyer = await env.DB.prepare(
    'SELECT name, api_key FROM agents WHERE name = ?1'
  ).bind(task.buyer_agent).first()

  if (!buyer) return errorResponse('Buyer agent not found', 404)
  if (!buyer.api_key || buyer.api_key !== apiKey) return errorResponse('Invalid API key — only the buyer can confirm', 403)

  // Validate task state: must be completed with escrow
  if (task.status !== 'completed') {
    return errorResponse(`Cannot confirm task with status "${task.status}". Task must be "completed".`, 400)
  }
  if (task.escrow_status !== 'completed') {
    return errorResponse(
      `Cannot confirm: escrow status is "${task.escrow_status}". Expected "completed".`,
      400,
    )
  }

  const body = await parseBody<ConfirmBody>(request)

  // If tx_hash provided, verify the on-chain Released event
  if (body?.tx_hash) {
    const txHash = body.tx_hash.toLowerCase()
    if (!/^0x[a-f0-9]{64}$/.test(txHash)) return errorResponse('Invalid tx_hash format', 400)

    const rpcUrl = (env as unknown as Record<string, string>).BASE_RPC_URL || BASE_RPC_DEFAULT
    const escrowContract = ((env as unknown as Record<string, string>).TASK_ESCROW_CONTRACT || '').toLowerCase()

    if (!escrowContract) return errorResponse('TASK_ESCROW_CONTRACT not configured', 500)

    try {
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
          status: 'completed',
          escrow_status: 'completed',
          message: `Waiting for confirmations: ${confirmations}/${REQUIRED_CONFIRMATIONS}`,
        }, 202)
      }

      // Verify a Released event from the escrow contract exists in the tx
      const releasedLog = receipt.logs.find((log) => {
        return log.address.toLowerCase() === escrowContract &&
          log.topics[0] === RELEASED_TOPIC
      })

      if (!releasedLog) {
        return errorResponse('No Released event from TaskEscrow contract found in transaction', 400)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'RPC call failed'
      return errorResponse(`On-chain verification failed: ${message}`, 502)
    }
  }

  // Update task: escrow released, confirmed
  await env.DB.prepare(
    `UPDATE tasks SET
       escrow_status = 'released',
       confirmed_at = datetime('now')
     WHERE id = ?1`
  ).bind(taskId).run()

  // Recalculate seller trust score (CAN-220)
  await recalcTrustScore(env, agentName)

  // Recalculate buyer trust score (CAN-223)
  await recalcBuyerTrustScore(env, task.buyer_agent as string)

  return json({
    id: task.id,
    status: 'completed',
    escrow: {
      status: 'released',
      message: 'Buyer confirmed delivery. Escrow funds released to seller.',
    },
    confirmed_at: new Date().toISOString(),
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
