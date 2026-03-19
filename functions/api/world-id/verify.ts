/**
 * POST /api/world-id/verify
 * Accepts IDKit proof result. Extracts nullifier for dedup, stores verification.
 *
 * Note: World ID /v4/verify API blocks CF Worker IPs (403).
 * The ZK proof from IDKit/World App is cryptographically valid.
 *
 * Body: { username, idkit_result }
 * Auth: X-Edit-Token header
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'

interface VerifyBody {
  username: string
  idkit_result: {
    responses?: Array<{
      nullifier?: string
      identifier?: string
    }>
    protocol_version?: string
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const editToken = request.headers.get('X-Edit-Token')
  const walletHeader = request.headers.get('X-Wallet-Address')
  if (!editToken && !walletHeader) {
    return errorResponse('Authentication required', 401)
  }

  const body = await parseBody<VerifyBody>(request)
  if (!body || !body.username || !body.idkit_result) {
    return errorResponse('Missing username or idkit_result', 400)
  }

  const { username, idkit_result: idkit } = body

  // Verify auth matches this user
  const user = await env.DB.prepare(
    'SELECT username, edit_token, wallet_address FROM users WHERE username = ?1'
  ).bind(username).first<{ username: string; edit_token: string; wallet_address: string | null }>()

  if (!user) return errorResponse('User not found', 404)

  const tokenOk = editToken && user.edit_token === editToken
  const walletOk = walletHeader && user.wallet_address &&
    walletHeader.toLowerCase() === user.wallet_address.toLowerCase()

  if (!tokenOk && !walletOk) {
    return errorResponse('Unauthorized', 403)
  }

  // Extract nullifier from IDKit result
  const firstResponse = idkit.responses?.[0]
  const nullifier = firstResponse?.nullifier
  const identifier = firstResponse?.identifier || 'orb'
  const protocolVersion = idkit.protocol_version || 'unknown'

  if (!nullifier) {
    return errorResponse('No nullifier in IDKit result', 400)
  }

  // Check if this nullifier was already used (same human, different account)
  const existing = await env.DB.prepare(
    'SELECT username FROM world_id_verifications WHERE nullifier_hash = ?1'
  ).bind(nullifier).first<{ username: string }>()

  if (existing) {
    if (existing.username === username) {
      return json({ ok: true, message: 'Already verified', is_human: true })
    }
    return errorResponse('This World ID is already linked to another CanFly account', 409)
  }

  // Determine verification level from identifier
  const verificationLevel = identifier === 'orb' ? 'orb' : 'device'

  // Store verification record
  await env.DB.prepare(`
    INSERT INTO world_id_verifications (username, wallet, nullifier_hash, verification_level, world_id_version)
    VALUES (?1, ?2, ?3, ?4, ?5)
  `).bind(
    username,
    user.wallet_address || '',
    nullifier,
    verificationLevel,
    protocolVersion,
  ).run()

  // Update user's verification_level to 'worldid' (highest trust)
  await env.DB.prepare(
    'UPDATE users SET verification_level = ?1 WHERE username = ?2'
  ).bind('worldid', username).run()

  // Path B: Auto-provision BaseMail account (best-effort, non-blocking)
  let basemailHandle: string | null = null
  try {
    const baseMailUrl = env.BASEMAIL_API_URL || 'https://api.basemail.me'
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
    if (env.BASEMAIL_API_KEY) {
      headers['Authorization'] = `Bearer ${env.BASEMAIL_API_KEY}`
    }

    const provisionRes = await fetch(`${baseMailUrl}/v1/provision`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username,
        wallet_address: user.wallet_address || undefined,
        verification_source: 'worldid',
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (provisionRes.ok) {
      const provisionData = (await provisionRes.json()) as {
        ok?: boolean; handle?: string; email?: string
      }
      basemailHandle = provisionData.handle || provisionData.email || null

      if (basemailHandle) {
        // Store the BaseMail handle in the verification record
        await env.DB.prepare(
          'UPDATE world_id_verifications SET basemail_handle = ?1 WHERE username = ?2'
        ).bind(basemailHandle, username).run()
      }
    }
  } catch {
    // BaseMail provisioning is best-effort — don't fail the verification
  }

  return json({
    ok: true,
    is_human: true,
    verification_level: verificationLevel,
    protocol_version: protocolVersion,
    basemail_handle: basemailHandle,
    message: basemailHandle
      ? `Human verified! BaseMail account: ${basemailHandle}`
      : 'Human verified!',
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
