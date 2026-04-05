/**
 * MPP (Machine Payments Protocol) helper for CanFly.ai
 *
 * Provides pay-per-skill access via Tempo USDC.e.
 * Used alongside the existing Base chain USDC/escrow flow.
 */
import { Mppx, tempo } from 'mppx/server'
import { privateKeyToAccount } from 'viem/accounts'

// USDC.e on Tempo mainnet (6 decimals)
const USDC_E = '0x20c000000000000000000000b9537d11c60e8b50'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _mppxInstance: any = null
let _lastConfig: string | null = null

export function getMppx(env: { MPP_SECRET_KEY?: string; MPP_PRIVATE_KEY?: string }): any {
  const secretKey = env.MPP_SECRET_KEY
  const privateKey = env.MPP_PRIVATE_KEY
  if (!secretKey) throw new Error('MPP_SECRET_KEY required')
  if (!privateKey) throw new Error('MPP_PRIVATE_KEY required')

  const configKey = `${secretKey}:${privateKey}`
  if (_mppxInstance && _lastConfig === configKey) return _mppxInstance

  const account = privateKeyToAccount(privateKey as `0x${string}`)

  _mppxInstance = Mppx.create({
    secretKey,
    methods: [
      tempo({
        currency: USDC_E as `0x${string}`,
        account,
        mode: 'push',
        waitForConfirmation: false,
      }),
    ],
  })
  _lastConfig = configKey
  return _mppxInstance
}

/**
 * Extract payer wallet from MPP credential.
 * Authorization header contains: "Payment <base64>"
 * Decoded JSON has `source: "did:pkh:eip155:<chainId>:<address>"`
 */
export function extractPayerWallet(authHeader: string): string | null {
  try {
    const credPayload = authHeader.replace(/^Payment\s+/i, '')
    if (!credPayload) return null
    const decoded = JSON.parse(atob(credPayload))
    const source = decoded?.source || ''
    const match = source.match(/0x[0-9a-fA-F]{40}/)
    return match ? match[0].toLowerCase() : null
  } catch {
    return null
  }
}
