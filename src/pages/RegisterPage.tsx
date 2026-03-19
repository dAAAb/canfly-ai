import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../hooks/useAuth'
import { walletGradient } from '../utils/walletGradient'
import { products } from '../data/products'
import { User, AlertCircle, Check, Loader2, Plus, X } from 'lucide-react'

const hardwareProducts = products.filter((p) => p.category === 'hardware')

interface HardwareEntry {
  name: string
  slug: string
  role: string
}

interface FormData {
  username: string
  displayName: string
  bio: string
  avatarUrl: string
  linksX: string
  linksGithub: string
  linksWebsite: string
  linksBasename: string
  hardware: HardwareEntry[]
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function RegisterPage() {
  const { isAuthenticated, ready, login, walletAddress, worldIdLevel } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormData>({
    username: '',
    displayName: '',
    bio: '',
    avatarUrl: '',
    linksX: '',
    linksGithub: '',
    linksWebsite: '',
    linksBasename: '',
    hardware: [],
  })
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingProfile, setCheckingProfile] = useState(true)

  // Check if user already has a profile (by wallet address)
  useEffect(() => {
    if (!isAuthenticated || !walletAddress) {
      setCheckingProfile(false)
      return
    }
    // Wallet→username lookup: if user already registered, redirect to their profile
    fetch(`/api/community/lookup-wallet?address=${encodeURIComponent(walletAddress)}`)
      .then((r) => {
        if (r.ok) return r.json()
        return null
      })
      .then((data) => {
        if (data && (data as { username?: string }).username) {
          const username = (data as { username: string }).username
          navigate(`/u/${username}`, { replace: true })
        }
      })
      .catch(() => {
        // lookup failed, let them register
      })
      .finally(() => setCheckingProfile(false))
  }, [isAuthenticated, walletAddress, navigate])

  // Debounced username availability check
  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 2) {
      setUsernameStatus('idle')
      return
    }
    if (!/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
      setUsernameStatus('invalid')
      return
    }
    setUsernameStatus('checking')
    try {
      const res = await fetch(`/api/community/users/${username}`)
      setUsernameStatus(res.status === 404 ? 'available' : 'taken')
    } catch {
      setUsernameStatus('idle')
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => checkUsername(form.username), 400)
    return () => clearTimeout(timer)
  }, [form.username, checkUsername])

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const addHardware = () => {
    if (form.hardware.length >= 10) return
    setForm((prev) => ({
      ...prev,
      hardware: [...prev.hardware, { name: '', slug: '', role: '' }],
    }))
  }

  const updateHardware = (index: number, field: keyof HardwareEntry, value: string) => {
    setForm((prev) => {
      const hw = [...prev.hardware]
      hw[index] = { ...hw[index], [field]: value }
      // Auto-fill name from slug
      if (field === 'slug') {
        const product = hardwareProducts.find((p) => p.id === value)
        if (product) hw[index].name = product.name
      }
      return { ...prev, hardware: hw }
    })
  }

  const removeHardware = (index: number) => {
    setForm((prev) => ({
      ...prev,
      hardware: prev.hardware.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (usernameStatus !== 'available') return

    setSubmitting(true)
    setError(null)

    const links: Record<string, string> = {}
    if (form.linksX) links.x = form.linksX
    if (form.linksGithub) links.github = form.linksGithub
    if (form.linksWebsite) links.website = form.linksWebsite
    if (form.linksBasename) links.basename = form.linksBasename

    try {
      const res = await fetch('/api/community/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          displayName: form.displayName || undefined,
          walletAddress: walletAddress || undefined,
          avatarUrl: form.avatarUrl || undefined,
          bio: form.bio || undefined,
          links: Object.keys(links).length > 0 ? links : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error((data as { error?: string }).error || 'Registration failed')
      }

      const data = (await res.json()) as { username: string; editToken: string }

      // Store edit token for future edits
      localStorage.setItem(`canfly_edit_token_${data.username}`, data.editToken)

      // Path A: If wallet is connected, check BaseMail for existing human verification
      // This auto-upgrades to worldid level without requiring a face scan
      if (walletAddress) {
        try {
          await fetch('/api/basemail/check-wallet', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Edit-Token': data.editToken,
            },
            body: JSON.stringify({ username: data.username }),
          })
        } catch {
          // BaseMail check is best-effort — don't block registration
        }
      }

      // Add hardware entries if any
      for (const hw of form.hardware) {
        if (hw.slug || hw.name) {
          await fetch(`/api/community/users/${data.username}/hardware`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Edit-Token': data.editToken,
            },
            body: JSON.stringify(hw),
          }).catch(() => {
            // Hardware add is best-effort for now
          })
        }
      }

      navigate(`/u/${data.username}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // Not ready yet (skip Privy check if no real App ID configured)
  const privyConfigured = !!import.meta.env.VITE_PRIVY_APP_ID
  if (privyConfigured && (!ready || checkingProfile)) {
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

  // Not authenticated — show login CTA
  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black page-enter">
          <div className="max-w-2xl mx-auto px-6 py-16 md:py-24 text-center">
            <div
              className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)' }}
            >
              <User className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Join the CanFly Community
            </h1>
            <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
              Sign in with your wallet, World ID, or Google to create your profile and showcase your AI setup.
            </p>
            <button
              onClick={login}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors text-lg"
            >
              Sign In to Register
            </button>
          </div>
        </main>
      </>
    )
  }

  // Authenticated — show registration form
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        {/* Wallet gradient banner */}
        <div className="h-24 md:h-32" style={{ background: walletGradient(walletAddress) }} />

        <div className="max-w-2xl mx-auto px-6 -mt-12 pb-16">
          {/* Avatar preview */}
          <div className="mb-8">
            <div
              className="w-24 h-24 rounded-full border-4 border-black flex items-center justify-center text-4xl"
              style={{ background: walletGradient(walletAddress) }}
            >
              {form.avatarUrl ? (
                <img
                  src={form.avatarUrl}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-white/80" />
              )}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Create Your Profile</h1>
          <p className="text-gray-400 mb-8">
            Set up your CanFly profile to showcase your AI agents and hardware setup.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => updateField('username', e.target.value.toLowerCase())}
                  placeholder="your-username"
                  maxLength={30}
                  className="w-full pl-8 pr-10 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  )}
                  {usernameStatus === 'available' && (
                    <Check className="w-4 h-4 text-green-400" />
                  )}
                  {usernameStatus === 'taken' && (
                    <X className="w-4 h-4 text-red-400" />
                  )}
                  {usernameStatus === 'invalid' && (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  )}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {usernameStatus === 'taken' && 'This username is already taken.'}
                {usernameStatus === 'invalid' &&
                  '2-30 characters, letters, numbers, hyphens, underscores only.'}
                {usernameStatus === 'available' && 'Username is available!'}
                {(usernameStatus === 'idle' || usernameStatus === 'checking') &&
                  'Your profile URL will be canfly.ai/@username'}
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => updateField('displayName', e.target.value)}
                placeholder="Your Name"
                maxLength={100}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => updateField('bio', e.target.value)}
                placeholder="Tell us about your AI setup..."
                maxLength={280}
                rows={3}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
              <p className="mt-1 text-xs text-gray-500 text-right">{form.bio.length}/280</p>
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Avatar URL</label>
              <input
                type="url"
                value={form.avatarUrl}
                onChange={(e) => updateField('avatarUrl', e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Social Links */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Links</label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 w-20 text-sm shrink-0">𝕏</span>
                  <input
                    type="text"
                    value={form.linksX}
                    onChange={(e) => updateField('linksX', e.target.value)}
                    placeholder="username"
                    className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 w-20 text-sm shrink-0">GitHub</span>
                  <input
                    type="text"
                    value={form.linksGithub}
                    onChange={(e) => updateField('linksGithub', e.target.value)}
                    placeholder="username"
                    className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 w-20 text-sm shrink-0">Website</span>
                  <input
                    type="url"
                    value={form.linksWebsite}
                    onChange={(e) => updateField('linksWebsite', e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 w-20 text-sm shrink-0">Basename</span>
                  <input
                    type="text"
                    value={form.linksBasename}
                    onChange={(e) => updateField('linksBasename', e.target.value)}
                    placeholder="name.base.eth"
                    className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Hardware */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                My Hardware Setup
              </label>
              {form.hardware.map((hw, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 mb-3 bg-gray-900/50 border border-gray-800 rounded-xl p-3"
                >
                  <div className="flex-1 space-y-2">
                    <select
                      value={hw.slug}
                      onChange={(e) => updateHardware(i, 'slug', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-purple-500 text-sm"
                    >
                      <option value="">Select hardware...</option>
                      {hardwareProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                      <option value="custom">Custom (enter name)</option>
                    </select>
                    {hw.slug === 'custom' && (
                      <input
                        type="text"
                        value={hw.name}
                        onChange={(e) => updateHardware(i, 'name', e.target.value)}
                        placeholder="Hardware name"
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:border-purple-500 text-sm"
                      />
                    )}
                    <input
                      type="text"
                      value={hw.role}
                      onChange={(e) => updateHardware(i, 'role', e.target.value)}
                      placeholder="Role (e.g., Main server, Agent host)"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-lg focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeHardware(i)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addHardware}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-2 bg-gray-900/50 border border-gray-800 border-dashed rounded-xl hover:border-gray-700 w-full justify-center"
              >
                <Plus className="w-4 h-4" /> Add Hardware
              </button>
            </div>

            {/* Auto-detected info */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                Auto-detected
              </p>
              {walletAddress && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">Wallet:</span>
                  <code className="text-cyan-400 text-xs font-mono">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </code>
                </div>
              )}
              {worldIdLevel && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">World ID:</span>
                  <span className="text-green-400 text-sm capitalize">{worldIdLevel} verified</span>
                </div>
              )}
              {!walletAddress && !worldIdLevel && (
                <p className="text-gray-500 text-sm">
                  No wallet or World ID detected from your login.
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || usernameStatus !== 'available'}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Profile...
                </>
              ) : (
                'Create Profile'
              )}
            </button>
          </form>
        </div>
      </main>
    </>
  )
}
