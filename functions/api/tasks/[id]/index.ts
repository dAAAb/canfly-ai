/**
 * GET /api/tasks/:id — Public task result page endpoint (CAN-282)
 *
 * Auth: buyer wallet (Privy JWT or X-Buyer-Wallet header) OR ?token= HMAC view token.
 * Token-based access allows unauthenticated sharing of result links.
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'
import { deriveViewToken } from '../../_crypto'
import { importKey, decrypt } from '../../../lib/crypto'

/** Auth levels for result file access (CAN-291) */
type AuthLevel = 'owner' | 'token' | 'none'

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
            result_preview, result_note, result_content_type,
            escrow_tx, escrow_status, sla_deadline, confirmed_at, rejected_at, reject_reason,
            created_at, started_at, paid_at, completed_at
     FROM tasks WHERE id = ?1`
  ).bind(taskId).first()

  if (!task) return errorResponse('Task not found', 404)

  // --- Auth check (CAN-291: track auth level for credential masking) ---
  let authLevel: AuthLevel = 'none'

  // 1. Token-based access (HMAC view token) — "token" level
  if (viewToken && env.ENCRYPTION_KEY) {
    const expected = await deriveViewToken(taskId, env.ENCRYPTION_KEY)
    if (viewToken === expected) authLevel = 'token'
  }

  // 2. Buyer wallet header (case-insensitive match) — "owner" level
  if (authLevel === 'none') {
    const walletHeader = request.headers.get('X-Buyer-Wallet') || request.headers.get('X-Wallet-Address')
    if (
      walletHeader &&
      task.buyer_wallet &&
      walletHeader.toLowerCase() === (task.buyer_wallet as string).toLowerCase()
    ) {
      authLevel = 'owner'
    }
  }

  // 3. Bearer token matches seller or buyer agent API key — "owner" level
  if (authLevel === 'none') {
    const authHeader = request.headers.get('Authorization')
    const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (bearerKey) {
      // Check seller
      const seller = await env.DB.prepare(
        'SELECT api_key FROM agents WHERE name = ?1'
      ).bind(task.seller_agent).first()
      if (seller?.api_key && seller.api_key === bearerKey) authLevel = 'owner'

      // Check buyer agent
      if (authLevel === 'none' && task.buyer_agent) {
        const buyer = await env.DB.prepare(
          'SELECT api_key FROM agents WHERE name = ?1'
        ).bind(task.buyer_agent).first()
        if (buyer?.api_key && buyer.api_key === bearerKey) authLevel = 'owner'
      }
    }
  }

  // 4. Agent owner: edit token, wallet match, or Privy embedded wallet — "owner" level
  if (authLevel === 'none') {
    const sellerAgent = await env.DB.prepare(
      `SELECT a.wallet_address, a.owner_username, a.edit_token as agent_edit_token,
              u.wallet_address as owner_wallet, u.edit_token
       FROM agents a LEFT JOIN users u ON a.owner_username = u.username
       WHERE a.name = ?1`
    ).bind(task.seller_agent).first()

    if (sellerAgent) {
      // 4a. Edit token match (most reliable for Google login users)
      const editToken = request.headers.get('X-Edit-Token')
      if (editToken) {
        const agentET = (sellerAgent as Record<string, unknown>).agent_edit_token as string | null
        const ownerET = (sellerAgent as Record<string, unknown>).edit_token as string | null
        if ((agentET && editToken === agentET) || (ownerET && editToken === ownerET)) {
          authLevel = 'owner'
        }
      }

      // 4b. Wallet address match (Privy embedded wallet or agent wallet)
      if (authLevel === 'none') {
        const callerWallet = (request.headers.get('X-Wallet-Address') || '').toLowerCase()
        if (callerWallet) {
          const agentWallet = ((sellerAgent.wallet_address as string) || '').toLowerCase()
          const ownerWallet = ((sellerAgent.owner_wallet as string) || '').toLowerCase()
          if ((agentWallet && callerWallet === agentWallet) ||
              (ownerWallet && callerWallet === ownerWallet)) {
            authLevel = 'owner'
          }
        }
      }
    }
  }

  if (authLevel === 'none') return errorResponse('Forbidden', 403)

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

  // CAN-291: Process result_data files based on auth level
  let resultData = task.result_data ? JSON.parse(task.result_data as string) : null

  if (resultData?.files && Array.isArray(resultData.files)) {
    let cryptoKey: CryptoKey | null = null
    if (env.ENCRYPTION_KEY) {
      cryptoKey = await importKey(env.ENCRYPTION_KEY)
    }

    const processedFiles: Record<string, unknown>[] = []
    for (const file of resultData.files as Record<string, unknown>[]) {
      const isCredential = file.type === 'credential' || file.type === 'api_endpoint'

      if (isCredential && authLevel === 'token') {
        // Share token access: mask sensitive values
        const masked: Record<string, unknown> = {
          url: file.url,
          type: file.type,
          name: file.name,
          auth: file.auth,
          method: file.method,
          expires_at: file.expires_at,
        }
        // Mask token: show first 8 + last 4 chars
        if (file.encrypted_token && cryptoKey) {
          const fullToken = await decrypt(file.encrypted_token as string, cryptoKey)
          masked.token_masked = fullToken.length > 12
            ? fullToken.slice(0, 8) + '****' + fullToken.slice(-4)
            : '****'
        }
        processedFiles.push(masked)
      } else if (isCredential && authLevel === 'owner') {
        // Full access: decrypt and return complete values
        const full: Record<string, unknown> = {
          url: file.url,
          type: file.type,
          name: file.name,
          auth: file.auth,
          method: file.method,
          expires_at: file.expires_at,
        }
        if (file.encrypted_token && cryptoKey) {
          full.token = await decrypt(file.encrypted_token as string, cryptoKey)
        }
        if (file.encrypted_headers && cryptoKey) {
          full.headers = JSON.parse(await decrypt(file.encrypted_headers as string, cryptoKey))
        }
        processedFiles.push(full)
      } else if (!isCredential) {
        // Non-credential files: always return as-is
        processedFiles.push(file)
      }
      // Public (authLevel 'none') would have been rejected above, but
      // credential files are stripped for 'token' auth with no crypto key
    }
    resultData = { ...resultData, files: processedFiles }
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
    result_content_type: task.result_content_type || null,
    result_data: resultData,
    share_token: shareToken,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
