/**
 * GET /api/pinata/probe-sockets — One-shot diagnostic to test whether
 * `cloudflare:sockets` connect() bypasses Pinata's CF-Connecting-IP block.
 *
 * Hypothesis: per Cloudflare Smart Shield docs, `connect()` and `fetch()` use
 * different egress paths. `fetch()` from a Worker to a CF-protected origin
 * carries CF-Connecting-IP (auto-injected) → Pinata 403. `connect()` is raw
 * TCP without that auto-injection → maybe gets through.
 *
 * Auth: requires the same Privy/edit-token auth as other endpoints. We do NOT
 * accept arbitrary JWTs over the wire; we use juchunko@'s test JWT injected
 * via `PINATA_PROBE_JWT` env var so the probe can't be abused.
 *
 * Remove this file once we've decided whether to use sockets-based fetch in
 * production or stick with the external relay.
 */
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'
import { authenticateRequest } from '../_auth'
import { connect } from 'cloudflare:sockets'

interface ProbeEnv extends Env {
  PINATA_PROBE_JWT?: string
}

export const onRequestOptions: PagesFunction<ProbeEnv> = () => handleOptions()

export const onRequestGet: PagesFunction<ProbeEnv> = async ({ env, request }) => {
  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const jwt = env.PINATA_PROBE_JWT
  if (!jwt) {
    return errorResponse(
      'PINATA_PROBE_JWT secret not set — `wrangler pages secret put PINATA_PROBE_JWT --project-name=canfly-ai`',
      500,
    )
  }

  // Manually craft an HTTP/1.1 GET /v0/agents request and send it over a
  // TLS socket. We deliberately only set headers we care about — no cf-* —
  // so we can confirm whether Pinata's rule fires on something else.
  const reqLines = [
    'GET /v0/agents HTTP/1.1',
    'Host: agents.pinata.cloud',
    `Authorization: Bearer ${jwt}`,
    'User-Agent: CanFly/1.0 (sockets-probe)',
    'Accept: application/json',
    'Connection: close',
    '',
    '',
  ].join('\r\n')

  const startedAt = Date.now()
  let socket: ReturnType<typeof connect> | null = null
  try {
    socket = connect(
      { hostname: 'agents.pinata.cloud', port: 443 },
      { secureTransport: 'on' },
    )

    // Send request
    const writer = socket.writable.getWriter()
    await writer.write(new TextEncoder().encode(reqLines))
    await writer.close()

    // Read response
    const reader = socket.readable.getReader()
    let raw = ''
    while (raw.length < 65536) {
      const { value, done } = await reader.read()
      if (done) break
      raw += new TextDecoder().decode(value)
    }

    // Parse status line
    const firstLine = raw.split('\r\n', 1)[0] || ''
    const m = firstLine.match(/^HTTP\/[\d.]+ (\d+)/)
    const status = m ? parseInt(m[1], 10) : 0

    // Split headers / body
    const sep = raw.indexOf('\r\n\r\n')
    const head = sep > 0 ? raw.slice(0, sep) : raw
    const body = sep > 0 ? raw.slice(sep + 4) : ''

    return json({
      ok: true,
      durationMs: Date.now() - startedAt,
      probedHost: 'agents.pinata.cloud',
      transport: 'cloudflare:sockets connect() with TLS',
      status,
      isJson: body.trimStart().startsWith('{'),
      isHtmlChallenge: body.includes('<!DOCTYPE'),
      headSnippet: head.slice(0, 600),
      bodySnippet: body.slice(0, 400),
    })
  } catch (err) {
    return errorResponse(
      `Sockets probe failed: ${err instanceof Error ? err.message : String(err)}`,
      502,
    )
  } finally {
    try { await socket?.close() } catch { /* ignore */ }
  }
}
