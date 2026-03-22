import { PrivyProvider } from '@privy-io/react-auth'

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || 'cmmsdn6om01vo0cl4gowxmydu'

export default function PrivyAuthProvider({ children }: { children: React.ReactNode }) {
  // Skip Privy entirely if no app ID configured (local dev without Privy)
  if (!PRIVY_APP_ID) {
    return <>{children}</>
  }

  // Skip Privy on subdomains (e.g. daaab.canfly.ai) — Privy doesn't support wildcard origins.
  // Subdomains are public-only showcase pages; login happens on canfly.ai.
  const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  const isSubdomain = host.endsWith('.canfly.ai') && host !== 'www.canfly.ai'
  if (isSubdomain) {
    return <>{children}</>
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
        // Let Privy Dashboard control login methods (wallet, email, google)
      }}
    >
      {children}
    </PrivyProvider>
  )
}
