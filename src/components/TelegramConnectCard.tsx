/**
 * TelegramConnectCard — CAN-274
 *
 * Card component for connecting a Telegram bot to an agent.
 * Shows current connection status and a form to enter the BotFather token.
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import GlassCard from './GlassCard'
import { Send, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react'

interface TelegramStatus {
  connected: boolean
  status: 'none' | 'active' | 'failed' | 'pending'
  botUsername?: string | null
  error?: string | null
}

interface Props {
  agentName: string
}

const TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]{35,}$/

export default function TelegramConnectCard({ agentName }: Props) {
  const { t } = useTranslation()
  const { walletAddress } = useAuth()
  const [status, setStatus] = useState<TelegramStatus>({ connected: false, status: 'none' })
  const [botToken, setBotToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check current connection status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/connect-telegram`)
        if (res.ok) {
          const data = await res.json()
          setStatus(data as TelegramStatus)
        }
      } catch {
        // Silently fail — assume not connected
      } finally {
        setChecking(false)
      }
    }
    checkStatus()
  }, [agentName])

  const handleConnect = async () => {
    const token = botToken.trim()
    if (!TOKEN_PATTERN.test(token)) {
      setError(t('dashboard.telegram.invalidToken'))
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/connect-telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(walletAddress ? { 'X-Wallet-Address': walletAddress } : {}),
        },
        body: JSON.stringify({ botToken: token }),
      })

      const data = await res.json() as {
        connected?: boolean
        status?: string
        botUsername?: string
        error?: string
        message?: string
      }

      if (res.ok && data.connected) {
        setStatus({ connected: true, status: 'active', botUsername: data.botUsername })
        setSuccess(t('dashboard.telegram.successMsg', { botUsername: data.botUsername || 'bot' }))
        setBotToken('')
      } else {
        setError(data.error || data.message || 'Connection failed')
        setStatus({ connected: false, status: 'failed', error: data.error })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <GlassCard className="p-5">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          <span className="text-sm text-gray-400">Checking Telegram status...</span>
        </div>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Send className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">{t('dashboard.telegram.title')}</h3>
          <p className="text-xs text-gray-500">{t('dashboard.telegram.description')}</p>
        </div>
        {/* Status badge */}
        {status.status === 'active' && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/15 px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" />
            {t('dashboard.telegram.statusActive')}
          </span>
        )}
        {status.status === 'failed' && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/15 px-2.5 py-1 rounded-full">
            <XCircle className="w-3 h-3" />
            {t('dashboard.telegram.statusFailed')}
          </span>
        )}
      </div>

      {/* Active connection */}
      {status.connected && status.botUsername && (
        <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-300">
            {t('dashboard.telegram.successTitle')}
          </p>
          <p className="text-xs text-green-400/70 mt-1">
            @{status.botUsername}
          </p>
          <a
            href={`https://t.me/${status.botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors"
          >
            Open in Telegram <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Token input form (show when not connected) */}
      {!status.connected && (
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              {t('dashboard.telegram.botTokenLabel')}
            </label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => {
                setBotToken(e.target.value)
                setError(null)
              }}
              placeholder={t('dashboard.telegram.botTokenPlaceholder')}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors"
              disabled={loading}
            />
            <p className="text-[11px] text-gray-600 mt-1">
              {t('dashboard.telegram.botTokenHelp')}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs text-green-400">{success}</p>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={loading || !botToken.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('dashboard.telegram.connecting')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t('dashboard.telegram.connectBtn')}
              </>
            )}
          </button>
        </div>
      )}
    </GlassCard>
  )
}
