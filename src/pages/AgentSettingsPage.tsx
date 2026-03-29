/**
 * AgentSettingsPage — CAN-277
 *
 * Agent management page with Telegram connection and delete deployment.
 * Route: /u/{username}/agents/{agentName}/settings  (or /agents/{agentName}/settings on subdomain)
 */
import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useHead } from '../hooks/useHead'
import { getApiAuthHeaders } from '../utils/apiAuth'
import Navbar from '../components/Navbar'
import GlassCard from '../components/GlassCard'
import TelegramConnectCard from '../components/TelegramConnectCard'
import {
  Settings,
  Trash2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  MessageSquare,
  ExternalLink,
  Key,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react'

interface AgentSettingsPageProps {
  subdomainUsername?: string
}

export default function AgentSettingsPage({ subdomainUsername }: AgentSettingsPageProps) {
  const { username: paramUsername, agentName: paramAgentName } = useParams<{ username: string; agentName: string }>()
  const username = subdomainUsername || paramUsername || ''
  const agentName = paramAgentName || ''
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { walletAddress, isAuthenticated, login, getAccessToken } = useAuth()

  useHead({ title: `${t('settings.pageTitle')} — ${agentName}` })

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // API Key regeneration
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [newApiKey, setNewApiKey] = useState<string | null>(null)
  const [zeaburInjected, setZeaburInjected] = useState(false)
  const [zeaburInjectError, setZeaburInjectError] = useState<string | null>(null)
  const [regenError, setRegenError] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)

  const getAuthHeaders = useCallback(
    () => getApiAuthHeaders({ getAccessToken, walletAddress }),
    [getAccessToken, walletAddress],
  )

  const handleRegenerateKey = useCallback(async () => {
    setRegenerating(true)
    setRegenError(null)
    setNewApiKey(null)
    setZeaburInjected(false)
    setZeaburInjectError(null)

    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/regenerate-key`, {
        method: 'POST',
        headers: await getAuthHeaders(),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || `Failed (${res.status})`)
      }
      const data = (await res.json()) as { apiKey: string; zeaburInjected?: boolean; zeaburError?: string }
      setNewApiKey(data.apiKey)
      setZeaburInjected(!!data.zeaburInjected)
      if (data.zeaburError) setZeaburInjectError(data.zeaburError)
    } catch (err) {
      setRegenError((err as Error).message)
    } finally {
      setRegenerating(false)
    }
  }, [agentName, getAuthHeaders, t])

  const handleDelete = useCallback(async () => {
    if (deleteConfirmText !== agentName) return
    setDeleting(true)
    setDeleteError(null)

    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/delete-deployment`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || `Delete failed (${res.status})`)
      }

      // Redirect to user profile
      if (subdomainUsername) {
        navigate('/')
      } else {
        navigate(`/u/${username}`)
      }
    } catch (err) {
      setDeleteError((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }, [agentName, deleteConfirmText, getAuthHeaders, navigate, username, subdomainUsername])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <Settings className="w-16 h-16 text-gray-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">{t('settings.loginRequired')}</h1>
          <p className="text-gray-400 mb-8">{t('settings.loginDescription')}</p>
          <button
            onClick={login}
            className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            {t('settings.loginButton')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Back link */}
        <button
          onClick={() => navigate(subdomainUsername ? `/agent/${agentName}` : `/u/${username}/agent/${agentName}`)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('settings.backToAgent')}
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            {t('settings.pageTitle')} — {agentName}
          </h1>
          <p className="text-gray-400 text-sm">{t('settings.pageDescription')}</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => navigate(subdomainUsername ? `/chat/${agentName}` : `/u/${username}/chat/${agentName}`)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors text-sm"
          >
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            {t('settings.openChat')}
          </button>
          <button
            onClick={() => navigate(subdomainUsername ? `/agent/${agentName}` : `/u/${username}/agent/${agentName}`)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4 text-cyan-400" />
            {t('settings.viewProfile')}
          </button>
        </div>

        {/* Telegram Connection */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            {t('settings.integrationsTitle')}
          </h2>
          <TelegramConnectCard agentName={agentName} />
        </div>

        {/* API Key Management */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
            {t('settings.apiKeyTitle', 'API Key')}
          </h2>
          <GlassCard className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white">
                  {t('settings.regenTitle', 'CanFly API Key')}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {t('settings.regenDescription', 'Your agent uses this key to authenticate with the CanFly API. It\'s stored as CANFLY_API_KEY in the agent\'s environment variables. Regenerate if compromised or if your agent was created before auto-injection was available.')}
                </p>

                {newApiKey ? (
                  <div className="mt-3 space-y-2">
                    {zeaburInjected ? (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-xs text-green-400">
                          ✅ {t('settings.regenAutoInjected', 'API key regenerated and automatically deployed to your Zeabur service. The agent is restarting now.')}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-xs text-yellow-400 mb-2">
                          ⚠️ {t('settings.regenManual', 'API key regenerated, but could not auto-inject into Zeabur. Copy the key and set it manually.')}
                        </p>
                        {zeaburInjectError && (
                          <p className="text-[11px] text-yellow-400/60 mb-2">Reason: {zeaburInjectError}</p>
                        )}
                      </div>
                    )}
                    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                      <p className="text-[11px] text-gray-400 mb-1.5">
                        {t('settings.regenKeyCopy', 'Your new API key (save it — shown only once):')}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono text-cyan-300 bg-black/40 px-3 py-2 rounded-lg break-all select-all">
                          {newApiKey}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(newApiKey)
                            setKeyCopied(true)
                            setTimeout(() => setKeyCopied(false), 2000)
                          }}
                          className="shrink-0 p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 transition-colors"
                        >
                          {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {!zeaburInjected && (
                      <p className="text-[11px] text-gray-500">
                        {t('settings.regenEnvHint', 'Set this as CANFLY_API_KEY in your agent\'s environment variables (Zeabur Dashboard → Service → Variables).')}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {regenError && (
                      <p className="text-xs text-red-400 mt-2">{regenError}</p>
                    )}
                    {!showRegenConfirm ? (
                      <button
                        onClick={() => setShowRegenConfirm(true)}
                        className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-sm font-medium transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" /> {t('settings.regenBtn', 'Regenerate API Key')}
                      </button>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <p className="text-xs text-yellow-400">
                            ⚠️ {t('settings.regenConfirm', 'The old API key will stop working immediately. Your agent will be restarted with the new key.')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRegenerateKey}
                            disabled={regenerating}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white disabled:text-gray-500 text-sm font-medium transition-colors"
                          >
                            {regenerating ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> {t('settings.regenerating', 'Regenerating...')}</>
                            ) : (
                              <><RefreshCw className="w-4 h-4" /> {t('settings.regenConfirmBtn', 'Yes, Regenerate')}</>
                            )}
                          </button>
                          <button
                            onClick={() => setShowRegenConfirm(false)}
                            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
                          >
                            {t('settings.cancel', 'Cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Danger Zone */}
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3">
            {t('settings.dangerZone')}
          </h2>
          <GlassCard className="p-5 !border-red-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white">{t('settings.deleteTitle')}</h3>
                <p className="text-xs text-gray-400 mt-1">{t('settings.deleteDescription')}</p>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="mt-3 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
                  >
                    {t('settings.deleteBtn')}
                  </button>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-300">
                        {t('settings.deleteWarning', { agentName })}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        {t('settings.deleteConfirmLabel', { agentName })}
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={agentName}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:outline-none focus:border-red-500/50 transition-colors"
                      />
                    </div>
                    {deleteError && (
                      <p className="text-xs text-red-400">{deleteError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleDelete}
                        disabled={deleteConfirmText !== agentName || deleting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
                      >
                        {deleting ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> {t('settings.deleting')}</>
                        ) : (
                          <><Trash2 className="w-3.5 h-3.5" /> {t('settings.confirmDelete')}</>
                        )}
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteError(null) }}
                        className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors"
                      >
                        {t('settings.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
