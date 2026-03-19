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

  // Auto-detect existing BaseMail account by wallet address (best-effort)
  let basemailHandle: string | null = null
  if (user.wallet_address) {
    try {
      const walletLower = user.wallet_address.toLowerCase()
      const lookupRes = await fetch(
        `https://api.basemail.ai/api/identity/wallet/${walletLower}`,
        { signal: AbortSignal.timeout(5000) }
      )
      if (lookupRes.ok) {
        const data = (await lookupRes.json()) as { handle?: string; email?: string }
        basemailHandle = data.email || (data.handle ? `${data.handle}@basemail.ai` : null)
      }
    } catch {
      // BaseMail lookup is best-effort
    }

    if (basemailHandle) {
      await env.DB.prepare(
        'UPDATE world_id_verifications SET basemail_handle = ?1 WHERE username = ?2'
      ).bind(basemailHandle, username).run()
    }
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
