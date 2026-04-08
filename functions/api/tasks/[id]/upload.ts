/**
 * POST /api/tasks/:id/upload — Upload file to R2 for a task (CAN-299)
 *
 * Solves the CF Pages body limit (502 on large files) by providing
 * a dedicated upload endpoint that writes directly to R2.
 *
 * Auth:
 *   - Buyer: HMAC view token (?token=), X-Buyer-Wallet, or buyer agent API key
 *   - Seller: Bearer {agent-api-key}
 *
 * Body: multipart/form-data with field "file"
 * Query: ?token={viewToken}&role=upload|result (default: upload)
 *
 * Limits:
 *   - 50MB per file
 *   - 5 files per task
 *   - MIME whitelist enforced
 *
 * R2 key format: tasks/{taskId}/{upload|result}/{filename}
 * Returns: { url, size, content_type }
 */
import { type Env, json, errorResponse, handleOptions, CORS_HEADERS } from '../../community/_helpers'
import { deriveViewToken } from '../../_crypto'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_FILES_PER_TASK = 5

const ALLOWED_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Video
  'video/mp4', 'video/webm', 'video/quicktime',
  // Audio
  'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
  // 3D
  'model/gltf-binary', 'model/gltf+json',
  // Documents
  'application/pdf', 'text/markdown',
  // Data
  'application/json',
])

type AuthRole = 'buyer' | 'seller' | null

async function authenticateUpload(
  request: Request,
  env: Env,
  taskId: string,
  task: { seller_agent: string; buyer_agent: string | null; buyer_wallet: string | null },
): Promise<AuthRole> {
  const url = new URL(request.url)
  const viewToken = url.searchParams.get('token')

  // 1. HMAC view token → buyer
  if (viewToken && env.ENCRYPTION_KEY) {
    const expected = await deriveViewToken(taskId, env.ENCRYPTION_KEY)
    if (viewToken === expected) return 'buyer'
  }

  // 2. Bearer token → seller or buyer agent
  const authHeader = request.headers.get('Authorization')
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (bearerKey) {
    // Check seller
    const seller = await env.DB.prepare(
      'SELECT api_key FROM agents WHERE name = ?1'
    ).bind(task.seller_agent).first()
    if (seller?.api_key && seller.api_key === bearerKey) return 'seller'

    // Check buyer agent
    if (task.buyer_agent) {
      const buyer = await env.DB.prepare(
        'SELECT api_key FROM agents WHERE name = ?1'
      ).bind(task.buyer_agent).first()
      if (buyer?.api_key && buyer.api_key === bearerKey) return 'buyer'
    }
  }

  // 3. X-Buyer-Wallet header → buyer
  const walletHeader = request.headers.get('X-Buyer-Wallet') || request.headers.get('X-Wallet-Address')
  if (
    walletHeader &&
    task.buyer_wallet &&
    walletHeader.toLowerCase() === (task.buyer_wallet as string).toLowerCase()
  ) {
    return 'buyer'
  }

  return null
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  try {
  const taskId = params.id as string
  if (!taskId) return errorResponse('Task ID required', 400)

  // Fetch task
  const task = await env.DB.prepare(
    `SELECT id, seller_agent, buyer_agent, buyer_wallet, status
     FROM tasks WHERE id = ?1`
  ).bind(taskId).first()

  if (!task) return errorResponse('Task not found', 404)

  // Auth
  const role = await authenticateUpload(request, env, taskId, {
    seller_agent: task.seller_agent as string,
    buyer_agent: task.buyer_agent as string | null,
    buyer_wallet: task.buyer_wallet as string | null,
  })

  if (!role) return errorResponse('Forbidden', 403)

  // Determine upload category from query param
  const url = new URL(request.url)
  const category = url.searchParams.get('role') === 'result' ? 'result' : 'upload'

  // Only seller can upload results
  if (category === 'result' && role !== 'seller') {
    return errorResponse('Only the seller agent can upload result files', 403)
  }

  // Check file count limit: list existing files in this task's prefix
  const prefix = `tasks/${taskId}/`
  const existing = await env.TASK_RESULTS.list({ prefix, limit: MAX_FILES_PER_TASK + 1 })
  if (existing.objects.length >= MAX_FILES_PER_TASK) {
    return errorResponse(`File limit reached: maximum ${MAX_FILES_PER_TASK} files per task`, 400)
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

  // Validate MIME type
  if (!ALLOWED_TYPES.has(file.type)) {
    return errorResponse(
      `File type "${file.type}" not allowed. Accepted: ${[...ALLOWED_TYPES].join(', ')}`,
      400,
    )
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return errorResponse(
      `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 50MB`,
      400,
    )
  }

  // Sanitize filename: keep alphanumeric, dots, hyphens, underscores
  const rawName = file.name || `file-${Date.now()}`
  const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 128)
  const filename = safeName || `file-${Date.now()}`

  // R2 key: tasks/{taskId}/{upload|result}/{filename}
  const r2Key = `tasks/${taskId}/${category}/${filename}`

  // Upload to R2
  const arrayBuffer = await file.arrayBuffer()
  await env.TASK_RESULTS.put(r2Key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type,
      contentDisposition: `attachment; filename="${filename}"`,
    },
    customMetadata: {
      taskId,
      category,
      uploadedBy: role,
      uploadedAt: new Date().toISOString(),
    },
  })

  return json({
    url: `/api/tasks/${taskId}/files/${filename}`,
    size: file.size,
    content_type: file.type,
    category,
    filename,
  })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    return json({ error: 'Internal upload error', message, stack }, 500)
  }
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
