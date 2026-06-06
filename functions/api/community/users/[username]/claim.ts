/**
 * POST /api/community/users/:username/claim — Claim an unclaimed profile
 *
 * Body: { walletAddress, verificationLevel }
 * Returns: { username, editToken, claimed: true }
 */
import { type Env, json, errorResponse, handleOptions, parseBody, generateEditToken } from '../../_helpers'
import { verifyPrivyToken } from '../../../_auth'

interface ClaimBody {
  walletAddress?: string
  // NOTE: a client-supplied verificationLevel is intentionally IGNORED. The
  // level is derived server-side from the verified identity (see below) so a
  // caller can never award itself a fraudulent trust badge.
  verificationLevel?: 'worldid' | 'wallet' | 'github' | 'email'
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const username = params.username as string

  // ── AUTH: require a cryptographically-verified Privy JWT ──
  // Claiming a profile assigns ownership + issues an edit token, so it must
  // prove a real signed-in identity. A brand-new Privy user has no users row
  // yet, so we verify the JWT directly (not via authenticateRequest).
  const identity = await verifyPrivyToken(request, env.PRIVY_APP_ID)
  if (!identity) {
    return errorResponse('Sign in required to claim a profile', 401)
  }

  const body = (await parseBody<ClaimBody>(request)) || {}

  // Check user exists and is unclaimed
  const user = await env.DB.prepare(
    'SELECT username, claimed, edit_token, wallet_address FROM users WHERE username = ?1'
  )
    .bind(username)
    .first<{ username: string; claimed: number; edit_token: string | null; wallet_address: string | null }>()

  if (!user) {
    return errorResponse('User not found', 404)
  }

  if (user.claimed === 1) {
    return errorResponse('Profile already claimed', 409)
  }

  // One Privy identity ↔ one profile. If this identity already owns a different
  // profile, block the claim (a partial UNIQUE index on privy_user_id would
  // otherwise make the UPDATE fail with an opaque 500).
  const alreadyLinked = await env.DB.prepare(
    'SELECT username FROM users WHERE privy_user_id = ?1'
  ).bind(identity.privyUserId).first<{ username: string }>()
  if (alreadyLinked && alreadyLinked.username.toLowerCase() !== username.toLowerCase()) {
    return errorResponse(`Your account is already linked to profile "${alreadyLinked.username}". Sign out of it before claiming another.`, 409)
  }

  // Claimer's wallet hint (their Privy-linked wallet). Used to (a) gate claiming
  // a wallet-keyed profile and (b) derive the trust level — never trusted for
  // the verification level directly.
  const rawWallet = (body.walletAddress || '').trim()
  const claimWallet = /^0x[a-fA-F0-9]{40}$/.test(rawWallet) ? rawWallet : null

  // If this profile was discovered/keyed by a wallet, only the controller of
  // that wallet may claim it — block taking over someone else's wallet profile.
  if (user.wallet_address) {
    if (!claimWallet || claimWallet.toLowerCase() !== user.wallet_address.toLowerCase()) {
      return errorResponse('This profile is linked to a different wallet. Sign in with that wallet to claim it.', 403)
    }
  }

  // Derive verification level from server-side signals (NOT the request body).
  const effectiveWallet = user.wallet_address || claimWallet
  let verificationLevel: 'worldid' | 'wallet' | 'email' = effectiveWallet ? 'wallet' : 'email'

  // Generate new edit token for the claimer
  const editToken = generateEditToken()
  const now = new Date().toISOString()

  // Claim the profile: bind it to the verified Privy identity + new edit token.
  await env.DB.prepare(
    `UPDATE users
        SET claimed = 1, claimed_at = ?1, verification_level = ?2, edit_token = ?3,
            source = 'registered', privy_user_id = ?4,
            wallet_address = COALESCE(?5, wallet_address)
      WHERE username = ?6`
  )
    .bind(now, verificationLevel, editToken, identity.privyUserId, effectiveWallet, username)
    .run()

  // Log the claim activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata, created_at)
     VALUES ('user', ?1, 'claimed', ?2, ?3)`
  )
    .bind(username, JSON.stringify({ verificationLevel, method: 'privy-jwt' }), now)
    .run()

  // Path A: If claiming with a wallet, check BaseMail for existing human verification
  if (effectiveWallet && verificationLevel !== 'worldid') {
    try {
      const baseMailUrl = env.BASEMAIL_API_URL || 'https://api.basemail.me'
      const bmRes = await fetch(
        `${baseMailUrl}/v1/status-by-wallet?address=${encodeURIComponent(effectiveWallet)}`,
        { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) }
      )
      if (bmRes.ok) {
        const bmData = (await bmRes.json()) as { is_human?: boolean; handle?: string }
        if (bmData.is_human) {
          // Auto-upgrade to worldid level
          await env.DB.prepare(`
            INSERT INTO world_id_verifications
              (username, wallet, nullifier_hash, verification_level, world_id_version, basemail_handle, verified_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
          `).bind(
            username, effectiveWallet, `basemail:${effectiveWallet.toLowerCase()}`,
            'basemail', 'basemail-v1', bmData.handle || null, now
          ).run()
          verificationLevel = 'worldid'
          await env.DB.prepare(
            'UPDATE users SET verification_level = ?1 WHERE username = ?2'
          ).bind('worldid', username).run()
        }
      }
    } catch {
      // BaseMail check is best-effort — don't block claim
    }
  }

  return json({ username, editToken, claimed: true }, 200)
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
