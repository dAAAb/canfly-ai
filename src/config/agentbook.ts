/**
 * AgentBook on-chain registry configuration.
 * Contract addresses from: https://docs.world.org/agents/agent-kit/integrate
 */

export const AGENTBOOK_BASE_MAINNET = '0xE1D1D3526A6FAa37eb36bD10B933C1b77f4561a4' as const
export const AGENTBOOK_BASE_SEPOLIA = '0xA23aB2712eA7BBa896930544C7d6636a96b944dA' as const

export const AGENTBOOK_ADDRESS = AGENTBOOK_BASE_MAINNET

// Relay API for gasless registration submission
export const AGENTBOOK_RELAY_URL = 'https://x402-worldchain.vercel.app/register'

// Base mainnet chain ID
export const BASE_CHAIN_ID = 8453

// Minimal ABI for reading nonce + checking registration
export const AGENTBOOK_ABI = [
  {
    name: 'nonces',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'lookupHuman',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const
