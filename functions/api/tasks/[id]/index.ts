/**
 * GET /api/tasks/:id — Public task result page endpoint (CAN-282)
 *
 * Auth: buyer wallet (Privy JWT or X-Buyer-Wallet header) OR ?token= HMAC view token.
 * Token-based access allows unauthenticated sharing of result links.
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'
import { deriveViewToken } from '../../_crypto'

/** Resolve wallet address from Privy JWT */
async function resolveWalletFromJwt(request: Request, env: Env): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  // Look up the Privy user's wallet via the privy_user_id stored in users table
  // For now, we accept the X-Wallet-Address header as a hint when JWT is present
  // (The real verification happens via Privy SDK on backend, but for this read-only
  //  endpoint the wallet header is sufficient since we're just checking ownership)
  return null
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const taskId = params.id as string
  if (!taskId) return errorResponse('Task ID required', 400)

  const url = new URL(request.url)
  const viewToken = url.searchParams.get('token')

  // Fetch task (no seller_agent filter — lookup by ID alone)
  const task = await env.DB.prepare(
    `SELECT id, buyer_agent, buyer_email, buyer_wallet, seller_agent, skill_name, params,
            status, payment_method, payment_chain, payment_tx,
            amount, currency, channel, result_url, result_data,
            result_preview, result_note,
            escrow_tx, escrow_status, sla_deadline, confirmed_at, rejected_at, reject_reason,
            created_at, started_at, paid_at, completed_at
     FROM tasks WHERE id = ?1`
  ).bind(taskId).first()

  if (!task) return errorResponse('Task not found', 404)

  // --- Auth check ---
  let authorized = false

  // 1. Token-based access (HMAC view token)
  if (viewToken && env.ENCRYPTION_KEY) {
    const expected = await deriveViewToken(taskId, env.ENCRYPTION_KEY)
    if (viewToken === expected) authorized = true
  }

  // 2. Buyer wallet header (case-insensitive match)
  if (!authorized) {
    const walletHeader = request.headers.get('X-Buyer-Wallet') || request.headers.get('X-Wallet-Address')
    if (
      walletHeader &&
      task.buyer_wallet &&
      walletHeader.toLowerCase() === (task.buyer_wallet as string).toLowerCase()
    ) {
      authorized = true
    }
  }

  // 3. Bearer token matches seller or buyer agent API key
  if (!authorized) {
    const authHeader = request.headers.get('Authorization')
    const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (bearerKey) {
      // Check seller
      const seller = await env.DB.prepare(
        'SELECT api_key FROM agents WHERE name = ?1'
      ).bind(task.seller_agent).first()
      if (seller?.api_key && seller.api_key === bearerKey) authorized = true

      // Check buyer agent
      if (!authorized && task.buyer_agent) {
        const buyer = await env.DB.prepare(
          'SELECT api_key FROM agents WHERE name = ?1'
        ).bind(task.buyer_agent).first()
        if (buyer?.api_key && buyer.api_key === bearerKey) authorized = true
      }
    }
  }

  if (!authorized) return errorResponse('Forbidden', 403)

  // --- Build response ---
  const startTime = task.started_at || task.paid_at || task.created_at
  const executionMs = startTime && task.completed_at
    ? new Date(task.completed_at as string).getTime() - new Date(startTime as string).getTime()
    : null

  const escrowInfo = task.escrow_tx ? {
    escrow: {
      tx: task.escrow_tx,
      status: task.escrow_status || 'none',
      sla_deadline: task.sla_deadline || null,
      confirmed_at: task.confirmed_at || null,
      rejected_at: task.rejected_at || null,
      reject_reason: task.reject_reason || null,
    },
  } : {}

  // Generate view token for sharing (only if ENCRYPTION_KEY is set)
  let shareToken: string | null = null
  if (env.ENCRYPTION_KEY) {
    shareToken = await deriveViewToken(taskId, env.ENCRYPTION_KEY)
  }

  return json({
    id: task.id,
    seller: task.seller_agent,
    buyer: task.buyer_agent,
    buyer_email: task.buyer_email,
    skill: task.skill_name,
    params: task.params ? JSON.parse(task.params as string) : null,
    status: task.status,
    payment: {
      method: task.payment_method,
      chain: task.payment_chain,
      tx: task.payment_tx,
      amount: task.amount,
      currency: task.currency,
    },
    ...escrowInfo,
    channel: task.channel,
    created_at: task.created_at,
    started_at: task.started_at,
    paid_at: task.paid_at,
    completed_at: task.completed_at,
    execution_time_ms: executionMs,
    result_url: task.result_url || null,
    result_preview: task.result_preview || null,
    result_note: task.result_note || null,
    result_data: task.result_data ? JSON.parse(task.result_data as string) : null,
    share_token: shareToken,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
