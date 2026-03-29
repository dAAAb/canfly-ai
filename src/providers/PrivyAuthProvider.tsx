import { createContext, useMemo, useCallback } from 'react'
import { PrivyProvider, usePrivy } from '@privy-io/react-auth'

export type WorldIdLevel = null | 'device' | 'orb'

export interface AuthValue {
  user: ReturnType<typeof usePrivy>['user'] | null
  isAuthenticated: boolean
  ready: boolean
  login: () => void
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | null>
  worldIdLevel: WorldIdLevel
  walletAddress: string | null
}

const NOOP = () => {}
const NOOP_ASYNC = () => Promise.resolve()
const NOOP_TOKEN = () => Promise.resolve(null as string | null)

const defaultAuth: AuthValue = {
  user: null,
  isAuthenticated: false,
  ready: true,
  login: NOOP,
  logout: NOOP_ASYNC,
  getAccessToken: NOOP_TOKEN,
  worldIdLevel: null,
  walletAddress: null,
}

export const AuthContext = createContext<AuthValue>(defaultAuth)

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || 'cmmsdn6om01vo0cl4gowxmydu'

/** Bridge that reads Privy state and provides it via our own AuthContext.
 *  Only rendered inside <PrivyProvider>. */
function PrivyAuthBridge({ children }: { children: React.ReactNode }) {
  const privy = usePrivy()

  const user = privy.user
  const isAuthenticated = privy.authenticated && privy.ready

  const worldIdLevel: WorldIdLevel = (() => {
    if (!user?.linkedAccounts) return null
    const worldId = user.linkedAccounts.find(
      (account) => account.type === 'cross_app' || account.type === 'custom_auth',
    )
    if (!worldId) return null
    const meta = worldId as Record<string, unknown>
    if (meta.verificationLevel === 'orb' || meta.credential_type === 'orb') return 'orb'
    return 'device'
  })()

  const walletAddress: string | null = (() => {
    if (!user?.linkedAccounts) return null
    const wallet = user.linkedAccounts.find((account) => account.type === 'wallet')
    if (wallet && 'address' in wallet) return (wallet as { address: string }).address
    return null
  })()

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      return await privy.getAccessToken()
    } catch {
      return null
    }
  }, [privy])

  const value = useMemo<AuthValue>(() => ({
    user,
    isAuthenticated,
    ready: privy.ready,
    login: privy.login,
    logout: privy.logout,
    getAccessToken,
    worldIdLevel,
    walletAddress,
  }), [user, isAuthenticated, privy.ready, privy.login, privy.logout, getAccessToken, worldIdLevel, walletAddress])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default function PrivyAuthProvider({ children }: { children: React.ReactNode }) {
  // Skip Privy entirely if no app ID configured (local dev without Privy)
  if (!PRIVY_APP_ID) {
    return <AuthContext.Provider value={defaultAuth}>{children}</AuthContext.Provider>
  }

  // Skip Privy on subdomains (e.g. daaab.canfly.ai) — Privy doesn't support wildcard origins.
  // Subdomains are public-only showcase pages; login happens on canfly.ai.
  const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  const isSubdomain = host.endsWith('.canfly.ai') && host !== 'www.canfly.ai'
  if (isSubdomain) {
    return <AuthContext.Provider value={defaultAuth}>{children}</AuthContext.Provider>
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#0ea5e9',
          logo: undefined,
        },
      }}
    >
      <PrivyAuthBridge>{children}</PrivyAuthBridge>
    </PrivyProvider>
  )
}
