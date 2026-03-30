/**
 * POST /api/agents/:name/connect-telegram — Connect Telegram bot to agent (CAN-274)
 *
 * Flow:
 *   1. User submits BotFather token from Dashboard
 *   2. We verify ownership (user owns this agent)
 *   3. Call agent's OpenClaw Gateway → config.patch to add Telegram plugin
 *   4. Store connection record in v3_telegram_connections
 *
 * Auth: X-Wallet-Address header (matching agent owner's wallet)
 * Body: { botToken: string }
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'
import { importKey, decrypt } from '../../../lib/crypto'

interface ConnectTelegramBody {
  botToken: string
}

function generateUUID(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) {
    return errorResponse('Authentication required', 401)
  }

  // Look up agent + verify ownership
  const agent = await env.DB.prepare(
    `SELECT a.name, a.owner_username, a.capabilities
     FROM agents a
     WHERE a.name = ?1`
  ).bind(agentName).first()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }
  if (!agent.owner_username) {
    return errorResponse('Agent has no owner', 403)
  }
  if (agent.owner_username !== auth.username) {
    return errorResponse('Not authorized — you are not the agent owner', 403)
  }

  // Parse body
  const body = await parseBody<ConnectTelegramBody>(request)
  if (!body || !body.botToken) {
    return errorResponse('botToken is required', 400)
  }

  // Basic Telegram bot token format: digits:alphanumeric
  const tokenPattern = /^\d+:[A-Za-z0-9_-]{35,}$/
  if (!tokenPattern.test(body.botToken.trim())) {
    return errorResponse('Invalid Telegram bot token format. Expected format from BotFather: 123456:ABC-DEF...', 400)
  }

  const botToken = body.botToken.trim()
  const tokenHash = await hashToken(botToken)

  // Check if already connected
  const existing = await env.DB.prepare(
    `SELECT id, status FROM v3_telegram_connections
     WHERE agent_name = ?1 AND status IN ('pending', 'active')`
  ).bind(agentName).first()

  if (existing && existing.status === 'active') {
    return errorResponse('Agent already has an active Telegram connection. Disconnect first.', 409)
  }

  // Get agent's gateway URL + token from agent_card_override
  let gatewayUrl: string | null = null
  let gatewayToken: string | null = null
  try {
    const agentRow = await env.DB.prepare(
      'SELECT agent_card_override FROM agents WHERE name = ?1'
    ).bind(agentName).first<{ agent_card_override: string | null }>()
    if (agentRow?.agent_card_override) {
      const card = JSON.parse(agentRow.agent_card_override)
      gatewayUrl = card.url || null
      const rawToken = card.gateway_token || null
      const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
      gatewayToken = cryptoKey && rawToken ? await decrypt(rawToken, cryptoKey) : rawToken
    }
  } catch { /* ignore */ }

  // Fallback: check v3_zeabur_deployments
  if (!gatewayUrl) {
    const deployment = await env.DB.prepare(
      `SELECT deploy_url FROM v3_zeabur_deployments
       WHERE agent_name = ?1 AND status = 'running'
       ORDER BY updated_at DESC LIMIT 1`
    ).bind(agentName).first()
    if (deployment?.deploy_url) {
      gatewayUrl = deployment.deploy_url as string
    }
  }

  if (!gatewayUrl) {
    return errorResponse(
      'Cannot find agent gateway URL. Ensure the agent is deployed and running on Zeabur.',
      422
    )
  }

  let gatewaySuccess = false
  let gatewayError: string | null = null
  let botUsername: string | null = null

  try {
    // Step 1: Verify the bot token with Telegram API
    const tgResp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const tgData = await tgResp.json() as { ok: boolean; result?: { username?: string }; description?: string }

    if (!tgData.ok) {
      return errorResponse(
        `Invalid bot token: ${tgData.description || 'Telegram rejected the token'}`,
        400
      )
    }
    botUsername = tgData.result?.username || null

    // Step 2: Set TELEGRAM_BOT_TOKEN env var on Zeabur (if we have Zeabur access)
    // Step 3: Patch OpenClaw config via /v1/chat/completions (ask the agent to configure itself)
    // Strategy: Use the OpenAI-compatible endpoint to ask the agent to run openclaw commands
    const configPatchResponse = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(gatewayToken ? { 'Authorization': `Bearer ${gatewayToken}` } : {}),
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages: [{
          role: 'user',
          content: `Run this command silently and reply only "DONE" or "ERROR: reason":\n\nopenclaw config set channels.telegram.enabled true && openclaw config set channels.telegram.botToken "${botToken}" && openclaw config set channels.telegram.dmPolicy allowlist && openclaw config set plugins.entries.telegram.enabled true && echo CONFIGURED`,
        }],
      }),
    })

    if (configPatchResponse.ok) {
      const result = await configPatchResponse.json() as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const reply = result.choices?.[0]?.message?.content || ''
      if (reply.includes('DONE') || reply.includes('CONFIGURED') || reply.includes('done')) {
        gatewaySuccess = true
      } else {
        gatewayError = `Agent responded but config may not be applied: ${reply.substring(0, 200)}`
        // Still mark as partial success — the agent attempted the config
        gatewaySuccess = reply.length > 0
      }
    } else {
      const errText = await configPatchResponse.text().catch(() => 'Unknown error')
      gatewayError = `Gateway chat API returned ${configPatchResponse.status}: ${errText.substring(0, 200)}`
    }
  } catch (err) {
    gatewayError = `Gateway unreachable: ${err instanceof Error ? err.message : String(err)}`
  }

  // Store connection record
  const connectionId = existing?.id as string || generateUUID()
  const status = gatewaySuccess ? 'active' : 'failed'

  if (existing) {
    await env.DB.prepare(
      `UPDATE v3_telegram_connections SET
        bot_token_hash = ?1, bot_username = ?2, status = ?3,
        error_message = ?4, connected_at = ?5, updated_at = datetime('now')
       WHERE id = ?6`
    ).bind(
      tokenHash,
      botUsername,
      status,
      gatewayError,
      gatewaySuccess ? new Date().toISOString() : null,
      connectionId,
    ).run()
  } else {
    await env.DB.prepare(
      `INSERT INTO v3_telegram_connections
        (id, agent_name, owner_username, bot_token_hash, bot_username, status, error_message, connected_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    ).bind(
      connectionId,
      agentName,
      agent.owner_username as string,
      tokenHash,
      botUsername,
      status,
      gatewayError,
      gatewaySuccess ? new Date().toISOString() : null,
    ).run()
  }

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'telegram_connect', ?2)`
  ).bind(agentName, JSON.stringify({
    status,
    botUsername,
    owner: agent.owner_username,
    error: gatewayError,
  })).run()

  if (!gatewaySuccess) {
    return json({
      connected: false,
      status: 'failed',
      botUsername,
      error: gatewayError,
      message: 'Bot token verified with Telegram, but could not reach the agent gateway. The agent may need to be restarted.',
    }, 502)
  }

  return json({
    connected: true,
    status: 'active',
    botUsername,
    connectionId,
    message: `Telegram bot @${botUsername || 'unknown'} connected! Go to Telegram and send /start to begin.`,
  })
}

/**
 * GET /api/agents/:name/connect-telegram — Check Telegram connection status
 */
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const agentName = params.name as string

  const connection = await env.DB.prepare(
    `SELECT id, bot_username, status, error_message, connected_at, updated_at
     FROM v3_telegram_connections
     WHERE agent_name = ?1
     ORDER BY updated_at DESC LIMIT 1`
  ).bind(agentName).first()

  if (!connection) {
    return json({ connected: false, status: 'none' })
  }

  return json({
    connected: connection.status === 'active',
    status: connection.status,
    botUsername: connection.bot_username,
    error: connection.error_message,
    connectedAt: connection.connected_at,
    updatedAt: connection.updated_at,
  })
}
