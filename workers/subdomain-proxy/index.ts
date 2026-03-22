/**
 * Wildcard Subdomain Proxy Worker
 *
 * Routes *.canfly.ai traffic to the canfly-ai Pages project.
 * Cloudflare Pages doesn't support wildcard custom domains,
 * so this Worker acts as a transparent proxy.
 *
 * Deploy: wrangler deploy -c workers/subdomain-proxy/wrangler.toml
 * Route:  *.canfly.ai/*
 */

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Rewrite hostname to the Pages deployment
    url.hostname = 'canfly-ai.pages.dev'

    // Forward the request, preserving method, headers, and body
    const proxyReq = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual',
    })

    // Pass the original Host header so the app can detect subdomains
    // Pages will receive the request; the app's JS reads window.location
    // which is set by the browser (original subdomain URL), not this proxy.
    const response = await fetch(proxyReq)

    // Return the response with the original headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  },
}
