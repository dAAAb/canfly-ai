/**
 * POST /api/world-id/rp-signature
 * Generate RP signature for IDKit v4. Requires edit token auth.
 * Returns: { sig, nonce, created_at, expires_at }
 */
import { type Env, json, errorResponse, handleOptions, CORS_HEADERS } from '../community/_helpers'
import { signRpRequest } from './_rp-sign'

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  // Auth: require X-Edit-Token header (user must be logged in / have claimed profile)
  const editToken = request.headers.get('X-Edit-Token')
  if (!editToken) {
    return errorResponse('Authentication required', 401)
  }

  const SIGNING_KEY = env.WORLD_ID_SIGNING_KEY
  if (!SIGNING_KEY) {
    return errorResponse('World ID signing key not configured', 500)
  }

  const { sig, nonce, createdAt, expiresAt } = await signRpRequest(SIGNING_KEY)

  return json({
    sig,
    nonce,
    created_at: createdAt,
    expires_at: expiresAt,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
