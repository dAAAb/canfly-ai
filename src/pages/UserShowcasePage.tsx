import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import PillBadge from '../components/PillBadge'
import { walletGradient } from '../utils/walletGradient'
import {
  ExternalLink,
  Sparkles,
  Monitor,
  Calendar,
  Globe,
  Wallet,
  Shield,
  Video,
} from 'lucide-react'

interface Skill {
  name: string
  slug: string | null
  description: string
}

interface Agent {
  name: string
  wallet_address: string | null
  basename: string | null
  platform: string
  avatar_url: string | null
  bio: string | null
  model: string | null
  hosting: string | null
  capabilities: Record<string, boolean>
  erc8004_url: string | null
  isPublic: boolean
  skills: Skill[]
  created_at: string
}

interface Hardware {
  name: string
  slug: string
  role: string
}

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
  isPublic: boolean
  created_at: string
  agents: Agent[]
  hardware: Hardware[]
}

function TrustBadge({ user }: { user: UserData }) {
  // Determine verification level from available data
  if (user.links?.ens || user.links?.basename) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-sm border border-blue-600/40">
        <Shield className="w-3.5 h-3.5" />
        Verified
      </span>
    )
  }
  if (user.wallet_address) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-600/20 text-orange-400 text-sm border border-orange-600/40">
        <Wallet className="w-3.5 h-3.5" />
        Wallet Connected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-600/20 text-gray-400 text-sm border border-gray-600/40">
      User
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function UserShowcasePage() {
  const { username } = useParams<{ username: string }>()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!username) return
    fetch(`/api/community/users/${username}`)
      .then((r) => {
        if (r.status === 404) throw new Error('not_found')
        if (r.status === 403) throw new Error('private')
        if (!r.ok) throw new Error('error')
        return r.json()
      })
      .then((data) => setUser(data as UserData))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black page-enter">
          <div className="max-w-4xl mx-auto px-6 py-24 text-center">
            <div className="animate-pulse text-gray-500">Loading...</div>
          </div>
        </main>
      </>
    )
  }

  if (error || !user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black page-enter">
          <div className="max-w-4xl mx-auto px-6 py-24 text-center">
            <div className="text-5xl mb-4">{error === 'private' ? '🔒' : '👤'}</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {error === 'private' ? 'Private Profile' : 'User Not Found'}
            </h1>
            <p className="text-gray-400">
              {error === 'private'
                ? 'This user has set their profile to private.'
                : "This user doesn't exist."}
            </p>
          </div>
        </main>
      </>
    )
  }

  const hasAgentsWithSlugs = user.agents.some((a) => a.skills.some((s) => s.slug))

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        {/* Wallet Gradient Banner */}
        <div
          className="h-32 md:h-40"
          style={{ background: walletGradient(user.wallet_address) }}
        />

        <div className="max-w-4xl mx-auto px-6 -mt-16 pb-16">
          {/* Profile Header */}
          <div className="mb-12">
            {/* Avatar */}
            <div className="mb-4">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username}
                  className="w-28 h-28 rounded-full border-4 border-black object-cover"
                />
              ) : (
                <div
                  className="w-28 h-28 rounded-full border-4 border-black flex items-center justify-center text-4xl"
                  style={{ background: walletGradient(user.wallet_address) }}
                >
                  👤
                </div>
              )}
            </div>

            {/* Name + Badge */}
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <PillBadge
                name={user.username}
                walletAddress={user.wallet_address}
                type="user"
                href={`/@${user.username}`}
                size="md"
              />
              <TrustBadge user={user} />
            </div>

            {user.display_name && (
              <h1 className="text-2xl font-bold text-white mt-2">{user.display_name}</h1>
            )}

            {/* Basename / ENS */}
            {(user.links?.basename || user.links?.ens) && (
              <p className="text-sm text-cyan-400 font-mono mt-1">
                {user.links.basename || user.links.ens}
              </p>
            )}

            {/* Bio */}
            {user.bio && <p className="text-gray-300 mt-3 max-w-2xl">{user.bio}</p>}

            {/* Social Links */}
            {(user.links?.x || user.links?.github || user.links?.website) && (
              <div className="flex flex-wrap gap-3 mt-4">
                {user.links.x && (
                  <a
                    href={`https://x.com/${user.links.x}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <span>𝕏</span> @{user.links.x}
                  </a>
                )}
                {user.links.github && (
                  <a
                    href={`https://github.com/${user.links.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <Globe className="w-3.5 h-3.5" /> {user.links.github}
                  </a>
                )}
                {user.links.website && (
                  <a
                    href={user.links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Website
                  </a>
                )}
              </div>
            )}
          </div>

          {/* My Agents */}
          {user.agents.length > 0 && (
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                My Agents ({user.agents.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {user.agents.map((agent) => {
                  const badgeType =
                    agent.platform === 'openclaw'
                      ? ('openclaw-agent' as const)
                      : ('agent' as const)
                  return (
                    <Link
                      key={agent.name}
                      to={`/@${user.username}/agent/${agent.name}`}
                      className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors block"
                    >
                      <div className="flex items-start gap-4">
                        {/* Agent avatar */}
                        {agent.avatar_url ? (
                          <img
                            src={agent.avatar_url}
                            alt={agent.name}
                            className="w-12 h-12 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
                            style={{
                              background: walletGradient(agent.wallet_address),
                            }}
                          >
                            {agent.platform === 'openclaw' ? '🦞' : '🤖'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <PillBadge
                              name={agent.name}
                              walletAddress={agent.wallet_address}
                              type={badgeType}
                              href={`/@${user.username}/agent/${agent.name}`}
                              size="sm"
                            />
                            {agent.capabilities?.videoCall && (
                              <Video className="w-4 h-4 text-cyan-400 shrink-0" />
                            )}
                          </div>
                          {agent.bio && (
                            <p className="text-gray-400 text-sm line-clamp-2 mt-1">
                              {agent.bio}
                            </p>
                          )}
                          {agent.skills.length > 0 && (
                            <p className="text-gray-500 text-xs mt-2">
                              {agent.skills.length} skill
                              {agent.skills.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* My Setup (Hardware) */}
          {user.hardware.length > 0 && (
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-green-400" />
                My Setup ({user.hardware.length})
              </h2>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl divide-y divide-gray-800">
                {user.hardware.map((hw) => (
                  <Link
                    key={hw.slug}
                    to={`/apps/${hw.slug}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-medium">{hw.name}</p>
                      {hw.role && (
                        <p className="text-gray-400 text-sm mt-0.5">{hw.role}</p>
                      )}
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500 shrink-0 ml-4" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Flight Log */}
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              Flight Log
            </h2>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-sm w-28 shrink-0">
                  {formatDate(user.created_at)}
                </span>
                <span className="text-white text-sm">Joined CanFly</span>
              </div>
              {user.agents.map((agent) => (
                <div key={`log-${agent.name}`} className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-28 shrink-0">
                    {formatDate(agent.created_at)}
                  </span>
                  <span className="text-white text-sm">
                    Registered agent{' '}
                    <Link
                      to={`/@${user.username}/agent/${agent.name}`}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {agent.name}
                    </Link>
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* CTA — "I want this setup" */}
          {(hasAgentsWithSlugs || user.hardware.length > 0) && (
            <section className="mb-12">
              <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-800/30 rounded-2xl p-6 text-center">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  Want this setup?
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Follow the tutorials to build your own agent with the same skills and
                  hardware.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {user.agents
                    .flatMap((a) => a.skills)
                    .filter((s) => s.slug)
                    .map((skill) => (
                      <Link
                        key={skill.slug}
                        to={`/learn/${skill.slug}-integration`}
                        className="text-sm px-3 py-1.5 bg-cyan-600/20 border border-cyan-600/40 text-cyan-400 rounded-full hover:bg-cyan-600/30 transition-colors"
                      >
                        {skill.name}
                      </Link>
                    ))}
                  {user.hardware.map((hw) => (
                    <Link
                      key={hw.slug}
                      to={`/apps/${hw.slug}`}
                      className="text-sm px-3 py-1.5 bg-green-600/20 border border-green-600/40 text-green-400 rounded-full hover:bg-green-600/30 transition-colors"
                    >
                      {hw.name}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  )
}
