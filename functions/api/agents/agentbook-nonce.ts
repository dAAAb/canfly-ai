/**
 * GET /api/agents/agentbook-nonce?address=0x...
 *
 * Reads the current nonce for an agent address from the AgentBook contract on Base.
 * Also checks if the agent is already registered (lookupHuman returns non-zero).
 */
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'

const AGENTBOOK_ADDRESS = '0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4'
const BASE_RPC = 'https://mainnet.base.org'

// ABI-encode a function call: fn(address) → bytes
function encodeAddressCall(fnSelector: string, address: string): string {
  const addr = address.toLowerCase().replace('0x', '').padStart(64, '0')
  return fnSelector + addr
}

// nonces(address) selector = keccak256("nonces(address)")[:4]
const NONCES_SELECTOR = '0x7ecebe00'
// lookupHuman(address) selector
const LOOKUP_HUMAN_SELECTOR = '0x4a4fbeec'

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

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url)
  const address = url.searchParams.get('address')

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return errorResponse('Invalid or missing address parameter', 400)
  }

  try {
    const [nonceHex, humanIdHex] = await Promise.all([
      ethCall(AGENTBOOK_ADDRESS, encodeAddressCall(NONCES_SELECTOR, address)),
      ethCall(AGENTBOOK_ADDRESS, encodeAddressCall(LOOKUP_HUMAN_SELECTOR, address)),
    ])

    const nonce = parseInt(nonceHex, 16).toString()
    const humanId = BigInt(humanIdHex)
    const isRegistered = humanId !== 0n

    return json({
      address,
      nonce,
      isRegistered,
      humanId: isRegistered ? humanId.toString() : null,
    })
  } catch (err) {
    return errorResponse(
      `Failed to read contract: ${err instanceof Error ? err.message : 'Unknown'}`,
      502,
    )
  }
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
