/**
 * DeployWizardPage — CAN-277
 *
 * 5-step wizard for deploying an OpenClaw agent to Zeabur.
 * Route: /u/{username}/deploy  (or /deploy on subdomain)
 *
 * Steps:
 *   1. Enter Zeabur API Key → verify via "me" query
 *   2. Select Server (auto-list from Zeabur)
 *   3. Enter AI Hub Key (OpenClaw gateway token)
 *   4. Choose agent name + bio
 *   5. One-click deploy → progress → done
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
  Key,
  Server,
  Bot,
  Rocket,
  Check,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
} from 'lucide-react'

/* ── Types ──────────────────────────────────────── */

interface ZeaburProject {
  _id: string
  name: string
}

interface ZeaburServer {
  _id: string
  name: string
  provider: string
  ip: string
  projects?: ZeaburProject[]
}

type ServerStatus = 'empty' | 'has-canfly' | 'has-other'

interface ServerWithStatus extends ZeaburServer {
  status: ServerStatus
  canalyAgentName?: string // agent name if has-canfly
}

/** Health check component — polls chat API until the agent is ready */
function WakingUpCheck({ agentName, username, navigate, t, getAuthHeaders }: {
  agentName: string; username: string; navigate: (path: string) => void;
  t: (key: string, fallback?: string) => string; getAuthHeaders: () => Promise<Record<string, string>>
}) {
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const maxAttempts = 20 // ~60s

    const check = async () => {
      try {
        const res = await fetch(`/api/agents/${encodeURIComponent(agentName)}/chat`, {
          method: 'POST',
          headers: await getAuthHeaders(),
          body: JSON.stringify({ message: 'ping' }),
          signal: AbortSignal.timeout(10000),
        })
        if (res.ok && !cancelled) {
          setReady(true)
          setChecking(false)
          return
        }
      } catch { /* not ready yet */ }

      attempts++
      if (attempts < maxAttempts && !cancelled) {
        setTimeout(check, 3000)
      } else if (!cancelled) {
        setChecking(false) // give up waiting, show buttons anyway
      }
    }

    // Start checking after 5s delay (give server time to restart)
    setTimeout(check, 5000)
    return () => { cancelled = true }
  }, [agentName, getAuthHeaders])

  if (checking) {
    return (
      <>
        <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
          <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
        </div>
        <h2 className="text-lg font-semibold text-white">{t('deploy.wakingUp', '🦞 Lobster is waking up...')}</h2>
        <p className="text-sm text-gray-400">{t('deploy.wakingUpDesc', 'Setting up AI model and configuration. This takes about 30-60 seconds.')}</p>
      </>
    )
  }

  return (
    <>
      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-green-400" />
      </div>
      <h2 className="text-lg font-semibold text-white">
        {ready ? t('deploy.successTitle', '🎉 Lobster is ready!') : t('deploy.successTitle')}
      </h2>
      <p className="text-sm text-gray-400">
        {ready ? t('deploy.successDesc') : t('deploy.mayNeedMoment', 'Your lobster may need another moment to fully wake up.')}
      </p>
      <div className="flex gap-3 justify-center pt-2">
        <button
          onClick={() => navigate(`/u/${username}/chat/${encodeURIComponent(agentName)}`)}
          className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
        >
          {t('deploy.goToChat')}
        </button>
        <button
          onClick={() => navigate(`/u/${username}/agents/${encodeURIComponent(agentName)}/settings`)}
          className="px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors border border-gray-700"
        >
          {t('deploy.goToSettings')}
        </button>
      </div>
    </>
  )
}

interface DeployWizardPageProps {
  subdomainUsername?: string
}

type WizardStep = 1 | 2 | 3 | 4 | 5

const STEPS = [
  { icon: Key, labelKey: 'deploy.step1Label' },     // 1: Zeabur API Key
  { icon: Bot, labelKey: 'deploy.step4Label' },     // 2: Name your lobster
  { icon: Key, labelKey: 'deploy.step3Label' },     // 3: AI Hub Key
  { icon: Server, labelKey: 'deploy.step2Label' },  // 4: Select server
  { icon: Rocket, labelKey: 'deploy.step5Label' },  // 5: Deploy
]

const ZEABUR_PROXY = '/api/zeabur/proxy'

/* ── Component ──────────────────────────────────── */

export default function DeployWizardPage({ subdomainUsername }: DeployWizardPageProps) {
  const { username: paramUsername } = useParams<{ username: string }>()
  const username = subdomainUsername || paramUsername || ''
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAuthenticated, login, walletAddress, getAccessToken } = useAuth()

  useHead({ title: t('deploy.pageTitle') })

  const [step, setStep] = useState<WizardStep>(1)
  const [zeaburApiKey, setZeaburApiKey] = useState('')
  const [verifyingKey, setVerifyingKey] = useState(false)
  const [keyValid, setKeyValid] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)

  const [servers, setServers] = useState<ZeaburServer[]>([])
  const [loadingServers, setLoadingServers] = useState(false)
  const [selectedServer, setSelectedServer] = useState<string | null>(null)

  const [aiHubKey, setAiHubKey] = useState('')

  const [agentDisplayName, setAgentDisplayName] = useState('')
  const [agentBio, setAgentBio] = useState('')
  const [nameChecking, setNameChecking] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)

  /** Convert display name to URL slug: lowercase + digits + hyphens only */
  const toSlug = (s: string): string =>
    s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-').slice(0, 40).replace(/-+$/, '')

  const agentSlug = toSlug(agentDisplayName)

  const [deploying, setDeploying] = useState(false)
  const [deploymentId, setDeploymentId] = useState<string | null>(null)
  const [deployStatus, setDeployStatus] = useState<string | null>(null)
  const [zeaburStatus, setZeaburStatus] = useState<string | null>(null)
  const [deployAgentName, setDeployAgentName] = useState<string | null>(null)
  const [deployError, setDeployError] = useState<string | null>(null)

  /* ── Auth headers ── */
  const getAuthHeaders = useCallback(
    () => getApiAuthHeaders({ getAccessToken, walletAddress }),
    [getAccessToken, walletAddress],
  )

  /* ── Step 1: Verify Zeabur API Key ── */
  const verifyZeaburKey = useCallback(async () => {
    if (!zeaburApiKey.trim()) return
    setVerifyingKey(true)
    setKeyError(null)
    setKeyValid(false)

    try {
      const res = await fetch(ZEABUR_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zeaburApiKey: zeaburApiKey.trim(), query: '{ me { _id username email } }' }),
      })
      const data = (await res.json()) as {
        data?: { me?: { _id: string; username: string } }
        errors?: Array<{ message: string }>
      }

      if (data.data?.me?._id) {
        setKeyValid(true)
      } else {
        setKeyError(data.errors?.[0]?.message || t('deploy.invalidApiKey'))
      }
    } catch {
      setKeyError(t('deploy.networkError'))
    } finally {
      setVerifyingKey(false)
    }
  }, [zeaburApiKey, t])

  /* ── Step 2: Load servers ── */
  const loadServers = useCallback(async () => {
    setLoadingServers(true)
    try {
      // Fetch servers and projects separately (Zeabur doesn't nest projects inside servers)
      const [serversRes, projectsRes] = await Promise.all([
        fetch(ZEABUR_PROXY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zeaburApiKey: zeaburApiKey.trim(),
            query: '{ servers { _id name provider ip } }',
          }),
        }),
        fetch(ZEABUR_PROXY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zeaburApiKey: zeaburApiKey.trim(),
            query: '{ projects { edges { node { _id name region { id name } } } } }',
          }),
        }),
      ])

      const serversData = (await serversRes.json()) as {
        data?: { servers?: ZeaburServer[] }
      }
      const projectsData = (await projectsRes.json()) as {
        data?: { projects?: { edges?: Array<{ node: { _id: string; name: string; region: { id: string } } }> } }
      }

      const rawServers = serversData.data?.servers || []
      const zeaburProjects = (projectsData.data?.projects?.edges || []).map(e => e.node)

      // Build map: serverId → list of projects on that server
      // Zeabur region.id format: "server-{serverNodeId}"
      const serverProjectMap = new Map<string, Array<{ _id: string; name: string }>>()
      for (const proj of zeaburProjects) {
        const serverId = proj.region.id.replace(/^server-/, '')
        const existing = serverProjectMap.get(serverId) || []
        existing.push({ _id: proj._id, name: proj.name })
        serverProjectMap.set(serverId, existing)
      }

      // Fetch CanFly deployments to identify which projects are ours
      const canflyProjectIds = new Map<string, string>() // projectId → agentName
      try {
        const headers = await getAuthHeaders()
        const depRes = await fetch(`/api/zeabur/deploy?owner=${encodeURIComponent(username)}`, { headers })
        if (depRes.ok) {
          const depData = (await depRes.json()) as {
            deployments?: Array<{ zeabur_project_id: string; agent_name: string; status: string }>
          }
          for (const dep of depData.deployments || []) {
            canflyProjectIds.set(dep.zeabur_project_id, dep.agent_name)
          }
        }
      } catch { /* ignore — classification will default to 'has-other' */ }

      // Classify each server
      const classified: ServerWithStatus[] = rawServers.map(srv => {
        const projects = serverProjectMap.get(srv._id) || []
        if (projects.length === 0) {
          return { ...srv, status: 'empty' as const }
        }
        // Check if any project belongs to CanFly
        const canflyProject = projects.find(p => canflyProjectIds.has(p._id))
        if (canflyProject) {
          return {
            ...srv,
            status: 'has-canfly' as const,
            canalyAgentName: canflyProjectIds.get(canflyProject._id),
          }
        }
        return { ...srv, status: 'has-other' as const }
      })

      // Sort: empty first, then has-canfly, then has-other
      classified.sort((a, b) => {
        const order: Record<ServerStatus, number> = { empty: 0, 'has-canfly': 1, 'has-other': 2 }
        return order[a.status] - order[b.status]
      })

      setServers(classified)
      // Auto-select first empty server
      const firstEmpty = classified.find(s => s.status === 'empty')
      if (firstEmpty) {
        setSelectedServer(firstEmpty._id)
      } else if (classified.length === 1 && classified[0].status !== 'has-other') {
        setSelectedServer(classified[0]._id)
      }
    } catch {
      setServers([])
    } finally {
      setLoadingServers(false)
    }
  }, [zeaburApiKey, username, getAuthHeaders])

  useEffect(() => {
    if (step === 4 && keyValid && servers.length === 0) {
      loadServers()
    }
  }, [step, keyValid, servers.length, loadServers])

  /* ── Step 4: Agent name check ── */
  useEffect(() => {
    if (!agentSlug || agentSlug.length < 2) {
      setNameAvailable(null)
      return
    }
    const timer = setTimeout(async () => {
      setNameChecking(true)
      try {
        const res = await fetch(`/api/community/agents/${encodeURIComponent(agentSlug)}`)
        setNameAvailable(res.status === 404)
      } catch {
        setNameAvailable(null)
      } finally {
        setNameChecking(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [agentSlug])

  /* ── Step 5: Deploy ── */
  const startDeploy = useCallback(async () => {
    if (!selectedServer || !agentSlug) return
    setDeploying(true)
    setDeployError(null)
    setDeployStatus('deploying')

    try {
      const res = await fetch('/api/zeabur/deploy', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          zeaburApiKey: zeaburApiKey.trim(),
          serverNodeId: selectedServer,
          agentName: agentSlug,
          agentDisplayName: agentDisplayName.trim(),
          agentBio: agentBio.trim() || undefined,
          aiHubKey: aiHubKey.trim() || undefined,
          tier: 'general',
          templateCode: 'VTZ4FX',
        }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error || `Deploy failed (${res.status})`)
      }

      const data = (await res.json()) as { deploymentId: string; status: string }
      setDeploymentId(data.deploymentId)
      setDeployStatus(data.status)
    } catch (err) {
      setDeployError((err as Error).message)
      setDeploying(false)
    }
  }, [selectedServer, agentSlug, agentDisplayName, agentBio, zeaburApiKey, aiHubKey, getAuthHeaders])

  /* ── Poll deployment status ── */
  useEffect(() => {
    if (!deploymentId || deployStatus === 'running' || deployStatus === 'failed') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/zeabur/deploy/${deploymentId}/status`, {
          headers: await getAuthHeaders(),
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          status: string
          zeaburStatus?: string
          agentName?: string
          errorMessage?: string
        }
        setDeployStatus(data.status)
        if (data.zeaburStatus) setZeaburStatus(data.zeaburStatus)
        if (data.agentName) setDeployAgentName(data.agentName)
        if (data.status === 'failed') {
          setDeployError(data.errorMessage || t('deploy.deployFailed'))
          setDeploying(false)
          clearInterval(interval)
        }
        if (data.status === 'running') {
          setDeploying(false)
          clearInterval(interval)
        }
      } catch { /* keep polling */ }
    }, 3000)

    return () => clearInterval(interval)
  }, [deploymentId, deployStatus, getAuthHeaders, t])

  /* ── Step navigation ── */
  const canAdvance = (): boolean => {
    switch (step) {
      case 1: return keyValid
      case 2: return !!agentDisplayName.trim() && agentSlug.length >= 2 && nameAvailable === true  // Name
      case 3: return true // AI Hub key is optional
      case 4: return !!selectedServer  // Server
      case 5: return false
      default: return false
    }
  }

  const goNext = () => {
    if (step === 4 && canAdvance()) {
      // Transition to deploy step and auto-start
      setStep(5)
      setTimeout(() => startDeploy(), 100)
      return
    }
    if (step < 5 && canAdvance()) setStep((step + 1) as WizardStep)
  }

  const goBack = () => {
    if (step > 1) setStep((step - 1) as WizardStep)
  }

  /* ── Not authenticated ── */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <Rocket className="w-16 h-16 text-gray-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">{t('deploy.loginRequired')}</h1>
          <p className="text-gray-400 mb-8">{t('deploy.loginDescription')}</p>
          <button
            onClick={login}
            className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            {t('deploy.loginButton')}
          </button>
        </div>
      </div>
    )
  }

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">{t('deploy.pageTitle')}</h1>
          <p className="text-gray-400">{t('deploy.pageDescription')}</p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => {
            const stepNum = (i + 1) as WizardStep
            const Icon = s.icon
            const isActive = step === stepNum
            const isComplete = step > stepNum || (step === 5 && deployStatus === 'running')
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isComplete
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : isActive
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-gray-800 text-gray-500 border border-gray-700'
                  }`}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-[11px] text-center ${isActive ? 'text-cyan-400' : isComplete ? 'text-green-400' : 'text-gray-600'}`}>
                  {t(s.labelKey)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Step Content */}
        <GlassCard className="p-6">
          {/* Step 1: Zeabur API Key */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">{t('deploy.step1Title')}</h2>
              <p className="text-sm text-gray-400">
                <a href="https://zeabur.com/zh-TW/referral?referralCode=dAAAb" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 underline">
                  {t('deploy.registerZeaburAccount', 'Register a Zeabur account')}
                </a>
                {t('deploy.step1DescSuffix', ', get an API key to connect CanFly for deployment.')}
              </p>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">{t('deploy.apiKeyLabel')}</label>
                <input
                  type="password"
                  value={zeaburApiKey}
                  onChange={(e) => { setZeaburApiKey(e.target.value); setKeyValid(false); setKeyError(null) }}
                  placeholder={t('deploy.apiKeyPlaceholder')}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
                />
                <p className="text-[11px] text-gray-600 mt-1.5">
                  <a href="https://zeabur.com/zh-TW/referral?referralCode=dAAAb" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                    {t('deploy.registerZeabur', 'Register Zeabur')} <ExternalLink className="w-3 h-3 inline" />
                  </a>
                  {' '}{t('deploy.apiKeyHelp')}{' '}
                  <a href="https://zeabur.com/account/api-keys" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:text-cyan-400">
                    {t('deploy.getApiKey', 'Get API Key')} <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
                <p className="text-[10px] text-gray-700 mt-1">
                  💡 {t('deploy.referralTip', 'Use referral code "dAAAb" at checkout for 10% off servers and AI Hub credits')}
                </p>
              </div>
              {keyError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400">{keyError}</p>
                </div>
              )}
              {keyValid && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-xs text-green-400">{t('deploy.apiKeyValid')}</p>
                </div>
              )}
              {!keyValid && (
                <button
                  onClick={verifyZeaburKey}
                  disabled={verifyingKey || !zeaburApiKey.trim()}
                  className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {verifyingKey ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('deploy.verifying')}</>
                  ) : (
                    t('deploy.verifyBtn')
                  )}
                </button>
              )}
            </div>
          )}

          {/* Step 2: Select Server */}
          {step === 4 && ( /* Server selection — step 4 */
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">{t('deploy.step2Title')}</h2>
              <p className="text-sm text-gray-400">
                {t('deploy.step2DescPrefix', 'Select the Zeabur server for deployment. ')}
                <a href="https://zeabur.com/servers" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">
                  {t('deploy.buyServer', 'Buy a server')} <ExternalLink className="w-3 h-3 inline" />
                </a>
              </p>
              {loadingServers ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span className="text-sm text-gray-400">{t('deploy.loadingServers')}</span>
                </div>
              ) : servers.length === 0 ? (
                <div className="py-6 text-center space-y-4">
                  <Server className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {t('deploy.noServersPrefix', 'No servers found. ')}
                    <a href="https://zeabur.com/servers" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">
                      {t('deploy.addServerLink', 'Add one on Zeabur')} <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </p>
                  <button
                    onClick={loadServers}
                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {t('deploy.retry', 'Retry')}
                  </button>
                  <div className="pt-3 border-t border-gray-800">
                    <p className="text-xs text-gray-500 mb-2">{t('deploy.manualServerLabel', 'Or enter Server ID manually:')}</p>
                    <input
                      type="text"
                      value={selectedServer}
                      onChange={(e) => setSelectedServer(e.target.value.trim())}
                      placeholder="e.g. 69c7f5d3726b928734624781"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-lg text-xs focus:outline-none focus:border-cyan-500/50"
                    />
                    <p className="text-[10px] text-gray-600 mt-1">
                      {t('deploy.manualServerHelp', 'Find your Server ID in')} <a href="https://zeabur.com/servers" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:text-cyan-400">Zeabur Dashboard → Servers <ExternalLink className="w-3 h-3 inline" /></a>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {(servers as ServerWithStatus[]).map((srv) => {
                    const isOther = srv.status === 'has-other'
                    const isCanfly = srv.status === 'has-canfly'
                    const isEmpty = srv.status === 'empty'
                    const isSelected = selectedServer === srv._id
                    const isDisabled = isOther

                    return (
                      <button
                        key={srv._id}
                        onClick={() => !isDisabled && setSelectedServer(srv._id)}
                        disabled={isDisabled}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                          isDisabled
                            ? 'border-gray-800 bg-gray-900/50 text-gray-600 cursor-not-allowed opacity-60'
                            : isSelected
                              ? 'border-cyan-500 bg-cyan-500/10 text-white'
                              : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Server className={`w-4 h-4 flex-shrink-0 ${isDisabled ? 'text-gray-700' : ''}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{srv.name || srv._id}</p>
                              {isEmpty && (
                                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                                  {t('deploy.serverEmpty', 'Ready')}
                                </span>
                              )}
                              {isCanfly && (
                                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                                  🦞 {srv.canalyAgentName || t('deploy.serverHasAgent', 'Has agent')}
                                </span>
                              )}
                              {isOther && (
                                <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-500/15 text-gray-500 border border-gray-600/30">
                                  🔒 {t('deploy.serverHasOther', 'In use')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{srv.provider} · {srv.ip}</p>
                          </div>
                          {isSelected && !isDisabled && (
                            <Check className="w-4 h-4 text-cyan-400 ml-auto flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {/* Warning when a has-canfly server is selected */}
              {selectedServer && (servers as ServerWithStatus[]).find(s => s._id === selectedServer && s.status === 'has-canfly') && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-400">
                    <p className="font-medium">{t('deploy.serverWarningTitle', 'This server already has an agent')}</p>
                    <p className="text-yellow-400/70 mt-0.5">
                      {t('deploy.serverWarningDesc', 'Deploying a second agent on the same server may cause resource conflicts or queuing. We recommend using an empty server for best performance.')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: AI Hub Key */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">{t('deploy.step3Title')}</h2>
              <p className="text-sm text-gray-400">
                {t('deploy.step3DescPrefix', 'Enter your ')}
                <a href="https://zeabur.com/ai-hub" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">
                  AI Hub <ExternalLink className="w-3 h-3 inline" />
                </a>
                {t('deploy.step3DescSuffix', ' key to give your agent access to AI models.')}
              </p>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">{t('deploy.aiHubKeyLabel')}</label>
                <input
                  type="password"
                  value={aiHubKey}
                  onChange={(e) => setAiHubKey(e.target.value)}
                  placeholder={t('deploy.aiHubKeyPlaceholder')}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
                />
                <p className="text-[11px] text-gray-600 mt-1.5">{t('deploy.aiHubKeyHelp')}</p>
              </div>
            </div>
          )}

          {/* Step 2: Name your lobster */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">{t('deploy.step4Title')}</h2>
              <p className="text-sm text-gray-400">{t('deploy.step4Desc')}</p>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">{t('deploy.agentNameLabel')}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={agentDisplayName}
                    onChange={(e) => setAgentDisplayName(e.target.value)}
                    placeholder={t('deploy.agentNamePlaceholder', 'My Awesome Lobster')}
                    maxLength={50}
                    className="w-full px-4 pr-10 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {nameChecking && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
                    {nameAvailable === true && <Check className="w-4 h-4 text-green-400" />}
                    {nameAvailable === false && <AlertCircle className="w-4 h-4 text-red-400" />}
                  </span>
                </div>
                {agentSlug && (
                  <p className="text-[11px] mt-1 text-gray-500">
                    URL: canfly.ai/u/{username}/agent/<span className="text-cyan-400 font-mono">{agentSlug}</span>
                    {nameAvailable === false && <span className="text-red-400 ml-2">{t('deploy.nameTaken')}</span>}
                    {nameAvailable === true && <span className="text-green-400 ml-2">✓</span>}
                  </p>
                )}
                {!agentSlug && agentDisplayName && (
                  <p className="text-[11px] mt-1 text-red-400">{t('deploy.nameInvalid', 'Name must contain at least 2 letters or numbers')}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">{t('deploy.agentBioLabel')}</label>
                <textarea
                  value={agentBio}
                  onChange={(e) => setAgentBio(e.target.value)}
                  placeholder={t('deploy.agentBioPlaceholder')}
                  maxLength={280}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors text-sm resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 5: Deploy */}
          {step === 5 && (
            <div className="space-y-4 text-center py-4">
              {deployStatus === 'running' ? (
                <WakingUpCheck
                  agentName={deployAgentName || agentSlug}
                  username={username}
                  navigate={navigate}
                  t={t}
                  getAuthHeaders={getAuthHeaders}
                />
              ) : deployError ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">{t('deploy.errorTitle')}</h2>
                  <p className="text-sm text-red-400">{deployError}</p>
                  <button
                    onClick={() => { setDeployError(null); startDeploy() }}
                    className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
                  >
                    {t('deploy.retryDeploy')}
                  </button>
                </>
              ) : (
                <>
                  <Loader2 className={`w-12 h-12 animate-spin mx-auto ${zeaburStatus === 'QUEUED' ? 'text-yellow-400' : 'text-cyan-400'}`} />
                  <h2 className="text-lg font-semibold text-white">
                    {zeaburStatus === 'QUEUED'
                      ? t('deploy.queuedTitle', '排隊中...')
                      : t('deploy.deployingTitle')}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {zeaburStatus === 'QUEUED'
                      ? t('deploy.queuedDesc', '伺服器資源正被其他專案佔用，蝦蝦正在排隊等候。建議使用空閒伺服器以加快部署。')
                      : t('deploy.deployingDesc')}
                  </p>
                  <div className="w-full bg-gray-800 rounded-full h-2 mt-4">
                    <div className={`h-2 rounded-full animate-pulse ${zeaburStatus === 'QUEUED' ? 'bg-yellow-500' : 'bg-cyan-500'}`} style={{ width: zeaburStatus === 'QUEUED' ? '30%' : '60%' }} />
                  </div>
                </>
              )}
            </div>
          )}
        </GlassCard>

        {/* Navigation Buttons */}
        {step < 5 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={goBack}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('deploy.back')}
            </button>
            <button
              onClick={goNext}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors"
            >
              {step === 4 ? t('deploy.deployBtn') : step === 5 ? t('deploy.deploying') : t('deploy.next')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
