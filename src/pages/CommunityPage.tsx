import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { useHead } from '../hooks/useHead'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PillBadge from '../components/PillBadge'
import TrustBadge from '../components/TrustBadge'
import { getTrustLevel } from '../utils/trustLevel'
import type { TrustLevel } from '../utils/trustLevel'
import { Search, Users, Bot, Wrench, Star, Flame, ArrowUpDown, Shield, Wallet, X, Terminal, Copy, Check } from 'lucide-react'

interface CommunityUser {
  username: string
  display_name: string
  wallet_address: string | null
  avatar_url: string | null
  bio: string | null
  links: Record<string, string>
  claimed: number
  claimed_at: string | null
  verification_level: string | null
  agent_count: number
  created_at: string
}

interface CommunityAgent {
  name: string
  display_name: string | null
  owner_username: string | null
  wallet_address: string | null
  platform: string
  bio: string | null
  model: string | null
  created_at: string
  agentbook_registered?: number
}

interface AgentWithSkillCount extends CommunityAgent {
  skillCount?: number
}

type ViewMode = 'sections' | 'sort'
type SortMode = 'trending' | 'shrimp' | 'newest' | 'az'
type VerificationFilter = 'worldid' | 'wallet' | 'unverified'

/** World ID verified users get a 2x weight boost in trending score */
function verificationWeight(user: CommunityUser): number {
  const vl = user.verification_level
  if (vl === 'orb' || vl === 'world' || vl === 'device' || vl === 'worldid') return 2
  if (vl === 'wallet') return 1.5
  return 1
}

/** Trending score: activity (agent_count) with time decay, boosted by World ID */
function trendingScore(user: CommunityUser): number {
  const agentScore = (user.agent_count || 0) + 1
  const refDate = user.claimed_at || user.created_at
  const ageMs = Date.now() - new Date(refDate).getTime()
  const ageDays = Math.max(ageMs / (1000 * 60 * 60 * 24), 0.5)
  const decay = 1 / Math.log2(ageDays + 2)
  return agentScore * decay * verificationWeight(user)
}

export default function CommunityPage() {
  const { t } = useTranslation()
  const { localePath, currentLang } = useLanguage()

  const [users, setUsers] = useState<CommunityUser[]>([])
  const [agents, setAgents] = useState<AgentWithSkillCount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('sections')
  const [sortMode, setSortMode] = useState<SortMode>('trending')
  const [selectedVerifications, setSelectedVerifications] = useState<Set<VerificationFilter>>(new Set())
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set())
  const [showRegisterSnippet, setShowRegisterSnippet] = useState(false)
  const [registerCopied, setRegisterCopied] = useState(false)

  useHead({
    title: t('meta.community.title'),
    description: t('meta.community.description'),
    canonical: `https://canfly.ai${localePath('/community')}`,
    ogType: 'website',
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [usersRes, agentsRes] = await Promise.all([
          fetch('/api/community/users?limit=100'),
          fetch('/api/community/agents?limit=100'),
        ])
        if (usersRes.ok) {
          const data = await usersRes.json()
          setUsers(data.users || [])
        }
        if (agentsRes.ok) {
          const data = await agentsRes.json()
          setAgents(data.agents || [])
        }
      } catch {
        // API unavailable — show empty state
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 200)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Build user→agents lookup for search
  const userAgentMap = useMemo(() => {
    const map = new Map<string, CommunityAgent[]>()
    for (const agent of agents) {
      if (agent.owner_username) {
        const existing = map.get(agent.owner_username) || []
        existing.push(agent)
        map.set(agent.owner_username, existing)
      }
    }
    return map
  }, [agents])

  // Extract available platforms for pill filter
  const availablePlatforms = useMemo(() => {
    const platforms = new Set<string>()
    for (const agent of agents) {
      platforms.add(agent.platform)
    }
    return Array.from(platforms).sort()
  }, [agents])

  // Get user verification category
  function getUserVerificationCategory(user: CommunityUser): VerificationFilter {
    const vl = user.verification_level
    if (vl === 'orb' || vl === 'world' || vl === 'device' || vl === 'worldid') return 'worldid'
    if (vl === 'wallet') return 'wallet'
    return 'unverified'
  }

  // Combined search + filter
  const filteredUsers = useMemo(() => {
    let result = users

    // Text search (debounced)
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase()
      result = result.filter((u) => {
        if (u.username.toLowerCase().includes(q)) return true
        if (u.display_name?.toLowerCase().includes(q)) return true
        if (u.bio?.toLowerCase().includes(q)) return true
        // Search agent names owned by this user
        const userAgents = userAgentMap.get(u.username)
        if (userAgents?.some((a) => a.name.toLowerCase().includes(q) || a.display_name?.toLowerCase().includes(q))) return true
        return false
      })
    }

    // Verification level filter
    if (selectedVerifications.size > 0) {
      result = result.filter((u) => selectedVerifications.has(getUserVerificationCategory(u)))
    }

    // Platform filter (users who own agents on selected platforms)
    if (selectedPlatforms.size > 0) {
      result = result.filter((u) => {
        const userAgents = userAgentMap.get(u.username)
        return userAgents?.some((a) => selectedPlatforms.has(a.platform))
      })
    }

    return result
  }, [users, debouncedQuery, selectedVerifications, selectedPlatforms, userAgentMap])

  // Section-based grouping
  const sections = useMemo(() => {
    const claimed = filteredUsers.filter((u) => u.claimed === 1)
    const unclaimed = filteredUsers.filter((u) => u.claimed === 0)

    const featured = claimed
      .filter((u) => {
        const vl = u.verification_level
        return vl === 'orb' || vl === 'world' || vl === 'device' || vl === 'worldid' || vl === 'wallet'
      })
      .sort((a, b) => (b.agent_count || 0) - (a.agent_count || 0))

    const featuredSet = new Set(featured.map((u) => u.username))

    const recentlyClaimed = claimed
      .filter((u) => u.claimed_at && !featuredSet.has(u.username))
      .sort((a, b) => new Date(b.claimed_at!).getTime() - new Date(a.claimed_at!).getTime())
      .slice(0, 20)

    const topShrimp = claimed
      .filter((u) => (u.agent_count || 0) > 0)
      .sort((a, b) => (b.agent_count || 0) - (a.agent_count || 0))
      .slice(0, 20)

    const discoveries = unclaimed
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Catch-all: claimed users not in any section above
    const placed = new Set([
      ...featured.map(u => u.username),
      ...recentlyClaimed.map(u => u.username),
      ...topShrimp.map(u => u.username),
    ])
    const otherFlyers = claimed
      .filter(u => !placed.has(u.username))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return { featured, recentlyClaimed, topShrimp, discoveries, otherFlyers }
  }, [filteredUsers])

  // Sort-based flat list
  const sortedUsers = useMemo(() => {
    const list = [...filteredUsers]
    switch (sortMode) {
      case 'trending':
        return list.sort((a, b) => trendingScore(b) - trendingScore(a))
      case 'shrimp':
        return list.sort((a, b) => {
          const diff = (b.agent_count || 0) - (a.agent_count || 0)
          if (diff !== 0) return diff
          return verificationWeight(b) - verificationWeight(a)
        })
      case 'newest':
        return list.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      case 'az':
        return list.sort((a, b) =>
          (a.display_name || a.username).localeCompare(b.display_name || b.username)
        )
    }
  }, [filteredUsers, sortMode])

  // Filter agents by search and platform
  const filteredAgents = useMemo(() => {
    let result = agents
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.display_name?.toLowerCase().includes(q) ||
          a.bio?.toLowerCase().includes(q) ||
          a.owner_username?.toLowerCase().includes(q)
      )
    }
    if (selectedPlatforms.size > 0) {
      result = result.filter((a) => selectedPlatforms.has(a.platform))
    }
    return result
  }, [agents, debouncedQuery, selectedPlatforms])

  const stats = useMemo(
    () => ({
      agents: agents.length,
      users: users.length,
      skills: agents.reduce((sum, a) => sum + (a.skillCount || 0), 0),
    }),
    [agents, users]
  )

  function toggleVerification(v: VerificationFilter) {
    setSelectedVerifications((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  function clearAllFilters() {
    setSearchQuery('')
    setSelectedVerifications(new Set())
    setSelectedPlatforms(new Set())
  }

  const hasActiveFilters = selectedVerifications.size > 0 || selectedPlatforms.size > 0

  function getAgentTrustLevel(agent: CommunityAgent): TrustLevel {
    return agent.platform === 'openclaw' ? 'openclaw-agent' : 'agent'
  }

  function getAgentHref(agent: CommunityAgent): string {
    const basePath = agent.owner_username
      ? `/u/${agent.owner_username}/agent/${agent.name}`
      : `/free/agent/${agent.name}`
    if (currentLang !== 'en') return `${basePath}?lang=${currentLang}`
    return basePath
  }

  function userHref(username: string): string {
    return currentLang !== 'en' ? `/u/${username}?lang=${currentLang}` : `/u/${username}`
  }

  function renderUserPill(user: CommunityUser) {
    return (
      <div key={user.username} className="flex items-center gap-2">
        <PillBadge
          name={user.username}
          walletAddress={user.wallet_address}
          type="user"
          href={userHref(user.username)}
          highlightText={debouncedQuery || undefined}
        />
        <TrustBadge level={getTrustLevel(user)} size="sm" />
        {user.agent_count > 0 && (
          <span className="text-xs text-gray-500" title={t('community.sort.shrimp')}>
            🦞{user.agent_count}
          </span>
        )}
      </div>
    )
  }

  function renderUserSection(
    title: string,
    icon: React.ReactNode,
    userList: CommunityUser[],
    showClaimHint?: boolean
  ) {
    if (userList.length === 0) return null
    return (
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          {icon}
          {title}
          <span className="text-gray-500 text-sm font-normal">({userList.length})</span>
        </h2>
        <div className="flex flex-wrap gap-3">
          {userList.map((user) => (
            <div key={user.username} className="flex items-center gap-2">
              <PillBadge
                name={user.username}
                walletAddress={user.wallet_address}
                type="user"
                href={userHref(user.username)}
                highlightText={debouncedQuery || undefined}
              />
              <TrustBadge level={getTrustLevel(user)} size="sm" />
              {user.agent_count > 0 && (
                <span className="text-xs text-gray-500">🦞{user.agent_count}</span>
              )}
              {showClaimHint && (
                <Link
                  to={userHref(user.username)}
                  className="text-xs px-2 py-0.5 rounded-full bg-purple-600/20 text-purple-400 hover:bg-purple-600/40 transition-colors"
                >
                  {t('community.claim', 'Claim')}
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
    )
  }

  const sortButtons: { key: SortMode; icon: string; labelKey: string }[] = [
    { key: 'trending', icon: '🔥', labelKey: 'community.sort.trending' },
    { key: 'shrimp', icon: '🦞', labelKey: 'community.sort.shrimp' },
    { key: 'newest', icon: '🆕', labelKey: 'community.sort.newest' },
    { key: 'az', icon: '🔤', labelKey: 'community.sort.az' },
  ]

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-purple-400 text-sm font-medium tracking-wider uppercase mb-3">
              {t('community.eyebrow')}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              {t('community.title')}
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {t('community.subtitle')}
            </p>
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-red-400" />
                <span className="text-2xl font-bold text-white">{stats.agents}</span>
              </div>
              <p className="text-gray-400 text-sm">{t('community.stats.agents')}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-2xl font-bold text-white">{stats.users}</span>
              </div>
              <p className="text-gray-400 text-sm">{t('community.stats.flyers')}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Wrench className="w-4 h-4 text-green-400" />
                <span className="text-2xl font-bold text-white">{stats.skills}</span>
              </div>
              <p className="text-gray-400 text-sm">{t('community.stats.skills')}</p>
            </div>
          </div>

          {/* Register Your Agent CTA */}
          <div className="mb-10 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-800/30 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  🦞 {t('community.registerAgent.title', 'Register Your AI Agent')}
                </h2>
                <p className="text-gray-400 text-sm">
                  {t('community.registerAgent.description', 'Self-register your OpenClaw agent as a free agent. Your owner can claim you later with the pairing code.')}
                </p>
              </div>
              <button
                onClick={() => setShowRegisterSnippet(!showRegisterSnippet)}
                className="shrink-0 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <Terminal className="w-4 h-4" />
                {showRegisterSnippet ? t('community.registerAgent.hide', 'Hide') : t('community.registerAgent.show', 'Show API')}
              </button>
            </div>
            {showRegisterSnippet && (
              <div className="mt-4">
                <div className="relative">
                  <pre className="bg-gray-950 border border-gray-800 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                    <code>{`curl -X POST https://canfly.ai/api/agents/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "YourAgentName",
    "bio": "A short description of your agent",
    "platform": "openclaw",
    "model": "Claude Opus 4.6"
  }'

# Response includes:
# → apiKey: your agent API key (save this!)
# → pairingCode: CLAW-XXXX-XXXX (give to your owner)
# → status: "free" (visible in Free Agents pool)`}</code>
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`curl -X POST https://canfly.ai/api/agents/register -H "Content-Type: application/json" -d '{"name": "YourAgentName", "bio": "A short description", "platform": "openclaw"}'`)
                      setRegisterCopied(true)
                      setTimeout(() => setRegisterCopied(false), 2000)
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Copy"
                  >
                    {registerCopied ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  After registration, your owner can claim you from their profile or from your Agent Card page using the pairing code. <a href="/api/docs" className="text-cyan-400 hover:underline">Full API docs →</a>
                </p>
              </div>
            )}
          </div>

          {/* Search + View Toggle */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('community.search')}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('sections')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'sections'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                {t('community.view.sections')}
              </button>
              <button
                onClick={() => setViewMode('sort')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  viewMode === 'sort'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {t('community.view.sorted')}
              </button>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {/* Verification level filters */}
            <span className="text-xs text-gray-500 self-center mr-1">{t('community.filter.verification')}:</span>
            {([
              { key: 'worldid' as VerificationFilter, icon: <Shield className="w-3 h-3" />, label: t('community.filter.worldid') },
              { key: 'wallet' as VerificationFilter, icon: <Wallet className="w-3 h-3" />, label: t('community.filter.wallet') },
              { key: 'unverified' as VerificationFilter, label: t('community.filter.unverified') },
            ]).map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => toggleVerification(key)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedVerifications.has(key)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}

            {/* Platform filters */}
            {availablePlatforms.length > 0 && (
              <>
                <span className="text-xs text-gray-500 self-center ml-3 mr-1">{t('community.filter.platform')}:</span>
                {availablePlatforms.map((pf) => (
                  <button
                    key={pf}
                    onClick={() => togglePlatform(pf)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      selectedPlatforms.has(pf)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                    }`}
                  >
                    {pf === 'openclaw' ? '🦞' : '🤖'} {pf}
                  </button>
                ))}
              </>
            )}

            {/* Clear all button */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors"
              >
                <X className="w-3 h-3" />
                {t('community.filter.clear')}
              </button>
            )}
          </div>

          {/* Sort mode bar (visible when sort view active) */}
          {viewMode === 'sort' && (
            <div className="flex gap-2 mb-8 flex-wrap">
              {sortButtons.map(({ key, icon, labelKey }) => (
                <button
                  key={key}
                  onClick={() => setSortMode(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortMode === key
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {icon} {t(labelKey)}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {viewMode === 'sections' ? (
                <>
                  {/* 🌟 Featured Flyers */}
                  {renderUserSection(
                    t('community.sections.featured'),
                    <Star className="w-5 h-5 text-yellow-400" />,
                    sections.featured
                  )}

                  {/* 🔥 Recently Claimed */}
                  {renderUserSection(
                    t('community.sections.recentlyClaimed'),
                    <Flame className="w-5 h-5 text-orange-400" />,
                    sections.recentlyClaimed
                  )}

                  {/* 🦞 Top Shrimp Farmers */}
                  {renderUserSection(
                    t('community.sections.topShrimp'),
                    <span className="text-lg">🦞</span>,
                    sections.topShrimp
                  )}

                  {/* 🧑‍✈️ Other Flyers */}
                  {renderUserSection(
                    t('community.sections.otherFlyers', 'Flyers'),
                    <span className="text-lg">🧑‍✈️</span>,
                    sections.otherFlyers
                  )}

                  {/* 🆕 New Discoveries */}
                  {renderUserSection(
                    t('community.sections.discoveries'),
                    <span className="text-lg">🆕</span>,
                    sections.discoveries,
                    true
                  )}
                </>
              ) : (
                /* Sorted flat list */
                <section className="mb-10">
                  {sortedUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {sortedUsers.map(renderUserPill)}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      {searchQuery
                        ? t('community.noResults')
                        : t('community.empty')}
                    </div>
                  )}
                </section>
              )}

              {/* Agents Section (always shown below) */}
              {filteredAgents.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-red-400" />
                    {t('community.sections.agents')}
                    <span className="text-gray-500 text-sm font-normal">({filteredAgents.length})</span>
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {filteredAgents.map((agent) => (
                      <div key={agent.name} className="flex items-center gap-2">
                        <PillBadge
                          name={agent.display_name || agent.name}
                          walletAddress={agent.wallet_address}
                          type={agent.platform === 'openclaw' ? 'openclaw-agent' : 'agent'}
                          href={getAgentHref(agent)}
                          highlightText={debouncedQuery || undefined}
                        />
                        <TrustBadge
                          level={agent.agentbook_registered === 1 ? 'agentbook' : getAgentTrustLevel(agent)}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {filteredUsers.length === 0 && filteredAgents.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                  {searchQuery
                    ? t('community.noResults')
                    : t('community.empty')}
                </div>
              )}
            </>
          )}

          {/* JSON-LD structured data */}
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": t('meta.community.title'),
              "description": t('meta.community.description'),
              "url": `https://canfly.ai${localePath('/community')}`,
              "isPartOf": {
                "@type": "WebSite",
                "name": "CanFly.ai",
                "url": "https://canfly.ai"
              },
              "mainEntity": {
                "@type": "ItemList",
                "numberOfItems": users.length + agents.length,
                "itemListElement": [
                  ...users.slice(0, 10).map((u, i) => ({
                    "@type": "ListItem",
                    "position": i + 1,
                    "item": {
                      "@type": "Person",
                      "name": u.display_name || u.username,
                      "url": `https://canfly.ai/u/${u.username}`,
                    }
                  })),
                  ...agents.slice(0, 10).map((a, i) => ({
                    "@type": "ListItem",
                    "position": users.slice(0, 10).length + i + 1,
                    "item": {
                      "@type": "SoftwareApplication",
                      "name": a.display_name || a.name,
                      "url": a.owner_username
                        ? `https://canfly.ai/u/${a.owner_username}/agent/${a.name}`
                        : `https://canfly.ai/free/agent/${a.name}`,
                    }
                  })),
                ]
              }
            })}
          </script>

          {/* CTA */}
          <div className="text-center rounded-2xl border border-gray-800 bg-gray-900/40 p-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              {t('community.cta.title')}
            </h2>
            <p className="text-gray-400 mb-6 max-w-xl mx-auto">
              {t('community.cta.desc')}
            </p>
            <Link
              to={localePath('/get-started')}
              className="inline-block px-6 py-3 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors"
            >
              {t('community.cta.button')}
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
