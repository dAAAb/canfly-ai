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
import { Search, Users, Bot, Wrench } from 'lucide-react'

interface CommunityUser {
  username: string
  display_name: string
  wallet_address: string | null
  avatar_url: string | null
  bio: string | null
  links: Record<string, string>
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

type PlatformFilter = 'all' | 'openclaw' | 'other'

export default function CommunityPage() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()

  const [users, setUsers] = useState<CommunityUser[]>([])
  const [agents, setAgents] = useState<AgentWithSkillCount[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [freeOnly, setFreeOnly] = useState(false)

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
          fetch('/api/community/users'),
          fetch('/api/community/agents'),
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

  const filteredAgents = useMemo(() => {
    let result = agents

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.bio?.toLowerCase().includes(q)
      )
    }

    if (platformFilter === 'openclaw') {
      result = result.filter((a) => a.platform === 'openclaw')
    } else if (platformFilter === 'other') {
      result = result.filter((a) => a.platform !== 'openclaw')
    }

    if (freeOnly) {
      result = result.filter((a) => a.owner_username === null)
    }

    return result
  }, [agents, searchQuery, platformFilter, freeOnly])

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
    
    if (currentLang !== 'en') {
      return `${basePath}?lang=${currentLang}`
    }
    return basePath
  }

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
              <p className="text-gray-400 text-sm">{t('community.stats.agents', 'agents registered')}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-2xl font-bold text-white">{stats.users}</span>
              </div>
              <p className="text-gray-400 text-sm">{t('community.stats.flyers', 'flyers joined')}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Wrench className="w-4 h-4 text-green-400" />
                <span className="text-2xl font-bold text-white">{stats.skills}</span>
              </div>
              <p className="text-gray-400 text-sm">{t('community.stats.skills', 'skills in use')}</p>
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('community.search', 'Search name, bio...')}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'openclaw', 'other'] as PlatformFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    platformFilter === p
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {p === 'all'
                    ? t('community.filter.all', 'All')
                    : p === 'openclaw'
                      ? '🦞 OpenClaw'
                      : '🤖 Other'}
                </button>
              ))}
              <button
                onClick={() => setFreeOnly(!freeOnly)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  freeOnly
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {t('community.filter.free', 'Free Agents')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Users Section */}
              {filteredUsers.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    {t('community.sections.users', 'Flyers')}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {filteredUsers.map((user) => (
                      <div key={user.username} className="flex items-center gap-2">
                        <PillBadge
                          name={user.username}
                          walletAddress={user.wallet_address}
                          type="user"
                          href={currentLang !== 'en' ? `/u/${user.username}?lang=${currentLang}` : `/u/${user.username}`}
                        />
                        <TrustBadge
                          level={getTrustLevel(user)}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Agents Section */}
              {filteredAgents.length > 0 && (
                <section className="mb-12">
                  <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-red-400" />
                    {t('community.sections.agents', 'Agents')}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {filteredAgents.map((agent) => (
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
              {filteredUsers.length === 0 && filteredAgents.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                  {searchQuery
                    ? t('community.noResults', 'No results found.')
                    : t('community.empty', 'No community members yet.')}
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
