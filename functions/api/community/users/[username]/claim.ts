/**
 * POST /api/community/users/:username/claim — Claim an unclaimed profile
 *
 * Body: { walletAddress, verificationLevel }
 * Returns: { username, editToken, claimed: true }
 */
import { type Env, json, errorResponse, handleOptions, parseBody, generateEditToken } from '../../_helpers'

interface ClaimBody {
  walletAddress?: string
  verificationLevel?: 'worldid' | 'wallet' | 'github' | 'email'
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const username = params.username as string

  const body = await parseBody<ClaimBody>(request)
  if (!body) {
    return errorResponse('Invalid request body', 400)
  }

  // Check user exists and is unclaimed
  const user = await env.DB.prepare(
    'SELECT username, claimed, edit_token FROM users WHERE username = ?1'
  )
    .bind(username)
    .first()

  if (!user) {
    return errorResponse('User not found', 404)
  }

  if (user.claimed === 1) {
    return errorResponse('Profile already claimed', 409)
  }

  // Determine verification level
  const verificationLevel = body.verificationLevel || 'email'
  const validLevels = ['worldid', 'wallet', 'github', 'email']
  if (!validLevels.includes(verificationLevel)) {
    return errorResponse('Invalid verification level. Must be: worldid, wallet, github, or email', 400)
  }

  // Generate new edit token for the claimer
  const editToken = generateEditToken()
  const now = new Date().toISOString()

  // Update the profile as claimed
  const updates = [
    'claimed = 1',
    'claimed_at = ?1',
    'verification_level = ?2',
    'edit_token = ?3',
    'source = ?4',
  ]
  const values: unknown[] = [now, verificationLevel, editToken, 'registered']

  // Optionally update wallet address if provided
  if (body.walletAddress) {
    updates.push('wallet_address = ?5')
    values.push(body.walletAddress)
    values.push(username) // WHERE param
    await env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE username = ?6`
    )
      .bind(...values)
      .run()
  } else {
    values.push(username) // WHERE param
    await env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE username = ?5`
    )
      .bind(...values)
      .run()
  }

  // Log the claim activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata, created_at)
     VALUES ('user', ?1, 'claimed', ?2, ?3)`
  )
    .bind(username, JSON.stringify({ verificationLevel }), now)
    .run()

  // Path A: If claiming with a wallet, check BaseMail for existing human verification
  const claimWallet = body.walletAddress
  if (claimWallet && verificationLevel !== 'worldid') {
    try {
      const baseMailUrl = env.BASEMAIL_API_URL || 'https://api.basemail.me'
      const bmRes = await fetch(
        `${baseMailUrl}/v1/status-by-wallet?address=${encodeURIComponent(claimWallet)}`,
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
            username, claimWallet, `basemail:${claimWallet.toLowerCase()}`,
            'basemail', 'basemail-v1', bmData.handle || null, now
          ).run()
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
