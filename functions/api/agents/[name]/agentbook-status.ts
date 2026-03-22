/**
 * GET /api/agents/:name/agentbook-status
 *
 * Query whether an agent's wallet is registered on AgentBook (Base mainnet).
 * Reads on-chain status via lookupHuman(address) and caches result in DB.
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'

const AGENTBOOK_ADDRESS = '0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4'
const BASE_RPC = 'https://mainnet.base.org'

// lookupHuman(address) selector
const LOOKUP_HUMAN_SELECTOR = '0x4a4fbeec'
// getNextNonce(address) selector
const GET_NEXT_NONCE_SELECTOR = '0x90193b7c'

function encodeAddressCall(fnSelector: string, address: string): string {
  const addr = address.toLowerCase().replace('0x', '').padStart(64, '0')
  return fnSelector + addr
}

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
    signal: AbortSignal.timeout(10000),
  })
  const body = (await res.json()) as { result?: string; error?: { message: string } }
  if (body.error) throw new Error(body.error.message)
  return body.result || '0x0'
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const name = params.name as string

  // Look up agent
  const agent = await env.DB.prepare(
    `SELECT name, wallet_address, agentbook_registered, agentbook_tx_hash,
            agentbook_human_id, agentbook_registered_at
     FROM agents WHERE name = ?1`
  ).bind(name).first<{
    name: string
    wallet_address: string | null
    agentbook_registered: number
    agentbook_tx_hash: string | null
    agentbook_human_id: string | null
    agentbook_registered_at: string | null
  }>()

  if (!agent) return errorResponse('Agent not found', 404)

  if (!agent.wallet_address) {
    return json({
      agent: agent.name,
      walletAddress: null,
      registered: false,
      humanId: null,
      txHash: null,
      nonce: null,
      registeredAt: null,
      source: 'no_wallet',
    })
  }

  // Query on-chain status
  try {
    const humanIdHex = await ethCall(
      AGENTBOOK_ADDRESS,
      encodeAddressCall(LOOKUP_HUMAN_SELECTOR, agent.wallet_address),
    )
    const nonceHex = await ethCall(
      AGENTBOOK_ADDRESS,
      encodeAddressCall(GET_NEXT_NONCE_SELECTOR, agent.wallet_address),
    )
    const humanId = BigInt(humanIdHex)
    const nonce = BigInt(nonceHex)
    const isRegistered = humanId !== 0n

    // Sync DB cache if on-chain status differs
    if (isRegistered && !agent.agentbook_registered) {
      await env.DB.prepare(`
        UPDATE agents
        SET agentbook_registered = 1,
            agentbook_human_id = ?1,
            agentbook_registered_at = COALESCE(agentbook_registered_at, datetime('now'))
        WHERE name = ?2
      `).bind(humanId.toString(), name).run()
    } else if (!isRegistered && agent.agentbook_registered) {
      await env.DB.prepare(`
        UPDATE agents
        SET agentbook_registered = 0,
            agentbook_human_id = NULL
        WHERE name = ?1
      `).bind(name).run()
    }

    return json({
      agent: agent.name,
      walletAddress: agent.wallet_address,
      registered: isRegistered,
      humanId: isRegistered ? humanId.toString() : null,
      txHash: agent.agentbook_tx_hash,
      nonce: nonce.toString(),
      registeredAt: agent.agentbook_registered_at,
      source: 'on_chain',
    })
  } catch (err) {
    // Fallback to cached DB value on RPC failure
    return json({
      agent: agent.name,
      walletAddress: agent.wallet_address,
      registered: !!agent.agentbook_registered,
      humanId: agent.agentbook_human_id,
      txHash: agent.agentbook_tx_hash,
      nonce: null,
      registeredAt: agent.agentbook_registered_at,
      source: 'cache',
      warning: `On-chain query failed: ${err instanceof Error ? err.message : 'Unknown'}`,
    })
  }
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
