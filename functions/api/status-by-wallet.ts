/**
 * GET /api/status-by-wallet?address=0x...
 *
 * Public endpoint — no auth required.
 * Returns verification status for a wallet address:
 *   { is_human, verification_level, basename }
 *
 * Used by external services (e.g. CanFly Path A) to check
 * whether a wallet holder has been verified on BaseMail.
 */
import { type Env, json, errorResponse, handleOptions } from './community/_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
  const address = url.searchParams.get('address')

  if (!address) {
    return errorResponse('address query parameter is required', 400)
  }

  const normalizedAddress = address.trim().toLowerCase()

  // Look up user by wallet address
  const user = await env.DB.prepare(
    `SELECT u.username, u.wallet_address, u.verification_level, u.links,
            wv.verification_level AS wv_level, wv.basemail_handle
     FROM users u
     LEFT JOIN world_id_verifications wv ON wv.username = u.username
     WHERE LOWER(u.wallet_address) = ?1
     LIMIT 1`
  ).bind(normalizedAddress).first<{
    username: string
    wallet_address: string
    verification_level: string | null
    links: string | null
    wv_level: string | null
    basemail_handle: string | null
  }>()

  if (!user) {
    return json({
      is_human: false,
      verification_level: null,
      basename: null,
    })
  }

  // Extract basename from links JSON
  let basename: string | null = null
  if (user.links) {
    try {
      const links = JSON.parse(user.links)
      basename = links.basename || null
    } catch {
      // skip malformed JSON
    }
  }

  // Use basemail_handle as fallback basename
  if (!basename && user.basemail_handle) {
    basename = user.basemail_handle
  }

  // Determine if human: verification_level is worldid or has a world_id_verifications record
  const verificationLevel = user.verification_level || user.wv_level || null
  const isHuman = verificationLevel === 'worldid' || verificationLevel === 'orb' ||
    verificationLevel === 'device' || verificationLevel === 'basemail'

  return json({
    is_human: isHuman,
    verification_level: verificationLevel,
    basename,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
