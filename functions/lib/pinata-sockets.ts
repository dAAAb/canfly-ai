/**
 * fetch-shim using `cloudflare:sockets` instead of the global fetch().
 *
 * Why: Pinata's CF zone rejects any incoming request carrying CF-Connecting-IP
 * (verified 2026-04-26). CF Workers' fetch() auto-injects that header on
 * cross-zone subrequests. Smart Shield docs note connect() and fetch() use
 * different egress paths — connect() is raw TCP without the auto-injection.
 * https://developers.cloudflare.com/smart-shield/configuration/dedicated-egress-ips/other-products/
 *
 * This module exposes a small `fetchViaSockets(url, init)` that talks
 * HTTP/1.1 over a TLS socket directly — no cf-* headers, request goes through.
 *
 * Limitations vs the real fetch:
 *   - HTTPS only (port 443 hard-coded)
 *   - HTTP/1.1 only, no HTTP/2
 *   - No automatic redirect following
 *   - Response body capped at 2 MB
 *   - Forces `Connection: close` so one TLS handshake per call
 *   - No streaming — buffers the entire body before returning
 *
 * For Pinata's API surface (small JSON responses) these are fine.
 */
import { connect } from 'cloudflare:sockets'

const RESPONSE_BODY_CAP = 2 * 1024 * 1024 // 2 MB
const SOCKET_TIMEOUT_MS = 25_000          // Pages Functions 30s budget

export async function fetchViaSockets(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const u = new URL(url)
  if (u.protocol !== 'https:') {
    throw new Error(`fetchViaSockets only supports https:// (got ${u.protocol})`)
  }

  const method = (init.method ?? 'GET').toUpperCase()
  const headersObj = normaliseHeaders(init.headers)
  let bodyBytes: Uint8Array | null = null
  if (init.body !== undefined && init.body !== null) {
    bodyBytes = await toBodyBytes(init.body)
  }

  // Build HTTP/1.1 request
  const reqLines: string[] = [`${method} ${u.pathname}${u.search} HTTP/1.1`]
  // Caller-supplied headers (preserve case as given)
  let hasHost = false
  let hasUserAgent = false
  let hasConnection = false
  let hasContentLength = false
  for (const [k, v] of Object.entries(headersObj)) {
    const lk = k.toLowerCase()
    if (lk === 'host') hasHost = true
    if (lk === 'user-agent') hasUserAgent = true
    if (lk === 'connection') hasConnection = true
    if (lk === 'content-length') hasContentLength = true
    reqLines.push(`${k}: ${v}`)
  }
  if (!hasHost) reqLines.push(`Host: ${u.hostname}`)
  if (!hasUserAgent) reqLines.push('User-Agent: CanFly/1.0 (+https://canfly.ai)')
  if (!hasConnection) reqLines.push('Connection: close')
  if (bodyBytes && !hasContentLength) {
    reqLines.push(`Content-Length: ${bodyBytes.byteLength}`)
  }

  const headBytes = new TextEncoder().encode(reqLines.join('\r\n') + '\r\n\r\n')
  const wireBytes = bodyBytes
    ? concatBytes(headBytes, bodyBytes)
    : headBytes

  const socket = connect(
    { hostname: u.hostname, port: 443 },
    { secureTransport: 'on', allowHalfOpen: false },
  )

  let timer: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`fetchViaSockets timed out after ${SOCKET_TIMEOUT_MS}ms`))
      socket.close().catch(() => { /* ignore */ })
    }, SOCKET_TIMEOUT_MS)
  })

  try {
    return await Promise.race([
      doRequestResponse(socket, wireBytes),
      timeoutPromise,
    ])
  } finally {
    if (timer) clearTimeout(timer)
    try { await socket.close() } catch { /* ignore */ }
  }
}

async function doRequestResponse(
  socket: ReturnType<typeof connect>,
  wireBytes: Uint8Array,
): Promise<Response> {
  // Send
  const writer = socket.writable.getWriter()
  await writer.write(wireBytes)
  await writer.close()

  // Read everything (Connection: close → server closes when done)
  const reader = socket.readable.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      total += value.byteLength
      if (total > RESPONSE_BODY_CAP) {
        throw new Error(`Response exceeded ${RESPONSE_BODY_CAP} byte cap`)
      }
    }
  }

  const all = concatChunks(chunks, total)
  return parseHttpResponse(all)
}

function parseHttpResponse(all: Uint8Array): Response {
  // Find header/body separator (\r\n\r\n) at byte level
  const sep = findHeaderBodySep(all)
  if (sep < 0) throw new Error('Malformed HTTP response: no header/body separator')
  const headBytes = all.subarray(0, sep)
  let bodyBytes = all.subarray(sep + 4)

  const headText = new TextDecoder().decode(headBytes)
  const lines = headText.split('\r\n')
  const statusLine = lines[0] || ''
  const m = statusLine.match(/^HTTP\/[\d.]+ (\d+)(?: (.*))?$/)
  if (!m) throw new Error(`Malformed status line: ${statusLine}`)
  const status = parseInt(m[1], 10)
  const statusText = m[2] ?? ''

  const headers = new Headers()
  let isChunked = false
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const colon = line.indexOf(':')
    if (colon > 0) {
      const k = line.slice(0, colon).trim()
      const v = line.slice(colon + 1).trim()
      const lk = k.toLowerCase()
      if (lk === 'transfer-encoding' && v.toLowerCase().includes('chunked')) {
        isChunked = true
        // Strip — Response constructor doesn't honor it for byte body
        continue
      }
      // Skip headers that Response will set itself / break on duplicate
      if (lk === 'content-length' || lk === 'connection') continue
      headers.append(k, v)
    }
  }

  if (isChunked) {
    bodyBytes = decodeChunked(bodyBytes)
  }

  return new Response(bodyBytes, { status, statusText, headers })
}

// ── helpers ──────────────────────────────────────────────────────────

function normaliseHeaders(h: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!h) return out
  if (h instanceof Headers) {
    h.forEach((v, k) => { out[k] = v })
  } else if (Array.isArray(h)) {
    for (const [k, v] of h) out[k] = v
  } else {
    for (const [k, v] of Object.entries(h)) out[k] = v as string
  }
  return out
}

async function toBodyBytes(body: BodyInit): Promise<Uint8Array> {
  if (typeof body === 'string') {
    return new TextEncoder().encode(body)
  }
  if (body instanceof ArrayBuffer) return new Uint8Array(body)
  if (body instanceof Uint8Array) return body
  if (body instanceof Blob) {
    return new Uint8Array(await body.arrayBuffer())
  }
  if (body instanceof ReadableStream) {
    const reader = body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) { chunks.push(value); total += value.byteLength }
    }
    return concatChunks(chunks, total)
  }
  // URLSearchParams etc — fall back to string
  return new TextEncoder().encode(String(body))
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.byteLength + b.byteLength)
  out.set(a, 0)
  out.set(b, a.byteLength)
  return out
}

function concatChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.byteLength
  }
  return out
}

function findHeaderBodySep(b: Uint8Array): number {
  for (let i = 0; i + 3 < b.length; i++) {
    if (b[i] === 13 && b[i + 1] === 10 && b[i + 2] === 13 && b[i + 3] === 10) {
      return i
    }
  }
  return -1
}

function decodeChunked(b: Uint8Array): Uint8Array {
  const out: number[] = []
  let i = 0
  const td = new TextDecoder()
  while (i < b.length) {
    // Read chunk size line up to \r\n
    let lineEnd = -1
    for (let j = i; j + 1 < b.length; j++) {
      if (b[j] === 13 && b[j + 1] === 10) { lineEnd = j; break }
    }
    if (lineEnd < 0) break
    const sizeLine = td.decode(b.subarray(i, lineEnd))
    const sizeHex = sizeLine.split(';')[0].trim()
    const size = parseInt(sizeHex, 16)
    if (!Number.isFinite(size)) break
    if (size === 0) break
    i = lineEnd + 2
    for (let k = 0; k < size && i + k < b.length; k++) out.push(b[i + k])
    i += size + 2 // skip trailing \r\n
  }
  return Uint8Array.from(out)
}
