import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth, type WorldIdLevel } from '../hooks/useAuth'
import { walletGradient } from '../utils/walletGradient'
import { LogOut, User } from 'lucide-react'

const TRUST_BADGE: Record<string, { emoji: string; color: string }> = {
  orb: { emoji: '👁️', color: 'text-yellow-400' },
  device: { emoji: '🌍', color: 'text-blue-400' },
  wallet: { emoji: '🦊', color: 'text-purple-400' },
  none: { emoji: '👤', color: 'text-gray-400' },
}

function getBadge(worldIdLevel: WorldIdLevel, walletAddress: string | null) {
  if (worldIdLevel === 'orb') return TRUST_BADGE.orb
  if (worldIdLevel === 'device') return TRUST_BADGE.device
  if (walletAddress) return TRUST_BADGE.wallet
  return TRUST_BADGE.none
}

export default function AuthButton() {
  const { t } = useTranslation()
  const { isAuthenticated, ready, login, logout, user, worldIdLevel, walletAddress } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // For email users without localStorage token, resolve username via API
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(null)
  const lookupDone = useRef(false)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick as EventListener)
    return () => document.removeEventListener('mousedown', handleClick as EventListener)
  }, [])

  // Find the user's existing CanFly username from localStorage edit tokens
  const localUsername = (() => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('canfly_edit_token_')) {
        return key.replace('canfly_edit_token_', '')
      }
    }
    return null
  })()

  const privyId = user?.id

  useEffect(() => {
    if (localUsername || lookupDone.current) return
    if (!walletAddress && !privyId) return
    lookupDone.current = true

    const params = new URLSearchParams()
    if (walletAddress) params.set('address', walletAddress)
    if (privyId) params.set('privyId', privyId)

    fetch(`/api/community/lookup-wallet?${params.toString()}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && (data as { username?: string }).username) {
          setResolvedUsername((data as { username: string }).username)
        }
      })
      .catch(() => {})
  }, [localUsername, walletAddress, privyId])

  const ownUsername = localUsername || resolvedUsername
  const displayName = ownUsername || user?.google?.name || user?.email?.address?.split('@')[0] || 'User'

  // Not ready yet — show nothing
  if (!ready) return null

  // Not authenticated — show login button
  if (!isAuthenticated) {
    return (
      <button
        onClick={login}
        className="text-sm bg-sky-600/20 border border-sky-600 px-3 py-1.5 rounded-full hover:bg-sky-600/30 transition-all text-sky-400 hover:shadow-[0_0_16px_rgba(14,165,233,0.3)] cursor-pointer"
      >
        {t('auth.joinCommunity', 'Join Flight Community')}
      </button>
    )
  }

  // Authenticated — show pill badge with dropdown
  const badge = getBadge(worldIdLevel, walletAddress)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-white font-medium transition-all duration-200 hover:brightness-125 hover:scale-105 cursor-pointer"
        style={{ background: walletGradient(walletAddress) }}
      >
        <span className={badge.color}>{badge.emoji}</span>
        <span className="max-w-[120px] truncate">{displayName}</span>
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
          <a
            href={ownUsername ? `/u/${ownUsername}` : '/community/register'}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            onClick={() => setDropdownOpen(false)}
          >
            <User className="w-4 h-4" />
            {t('auth.profile', 'Profile')}
          </a>
          <button
            onClick={() => {
              setDropdownOpen(false)
              logout()
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            {t('auth.logout', 'Logout')}
          </button>
        </div>
      )}
    </div>
  )
}
