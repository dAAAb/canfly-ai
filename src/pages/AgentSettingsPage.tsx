/**
 * AgentSettingsPage — CAN-277
 *
 * Agent management page with Telegram connection and delete deployment.
 * Route: /u/{username}/agent/{agentName}/settings  (or /agent/{agentName}/settings on subdomain)
 */
import { useState, useCallback, useEffect } from 'react'
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
  Copy as CopyIcon,
  Server,
  AlertCircle,
  CheckCircle,
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

  // Clone/Backup
  const [hasDeployment, setHasDeployment] = useState(false)
  const [cloneServers, setCloneServers] = useState<Array<{ _id: string; name: string; provider: string }>>([])
  const [loadingServers, setLoadingServers] = useState(false)
  const [selectedCloneServer, setSelectedCloneServer] = useState<string | null>(null)
  const [cloning, setCloning] = useState(false)
  const [cloneId, setCloneId] = useState<string | null>(null)
  const [cloneStatus, setCloneStatus] = useState<string | null>(null)
  const [cloneMessage, setCloneMessage] = useState<string | null>(null)
  const [cloneResult, setCloneResult] = useState<{ agentName?: string; displayName?: string; deployUrl?: string } | null>(null)
  const [cloneError, setCloneError] = useState<string | null>(null)
  const [showAllServers, setShowAllServers] = useState(false)

  const getAuthHeaders = useCallback(
    () => getApiAuthHeaders({ getAccessToken, walletAddress }),
    [getAccessToken, walletAddress],
  )

  // Check if agent has a running deployment + load available servers
  useEffect(() => {
    if (!agentName || !isAuthenticated) return
    ;(async () => {
      try {
        const headers = await getAuthHeaders()
        const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/clone-zeabur`, { headers })
        if (res.ok) {
          const data = await res.json() as { servers?: Array<{ _id: string; name: string; provider: string }>; hasDeployment?: boolean }
          setHasDeployment(!!data.hasDeployment)
          const servers = data.servers || []
          setCloneServers(servers)
          if (servers.length > 0) setSelectedCloneServer(servers[servers.length - 1]._id)
        }
      } catch { /* ignore */ }
    })()
  }, [agentName, isAuthenticated, getAuthHeaders])

  const handleClone = useCallback(async () => {
    if (!selectedCloneServer) return
    setCloning(true)
    setCloneError(null)
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/clone-zeabur`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ targetServerNodeId: selectedCloneServer }),
      })
      const data = await res.json() as Record<string, unknown>
      if (!res.ok) throw new Error((data.error as string) || `Clone failed (${res.status})`)
      setCloneId(data.cloneId as string)
      setCloneStatus('cloning')
      setCloneMessage(t('settings.cloneStarted', 'Clone started, please wait...'))
    } catch (err) {
      setCloneError((err as Error).message)
      setCloning(false)
    }
  }, [agentName, selectedCloneServer, getAuthHeaders, t])

  // Poll clone status
  useEffect(() => {
    if (!cloneId || cloneStatus === 'running' || cloneStatus === 'failed') return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/agents/${encodeURIComponent(agentName)}/clone-zeabur?cloneId=${cloneId}`,
          { headers: await getAuthHeaders() },
        )
        const data = await res.json() as Record<string, unknown>
        setCloneStatus(data.status as string)
        if (data.status === 'running') {
          setCloneResult({
            agentName: data.agentName as string,
            displayName: data.displayName as string,
            deployUrl: data.deployUrl as string,
          })
          setCloning(false)
        } else if (data.status === 'failed') {
          setCloneError((data.error as string) || 'Clone failed')
          setCloning(false)
        } else {
          setCloneMessage((data.message as string) || 'Cloning in progress...')
        }
      } catch { /* retry on next interval */ }
    }, 5000)
    return () => clearInterval(interval)
  }, [cloneId, cloneStatus, agentName, getAuthHeaders])

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
            onClick={() => navigate(subdomainUsername ? `/agent/${agentName}/chat` : `/u/${username}/agent/${agentName}/chat`)}
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

        {/* Clone/Backup */}
        {hasDeployment && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
              {t('settings.cloneTitle', 'Backup / Clone')}
            </h2>
            <GlassCard className="p-5">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <CopyIcon className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-gray-400 text-sm">
                    {t('settings.cloneDesc', 'Clone this lobster (with all memory and config) to another server as a backup.')}
                  </p>

                  {cloneResult ? (
                    <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                        <CheckCircle className="w-4 h-4" />
                        {t('settings.cloneSuccess', 'Backup complete!')}
                      </div>
                      <p className="text-white text-sm font-medium">{cloneResult.displayName}</p>
                      {cloneResult.deployUrl && (
                        <a href={cloneResult.deployUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-cyan-400 hover:text-cyan-300">
                          {cloneResult.deployUrl}
                        </a>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => navigate(`/u/${username}/agent/${cloneResult.agentName}/chat`)}
                          className="px-3 py-1.5 bg-cyan-600/20 text-cyan-300 text-xs rounded-lg border border-cyan-700/40 hover:bg-cyan-600/30 transition-colors"
                        >
                          💬 {t('settings.cloneChat', 'Chat')}
                        </button>
                        <button
                          onClick={() => navigate(`/u/${username}/agent/${cloneResult.agentName}/settings`)}
                          className="px-3 py-1.5 bg-gray-600/20 text-gray-300 text-xs rounded-lg border border-gray-700/40 hover:bg-gray-600/30 transition-colors"
                        >
                          ⚙️ {t('settings.cloneSettings', 'Settings')}
                        </button>
                      </div>
                    </div>
                  ) : cloning ? (
                    <div className="flex items-center gap-2 text-purple-400 text-sm py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {cloneMessage || t('settings.cloneInProgress', 'Cloning in progress...')}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">
                          {t('settings.cloneServerLabel', 'Target Server')}
                        </label>
                        {loadingServers ? (
                          <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> {t('settings.cloneLoadingServers', 'Loading servers...')}
                          </div>
                        ) : cloneServers.length === 0 ? (
                          <p className="text-gray-500 text-sm">{t('settings.cloneNoServers', 'No servers available')}</p>
                        ) : (
                          <div className="space-y-1.5">
                            {/* Pre-selected server (always visible) */}
                            {selectedCloneServer && (() => {
                              const srv = cloneServers.find(s => s._id === selectedCloneServer)
                              return srv ? (
                                <button
                                  key={srv._id}
                                  className="w-full text-left px-3 py-2 rounded-lg border border-purple-500 bg-purple-500/10 text-white text-sm"
                                >
                                  <span className="flex items-center gap-2">
                                    <Server className="w-3.5 h-3.5 text-purple-400" />
                                    {srv.name} <span className="text-gray-500 text-xs">({srv.provider})</span>
                                  </span>
                                </button>
                              ) : null
                            })()}
                            {/* Toggle to show other servers */}
                            {cloneServers.length > 1 && (
                              <>
                                <button
                                  onClick={() => setShowAllServers(!showAllServers)}
                                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                  {showAllServers
                                    ? t('settings.cloneHideServers', 'Hide other servers')
                                    : t('settings.cloneShowServers', `Show all ${cloneServers.length} servers`)}
                                </button>
                                {showAllServers && cloneServers
                                  .filter(s => s._id !== selectedCloneServer)
                                  .map(srv => (
                                    <button
                                      key={srv._id}
                                      onClick={() => { setSelectedCloneServer(srv._id); setShowAllServers(false) }}
                                      className="w-full text-left px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600 text-sm transition-colors"
                                    >
                                      <span className="flex items-center gap-2">
                                        <Server className="w-3.5 h-3.5 text-gray-500" />
                                        {srv.name} <span className="text-gray-600 text-xs">({srv.provider})</span>
                                      </span>
                                    </button>
                                  ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {cloneError && (
                        <div className="flex items-center gap-2 text-red-400 text-sm">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {cloneError}
                        </div>
                      )}

                      <button
                        onClick={handleClone}
                        disabled={!selectedCloneServer}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <CopyIcon className="w-4 h-4" /> {t('settings.cloneBtn', 'Start Backup')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        )}

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
