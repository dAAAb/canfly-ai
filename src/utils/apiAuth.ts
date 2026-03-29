/**
 * Unified API authentication headers builder (CAN-278)
 *
 * Sends the best available auth credential:
 *   1. Privy JWT (Authorization: Bearer) — cryptographically verified by backend
 *   2. Edit Token (X-Edit-Token) — DB-verified shared secret
 *   3. Wallet Address (X-Wallet-Address) — DEPRECATED fallback
 *
 * Usage:
 *   const { getAccessToken, walletAddress } = useAuth()
 *   const headers = await getApiAuthHeaders({ getAccessToken, walletAddress })
 *   fetch('/api/...', { headers })
 */

interface GetApiAuthHeadersOptions {
  /** Privy getAccessToken function from useAuth() */
  getAccessToken: () => Promise<string | null>
  /** Wallet address from useAuth() — sent as fallback hint */
  walletAddress: string | null
  /** Optional: override edit token lookup */
  editToken?: string | null
}

/** Find the user's edit token from localStorage */
function findEditToken(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('canfly_edit_token_')) {
        return localStorage.getItem(key)
      }
    }
  } catch {
    // localStorage not available (SSR, privacy mode)
  }
  return null
}

/**
 * Build authentication headers for CanFly API calls.
 *
 * Always includes Content-Type. Adds the best available auth:
 * - Privy JWT as Authorization: Bearer (if available)
 * - Edit token as X-Edit-Token (if JWT unavailable)
 * - Wallet address as X-Wallet-Address (always sent as hint for backward compat)
 */
export async function getApiAuthHeaders(
  options: GetApiAuthHeadersOptions,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Always send wallet address as hint (backend uses verified JWT wallet, not this)
  if (options.walletAddress) {
    headers['X-Wallet-Address'] = options.walletAddress
  }

  // Try Privy JWT first (best security)
  try {
    const token = await options.getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      return headers
    }
  } catch {
    // Privy not available, fall through
  }

  // Fallback: edit token from localStorage
  const editToken = options.editToken ?? findEditToken()
  if (editToken) {
    headers['X-Edit-Token'] = editToken
  }

  return headers
}
