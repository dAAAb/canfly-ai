/**
 * DeployPinataWizardPage — CAN-302
 *
 * 5-step wizard for creating a Pinata-hosted lobster.
 * Route: /u/{username}/agents/deploy-pinata (or /agents/deploy-pinata on subdomain)
 *
 * Steps:
 *   1. Paste Pinata "Copy All" → extract JWT → verify
 *   2. Lobster identity (name + emoji + bio + vibe)
 *   3. Pick a free model (from CanFly's curated list)
 *   4. Advanced (collapsed; template defaults to "from scratch")
 *   5. Confirm + create
 */
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useHead } from '../hooks/useHead'
import { getApiAuthHeaders } from '../utils/apiAuth'
import { extractPinataJwt, maskJwt } from '../utils/pinataJwt'
import Navbar from '../components/Navbar'
import GlassCard from '../components/GlassCard'
import DeployProgressTerminal from '../components/DeployProgressTerminal'
import {
  Bot,
  Brain,
  Rocket,
  Check,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Info,
  Sparkles,
  Settings,
} from 'lucide-react'

type WizardStep = 1 | 2 | 3 | 4 | 5

interface FeaturedModel {
  id: string
  display_name: string
  context_length: number | null
  use_case_zh: string | null
  rank: number
  provider_logo_url: string | null
}

interface VerifyJwtResponse {
  valid: boolean
  agentLimit: number
  timeCredits: {
    totalSeconds: number
    usedSeconds: number
    remainingSeconds: number
    isTicking: boolean
  } | null
  currentAgentCount: number
}

interface DeployResponse {
  deploymentId: string
  agentName: string
  agentDisplayName: string
  pinataAgentId: string
  pairingCode: string
  status: string
  message?: string
}

interface DeployPinataWizardPageProps {
  subdomainUsername?: string
}

const PINATA_API_KEYS_URL = 'https://app.pinata.cloud/developers/api-keys'

const RANDOM_EMOJIS = ['🦞', '🦐', '🐙', '🦑', '🐠', '🐟', '🐡', '🦀']
function randomEmoji(): string {
  return RANDOM_EMOJIS[Math.floor(Math.random() * RANDOM_EMOJIS.length)]
}

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 40)
    .replace(/-+$/, '')
}

export default function DeployPinataWizardPage({ subdomainUsername }: DeployPinataWizardPageProps) {
  const { username: paramUsername } = useParams<{ username: string }>()
  const username = subdomainUsername || paramUsername || ''
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAuthenticated, login, walletAddress, getAccessToken } = useAuth()

  useHead({ title: t('pinata.wizard.title', 'Create Pinata lobster') })

  const [step, setStep] = useState<WizardStep>(1)

  /* Step 1 — JWT */
  const [rawInput, setRawInput] = useState('')
  const [jwt, setJwt] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [pinataInfo, setPinataInfo] = useState<VerifyJwtResponse | null>(null)
  const [step1Error, setStep1Error] = useState<string | null>(null)
  const [showHowTo, setShowHowTo] = useState(false)

  /* Step 2 — Identity */
  const [agentName, setAgentName] = useState('')
  const [agentEmoji, setAgentEmoji] = useState<string>(() => randomEmoji())
  const [agentBio, setAgentBio] = useState('')
  const [agentVibe, setAgentVibe] = useState('')
  const slug = toSlug(agentName)

  /* Step 3 — Model */
  const [models, setModels] = useState<FeaturedModel[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  /* Step 4 — Advanced */
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [initialTask, setInitialTask] = useState('')

  /* Step 5 — Deploy */
  const [deploying, setDeploying] = useState(false)
  const [deployError, setDeployError] = useState<string | null>(null)
  const [deployResult, setDeployResult] = useState<DeployResponse | null>(null)

  const getAuthHeaders = useCallback(
    () => getApiAuthHeaders({ getAccessToken, walletAddress }),
    [getAccessToken, walletAddress],
  )

  /* Step 1 — extract JWT live as user types/pastes */
  useEffect(() => {
    const extracted = extractPinataJwt(rawInput)
    setJwt(extracted)
    setVerified(false)
    setPinataInfo(null)
    setStep1Error(null)
  }, [rawInput])

  /* Step 3 — fetch models when entering this step */
  useEffect(() => {
    if (step !== 3 || models.length > 0) return
    setLoadingModels(true)
    fetch('/api/openrouter/featured-free-models')
      .then((r) => r.json() as Promise<{ models: FeaturedModel[] }>)
      .then((data) => {
        const list = data.models || []
        setModels(list)
        if (list.length > 0 && !selectedModelId) setSelectedModelId(list[0].id)
      })
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false))
  }, [step, models.length, selectedModelId])

  const handleVerify = useCallback(async () => {
    if (!jwt) return
    setVerifying(true)
    setStep1Error(null)
    try {
      const res = await fetch('/api/pinata/verify-jwt', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ jwt }),
      })
      // Read body once as text so a non-JSON 5xx (or empty body) surfaces a
      // useful diagnostic instead of collapsing into a generic network error.
      const raw = await res.text()
      let data: (VerifyJwtResponse & { error?: string }) = { valid: false } as VerifyJwtResponse
      try { data = JSON.parse(raw) } catch { /* non-JSON body */ }

      if (res.ok && data.valid) {
        setVerified(true)
        setPinataInfo(data)
      } else if (res.status === 401 && /authentication required/i.test(raw)) {
        // Our auth middleware (NOT Pinata's) — user lost their session
        setStep1Error('Your CanFly session expired — refresh the page and log in again.')
      } else if (res.status === 401 || res.status === 403) {
        setStep1Error(t('pinata.wizard.errorJwt', 'Pinata JWT verification failed'))
      } else {
        // Non-2xx that isn't a JWT issue — surface raw status + body snippet
        // so the user can tell us what's wrong instead of seeing only "連不上".
        const snippet = data.error || raw.slice(0, 200) || `HTTP ${res.status}`
        setStep1Error(`Pinata check failed (${res.status}): ${snippet}`)
      }
    } catch (err) {
      setStep1Error(`${t('pinata.wizard.errorJwtNetwork', 'Cannot reach Pinata, please retry')}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setVerifying(false)
    }
  }, [jwt, getAuthHeaders, t])

  const canAdvance = useMemo((): boolean => {
    switch (step) {
      case 1: return !!jwt && verified
      case 2: return slug.length >= 2 && agentName.trim().length > 0
      case 3: return !!selectedModelId
      case 4: return true
      case 5: return false // terminal step
      default: return false
    }
  }, [step, jwt, verified, slug, agentName, selectedModelId])

  const goNext = () => {
    if (step < 5) setStep((s) => (s + 1) as WizardStep)
  }
  const goBack = () => {
    if (step > 1) setStep((s) => (s - 1) as WizardStep)
  }

  const handleDeploy = async () => {
    if (!jwt || !slug || !selectedModelId) return
    setDeploying(true)
    setDeployError(null)
    try {
      const res = await fetch('/api/pinata/deploy', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          pinataJwt: jwt,
          agentName: slug,
          agentDisplayName: agentName.trim(),
          agentBio: agentBio.trim() || undefined,
          agentVibe: agentVibe.trim() || undefined,
          emoji: agentEmoji,
          freeModelId: selectedModelId,
          templateId: templateId,
          initialTask: initialTask.trim() || undefined,
        }),
      })
      // Read body as text first so a non-JSON 5xx (CF generic 502 page,
      // upstream bot-challenge HTML, …) surfaces the real status + body
      // snippet instead of a generic "Unexpected token '<'" parse error.
      const raw = await res.text()
      let data: DeployResponse & { error?: string } = {} as DeployResponse
      try { data = JSON.parse(raw) } catch { /* non-JSON body */ }
      if (!res.ok) {
        const snippet = data.error || raw.slice(0, 250) || `HTTP ${res.status}`
        setDeployError(`Deploy failed (${res.status}): ${snippet}`)
        return
      }
      setDeployResult(data)

      // Chain the finalize call (restart + setDefaultModel via openclaw config
      // set) on a SEPARATE endpoint so each request gets its own 30s CF
      // wall-clock budget. We skip the restart on this first finalize since
      // the secret was already attached BEFORE the agent was created — the
      // env var is loaded at boot, no restart needed for it.
      // Fire-and-forget: don't block the redirect on it. If it fails, the
      // user can re-apply from settings (TODO button) and Telegram bind also
      // re-applies as a side effect.
      fetch(`/api/agents/${encodeURIComponent(data.agentName)}/finalize-pinata?skipRestart=1`, {
        method: 'POST',
        headers: await getAuthHeaders(),
      }).catch(() => { /* finalize is best-effort */ })

      // Hold the success line in the terminal for ~2.5s so user sees the
      // ✓ confirmation before we redirect.
      setTimeout(() => {
        navigate(`/u/${username}/agent/${data.agentName}/settings?welcome=pinata`)
      }, 2500)
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setDeploying(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('pinata.wizard.title', 'Create Pinata lobster')}</h1>
          <p className="text-gray-400 mb-6">{t('common.loginRequired', 'Please log in to continue.')}</p>
          <button
            onClick={() => login()}
            className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            {t('common.login', 'Log in')}
          </button>
        </div>
      </div>
    )
  }

  const stepLabels = [
    t('pinata.wizard.step1Label', 'Pinata JWT'),
    t('pinata.wizard.step2Label', 'Lobster identity'),
    t('pinata.wizard.step3Label', 'Pick a free model'),
    t('pinata.wizard.step4Label', 'Advanced'),
    t('pinata.wizard.step5Label', 'Confirm'),
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🪅 {t('pinata.wizard.title', 'Create your free Pinata lobster')}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {t('pinata.wizard.subtitle', 'Bring your Pinata account, we handle the AI key.')}
          </p>
        </header>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-6">
          {stepLabels.map((label, i) => {
            const n = (i + 1) as WizardStep
            const done = step > n
            const active = step === n
            return (
              <div key={label} className="flex-1">
                <div className={`h-1 rounded-full ${done ? 'bg-green-500' : active ? 'bg-cyan-500' : 'bg-gray-700'}`} />
                <div className={`text-[10px] mt-1 ${active ? 'text-cyan-300' : done ? 'text-green-400' : 'text-gray-500'}`}>
                  {n}. {label}
                </div>
              </div>
            )
          })}
        </div>

        <GlassCard className="p-6">
          {/* ── Step 1: Pinata JWT ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                {t('pinata.wizard.step1Label', 'Pinata JWT')}
              </h2>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={PINATA_API_KEYS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm"
                >
                  {t('pinata.wizard.step1OpenPinataBtn', 'Open Pinata API Keys')}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setShowHowTo((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-cyan-300"
                >
                  <Info className="w-3.5 h-3.5" />
                  {t('pinata.wizard.step1HowToInfo', "Don't know how? Click for a 3-step guide")}
                </button>
              </div>

              {showHowTo && (
                <GlassCard className="p-4 space-y-3 border border-cyan-500/20">
                  <div className="text-sm font-medium text-cyan-200">
                    {t('pinata.wizard.step1HowToTitle', 'How to get your Pinata JWT')}
                  </div>
                  <ol className="text-xs text-gray-300 space-y-1 list-none pl-0">
                    <li>{t('pinata.wizard.step1HowToStep1', '① Click "API Keys" in the left sidebar')}</li>
                    <li>{t('pinata.wizard.step1HowToStep2', '② Click "+ New Key" at the top right')}</li>
                    <li>{t('pinata.wizard.step1HowToStep3', '③ Click "Copy All" in the popup, then paste it here')}</li>
                  </ol>
                  <img
                    src="/images/pinata-api-keys-guide.png"
                    alt="Pinata API keys 3-step guide"
                    className="rounded-lg border border-gray-700"
                    onError={(e) => {
                      // Asset not yet uploaded — hide gracefully
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </GlassCard>
              )}

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  {t('pinata.wizard.step1PasteLabel', 'Paste from Pinata\'s "Copy All" (or just the JWT)')}
                </label>
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder={t('pinata.wizard.step1PastePlaceholder', 'API Key: ...API Secret: ...JWT: eyJ...')}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:border-cyan-500/50 transition-colors text-xs font-mono resize-none"
                />
                <p className="text-xs mt-1.5">
                  {jwt ? (
                    <span className="text-green-400">
                      {t('pinata.wizard.step1JwtDetected', '✓ JWT detected ({{mask}})', { mask: maskJwt(jwt) })}
                    </span>
                  ) : rawInput ? (
                    <span className="text-amber-400">
                      {t('pinata.wizard.errorPasteNoJwt', 'No JWT found — make sure to use "Copy All" from Pinata')}
                    </span>
                  ) : (
                    <span className="text-gray-500">
                      {t('pinata.wizard.step1NoJwtDetected', 'Paste from Pinata to continue — looking for JWT…')}
                    </span>
                  )}
                </p>
              </div>

              <button
                onClick={handleVerify}
                disabled={!jwt || verifying || verified}
                className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {verified ? (
                  <><CheckCircle className="w-4 h-4" /> {t('pinata.wizard.step1Verified', '✓ Pinata account verified')}</>
                ) : verifying ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t('pinata.wizard.step1Verifying', 'Verifying…')}</>
                ) : (
                  t('pinata.wizard.step1VerifyBtn', 'Verify')
                )}
              </button>

              {verified && pinataInfo && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-300">
                  {t('pinata.wizard.step1Capacity', 'Your Pinata account: {{used}}/{{limit}} agents used', {
                    used: pinataInfo.currentAgentCount,
                    limit: pinataInfo.agentLimit,
                  })}
                </div>
              )}

              {step1Error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400">{step1Error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Identity ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                {t('pinata.wizard.step2Label', 'Lobster identity')}
              </h2>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  {t('pinata.wizard.nameLabel', 'Lobster name')}
                </label>
                <input
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Nova"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:border-cyan-500/50 text-sm"
                  maxLength={40}
                />
                {slug && slug !== agentName && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('pinata.wizard.slugPreview', 'URL slug: {{slug}}', { slug })}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  {t('pinata.wizard.emojiLabel', 'Emoji')}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {RANDOM_EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setAgentEmoji(e)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                        agentEmoji === e ? 'bg-cyan-500/20 border border-cyan-500/50' : 'bg-gray-900 border border-gray-700 hover:border-gray-600'
                      }`}
                    >{e}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  {t('pinata.wizard.bioLabel', 'Description (optional)')}
                </label>
                <textarea
                  value={agentBio}
                  onChange={(e) => setAgentBio(e.target.value)}
                  maxLength={280}
                  rows={2}
                  placeholder={t('pinata.wizard.bioPlaceholder', 'Friendly free lobster from CanFly')}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:border-cyan-500/50 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  {t('pinata.wizard.vibeLabel', 'Vibe / personality (optional)')}
                </label>
                <textarea
                  value={agentVibe}
                  onChange={(e) => setAgentVibe(e.target.value)}
                  maxLength={200}
                  rows={2}
                  placeholder={t('pinata.wizard.vibePlaceholder', 'Helpful, concise, slightly nerdy')}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:border-cyan-500/50 text-sm resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Model ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                {t('pinata.wizard.step3Label', 'Pick a free model')}
              </h2>

              <p className="text-xs text-gray-400">
                {t('pinata.wizard.modelHelp', 'CanFly handles the OpenRouter key for you — the lobster can only use these free models.')}
              </p>

              {loadingModels && (
                <div className="text-center text-gray-500 py-8 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  {t('common.loading', 'Loading…')}
                </div>
              )}

              {!loadingModels && models.length === 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  {t('pinata.wizard.noModels', 'No featured free models available. Please retry shortly.')}
                </div>
              )}

              <div className="space-y-2">
                {models.map((m) => {
                  const selected = selectedModelId === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedModelId(m.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        selected
                          ? 'bg-cyan-500/10 border-cyan-500/50'
                          : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">{m.display_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate">{m.id}</div>
                          {m.use_case_zh && <div className="text-xs text-cyan-300 mt-1">{m.use_case_zh}</div>}
                        </div>
                        <div className="text-xs text-gray-400 whitespace-nowrap">
                          {m.context_length ? `${(m.context_length / 1000).toFixed(0)}K ctx` : ''}
                        </div>
                        {selected && <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Step 4: Advanced ── */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                {t('pinata.wizard.step4Label', 'Advanced (optional)')}
              </h2>

              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-xs text-gray-400 hover:text-cyan-300"
              >
                {showAdvanced ? '▾' : '▸'} {t('pinata.advanced.templateLabel', 'Pinata Marketplace template')}
              </button>

              {showAdvanced && (
                <div className="space-y-2 pl-4 border-l border-gray-800">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={templateId === null}
                      onChange={() => setTemplateId(null)}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm">{t('pinata.advanced.templateDefault', 'From scratch (recommended)')}</div>
                      <div className="text-xs text-gray-500">{t('pinata.advanced.templateDefaultNote', 'Cleanest starting point. No external accounts needed.')}</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer opacity-60">
                    <input
                      type="radio"
                      checked={templateId === 'tgny401x'}
                      onChange={() => setTemplateId('tgny401x')}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm">Privy Wallet Agent</div>
                      <div className="text-xs text-amber-400">⚠ {t('pinata.advanced.templatePrivyWarn', 'Requires a Privy account + App ID/Secret')}</div>
                    </div>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  {t('pinata.wizard.initialTaskLabel', 'Initial task (optional)')}
                </label>
                <textarea
                  value={initialTask}
                  onChange={(e) => setInitialTask(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder={t('pinata.wizard.initialTaskPlaceholder', 'What should this lobster work on first?')}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 rounded-xl focus:outline-none focus:border-cyan-500/50 text-sm resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Step 5: Confirm + deploy ── */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Rocket className="w-4 h-4 text-cyan-400" />
                {t('pinata.wizard.step5Label', 'Confirm + create')}
              </h2>

              {!deploying && !deployResult && !deployError && (
                <>
                  <div className="space-y-2 text-sm">
                    <Row label={t('pinata.wizard.summaryName', 'Name')} value={`${agentEmoji} ${agentName} (${slug})`} />
                    <Row label={t('pinata.wizard.summaryModel', 'Model')} value={selectedModelId || ''} />
                    <Row label={t('pinata.wizard.summaryTemplate', 'Template')} value={templateId ?? t('pinata.advanced.templateDefault', 'From scratch')} />
                    <Row label={t('pinata.wizard.summaryPinata', 'Pinata account')} value={pinataInfo ? `${pinataInfo.currentAgentCount}/${pinataInfo.agentLimit} used` : '—'} />
                  </div>

                  <p className="text-xs text-gray-400">
                    {t('pinata.wizard.summaryNote', 'CanFly will provision an OpenRouter key (free models only) and attach it to your new lobster.')}
                  </p>

                  <button
                    onClick={handleDeploy}
                    className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    {t('pinata.wizard.createBtn', 'Create lobster')} 🦞
                  </button>
                </>
              )}

              {/* Live progress terminal — visible while creating, on success
                  (briefly before redirect), and on error (with retry button) */}
              {(deploying || deployResult || deployError) && (
                <DeployProgressTerminal
                  state={
                    deployError
                      ? 'error'
                      : deployResult
                        ? 'success'
                        : 'running'
                  }
                  errorMessage={deployError}
                  agentName={deployResult?.agentName ?? slug}
                />
              )}

              {/* Retry button if error */}
              {deployError && !deploying && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDeployError(null) }}
                    className="flex-1 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm"
                  >
                    {t('common.back', 'Back')}
                  </button>
                  <button
                    onClick={handleDeploy}
                    className="flex-1 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold"
                  >
                    {t('common.retry', 'Retry')}
                  </button>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Navigation */}
        {step < 5 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={goBack}
              disabled={step === 1}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back', 'Back')}
            </button>
            <button
              onClick={goNext}
              disabled={!canAdvance}
              className="inline-flex items-center gap-1 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm"
            >
              {t('common.next', 'Next')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs text-gray-200 truncate max-w-[60%]">{value}</span>
    </div>
  )
}
