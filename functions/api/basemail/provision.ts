/**
 * POST /api/basemail/provision
 *
 * Path B: After World ID verification, auto-provision a BaseMail account.
 * World ID verified → call BaseMail provision API → create {username}@basemail.ai
 *
 * Body: { username }
 * Auth: X-Edit-Token header
 *
 * Flow:
 *   1. Validate user + edit token
 *   2. Confirm user is World ID verified
 *   3. Call BaseMail auto-provision API
 *   4. Store basemail_handle in world_id_verifications
 *   5. Return handle to frontend
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'

const DEFAULT_BASEMAIL_API = 'https://api.basemail.me'

interface ProvisionBody {
  username: string
}

interface BaseMailProvisionResponse {
  ok?: boolean
  handle?: string
  email?: string
  message?: string
  error?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const editToken = request.headers.get('X-Edit-Token')
  if (!editToken) {
    return errorResponse('Authentication required', 401)
  }

  const body = await parseBody<ProvisionBody>(request)
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

  // Must be World ID verified to provision BaseMail
  if (user.verification_level !== 'worldid') {
    return errorResponse('World ID verification required before BaseMail provisioning', 400)
  }

  // Check if already has a BaseMail handle
  const existing = await env.DB.prepare(
    'SELECT basemail_handle FROM world_id_verifications WHERE username = ?1 AND basemail_handle IS NOT NULL LIMIT 1'
  ).bind(username).first<{ basemail_handle: string }>()

  if (existing?.basemail_handle) {
    return json({
      ok: true,
      already_provisioned: true,
      basemail_handle: existing.basemail_handle,
      message: 'BaseMail account already provisioned',
    })
  }

  // Call BaseMail auto-provision API
  const baseMailUrl = env.BASEMAIL_API_URL || DEFAULT_BASEMAIL_API
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  if (env.BASEMAIL_API_KEY) {
    headers['Authorization'] = `Bearer ${env.BASEMAIL_API_KEY}`
  }

  let provisionData: BaseMailProvisionResponse

  try {
    const res = await fetch(`${baseMailUrl}/v1/provision`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username,
        wallet_address: user.wallet_address || undefined,
        verification_source: 'worldid',
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const errBody = await res.text()
      return json({
        ok: false,
        message: `BaseMail provision API returned ${res.status}: ${errBody}`,
      })
    }

    provisionData = (await res.json()) as BaseMailProvisionResponse
  } catch (err) {
    return json({
      ok: false,
      message: `BaseMail API unreachable: ${err instanceof Error ? err.message : 'unknown error'}`,
    })
  }

  if (!provisionData.ok && !provisionData.handle && !provisionData.email) {
    return json({
      ok: false,
      message: provisionData.message || provisionData.error || 'BaseMail provisioning failed',
    })
  }

  const basemailHandle = provisionData.handle || provisionData.email || `${username}@basemail.ai`
  const now = new Date().toISOString()

  // Update the world_id_verifications record with the basemail handle
  await env.DB.prepare(
    'UPDATE world_id_verifications SET basemail_handle = ?1 WHERE username = ?2'
  ).bind(basemailHandle, username).run()

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata, created_at)
     VALUES ('user', ?1, 'basemail_provisioned', ?2, ?3)`
  ).bind(
    username,
    JSON.stringify({
      basemail_handle: basemailHandle,
      wallet: user.wallet_address,
      source: 'worldid_path_b',
    }),
    now,
  ).run()

  return json({
    ok: true,
    basemail_handle: basemailHandle,
    message: `BaseMail account provisioned: ${basemailHandle}`,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
