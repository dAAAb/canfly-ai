/**
 * GET /api/tasks/:id/files/:filename — Download file from R2 (CAN-299)
 *
 * Serves files uploaded via POST /api/tasks/:id/upload.
 * Searches both upload/ and result/ prefixes in R2.
 *
 * Auth:
 *   - HMAC view token (?token=)
 *   - X-Buyer-Wallet header matching task buyer
 *   - Bearer token matching seller or buyer agent API key
 *
 * Response:
 *   - Content-Type from R2 metadata
 *   - Content-Disposition: attachment (forced download, XSS prevention)
 *   - Cache-Control: public, max-age=86400
 */
import { type Env, errorResponse, handleOptions, CORS_HEADERS } from '../../../community/_helpers'
import { deriveViewToken } from '../../../_crypto'

async function authenticateDownload(
  request: Request,
  env: Env,
  taskId: string,
  task: { seller_agent: string; buyer_agent: string | null; buyer_wallet: string | null },
): Promise<boolean> {
  const url = new URL(request.url)
  const viewToken = url.searchParams.get('token')

  // 1. HMAC view token
  if (viewToken && env.ENCRYPTION_KEY) {
    const expected = await deriveViewToken(taskId, env.ENCRYPTION_KEY)
    if (viewToken === expected) return true
  }

  // 2. Bearer token → seller or buyer agent
  const authHeader = request.headers.get('Authorization')
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (bearerKey) {
    const seller = await env.DB.prepare(
      'SELECT api_key FROM agents WHERE name = ?1'
    ).bind(task.seller_agent).first()
    if (seller?.api_key && seller.api_key === bearerKey) return true

    if (task.buyer_agent) {
      const buyer = await env.DB.prepare(
        'SELECT api_key FROM agents WHERE name = ?1'
      ).bind(task.buyer_agent).first()
      if (buyer?.api_key && buyer.api_key === bearerKey) return true
    }
  }

  // 3. Buyer wallet header
  const walletHeader = request.headers.get('X-Buyer-Wallet') || request.headers.get('X-Wallet-Address')
  if (
    walletHeader &&
    task.buyer_wallet &&
    walletHeader.toLowerCase() === (task.buyer_wallet as string).toLowerCase()
  ) {
    return true
  }

  return false
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const taskId = params.id as string
  const filename = params.filename as string

  if (!taskId || !filename) return errorResponse('Task ID and filename required', 400)

  // Sanitize filename to prevent path traversal
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  if (safeName !== filename || filename.includes('..')) {
    return errorResponse('Invalid filename', 400)
  }

  // Fetch task
  const task = await env.DB.prepare(
    `SELECT id, seller_agent, buyer_agent, buyer_wallet
     FROM tasks WHERE id = ?1`
  ).bind(taskId).first()

  if (!task) return errorResponse('Task not found', 404)

  // Auth
  const authorized = await authenticateDownload(request, env, taskId, {
    seller_agent: task.seller_agent as string,
    buyer_agent: task.buyer_agent as string | null,
    buyer_wallet: task.buyer_wallet as string | null,
  })

  if (!authorized) return errorResponse('Forbidden', 403)

  // Try both upload/ and result/ prefixes
  let obj: R2ObjectBody | null = null
  for (const category of ['upload', 'result']) {
    const r2Key = `tasks/${taskId}/${category}/${filename}`
    obj = await env.TASK_RESULTS.get(r2Key)
    if (obj) break
  }

  if (!obj) return errorResponse('File not found', 404)

  const contentType = obj.httpMetadata?.contentType || 'application/octet-stream'

  return new Response(obj.body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': obj.size.toString(),
    },
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
