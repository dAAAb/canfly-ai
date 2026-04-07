/**
 * POST /api/cron/heartbeat-sweep — Fallback scan for paid but unexecuted tasks
 *
 * Webhook notifications may fail, leaving tasks stuck in 'paid' status.
 * This cron endpoint picks up those orphaned tasks, executes the corresponding
 * skill inline, and marks them completed.
 *
 * Logic:
 *   1. Find tasks with status='paid' and paid_at older than 1 minute
 *   2. Atomically set status='executing' + started_at to prevent double-pick
 *   3. Dispatch skill execution (Gemini/OpenAI for images, etc.)
 *   4. Store result in R2, mark completed, send BaseMail reply
 *
 * CAN-227: Heartbeat fallback scan
 */
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'
import { recalcTrustScore } from '../agents/_trust'

const BASEMAIL_API = 'https://api.basemail.ai'

interface SweepResult {
  id: string
  seller_agent: string
  skill_name: string
  status: 'completed' | 'failed'
  error?: string
  execution_ms?: number
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function authorizeCron(env: Env, request: Request): Response | null {
  const cronSecret = (env as unknown as Record<string, string>).CRON_SECRET
  if (!cronSecret) return null // no secret configured → allow
  const authHeader = request.headers.get('Authorization')
  const cronHeader = request.headers.get('X-Cron-Secret')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cronHeader
  if (token !== cronSecret) return errorResponse('Unauthorized', 401)
  return null
}

// ---------------------------------------------------------------------------
// Inline skill execution — Gemini image generation
// ---------------------------------------------------------------------------

async function generateImageGemini(
  apiKey: string,
  prompt: string,
  style: string,
): Promise<{ base64: string; mimeType: string }> {
  const fullPrompt = style !== 'photo'
    ? `Create a ${style} style cover image: ${prompt}. High quality, vibrant colors, suitable for a blog or article header.`
    : `Professional photograph for a cover image: ${prompt}. High resolution, editorial quality.`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageMimeType: 'image/png',
      },
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown')
    throw new Error(`Gemini API ${res.status}: ${errText}`)
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data: string; mimeType: string } }> }
    }>
  }

  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType }
      }
    }
  }

  throw new Error('Gemini returned no image data')
}

// ---------------------------------------------------------------------------
// Inline skill execution — OpenAI DALL-E 3 fallback
// ---------------------------------------------------------------------------

async function generateImageOpenAI(
  apiKey: string,
  prompt: string,
  style: string,
): Promise<{ base64: string; mimeType: string }> {
  const fullPrompt = `Cover image in ${style} style: ${prompt}. High quality, vibrant, suitable as a blog or article header image.`

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: fullPrompt,
      n: 1,
      size: '1792x1024',
      quality: 'hd',
      response_format: 'b64_json',
    }),
    signal: AbortSignal.timeout(120_000),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown')
    throw new Error(`OpenAI API ${res.status}: ${errText}`)
  }

  const data = (await res.json()) as { data?: Array<{ b64_json?: string }> }
  const img = data.data?.[0]
  if (!img?.b64_json) throw new Error('OpenAI returned no image data')

  return { base64: img.b64_json, mimeType: 'image/png' }
}

// ---------------------------------------------------------------------------
// Cover image execution — Gemini primary, OpenAI fallback
// ---------------------------------------------------------------------------

async function executeCoverImage(
  env: Env,
  params: Record<string, unknown>,
): Promise<{ base64: string; mimeType: string; provider: string }> {
  const prompt = (params.prompt as string) || 'A beautiful cover image'
  const style = (params.style as string) || 'illustration'

  const geminiKey = (env as unknown as Record<string, string>).GEMINI_API_KEY
  const openaiKey = (env as unknown as Record<string, string>).OPENAI_API_KEY

  if (geminiKey) {
    try {
      const result = await generateImageGemini(geminiKey, prompt, style)
      return { ...result, provider: 'gemini' }
    } catch (err) {
      if (!openaiKey) throw err
      // fall through to OpenAI
    }
  }

  if (openaiKey) {
    const result = await generateImageOpenAI(openaiKey, prompt, style)
    return { ...result, provider: 'openai' }
  }

  throw new Error('No image generation API key configured (GEMINI_API_KEY or OPENAI_API_KEY)')
}

// ---------------------------------------------------------------------------
// BaseMail completion reply
// ---------------------------------------------------------------------------

async function sendCompletionMail(
  env: Env,
  opts: {
    fromHandle: string
    to: string
    taskId: string
    skill: string
    resultUrl: string | null
    executionMs: number | null
  },
): Promise<void> {
  const apiKey = env.BASEMAIL_API_KEY
  if (!apiKey) return

  const apiUrl = env.BASEMAIL_API_URL || BASEMAIL_API
  const execTime = opts.executionMs != null
    ? opts.executionMs < 60_000
      ? `${Math.round(opts.executionMs / 1000)}s`
      : `${Math.round(opts.executionMs / 60_000)}m`
    : 'N/A'

  const resultLine = opts.resultUrl
    ? `Result: ${opts.resultUrl}`
    : 'Result delivered inline — poll the task status API for details.'

  const body = [
    `✅ Task ${opts.taskId} completed.`,
    `Skill: ${opts.skill}`,
    `Execution time: ${execTime}`,
    '',
    resultLine,
    '',
    `Poll: GET /api/agents/${opts.fromHandle}/tasks/${opts.taskId}/result`,
  ].join('\n')

  await fetch(`${apiUrl}/api/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      to: opts.to,
      subject: `Re: ${opts.skill} — Task Complete`,
      body,
      from_handle: 'canflyai',
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {})
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const authErr = authorizeCron(env, request)
  if (authErr) return authErr

  // 1. Find paid tasks older than 1 minute that haven't been picked up
  const stale = await env.DB.prepare(
    `SELECT t.id, t.seller_agent, t.skill_name, t.params, t.buyer_email,
            t.buyer_agent, t.channel, t.paid_at,
            a.basemail_handle
     FROM tasks t
     LEFT JOIN agents a ON a.name = t.seller_agent
     WHERE t.status = 'paid'
       AND t.paid_at IS NOT NULL
       AND t.paid_at < datetime('now', '-1 minute')
     ORDER BY t.paid_at ASC
     LIMIT 10`
  ).bind().all()

  if (!stale.results || stale.results.length === 0) {
    return json({ swept: [], count: 0, message: 'No stale paid tasks found.' })
  }

  const results: SweepResult[] = []

  for (const row of stale.results) {
    const taskId = row.id as string
    const sellerAgent = row.seller_agent as string
    const skillName = (row.skill_name as string) || ''
    const paramsRaw = row.params as string | null
    const buyerEmail = row.buyer_email as string | null
    const channel = row.channel as string | null
    const basemailHandle = row.basemail_handle as string | null
    const paidAt = row.paid_at as string

    // 2. Atomically claim the task (prevents double execution)
    const claim = await env.DB.prepare(
      `UPDATE tasks SET status = 'executing', started_at = COALESCE(started_at, datetime('now'))
       WHERE id = ?1 AND status = 'paid'`
    ).bind(taskId).run()

    if (!claim.meta.changes || claim.meta.changes === 0) {
      // Another worker already claimed it
      continue
    }

    const startMs = Date.now()
    const skillKey = skillName.toLowerCase().trim()

    try {
      // 3. Dispatch based on skill_name
      let resultUrl: string | null = null
      let resultData: string | null = null

      if (skillKey === 'ai cover image' || skillKey === 'cover image') {
        const params = paramsRaw ? JSON.parse(paramsRaw) : {}
        const img = await executeCoverImage(env, params)

        // Store in R2
        const filename = `cover-${Date.now()}.png`
        const r2Key = `${sellerAgent}/${taskId}/${filename}`
        const fileBytes = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0))

        await env.TASK_RESULTS.put(r2Key, fileBytes, {
          httpMetadata: { contentType: img.mimeType },
          customMetadata: { taskId, agentName: sellerAgent, skill: skillName },
        })

        resultUrl = `/api/agents/${sellerAgent}/tasks/${taskId}/result/file`
        resultData = JSON.stringify({
          provider: img.provider,
          mimeType: img.mimeType,
          filename,
          sizeBytes: fileBytes.length,
        })
      } else {
        // Unsupported skill — mark failed so it doesn't loop
        throw new Error(`Heartbeat sweep does not support skill: "${skillName}"`)
      }

      const executionMs = Date.now() - startMs

      // 4. Mark completed
      const isEscrow = false // heartbeat sweep handles non-escrow tasks
      await env.DB.prepare(
        `UPDATE tasks SET
           status = 'completed',
           result_url = ?1,
           result_data = ?2,
           completed_at = datetime('now')
         WHERE id = ?3`
      ).bind(resultUrl, resultData, taskId).run()

      // 5. Recalc trust score
      await recalcTrustScore(env, sellerAgent)

      // 6. BaseMail reply for basemail-channel tasks
      if (channel === 'basemail' && buyerEmail && basemailHandle) {
        await sendCompletionMail(env, {
          fromHandle: basemailHandle,
          to: buyerEmail,
          taskId,
          skill: skillName,
          resultUrl,
          executionMs,
        })
      }

      results.push({
        id: taskId,
        seller_agent: sellerAgent,
        skill_name: skillName,
        status: 'completed',
        execution_ms: executionMs,
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'

      // Mark task as failed so it doesn't get re-swept
      await env.DB.prepare(
        `UPDATE tasks SET
           status = 'failed',
           result_data = ?1,
           completed_at = datetime('now')
         WHERE id = ?2`
      ).bind(JSON.stringify({ error: errorMsg }), taskId).run()

      results.push({
        id: taskId,
        seller_agent: sellerAgent,
        skill_name: skillName,
        status: 'failed',
        error: errorMsg,
      })
    }
  }

  return json({
    swept: results,
    count: results.length,
    completed: results.filter((r) => r.status === 'completed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    message: `Heartbeat sweep processed ${results.length} stale task(s).`,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
