import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { ShieldCheck } from 'lucide-react'

interface ClaimProfileButtonProps {
  username: string
  onClaimed: (editToken: string) => void
}

/** Verification level hierarchy for display */
const LEVEL_CONFIG = {
  worldid: { emoji: '🌍', labelKey: 'claim.levelWorldId' },
  wallet: { emoji: '🔗', labelKey: 'claim.levelWallet' },
  email: { emoji: '📧', labelKey: 'claim.levelEmail' },
} as const

export default function ClaimProfileButton({ username, onClaimed }: ClaimProfileButtonProps) {
  const { t } = useTranslation()
  const { isAuthenticated, ready, login, worldIdLevel, walletAddress } = useAuth()
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine the best verification level from Privy auth state
  function getVerificationLevel(): 'worldid' | 'wallet' | 'email' {
    if (worldIdLevel) return 'worldid'
    if (walletAddress) return 'wallet'
    return 'email'
  }

  async function handleClaim() {
    if (!isAuthenticated) {
      login()
      return
    }

    setClaiming(true)
    setError(null)

    const verificationLevel = getVerificationLevel()

    try {
      const res = await fetch(`/api/community/users/${username}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletAddress || undefined,
          verificationLevel,
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error || 'Claim failed')
      }

      const data = await res.json() as { editToken: string }

      // Clear stale edit tokens, then store the new one
      try {
        const staleKeys: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.startsWith('canfly_edit_token_')) staleKeys.push(key)
        }
        staleKeys.forEach((k) => localStorage.removeItem(k))
      } catch { /* localStorage not available */ }
      localStorage.setItem(`canfly_edit_token_${username}`, data.editToken)
      onClaimed(data.editToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed')
    } finally {
      setClaiming(false)
    }
  }

  const currentLevel = isAuthenticated && ready ? getVerificationLevel() : null

  return (
    <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/40 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm mb-1">
            {t('claim.title', 'Claim this profile')}
          </h3>
          <p className="text-gray-400 text-xs mb-3">
            {t('claim.description', 'Is this you? Verify your identity to claim ownership of this profile.')}
          </p>

          {/* Trust level info */}
          <div className="space-y-1.5 mb-4">
            {(Object.keys(LEVEL_CONFIG) as Array<keyof typeof LEVEL_CONFIG>).map((level) => {
              const config = LEVEL_CONFIG[level]
              const isActive = currentLevel === level
              return (
                <div
                  key={level}
                  className={`flex items-center gap-2 text-xs ${
                    isActive ? 'text-green-400' : 'text-gray-500'
                  }`}
                >
                  <span>{config.emoji}</span>
                  <span>{t(config.labelKey)}</span>
                  {isActive && <span className="text-green-500">←</span>}
                </div>
              )
            })}
          </div>

          {error && (
            <p className="text-red-400 text-xs mb-3">{error}</p>
          )}

          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {claiming
              ? t('claim.claiming', 'Claiming...')
              : isAuthenticated
                ? t('claim.claimNow', 'Claim Profile')
                : t('claim.loginFirst', 'Sign in to Claim')}
          </button>
        </div>
      </div>
    </div>
  )
}
