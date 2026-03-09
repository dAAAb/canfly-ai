/**
 * Cloudflare Pages Function — Runway Avatar session endpoint
 * POST /api/avatar/connect
 *
 * Creates a real-time session with the Runway Characters API.
 * API secret is stored in Cloudflare Pages env vars (never exposed to client).
 */

interface Env {
  RUNWAYML_API_SECRET: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const apiSecret = context.env.RUNWAYML_API_SECRET
  if (!apiSecret) {
    return Response.json({ error: 'RUNWAYML_API_SECRET not configured' }, { status: 500 })
  }

  let avatarId: string
  try {
    const body = await context.request.json() as { avatarId?: string }
    avatarId = body.avatarId || ''
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!avatarId) {
    return Response.json({ error: 'avatarId is required' }, { status: 400 })
  }

  try {
    // Create session via Runway API
    const res = await fetch('https://api.dev.runwayml.com/v1/realtime_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gwm1_avatars',
        options: { avatar: avatarId },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Runway API error:', res.status, errText)
      return Response.json(
        { error: 'Failed to create avatar session', detail: errText },
        { status: res.status }
      )
    }

    const session = await res.json() as {
      id: string
      url: string
      token: string
      room_name: string
    }

    return Response.json({
      sessionId: session.id,
      serverUrl: session.url,
      token: session.token,
      roomName: session.room_name,
    })
  } catch (err: any) {
    console.error('Avatar connect error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
