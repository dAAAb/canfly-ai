/**
 * POST /api/agents/:name/chat — Chat Proxy (CAN-273)
 *
 * Proxies chat messages from the CanFly frontend to the agent's gateway.
 * Supports streaming responses via ReadableStream.
 *
 * Auth: X-Wallet-Address or X-Edit-Token header (user must own the agent)
 *
 * Body: { message: string, sessionId?: string }
 * Response: Streamed text/event-stream (SSE) or JSON fallback
 *
 * GET /api/agents/:name/chat?sessionId=xxx — Fetch chat history
 */
import { type Env, json, errorResponse, handleOptions, CORS_HEADERS } from '../../community/_helpers'

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

/** Verify the requesting user owns this agent */
async function verifyOwnership(
  db: D1Database,
  agentName: string,
  walletAddress: string | null,
  editToken: string | null,
): Promise<{ username: string } | null> {
  const agent = await db.prepare(
    'SELECT owner_username, edit_token FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ owner_username: string | null; edit_token: string }>()

  if (!agent?.owner_username) return null

  // Check edit token match
  if (editToken && agent.edit_token === editToken) {
    return { username: agent.owner_username }
  }

  // Check wallet address match
  if (walletAddress) {
    const user = await db.prepare(
      'SELECT username FROM users WHERE username = ?1 AND wallet_address = ?2'
    ).bind(agent.owner_username, walletAddress).first<{ username: string }>()
    if (user) return { username: user.username }
  }

  return null
}

/** Get or create a chat session */
async function getOrCreateSession(
  db: D1Database,
  sessionId: string | undefined,
  username: string,
  agentName: string,
  firstMessage: string,
): Promise<string> {
  if (sessionId) {
    const existing = await db.prepare(
      'SELECT id FROM v3_chat_sessions WHERE id = ?1 AND owner_username = ?2 AND agent_name = ?3'
    ).bind(sessionId, username, agentName).first()
    if (existing) return sessionId
  }

  const id = crypto.randomUUID()
  const title = firstMessage.slice(0, 80) + (firstMessage.length > 80 ? '…' : '')
  await db.prepare(
    `INSERT INTO v3_chat_sessions (id, owner_username, agent_name, title) VALUES (?1, ?2, ?3, ?4)`
  ).bind(id, username, agentName, title).run()
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

  // Auth: wallet address or edit token
  const walletAddress = request.headers.get('X-Wallet-Address')
  const editToken = request.headers.get('X-Edit-Token')
  if (!walletAddress && !editToken) {
    return errorResponse('Authentication required (X-Wallet-Address or X-Edit-Token)', 401)
  }

  const owner = await verifyOwnership(env.DB, agentName, walletAddress, editToken)
  if (!owner) {
    return errorResponse('Not authorized — you must own this agent', 403)
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
    return errorResponse('Agent has no gateway URL configured — deploy the agent first', 422)
  }

  // Create/get session
  const sessionId = await getOrCreateSession(env.DB, body.sessionId, owner.username, agentName, message)

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
      gatewayToken = card.gateway_token || ''
    }
  } catch { /* ignore */ }

  // Strategy: try /v1/chat/completions first (works on some setups),
  // then fall back to WebSocket chat (works on all OpenClaw instances)
  try {
    // Attempt 1: OpenAI-compatible REST API
    const restResponse = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(gatewayToken ? { 'Authorization': `Bearer ${gatewayToken}` } : {}),
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages: [...messages, { role: 'user', content: body.message }],
        stream: false,
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
    }

    const wsHttpResponse = await fetch(`${gatewayUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(gatewayToken ? { 'Authorization': `Bearer ${gatewayToken}` } : {}),
      },
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

        // Send chat message
        ws.send(JSON.stringify({
          type: 'chat',
          content: body.message,
          sessionId: sessionId,
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

  const walletAddress = request.headers.get('X-Wallet-Address')
  const editToken = request.headers.get('X-Edit-Token')
  if (!walletAddress && !editToken) {
    return errorResponse('Authentication required', 401)
  }

  const owner = await verifyOwnership(env.DB, agentName, walletAddress, editToken)
  if (!owner) {
    return errorResponse('Not authorized', 403)
  }

  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')

  if (sessionId) {
    // Fetch messages for a specific session
    const messages = await env.DB.prepare(
      `SELECT id, role, content, created_at FROM v3_chat_messages
       WHERE session_id = ?1 ORDER BY created_at ASC LIMIT 100`
    ).bind(sessionId).all()

    return json({ sessionId, messages: messages.results || [] })
  }

  // List sessions
  const sessions = await env.DB.prepare(
    `SELECT id, title, status, created_at, updated_at FROM v3_chat_sessions
     WHERE owner_username = ?1 AND agent_name = ?2
     ORDER BY updated_at DESC LIMIT 20`
  ).bind(owner.username, agentName).all()

  return json({ sessions: sessions.results || [] })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
