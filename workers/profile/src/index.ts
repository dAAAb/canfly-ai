/**
 * Wildcard Subdomain Proxy Worker
 *
 * Routes: *.canfly.ai/* → canfly.ai/u/{subdomain}/*
 * Proxies to the main site's /u/ routes so the SPA handles rendering.
 */

export interface Env {}

const MAIN_DOMAIN = 'canfly.ai'
const ORIGIN = `https://${MAIN_DOMAIN}`

// Subdomains that should NOT be proxied
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'mail',
  'smtp',
  'imap',
  'pop',
  'ftp',
  'cdn',
  'staging',
  'dev',
  'admin',
  'dashboard',
])

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const host = url.hostname.toLowerCase()

    // Don't proxy the main domain itself
    if (host === MAIN_DOMAIN || host === `www.${MAIN_DOMAIN}`) {
      return fetch(request)
    }

    // Extract subdomain: "dAAAb.canfly.ai" → "dAAAb"
    const suffix = `.${MAIN_DOMAIN}`
    if (!host.endsWith(suffix)) {
      return fetch(request)
    }

    const subdomain = host.slice(0, -suffix.length)

    // Skip reserved subdomains
    if (!subdomain || subdomain.includes('.') || RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
      return fetch(request)
    }

    // Rewrite: dAAAb.canfly.ai/agent/X → canfly.ai/u/dAAAb/agent/X
    //          dAAAb.canfly.ai/         → canfly.ai/u/dAAAb
    const pathSuffix = url.pathname === '/' ? '' : url.pathname
    const targetUrl = `${ORIGIN}/u/${subdomain}${pathSuffix}${url.search}`

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual',
    })

    // Override Host header so the origin sees the right domain
    proxyRequest.headers.set('Host', MAIN_DOMAIN)
    // Pass original host for the app to know it's a subdomain request
    proxyRequest.headers.set('X-Forwarded-Host', host)

    const response = await fetch(proxyRequest)

    // Rewrite any redirects that point to /u/username back to subdomain
    const location = response.headers.get('Location')
    if (location) {
      const rewritten = rewriteLocationHeader(location, subdomain, host)
      if (rewritten !== location) {
        const newHeaders = new Headers(response.headers)
        newHeaders.set('Location', rewritten)
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        })
      }
    }

    return response
  },
}

function rewriteLocationHeader(location: string, subdomain: string, originalHost: string): string {
  // Rewrite absolute redirects: https://canfly.ai/u/dAAAb/... → https://dAAAb.canfly.ai/...
  const prefix = `${ORIGIN}/u/${subdomain}`
  if (location.startsWith(prefix)) {
    const rest = location.slice(prefix.length) || '/'
    return `https://${originalHost}${rest}`
  }
  return location
}
