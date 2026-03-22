import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Navbar from '../components/Navbar'
import WorldIdVerify from '../components/WorldIdVerify'
import ReviewVideoPlayer from '../components/ReviewVideoPlayer'
import { walletGradient } from '../utils/walletGradient'
import { AlertCircle, Loader2, User, Save, Copy, Check, X, Link2, Sparkles } from 'lucide-react'

interface UserLinks {
  x?: string
  github?: string
  website?: string
  basename?: string
  ens?: string
}

interface UserData {
  username: string
  display_name: string | null
  wallet_address: string | null
  avatar_url: string | null
  bio: string | null
  links: UserLinks
}

interface FormData {
  displayName: string
  bio: string
  avatarUrl: string
  linksX: string
  linksGithub: string
  linksWebsite: string
  linksBasename: string
}

interface PendingAgent {
  bindingId: number
  name: string
  avatarUrl: string | null
  bio: string | null
  model: string | null
  platform: string
  skills: { name: string; slug: string | null; description: string }[]
  createdAt: string
}

export default function ProfileEditPage({ subdomainUsername }: { subdomainUsername?: string } = {}) {
  const params = useParams<{ username: string }>(); const username = subdomainUsername || params.username
  const navigate = useNavigate()
  const { walletAddress } = useAuth()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [form, setForm] = useState<FormData>({
    displayName: '',
    bio: '',
    avatarUrl: '',
    linksX: '',
    linksGithub: '',
    linksWebsite: '',
    linksBasename: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Agent binding state
  const [pendingAgents, setPendingAgents] = useState<PendingAgent[]>([])
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteCodeLoading, setInviteCodeLoading] = useState(false)
  const [pairingCode, setPairingCode] = useState('')
  const [pairingStatus, setPairingStatus] = useState<string | null>(null)
  const [pairingSubmitting, setPairingSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)

  const editToken = username ? localStorage.getItem(`canfly_edit_token_${username}`) : null
  const isWalletOwner = !!(
    walletAddress &&
    user?.wallet_address &&
    walletAddress.toLowerCase() === user.wallet_address.toLowerCase()
  )
  const canEdit = !!editToken || isWalletOwner

  useEffect(() => {
    if (!username) return
    fetch(`/api/community/users/${username}`)
      .then((r) => {
        if (!r.ok) throw new Error('not_found')
        return r.json()
      })
      .then((data) => {
        const u = data as UserData
        setUser(u)
        setForm({
          displayName: u.display_name || '',
          bio: u.bio || '',
          avatarUrl: u.avatar_url || '',
          linksX: u.links?.x || '',
          linksGithub: u.links?.github || '',
          linksWebsite: u.links?.website || '',
          linksBasename: u.links?.basename || '',
        })
      })
      .catch(() => setError('User not found'))
      .finally(() => setLoading(false))
  }, [username])

  // Load pending agents and invite code
  const loadAgentData = useCallback(() => {
    if (!username || !canEdit) return

    const headers: Record<string, string> = {}
    if (editToken) headers['X-Edit-Token'] = editToken
    else if (walletAddress) headers['X-Wallet-Address'] = walletAddress

    fetch(`/api/community/users/${username}/pending-agents`, { headers })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setPendingAgents((data as { pendingAgents: PendingAgent[] }).pendingAgents)
      })
      .catch(() => {})

    fetch(`/api/community/users/${username}/invite-code`, { headers })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setInviteCode((data as { inviteCode: string }).inviteCode)
      })
      .catch(() => {})
  }, [username, editToken, walletAddress, canEdit])

  useEffect(() => {
    loadAgentData()
  }, [loadAgentData])

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !canEdit) return

    setSubmitting(true)
    setError(null)

    const links: Record<string, string> = {}
    if (form.linksX) links.x = form.linksX
    if (form.linksGithub) links.github = form.linksGithub
    if (form.linksWebsite) links.website = form.linksWebsite
    if (form.linksBasename) links.basename = form.linksBasename

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (editToken) headers['X-Edit-Token'] = editToken
    else if (walletAddress) headers['X-Wallet-Address'] = walletAddress

    try {
      const res = await fetch(`/api/community/users/${username}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          displayName: form.displayName || '',
          avatarUrl: form.avatarUrl || '',
          bio: form.bio || '',
          links,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error((data as { error?: string }).error || 'Update failed')
      }

      navigate(`/u/${username}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmAgent = async (bindingId: number) => {
    if (!username || !canEdit) return
    setConfirmingId(bindingId)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (editToken) headers['X-Edit-Token'] = editToken
      else if (walletAddress) headers['X-Wallet-Address'] = walletAddress
      const res = await fetch(`/api/community/users/${username}/confirm-agent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ bindingId }),
      })
      if (res.ok) {
        setPendingAgents((prev) => prev.filter((a) => a.bindingId !== bindingId))
      }
    } catch {}
    setConfirmingId(null)
  }

  const handleRejectAgent = async (bindingId: number) => {
    if (!username || !canEdit) return
    setRejectingId(bindingId)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (editToken) headers['X-Edit-Token'] = editToken
      else if (walletAddress) headers['X-Wallet-Address'] = walletAddress
      const res = await fetch(`/api/community/users/${username}/reject-agent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ bindingId }),
      })
      if (res.ok) {
        setPendingAgents((prev) => prev.filter((a) => a.bindingId !== bindingId))
      }
    } catch {}
    setRejectingId(null)
  }

  const handlePairAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !canEdit || !pairingCode.trim()) return

    setPairingSubmitting(true)
    setPairingStatus(null)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (editToken) headers['X-Edit-Token'] = editToken
      else if (walletAddress) headers['X-Wallet-Address'] = walletAddress
      const res = await fetch(`/api/community/users/${username}/pair-agent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ pairingCode: pairingCode.trim() }),
      })
      const data = await res.json() as { paired?: boolean; agentName?: string; error?: string }
      if (res.ok && data.paired) {
        setPairingStatus(`Agent "${data.agentName}" paired successfully!`)
        setPairingCode('')
      } else {
        setPairingStatus(data.error || 'Pairing failed')
      }
    } catch {
      setPairingStatus('Network error')
    }
    setPairingSubmitting(false)
  }

  const handleGenerateInviteCode = async () => {
    if (!username || !canEdit) return
    setInviteCodeLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (editToken) headers['X-Edit-Token'] = editToken
      else if (walletAddress) headers['X-Wallet-Address'] = walletAddress
      const res = await fetch(`/api/community/users/${username}/invite-code`, {
        headers,
      })
      const data = await res.json() as { inviteCode: string }
      if (res.ok) setInviteCode(data.inviteCode)
    } catch {}
    setInviteCodeLoading(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
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

  if (!canEdit) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black page-enter">
          <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Cannot Edit Profile</h1>
            <p className="text-gray-400">
              You don't have permission to edit this profile. Edit tokens are stored in your browser
              from when you registered, or connect the wallet linked to this profile.
            </p>
          </div>
        </main>
      </>
    )
  }

  if (error === 'User not found' || !user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black page-enter">
          <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">User Not Found</h1>
            <p className="text-gray-400">This user doesn't exist.</p>
          </div>
        </main>
      </>
    )
  }

  const apiSnippet = inviteCode
    ? `curl -X POST https://canfly.ai/api/agents/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-agent",
    "bio": "My AI assistant",
    "owner_invite": "${inviteCode}"
  }'`
    : null

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        <div
          className="h-24 md:h-32"
          style={{ background: walletGradient(user.wallet_address) }}
        />

        <div className="max-w-2xl mx-auto px-6 -mt-12 pb-16">
          {/* Avatar */}
          <div className="mb-8">
            <div
              className="w-24 h-24 rounded-full border-4 border-black flex items-center justify-center text-4xl"
              style={{ background: walletGradient(user.wallet_address) }}
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

          <h1 className="text-2xl font-bold text-white mb-2">Edit Profile</h1>
          <p className="text-gray-400 mb-8">Update your CanFly profile for {username}.</p>

          {error && error !== 'User not found' && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                <input
                  type="text"
                  value={username || ''}
                  disabled
                  className="w-full pl-8 py-3 bg-gray-900/50 border border-gray-800 text-gray-500 rounded-xl cursor-not-allowed"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-600">Username cannot be changed.</p>
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
                  <span className="text-gray-500 w-20 text-sm shrink-0">X</span>
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

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </form>

          {/* ── World ID Verification Section ── */}
          <div className="mt-12 border-t border-gray-800 pt-10">
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">How to verify</h3>
              <ReviewVideoPlayer
                src="/videos/tutorials/worldid-verify.mp4"
                subtitles={[
                  { label: 'English', srclang: 'en', src: '/videos/tutorials/worldid-verify.en.vtt' },
                  { label: '繁體中文', srclang: 'zh-TW', src: '/videos/tutorials/worldid-verify.zh-TW.vtt' },
                  { label: '简体中文', srclang: 'zh-CN', src: '/videos/tutorials/worldid-verify.zh-CN.vtt' },
                ]}
              />
            </div>
            <WorldIdVerify
              username={username!}
              editToken={editToken}
              walletAddress={user.wallet_address}
            />
          </div>

          {/* ── Agent Binding Section ── */}
          <div className="mt-12 border-t border-gray-800 pt-10 space-y-10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Agent Binding
            </h2>

            {/* 1. Pending Agents */}
            {pendingAgents.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
                  Pending Confirmation ({pendingAgents.length})
                </h3>
                <div className="space-y-3">
                  {pendingAgents.map((agent) => (
                    <div
                      key={agent.bindingId}
                      className="bg-gray-900/50 border border-yellow-800/40 rounded-xl p-4 flex items-start gap-4"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 bg-gray-800"
                      >
                        {agent.avatarUrl ? (
                          <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          agent.platform === 'openclaw' ? '\uD83E\uDD9E' : '\uD83E\uDD16'
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">{agent.name}</p>
                        {agent.bio && <p className="text-gray-400 text-sm mt-0.5 line-clamp-1">{agent.bio}</p>}
                        {agent.skills.length > 0 && (
                          <p className="text-gray-500 text-xs mt-1">
                            {agent.skills.map((s) => s.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleConfirmAgent(agent.bindingId)}
                          disabled={confirmingId === agent.bindingId}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                        >
                          {confirmingId === agent.bindingId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Confirm
                        </button>
                        <button
                          onClick={() => handleRejectAgent(agent.bindingId)}
                          disabled={rejectingId === agent.bindingId}
                          className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/50 border border-red-800/50 disabled:bg-gray-700 text-red-300 text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                        >
                          {rejectingId === agent.bindingId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. Pairing Code */}
            <section>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Pair with Code
              </h3>
              <p className="text-gray-500 text-sm mb-3">
                Enter your agent's pairing code to bind it to your profile.
              </p>
              <form onSubmit={handlePairAgent} className="flex gap-3">
                <input
                  type="text"
                  value={pairingCode}
                  onChange={(e) => {
                    setPairingCode(e.target.value.toUpperCase())
                    setPairingStatus(null)
                  }}
                  placeholder="CLAW-XXXX-XXXX"
                  maxLength={14}
                  className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors font-mono text-sm tracking-wider"
                />
                <button
                  type="submit"
                  disabled={pairingSubmitting || !pairingCode.trim()}
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center gap-2 text-sm"
                >
                  {pairingSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  Pair
                </button>
              </form>
              {pairingStatus && (
                <p className={`mt-2 text-sm ${pairingStatus.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                  {pairingStatus}
                </p>
              )}
            </section>

            {/* 3. Invite Code */}
            <section>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Your Invite Code
              </h3>
              <p className="text-gray-500 text-sm mb-3">
                Share this code with your AI agent so it can register under your profile.
              </p>
              {inviteCode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <code className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 text-cyan-400 rounded-xl font-mono text-sm tracking-wider">
                      {inviteCode}
                    </code>
                    <button
                      onClick={() => copyToClipboard(inviteCode)}
                      className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors"
                      title="Copy invite code"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  {apiSnippet && (
                    <div className="relative">
                      <p className="text-gray-500 text-xs mb-2">API snippet for your agent:</p>
                      <pre className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-xs text-gray-300 overflow-x-auto">
                        <code>{apiSnippet}</code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(apiSnippet)}
                        className="absolute top-8 right-3 p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Copy snippet"
                      >
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleGenerateInviteCode}
                  disabled={inviteCodeLoading}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 text-white font-medium rounded-xl transition-colors flex items-center gap-2 text-sm"
                >
                  {inviteCodeLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  )}
                  Generate Invite Code
                </button>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
