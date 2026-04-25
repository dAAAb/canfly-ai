/**
 * TelegramConnectCard — CAN-274
 *
 * Card component for connecting a Telegram bot to an agent.
 * Shows current connection status and a form to enter the BotFather token.
 */
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { getApiAuthHeaders } from '../utils/apiAuth'
import GlassCard from './GlassCard'
import { Send, CheckCircle, XCircle, Loader2, ExternalLink, Key, Unlink, Clock } from 'lucide-react'

interface TelegramStatus {
  connected: boolean
  status: 'none' | 'active' | 'failed' | 'pending'
  botUsername?: string | null
  error?: string | null
}

interface Props {
  agentName: string
  /**
   * Which deploy backend this lobster lives on. Determines which API
   * endpoints to call.
   *   - 'zeabur' (default): existing OpenClaw runtime, full pairing-code flow
   *   - 'pinata': Pinata Agents — POST /api/agents/:name/pinata-telegram, no
   *               pairing step (Pinata side handles auth itself)
   */
  provider?: 'zeabur' | 'pinata'
}

const TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]{35,}$/

export default function TelegramConnectCard({ agentName, provider = 'zeabur' }: Props) {
  // Endpoint paths differ per provider. Pinata routes go through a thin
  // CanFly proxy that calls Pinata's channels API on the user's behalf
  // (using the JWT we already have stored encrypted in v3_pinata_deployments).
  const connectEndpoint = provider === 'pinata'
    ? `/api/agents/${encodeURIComponent(agentName)}/pinata-telegram`
    : `/api/agents/${encodeURIComponent(agentName)}/connect-telegram`
  const { t } = useTranslation()
  const { walletAddress, getAccessToken } = useAuth()
  const [status, setStatus] = useState<TelegramStatus>({ connected: false, status: 'none' })
  const [botToken, setBotToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pairingStep, setPairingStep] = useState(false) // show pairing code input
  const [pairingCode, setPairingCode] = useState('')
  const [approvingPairing, setApprovingPairing] = useState(false)
  const [pairingSuccess, setPairingSuccess] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  // Check current connection status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(connectEndpoint)
        if (res.ok) {
          const data = await res.json() as TelegramStatus
          setStatus(data)
          // Zeabur flow has a pairing-code step after token submit.
          // Pinata flow goes straight to active on success — no pairing.
          if (provider === 'zeabur' && data.status === 'pending' && data.botUsername) {
            setPairingStep(true)
          }
        }
      } catch {
        // Silently fail — assume not connected
      } finally {
        setChecking(false)
      }
    }
    checkStatus()
  }, [agentName, connectEndpoint, provider])

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
      const res = await fetch(connectEndpoint, {
        method: 'POST',
        headers: await getApiAuthHeaders({ getAccessToken, walletAddress }),
        body: JSON.stringify({ botToken: token }),
      })

      const data = await res.json() as {
        connected?: boolean
        status?: string
        botUsername?: string
        error?: string
        message?: string
      }

      // Zeabur returns status='pending' (waiting for pairing code).
      // Pinata returns status='active' directly (channel handshake is server-side).
      if (res.ok && (data.status === 'pending' || data.status === 'active')) {
        setStatus({
          connected: data.status === 'active',
          status: data.status as 'pending' | 'active',
          botUsername: data.botUsername,
        })
        // Pairing only applies to Zeabur (pending state). Pinata jumps to active.
        if (provider === 'zeabur') {
          setPairingStep(true)
        }
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

  // Get auth headers
  const getAuthHeaders = useCallback(
    () => getApiAuthHeaders({ getAccessToken, walletAddress }),
    [getAccessToken, walletAddress],
  )

  // Approve pairing code — calls the dedicated endpoint which runs
  // `openclaw pairing approve telegram <code>` via executeCommand.
  const handleApprovePairing = useCallback(async () => {
    const code = pairingCode.trim().toUpperCase()
    if (!code || code.length < 4) return
    setApprovingPairing(true)
    setError(null)

    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/telegram-approve`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ pairingCode: code }),
      })
      // Read the body as text first so a non-JSON 5xx (timeout, worker crash)
      // surfaces the real status + snippet instead of collapsing into a vague
      // "Network error".
      const raw = await res.text()
      let data: { approved?: boolean; error?: string } = {}
      try { data = JSON.parse(raw) } catch { /* non-JSON body */ }
      if (res.ok && data.approved) {
        setPairingSuccess(true)
        setPairingStep(false)
        setStatus(prev => ({ ...prev, connected: true, status: 'active' }))
        setSuccess(t('dashboard.telegram.pairingSuccess', 'Pairing approved! You can now chat on Telegram.'))
      } else {
        setError(data.error || `Pairing failed (${res.status}): ${raw.slice(0, 200) || 'empty response'}`)
      }
    } catch (err) {
      setError(`Network error while approving pairing: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setApprovingPairing(false)
    }
  }, [agentName, pairingCode, getAuthHeaders, t])

  // Disconnect — removes the bot from the lobster config and clears the DB row.
  const handleDisconnect = useCallback(async () => {
    if (!confirm(t('dashboard.telegram.disconnectConfirm', 'Disconnect the Telegram bot from this agent?'))) return
    setDisconnecting(true)
    setError(null)
    try {
      const res = await fetch(connectEndpoint, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      })
      if (res.ok) {
        setStatus({ connected: false, status: 'none' })
        setPairingStep(false)
        setPairingCode('')
        setPairingSuccess(false)
        setSuccess(null)
        setBotToken('')
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error || 'Disconnect failed')
      }
    } catch {
      setError('Network error while disconnecting.')
    } finally {
      setDisconnecting(false)
    }
  }, [connectEndpoint, getAuthHeaders, t])

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
        {status.status === 'pending' && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            {t('dashboard.telegram.statusPending', 'Waiting for pairing')}
          </span>
        )}
        {status.status === 'failed' && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/15 px-2.5 py-1 rounded-full">
            <XCircle className="w-3 h-3" />
            {t('dashboard.telegram.statusFailed')}
          </span>
        )}
      </div>

      {/* Pairing step — after bot connected, before fully paired */}
      {pairingStep && status.botUsername && (
        <div className="mt-3 space-y-3">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm text-blue-300 font-medium mb-2">
              ✅ {t('dashboard.telegram.botConnected', 'Bot connected!')} @{status.botUsername}
            </p>
            <div className="space-y-2 text-xs text-gray-400">
              <p>1️⃣ {t('dashboard.telegram.pairingStep1', 'Open Telegram and find your bot:')}</p>
              <a
                href={`https://t.me/${status.botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                @{status.botUsername} <ExternalLink className="w-3 h-3" />
              </a>
              <p>2️⃣ {t('dashboard.telegram.pairingStep2', 'Send /start to the bot')}</p>
              <p>3️⃣ {t('dashboard.telegram.pairingStep3', 'Copy the pairing code the bot gives you and paste it below:')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={pairingCode}
              onChange={(e) => { setPairingCode(e.target.value.toUpperCase()); setError(null) }}
              placeholder="e.g. ABC12DEF"
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 font-mono tracking-wider"
              disabled={approvingPairing}
            />
            <button
              onClick={handleApprovePairing}
              disabled={approvingPairing || pairingCode.trim().length < 4}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              {approvingPairing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              {t('dashboard.telegram.approveBtn', 'Approve')}
            </button>
          </div>
          {error && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 space-y-2">
              <p className="text-xs text-red-400">{error}</p>
              {/* Escape hatch: if the bot is actually responding on Telegram
                  but our approve call keeps timing out, let the user confirm
                  it manually so they aren't stuck. The endpoint marks the
                  row 'active' without rerunning the CLI. */}
              <button
                onClick={async () => {
                  setApprovingPairing(true); setError(null)
                  try {
                    const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/telegram-approve`, {
                      method: 'PATCH',
                      headers: await getAuthHeaders(),
                      body: JSON.stringify({ confirmWorking: true }),
                    })
                    const data = await res.json().catch(() => ({})) as { approved?: boolean; error?: string }
                    if (res.ok && data.approved) {
                      setPairingSuccess(true); setPairingStep(false)
                      setStatus(prev => ({ ...prev, connected: true, status: 'active' }))
                      setSuccess(t('dashboard.telegram.pairingSuccess', 'Marked as active.'))
                    } else {
                      setError(data.error || 'Could not mark as active.')
                    }
                  } catch (err) {
                    setError(`Failed to mark as active: ${err instanceof Error ? err.message : String(err)}`)
                  } finally { setApprovingPairing(false) }
                }}
                disabled={approvingPairing}
                className="text-xs text-amber-400 hover:text-amber-300 underline disabled:opacity-50"
              >
                {t('dashboard.telegram.markActiveBtn', "Bot responds on Telegram? Click to mark as active")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active connection — fully paired */}
      {status.connected && status.botUsername && !pairingStep && (
        <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-sm text-green-300">
            {pairingSuccess ? '🎉 ' : ''}{t('dashboard.telegram.successTitle')}
          </p>
          <p className="text-xs text-green-400/70 mt-1">
            @{status.botUsername}
          </p>
          {success && <p className="text-xs text-green-400 mt-1">{success}</p>}
          <div className="flex items-center gap-3 mt-2">
            <a
              href={`https://t.me/${status.botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Open in Telegram <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
              {t('dashboard.telegram.disconnectBtn', 'Disconnect')}
            </button>
          </div>
        </div>
      )}

      {/* Disconnect link during pending pairing — so user can bail out */}
      {status.status === 'pending' && pairingStep && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
            {t('dashboard.telegram.disconnectBtn', 'Disconnect')}
          </button>
        </div>
      )}

      {/* Token input form — only when there's no existing connection to work with. */}
      {(status.status === 'none' || status.status === 'failed') && !pairingStep && (
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
