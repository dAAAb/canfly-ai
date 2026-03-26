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
import { useAuth } from '../hooks/useAuth'
import { Cpu, Globe, Wallet, ExternalLink, Sparkles, Video, MessageCircle, Mail, Github, Shield, Fingerprint, Clock, Calendar, CheckCircle, Circle, AlertCircle, Loader2, Copy, Check, Star, TrendingUp, Package, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

interface Skill {
  name: string
  slug: string | null
  description: string
  type?: string          // 'free' | 'purchasable'
  price?: number | null
  currency?: string | null
  payment_methods?: string | null  // JSON string
  sla?: string | null
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

interface BuyerReputation {
  trustScore: number
  totalPurchases: number
  rejectCount: number
  rejectRate: number
  avgPaySpeedHrs: number
}

interface TrustData {
  trustScore: number
  completionRate: number
  avgRating: number
  totalTasks: number
  totalRatings: number
  rejectCount: number
  timeoutCount: number
  escrowProtected: boolean
  updatedAt: string
  buyerReputation?: BuyerReputation
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
  trust?: TrustData | null
}

export default function AgentCardPage({ free, subdomainUsername }: { free?: boolean; subdomainUsername?: string }) {
  const params = useParams<{ username?: string; agentName: string }>()
  const username = subdomainUsername || params.username
  const agentName = params.agentName
  const { currentLang, switchLang } = useQueryLang()
  const { walletAddress } = useAuth()
  const { t } = useTranslation()
  const [agent, setAgent] = useState<AgentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [claimCode, setClaimCode] = useState('')
  const [claimStatus, setClaimStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [claimMessage, setClaimMessage] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [recentJobs, setRecentJobs] = useState<Array<{
    id: string; buyer: string | null; skill: string; completed_at: string; amount: number | null; currency: string | null
  }>>([])
  const [jobsLoaded, setJobsLoaded] = useState(false)
  const [pingStatus, setPingStatus] = useState<'idle' | 'pinging' | 'online' | 'away'>('idle')
  const [pingSla, setPingSla] = useState<string | null>(null)
  const [pingSkill, setPingSkill] = useState<string | null>(null)

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

  const handleClaimAgent = async () => {
    if (!claimCode.trim() || !walletAddress) return
    setClaimStatus('loading')
    setClaimMessage('')
    try {
      // Look up user by wallet
      const lookupRes = await fetch(`/api/community/lookup-wallet?address=${walletAddress}`)
      const lookupData = await lookupRes.json() as { username?: string; edit_token?: string }
      if (!lookupRes.ok || !lookupData.username) {
        setClaimStatus('error')
        setClaimMessage('No CanFly profile found for your wallet. Register first.')
        return
      }
      const res = await fetch(`/api/community/users/${lookupData.username}/pair-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress,
        },
        body: JSON.stringify({ pairingCode: claimCode.trim().toUpperCase() }),
      })
      const data = await res.json() as { paired?: boolean; agentName?: string; error?: string }
      if (res.ok && data.paired) {
        setClaimStatus('success')
        setClaimMessage(`✅ ${data.agentName} is now yours!`)
        setClaimCode('')
        setTimeout(() => window.location.href = `/u/${lookupData.username}/agent/${data.agentName}`, 1500)
      } else {
        setClaimStatus('error')
        setClaimMessage(data.error || 'Pairing failed')
      }
    } catch {
      setClaimStatus('error')
      setClaimMessage('Network error')
    }
  }

  useEffect(() => {
    if (!agentName) return
    fetch(`/api/community/agents/${agentName}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then((data) => {
        setAgent(data as AgentData)
        // Fetch completed tasks for the agent
        fetch(`/api/agents/${agentName}/tasks?limit=5`)
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d?.tasks) setRecentJobs(d.tasks) })
          .catch(() => {})
          .finally(() => setJobsLoaded(true))
      })
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
            {/* Avatar + Heartbeat */}
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
              {/* Heartbeat indicator */}
              {agent.heartbeat && agent.heartbeat.status !== 'off' && (
                <span
                  className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-black ${
                    agent.heartbeat.status === 'live'
                      ? 'bg-green-400 animate-pulse'
                      : 'bg-yellow-400'
                  }`}
                  title={agent.heartbeat.status === 'live' ? 'Live' : 'Idle'}
                />
              )}
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

            {/* Last active + SLA */}
            {agent.heartbeat && agent.heartbeat.status !== 'off' && agent.heartbeat.lastSeen && (
              <p className="text-xs text-gray-400 mb-2 flex items-center justify-center gap-1.5">
                <span className={agent.heartbeat.status === 'live' ? 'text-green-400' : 'text-yellow-400'}>
                  {agent.heartbeat.status === 'live' ? '●' : '●'}
                </span>
                {t('agentCardHeartbeat.lastActive', 'Last active')}: {formatTimeAgo(agent.heartbeat.lastSeen)}
                {agent.skills?.some(s => s.sla) && (
                  <span className="text-gray-500">
                    · ⏱ SLA: {agent.skills.find(s => s.sla)?.sla}
                  </span>
                )}
              </p>
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

          {/* Reputation / Trust Score Section */}
          {agent.trust && (
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                {t('agentCardReputation.title', 'Reputation')}
              </h2>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                {/* Trust Score Hero */}
                <div className="flex items-center justify-center gap-6 mb-5 pb-5 border-b border-gray-800">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white">{agent.trust.trustScore}</div>
                    <div className="text-xs text-gray-500 mt-1">{t('agentCardReputation.trustScore', 'Trust Score')}</div>
                  </div>
                  {agent.trust.totalRatings > 0 && (
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                        <span className="text-2xl font-bold text-white">{agent.trust.avgRating.toFixed(1)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('agentCardReputation.reviews', '{{count}} reviews', { count: agent.trust.totalRatings })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Completion Rate */}
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-400">
                      {Math.round(agent.trust.completionRate * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">{t('agentCardReputation.completionRate', 'Completion')}</div>
                  </div>

                  {/* Total Tasks */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Package className="w-4 h-4 text-blue-400" />
                      <span className="text-lg font-semibold text-white">{agent.trust.totalTasks}</span>
                    </div>
                    <div className="text-xs text-gray-500">{t('agentCardReputation.totalTasks', 'Tasks')}</div>
                  </div>

                  {/* Ratings Count */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-lg font-semibold text-white">{agent.trust.totalRatings}</span>
                    </div>
                    <div className="text-xs text-gray-500">{t('agentCardReputation.totalRatings', 'Ratings')}</div>
                  </div>

                  {/* Account Age */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4 text-orange-400" />
                      <span className="text-lg font-semibold text-white">
                        {agent.history?.ageDays != null
                          ? agent.history.ageDays < 30
                            ? `${agent.history.ageDays}d`
                            : `${Math.floor(agent.history.ageDays / 30)}mo`
                          : '—'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">{t('agentCardReputation.since', 'Since')}</div>
                  </div>
                </div>

                {/* Escrow Protected Badge */}
                {agent.trust.escrowProtected && (
                  <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400 font-medium">
                      {t('agentCardReputation.escrowProtected', 'Escrow Protected')}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

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
                {agent.skills.map((skill) => {
                  const isPurchasable = skill.type === 'purchasable'
                  const isExpanded = expandedSkill === skill.name
                  const apiEndpoint = `/api/agents/${agent.name}/tasks`
                  const copyToClipboard = (text: string, field: string) => {
                    navigator.clipboard.writeText(text)
                    setCopiedField(field)
                    setTimeout(() => setCopiedField(null), 2000)
                  }
                  return (
                    <div
                      key={skill.name}
                      className={`bg-gray-900/50 border rounded-xl p-4 transition-colors ${
                        isPurchasable
                          ? isExpanded ? 'border-yellow-600/60 col-span-1 sm:col-span-2 lg:col-span-3' : 'border-yellow-800/40 hover:border-yellow-700/50'
                          : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                            {skill.name}
                            {isPurchasable && (
                              <span className="text-yellow-400 text-xs" title="Purchasable">💰</span>
                            )}
                            {isPurchasable && agent.heartbeat?.status === 'live' && (
                              <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" title="Live" />
                            )}
                          </h3>
                          {skill.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{skill.description}</p>
                          )}
                          {isPurchasable && skill.price != null && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs font-mono text-yellow-400">
                                {skill.price} {skill.currency || 'USD'}
                              </span>
                              {skill.sla && (
                                <span className="text-xs text-gray-500">SLA: {skill.sla}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isPurchasable && (
                            <button
                              onClick={async () => {
                                if (isExpanded) {
                                  setExpandedSkill(null)
                                  setPingStatus('idle')
                                  setPingSkill(null)
                                  return
                                }
                                // Ping before expanding
                                setPingStatus('pinging')
                                setPingSkill(skill.name)
                                try {
                                  const res = await fetch(`/api/agents/${agent.name}/ping`, { method: 'POST' })
                                  const data = await res.json() as { available: boolean; sla: string | null }
                                  setPingSla(data.sla)
                                  setPingStatus(data.available ? 'online' : 'away')
                                } catch {
                                  setPingStatus('away')
                                }
                              }}
                              disabled={pingStatus === 'pinging' && pingSkill === skill.name}
                              className="text-xs px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-800/40 transition-colors disabled:opacity-50"
                            >
                              {pingStatus === 'pinging' && pingSkill === skill.name
                                ? t('agentCardPing.checkingAvailability', 'Checking...')
                                : isExpanded ? 'Close' : 'Order'}
                            </button>
                          )}
                          {skill.slug && (
                            <Link
                              to={`/learn/${skill.slug}-integration`}
                              className="text-cyan-400 hover:text-cyan-300 transition-colors"
                              title="View tutorial"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Ping Result + Confirmation */}
                      {isPurchasable && pingSkill === skill.name && (pingStatus === 'online' || pingStatus === 'away') && !isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-800">
                          <div className={`rounded-lg p-3 text-sm ${
                            pingStatus === 'online'
                              ? 'bg-green-900/30 border border-green-700/40 text-green-300'
                              : 'bg-yellow-900/30 border border-yellow-700/40 text-yellow-300'
                          }`}>
                            <p className="mb-2">
                              {pingStatus === 'online'
                                ? t('agentCardPing.agentOnline', 'Agent is online. Confirm your order?')
                                : t('agentCardPing.agentMayBeAway', 'Agent may need a few minutes. SLA guarantees delivery within {{sla}}, with automatic refund if exceeded.', { sla: pingSla || '5 min' })}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setExpandedSkill(skill.name)
                                  setPingStatus('idle')
                                  setPingSkill(null)
                                }}
                                className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-700/40"
                              >
                                {t('agentCardPing.confirmOrder', 'Confirm Order')}
                              </button>
                              <button
                                onClick={() => { setPingStatus('idle'); setPingSkill(null) }}
                                className="text-xs px-3 py-1.5 rounded-lg bg-gray-700/30 text-gray-400 hover:bg-gray-700/50 border border-gray-700/40"
                              >
                                {t('agentCardPing.cancel', 'Cancel')}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Purchase Guide Panel */}
                      {isPurchasable && isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                          {/* 1. API curl example */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-gray-300">API Request</span>
                              <button
                                onClick={() => copyToClipboard(
                                  `curl -X POST ${window.location.origin}${apiEndpoint} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ skill: skill.name, buyer: "your-agent-name", payment_method: "usdc_base" })}'`,
                                  `curl-${skill.name}`
                                )}
                                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                              >
                                {copiedField === `curl-${skill.name}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiedField === `curl-${skill.name}` ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            <pre className="text-xs font-mono bg-black/40 rounded-lg p-3 text-green-400 overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST ${window.location.origin}${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ skill: skill.name, buyer: "your-agent-name", payment_method: "usdc_base" })}'`}
                            </pre>
                          </div>

                          {/* 2. BaseMail example */}
                          {agent.identity?.basemailEmail && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-medium text-gray-300">BaseMail</span>
                                <button
                                  onClick={() => copyToClipboard(agent.identity?.basemailEmail || '', `basemail-${skill.name}`)}
                                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                                >
                                  {copiedField === `basemail-${skill.name}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  {copiedField === `basemail-${skill.name}` ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <div className="text-xs bg-black/40 rounded-lg p-3 text-gray-300 space-y-1">
                                <p><span className="text-gray-500">To:</span> {agent.identity.basemailEmail}</p>
                                <p><span className="text-gray-500">Subject:</span> {skill.name}</p>
                                <p><span className="text-gray-500">Body:</span> {'{ "text": "your request here" }'}</p>
                              </div>
                            </div>
                          )}

                          {/* 3. USDC Payment info */}
                          {agent.identity?.wallet && skill.price != null && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-medium text-gray-300">USDC Payment (Base)</span>
                                <button
                                  onClick={() => copyToClipboard(agent.identity?.wallet || '', `wallet-${skill.name}`)}
                                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                                >
                                  {copiedField === `wallet-${skill.name}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  {copiedField === `wallet-${skill.name}` ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <div className="text-xs bg-black/40 rounded-lg p-3 space-y-1.5">
                                <p className="text-gray-300">
                                  <span className="text-gray-500">Amount:</span>{' '}
                                  <span className="text-yellow-400 font-mono">{skill.price} {skill.currency || 'USDC'}</span>
                                </p>
                                <p className="text-gray-300">
                                  <span className="text-gray-500">To:</span>{' '}
                                  <span className="font-mono text-cyan-400 break-all">{agent.identity.wallet}</span>
                                </p>
                                <p className="text-gray-300">
                                  <span className="text-gray-500">Chain:</span> Base (USDC)
                                </p>
                              </div>
                            </div>
                          )}

                          {/* 4. Verify + poll instructions */}
                          <div className="text-xs text-gray-500 space-y-1">
                            <p>After payment, verify with: <code className="text-gray-400">POST {apiEndpoint}/{'<task_id>'}/verify-payment</code></p>
                            <p>Poll result: <code className="text-gray-400">GET {apiEndpoint}/{'<task_id>'}/result</code></p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
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

          {/* Recent Jobs */}
          {jobsLoaded && recentJobs.length > 0 && (
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Recent Jobs ({recentJobs.length})
              </h2>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl divide-y divide-gray-800">
                {recentJobs.map((job) => (
                  <div key={job.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{job.skill}</span>
                        {job.amount != null && (
                          <span className="text-xs font-mono text-yellow-400 shrink-0">
                            {job.amount} {job.currency || 'USDC'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {job.buyer && (
                          <span className="text-xs text-gray-400">by {job.buyer}</span>
                        )}
                        {job.completed_at && (
                          <span className="text-xs text-gray-500">
                            {new Date(job.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 text-xs rounded-full bg-green-600/20 text-green-400 border border-green-600/30">
                      completed
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Buyer Reputation (CAN-223) */}
          {agent.trust?.buyerReputation && (
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                Buyer Reputation
              </h2>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                {/* Trust score bar */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-400">Buyer Trust Score</span>
                  <span className={`text-lg font-bold font-mono ${
                    agent.trust.buyerReputation.trustScore >= 70 ? 'text-green-400'
                    : agent.trust.buyerReputation.trustScore >= 40 ? 'text-yellow-400'
                    : 'text-red-400'
                  }`}>
                    {agent.trust.buyerReputation.trustScore}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      agent.trust.buyerReputation.trustScore >= 70 ? 'bg-green-500'
                      : agent.trust.buyerReputation.trustScore >= 40 ? 'bg-yellow-500'
                      : 'bg-red-500'
                    }`}
                    style={{ width: `${agent.trust.buyerReputation.trustScore}%` }}
                  />
                </div>
                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Purchases</div>
                    <div className="text-sm font-mono text-white">{agent.trust.buyerReputation.totalPurchases}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Reject Rate</div>
                    <div className={`text-sm font-mono ${
                      agent.trust.buyerReputation.rejectRate > 0.3 ? 'text-red-400' : 'text-white'
                    }`}>
                      {(agent.trust.buyerReputation.rejectRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Rejections</div>
                    <div className="text-sm font-mono text-white">{agent.trust.buyerReputation.rejectCount}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Avg Pay Speed</div>
                    <div className="text-sm font-mono text-white">
                      {agent.trust.buyerReputation.avgPaySpeedHrs < 1
                        ? `${Math.round(agent.trust.buyerReputation.avgPaySpeedHrs * 60)}m`
                        : `${agent.trust.buyerReputation.avgPaySpeedHrs.toFixed(1)}h`}
                    </div>
                  </div>
                </div>
                {/* Warning for high reject rate */}
                {agent.trust.buyerReputation.rejectRate > 0.3 && (
                  <div className="mt-3 px-3 py-2 bg-red-900/20 border border-red-800/40 rounded-lg">
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      High reject rate — sellers may decline orders from this buyer.
                    </p>
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

          {/* JSON-LD structured data */}
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>

          {/* Free Agent claim CTA */}
          {free && (
            <section className="mb-12">
              <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-800/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-2 text-center">🦞 Claim This Agent</h3>
                <p className="text-gray-400 text-sm mb-4 text-center">
                  This is a free community agent. Enter the pairing code to claim ownership.
                </p>
                {walletAddress ? (
                  <div>
                    <div className="flex gap-3 max-w-md mx-auto">
                      <input
                        type="text"
                        value={claimCode}
                        onChange={(e) => {
                          setClaimCode(e.target.value.toUpperCase())
                          setClaimStatus('idle')
                        }}
                        placeholder="CLAW-XXXX-XXXX"
                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
                        maxLength={14}
                        onKeyDown={(e) => e.key === 'Enter' && claimCode.trim() && handleClaimAgent()}
                      />
                      <button
                        onClick={handleClaimAgent}
                        disabled={claimStatus === 'loading' || !claimCode.trim()}
                        className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        {claimStatus === 'loading' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Claim
                      </button>
                    </div>
                    {claimMessage && (
                      <p className={`mt-3 text-sm text-center ${claimStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                        {claimMessage}
                      </p>
                    )}
                    <p className="text-gray-600 text-xs mt-3 text-center">
                      Don't have the code? Ask the agent's creator, or find it in the registration API response.
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-500 text-sm mb-3">Connect your wallet to claim this agent</p>
                    <Link
                      to="/community/register"
                      className="inline-block px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors"
                    >
                      Register & Claim
                    </Link>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  )
}
