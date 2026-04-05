/**
 * MPP (Machine Payments Protocol) helper for CanFly.ai
 *
 * Lightweight implementation without mppx SDK (avoids node:util dependency
 * which Cloudflare Pages Functions doesn't support).
 *
 * Flow:
 * 1. No payment credential → return 402 challenge
 * 2. Has Authorization: Payment <credential> → verify and extract payer
 */

const USDC_E = '0x20c000000000000000000000b9537d11c60e8b50'
const TEMPO_CHAIN_ID = 4217

/**
 * Build a 402 Payment Required response with MPP-compatible challenge.
 */
export function mppChallenge(opts: {
  amount: string   // human-readable (e.g. '1.00')
  recipient: string
  realm: string
  skill?: string
}): Response {
  const amountAtomic = String(Math.round(parseFloat(opts.amount) * 1_000_000))

  const request = btoa(JSON.stringify({
    amount: amountAtomic,
    currency: USDC_E,
    methodDetails: { chainId: TEMPO_CHAIN_ID },
    recipient: opts.recipient,
  }))

  const challengeId = crypto.randomUUID()

  return new Response(JSON.stringify({
    type: 'https://paymentauth.org/problems/payment-required',
    title: 'Payment Required',
    status: 402,
    detail: `Payment is required. ${opts.skill ? `Skill: ${opts.skill}` : ''}`.trim(),
    challengeId,
  }), {
    status: 402,
    headers: {
      'Content-Type': 'application/problem+json',
      'WWW-Authenticate': `Payment id="${challengeId}", realm="${opts.realm}", method="tempo", intent="charge", request="${request}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'WWW-Authenticate, Payment-Receipt',
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * Check if request has an MPP Payment credential.
 */
export function hasMppCredential(request: Request): boolean {
  const auth = request.headers.get('Authorization') || ''
  return auth.startsWith('Payment ')
}

/**
 * Extract payer wallet from MPP credential.
 * Authorization header: "Payment <base64>"
 * Decoded JSON has `source: "did:pkh:eip155:<chainId>:<address>"`
 */
export function extractPayerWallet(request: Request): string | null {
  const authHeader = request.headers.get('Authorization') || ''
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
