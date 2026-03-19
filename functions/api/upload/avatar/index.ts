/**
 * POST /api/upload/avatar — Upload avatar image
 *
 * Auth: one of:
 *   - Authorization: Bearer {agent-api-key}  (agent upload)
 *   - X-Edit-Token: {user-edit-token} + X-Username: {username}  (user upload via web)
 *   - X-Wallet-Address: {address}  (user upload via wallet login)
 *
 * Body: multipart/form-data with field "file" (image)
 * Optional query: ?for=agent:{name} or ?for=user:{username}
 *
 * Returns: { url, key }
 *
 * Max size: 5MB. Accepted: jpg, jpeg, png, gif, webp.
 */
import { type Env, json, errorResponse, handleOptions, CORS_HEADERS } from '../../community/_helpers'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

// Public R2 URL base (using CF Pages custom domain + R2 public access)
// We'll serve via a redirect endpoint instead
const AVATAR_PATH_PREFIX = '/api/upload/avatar/'

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  // Parse auth
  const authHeader = request.headers.get('Authorization')
  const editToken = request.headers.get('X-Edit-Token')
  const walletHeader = request.headers.get('X-Wallet-Address')
  const usernameHeader = request.headers.get('X-Username')

  let entityType: 'agent' | 'user' = 'agent'
  let entityId: string | null = null

  // Check URL params for target
  const url = new URL(request.url)
  const forParam = url.searchParams.get('for') // e.g. "agent:daab-claw" or "user:dAAAb"
  if (forParam) {
    const [type, id] = forParam.split(':')
    if (type === 'agent' || type === 'user') {
      entityType = type
      entityId = id
    }
  }

  // ── Agent auth via Bearer token ──
  if (authHeader?.startsWith('Bearer ')) {
    const apiKey = authHeader.slice(7)
    // If no explicit target, find agent by API key
    const agent = await env.DB.prepare(
      'SELECT name FROM agents WHERE api_key = ?1'
    ).bind(apiKey).first()

    if (!agent) return errorResponse('Invalid API key', 403)
    if (!entityId) {
      entityType = 'agent'
      entityId = agent.name as string
    }
    // Verify they own the target if specified
    if (entityType === 'agent' && entityId !== agent.name) {
      return errorResponse('Cannot upload avatar for another agent', 403)
    }
  }
  // ── User auth via edit token ──
  else if (editToken && usernameHeader) {
    const user = await env.DB.prepare(
      'SELECT username, edit_token FROM users WHERE username = ?1'
    ).bind(usernameHeader).first()

    if (!user || user.edit_token !== editToken) {
      return errorResponse('Invalid credentials', 403)
    }
    if (!entityId) {
      entityType = 'user'
      entityId = usernameHeader
    }
  }
  // ── User auth via wallet ──
  else if (walletHeader) {
    const user = await env.DB.prepare(
      'SELECT username, wallet_address FROM users WHERE LOWER(wallet_address) = LOWER(?1)'
    ).bind(walletHeader).first()

    if (!user) return errorResponse('No user found for this wallet', 403)
    if (!entityId) {
      entityType = 'user'
      entityId = user.username as string
    }
  } else {
    return errorResponse('Authentication required (Bearer token, X-Edit-Token + X-Username, or X-Wallet-Address)', 401)
  }

  if (!entityId) {
    return errorResponse('Could not determine upload target', 400)
  }

  // Parse multipart form
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse('Expected multipart/form-data with a "file" field', 400)
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return errorResponse('Missing "file" field in form data', 400)
  }

  // Validate type
  if (!ALLOWED_TYPES.has(file.type)) {
    return errorResponse(`Invalid file type: ${file.type}. Accepted: jpg, png, gif, webp`, 400)
  }

  // Validate size
  if (file.size > MAX_SIZE) {
    return errorResponse(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB`, 400)
  }

  // Generate key
  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const timestamp = Date.now()
  const key = `${entityType}/${entityId}/${timestamp}.${ext}`

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer()
  await env.AVATARS.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
    },
    customMetadata: {
      entityType,
      entityId,
      uploadedAt: new Date().toISOString(),
    },
  })

  // Build public URL
  const avatarUrl = `${url.origin}${AVATAR_PATH_PREFIX}${key}`

  // Auto-update the entity's avatar_url in DB
  if (entityType === 'agent') {
    await env.DB.prepare(
      "UPDATE agents SET avatar_url = ?1, updated_at = datetime('now') WHERE name = ?2"
    ).bind(avatarUrl, entityId).run()
  } else {
    await env.DB.prepare(
      "UPDATE users SET avatar_url = ?1, updated_at = datetime('now') WHERE username = ?2"
    ).bind(avatarUrl, entityId).run()
  }

  return json({
    url: avatarUrl,
    key,
    entityType,
    entityId,
    message: `Avatar uploaded and set for ${entityType} "${entityId}"`,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
