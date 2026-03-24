import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useQueryLang } from '../hooks/useLanguage'
import { useHead } from '../hooks/useHead'
import Navbar from '../components/Navbar'
import PillBadge from '../components/PillBadge'
import { walletGradient } from '../utils/walletGradient'
import SmartAvatar from '../components/SmartAvatar'
import TrustBadge from '../components/TrustBadge'
import { getTrustLevel } from '../utils/trustLevel'
import AgentAvatarCall from '../components/AgentAvatarCall'
import { Cpu, Globe, Wallet, ExternalLink, Sparkles, Video, MessageCircle, Mail, Github, Shield, Fingerprint, Clock, Calendar, CheckCircle, Circle, AlertCircle } from 'lucide-react'

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

interface VideoCallCapability {
  avatarId: string
  connectUrl: string
}

interface AgentCapabilities {
  videoCall?: boolean | VideoCallCapability
  chat?: boolean
  email?: string | boolean
}

interface IdentityData {
  wallet: string | null
  basename: string | null
  basemail: string | null       // handle only (e.g. "littl3lobst3r")
  basemailEmail: string | null  // full email (e.g. "littl3lobst3r@basemail.ai")
  nadmail: string | null
  erc8004Url: string | null
  worldId: { verified: boolean; level: string } | null
  github: string | null
}

interface Milestone {
  date: string
  title: string
  description: string | null
  trustLevel: string  // 'verified' | 'claimed' | 'unverified'
  proof: string | null
}

interface HistoryData {
  birthday: string | null
  birthdayVerified: boolean
  ageDays: number | null
  milestones: Milestone[]
}

interface HeartbeatData {
  status: string  // 'live' | 'idle' | 'off'
  lastSeen: string | null
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
  skills: Skill[]
  owner: Owner | null
  agentbook_registered?: number
  identity?: IdentityData
  history?: HistoryData
  heartbeat?: HeartbeatData
}

export default function AgentCardPage({ free, subdomainUsername }: { free?: boolean; subdomainUsername?: string }) {
  const params = useParams<{ username?: string; agentName: string }>()
  const username = subdomainUsername || params.username
  const agentName = params.agentName
  const { currentLang, switchLang } = useQueryLang()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // useHead must be called before any conditional returns (React Rules of Hooks)
  const agentUrl = free && agent
    ? `https://canfly.ai/free/agent/${agent.name}`
    : agent
      ? `https://canfly.ai/u/${agent.owner_username}/agent/${agent.name}`
      : 'https://canfly.ai'
  useHead({
    title: agent ? `${agent.name} — AI Agent | CanFly.ai` : 'Agent | CanFly.ai',
    description: agent?.bio || (agent ? `${agent.name} is an AI agent on CanFly.ai` : 'AI Agent on CanFly.ai'),
    canonical: agentUrl,
    ogType: 'profile',
  })

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": agent.name,
    "description": agent.bio || `AI agent on CanFly.ai`,
    "url": agentUrl,
    "applicationCategory": "AIApplication",
    "operatingSystem": "All",
    ...(agent.model ? { "softwareVersion": agent.model } : {}),
    ...(agent.owner ? {
      "author": {
        "@type": "Person",
        "name": agent.owner.display_name || agent.owner.username,
        "url": `https://canfly.ai/u/${agent.owner.username}`,
      }
    } : {}),
    ...(agent.skills.length > 0 ? {
      "featureList": agent.skills.map(s => s.name),
    } : {}),
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
    },
  }

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
            {agent.identity?.basemailEmail && (
              <p className="text-sm text-gray-400 font-mono mb-2">{agent.identity.basemailEmail}</p>
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

          {/* Interactive Video Call Section */}
          {agent.capabilities?.videoCall && (() => {
            const vc = agent.capabilities.videoCall
            const hasAvatar = typeof vc === 'object' && vc.avatarId && vc.connectUrl
            return (
              <section className="mb-12">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-cyan-400" />
                  Video Call
                </h2>
                {hasAvatar ? (
                  <AgentAvatarCall
                    agentName={agent.name}
                    avatarId={vc.avatarId}
                    connectUrl={vc.connectUrl}
                    platformEmoji={platformEmoji}
                  />
                ) : (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center">
                    <div className="text-4xl mb-3">{platformEmoji}</div>
                    <p className="text-gray-400 text-sm">Video call coming soon.</p>
                  </div>
                )}
              </section>
            )
          })()}

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
          {(() => {
            const id = agent.identity
            const hasIdentity = id && (id.wallet || id.basename || id.basemail || id.worldId || id.github || id.erc8004Url)
            if (!hasIdentity) return null
            return (
              <section className="mb-12">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-blue-400" />
                  Identity
                </h2>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 space-y-3">
                  {/* Wallet */}
                  {(id.wallet || id.basename) && (
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                      <Wallet className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-gray-500 text-sm w-20 shrink-0">Wallet</span>
                      <div className="min-w-0 flex items-center gap-2">
                        {id.basename && (
                          <span className="text-cyan-400 text-sm font-mono">{id.basename}</span>
                        )}
                        {id.wallet && (
                          <a
                            href={`https://basescan.org/address/${id.wallet}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm font-mono truncate transition-colors"
                          >
                            {id.basename ? `(${id.wallet.slice(0, 6)}…${id.wallet.slice(-4)})` : id.wallet}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* BaseMail */}
                  {id.basemail && (
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                      <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-gray-500 text-sm w-20 shrink-0">BaseMail</span>
                      <a
                        href={`https://basemail.ai/agent/${id.basemail}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm font-mono transition-colors"
                      >
                        {id.basemailEmail || `${id.basemail}@basemail.ai`}
                      </a>
                    </div>
                  )}

                  {/* World ID */}
                  {id.worldId && (
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-gray-500 text-sm w-20 shrink-0">World ID</span>
                      <span className="text-emerald-400 text-sm flex items-center gap-1.5">
                        Verified
                        <span className="px-1.5 py-0.5 bg-emerald-600/20 text-emerald-400 text-xs rounded border border-emerald-600/30">
                          {id.worldId.level === 'orb' ? 'Orb' : 'Device'}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* GitHub */}
                  {id.github && (
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />
                      <Github className="w-4 h-4 text-gray-300 shrink-0" />
                      <span className="text-gray-500 text-sm w-20 shrink-0">GitHub</span>
                      <a
                        href={`https://github.com/${id.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white text-sm font-mono transition-colors"
                      >
                        @{id.github}
                      </a>
                    </div>
                  )}

                  {/* ERC-8004 */}
                  {id.erc8004Url && (
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                      <Globe className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="text-gray-500 text-sm w-20 shrink-0">ERC-8004</span>
                      <a
                        href={id.erc8004Url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                      >
                        View on-chain registry
                      </a>
                    </div>
                  )}
                </div>
              </section>
            )
          })()}

          {/* History Timeline */}
          {agent.history && (agent.history.birthday || agent.history.milestones.length > 0) && (
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                History
              </h2>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                {/* Birthday + Age */}
                {agent.history.birthday && (
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
                    <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <span className="text-sm text-gray-300">
                        Born {new Date(agent.history.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                      {agent.history.ageDays != null && (
                        <span className="text-sm text-gray-500 ml-2">
                          ({agent.history.ageDays} days old)
                        </span>
                      )}
                      {agent.history.birthdayVerified && (
                        <span className="ml-2 px-1.5 py-0.5 bg-green-600/20 text-green-400 text-xs rounded border border-green-600/30">
                          verified
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Milestone Timeline */}
                {agent.history.milestones.length > 0 ? (
                  <div className="relative pl-6">
                    {/* Timeline line */}
                    <div className="absolute left-2 top-1 bottom-1 w-px bg-gray-700" />

                    {agent.history.milestones.map((milestone, idx) => {
                      const TrustIcon = milestone.trustLevel === 'verified' ? CheckCircle
                        : milestone.trustLevel === 'claimed' ? Circle
                        : AlertCircle
                      const trustColor = milestone.trustLevel === 'verified' ? 'text-green-400'
                        : milestone.trustLevel === 'claimed' ? 'text-yellow-400'
                        : 'text-gray-500'

                      return (
                        <div key={idx} className="relative mb-4 last:mb-0">
                          {/* Timeline dot */}
                          <div className={`absolute -left-4 top-1 ${trustColor}`}>
                            <TrustIcon className="w-3.5 h-3.5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs text-gray-500 font-mono">
                                {new Date(milestone.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                              <span className={`px-1.5 py-0.5 text-xs rounded border ${
                                milestone.trustLevel === 'verified'
                                  ? 'bg-green-600/20 text-green-400 border-green-600/30'
                                  : milestone.trustLevel === 'claimed'
                                    ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
                                    : 'bg-gray-600/20 text-gray-400 border-gray-600/30'
                              }`}>
                                {milestone.trustLevel}
                              </span>
                            </div>
                            <h4 className="text-sm font-medium text-white">{milestone.title}</h4>
                            {milestone.description && (
                              <p className="text-xs text-gray-400 mt-0.5">{milestone.description}</p>
                            )}
                            {milestone.proof && (
                              <a
                                href={milestone.proof.startsWith('0x')
                                  ? `https://basescan.org/tx/${milestone.proof}`
                                  : milestone.proof}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-1 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {milestone.proof.startsWith('0x')
                                  ? `${milestone.proof.slice(0, 10)}…${milestone.proof.slice(-6)}`
                                  : 'View proof'}
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No milestones recorded yet.</p>
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

          {/* JSON-LD structured data */}
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>

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
