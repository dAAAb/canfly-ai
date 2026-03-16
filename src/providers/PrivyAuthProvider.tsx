import { PrivyProvider } from '@privy-io/react-auth'

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID

export default function PrivyAuthProvider({ children }: { children: React.ReactNode }) {
  // Skip Privy entirely if no app ID configured (local dev without Privy)
  if (!PRIVY_APP_ID) {
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
