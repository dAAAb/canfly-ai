import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { walletGradient } from '../utils/walletGradient'
import { AlertCircle, Loader2, User, Save } from 'lucide-react'

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

export default function ProfileEditPage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()

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

  const editToken = username ? localStorage.getItem(`canfly_edit_token_${username}`) : null

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

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !editToken) return

    setSubmitting(true)
    setError(null)

    const links: Record<string, string> = {}
    if (form.linksX) links.x = form.linksX
    if (form.linksGithub) links.github = form.linksGithub
    if (form.linksWebsite) links.website = form.linksWebsite
    if (form.linksBasename) links.basename = form.linksBasename

    try {
      const res = await fetch(`/api/community/users/${username}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Edit-Token': editToken,
        },
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

  if (!editToken) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black page-enter">
          <div className="max-w-2xl mx-auto px-6 py-24 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Cannot Edit Profile</h1>
            <p className="text-gray-400">
              You don't have permission to edit this profile. Edit tokens are stored in your browser
              from when you registered.
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
          <p className="text-gray-400 mb-8">Update your CanFly profile for @{username}.</p>

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
        </div>
      </main>
    </>
  )
}
