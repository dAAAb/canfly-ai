/**
 * GET /api/tasks?buyer_wallet=0x... — List buyer's escrow tasks
 *
 * Returns tasks purchased by the given wallet address, sorted by creation date (newest first).
 * Used by the frontend TaskManager page for confirm/reject flows.
 *
 * CAN-265: Buyer task management
 */
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
  const buyerWallet = url.searchParams.get('buyer_wallet')

  if (!buyerWallet) {
    return errorResponse('buyer_wallet query parameter is required', 400)
  }

  const normalized = buyerWallet.trim().toLowerCase()
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    return errorResponse('Invalid wallet address format', 400)
  }

  const result = await env.DB.prepare(
    `SELECT id, seller_agent, skill_name, status, escrow_status,
            amount, currency, created_at, completed_at, confirmed_at,
            rejected_at, reject_reason, result_url, result_data, sla_deadline
     FROM tasks
     WHERE LOWER(buyer_wallet) = ?1
     ORDER BY created_at DESC
     LIMIT 100`
  ).bind(normalized).all()

  return json({
    tasks: result.results || [],
    count: result.results?.length || 0,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
