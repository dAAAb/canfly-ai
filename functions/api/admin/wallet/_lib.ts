/**
 * Shared wallet utilities — extracted from CAN-286 admin endpoints
 *
 * Allows internal server code (cron handlers, etc.) to use the MPP wallet
 * without needing CRON_SECRET auth — they already have `env` access.
 */
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem'
import { base } from 'viem/chains'
import type { Env } from '../../community/_helpers'

/** Get the viem Account object from env.MPP_PRIVATE_KEY */
export function getMPPAccount(env: Env): PrivateKeyAccount {
  const privateKey = (env as unknown as Record<string, string>).MPP_PRIVATE_KEY
  if (!privateKey) throw new Error('MPP_PRIVATE_KEY not configured')
  return privateKeyToAccount(privateKey as `0x${string}`)
}

/** Get the wallet address without exposing the key */
export function getMPPAddress(env: Env): string {
  return getMPPAccount(env).address
}

/** Sign a message (e.g. SIWE) */
export async function signMessage(env: Env, message: string): Promise<{ signature: string; address: string }> {
  const account = getMPPAccount(env)
  const signature = await account.signMessage({ message })
  return { signature, address: account.address }
}

/** Create a wallet client for sending transactions */
export function createMPPWalletClient(env: Env) {
  const account = getMPPAccount(env)
  const baseRpcUrl = (env as unknown as Record<string, string>).BASE_RPC_URL || 'https://mainnet.base.org'
  return createWalletClient({
    account,
    chain: base,
    transport: http(baseRpcUrl),
  })
}

/** Create a public client for reading chain state */
export function createBasePublicClient(env: Env) {
  const baseRpcUrl = (env as unknown as Record<string, string>).BASE_RPC_URL || 'https://mainnet.base.org'
  return createPublicClient({
    chain: base,
    transport: http(baseRpcUrl),
  })
}

/** Send a transaction from the MPP wallet */
export async function sendTransaction(
  env: Env,
  params: { to: string; data?: string; value?: string }
): Promise<{ hash: string; from: string }> {
  const client = createMPPWalletClient(env)
  const txParams: {
    to: `0x${string}`
    data?: `0x${string}`
    value?: bigint
  } = {
    to: params.to as `0x${string}`,
  }
  if (params.data) txParams.data = params.data as `0x${string}`
  if (params.value) txParams.value = parseEther(params.value)

  const hash = await client.sendTransaction(txParams)
  return { hash, from: client.account.address }
}

/** Get ETH balance of the MPP wallet */
export async function getBalance(env: Env): Promise<{ address: string; balanceWei: string; balanceEth: string }> {
  const account = getMPPAccount(env)
  const publicClient = createBasePublicClient(env)
  const balance = await publicClient.getBalance({ address: account.address })
  return {
    address: account.address,
    balanceWei: balance.toString(),
    balanceEth: formatEther(balance),
  }
}
