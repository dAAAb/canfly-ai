/**
 * POST /api/agents/:name/chat — Chat Proxy (CAN-273, CAN-276)
 *
 * Proxies chat messages from the CanFly frontend to the agent's gateway.
 * Supports streaming responses via ReadableStream.
 *
 * Auth:
 *   - Owner (CanFly UI): X-Wallet-Address or X-Edit-Token header
 *   - PM / Peer (Paperclip Bridge): X-Canfly-Api-Key header
 *
 * Headers (CAN-276):
 *   - X-Canfly-Channel: 'canfly' (default) | 'canfly-pm'
 *   - X-Canfly-Sender-Type: 'owner' (default) | 'pm' | 'peer'
 *
 * Body: { message: string, sessionId?: string }
 * Response: Streamed text/event-stream (SSE) or JSON fallback
 *
 * GET /api/agents/:name/chat?sessionId=xxx&channel=canfly — Fetch chat history
 */
import { type Env, json, errorResponse, handleOptions, CORS_HEADERS } from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'
import { importKey, decrypt } from '../../../lib/crypto'

type SenderType = 'owner' | 'pm' | 'peer'
type Channel = 'canfly' | 'canfly-pm'

interface ChatRequest {
  message: string
  sessionId?: string
}

/** Resolve the agent's gateway URL from agent_card_override or deploy_url */
async function resolveGatewayUrl(db: D1Database, agentName: string): Promise<string | null> {
  // 1. Check agent_card_override for A2A url
  const agent = await db.prepare(
    'SELECT agent_card_override FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ agent_card_override: string | null }>()

  if (agent?.agent_card_override) {
    try {
      const card = JSON.parse(agent.agent_card_override)
      if (card.url) return card.url
    } catch { /* ignore parse errors */ }
  }

  // 2. Fallback to Zeabur deploy_url
  const deployment = await db.prepare(
    `SELECT deploy_url FROM v3_zeabur_deployments
     WHERE agent_name = ?1 AND status = 'running'
     ORDER BY updated_at DESC LIMIT 1`
  ).bind(agentName).first<{ deploy_url: string | null }>()

  return deployment?.deploy_url || null
}

/** Verify the requesting user owns this agent (owner auth via centralized authenticateRequest) */
async function verifyOwnership(
  db: D1Database,
  agentName: string,
  auth: { username: string },
): Promise<{ username: string } | null> {
  const agent = await db.prepare(
    'SELECT owner_username FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ owner_username: string | null }>()

  if (!agent?.owner_username) return null
  if (agent.owner_username !== auth.username) return null

  return { username: auth.username }
}

/** Verify PM/peer access via agent's own API key */
async function verifyApiKeyAccess(
  db: D1Database,
  agentName: string,
  apiKey: string,
): Promise<{ username: string } | null> {
  const agent = await db.prepare(
    'SELECT owner_username, api_key FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ owner_username: string | null; api_key: string | null }>()

  if (!agent?.owner_username || !agent.api_key) return null
  if (agent.api_key === apiKey) return { username: `pm:${agentName}` }

  return null
}

/** Get or create a chat session, scoped by channel + sender_type */
async function getOrCreateSession(
  db: D1Database,
  sessionId: string | undefined,
  username: string,
  agentName: string,
  firstMessage: string,
  channel: Channel,
  senderType: SenderType,
): Promise<string> {
  if (sessionId) {
    // Session lookup is scoped: PM sessions can't reference owner sessions
    const existing = await db.prepare(
      `SELECT id FROM v3_chat_sessions
       WHERE id = ?1 AND owner_username = ?2 AND agent_name = ?3 AND channel = ?4`
    ).bind(sessionId, username, agentName, channel).first()
    if (existing) return sessionId
  }

  const id = crypto.randomUUID()
  const title = firstMessage.slice(0, 80) + (firstMessage.length > 80 ? '…' : '')
  await db.prepare(
    `INSERT INTO v3_chat_sessions (id, owner_username, agent_name, title, channel, sender_type)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  ).bind(id, username, agentName, title, channel, senderType).run()
  return id
}

/** Save a message to the session */
async function saveMessage(
  db: D1Database,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
) {
  const id = crypto.randomUUID()
  await db.prepare(
    'INSERT INTO v3_chat_messages (id, session_id, role, content) VALUES (?1, ?2, ?3, ?4)'
  ).bind(id, sessionId, role, content).run()
}

// ── POST: Send chat message ─────────────────────────────────────────
export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  // CAN-276: Read channel + sender type headers
  const rawChannel = request.headers.get('X-Canfly-Channel') || 'canfly'
  const rawSenderType = request.headers.get('X-Canfly-Sender-Type') || 'owner'
  const channel: Channel = rawChannel === 'canfly-pm' ? 'canfly-pm' : 'canfly'
  const senderType: SenderType = (['owner', 'pm', 'peer'] as const).includes(rawSenderType as SenderType)
    ? (rawSenderType as SenderType) : 'owner'

  // Auth: owner (centralized auth) or PM/peer (API key)
  const apiKey = request.headers.get('X-Canfly-Api-Key')

  let caller: { username: string } | null = null

  if (senderType === 'owner') {
    // Owner auth via centralized authenticateRequest
    const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
    if (!auth) {
      return errorResponse('Authentication required', 401)
    }
    caller = await verifyOwnership(env.DB, agentName, auth)
  } else {
    // PM/peer auth: API key
    if (!apiKey) {
      return errorResponse('Authentication required (X-Canfly-Api-Key) for pm/peer sender type', 401)
    }
    caller = await verifyApiKeyAccess(env.DB, agentName, apiKey)
  }

  if (!caller) {
    return errorResponse('Not authorized', 403)
  }

  // Parse body
  let body: ChatRequest
  try {
    body = await request.json() as ChatRequest
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
    return errorResponse('message is required', 400)
  }

  const message = body.message.trim()
  if (message.length > 4000) {
    return errorResponse('Message too long (max 4000 characters)', 400)
  }

  // Resolve agent gateway URL
  const gatewayUrl = await resolveGatewayUrl(env.DB, agentName)
  if (!gatewayUrl) {
    // Distinguish "never deployed" from "deployment failed/incomplete":
    // if a deployment row exists but it is stuck / failed, the owner needs
    // to reconfigure, not redeploy.
    const anyDeployment = await env.DB.prepare(
      `SELECT status, error_code, error_message FROM v3_zeabur_deployments
       WHERE agent_name = ?1 ORDER BY updated_at DESC LIMIT 1`
    ).bind(agentName).first<{ status: string; error_code: string | null; error_message: string | null }>()
    if (anyDeployment) {
      return json({
        error: anyDeployment.error_message || 'Agent setup is incomplete',
        code: 'NEEDS_RECONFIGURE',
        deployStatus: anyDeployment.status,
        errorCode: anyDeployment.error_code,
      }, 422)
    }
    return errorResponse('Agent has no gateway URL configured — deploy the agent first', 422)
  }

  // Sanity: if the agent has no gateway_token saved, chat will 100% fail —
  // signal this up front so the UI can point to reconfigure instead of showing
  // an opaque gateway error.
  const tokenProbe = await env.DB.prepare(
    `SELECT agent_card_override FROM agents WHERE name = ?1`
  ).bind(agentName).first<{ agent_card_override: string | null }>()
  if (!tokenProbe?.agent_card_override) {
    const latest = await env.DB.prepare(
      `SELECT status, error_code, error_message FROM v3_zeabur_deployments
       WHERE agent_name = ?1 ORDER BY updated_at DESC LIMIT 1`
    ).bind(agentName).first<{ status: string; error_code: string | null; error_message: string | null }>()
    return json({
      error: latest?.error_message || 'Agent gateway token is missing',
      code: 'NEEDS_RECONFIGURE',
      deployStatus: latest?.status || 'unknown',
      errorCode: latest?.error_code || 'NO_GATEWAY_TOKEN',
    }, 422)
  }

  // Create/get session (scoped by channel — PM can't see owner sessions)
  const sessionId = await getOrCreateSession(
    env.DB, body.sessionId, caller.username, agentName, message, channel, senderType,
  )

  // Save user message
  await saveMessage(env.DB, sessionId, 'user', message)

  // Load recent chat history for context (last 20 messages)
  const history = await env.DB.prepare(
    `SELECT role, content FROM v3_chat_messages
     WHERE session_id = ?1 ORDER BY created_at ASC LIMIT 20`
  ).bind(sessionId).all<{ role: string; content: string }>()

  const messages = (history.results || []).map(m => ({
    role: m.role,
    content: m.content,
  }))

  // Resolve gateway token from agent_card_override
  let gatewayToken = ''
  try {
    const agentRow = await env.DB.prepare('SELECT agent_card_override FROM agents WHERE name = ?1')
      .bind(agentName).first<{ agent_card_override: string | null }>()
    if (agentRow?.agent_card_override) {
      const card = JSON.parse(agentRow.agent_card_override)
      const rawToken = card.gateway_token || ''
      const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
      gatewayToken = cryptoKey && rawToken ? await decrypt(rawToken, cryptoKey) : rawToken
    }
  } catch { /* ignore */ }

  // Strategy: try /v1/chat/completions first (works on some setups),
  // then fall back to WebSocket chat (works on all OpenClaw instances)
  try {
    // CAN-276: Headers forwarded to gateway so agent can adjust behavior
    const gatewayHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Canfly-Channel': channel,
      'X-Canfly-Sender-Type': senderType,
      ...(gatewayToken ? { 'Authorization': `Bearer ${gatewayToken}` } : {}),
    }

    // Attempt 1: OpenAI-compatible REST API
    const restResponse = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: gatewayHeaders,
      body: JSON.stringify({
        model: 'openclaw',
        messages: [...messages, { role: 'user', content: body.message }],
        stream: false,
        metadata: { channel, sender_type: senderType },
      }),
    })

    if (restResponse.ok) {
      const ct = restResponse.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const result = await restResponse.json() as {
          choices?: Array<{ message?: { content?: string } }>
        }
        const reply = result.choices?.[0]?.message?.content || ''
        if (reply) {
          await saveMessage(env.DB, sessionId, 'assistant', reply)
          return json({ sessionId, role: 'assistant', content: reply })
        }
      }
    }

    // Attempt 2: WebSocket-based chat via Cloudflare Worker fetch to gateway
    // OpenClaw gateway accepts WebSocket connections at ws(s)://domain/?token=xxx
    // We use the gateway's HTTP session API as an alternative
    const wsUrl = gatewayUrl.replace('https://', 'wss://').replace('http://', 'ws://')

    // Since CF Workers can't hold WebSocket connections long enough for AI responses,
    // use the gateway's internal REST-like message endpoint
    // Try POST to gateway root with chat payload (some OpenClaw versions support this)
    const chatPayload = {
      type: 'chat',
      message: body.message,
      sessionId: sessionId,
      token: gatewayToken,
      channel,
      senderType,
    }

    const wsHttpResponse = await fetch(`${gatewayUrl}/api/chat`, {
      method: 'POST',
      headers: gatewayHeaders,
      body: JSON.stringify(chatPayload),
    })

    if (wsHttpResponse.ok) {
      const ct = wsHttpResponse.headers.get('content-type') || ''
      if (ct.includes('json')) {
        const result = await wsHttpResponse.json() as { content?: string; reply?: string; message?: string }
        const reply = result.content || result.reply || result.message || ''
        if (reply) {
          await saveMessage(env.DB, sessionId, 'assistant', reply)
          return json({ sessionId, role: 'assistant', content: reply })
        }
      }
    }

    // Attempt 3: Use Cloudflare Worker WebSocket upgrade to proxy
    // Connect to gateway WS, send message, collect response chunks, return
    const upgradeResponse = await fetch(`${wsUrl}/?token=${gatewayToken}`, {
      headers: { 'Upgrade': 'websocket' },
    })

    if (upgradeResponse.webSocket) {
      const ws = upgradeResponse.webSocket
      ws.accept()

      return new Promise<Response>((resolve) => {
        let reply = ''
        let resolved = false
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true
            ws.close()
            if (reply) {
              saveMessage(env.DB, sessionId, 'assistant', reply).catch(() => {})
              resolve(json({ sessionId, role: 'assistant', content: reply }))
            } else {
              resolve(errorResponse('Agent response timeout', 504))
            }
          }
        }, 55000) // 55s timeout (CF Workers max ~60s)

        ws.addEventListener('message', (event) => {
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : null
            if (data?.type === 'assistant' || data?.type === 'message' || data?.role === 'assistant') {
              reply += data.content || data.text || data.message || ''
            }
            // Check for completion signals
            if (data?.type === 'done' || data?.type === 'end' || data?.finished) {
              clearTimeout(timeout)
              if (!resolved) {
                resolved = true
                ws.close()
                saveMessage(env.DB, sessionId, 'assistant', reply).catch(() => {})
                resolve(json({ sessionId, role: 'assistant', content: reply }))
              }
            }
          } catch { /* non-JSON message, ignore */ }
        })

        ws.addEventListener('close', () => {
          clearTimeout(timeout)
          if (!resolved) {
            resolved = true
            if (reply) {
              saveMessage(env.DB, sessionId, 'assistant', reply).catch(() => {})
              resolve(json({ sessionId, role: 'assistant', content: reply }))
            } else {
              resolve(errorResponse('WebSocket closed without response', 502))
            }
          }
        })

        // Send chat message with channel/sender context
        ws.send(JSON.stringify({
          type: 'chat',
          content: body.message,
          sessionId: sessionId,
          channel,
          senderType,
        }))
      })
    }

    return errorResponse('Could not connect to agent gateway (REST and WebSocket both failed)', 502)
  } catch (err) {
    return errorResponse(`Failed to reach agent gateway: ${(err as Error).message}`, 502)
  }
}

// ── GET: Fetch chat history ─────────────────────────────────────────
export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  // CAN-276: Support both owner and PM/peer auth for GET
  const apiKey = request.headers.get('X-Canfly-Api-Key')
  const rawSenderType = request.headers.get('X-Canfly-Sender-Type') || 'owner'
  const senderType: SenderType = (['owner', 'pm', 'peer'] as const).includes(rawSenderType as SenderType)
    ? (rawSenderType as SenderType) : 'owner'

  let caller: { username: string } | null = null

  if (senderType === 'owner') {
    const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
    if (!auth) {
      return errorResponse('Authentication required', 401)
    }
    caller = await verifyOwnership(env.DB, agentName, auth)
  } else {
    if (!apiKey) {
      return errorResponse('Authentication required (X-Canfly-Api-Key)', 401)
    }
    caller = await verifyApiKeyAccess(env.DB, agentName, apiKey)
  }

  if (!caller) {
    return errorResponse('Not authorized', 403)
  }

  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')
  // CAN-276: Channel filter — PM callers can only see canfly-pm sessions
  const rawChannel = url.searchParams.get('channel') || request.headers.get('X-Canfly-Channel')
  const channelFilter: Channel = rawChannel === 'canfly-pm' ? 'canfly-pm' : 'canfly'

  if (sessionId) {
    // Verify session belongs to the caller's channel scope
    const sessionCheck = await env.DB.prepare(
      `SELECT channel FROM v3_chat_sessions WHERE id = ?1 AND agent_name = ?2`
    ).bind(sessionId, agentName).first<{ channel: string }>()

    if (sessionCheck && sessionCheck.channel !== channelFilter) {
      return errorResponse('Session not accessible from this channel', 403)
    }

    const messages = await env.DB.prepare(
      `SELECT id, role, content, created_at FROM v3_chat_messages
       WHERE session_id = ?1 ORDER BY created_at ASC LIMIT 100`
    ).bind(sessionId).all()

    return json({ sessionId, messages: messages.results || [] })
  }

  // List sessions (scoped by channel)
  const sessions = await env.DB.prepare(
    `SELECT id, title, status, channel, sender_type, created_at, updated_at
     FROM v3_chat_sessions
     WHERE owner_username = ?1 AND agent_name = ?2 AND channel = ?3
     ORDER BY updated_at DESC LIMIT 20`
  ).bind(caller.username, agentName, channelFilter).all()

  return json({ sessions: sessions.results || [] })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
