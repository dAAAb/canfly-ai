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
import { zeaburGQL, patchConfigViaCLI } from '../../../lib/openclaw-config'

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

  // Look up Zeabur deployment so we can patch OpenClaw config directly via CLI.
  // The old flow POSTed a "please run these commands" message to /v1/chat/completions
  // which invoked the LLM agent — slow, unreliable, and risked the known
  // pi-agent-core crash. Direct config.patch RPC is the supported path.
  const deployment = await env.DB.prepare(
    `SELECT deploy_url, zeabur_project_id, zeabur_service_id, metadata
     FROM v3_zeabur_deployments WHERE agent_name = ?1
     ORDER BY updated_at DESC LIMIT 1`
  ).bind(agentName).first<{
    deploy_url: string | null
    zeabur_project_id: string
    zeabur_service_id: string | null
    metadata: string
  }>()

  if (!deployment || !deployment.zeabur_service_id) {
    return errorResponse(
      'Cannot find agent Zeabur deployment. Ensure the agent is deployed.',
      422
    )
  }

  const metadata = JSON.parse(deployment.metadata || '{}') as Record<string, unknown>
  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  const rawKey = (metadata.zeaburApiKey as string) || ''
  const zeaburApiKey = cryptoKey && rawKey ? await decrypt(rawKey, cryptoKey) : rawKey
  if (!zeaburApiKey) {
    return errorResponse('Missing Zeabur API key for this deployment', 500)
  }

  let gatewaySuccess = false
  let gatewayError: string | null = null
  let botUsername: string | null = null

  try {
    // Step 1: Verify the bot token with Telegram API
    const tgResp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      signal: AbortSignal.timeout(10000),
    })
    const tgData = await tgResp.json() as { ok: boolean; result?: { username?: string }; description?: string }

    if (!tgData.ok) {
      return errorResponse(
        `Invalid bot token: ${tgData.description || 'Telegram rejected the token'}`,
        400
      )
    }
    botUsername = tgData.result?.username || null

    // Step 2: Resolve production environment for this Zeabur project
    const envResult = await zeaburGQL(zeaburApiKey, `
      query { project(_id: "${deployment.zeabur_project_id}") { environments { _id name } } }
    `)
    const envs = (envResult.data?.project as { environments: Array<{ _id: string; name: string }> })?.environments || []
    const prodEnv = envs.find(e => e.name === 'production') || envs[0]
    if (!prodEnv) {
      gatewayError = 'No environment found for Zeabur project'
    } else {
      // Step 3: Patch OpenClaw config directly — channels.telegram + plugin entry.
      // JSON merge-patch semantics: provided fields overwrite, null deletes.
      const telegramPatch = JSON.stringify({
        channels: {
          telegram: {
            enabled: true,
            botToken,
            dmPolicy: 'allowlist',
          },
        },
        plugins: {
          entries: {
            telegram: { enabled: true },
          },
        },
      })
      const patchResult = await patchConfigViaCLI(zeaburApiKey, deployment.zeabur_service_id, prodEnv._id, telegramPatch)
      if (patchResult.success) {
        gatewaySuccess = true
      } else {
        gatewayError = `Config patch failed (${patchResult.method}): ${patchResult.error || 'unknown'}`
      }
    }
  } catch (err) {
    gatewayError = `Telegram setup failed: ${err instanceof Error ? err.message : String(err)}`
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
