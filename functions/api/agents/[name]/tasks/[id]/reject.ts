/**
 * POST /api/agents/:name/tasks/:id/reject — Buyer rejects delivery, triggers escrow refund
 *
 * Called by the buyer agent within the 24h dispute window.
 * Verifies on-chain Rejected event if tx_hash provided, updates DB + seller trust.
 *
 * CAN-216: Task confirm/reject API
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../../../community/_helpers'
import { authenticateRequest } from '../../../../_auth'
import { recalcTrustScore, recalcBuyerTrustScore } from '../../../_trust'

const BASE_RPC_DEFAULT = 'https://mainnet.base.org'
const REQUIRED_CONFIRMATIONS = 3
// keccak256("Rejected(bytes32,address,uint256)")
const REJECTED_TOPIC = '0x9f7ca45cf13c4d9a065fbc3694e1a6996c6908b8c339c9a8ecc421c621459d92'

interface RejectBody {
  reason: string     // Required: why the buyer is rejecting
  tx_hash?: string   // On-chain reject tx hash (optional — if omitted, DB-only update)
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

  // Get task
  const task = await env.DB.prepare(
    `SELECT id, buyer_agent, seller_agent, status, escrow_tx, escrow_status,
            amount, currency, completed_at
     FROM tasks WHERE id = ?1 AND seller_agent = ?2`
  ).bind(taskId, agentName).first()

  if (!task) return errorResponse('Task not found', 404)

  // Verify buyer identity
  if (!task.buyer_agent) return errorResponse('Task has no buyer agent', 400)

  const buyer = await env.DB.prepare(
    'SELECT name, api_key, owner_username FROM agents WHERE name = ?1'
  ).bind(task.buyer_agent).first<{ name: string; api_key: string | null; owner_username: string | null }>()

  if (!buyer) return errorResponse('Buyer agent not found', 404)

  // Authorize: the buyer agent's own API key (agent-to-agent), OR the buyer
  // agent's human owner via Privy JWT / edit token (the buyer dashboard).
  const authHeader = request.headers.get('Authorization') || ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  let authorized = !!(bearer && buyer.api_key && bearer === buyer.api_key)
  if (!authorized) {
    const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
    authorized = !!(auth && buyer.owner_username &&
      auth.username.toLowerCase() === buyer.owner_username.toLowerCase())
  }
  if (!authorized) {
    return errorResponse('Only the buyer (or its owner) may reject this task', 403)
  }

  // Idempotency: if the escrow is already rejected, return success instead of a
  // confusing state error when a retried/duplicate reject arrives.
  if (task.escrow_status === 'rejected') {
    return json({
      id: task.id,
      status: 'completed',
      escrow: { status: 'rejected', message: 'Already rejected. Escrow funds refunded to buyer.' },
    }, 200)
  }

  // Validate task state
  if (task.status !== 'completed') {
    return errorResponse(`Cannot reject task with status "${task.status}". Task must be "completed".`, 400)
  }
  if (task.escrow_status !== 'completed') {
    return errorResponse(
      `Cannot reject: escrow status is "${task.escrow_status}". Expected "completed".`,
      400,
    )
  }

  const body = await parseBody<RejectBody>(request)
  if (!body?.reason || typeof body.reason !== 'string' || body.reason.trim().length === 0) {
    return errorResponse('Missing required field: reason', 400)
  }

  const reason = body.reason.trim().slice(0, 1000) // Cap reason length

  // If tx_hash provided, verify the on-chain Rejected event
  if (body.tx_hash) {
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

      // Verify a Rejected event from the escrow contract
      const rejectedLog = receipt.logs.find((log) => {
        return log.address.toLowerCase() === escrowContract &&
          log.topics[0] === REJECTED_TOPIC
      })

      if (!rejectedLog) {
        return errorResponse('No Rejected event from TaskEscrow contract found in transaction', 400)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'RPC call failed'
      return errorResponse(`On-chain verification failed: ${message}`, 502)
    }
  }

  // Update task: escrow rejected, refunded
  await env.DB.prepare(
    `UPDATE tasks SET
       escrow_status = 'rejected',
       rejected_at = datetime('now'),
       reject_reason = ?1
     WHERE id = ?2`
  ).bind(reason, taskId).run()

  // Recalculate seller trust score (CAN-220)
  await recalcTrustScore(env, agentName)

  // Recalculate buyer trust score (CAN-223)
  await recalcBuyerTrustScore(env, task.buyer_agent as string)

  return json({
    id: task.id,
    status: 'completed',
    escrow: {
      status: 'rejected',
      message: 'Buyer rejected delivery. Escrow funds refunded to buyer.',
      reason,
    },
    rejected_at: new Date().toISOString(),
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
