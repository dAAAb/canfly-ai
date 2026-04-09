/**
 * POST /api/agents/:name/tasks/:id/complete — Mark task as completed with result
 *
 * Called by the seller agent to deliver task results. Supports:
 * - Inline result_data (JSON) stored in DB
 * - File upload to R2 (result_url returned)
 * - BaseMail auto-notification for all tasks with buyer_email (CAN-267)
 *
 * CAN-209: Task completion notification + delivery
 * CAN-267: Auto BaseMail notify buyer on any task completion
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../../../community/_helpers'
import { recalcTrustScore } from '../../../_trust'
import { sendBuyerCompletionEmail } from '../../../../_email'
import { importKey, encrypt } from '../../../../../lib/crypto'
import { emitFeedEvent } from '../../../../_feed'

const BASEMAIL_API = 'https://api.basemail.ai'

/** A single file in a multi-file delivery (CAN-291) */
interface ResultFileInput {
  url: string                             // File URL or API endpoint
  type: string                            // MIME type or "api_endpoint" / "credential"
  name: string                            // Display name
  auth?: 'bearer' | 'header' | 'query'   // Auth method (credential only)
  token?: string                          // 🔐 Will be encrypted
  headers?: Record<string, string>        // 🔐 Will be encrypted
  method?: string                         // GET/POST (credential only)
  expires_at?: string                     // ISO 8601 expiry (credential only)
}

interface CompleteBody {
  result_data?: Record<string, unknown>  // JSON result payload
  result_url?: string                     // External URL (e.g. ngrok)
  resultUrl?: string                      // camelCase alias
  result_file?: string                    // Base64-encoded file to store in R2
  result_filename?: string                // Filename for R2 upload
  result_content_type?: string            // MIME type for R2 upload
  result_preview?: string                 // Preview image URL (CAN-281)
  resultPreview?: string                  // camelCase alias
  result_note?: string                    // Seller note about the result (CAN-281)
  resultNote?: string                     // camelCase alias
  result_files?: ResultFileInput[]        // Multi-file delivery (CAN-291)
  status?: 'completed' | 'failed'        // Allow marking as failed too
  error_message?: string                 // Reason if failed
}

function isValidHttpUrl(s: string): boolean {
  try {
    const url = new URL(s)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string
  const taskId = params.id as string

  // Auth: Bearer {apiKey}
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authorization: Bearer {apiKey} required', 401)
  }
  const apiKey = authHeader.slice(7)

  // Verify agent + API key
  const agent = await env.DB.prepare(
    'SELECT name, api_key, basemail_handle FROM agents WHERE name = ?1'
  ).bind(agentName).first()

  if (!agent) return errorResponse('Agent not found', 404)
  if (!agent.api_key || agent.api_key !== apiKey) return errorResponse('Invalid API key', 403)

  // Get task
  const task = await env.DB.prepare(
    `SELECT id, seller_agent, skill_name, status, buyer_email, channel,
            params, created_at, started_at, paid_at, escrow_tx, escrow_status
     FROM tasks WHERE id = ?1 AND seller_agent = ?2`
  ).bind(taskId, agentName).first()

  if (!task) return errorResponse('Task not found', 404)

  // Only paid or executing tasks can be completed
  if (task.status !== 'paid' && task.status !== 'executing') {
    return errorResponse(
      `Cannot complete task with status "${task.status}". Task must be "paid" or "executing".`,
      400,
    )
  }

  const body = await parseBody<CompleteBody>(request)
  if (!body) return errorResponse('Invalid request body', 400)

  const finalStatus = body.status || 'completed'
  if (finalStatus !== 'completed' && finalStatus !== 'failed') {
    return errorResponse('status must be "completed" or "failed"', 400)
  }

  // CAN-298: Completed tasks must include at least one result field
  if (finalStatus === 'completed') {
    const hasResult = body.result_url || body.resultUrl
      || body.result_data
      || body.result_note || body.resultNote
      || body.result_file
      || (body.result_files && body.result_files.length > 0)
    if (!hasResult) {
      return errorResponse(
        'Completed tasks must include at least one result field (result_url, result_data, result_note, result_file, or result_files)',
        400,
      )
    }
  }

  let resultUrl: string | null = body.result_url || body.resultUrl || null
  let resultData: string | null = body.result_data ? JSON.stringify(body.result_data) : null
  const resultPreview: string | null = body.result_preview || body.resultPreview || null
  const resultNote: string | null = body.result_note || body.resultNote || null
  let resultContentType: string | null = body.result_content_type || null

  // Validate URL formats (CAN-281)
  if (resultUrl && !isValidHttpUrl(resultUrl)) {
    return errorResponse('resultUrl must be a valid http/https URL', 400)
  }
  if (resultPreview && !isValidHttpUrl(resultPreview)) {
    return errorResponse('resultPreview must be a valid http/https URL', 400)
  }

  // Upload result file to R2 if provided
  if (body.result_file && finalStatus === 'completed') {
    const filename = body.result_filename || `result-${Date.now()}`
    const contentType = body.result_content_type || 'application/octet-stream'
    const r2Key = `${agentName}/${taskId}/${filename}`

    const fileBytes = Uint8Array.from(atob(body.result_file), (c) => c.charCodeAt(0))

    await env.TASK_RESULTS.put(r2Key, fileBytes, {
      httpMetadata: { contentType },
      customMetadata: {
        taskId,
        agentName,
        skill: task.skill_name as string,
      },
    })

    // Build public URL for the result
    resultUrl = `/api/agents/${agentName}/tasks/${taskId}/result/file`
    // Persist the content type from R2 upload if not explicitly set
    if (!resultContentType) resultContentType = contentType
  }

  // CAN-291: Multi-file delivery with credential encryption
  if (body.result_files && body.result_files.length > 0) {
    const files = body.result_files
    const processedFiles: Record<string, unknown>[] = []

    // Import encryption key for credential fields
    let cryptoKey: CryptoKey | null = null
    if (env.ENCRYPTION_KEY) {
      cryptoKey = await importKey(env.ENCRYPTION_KEY)
    }

    for (const file of files) {
      const processed: Record<string, unknown> = {
        url: file.url,
        type: file.type,
        name: file.name,
      }

      // Credential-specific fields
      const isCredential = file.type === 'credential' || file.type === 'api_endpoint'
      if (isCredential) {
        if (file.auth) processed.auth = file.auth
        if (file.method) processed.method = file.method
        if (file.expires_at) processed.expires_at = file.expires_at

        // Encrypt sensitive fields
        if (file.token) {
          processed.encrypted_token = cryptoKey
            ? await encrypt(file.token, cryptoKey)
            : file.token  // Fallback: store plaintext if no key (dev only)
        }
        if (file.headers) {
          processed.encrypted_headers = cryptoKey
            ? await encrypt(JSON.stringify(file.headers), cryptoKey)
            : JSON.stringify(file.headers)
        }
      }

      processedFiles.push(processed)
    }

    // Merge files into result_data
    const existingData = resultData ? JSON.parse(resultData) : {}
    existingData.files = processedFiles
    resultData = JSON.stringify(existingData)

    // Set result_url to first non-credential file (for preview/backward compat)
    if (!resultUrl) {
      const previewFile = files.find(f => f.type !== 'credential' && f.type !== 'api_endpoint')
      if (previewFile) resultUrl = previewFile.url
    }

    // Set content type from first file if not explicitly set
    if (!resultContentType && files.length > 0) {
      const firstNonCred = files.find(f => f.type !== 'credential' && f.type !== 'api_endpoint')
      if (firstNonCred) resultContentType = firstNonCred.type
    }
  }

  // Calculate execution time
  const startTime = task.started_at || task.paid_at || task.created_at
  const completedAt = new Date().toISOString()
  const executionMs = startTime
    ? new Date(completedAt).getTime() - new Date(startTime as string).getTime()
    : null

  // Build error data for failed tasks
  if (finalStatus === 'failed' && body.error_message) {
    resultData = JSON.stringify({ error: body.error_message })
  }

  // Determine if this is an escrow-protected task
  const isEscrow = task.escrow_status === 'deposited'

  // For escrow tasks: mark as completed but escrow awaits buyer confirmation
  // For direct payment tasks: mark as completed immediately
  const escrowStatus = isEscrow ? 'completed' : (task.escrow_status as string || 'none')

  // Update task (CAN-281: added result_preview, result_note; CAN-289: added result_content_type)
  await env.DB.prepare(
    `UPDATE tasks SET
       status = ?1,
       result_url = ?2,
       result_data = ?3,
       completed_at = datetime('now'),
       started_at = COALESCE(started_at, ?4),
       escrow_status = ?6,
       result_preview = ?7,
       result_note = ?8,
       result_content_type = ?9
     WHERE id = ?5`
  ).bind(
    finalStatus,
    resultUrl,
    resultData,
    startTime || completedAt,
    taskId,
    escrowStatus,
    resultPreview,
    resultNote,
    resultContentType,
  ).run()

  // Recalculate seller trust score (CAN-220)
  if (finalStatus === 'completed') {
    await recalcTrustScore(env, agentName)

    // Live feed event (CAN-300)
    emitFeedEvent(env.DB, {
      event_type: 'task_completed',
      emoji: '✅',
      actor: agentName,
      target: task.skill_name as string,
      link: `/community/agents/${agentName}`,
      message_en: `${agentName} completed a ${task.skill_name} task`,
      message_zh_tw: `${agentName} 完成了 ${task.skill_name} 任務`,
      message_zh_cn: `${agentName} 完成了 ${task.skill_name} 任务`,
    })
  }

  // BaseMail auto-notify buyer on task completion (CAN-267)
  let basemailReply: { sent: boolean; error?: string } | null = null
  if (
    finalStatus === 'completed' &&
    task.buyer_email &&
    agent.basemail_handle
  ) {
    basemailReply = await sendBasemailReply(env, {
      from: agent.basemail_handle as string,
      to: task.buyer_email as string,
      taskId,
      skill: task.skill_name as string,
      resultUrl,
      executionMs,
    })
  }

  // System email notification to buyer via Cloudflare Email Routing (CAN-283)
  let systemEmail: { sent: boolean; error?: string } | null = null
  if (finalStatus === 'completed' && task.buyer_email) {
    systemEmail = await sendBuyerCompletionEmail(env, {
      taskId,
      skillName: task.skill_name as string,
      sellerAgent: agentName,
      completedAt,
      executionMs,
      resultUrl,
      buyerEmail: task.buyer_email as string,
    })
  }

  return json({
    id: task.id,
    status: finalStatus,
    skill: task.skill_name,
    result_url: resultUrl,
    result_preview: resultPreview,
    result_note: resultNote,
    result_content_type: resultContentType,
    has_result_data: !!resultData,
    completed_at: completedAt,
    execution_time_ms: executionMs,
    basemail_reply: basemailReply,
    system_email: systemEmail,
    ...(isEscrow ? {
      escrow: {
        status: 'completed',
        message: 'Task completed. Awaiting buyer confirmation to release escrow funds.',
        next_steps: {
          confirm: `POST /api/agents/${agentName}/tasks/${taskId}/confirm`,
          reject: `POST /api/agents/${agentName}/tasks/${taskId}/reject`,
        },
      },
    } : {}),
  })
}

/** Send auto-reply via BaseMail API when a task completes */
async function sendBasemailReply(
  env: Env,
  opts: {
    from: string
    to: string
    taskId: string
    skill: string
    resultUrl: string | null
    executionMs: number | null
  },
): Promise<{ sent: boolean; error?: string }> {
  const apiUrl = env.BASEMAIL_API_URL || BASEMAIL_API
  const apiKey = env.BASEMAIL_API_KEY

  if (!apiKey) {
    return { sent: false, error: 'BASEMAIL_API_KEY not configured' }
  }

  const execTime = opts.executionMs != null
    ? opts.executionMs < 60_000
      ? `${Math.round(opts.executionMs / 1000)}s`
      : `${Math.round(opts.executionMs / 60_000)}m`
    : 'N/A'

  const resultLine = opts.resultUrl
    ? `📎 Your result is ready:\n${opts.resultUrl}`
    : `📎 Your result is available via the API:\nGET /api/agents/${opts.from}/tasks/${opts.taskId}/result`

  const body = [
    `Hi there! 👋`,
    '',
    `Great news — your task has been completed!`,
    '',
    `📋 Task ID: ${opts.taskId}`,
    `⚡ Skill: ${opts.skill}`,
    `⏱️ Completed in: ${execTime}`,
    '',
    resultLine,
    '',
    `If you have any questions, feel free to reach out.`,
    '',
    `— ${opts.from} on CanFly.ai`,
  ].join('\n')

  try {
    const res = await fetch(`${apiUrl}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: opts.to,
        subject: `✅ Your ${opts.skill} task is complete!`,
        body,
        from_handle: 'canflyai',
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown error')
      return { sent: false, error: `BaseMail API ${res.status}: ${errText}` }
    }

    return { sent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed'
    return { sent: false, error: message }
  }
}

// CAN-281: Support PATCH as well as POST
export const onRequestPatch: PagesFunction<Env> = onRequestPost

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
