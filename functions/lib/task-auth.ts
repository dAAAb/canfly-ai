/**
 * Shared auth helper for task endpoints (CAN-280).
 *
 * Auth rules:
 * - Allow if Bearer token matches seller agent's api_key
 * - Allow if X-Buyer-Wallet header matches task's buyer_wallet (case-insensitive)
 * - Allow if Bearer token matches buyer agent's api_key
 * - Otherwise deny
 */
import { type Env } from '../api/community/_helpers'

export type TaskAuthResult =
  | { authorized: true; role: 'seller' | 'buyer' }
  | { authorized: false }

/**
 * Check if the request is authorized to access a task's details/results.
 *
 * @param env       - D1 environment
 * @param request   - incoming request
 * @param agentName - seller agent name (from URL)
 * @param task      - task row (must include buyer_agent, buyer_wallet)
 */
export async function checkTaskAuth(
  env: Env,
  request: Request,
  agentName: string,
  task: { buyer_agent?: string | null; buyer_wallet?: string | null },
): Promise<TaskAuthResult> {
  const authHeader = request.headers.get('Authorization')
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  // 1. Seller auth: Bearer key matches seller's api_key
  if (bearerKey) {
    const seller = await env.DB.prepare(
      'SELECT api_key FROM agents WHERE name = ?1'
    ).bind(agentName).first()

    if (seller?.api_key && seller.api_key === bearerKey) {
      return { authorized: true, role: 'seller' }
    }
  }

  // 2. Buyer wallet header matches task's buyer_wallet
  const buyerWalletHeader = request.headers.get('X-Buyer-Wallet')
  if (
    buyerWalletHeader &&
    task.buyer_wallet &&
    buyerWalletHeader.toLowerCase() === (task.buyer_wallet as string).toLowerCase()
  ) {
    return { authorized: true, role: 'buyer' }
  }

  // 3. Buyer agent auth: Bearer key matches buyer agent's api_key
  if (bearerKey && task.buyer_agent) {
    const buyer = await env.DB.prepare(
      'SELECT api_key FROM agents WHERE name = ?1'
    ).bind(task.buyer_agent).first()

    if (buyer?.api_key && buyer.api_key === bearerKey) {
      return { authorized: true, role: 'buyer' }
    }
  }

  return { authorized: false }
}
