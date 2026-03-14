import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'
import { walletGradient } from '../utils/walletGradient'
import { Bot, AlertCircle, Check, Loader2, Plus, X } from 'lucide-react'

const SKILL_OPTIONS = [
  'Ollama',
  'OpenClaw',
  'oMLX',
  'ElevenLabs',
  'HeyGen',
  'BaseMail',
  'Zeabur',
  'Perplexity',
  'Pinata',
  'AgentCard',
  'AgentMail',
  'Brave Search API',
  'Whisper',
  'UTM',
  'Virtual Buddy',
]

const MODEL_OPTIONS = [
  'Claude Opus 4.6',
  'Claude Sonnet 4.6',
  'GPT-4.5',
  'GPT-4o',
  'Llama 3.3 70B',
  'Llama 4 Scout',
  'Mixtral 8x22B',
  'Gemini 2.5 Pro',
  'Qwen 2.5 72B',
  'DeepSeek V3',
  'Other',
]

const HOSTING_OPTIONS = [
  'Local (self-hosted)',
  'Zeabur',
  'Railway',
  'Fly.io',
  'AWS',
  'GCP',
  'Azure',
  'Vercel',
  'Other',
]

interface FormData {
  name: string
  bio: string
  walletAddress: string
  basename: string
  model: string
  modelCustom: string
  hosting: string
  hostingCustom: string
  platform: 'openclaw' | 'other'
  skills: string[]
  customSkill: string
}

type NameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function AgentRegisterPage() {
  const { username } = useParams<{ username: string }>()
  const { isAuthenticated, ready, login, walletAddress: authWallet } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormData>({
    name: '',
    bio: '',
    walletAddress: '',
    basename: '',
    model: '',
    modelCustom: '',
    hosting: '',
    hostingCustom: '',
    platform: 'other',
    skills: [],
    customSkill: '',
  })
  const [nameStatus, setNameStatus] = useState<NameStatus>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verify the user has edit token for this username
  const editToken = username ? localStorage.getItem(`canfly_edit_token_${username}`) : null
  const canAdd = !!editToken

  // Auto-fill wallet address from auth
  useEffect(() => {
    if (authWallet && !form.walletAddress) {
      setForm((prev) => ({ ...prev, walletAddress: authWallet }))
    }
  }, [authWallet, form.walletAddress])

  // Debounced agent name availability check
  const checkName = useCallback(async (name: string) => {
    if (!name || name.length < 2) {
      setNameStatus('idle')
      return
    }
    if (!/^[a-zA-Z0-9_ -]{2,50}$/.test(name)) {
      setNameStatus('invalid')
      return
    }
    setNameStatus('checking')
    try {
      const res = await fetch(`/api/community/agents/${encodeURIComponent(name)}`)
      setNameStatus(res.status === 404 ? 'available' : 'taken')
    } catch {
      setNameStatus('idle')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => checkName(form.name), 400)
    return () => clearTimeout(timer)
  }, [form.name, checkName])

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const toggleSkill = (skill: string) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }))
  }

  const addCustomSkill = () => {
    const skill = form.customSkill.trim()
    if (skill && !form.skills.includes(skill)) {
      setForm((prev) => ({
        ...prev,
        skills: [...prev.skills, skill],
        customSkill: '',
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nameStatus !== 'available' || !username) return

    setSubmitting(true)
    setError(null)

    const resolvedModel = form.model === 'Other' ? form.modelCustom : form.model
    const resolvedHosting = form.hosting === 'Other' ? form.hostingCustom : form.hosting

    const skills = form.skills.map((name) => {
      const slug = SKILL_OPTIONS.includes(name) ? name.toLowerCase().replace(/\s+/g, '-') : null
      return { name, slug }
    })

    try {
      const res = await fetch('/api/community/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          ownerUsername: username,
          walletAddress: form.walletAddress || undefined,
          basename: form.basename || undefined,
          bio: form.bio || undefined,
          model: resolvedModel || undefined,
          hosting: resolvedHosting || undefined,
          platform: form.platform,
          skills: skills.length > 0 ? skills : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error((data as { error?: string }).error || 'Registration failed')
      }

      const data = (await res.json()) as { name: string; editToken: string }

      // Store agent edit token
      localStorage.setItem(`canfly_agent_token_${data.name}`, data.editToken)

      navigate(`/u/${username}/agent/${encodeURIComponent(data.name)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const privyConfigured = !!import.meta.env.VITE_PRIVY_APP_ID

  if (privyConfigured && !ready) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black page-enter">
          <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <div className="animate-pulse text-gray-500">Loading...</div>
          </div>
        </main>
      </>
    )
  }

  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black page-enter">
          <div className="max-w-2xl mx-auto px-6 py-16 md:py-24 text-center">
            <div
              className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)' }}
            >
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Add Your Agent
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
              Sign in to register a new AI agent under your profile.
            </p>
            <button
              onClick={login}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors text-lg"
            >
              Sign In
            </button>
          </div>
        </main>
      </>
    )
  }

  if (!canAdd) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black page-enter">
          <div className="max-w-2xl mx-auto px-6 py-16 md:py-24 text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400">
              You don't have permission to add agents under @{username}.
            </p>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        <div className="h-24 md:h-32" style={{ background: walletGradient(authWallet) }} />

        <div className="max-w-2xl mx-auto px-6 -mt-12 pb-16">
          <div className="mb-8">
            <div
              className="w-24 h-24 rounded-full border-4 border-black flex items-center justify-center text-4xl"
              style={{ background: walletGradient(authWallet) }}
            >
              <Bot className="w-8 h-8 text-white/80" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Register New Agent</h1>
          <p className="text-gray-400 mb-8">
            Add an AI agent to <span className="text-cyan-400">@{username}</span>'s profile.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Agent Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Agent Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="My AI Agent"
                  maxLength={50}
                  className="w-full px-4 pr-10 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {nameStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  )}
                  {nameStatus === 'available' && (
                    <Check className="w-4 h-4 text-green-400" />
                  )}
                  {nameStatus === 'taken' && (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  {nameStatus === 'invalid' && (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  )}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {nameStatus === 'taken' && 'This agent name is already taken.'}
                {nameStatus === 'invalid' && '2-50 characters, letters, numbers, hyphens, underscores, spaces.'}
                {nameStatus === 'available' && 'Agent name is available!'}
                {(nameStatus === 'idle' || nameStatus === 'checking') && 'Choose a unique name for your agent.'}
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => updateField('bio', e.target.value)}
                placeholder="What does this agent do?"
                maxLength={280}
                rows={3}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
              <p className="mt-1 text-xs text-gray-500 text-right">{form.bio.length}/280</p>
            </div>

            {/* Platform */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => updateField('platform', 'openclaw')}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    form.platform === 'openclaw'
                      ? 'border-cyan-500 bg-cyan-900/30 text-cyan-400'
                      : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  🦞 OpenClaw
                </button>
                <button
                  type="button"
                  onClick={() => updateField('platform', 'other')}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    form.platform === 'other'
                      ? 'border-purple-500 bg-purple-900/30 text-purple-400'
                      : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  🤖 Other
                </button>
              </div>
            </div>

            {/* Skills (multi-select) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {SKILL_OPTIONS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.skills.includes(skill)
                        ? 'border-cyan-500 bg-cyan-900/30 text-cyan-400'
                        : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {form.skills.includes(skill) ? '✓ ' : ''}{skill}
                  </button>
                ))}
              </div>
              {/* Custom skills already added */}
              {form.skills.filter((s) => !SKILL_OPTIONS.includes(s)).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.skills.filter((s) => !SKILL_OPTIONS.includes(s)).map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className="px-3 py-1.5 rounded-full text-sm border border-cyan-500 bg-cyan-900/30 text-cyan-400 transition-colors"
                    >
                      ✓ {skill}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.customSkill}
                  onChange={(e) => updateField('customSkill', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomSkill()
                    }
                  }}
                  placeholder="Add custom skill..."
                  className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-sm"
                />
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="px-3 py-2.5 bg-gray-800 border border-gray-700 text-gray-400 rounded-xl hover:text-white hover:border-gray-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
              <select
                value={form.model}
                onChange={(e) => updateField('model', e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Select model...</option>
                {MODEL_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {form.model === 'Other' && (
                <input
                  type="text"
                  value={form.modelCustom}
                  onChange={(e) => updateField('modelCustom', e.target.value)}
                  placeholder="Enter model name"
                  className="w-full mt-2 px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                />
              )}
            </div>

            {/* Hosting */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Hosting</label>
              <select
                value={form.hosting}
                onChange={(e) => updateField('hosting', e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Select hosting...</option>
                {HOSTING_OPTIONS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              {form.hosting === 'Other' && (
                <input
                  type="text"
                  value={form.hostingCustom}
                  onChange={(e) => updateField('hostingCustom', e.target.value)}
                  placeholder="Enter hosting provider"
                  className="w-full mt-2 px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                />
              )}
            </div>

            {/* Wallet Address */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Wallet Address</label>
              <input
                type="text"
                value={form.walletAddress}
                onChange={(e) => updateField('walletAddress', e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
              />
            </div>

            {/* Basename */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Basename</label>
              <input
                type="text"
                value={form.basename}
                onChange={(e) => updateField('basename', e.target.value)}
                placeholder="agent.base.eth"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || nameStatus !== 'available'}
              className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Registering Agent...
                </>
              ) : (
                'Register Agent'
              )}
            </button>
          </form>
        </div>
      </main>
    </>
  )
}
