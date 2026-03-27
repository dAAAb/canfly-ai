/**
 * Telegram Command Gateway — CAN-254 (V3-005)
 *
 * POST /api/tg/webhook — Telegram Bot webhook receiver
 *
 * Commands:
 *   /v3assign <agent> <skill> [params JSON] — create a task, return ticket id
 *   /v3status <task_id>                     — show task progress & blockers
 *   /v3summary                              — overview of recent tasks
 *
 * Guards:
 *   1. v3_tg_pm feature flag must be enabled
 *   2. Telegram user must be in tg_whitelist table
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'

// --- Telegram types (subset) ---

interface TgUser {
  id: number
  first_name?: string
  username?: string
}

interface TgMessage {
  message_id: number
  from?: TgUser
  chat: { id: number; type: string }
  text?: string
  entities?: Array<{ type: string; offset: number; length: number }>
}

interface TgUpdate {
  update_id: number
  message?: TgMessage
}

// --- Helpers ---

async function sendTgMessage(token: string, chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    signal: AbortSignal.timeout(10_000),
  })
}

async function isFeatureEnabled(db: D1Database, flagName: string): Promise<boolean> {
  const row = await db.prepare(
    'SELECT enabled FROM feature_flags WHERE flag_name = ?1 AND scope = ?2 AND scope_id IS NULL'
  ).bind(flagName, 'global').first()
  return row?.enabled === 1
}

async function isWhitelisted(db: D1Database, telegramUserId: string): Promise<boolean> {
  const row = await db.prepare(
    'SELECT 1 FROM tg_whitelist WHERE telegram_user_id = ?1'
  ).bind(telegramUserId).first()
  return !!row
}

function extractCommand(text: string): { command: string; args: string } | null {
  const match = text.match(/^\/(v3\w+)(?:\s+(.*))?$/s)
  if (!match) return null
  return { command: match[1].toLowerCase(), args: (match[2] || '').trim() }
}

// --- Command handlers ---

async function handleAssign(
  db: D1Database, args: string, chatId: number, token: string, fromUser: TgUser
): Promise<void> {
  // Parse: /v3assign <agent> <skill> [optional JSON params]
  const parts = args.match(/^(\S+)\s+(\S+)(?:\s+(.+))?$/s)
  if (!parts) {
    await sendTgMessage(token, chatId,
      '⚠️ Usage: `/v3assign <agent> <skill> [params JSON]`\n\nExample: `/v3assign sag tts-basic {"text":"hello"}`')
    return
  }

  const [, agentName, skillSlug, rawParams] = parts

  // Verify agent exists
  const agent = await db.prepare(
    'SELECT name, is_public FROM agents WHERE name = ?1'
  ).bind(agentName).first()

  if (!agent) {
    await sendTgMessage(token, chatId, `❌ Agent not found: \`${agentName}\``)
    return
  }

  // Verify skill exists
  const skill = await db.prepare(
    `SELECT id, name, slug, price, currency FROM skills
     WHERE agent_name = ?1 AND (name = ?2 OR slug = ?2)`
  ).bind(agentName, skillSlug).first()

  if (!skill) {
    await sendTgMessage(token, chatId, `❌ Skill not found: \`${skillSlug}\` on agent \`${agentName}\``)
    return
  }

  // Parse optional params
  let params: string | null = null
  if (rawParams) {
    try {
      JSON.parse(rawParams) // validate
      params = rawParams
    } catch {
      await sendTgMessage(token, chatId, '⚠️ Invalid JSON params. Must be valid JSON object.')
      return
    }
  }

  // Generate task ID
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const taskId = 'tg_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

  const buyerLabel = fromUser.username ? `@${fromUser.username}` : `tg:${fromUser.id}`

  // Create task with status "pending_payment" (TG tasks are internal / pre-approved)
  // For v1, TG-originated tasks are created as "paid" (internal team usage, no payment required)
  await db.prepare(
    `INSERT INTO tasks (id, buyer_agent, seller_agent, skill_name, params,
                        status, payment_method, amount, currency, channel, paid_at, started_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 'paid', 'tg_internal', ?6, ?7, 'telegram',
             datetime('now'), datetime('now'))`
  ).bind(
    taskId,
    buyerLabel,
    agentName,
    skill.name,
    params,
    skill.price || 0,
    skill.currency || 'USDC',
  ).run()

  await sendTgMessage(token, chatId,
    `✅ Task created!\n\n` +
    `📋 *Ticket:* \`${taskId}\`\n` +
    `🤖 *Agent:* ${agentName}\n` +
    `🔧 *Skill:* ${skill.name}\n` +
    `💰 *Price:* ${skill.price || 0} ${skill.currency || 'USDC'}\n` +
    `📊 *Status:* paid\n\n` +
    `Check status: \`/v3status ${taskId}\``)
}

async function handleStatus(
  db: D1Database, args: string, chatId: number, token: string
): Promise<void> {
  const taskId = args.trim()
  if (!taskId) {
    await sendTgMessage(token, chatId, '⚠️ Usage: `/v3status <task_id>`')
    return
  }

  const task = await db.prepare(
    `SELECT id, buyer_agent, seller_agent, skill_name, status, amount, currency,
            payment_tx, result_url, created_at, paid_at, completed_at
     FROM tasks WHERE id = ?1`
  ).bind(taskId).first()

  if (!task) {
    await sendTgMessage(token, chatId, `❌ Task not found: \`${taskId}\``)
    return
  }

  const statusEmoji: Record<string, string> = {
    pending_payment: '⏳',
    paid: '💰',
    executing: '⚙️',
    completed: '✅',
    failed: '❌',
    cancelled: '🚫',
  }

  const emoji = statusEmoji[task.status as string] || '❓'
  let msg = `${emoji} *Task Status*\n\n` +
    `📋 *ID:* \`${task.id}\`\n` +
    `🤖 *Agent:* ${task.seller_agent}\n` +
    `🔧 *Skill:* ${task.skill_name}\n` +
    `📊 *Status:* ${task.status}\n` +
    `💰 *Amount:* ${task.amount || 0} ${task.currency || 'USDC'}\n` +
    `📅 *Created:* ${task.created_at}`

  if (task.paid_at) msg += `\n💳 *Paid:* ${task.paid_at}`
  if (task.completed_at) msg += `\n🏁 *Completed:* ${task.completed_at}`
  if (task.payment_tx) msg += `\n🔗 *TX:* [basescan](https://basescan.org/tx/${task.payment_tx})`
  if (task.result_url) msg += `\n📦 *Result:* ${task.result_url}`

  // Check if task is blocked (status = failed with a recent error)
  if (task.status === 'failed') {
    msg += '\n\n⚠️ *This task has failed.* Contact the agent operator for details.'
  }

  await sendTgMessage(token, chatId, msg)
}

async function handleSummary(
  db: D1Database, _args: string, chatId: number, token: string
): Promise<void> {
  // Recent tasks summary (last 10)
  const tasks = await db.prepare(
    `SELECT id, seller_agent, skill_name, status, amount, currency, created_at
     FROM tasks
     WHERE channel = 'telegram' OR channel = 'api'
     ORDER BY created_at DESC
     LIMIT 10`
  ).all()

  if (!tasks.results.length) {
    await sendTgMessage(token, chatId, '📭 No tasks found.')
    return
  }

  // Aggregate stats
  const stats = await db.prepare(
    `SELECT status, COUNT(*) as cnt FROM tasks GROUP BY status`
  ).all()

  const statLine = stats.results
    .map((r) => `${r.status}: ${r.cnt}`)
    .join(' | ')

  let msg = `📊 *Task Summary*\n\n*Stats:* ${statLine}\n\n*Recent tasks:*\n`

  for (const t of tasks.results) {
    const statusEmoji: Record<string, string> = {
      pending_payment: '⏳', paid: '💰', executing: '⚙️',
      completed: '✅', failed: '❌', cancelled: '🚫',
    }
    const emoji = statusEmoji[t.status as string] || '❓'
    msg += `\n${emoji} \`${(t.id as string).slice(0, 16)}…\` → ${t.seller_agent}/${t.skill_name} (${t.amount || 0} ${t.currency || 'USDC'})`
  }

  await sendTgMessage(token, chatId, msg)
}

// --- Main webhook handler ---

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  // Guard 1: TG_BOT_TOKEN must be configured
  if (!env.TG_BOT_TOKEN) {
    return errorResponse('Telegram bot not configured', 503)
  }

  const token = env.TG_BOT_TOKEN

  // Parse Telegram update
  const update = await parseBody<TgUpdate>(request)
  if (!update?.message?.text) {
    return json({ ok: true }) // ignore non-text updates silently
  }

  const msg = update.message
  const chatId = msg.chat.id
  const fromUser = msg.from

  if (!fromUser) {
    return json({ ok: true })
  }

  // Guard 2: v3_tg_pm feature flag
  const flagEnabled = await isFeatureEnabled(env.DB, 'v3_tg_pm')
  if (!flagEnabled) {
    // Only respond if it looks like a v3 command
    const parsed = extractCommand(msg.text)
    if (parsed) {
      await sendTgMessage(token, chatId, '🚫 Telegram command gateway is currently disabled.')
    }
    return json({ ok: true })
  }

  // Guard 3: Whitelist check
  const whitelisted = await isWhitelisted(env.DB, String(fromUser.id))
  if (!whitelisted) {
    const parsed = extractCommand(msg.text)
    if (parsed) {
      await sendTgMessage(token, chatId, '🚫 Access denied. You are not on the whitelist.')
    }
    return json({ ok: true })
  }

  // Parse command
  const parsed = extractCommand(msg.text)
  if (!parsed) {
    return json({ ok: true }) // not a v3 command, ignore
  }

  try {
    switch (parsed.command) {
      case 'v3assign':
        await handleAssign(env.DB, parsed.args, chatId, token, fromUser)
        break
      case 'v3status':
        await handleStatus(env.DB, parsed.args, chatId, token)
        break
      case 'v3summary':
        await handleSummary(env.DB, parsed.args, chatId, token)
        break
      default:
        await sendTgMessage(token, chatId,
          `❓ Unknown command: \`/${parsed.command}\`\n\n` +
          `Available commands:\n` +
          `• \`/v3assign <agent> <skill> [params]\` — create a task\n` +
          `• \`/v3status <task_id>\` — check task status\n` +
          `• \`/v3summary\` — recent tasks overview`)
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    await sendTgMessage(token, chatId, `⚠️ Error: ${errMsg}`)
  }

  return json({ ok: true })
}
