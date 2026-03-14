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

  return json({ username, editToken, claimed: true }, 200)
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
