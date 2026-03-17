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
import { Search, Users, Bot, Wrench, Star, Flame, ArrowUpDown } from 'lucide-react'

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
  owner_username: string | null
  wallet_address: string | null
  platform: string
  bio: string | null
  model: string | null
  created_at: string
}

interface AgentWithSkillCount extends CommunityAgent {
  skillCount?: number
}

type ViewMode = 'sections' | 'sort'
type SortMode = 'trending' | 'shrimp' | 'newest' | 'az'

/** World ID verified users get a 2x weight boost in trending score */
function verificationWeight(user: CommunityUser): number {
  const vl = user.verification_level
  if (vl === 'orb' || vl === 'world' || vl === 'device') return 2
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
  const [viewMode, setViewMode] = useState<ViewMode>('sections')
  const [sortMode, setSortMode] = useState<SortMode>('trending')

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

  // Search filter
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    const q = searchQuery.toLowerCase()
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.display_name?.toLowerCase().includes(q) ||
        u.bio?.toLowerCase().includes(q)
    )
  }, [users, searchQuery])

  // Section-based grouping
  const sections = useMemo(() => {
    const claimed = filteredUsers.filter((u) => u.claimed === 1)
    const unclaimed = filteredUsers.filter((u) => u.claimed === 0)

    const featured = claimed
      .filter((u) => {
        const vl = u.verification_level
        return vl === 'orb' || vl === 'world' || vl === 'device' || vl === 'wallet'
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

    return { featured, recentlyClaimed, topShrimp, discoveries }
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

  const stats = useMemo(
    () => ({
      agents: agents.length,
      users: users.length,
      skills: agents.reduce((sum, a) => sum + (a.skillCount || 0), 0),
    }),
    [agents, users]
  )

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
              {agents.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-red-400" />
                    {t('community.sections.agents')}
                    <span className="text-gray-500 text-sm font-normal">({agents.length})</span>
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {agents.map((agent) => (
                      <div key={agent.name} className="flex items-center gap-2">
                        <PillBadge
                          name={agent.name}
                          walletAddress={agent.wallet_address}
                          type={agent.platform === 'openclaw' ? 'openclaw-agent' : 'agent'}
                          href={getAgentHref(agent)}
                        />
                        <TrustBadge
                          level={getAgentTrustLevel(agent)}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {filteredUsers.length === 0 && agents.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                  {searchQuery
                    ? t('community.noResults')
                    : t('community.empty')}
                </div>
              )}
            </>
          )}

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
