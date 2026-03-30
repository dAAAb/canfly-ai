/**
 * BindZeaburPage — Deep bind existing Zeabur lobster
 *
 * 3-step wizard for binding a pre-existing OpenClaw lobster on Zeabur.
 * Route: /u/{username}/agents/bind
 *
 * Steps:
 *   1. Select which Canfly agent to bind
 *   2. Enter Zeabur API Key
 *   3. Paste Gateway Token / URL / AI prompt → scan & bind
 */
import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useHead } from '../hooks/useHead'
import { getApiAuthHeaders } from '../utils/apiAuth'
import Navbar from '../components/Navbar'
import GlassCard from '../components/GlassCard'
import {
  Link2,
  Key,
  Bot,
  Check,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'

interface AgentOption {
  name: string
  display_name: string | null
  bio: string | null
}

interface BindZeaburPageProps {
  subdomainUsername?: string
}

export default function BindZeaburPage({ subdomainUsername }: BindZeaburPageProps) {
  const { username: paramUsername } = useParams<{ username: string }>()
  const username = subdomainUsername || paramUsername || ''
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { walletAddress, isAuthenticated, login, getAccessToken } = useAuth()

  useHead({ title: t('bind.pageTitle', 'Bind Zeabur Lobster') })

  const [step, setStep] = useState(1)

  // Step 1: Agent selection
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  // Step 2: Zeabur API Key
  const [zeaburApiKey, setZeaburApiKey] = useState('')
  const [keyValidating, setKeyValidating] = useState(false)
  const [keyValid, setKeyValid] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)

  // Step 3: Token + Bind
  const [tokenInput, setTokenInput] = useState('')
  const [binding, setBinding] = useState(false)
  const [bindError, setBindError] = useState<string | null>(null)
  const [bindResult, setBindResult] = useState<{
    zeaburProjectName?: string
    zeaburServiceName?: string
    deployUrl?: string
  } | null>(null)

  const getAuthHeaders = useCallback(
    () => getApiAuthHeaders({ getAccessToken, walletAddress }),
    [getAccessToken, walletAddress],
  )

  // Fetch user's unbound agents
  useEffect(() => {
    if (!username || !isAuthenticated) return
    ;(async () => {
      try {
        const headers = await getAuthHeaders()
        // Get all agents owned by user
        const res = await fetch(`/api/community/users/${encodeURIComponent(username)}`, { headers })
        const data = await res.json() as { agents?: Array<{ name: string; display_name: string | null; bio: string | null }> }
        // Get deployments to filter out already-bound agents
        const depRes = await fetch(`/api/zeabur/deploy?owner=${encodeURIComponent(username)}`, { headers })
        const depData = await depRes.json() as { deployments?: Array<{ agent_name: string; status: string }> }
        const boundNames = new Set(
          (depData.deployments || [])
            .filter(d => d.status === 'running' || d.status === 'deploying')
            .map(d => d.agent_name)
        )
        setAgents((data.agents || []).filter(a => !boundNames.has(a.name)))
      } catch { /* ignore */ } finally {
        setLoadingAgents(false)
      }
    })()
  }, [username, isAuthenticated, getAuthHeaders])

  // Validate Zeabur API Key
  const validateKey = useCallback(async () => {
    if (!zeaburApiKey.trim()) return
    setKeyValidating(true)
    setKeyError(null)
    try {
      const res = await fetch('/api/zeabur/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zeaburApiKey: zeaburApiKey.trim(), query: 'query { me { _id username } }' }),
      })
      if (!res.ok) throw new Error('Invalid API key')
      const data = await res.json() as { data?: { me?: { username?: string } } }
      if (!data.data?.me?.username) throw new Error('Invalid API key')
      setKeyValid(true)
    } catch {
      setKeyError(t('bind.keyError', 'Invalid Zeabur API key'))
    } finally {
      setKeyValidating(false)
    }
  }, [zeaburApiKey, t])

  // Bind
  const handleBind = useCallback(async () => {
    if (!selectedAgent || !zeaburApiKey.trim() || !tokenInput.trim()) return
    setBinding(true)
    setBindError(null)
    setBindResult(null)
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(selectedAgent)}/bind-zeabur`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ zeaburApiKey: zeaburApiKey.trim(), gatewayToken: tokenInput.trim() }),
      })
      const data = await res.json() as Record<string, unknown>
      if (!res.ok) throw new Error((data.error as string) || `Bind failed (${res.status})`)
      setBindResult(data as { zeaburProjectName?: string; zeaburServiceName?: string; deployUrl?: string })
    } catch (err) {
      setBindError((err as Error).message)
    } finally {
      setBinding(false)
    }
  }, [selectedAgent, zeaburApiKey, tokenInput, getAuthHeaders])

  const STEPS = [
    { icon: Bot, labelKey: 'bind.step1Label' },
    { icon: Key, labelKey: 'bind.step2Label' },
    { icon: Link2, labelKey: 'bind.step3Label' },
  ]

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <Link2 className="w-16 h-16 text-gray-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">{t('bind.loginRequired', 'Login to bind')}</h1>
          <p className="text-gray-400 mb-8">{t('bind.loginDesc', 'Connect your wallet to bind an existing Zeabur lobster.')}</p>
          <button onClick={login} className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors">
            {t('bind.loginBtn', 'Connect Wallet')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">{t('bind.pageTitle', 'Bind Zeabur Lobster')}</h1>
          <p className="text-gray-400">{t('bind.pageDesc', 'Connect an existing OpenClaw lobster on Zeabur to your Canfly agent.')}</p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => {
            const stepNum = i + 1
            const Icon = s.icon
            const isActive = !bindResult && step === stepNum
            const isComplete = bindResult ? true : step > stepNum
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  isComplete
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : isActive
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-gray-800 text-gray-500 border border-gray-700'
                }`}>
                  {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[11px] text-center ${isActive ? 'text-cyan-400' : isComplete ? 'text-green-400' : 'text-gray-600'}`}>
                  {t(s.labelKey)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Success */}
        {bindResult && (
          <GlassCard>
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">{t('bind.successTitle', 'Binding Complete!')}</h2>
              <p className="text-gray-400 text-sm mb-4">
                {t('bind.successDesc', {
                  serviceName: bindResult.zeaburServiceName,
                  projectName: bindResult.zeaburProjectName,
                  defaultValue: `Bound "${bindResult.zeaburServiceName}" from "${bindResult.zeaburProjectName}".`,
                })}
              </p>
              {bindResult.deployUrl && (
                <a href={bindResult.deployUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm mb-6">
                  {bindResult.deployUrl} <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => navigate(`/u/${username}/agent/${selectedAgent}/chat`)}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-500 transition-colors"
                >
                  {t('bind.goChat', 'Chat with lobster')}
                </button>
                <button
                  onClick={() => navigate(`/u/${username}/agent/${selectedAgent}/settings`)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  {t('bind.goSettings', 'Settings')}
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Step Content */}
        {!bindResult && (
          <GlassCard>
            {/* Step 1: Select Agent */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">{t('bind.step1Title', 'Select Agent')}</h2>
                <p className="text-sm text-gray-400">{t('bind.step1Desc', 'Choose which Canfly agent to bind to your Zeabur lobster.')}</p>

                {loadingAgents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm mb-3">{t('bind.noAgents', 'No unbound agents found.')}</p>
                    <button
                      onClick={() => navigate(`/u/${username}/agents/new`)}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
                    >
                      {t('bind.registerAgent', 'Register New Agent')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agents.map(a => (
                      <button
                        key={a.name}
                        onClick={() => setSelectedAgent(a.name)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                          selectedAgent === a.name
                            ? 'border-cyan-500 bg-cyan-500/10 text-white'
                            : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium text-sm">{a.display_name || a.name}</div>
                        {a.bio && <div className="text-xs text-gray-500 mt-0.5 truncate">{a.bio}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Zeabur API Key */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">{t('bind.step2Title', 'Zeabur API Key')}</h2>
                <p className="text-sm text-gray-400">{t('bind.step2Desc', 'Enter your Zeabur API key to allow Canfly to scan your services.')}</p>
                <div>
                  <input
                    type="password"
                    value={zeaburApiKey}
                    onChange={e => { setZeaburApiKey(e.target.value); setKeyValid(false); setKeyError(null) }}
                    placeholder={t('bind.apiKeyPlaceholder', 'sk-...')}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
                  />
                  <p className="text-[11px] text-gray-600 mt-1.5">
                    {t('bind.apiKeyHelp', 'Zeabur Dashboard → Settings → API Keys')}
                  </p>
                </div>
                {keyError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" /> {keyError}
                  </div>
                )}
                {keyValid && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" /> {t('bind.keyValid', 'API key verified!')}
                  </div>
                )}
                {!keyValid && (
                  <button
                    onClick={validateKey}
                    disabled={keyValidating || !zeaburApiKey.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {keyValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    {t('bind.verifyKey', 'Verify Key')}
                  </button>
                )}
              </div>
            )}

            {/* Step 3: Token + Bind */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">{t('bind.step3Title', 'Paste Gateway Info')}</h2>
                <p className="text-sm text-gray-400">{t('bind.step3Desc', 'Copy any of these from your Zeabur service page: Gateway Token, Web UI URL, or the "Copy AI Prompt" text.')}</p>
                <div>
                  <textarea
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    placeholder={t('bind.tokenPlaceholder', 'Paste Gateway Token, Web UI URL, or AI prompt text...')}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors text-sm resize-none"
                  />
                  <p className="text-[11px] text-gray-600 mt-1.5">
                    {t('bind.tokenHelp', 'All three formats from the Zeabur service page are recognized.')}
                  </p>
                </div>
                {bindError && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {bindError}
                  </div>
                )}
                <button
                  onClick={handleBind}
                  disabled={binding || !tokenInput.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {binding ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('bind.scanning', 'Scanning Zeabur services...')}</>
                  ) : (
                    <><Link2 className="w-4 h-4" /> {t('bind.bindBtn', 'Bind Lobster')}</>
                  )}
                </button>
              </div>
            )}

            {/* Navigation */}
            {!bindResult && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
                {step > 1 ? (
                  <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors">
                    <ArrowLeft className="w-4 h-4" /> {t('bind.prev', 'Back')}
                  </button>
                ) : <div />}
                {step < 3 && (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    disabled={
                      (step === 1 && !selectedAgent) ||
                      (step === 2 && !keyValid)
                    }
                    className="flex items-center gap-1 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('bind.next', 'Next')} <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  )
}
