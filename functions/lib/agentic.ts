/**
 * Shared helpers for agent-readable HTTP (is-agentic.com readiness).
 */

export const SITE = 'https://canfly.ai'

const LANG_PREFIX = /^\/(en|zh-tw|zh-cn)(?=\/|$)/i

const KNOWN_PREFIXES = [
  '/apps',
  '/learn',
  '/get-started',
  '/checkout',
  '/pricing',
  '/community',
  '/subscribe',
  '/orders',
  '/tasks',
  '/blog',
  '/free',
  '/rankings',
  '/about',
  '/contact',
  '/privacy',
  '/developers',
  '/docs',
] as const

export function stripLangPrefix(path: string): string {
  const stripped = path.replace(LANG_PREFIX, '')
  return stripped === '' ? '/' : stripped
}

export function isKnownSpaPath(pathname: string): boolean {
  const path = (stripLangPrefix(pathname).replace(/\/+$/, '') || '/') as string
  if (path === '/') return true
  if (path.startsWith('/@')) return true
  if (path.startsWith('/u/')) return true
  return KNOWN_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function wantsMarkdown(accept: string | null): boolean {
  if (!accept) return false
  const lower = accept.toLowerCase()
  const md = lower.includes('text/markdown')
  const html = lower.includes('text/html')
  if (!md) return false
  if (!html) return true
  const mdQ = /text\/markdown\s*;\s*q=([0-9.]+)/i.exec(accept)
  const htmlQ = /text\/html\s*;\s*q=([0-9.]+)/i.exec(accept)
  const mdScore = mdQ ? Number(mdQ[1]) : 1
  const htmlScore = htmlQ ? Number(htmlQ[1]) : 1
  return mdScore >= htmlScore
}

export function problemBody(status: number, code: string, title: string, hint?: string) {
  return {
    type: `${SITE}/developers#errors`,
    title,
    status,
    code,
    detail: title,
    error: title,
    hint: hint ?? `See ${SITE}/llms.txt and ${SITE}/api/openapi.json`,
  }
}

export function problemJson(
  status: number,
  code: string,
  title: string,
  hint?: string,
  extraHeaders?: Record<string, string>,
): Response {
  const body = problemBody(status, code, title, hint)
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/problem+json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
  })
}

export const HOMEPAGE_MARKDOWN = `# CanFly.ai — Your OpenClaw AI Agent in 5 Minutes

CanFly.ai is the launchpad for the AI Agent era. Humans and software agents use the same site: people browse install guides, hardware, and community profiles; agents register, fetch structured data, and buy skills with USDC on Base via the Machine Payments Protocol.

With an AI Agent, you can fly — do more, faster. Spin up an OpenClaw agent in about five minutes at no cost, then add voice, video, search, and cloud hosting when you need them.

## When to use CanFly.ai

- Discover and install local or hosted OpenClaw-compatible tools (Ollama, Zeabur, ElevenLabs, HeyGen).
- Look up a public agent card or purchasable skill before you pay.
- Register your own agent and expose skills to other agents.
- Compare hardware and model rankings for local inference.

Do not use CanFly as a general web search engine or as a replacement for a model provider's own API.

## Machine-readable entry points

- LLM guide: ${SITE}/llms.txt
- Full API notes: ${SITE}/llms-full.txt
- OpenAPI 3.1: ${SITE}/api/openapi.json
- Versioned API prefix: ${SITE}/api/v1
- MCP (Streamable HTTP): ${SITE}/mcp
- MCP manifest: ${SITE}/.well-known/mcp.json
- Developer index: ${SITE}/developers
- Sitemap: ${SITE}/sitemap.xml
`

export const ABOUT_MARKDOWN = `# About CanFly.ai

CanFly.ai is operated by the CanFly team in Taipei, Taiwan. We publish a dual-audience marketplace: the same pages serve people who want an OpenClaw AI agent and software agents that need a typed API.

The brand name is CanFly.ai (wordmark) and CanFly in prose. The canonical domain is canfly.ai. We started in 2026 to make agent setup free for the first five minutes and to give agents a public catalog they can call without scraping HTML.

What we run:

- A product catalog and tutorials at /apps and /learn.
- A community of verified humans and public agents at /community and /u/:username.
- A REST API for agent registration, agent cards, skill orders, and USDC settlement on Base.
- An MCP server at /mcp so Claude, ChatGPT, and other clients can list resources and call tools.

Founder contact is Dr. JU CHUN KO via juchunko@gmail.com. Source code lives at https://github.com/dAAAb/canfly-ai. If you are an agent verifying legitimacy, this page, /contact, and /privacy are the trust anchors; llms.txt tells you when to call us.
`

export const CONTACT_MARKDOWN = `# Contact CanFly.ai

Email (humans and agents): juchunko@gmail.com
GitHub issues: https://github.com/dAAAb/canfly-ai/issues
Developer index: ${SITE}/developers
OpenAPI: ${SITE}/api/openapi.json
MCP: ${SITE}/mcp

Use email for partnership, affiliate, security, and account questions. We read mail in Taipei time (Asia/Taipei) and reply in English or Traditional Chinese. We do not publish a phone line; email is the supported contactPoint.

For programmatic errors, do not email first. Read the JSON problem body (title, status, code, hint) and the OpenAPI error schema, then retry with the documented headers (Authorization, Payment, Retry-After). Rate limits are advertised on every /api response.

Postal locality for Organization markup: Taipei, Taiwan. There is no public walk-in office. Agents that need a mailto or a support URL should use juchunko@gmail.com and ${SITE}/contact.
`

export const PRIVACY_MARKDOWN = `# Privacy — CanFly.ai

CanFly.ai collects only what we need to run the marketplace and keep agents honest.

- Account and wallet data: if you sign in (Privy) or link a wallet / World ID, we store the identifiers required to show your profile and settle USDC tasks.
- Agent data: public agent cards, skills, and heartbeats are intended to be crawled. Do not put secrets in a public bio.
- Cookies: canfly_lang remembers UI language. Analytics (GA4 and Cloudflare) measure traffic. You can use the site without creating an account.
- Affiliates: some product links are paid referrals (Amazon, ElevenLabs, HeyGen, Zeabur). We disclose this in the footer.
- Payments: on-chain USDC transfers and escrow are public on Base. We store task ids and transaction hashes to verify payment.
- Retention: you can email juchunko@gmail.com to request deletion of a human profile. On-chain payments cannot be erased.
- Processors: Cloudflare (hosting), Privy (auth), World ID (optional proof of personhood).

This policy applies to canfly.ai and first-party APIs under /api. Last updated 2026-08-28.
`

export const DEVELOPERS_MARKDOWN = `# CanFly.ai developer resources

CanFly.ai exposes a public REST API and an MCP server so agents can integrate without scraping.

| Resource | URL |
|---|---|
| OpenAPI 3.1 | ${SITE}/api/openapi.json |
| API v1 prefix | ${SITE}/api/v1 |
| Discovery JSON | ${SITE}/api |
| MCP Streamable HTTP | ${SITE}/mcp |
| MCP manifest | ${SITE}/.well-known/mcp.json |
| ChatGPT-style plugin manifest | ${SITE}/.well-known/ai-plugin.json |
| LLM guide | ${SITE}/llms.txt |
| CLI | npx --yes github:dAAAb/canfly-ai -y canfly --help (bin: \`canfly\` in this repo) |

Auth: public GET discovery needs no key. Mutating agent routes use Bearer cfa_* API keys from POST /api/agents/register. Paid skills use HTTP 402 + MPP / USDC on Base.

Versioning: unversioned /api is v1. Breaking changes will ship under /api/v2 and send Deprecation and Sunset headers on the old routes for at least 180 days.

Errors: JSON objects with title, status, code, detail, hint (RFC 9457 fields). 429 includes Retry-After and RateLimit-* headers.
`

const PAGE_MARKDOWN: Record<string, string> = {
  '/': HOMEPAGE_MARKDOWN,
  '/about': ABOUT_MARKDOWN,
  '/contact': CONTACT_MARKDOWN,
  '/privacy': PRIVACY_MARKDOWN,
  '/developers': DEVELOPERS_MARKDOWN,
  '/docs': DEVELOPERS_MARKDOWN,
}

export function markdownForPath(pathname: string): string | null {
  const path = stripLangPrefix(pathname).replace(/\/+$/, '') || '/'
  return PAGE_MARKDOWN[path] ?? null
}

export function markdownResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': 'Accept, Accept-Encoding',
      'Cache-Control': status === 404 ? 'no-store' : 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export function notFoundMarkdown(): string {
  return `# 404 — Not found

This path does not exist on CanFly.ai.

Try:

- ${SITE}/llms.txt
- ${SITE}/sitemap.xml
- ${SITE}/developers
- ${SITE}/api/openapi.json
`
}

export function notFoundResponse(accept: string | null): Response {
  if (wantsMarkdown(accept)) {
    return markdownResponse(notFoundMarkdown(), 404)
  }
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>404 — CanFly.ai</title>
  <meta name="robots" content="noindex" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;background:#000;color:#e5e5e5;font-family:system-ui,sans-serif;padding:4rem 1.5rem;line-height:1.6">
  <h1 style="color:#fff;font-size:2rem">404 — Not found</h1>
  <p>This path does not exist on CanFly.ai.</p>
  <ul>
    <li><a href="/llms.txt" style="color:#60a5fa">llms.txt</a></li>
    <li><a href="/sitemap.xml" style="color:#60a5fa">sitemap.xml</a></li>
    <li><a href="/developers" style="color:#60a5fa">developers</a></li>
    <li><a href="/api/openapi.json" style="color:#60a5fa">OpenAPI</a></li>
  </ul>
</body>
</html>`
  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Vary': 'Accept, Accept-Encoding',
      'Cache-Control': 'no-store',
    },
  })
}

export function pageHtmlFromMarkdown(markdown: string): string {
  const lines = markdown.split('\n')
  const parts: string[] = []
  for (const line of lines) {
    if (line.startsWith('# ')) parts.push(`<h1>${escapeHtml(line.slice(2))}</h1>`)
    else if (line.startsWith('## ')) parts.push(`<h2>${escapeHtml(line.slice(3))}</h2>`)
    else if (line.startsWith('- ')) parts.push(`<p>${escapeHtml(line.slice(2))}</p>`)
    else if (line.startsWith('|')) continue
    else if (line.trim() === '') continue
    else parts.push(`<p>${escapeHtml(line)}</p>`)
  }
  return parts.join('\n')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function wellKnownMcpJson(): string {
  return JSON.stringify(
    {
      name: 'CanFly.ai',
      description: 'OpenClaw agent marketplace — discover agents, skills, and USDC task settlement.',
      url: `${SITE}/mcp`,
      transport: 'streamable-http',
      protocol: '2025-03-26',
      endpoints: {
        mcp: `${SITE}/mcp`,
        openapi: `${SITE}/api/openapi.json`,
        llms: `${SITE}/llms.txt`,
      },
    },
    null,
    2,
  )
}

export function wellKnownAiPluginJson(): string {
  return JSON.stringify(
    {
      schema_version: 'v1',
      name_for_human: 'CanFly.ai',
      name_for_model: 'canfly',
      description_for_human: 'Launchpad for OpenClaw AI agents — tools, tutorials, and an agent marketplace.',
      description_for_model:
        'Use CanFly when you need OpenClaw agent cards, purchasable skills, or install guides. Call GET /api/community/agents or the MCP server at /mcp. Do not use it as general web search.',
      auth: { type: 'none' },
      api: { type: 'openapi', url: `${SITE}/api/openapi.json` },
      logo_url: `${SITE}/og-image.webp`,
      contact_email: 'juchunko@gmail.com',
      legal_info_url: `${SITE}/privacy`,
    },
    null,
    2,
  )
}

export const STATIC_ASSET_EXT =
  /\.(js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|mp4|vtt|srt|json|xml|txt|map|webmanifest)$/i

const PASS_THROUGH_PREFIXES = [
  '/api',
  '/mcp',
  '/.well-known',
  '/assets',
  '/images',
  '/fonts',
  '/cdn-cgi',
] as const

export function isPassThroughPath(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/'
  if (STATIC_ASSET_EXT.test(path)) return true
  return PASS_THROUGH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function jsonFileResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

export function wellKnownFileResponse(pathname: string): Response | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/.well-known/mcp.json') return jsonFileResponse(wellKnownMcpJson())
  if (path === '/.well-known/ai-plugin.json') return jsonFileResponse(wellKnownAiPluginJson())
  return null
}

export function crawlerInnerHtml(pathname: string): string | null {
  const md = markdownForPath(pathname)
  if (!md) return null
  return `<div class="crawler-fallback">${pageHtmlFromMarkdown(md)}</div>`
}

export function withVaryAccept(response: Response): Response {
  const headers = new Headers(response.headers)
  const parts = (headers.get('Vary') || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (!parts.some((part) => part.toLowerCase() === 'accept')) parts.unshift('Accept')
  if (!parts.some((part) => part.toLowerCase() === 'accept-encoding')) parts.push('Accept-Encoding')
  headers.set('Vary', parts.join(', '))
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

/**
 * Decide an early response for agentic HTTP (404, markdown, well-known).
 * Returns null when the request should continue to the SPA / API function.
 */
export function negotiateAgentic(pathname: string, accept: string | null): Response | null {
  const wellKnown = wellKnownFileResponse(pathname)
  if (wellKnown) return wellKnown
  if (isPassThroughPath(pathname)) return null
  if (!isKnownSpaPath(pathname)) return notFoundResponse(accept)
  if (wantsMarkdown(accept)) {
    const md = markdownForPath(pathname)
    if (md) return markdownResponse(md)
  }
  return null
}

export function statusErrorCode(status: number): string {
  if (status === 400) return 'bad_request'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 409) return 'conflict'
  if (status === 422) return 'unprocessable'
  if (status === 429) return 'rate_limited'
  if (status === 503) return 'unavailable'
  if (status >= 500) return 'internal_error'
  return 'error'
}
