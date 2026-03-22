/**
 * AgentBook configuration
 * Must match @worldcoin/agentkit-cli constants exactly
 */

// AgentBook uses its OWN World ID app, not CanFly's
export const AGENTBOOK_WORLD_ID_APP_ID = 'app_a7c3e2b6b83927251a0db5345bd7146a'
export const AGENTBOOK_ACTION = 'agentbook-registration'

// Relay URL (official hosted relay from World) — used by backend, exported for reference
export const AGENTBOOK_RELAY_URL = 'https://x402-worldchain.vercel.app'
// Note: actual relay call goes through our backend /api/agents/agentbook-register

// Contract addresses per network
export const AGENTBOOK_CONTRACTS = {
  base: '0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4',
  world: '0xA23aB2712eA7BBa896930544C7d6636a96b944dA',
  'base-sepolia': '0xA23aB2712eA7BBa896930544C7d6636a96b944dA',
} as const

// Default network for CanFly — Worldchain (per official Agent Kit docs)
export const AGENTBOOK_NETWORK = 'world'
export const AGENTBOOK_CONTRACT = AGENTBOOK_CONTRACTS[AGENTBOOK_NETWORK]

// AgentBook ABI for nonce lookup
export const AGENT_BOOK_ABI = [
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'getNextNonce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
