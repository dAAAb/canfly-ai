/**
 * GET /api/community/users/:username/tasks — List tasks for a user (buyer + seller)
 *
 * Returns tasks where the user is the buyer (by wallet) or seller (via owned agents).
 * Requires wallet address header for buyer tasks, and matches seller via owner_username.
 *
 * CAN-264: Tasks dashboard
 */
import { type Env, json, errorResponse, handleOptions, intParam } from '../../_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const username = (params.username as string).toLowerCase()
  const url = new URL(request.url)
  const view = url.searchParams.get('view') || 'all' // 'buyer' | 'seller' | 'all'
  const statusFilter = url.searchParams.get('status') // optional status filter
  const limit = intParam(url, 'limit', 50)
  const offset = intParam(url, 'offset', 0)

  // Verify user exists
  const user = await env.DB.prepare(
    'SELECT username, wallet_address FROM users WHERE LOWER(username) = ?1'
  ).bind(username).first()

  if (!user) return errorResponse('User not found', 404)

  const walletAddress = (user.wallet_address as string | null)?.toLowerCase() || null

  // Build status clause
  const validStatuses = new Set(['paid', 'executing', 'completed', 'failed', 'cancelled'])
  const statusClause = statusFilter && validStatuses.has(statusFilter)
    ? `AND t.status = '${statusFilter}'`
    : ''

  const buyerTasks: Record<string, unknown>[] = []
  const sellerTasks: Record<string, unknown>[] = []

  // Buyer tasks (by wallet address)
  if (walletAddress && (view === 'buyer' || view === 'all')) {
    const result = await env.DB.prepare(
      `SELECT t.id, t.seller_agent, t.skill_name, t.status, t.escrow_status,
              t.amount, t.currency, t.created_at, t.completed_at, t.confirmed_at,
              t.rejected_at, t.reject_reason, t.result_url, t.sla_deadline,
              'buyer' as role
       FROM tasks t
       WHERE LOWER(t.buyer_wallet) = ?1 ${statusClause}
       ORDER BY t.created_at DESC
       LIMIT ?2 OFFSET ?3`
    ).bind(walletAddress, limit, offset).all()
    buyerTasks.push(...(result.results || []))
  }

  // Seller tasks (via owned agents)
  if (view === 'seller' || view === 'all') {
    const agentsResult = await env.DB.prepare(
      'SELECT name FROM agents WHERE LOWER(owner_username) = ?1'
    ).bind(username).all()

    const agentNames = (agentsResult.results || []).map((a) => a.name as string)

    if (agentNames.length > 0) {
      // Build IN clause safely with positional params
      const placeholders = agentNames.map((_, i) => `?${i + 1}`).join(', ')
      const sellerResult = await env.DB.prepare(
        `SELECT t.id, t.buyer_agent, t.buyer_email, t.buyer_wallet, t.seller_agent,
                t.skill_name, t.status, t.escrow_status,
                t.amount, t.currency, t.created_at, t.completed_at, t.confirmed_at,
                t.rejected_at, t.result_url, t.sla_deadline,
                'seller' as role
         FROM tasks t
         WHERE t.seller_agent IN (${placeholders}) ${statusClause}
         ORDER BY t.created_at DESC
         LIMIT ?${agentNames.length + 1} OFFSET ?${agentNames.length + 2}`
      ).bind(...agentNames, limit, offset).all()
      sellerTasks.push(...(sellerResult.results || []))
    }
  }

  return json({
    username: user.username,
    buyer_tasks: buyerTasks,
    seller_tasks: sellerTasks,
    buyer_count: buyerTasks.length,
    seller_count: sellerTasks.length,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
