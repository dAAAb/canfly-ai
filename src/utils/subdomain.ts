/** Apex host. DNS is case-insensitive; the wordmark stays CanFly.ai. */
export const MAIN_DOMAIN = 'canfly.ai'

/**
 * Hosts that must never be treated as a user showcase subdomain.
 * Keep this list in sync with `workers/subdomain-proxy` + `workers/profile`.
 */
export const RESERVED_SUBDOMAINS = new Set([
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

/** Strip a port so `peter.canfly.ai:8788` still detects as a user host. */
function hostnameOnly(hostname: string): string {
  return hostname.split(':')[0].toLowerCase()
}

/**
 * Detect a user showcase subdomain such as `peter.canfly.ai`.
 * Returns the subdomain label (lowercased) or null for the apex / reserved hosts.
 */
export function detectSubdomain(hostname: string): string | null {
  const host = hostnameOnly(hostname)
  if (host === MAIN_DOMAIN || host === `www.${MAIN_DOMAIN}`) return null
  const suffix = `.${MAIN_DOMAIN}`
  if (!host.endsWith(suffix)) return null
  const sub = host.slice(0, -suffix.length)
  if (!sub || sub.includes('.') || RESERVED_SUBDOMAINS.has(sub)) return null
  return sub
}

export function isUserSubdomain(hostname: string): boolean {
  return detectSubdomain(hostname) !== null
}

/** Public share host, preserving the profile's display-case username. */
export function profileSubdomainHost(username: string): string {
  return `${username.replace(/^@/, '')}.${MAIN_DOMAIN}`
}

/** `https://peter.canfly.ai/` — the share URL we want people to remember. */
export function profileSubdomainUrl(username: string, path = '/'): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `https://${profileSubdomainHost(username)}${suffix === '/' ? '/' : suffix}`
}

/** Path-style fallback used on the apex site and in JSON-LD sameAs. */
export function profilePathUrl(username: string, path = ''): string {
  const clean = username.replace(/^@/, '')
  const suffix = path && !path.startsWith('/') ? `/${path}` : path
  return `https://${MAIN_DOMAIN}/u/${clean}${suffix}`
}
