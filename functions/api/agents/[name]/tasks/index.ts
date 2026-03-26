/**
 * POST /api/agents/:name/tasks — Create a new task (order a skill)
 * GET  /api/agents/:name/tasks — List completed public tasks
 *
 * CAN-232: Atomic ordering — tx_hash is REQUIRED. The task is only created
 * after on-chain payment (escrow deposit or direct USDC transfer) is verified.
 * Tasks are born with status "paid"; "pending_payment" no longer exists in this flow.
 *
 * Part of the A2A Task Protocol (CAN-204).
 */
import { type Env, json, errorResponse, handleOptions, parseBody, intParam } from '../../../community/_helpers'

const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const BASE_RPC_DEFAULT = 'https://mainnet.base.org'
const REQUIRED_CONFIRMATIONS = 3
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const DEPOSITED_TOPIC = '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c'
const USDC_DECIMALS = 6
const BASEMAIL_API = 'https://api.basemail.ai'

interface CreateTaskBody {
  skill: string           // skill name or slug
  params?: Record<string, unknown>
  buyer?: string          // buyer agent name
  buyer_email?: string    // buyer email / basemail
  tx_hash: string         // on-chain tx hash (REQUIRED — CAN-232)
  payment_method?: string // 'usdc_base' | 'escrow'
}

function generateTaskId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return 'task_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
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

/** CAN-226: Notify seller that payment was verified — webhook first, BaseMail fallback */
async function notifySeller(
  env: Env,
  agent: Record<string, unknown>,
  payload: {
    task_id: string; skill: string; params: unknown; buyer: string
    paid_at: string; amount: number; currency: string; payment_tx: string
  },
): Promise<void> {
  const webhookUrl = agent.webhook_url as string | null
  if (webhookUrl) {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })
    if (res.ok) return
  }
  const basemailHandle = agent.basemail_handle as string | null
  const apiKey = env.BASEMAIL_API_KEY
  if (!basemailHandle || !apiKey) return
  const apiUrl = env.BASEMAIL_API_URL || BASEMAIL_API
  const body = [
    `Payment received for task ${payload.task_id}`,
    `Skill: ${payload.skill}`, `Buyer: ${payload.buyer}`,
    `Amount: ${payload.amount} ${payload.currency}`,
    `TX: ${payload.payment_tx}`, '', 'Task is now paid — begin execution.',
  ].join('\n')
  await fetch(`${apiUrl}/api/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: 'canfly@basemail.ai', to: `${basemailHandle}@basemail.ai`,
      subject: `New paid task: ${payload.skill}`, body,
    }),
    signal: AbortSignal.timeout(10_000),
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  // Verify agent exists and is public, including notification config
  const agent = await env.DB.prepare(
    'SELECT name, wallet_address, is_public, webhook_url, basemail_handle FROM agents WHERE name = ?1'
  ).bind(agentName).first()

  if (!agent) return errorResponse('Agent not found', 404)
  if (agent.is_public === 0) return errorResponse('Agent profile is private', 403)

  const body = await parseBody<CreateTaskBody>(request)
  if (!body) return errorResponse('Invalid request body', 400)
  if (!body.skill) return errorResponse('Missing required field: skill', 400)
  if (!body.tx_hash) return errorResponse('Missing required field: tx_hash', 400)

  const txHash = body.tx_hash.toLowerCase()
  if (!/^0x[a-f0-9]{64}$/.test(txHash)) return errorResponse('Invalid tx_hash format', 400)

  // Find the skill (match by name or slug)
  const skill = await env.DB.prepare(
    `SELECT id, name, slug, type, price, currency, payment_methods, sla
     FROM skills WHERE agent_name = ?1 AND (name = ?2 OR slug = ?2)`
  ).bind(agentName, body.skill).first()

  if (!skill) return errorResponse(`Skill not found: ${body.skill}`, 404)
  if (skill.type !== 'purchasable') return errorResponse('This skill is not purchasable', 400)

  const sellerWallet = (agent.wallet_address as string | null)?.toLowerCase()
  if (!sellerWallet) return errorResponse('Seller agent has no wallet address configured', 400)

  const expectedAmount = skill.price as number | null
  const currency = (skill.currency as string) || 'USDC'
  const rpcUrl = (env as unknown as Record<string, string>).BASE_RPC_URL || BASE_RPC_DEFAULT
  const escrowContract = ((env as unknown as Record<string, string>).TASK_ESCROW_CONTRACT || '').toLowerCase()

  // Determine payment method: escrow if contract is configured and method says so, else direct
  const paymentMethod = body.payment_method === 'escrow' && escrowContract ? 'escrow' : (body.payment_method || 'usdc_base')
  const isEscrowMode = paymentMethod === 'escrow' && !!escrowContract

  // --- On-chain verification (MUST pass before task is created) ---
  try {
    const receipt = (await rpcCall(rpcUrl, 'eth_getTransactionReceipt', [txHash])) as {
      status: string; blockNumber: string
      logs: Array<{ address: string; topics: string[]; data: string }>
    } | null

    if (!receipt) return errorResponse('Transaction not found on Base chain', 404)
    if (receipt.status !== '0x1') return errorResponse('Transaction reverted', 400)

    const txBlock = parseInt(receipt.blockNumber, 16)
    const latestBlock = parseInt((await rpcCall(rpcUrl, 'eth_blockNumber', [])) as string, 16)
    const confirmations = latestBlock - txBlock

    if (confirmations < REQUIRED_CONFIRMATIONS) {
      return json({
        error: `Waiting for confirmations: ${confirmations}/${REQUIRED_CONFIRMATIONS}. Retry shortly.`,
        confirmations,
        required: REQUIRED_CONFIRMATIONS,
      }, 202)
    }

    let transferredAmount: number

    if (isEscrowMode) {
      // --- Escrow mode: verify Deposited event from TaskEscrow contract ---
      const depositLog = receipt.logs.find((log) => {
        return log.address.toLowerCase() === escrowContract && log.topics[0] === DEPOSITED_TOPIC
      })
      if (!depositLog) return errorResponse('No Deposited event from TaskEscrow contract found in transaction', 400)

      const depositedRaw = BigInt(depositLog.data)
      transferredAmount = Number(depositedRaw) / Math.pow(10, USDC_DECIMALS)

      if (expectedAmount != null && transferredAmount < expectedAmount) {
        return errorResponse(`Insufficient escrow deposit: ${transferredAmount} USDC, expected ${expectedAmount} USDC`, 400)
      }
    } else {
      // --- Direct transfer mode: verify USDC Transfer to seller wallet ---
      const transferLog = receipt.logs.find((log) => {
        if (log.address.toLowerCase() !== USDC_CONTRACT.toLowerCase()) return false
        if (log.topics[0] !== TRANSFER_TOPIC) return false
        const toAddress = '0x' + (log.topics[2] || '').slice(26).toLowerCase()
        return toAddress === sellerWallet
      })
      if (!transferLog) return errorResponse('No USDC transfer to seller wallet found in transaction', 400)

      const transferredRaw = BigInt(transferLog.data)
      transferredAmount = Number(transferredRaw) / Math.pow(10, USDC_DECIMALS)

      if (expectedAmount != null && transferredAmount < expectedAmount) {
        return errorResponse(`Insufficient payment: received ${transferredAmount} USDC, expected ${expectedAmount} USDC`, 400)
      }
    }

    // --- Payment verified — create task directly as "paid" ---
    const taskId = generateTaskId()

    await env.DB.prepare(
      `INSERT INTO tasks (id, buyer_agent, buyer_email, seller_agent, skill_name, params,
                          status, payment_method, payment_chain, payment_tx,
                          amount, currency, channel, escrow_tx, escrow_status,
                          paid_at, started_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'paid', ?7, 'base', ?8, ?9, ?10, 'api', ?11, ?12,
               datetime('now'), datetime('now'))`
    ).bind(
      taskId,
      body.buyer || null,
      body.buyer_email || null,
      agentName,
      skill.name,
      body.params ? JSON.stringify(body.params) : null,
      paymentMethod,
      txHash,
      transferredAmount,
      currency,
      isEscrowMode ? txHash : null,
      isEscrowMode ? 'deposited' : 'none',
    ).run()

    // CAN-226: Notify seller (fire-and-forget)
    notifySeller(env, agent, {
      task_id: taskId,
      skill: skill.name as string,
      params: body.params || null,
      buyer: (body.buyer || body.buyer_email || 'anonymous') as string,
      paid_at: new Date().toISOString(),
      amount: transferredAmount,
      currency,
      payment_tx: txHash,
    }).catch(() => {})

    const paymentInfo = isEscrowMode
      ? { escrow: { tx: txHash, status: 'deposited', contract: escrowContract, amount: transferredAmount, currency, chain: 'base', confirmations } }
      : { payment: { tx: txHash, amount: transferredAmount, currency, chain: 'base', confirmations } }

    return json({
      task_id: taskId,
      status: 'paid',
      skill: skill.name,
      sla: skill.sla || null,
      ...paymentInfo,
      next_steps: {
        check_status: `GET /api/agents/${agentName}/tasks/${taskId}`,
      },
      message: isEscrowMode
        ? 'Escrow deposit verified. Task created and paid.'
        : 'Payment verified. Task created and paid.',
    }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'RPC call failed'
    return errorResponse(`Payment verification failed: ${message}`, 502)
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string
  const url = new URL(request.url)
  const limit = intParam(url, 'limit', 20)
  const offset = intParam(url, 'offset', 0)

  // Verify agent exists
  const agent = await env.DB.prepare(
    'SELECT name, is_public FROM agents WHERE name = ?1'
  ).bind(agentName).first()

  if (!agent) return errorResponse('Agent not found', 404)
  if (agent.is_public === 0) return errorResponse('Agent profile is private', 403)

  // List all tasks (public transaction history)
  const statusFilter = url.searchParams.get('status') // optional filter: completed, paid, executing, all (pending_payment deprecated per CAN-232)
  const statusClause = statusFilter && statusFilter !== 'all'
    ? `AND status = '${statusFilter.replace(/[^a-z_]/g, '')}'`
    : ''

  const result = await env.DB.prepare(
    `SELECT id, buyer_agent, buyer_email, skill_name, status, amount, currency,
            payment_tx, payment_chain, channel, result_url,
            escrow_tx, escrow_status,
            created_at, paid_at, completed_at
     FROM tasks
     WHERE seller_agent = ?1 ${statusClause}
     ORDER BY created_at DESC
     LIMIT ?2 OFFSET ?3`
  ).bind(agentName, limit, offset).all()

  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM tasks
     WHERE seller_agent = ?1 ${statusClause}`
  ).bind(agentName).first()

  return json({
    agent: agentName,
    tasks: result.results.map((t) => ({
      id: t.id,
      buyer: t.buyer_agent || null,
      buyer_email: t.buyer_email || null,
      skill: t.skill_name,
      status: t.status,
      amount: t.amount,
      currency: t.currency,
      payment_tx: t.payment_tx || null,
      payment_chain: t.payment_chain || null,
      channel: t.channel,
      result_url: t.status === 'completed' ? (t.result_url || null) : null,
      escrow_tx: t.escrow_tx || null,
      escrow_status: t.escrow_status || 'none',
      created_at: t.created_at,
      paid_at: t.paid_at || null,
      completed_at: t.completed_at || null,
      basescan_url: t.payment_tx ? `https://basescan.org/tx/${t.payment_tx}` : null,
    })),
    total: (countResult?.total as number) || 0,
    limit,
    offset,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
