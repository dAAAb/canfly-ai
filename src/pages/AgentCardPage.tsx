import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useQueryLang } from '../hooks/useLanguage'
import Navbar from '../components/Navbar'
import PillBadge from '../components/PillBadge'
import { walletGradient } from '../utils/walletGradient'
import SmartAvatar from '../components/SmartAvatar'
import TrustBadge from '../components/TrustBadge'
import { getTrustLevel } from '../utils/trustLevel'
import { Cpu, Globe, Wallet, ExternalLink, Sparkles, Video, MessageCircle, Mail } from 'lucide-react'

interface Skill {
  name: string
  slug: string | null
  description: string
}

interface Owner {
  username: string
  display_name: string | null
  wallet_address: string | null
  avatar_url: string | null
  verification_level: string | null
}

interface AgentCapabilities {
  videoCall?: boolean
  chat?: boolean
  email?: string | boolean
}

interface AgentData {
  name: string
  owner_username: string | null
  wallet_address: string | null
  basename: string | null
  platform: string
  avatar_url: string | null
  bio: string | null
  model: string | null
  hosting: string | null
  capabilities: AgentCapabilities
  erc8004_url: string | null
  basemail?: string | null
  nadmail?: string | null
  skills: Skill[]
  owner: Owner | null
  agentbook_registered?: number
}

export default function AgentCardPage({ free, subdomainUsername }: { free?: boolean; subdomainUsername?: string }) {
  const params = useParams<{ username?: string; agentName: string }>()
  const username = subdomainUsername || params.username
  const agentName = params.agentName
  const { currentLang, switchLang } = useQueryLang()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!agentName) return
    fetch(`/api/community/agents/${agentName}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then((data) => setAgent(data as AgentData))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [agentName])

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

  if (error || !agent) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black page-enter">
          <div className="max-w-4xl mx-auto px-6 py-24 text-center">
            <div className="text-5xl mb-4">🦞</div>
            <h1 className="text-2xl font-bold text-white mb-2">Agent Not Found</h1>
            <p className="text-gray-400">This agent doesn't exist or is private.</p>
          </div>
        </main>
      </>
    )
  }

  const platformEmoji = agent.platform === 'openclaw' ? '🦞' : '🤖'
  const badgeType = agent.platform === 'openclaw' ? 'openclaw-agent' as const : 'agent' as const

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        {/* Wallet Gradient Banner */}
        <div
          className="h-32 md:h-40 w-full"
          style={{ background: walletGradient(agent.wallet_address), opacity: 0.8 }}
        />

        <div className="max-w-4xl mx-auto px-6 -mt-16 pb-16 md:pb-24">

          {/* Agent Header */}
          <div className="text-center mb-12">
            {/* Avatar */}
            <div className="relative z-10 mx-auto mb-4 w-24 h-24">
              <SmartAvatar
                avatarUrl={agent.avatar_url}
                walletAddress={agent.wallet_address}
                basename={agent.basename}
                name={agent.name}
                size={96}
                emoji={platformEmoji}
                border="border-4 border-black ring-2 ring-gray-700"
              />
            </div>

            {/* PillBadge */}
            <div className="mb-3">
              <PillBadge
                name={agent.name}
                walletAddress={agent.wallet_address}
                type={badgeType}
                href={free ? `/free/agent/${agent.name}` : `/u/${agent.owner_username}/agent/${agent.name}`}
                size="md"
              />
            </div>

            {/* Basename */}
            {agent.basename && (
              <p className="text-sm text-cyan-400 font-mono mb-1">{agent.basename}</p>
            )}

            {/* Email */}
            {agent.basemail && (
              <p className="text-sm text-gray-400 font-mono mb-2">{agent.basemail}</p>
            )}

            {/* Free Agent badge */}
            {free && (
              <span className="inline-block px-3 py-1 rounded-full bg-green-600/20 text-green-400 text-sm border border-green-600/40 mb-3">
                Free Agent
              </span>
            )}

            {/* AgentBook Verified badge */}
            {agent.agentbook_registered === 1 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/20 text-emerald-400 text-sm border border-emerald-600/40 mb-3">
                📖 AgentBook Verified
              </span>
            )}

            {/* Owner */}
            {agent.owner && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-gray-500 text-sm">owned by</span>
                <PillBadge
                  name={agent.owner.username}
                  walletAddress={agent.owner.wallet_address}
                  type="user"
                  href={`/u/${agent.owner.username}`}
                  size="sm"
                />
                <TrustBadge level={getTrustLevel(agent.owner)} size="sm" />
              </div>
            )}

            {/* Capability indicators */}
            {(agent.capabilities?.videoCall || agent.capabilities?.chat || agent.capabilities?.email) && (
              <div className="flex items-center justify-center gap-3 mb-4">
                {agent.capabilities.videoCall && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-600/15 text-cyan-400 text-xs border border-cyan-600/30">
                    <Video className="w-3 h-3" /> Video
                  </span>
                )}
                {agent.capabilities.chat && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-600/15 text-purple-400 text-xs border border-purple-600/30">
                    <MessageCircle className="w-3 h-3" /> Chat
                  </span>
                )}
                {agent.capabilities.email && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600/15 text-blue-400 text-xs border border-blue-600/30">
                    <Mail className="w-3 h-3" /> Email
                  </span>
                )}
              </div>
            )}

            {/* Bio */}
            {agent.bio && (
              <p className="text-gray-300 text-lg max-w-2xl mx-auto">{agent.bio}</p>
            )}
          </div>

          {/* Video Call Section */}
          {agent.capabilities?.videoCall && (
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-cyan-400" />
                Video Call
              </h2>
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="relative">
                  <img
                    src="/images/avatar-placeholder.jpg"
                    alt={`Video call with ${agent.name}`}
                    className="w-full aspect-video object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Link
                      to="/"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600/90 hover:bg-cyan-500 text-white font-medium rounded-xl transition-all"
                    >
                      <Video className="w-5 h-5" />
                      Start Video Call with {platformEmoji}
                    </Link>
                  </div>
                  <span className="absolute top-4 right-4 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Skills Grid */}
          {agent.skills.length > 0 && (
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Skills ({agent.skills.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {agent.skills.map((skill) => (
                  <div
                    key={skill.name}
                    className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-white truncate">{skill.name}</h3>
                        {skill.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{skill.description}</p>
                        )}
                      </div>
                      {skill.slug && (
                        <Link
                          to={`/learn/${skill.slug}-integration`}
                          className="shrink-0 text-cyan-400 hover:text-cyan-300 transition-colors"
                          title="View tutorial"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tech Specs */}
          {(agent.model || agent.hosting || agent.platform) && (
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                Specs
              </h2>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
                {agent.model && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-20">Model</span>
                    <span className="text-white text-sm font-mono">{agent.model}</span>
                  </div>
                )}
                {agent.hosting && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-20">Hosting</span>
                    <span className="text-white text-sm font-mono">{agent.hosting}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-20">Platform</span>
                  <span className="text-white text-sm font-mono flex items-center gap-1.5">
                    {platformEmoji} {agent.platform === 'openclaw' ? 'OpenClaw' : agent.platform}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Identity */}
          {(agent.wallet_address || agent.basename || agent.basemail || agent.nadmail || agent.erc8004_url) && (
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-400" />
                Identity
              </h2>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
                {agent.wallet_address && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-20">Wallet</span>
                    <a
                      href={`https://basescan.org/address/${agent.wallet_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm font-mono truncate transition-colors"
                    >
                      {agent.wallet_address}
                    </a>
                  </div>
                )}
                {agent.basename && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-20">Basename</span>
                    <span className="text-cyan-400 text-sm font-mono">{agent.basename}</span>
                  </div>
                )}
                {agent.basemail && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-20">BaseMail</span>
                    <span className="text-blue-400 text-sm font-mono">{agent.basemail}</span>
                  </div>
                )}
                {agent.nadmail && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-20">NadMail</span>
                    <span className="text-blue-400 text-sm font-mono">{agent.nadmail}</span>
                  </div>
                )}
                {agent.erc8004_url && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 text-sm w-20">ERC-8004</span>
                    <a
                      href={agent.erc8004_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                    >
                      View on-chain registry
                    </a>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* CTA — "I want this agent's setup" */}
          {agent.skills.some((s) => s.slug) && (
            <section className="mb-12">
              <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-800/30 rounded-2xl p-6 text-center">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  Want this agent's setup?
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Follow the tutorials to build your own agent with the same skills.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {agent.skills
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
                </div>
              </div>
            </section>
          )}

          {/* Free Agent claim CTA */}
          {free && (
            <section className="mb-12">
              <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-800/30 rounded-2xl p-6 text-center">
                <h3 className="text-lg font-bold text-white mb-2">Claim This Agent</h3>
                <p className="text-gray-400 text-sm mb-4">
                  This is a free community agent. Register to claim ownership and customize it.
                </p>
                <Link
                  to="/community/register"
                  className="inline-block px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors"
                >
                  Register & Claim
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  )
}
