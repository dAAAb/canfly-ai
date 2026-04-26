/**
 * Pinata API relay — Deno Deploy edge function (CAN-302)
 *
 * Why this exists:
 *   Pinata's Agents API (`agents.pinata.cloud`) sits behind Cloudflare Bot
 *   Management. Cloudflare Workers (which CanFly runs on) auto-attach a
 *   `CF-Connecting-IP` header to outbound subrequests, and Pinata's zone
 *   blocks any incoming request carrying that header with `403 error 1000`.
 *   Setting the header to any value (0.0.0.0, 1.1.1.1, etc.) doesn't help —
 *   Pinata's rule fires on presence, not value.
 *
 *   Verified 2026-04-26 via header bisection from local curl:
 *     - GET without CF-Connecting-IP → 200
 *     - GET with CF-Connecting-IP: <any value> → 403
 *
 *   Local curl works because consumer ISPs don't insert CF-Connecting-IP.
 *   Cloudflare's Worker runtime DOES on every outbound subrequest. There
 *   is no documented way to suppress this from the Worker side.
 *
 * Solution:
 *   This relay runs on Deno Deploy (NOT Cloudflare). It strips any cf-*
 *   headers from incoming requests and forwards everything else to
 *   agents.pinata.cloud. CanFly's Worker calls THIS, not Pinata directly.
 *
 * Deploy:
 *   1. Sign in at https://dash.deno.com (free, GitHub login)
 *   2. New Playground → paste this file → Save & Deploy
 *   3. Note the deployed URL, e.g. https://canfly-relay-abc123.deno.dev
 *   4. Set as Cloudflare Pages secret:
 *        npx wrangler pages secret put PINATA_RELAY_URL --project-name=canfly-ai
 *      (paste the deno.dev URL, NO trailing slash)
 *
 * Trust model:
 *   The relay sees every request body (including Pinata JWTs and
 *   OPENROUTER_API_KEY values being pushed into Pinata Secrets Vault).
 *   Deploy this on YOUR OWN Deno Deploy account. Don't use someone
 *   else's relay URL — they'd see all your secrets in flight.
 */

const PINATA_BASE = 'https://agents.pinata.cloud'

// Headers we drop entirely. cf-* are auto-injected by Cloudflare Workers
// upstream, and `host` would be set by Deno Deploy / fetch automatically
// from the target URL.
const STRIP_HEADERS = new Set([
  'host',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'cf-worker',
  'cf-warp-tag-id',
  'x-real-ip',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-forwarded-host',
  'x-vercel-id',
  'x-vercel-deployment-url',
])

// Optional: pin which Cloudflare Pages domain may use this relay. If set,
// requests from any other Origin are rejected. Leave unset for development.
const ALLOWED_ORIGIN = Deno.env.get('CANFLY_ORIGIN') // e.g. https://canfly.ai

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Health check
  if (url.pathname === '/' || url.pathname === '/health') {
    return new Response('canfly-pinata-relay ok\n', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    })
  }

  // Origin gating (optional)
  const origin = req.headers.get('Origin') || req.headers.get('Referer')
  if (ALLOWED_ORIGIN && origin && !origin.startsWith(ALLOWED_ORIGIN)) {
    return new Response(JSON.stringify({ error: 'origin not allowed' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    })
  }

  // Build outbound headers
  const out = new Headers()
  for (const [k, v] of req.headers) {
    if (STRIP_HEADERS.has(k.toLowerCase())) continue
    out.set(k, v)
  }
  // Always present so Pinata's CDN doesn't think we're a bot
  if (!out.has('user-agent')) {
    out.set('user-agent', 'CanFlyRelay/1.0 (+https://canfly.ai)')
  }

  const target = `${PINATA_BASE}${url.pathname}${url.search}`
  let body: BodyInit | null = null
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.arrayBuffer()
  }

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: out,
      body,
      redirect: 'manual',
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'relay upstream error', message: String(err) }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    )
  }

  // Pass through response. Strip set-cookie because we don't want Pinata's
  // cf cookies leaking back to CanFly's domain (would confuse browsers).
  const respHeaders = new Headers()
  for (const [k, v] of upstream.headers) {
    if (k.toLowerCase() === 'set-cookie') continue
    respHeaders.set(k, v)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  })
})
