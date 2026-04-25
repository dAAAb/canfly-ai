/**
 * Pinata JWT extraction — CAN-302
 *
 * Pinata's "Copy All" button (on the API key creation modal) emits a single
 * line containing all three fields back-to-back with no separator:
 *
 *   "API Key: <20-hex-chars>API Secret: <64-hex-chars>JWT: eyJhbGc..."
 *
 * For the wizard we only need the JWT — sending the API Key/Secret to our
 * backend would be needless exposure. This util extracts just the JWT
 * client-side so the rest never leaves the browser.
 */

/**
 * Extract a Pinata JWT from raw user input.
 *
 * Accepts:
 *   1. A plain JWT: "eyJhbGc..."
 *   2. Pinata's "Copy All" blob (with or without whitespace separators)
 *   3. Anything containing the JWT pattern as a substring
 *
 * Returns the JWT string if found, otherwise null.
 *
 * Why a regex instead of parsing field labels:
 *   - JWTs always start with `eyJ` (base64url of `{"`)
 *   - Three base64url segments separated by literal `.`
 *   - Pinata's blob has no separators, so label-based parsing is brittle
 */
export function extractPinataJwt(input: string): string | null {
  if (!input) return null
  const m = input.match(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/)
  return m ? m[0] : null
}

/**
 * Mask a JWT for safe display in the UI: "eyJ...<last 6 chars>".
 * Don't pass anything other than a JWT here.
 */
export function maskJwt(jwt: string): string {
  if (!jwt || jwt.length < 16) return ''
  return `eyJ…${jwt.slice(-6)}`
}
