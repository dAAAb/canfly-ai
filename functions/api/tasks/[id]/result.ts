/**
 * PATCH /api/tasks/:id/result — Buyer fills in result after completion (CAN-299)
 *
 * When the seller completes a task without including results (e.g. delivered
 * directly via ngrok), the buyer can retroactively attach result_url / result_note.
 *
 * Auth: Buyer only (HMAC view token, X-Buyer-Wallet, or buyer agent API key)
 * Conditions: Task must be in status=completed
 *
 * Body: { result_url?: string, result_note?: string }
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../community/_helpers'
import { deriveViewToken } from '../../_crypto'

interface ResultPatchBody {
  result_url?: string
  result_note?: string
}

function isValidHttpUrl(s: string): boolean {
  try {
    const url = new URL(s)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

async function authenticateBuyer(
  request: Request,
  env: Env,
  taskId: string,
  task: { buyer_agent: string | null; buyer_wallet: string | null },
): Promise<boolean> {
  const url = new URL(request.url)
  const viewToken = url.searchParams.get('token')

  // 1. HMAC view token
  if (viewToken && env.ENCRYPTION_KEY) {
    const expected = await deriveViewToken(taskId, env.ENCRYPTION_KEY)
    if (viewToken === expected) return true
  }

  // 2. Buyer agent API key
  const authHeader = request.headers.get('Authorization')
  const bearerKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (bearerKey && task.buyer_agent) {
    const buyer = await env.DB.prepare(
      'SELECT api_key FROM agents WHERE name = ?1'
    ).bind(task.buyer_agent).first()
    if (buyer?.api_key && buyer.api_key === bearerKey) return true
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

export const onRequestPatch: PagesFunction<Env> = async ({ env, params, request }) => {
  const taskId = params.id as string
  if (!taskId) return errorResponse('Task ID required', 400)

  // Fetch task
  const task = await env.DB.prepare(
    `SELECT id, status, buyer_agent, buyer_wallet, result_url, result_note
     FROM tasks WHERE id = ?1`
  ).bind(taskId).first()

  if (!task) return errorResponse('Task not found', 404)

  // Must be completed
  if (task.status !== 'completed') {
    return errorResponse(
      `Can only patch result on completed tasks. Current status: "${task.status}"`,
      400,
    )
  }

  // Buyer-only auth
  const authorized = await authenticateBuyer(request, env, taskId, {
    buyer_agent: task.buyer_agent as string | null,
    buyer_wallet: task.buyer_wallet as string | null,
  })

  if (!authorized) return errorResponse('Forbidden — only the buyer can patch results', 403)

  const body = await parseBody<ResultPatchBody>(request)
  if (!body) return errorResponse('Invalid request body', 400)

  if (!body.result_url && !body.result_note) {
    return errorResponse('At least one of result_url or result_note is required', 400)
  }

  // Validate URL
  if (body.result_url && !isValidHttpUrl(body.result_url)) {
    return errorResponse('result_url must be a valid http/https URL', 400)
  }

  // Build update
  const updates: string[] = []
  const values: (string | null)[] = []
  let paramIdx = 1

  if (body.result_url) {
    updates.push(`result_url = ?${paramIdx}`)
    values.push(body.result_url)
    paramIdx++
  }

  if (body.result_note) {
    updates.push(`result_note = ?${paramIdx}`)
    values.push(body.result_note)
    paramIdx++
  }

  // Task ID for WHERE clause
  values.push(taskId)

  await env.DB.prepare(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?${paramIdx}`
  ).bind(...values).run()

  return json({
    id: taskId,
    result_url: body.result_url || task.result_url,
    result_note: body.result_note || task.result_note,
    message: 'Result updated successfully',
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
