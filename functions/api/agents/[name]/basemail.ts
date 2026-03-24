/**
 * PUT /api/agents/:name/basemail — Link BaseMail identity to agent
 *
 * Two paths:
 * - Path 1: Agent provides basemail_handle → fetch ERC-8004 registration
 * - Path 2: Agent provides wallet_address (or uses existing) → reverse-lookup BaseMail
 *
 * Both BaseMail APIs are public, no auth needed.
 * Graceful fallback: if API is down, use cached data if available.
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../community/_helpers'

const BASEMAIL_API = 'https://api.basemail.ai'
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

interface LinkBody {
  basemail_handle?: string
  wallet_address?: string
}

interface ERC8004Registration {
  handle?: string
  email?: string
  wallet?: string
  erc8004_url?: string
  registered?: boolean
  [key: string]: unknown
}

interface WalletCheckResponse {
  handle?: string
  email?: string
  registered?: boolean
  [key: string]: unknown
}

async function fetchBasemailByHandle(handle: string): Promise<ERC8004Registration | null> {
  try {
    const res = await fetch(`${BASEMAIL_API}/api/agent/${encodeURIComponent(handle)}/registration.json`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    return (await res.json()) as ERC8004Registration
  } catch {
    return null
  }
}

async function fetchBasemailByWallet(address: string): Promise<WalletCheckResponse | null> {
  try {
    const res = await fetch(`${BASEMAIL_API}/api/register/check/${encodeURIComponent(address)}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    return (await res.json()) as WalletCheckResponse
  } catch {
    return null
  }
}

export const onRequestPut: PagesFunction<Env> = async ({ env, params, request }) => {
  const name = params.name as string

  // Extract Bearer token
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authorization: Bearer {apiKey} required', 401)
  }
  const apiKey = authHeader.slice(7)

  // Verify agent exists and API key matches
  const agent = await env.DB.prepare(
    'SELECT name, api_key, wallet_address, erc8004_url, basemail_handle, basemail_cached_at FROM agents WHERE name = ?1'
  )
    .bind(name)
    .first()

  if (!agent) return errorResponse('Agent not found', 404)
  if (!agent.api_key || agent.api_key !== apiKey) return errorResponse('Invalid API key', 403)

  const body = await parseBody<LinkBody>(request)
  if (!body) return errorResponse('Invalid request body', 400)

  const handle = body.basemail_handle
  const wallet = body.wallet_address || (agent.wallet_address as string | null)

  if (!handle && !wallet) {
    return errorResponse('Provide basemail_handle or wallet_address (or set wallet on your agent profile first)', 400)
  }

  let resolvedHandle: string | null = null
  let resolvedErc8004Url: string | null = null
  let apiReachable = true

  // Path 1: Lookup by handle
  if (handle) {
    const data = await fetchBasemailByHandle(handle)
    if (data) {
      resolvedHandle = data.handle || handle
      resolvedErc8004Url = data.erc8004_url || null
    } else {
      apiReachable = false
    }
  }

  // Path 2: Lookup by wallet (if handle didn't resolve or wasn't provided)
  if (!resolvedHandle && wallet) {
    const data = await fetchBasemailByWallet(wallet)
    if (data) {
      if (data.registered && data.handle) {
        resolvedHandle = data.handle
      }
    } else {
      apiReachable = false
    }
  }

  // Graceful fallback: if API is down but we have cached data, use it
  if (!resolvedHandle && !apiReachable) {
    const cachedHandle = agent.basemail_handle as string | null
    const cachedAt = agent.basemail_cached_at as string | null
    if (cachedHandle && cachedAt) {
      const cacheAge = Date.now() - new Date(cachedAt).getTime()
      if (cacheAge < CACHE_MAX_AGE_MS) {
        return json({
          name,
          basemail_handle: cachedHandle,
          erc8004_url: agent.erc8004_url || null,
          source: 'cache',
          cached_at: cachedAt,
          message: 'BaseMail API unreachable. Returning cached identity data.',
        })
      }
    }
    return errorResponse('BaseMail API unreachable and no cached data available. Try again later.', 503)
  }

  if (!resolvedHandle) {
    return json({
      name,
      found: false,
      message: handle
        ? `No BaseMail registration found for handle "${handle}".`
        : `No BaseMail registration found for wallet "${wallet}".`,
    }, 404)
  }

  // Store in DB
  const now = new Date().toISOString()
  const updates: string[] = [
    'basemail_handle = ?1',
    'basemail_cached_at = ?2',
    'updated_at = datetime(\'now\')',
  ]
  const values: unknown[] = [resolvedHandle, now]
  let paramIdx = 3

  if (resolvedErc8004Url) {
    updates.push(`erc8004_url = ?${paramIdx}`)
    values.push(resolvedErc8004Url)
    paramIdx++
  }

  // If wallet was provided in body, store it too
  if (body.wallet_address && body.wallet_address !== agent.wallet_address) {
    updates.push(`wallet_address = ?${paramIdx}`)
    values.push(body.wallet_address)
    paramIdx++
  }

  values.push(name)
  await env.DB.prepare(
    `UPDATE agents SET ${updates.join(', ')} WHERE name = ?${paramIdx}`
  )
    .bind(...values)
    .run()

  return json({
    name,
    basemail_handle: resolvedHandle,
    basemail_email: `${resolvedHandle}@basemail.ai`,
    erc8004_url: resolvedErc8004Url || agent.erc8004_url || null,
    source: 'api',
    cached_at: now,
    badge: '📬',
    message: `BaseMail identity linked: ${resolvedHandle}@basemail.ai`,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
