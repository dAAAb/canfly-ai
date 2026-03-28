import { usePrivy } from '@privy-io/react-auth'

export type WorldIdLevel = null | 'device' | 'orb'

const NOOP = () => {}

/**
 * Safe auth hook — returns defaults when PrivyProvider is absent
 * (e.g. on subdomain pages where Privy is intentionally skipped).
 */
export function useAuth() {
  let privy: ReturnType<typeof usePrivy> | null = null
  try {
    privy = usePrivy()
  } catch {
    // PrivyProvider not in tree (subdomain case) — return safe defaults
    return {
      user: null,
      isAuthenticated: false,
      ready: true,
      login: NOOP,
      logout: NOOP,
      worldIdLevel: null as WorldIdLevel,
      walletAddress: null as string | null,
    }
  }

  const user = privy.user
  const isAuthenticated = privy.authenticated && privy.ready

  // Extract World ID verification level from linked accounts
  const worldIdLevel: WorldIdLevel = (() => {
    if (!user?.linkedAccounts) return null
    const worldId = user.linkedAccounts.find(
      (account) => account.type === 'cross_app' || account.type === 'custom_auth',
    )
    // World ID orb vs device verification is determined by the verification level
    // returned from the Privy cross-app or custom auth integration
    if (!worldId) return null
    // Check for orb-level verification in the account metadata
    const meta = worldId as Record<string, unknown>
    if (meta.verificationLevel === 'orb' || meta.credential_type === 'orb') return 'orb'
    return 'device'
  })()

  // Extract wallet address (embedded or external)
  const walletAddress: string | null = (() => {
    if (!user?.linkedAccounts) return null
    const wallet = user.linkedAccounts.find((account) => account.type === 'wallet')
    if (wallet && 'address' in wallet) return (wallet as { address: string }).address
    return null
  })()

  return {
    user,
    isAuthenticated,
    ready: privy.ready,
    login: privy.login,
    logout: privy.logout,
    worldIdLevel,
    walletAddress,
  }
}
