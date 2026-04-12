import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, type WorldIdLevel } from '../hooks/useAuth'
import { walletGradient } from '../utils/walletGradient'
import { LogOut, User } from 'lucide-react'

/**
 * Session flag so we only auto-redirect a logged-in user to the register page
 * once per browser session. If they intentionally leave register without
 * finishing, we don't keep dragging them back.
 */
const AUTO_REDIRECT_FLAG = 'canfly_register_autoredirect_done'

/** Paths where we must NOT auto-redirect (avoids loops / breaks legit flows). */
function shouldAutoRedirect(pathname: string): boolean {
  // Normalize to lowercase and strip /:lang prefix (en, zh-tw, zh-cn)
  const p = pathname.toLowerCase().replace(/^\/(en|zh-tw|zh-cn)(\/|$)/, '/')

  // Already on register (any lang) — no loop
  if (p === '/community/register' || p.startsWith('/community/register/')) return false
  // Profile edit pages handle their own auth
  if (/^\/u\/[^/]+\/edit\/?$/.test(p)) return false
  // Agent deploy / settings / register — don't interrupt wizards
  if (/^\/u\/[^/]+\/agents?\//.test(p)) return false
  if (/^\/u\/[^/]+\/agent\//.test(p)) return false
  // Task / paperclip pages
  if (/^\/u\/[^/]+\/(tasks|paperclip)/.test(p)) return false
  // Checkout / tasks result
  if (p.startsWith('/checkout') || p.startsWith('/tasks/')) return false
  // Orders dashboard
  if (p === '/orders' || p.startsWith('/orders/')) return false

  return true
}

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
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Resolve the current user's CanFly username via API (authoritative source)
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(null)
  const lookupDone = useRef(false)
  const prevWalletRef = useRef<string | null>(null)

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
  // Only used as a fast hint before API responds; API result takes precedence
  const localUsername = (() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('canfly_edit_token_')) {
          return key.replace('canfly_edit_token_', '')
        }
      }
    } catch { /* localStorage not available */ }
    return null
  })()

  const privyId = user?.id

  // Re-lookup when wallet/privy changes (e.g. after switching accounts)
  useEffect(() => {
    const walletChanged = walletAddress !== prevWalletRef.current
    if (walletChanged) {
      lookupDone.current = false
      setResolvedUsername(null)
      prevWalletRef.current = walletAddress
    }

    if (lookupDone.current) return
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
  }, [walletAddress, privyId])

  // API result is authoritative; localStorage is only a fast hint before API responds
  const ownUsername = resolvedUsername || localUsername
  const isLookingUp = !lookupDone.current || (!resolvedUsername && !localUsername && (!!walletAddress || !!privyId))
  const displayName = ownUsername || (isLookingUp ? null : (user?.google?.name || user?.email?.address?.split('@')[0] || 'User'))

  // Auto-redirect new users (no CanFly profile found) to the register page.
  // Runs only once per browser session, and only on safe paths.
  useEffect(() => {
    if (!isAuthenticated || !ready) return
    if (isLookingUp) return           // wait for lookup to finish
    if (ownUsername) return            // user already has a profile
    if (!walletAddress && !privyId) return // nothing to tie back to a profile

    try {
      if (sessionStorage.getItem(AUTO_REDIRECT_FLAG) === '1') return
    } catch { /* sessionStorage not available */ }

    if (!shouldAutoRedirect(location.pathname)) return

    try { sessionStorage.setItem(AUTO_REDIRECT_FLAG, '1') } catch { /* ignore */ }
    navigate('/community/register', { replace: false })
  }, [isAuthenticated, ready, isLookingUp, ownUsername, walletAddress, privyId, location.pathname, navigate])

  // Clear the one-shot redirect flag on logout so a future login can redirect again.
  useEffect(() => {
    if (!isAuthenticated) {
      try { sessionStorage.removeItem(AUTO_REDIRECT_FLAG) } catch { /* ignore */ }
    }
  }, [isAuthenticated])

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
        {displayName
          ? <span className="max-w-[120px] truncate">{displayName}</span>
          : <span className="inline-block w-16 h-4 bg-white/20 rounded animate-pulse" />
        }
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
