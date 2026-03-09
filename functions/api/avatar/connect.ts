/**
 * Cloudflare Pages Function — Runway Avatar session endpoint
 * POST /api/avatar/connect
 *
 * 1. Creates a realtime session via Runway API
 * 2. Polls until session is READY (has sessionKey)
 * 3. Calls /consume to get LiveKit WebRTC credentials
 * 4. Returns full credentials { sessionId, serverUrl, token, roomName }
 */

interface Env {
  RUNWAYML_API_SECRET: string
}

const RUNWAY_API = 'https://api.dev.runwayml.com'
const RUNWAY_VERSION = '2024-11-06'

async function createSession(apiSecret: string, avatarId: string) {
  const res = await fetch(`${RUNWAY_API}/v1/realtime_sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiSecret}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': RUNWAY_VERSION,
    },
    body: JSON.stringify({
      model: 'gwm1_avatars',
      avatar: { type: 'custom', avatarId },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Create session failed: ${res.status} ${errText}`)
  }

  return (await res.json()) as { id: string }
}

async function getSession(apiSecret: string, sessionId: string) {
  const res = await fetch(`${RUNWAY_API}/v1/realtime_sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiSecret}`,
      'X-Runway-Version': RUNWAY_VERSION,
    },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Get session failed: ${res.status} ${errText}`)
  }

  return (await res.json()) as {
    id: string
    status: string
    sessionKey?: string
  }
}

async function waitForReady(apiSecret: string, sessionId: string, timeoutMs = 30000, pollMs = 1000) {
  const start = Date.now()

  while (true) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Session creation timed out')
    }

    const session = await getSession(apiSecret, sessionId)

    if (session.status === 'READY' && session.sessionKey) {
      return { sessionKey: session.sessionKey }
    }

    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(session.status)) {
      throw new Error(`Session ${session.status.toLowerCase()} before becoming ready`)
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs))
  }
}

async function consumeSession(sessionId: string, sessionKey: string) {
  const res = await fetch(`${RUNWAY_API}/v1/realtime_sessions/${sessionId}/consume`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionKey}`,
      'X-Runway-Version': RUNWAY_VERSION,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Consume session failed: ${res.status} ${errText}`)
  }

  return (await res.json()) as {
    url: string
    token: string
    roomName: string
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiSecret = context.env.RUNWAYML_API_SECRET
  if (!apiSecret) {
    return Response.json({ error: 'RUNWAYML_API_SECRET not configured' }, { status: 500 })
  }

  let avatarId: string
  try {
    const body = (await context.request.json()) as { avatarId?: string }
    avatarId = body.avatarId || ''
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!avatarId) {
    return Response.json({ error: 'avatarId is required' }, { status: 400 })
  }

  try {
    // Step 1: Create session
    const { id: sessionId } = await createSession(apiSecret, avatarId)

    // Step 2: Poll until READY (get sessionKey)
    const { sessionKey } = await waitForReady(apiSecret, sessionId)

    // Step 3: Consume — get LiveKit WebRTC credentials
    const { url, token, roomName } = await consumeSession(sessionId, sessionKey)

    // Step 4: Return full credentials to SDK
    return Response.json({
      sessionId,
      serverUrl: url,
      token,
      roomName,
    })
  } catch (err: any) {
    console.error('Avatar connect error:', err.message)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
