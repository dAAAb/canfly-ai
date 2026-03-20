/**
 * POST /api/agents/agentbook-register
 *
 * Submits an AgentBook registration via the relay API and records
 * the result in the agents table.
 *
 * Body: {
 *   agentName: string,        // agent name (must be owned by authenticated user)
 *   agentAddress: string,     // agent wallet address
 *   root: string,             // World ID Merkle root
 *   nonce: string,            // AgentBook nonce for this agent
 *   nullifierHash: string,    // ZK nullifier hash
 *   proof: string[]           // Groth16 proof (8 elements)
 * }
 *
 * Auth: X-Edit-Token or X-Wallet-Address
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'

const AGENTBOOK_RELAY_URL = 'https://x402-worldchain.vercel.app/register'

interface RegisterBody {
  agentName: string
  agentAddress: string
  contract?: string
  network?: string
  root: string
  nonce: string
  nullifierHash: string
  proof: string[]
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const editToken = request.headers.get('X-Edit-Token')
  const walletHeader = request.headers.get('X-Wallet-Address')
  if (!editToken && !walletHeader) {
    return errorResponse('Authentication required', 401)
  }

  const body = await parseBody<RegisterBody>(request)
  if (!body?.agentName || !body?.agentAddress || !body?.root || !body?.nullifierHash || !body?.proof) {
    return errorResponse('Missing required fields', 400)
  }

  // Verify the agent exists and belongs to the authenticated user
  const agent = await env.DB.prepare(`
    SELECT a.name, a.wallet_address, a.owner_username, a.agentbook_registered,
           u.edit_token, u.wallet_address AS user_wallet
    FROM agents a
    JOIN users u ON u.username = a.owner_username
    WHERE a.name = ?1
  `).bind(body.agentName).first<{
    name: string
    wallet_address: string | null
    owner_username: string
    agentbook_registered: number
    edit_token: string
    user_wallet: string | null
  }>()

  if (!agent) return errorResponse('Agent not found', 404)

  // Auth check
  const tokenOk = editToken && agent.edit_token === editToken
  const walletOk = walletHeader && agent.user_wallet &&
    walletHeader.toLowerCase() === agent.user_wallet.toLowerCase()
  if (!tokenOk && !walletOk) return errorResponse('Unauthorized', 403)

  // Check owner has World ID verification
  const verification = await env.DB.prepare(
    'SELECT username FROM world_id_verifications WHERE username = ?1'
  ).bind(agent.owner_username).first()
  if (!verification) return errorResponse('Owner must be World ID verified first', 400)

  // Already registered?
  if (agent.agentbook_registered) {
    return json({ ok: true, message: 'Already registered on AgentBook', already: true })
  }

  // Submit to relay API (official World hosted relay)
  const contract = body.contract || '0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4'
  const network = body.network || 'base'
  try {
    const relayRes = await fetch(AGENTBOOK_RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: body.agentAddress,
        root: body.root,
        nonce: body.nonce,
        nullifierHash: body.nullifierHash,
        proof: body.proof,
        contract,
        network,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!relayRes.ok) {
      const err = await relayRes.text()
      return errorResponse(`Relay error: ${err}`, 502)
    }

    const relayData = (await relayRes.json()) as { txHash?: string }
    const txHash = relayData.txHash || null

    // Record registration
    await env.DB.prepare(`
      UPDATE agents
      SET agentbook_registered = 1,
          agentbook_tx_hash = ?1,
          agentbook_human_id = ?2,
          agentbook_registered_at = datetime('now')
      WHERE name = ?3
    `).bind(txHash, body.nullifierHash, body.agentName).run()

    return json({
      ok: true,
      txHash,
      message: 'Agent registered on AgentBook!',
    })
  } catch (err) {
    return errorResponse(`Registration failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 500)
  }
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
