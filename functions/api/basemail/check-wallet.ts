/**
 * POST /api/basemail/check-wallet
 *
 * Path A: If a wallet is already verified as human on BaseMail,
 * skip World ID face scan and auto-upgrade verification_level to 'worldid'.
 *
 * Body: { username }
 * Auth: X-Edit-Token header
 *
 * Flow:
 *   1. Validate user + edit token
 *   2. Call BaseMail status-by-wallet API
 *   3. If is_human=true → insert world_id_verifications + upgrade user
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'

const DEFAULT_BASEMAIL_API = 'https://api.basemail.me'

interface CheckWalletBody {
  username: string
}

interface BaseMailStatus {
  is_human?: boolean
  handle?: string
  wallet?: string
  verification_source?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const editToken = request.headers.get('X-Edit-Token')
  if (!editToken) {
    return errorResponse('Authentication required', 401)
  }

  const body = await parseBody<CheckWalletBody>(request)
  if (!body || !body.username) {
    return errorResponse('Missing username', 400)
  }

  const { username } = body

  // Verify the edit token matches this user
  const user = await env.DB.prepare(
    'SELECT username, edit_token, wallet_address, verification_level FROM users WHERE username = ?1'
  ).bind(username).first<{
    username: string
    edit_token: string
    wallet_address: string | null
    verification_level: string | null
  }>()

  if (!user || user.edit_token !== editToken) {
    return errorResponse('Invalid edit token', 403)
  }

  if (!user.wallet_address) {
    return errorResponse('User has no wallet address', 400)
  }

  // Already at worldid level — no need to re-check
  if (user.verification_level === 'worldid') {
    return json({ ok: true, already_verified: true, message: 'Already verified at worldid level' })
  }

  // Check if already verified via world_id_verifications table
  const existingVerification = await env.DB.prepare(
    'SELECT id FROM world_id_verifications WHERE username = ?1 LIMIT 1'
  ).bind(username).first()

  if (existingVerification) {
    return json({ ok: true, already_verified: true, message: 'Already has verification record' })
  }

  // Call BaseMail status-by-wallet API
  const baseMailUrl = env.BASEMAIL_API_URL || DEFAULT_BASEMAIL_API
  let baseMailData: BaseMailStatus

  try {
    const res = await fetch(
      `${baseMailUrl}/v1/status-by-wallet?address=${encodeURIComponent(user.wallet_address)}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!res.ok) {
      return json({
        ok: false,
        is_human: false,
        message: `BaseMail API returned ${res.status}`,
      })
    }

    baseMailData = (await res.json()) as BaseMailStatus
  } catch (err) {
    return json({
      ok: false,
      is_human: false,
      message: `BaseMail API unreachable: ${err instanceof Error ? err.message : 'unknown error'}`,
    })
  }

  if (!baseMailData.is_human) {
    return json({
      ok: true,
      is_human: false,
      message: 'Wallet not verified as human on BaseMail',
    })
  }

  // BaseMail says is_human=true → auto-upgrade
  const now = new Date().toISOString()

  // Store verification record (source: basemail)
  await env.DB.prepare(`
    INSERT INTO world_id_verifications
      (username, wallet, nullifier_hash, verification_level, world_id_version, basemail_handle, verified_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
  `).bind(
    username,
    user.wallet_address,
    `basemail:${user.wallet_address.toLowerCase()}`,  // unique key per wallet
    'basemail',
    'basemail-v1',
    baseMailData.handle || null,
    now,
  ).run()

  // Upgrade user's verification_level to 'worldid' (highest trust)
  await env.DB.prepare(
    'UPDATE users SET verification_level = ?1, updated_at = ?2 WHERE username = ?3'
  ).bind('worldid', now, username).run()

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata, created_at)
     VALUES ('user', ?1, 'basemail_verified', ?2, ?3)`
  ).bind(
    username,
    JSON.stringify({
      wallet: user.wallet_address,
      basemail_handle: baseMailData.handle || null,
    }),
    now,
  ).run()

  return json({
    ok: true,
    is_human: true,
    verification_level: 'basemail',
    basemail_handle: baseMailData.handle || null,
    message: 'BaseMail-verified human! Upgraded to worldid level.',
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
