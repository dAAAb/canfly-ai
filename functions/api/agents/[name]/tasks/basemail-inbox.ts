/**
 * POST /api/agents/:name/tasks/basemail-inbox — Process BaseMail inbox for task creation
 *
 * Called by the agent during heartbeat. Accepts an array of parsed emails,
 * matches subjects to purchasable skills, and creates tasks with channel: 'basemail'.
 *
 * CAN-208: BaseMail inbox → task creation
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../../community/_helpers'

interface InboxEmail {
  message_id: string        // BaseMail message ID (for dedup + reply)
  from: string              // sender address (e.g. "nova@basemail.ai")
  subject: string           // should contain skill name
  body: string              // JSON params or plain text
  tx_hash?: string          // USDC tx hash (from body or attachment metadata)
  attention_bond?: string   // BaseMail Attention Bond tx
}

interface InboxBody {
  emails: InboxEmail[]
}

function generateTaskId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return 'task_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Try to parse body as JSON params; fall back to wrapping as { text: body } */
function parseParams(body: string): Record<string, unknown> {
  const trimmed = body.trim()
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // not valid JSON — fall through
    }
  }
  // Plain text body → wrap as text param (useful for blog/voice skills)
  return { text: trimmed }
}

/** Extract tx_hash from email body if not provided explicitly */
function extractTxHash(body: string): string | null {
  // Match 0x-prefixed 64 hex char transaction hash
  const match = body.match(/\b(0x[a-fA-F0-9]{64})\b/)
  return match ? match[1].toLowerCase() : null
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  // Auth: Bearer {apiKey}
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authorization: Bearer {apiKey} required', 401)
  }
  const apiKey = authHeader.slice(7)

  // Verify agent + API key
  const agent = await env.DB.prepare(
    'SELECT name, api_key, wallet_address, is_public FROM agents WHERE name = ?1'
  ).bind(agentName).first()

  if (!agent) return errorResponse('Agent not found', 404)
  if (!agent.api_key || agent.api_key !== apiKey) return errorResponse('Invalid API key', 403)

  const body = await parseBody<InboxBody>(request)
  if (!body?.emails || !Array.isArray(body.emails)) {
    return errorResponse('Missing required field: emails (array)', 400)
  }

  // Load all purchasable skills for this agent
  const skillsResult = await env.DB.prepare(
    `SELECT id, name, slug, type, price, currency, payment_methods, sla
     FROM skills WHERE agent_name = ?1 AND type = 'purchasable'`
  ).bind(agentName).all()

  const skills = skillsResult.results || []

  // Build lookup: lowercase name/slug → skill
  const skillLookup = new Map<string, typeof skills[0]>()
  for (const s of skills) {
    skillLookup.set((s.name as string).toLowerCase(), s)
    if (s.slug) skillLookup.set((s.slug as string).toLowerCase(), s)
  }

  // Dedup: check which message_ids already have tasks
  const messageIds = body.emails.map((e) => e.message_id).filter(Boolean)
  const existingTasks = new Set<string>()
  if (messageIds.length > 0) {
    // Check for existing tasks by matching message_id stored in params JSON
    for (const mid of messageIds) {
      const existing = await env.DB.prepare(
        `SELECT id FROM tasks WHERE seller_agent = ?1 AND channel = 'basemail'
         AND params LIKE ?2 LIMIT 1`
      ).bind(agentName, `%"message_id":"${mid}"%`).first()
      if (existing) existingTasks.add(mid)
    }
  }

  const created: Array<{
    task_id: string
    skill: string
    from: string
    status: string
    tx_hash: string | null
    message_id: string
  }> = []

  const skipped: Array<{
    message_id: string
    from: string
    subject: string
    reason: string
  }> = []

  for (const email of body.emails) {
    // Skip if already processed
    if (email.message_id && existingTasks.has(email.message_id)) {
      skipped.push({
        message_id: email.message_id,
        from: email.from,
        subject: email.subject,
        reason: 'already_processed',
      })
      continue
    }

    // Match subject to skill — exact first, then fuzzy (subject contains skill name)
    const subjectLower = (email.subject || '').toLowerCase().trim()
    let matchedSkill = skillLookup.get(subjectLower)

    // Fuzzy: check if subject contains any skill name
    if (!matchedSkill) {
      for (const [key, skill] of skillLookup.entries()) {
        if (subjectLower.includes(key) || key.includes(subjectLower)) {
          matchedSkill = skill
          break
        }
      }
    }

    if (!matchedSkill) {
      skipped.push({
        message_id: email.message_id,
        from: email.from,
        subject: email.subject,
        reason: 'no_matching_skill',
      })
      continue
    }

    // Parse params from body
    const emailParams = parseParams(email.body || '')
    // Attach message_id for traceability and dedup
    emailParams.message_id = email.message_id
    emailParams._basemail_from = email.from

    // Extract tx_hash
    const txHash = email.tx_hash || email.attention_bond || extractTxHash(email.body || '')

    const taskId = generateTaskId()
    const amount = matchedSkill.price as number | null
    const currency = (matchedSkill.currency as string) || 'USDC'

    // Determine initial status: if tx_hash provided, mark for verification
    const initialStatus = 'pending_payment'

    await env.DB.prepare(
      `INSERT INTO tasks (id, buyer_agent, buyer_email, seller_agent, skill_name, params,
                          status, payment_method, payment_chain, payment_tx,
                          amount, currency, channel)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
    ).bind(
      taskId,
      null,                           // buyer_agent (unknown from email)
      email.from,                     // buyer_email
      agentName,
      matchedSkill.name,
      JSON.stringify(emailParams),
      initialStatus,
      txHash ? 'usdc_base' : 'basemail',
      'base',
      txHash || null,
      amount,
      currency,
      'basemail',
    ).run()

    created.push({
      task_id: taskId,
      skill: matchedSkill.name as string,
      from: email.from,
      status: initialStatus,
      tx_hash: txHash || null,
      message_id: email.message_id,
    })
  }

  return json({
    agent: agentName,
    processed: body.emails.length,
    created: created.length,
    skipped: skipped.length,
    tasks: created,
    skipped_details: skipped,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
