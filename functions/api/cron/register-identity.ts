/**
 * POST /api/cron/register-identity — CAN-287
 * Register canflyai.base.eth + canflyai@basemail.ai using MPP wallet
 *
 * This runs inside Cloudflare Workers — the private key never leaves CF.
 * Auth: CRON_SECRET (same as other cron endpoints)
 *
 * Steps:
 *   1. Derive wallet address from MPP_PRIVATE_KEY
 *   2. Check if canflyai.base.eth is available → register if so
 *   3. SIWE-auth to BaseMail API → register canflyai@basemail.ai
 *   4. Return results
 */
import { createPublicClient, http, encodeFunctionData, parseEther, formatEther } from 'viem'
import { base } from 'viem/chains'
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'
import { getMPPAccount, createMPPWalletClient, createBasePublicClient } from '../admin/wallet/_lib'

// ─── Constants ───────────────────────────────────────────────────────
const BASENAME = 'canflyai'
const BASENAME_FULL = 'canflyai.base.eth'
const BASEMAIL_USERNAME = 'canflyai'
const BASEMAIL_API = 'https://api.basemail.ai'

// Base Registrar Controller (ENSIP-19)
const REGISTRAR_CONTROLLER = '0xa7d2607c6BD39Ae9521e514026CBB078405Ab322' as const
const L2_RESOLVER = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD' as const

// ABIs (minimal)
const REGISTRAR_ABI = [
  {
    name: 'registerPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'duration', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'available',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'valid',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'register',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'request',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'owner', type: 'address' },
          { name: 'duration', type: 'uint256' },
          { name: 'resolver', type: 'address' },
          { name: 'data', type: 'bytes[]' },
          { name: 'reverseRecord', type: 'bool' },
          { name: 'coinTypes', type: 'uint256[]' },
          { name: 'signatureExpiry', type: 'uint256' },
          { name: 'signature', type: 'bytes' },
        ],
      },
    ],
    outputs: [],
  },
] as const

const ONE_YEAR_SECONDS = BigInt(365 * 24 * 60 * 60)

// ─── Auth helper ─────────────────────────────────────────────────────
function requireCron(request: Request, env: Env): string | null {
  const cronSecret = (env as unknown as Record<string, string>).CRON_SECRET
  if (!cronSecret) return null
  const authHeader = request.headers.get('Authorization')
  const cronHeader = request.headers.get('X-Cron-Secret')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cronHeader
  if (token !== cronSecret) return 'Unauthorized'
  return null
}

// ─── Step 1: Register Basename ───────────────────────────────────────
async function registerBasename(env: Env): Promise<{
  status: 'registered' | 'already_taken' | 'error' | 'skipped'
  detail: string
  txHash?: string
}> {
  try {
    const account = getMPPAccount(env)
    const publicClient = createBasePublicClient(env)

    // Check availability
    const isAvailable = await publicClient.readContract({
      address: REGISTRAR_CONTROLLER,
      abi: REGISTRAR_ABI,
      functionName: 'available',
      args: [BASENAME],
    })

    if (!isAvailable) {
      return { status: 'already_taken', detail: `${BASENAME_FULL} is not available (already registered)` }
    }

    // Check balance
    const balance = await publicClient.getBalance({ address: account.address })
    
    // Get price for 1 year
    const price = await publicClient.readContract({
      address: REGISTRAR_CONTROLLER,
      abi: REGISTRAR_ABI,
      functionName: 'registerPrice',
      args: [BASENAME, ONE_YEAR_SECONDS],
    })

    const priceWithBuffer = (price * 110n) / 100n // 10% buffer for gas
    
    if (balance < priceWithBuffer) {
      return {
        status: 'error',
        detail: `Insufficient balance. Need ~${formatEther(priceWithBuffer)} ETH, have ${formatEther(balance)} ETH`,
      }
    }

    // Register (ENSIP-19 format)
    const walletClient = createMPPWalletClient(env)
    
    const registerRequest = {
      name: BASENAME,
      owner: account.address,
      duration: ONE_YEAR_SECONDS,
      resolver: L2_RESOLVER,
      data: [] as `0x${string}`[],
      reverseRecord: true,
      coinTypes: [] as bigint[],
      signatureExpiry: 0n, // no signature needed for self-registration
      signature: '0x' as `0x${string}`,
    }

    const txHash = await walletClient.writeContract({
      address: REGISTRAR_CONTROLLER,
      abi: REGISTRAR_ABI,
      functionName: 'register',
      args: [registerRequest],
      value: price,
    })

    return {
      status: 'registered',
      detail: `${BASENAME_FULL} registered! Tx: ${txHash}`,
      txHash,
    }
  } catch (e: unknown) {
    return { status: 'error', detail: `Basename error: ${(e as Error).message}` }
  }
}

// ─── Step 2: Register BaseMail ───────────────────────────────────────
async function registerBasemail(env: Env): Promise<{
  status: 'registered' | 'already_exists' | 'error'
  detail: string
  email?: string
}> {
  try {
    const account = getMPPAccount(env)

    // Step A: Get SIWE nonce
    const startRes = await fetch(`${BASEMAIL_API}/api/auth/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: account.address }),
    })

    if (!startRes.ok) {
      const errText = await startRes.text()
      return { status: 'error', detail: `Auth start failed: ${startRes.status} ${errText}` }
    }

    const startData = await startRes.json() as { message: string; nonce: string }

    // Step B: Sign the SIWE message
    const signature = await account.signMessage({ message: startData.message })

    // Step C: Verify signature → get token
    const verifyRes = await fetch(`${BASEMAIL_API}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: startData.message,
        signature,
        address: account.address,
      }),
    })

    if (!verifyRes.ok) {
      const errText = await verifyRes.text()
      return { status: 'error', detail: `Auth verify failed: ${verifyRes.status} ${errText}` }
    }

    const verifyData = await verifyRes.json() as { token: string; email?: string }

    // If already registered, the verify might return the email
    if (verifyData.email) {
      return {
        status: 'already_exists',
        detail: `Already registered as ${verifyData.email}`,
        email: verifyData.email,
      }
    }

    // Step D: Register the email
    const regRes = await fetch(`${BASEMAIL_API}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${verifyData.token}`,
      },
      body: JSON.stringify({
        username: BASEMAIL_USERNAME,
        basename: BASENAME_FULL,
      }),
    })

    if (!regRes.ok) {
      const errText = await regRes.text()
      // Check for "already registered" error
      if (regRes.status === 409 || errText.includes('already')) {
        return {
          status: 'already_exists',
          detail: `${BASEMAIL_USERNAME}@basemail.ai already registered`,
          email: `${BASEMAIL_USERNAME}@basemail.ai`,
        }
      }
      return { status: 'error', detail: `Registration failed: ${regRes.status} ${errText}` }
    }

    return {
      status: 'registered',
      detail: `${BASEMAIL_USERNAME}@basemail.ai registered!`,
      email: `${BASEMAIL_USERNAME}@basemail.ai`,
    }
  } catch (e: unknown) {
    return { status: 'error', detail: `BaseMail error: ${(e as Error).message}` }
  }
}

// ─── Handler ─────────────────────────────────────────────────────────
export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const authError = requireCron(request, env)
  if (authError) return errorResponse(authError, 401)

  // Step 0: Get wallet info
  let address: string
  try {
    const account = getMPPAccount(env)
    address = account.address
  } catch (e: unknown) {
    return errorResponse(`MPP wallet not configured: ${(e as Error).message}`, 500)
  }

  console.log(`[register-identity] Starting CAN-287 for wallet ${address}`)

  // Run both registrations
  const [basenameResult, basemailResult] = await Promise.allSettled([
    registerBasename(env),
    registerBasemail(env),
  ])

  const basename = basenameResult.status === 'fulfilled'
    ? basenameResult.value
    : { status: 'error' as const, detail: `Promise rejected: ${basenameResult.reason}` }

  const basemail = basemailResult.status === 'fulfilled'
    ? basemailResult.value
    : { status: 'error' as const, detail: `Promise rejected: ${basemailResult.reason}` }

  console.log(`[register-identity] Basename: ${basename.status} — ${basename.detail}`)
  console.log(`[register-identity] BaseMail: ${basemail.status} — ${basemail.detail}`)

  return json({
    wallet: address,
    basename,
    basemail,
  })
}
