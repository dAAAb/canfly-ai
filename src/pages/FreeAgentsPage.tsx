import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { useHead } from '../hooks/useHead'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import PillBadge from '../components/PillBadge'
import { Search, Bot, Sparkles, Filter } from 'lucide-react'

interface FreeAgent {
  name: string
  owner_username: string | null
  wallet_address: string | null
  platform: string
  avatar_url: string | null
  bio: string | null
  model: string | null
  hosting: string | null
  skillCount: number
  created_at: string
}

type PlatformFilter = 'all' | 'openclaw' | 'other'

export default function FreeAgentsPage() {
  const { t } = useTranslation()
  const { localePath, currentLang } = useLanguage()

  const [agents, setAgents] = useState<FreeAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')

  useHead({
    title: t('freeAgents.meta.title'),
    description: t('freeAgents.meta.description'),
    canonical: `https://canfly.ai${localePath('/free')}`,
    ogType: 'website',
  })

  useEffect(() => {
    async function fetchFreeAgents() {
      try {
        const res = await fetch('/api/community/agents?free=true&limit=100')
        if (res.ok) {
          const data = await res.json()
          setAgents(data.agents || [])
        }
      } catch {
        // API unavailable
      } finally {
        setLoading(false)
      }
    }
    fetchFreeAgents()
  }, [])

  const filtered = useMemo(() => {
    let list = agents

    // Redirect check: skip agents that have been claimed
    list = list.filter((a) => a.owner_username === null)

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.bio?.toLowerCase().includes(q) ||
          a.model?.toLowerCase().includes(q)
      )
    }

    if (platformFilter !== 'all') {
      list = list.filter((a) => a.platform === platformFilter)
    }

    return list
  }, [agents, searchQuery, platformFilter])

  function agentHref(name: string): string {
    const base = `/free/agent/${name}`
    if (currentLang !== 'en') return `${base}?lang=${currentLang}`
    return base
  }

  const platformEmoji = (platform: string) =>
    platform === 'openclaw' ? '🦞' : '🤖'

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-green-400 text-sm font-medium tracking-wider uppercase mb-3">
              {t('freeAgents.eyebrow')}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              {t('freeAgents.title')}
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {t('freeAgents.subtitle')}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-10 max-w-md mx-auto">
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-green-400" />
                <span className="text-2xl font-bold text-white">{filtered.length}</span>
              </div>
              <p className="text-gray-400 text-sm">{t('freeAgents.stats.available')}</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-2xl font-bold text-white">
                  {filtered.reduce((sum, a) => sum + (a.skillCount || 0), 0)}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{t('freeAgents.stats.skills')}</p>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('freeAgents.search')}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'openclaw', 'other'] as PlatformFilter[]).map((pf) => (
                <button
                  key={pf}
                  onClick={() => setPlatformFilter(pf)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    platformFilter === pf
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-900 border border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  {pf === 'all' && <Filter className="w-3.5 h-3.5" />}
                  {pf === 'all' && t('freeAgents.filter.all')}
                  {pf === 'openclaw' && '🦞 OpenClaw'}
                  {pf === 'other' && '🤖 Other'}
                </button>
              ))}
            </div>
          </div>

          {/* Agent Grid */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {filtered.map((agent) => (
                <Link
                  key={agent.name}
                  to={agentHref(agent.name)}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-green-600/50 transition-colors group"
                >
                  {/* Agent header */}
                  <div className="flex items-start gap-3 mb-3">
                    {agent.avatar_url ? (
                      <img
                        src={agent.avatar_url}
                        alt={agent.name}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-800 text-lg ring-1 ring-gray-700">
                        {platformEmoji(agent.platform)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <PillBadge
                          name={agent.name}
                          walletAddress={agent.wallet_address}
                          type={agent.platform === 'openclaw' ? 'openclaw-agent' : 'agent'}
                          size="sm"
                        />
                      </div>
                      {agent.model && (
                        <p className="text-xs text-gray-500 mt-0.5 font-mono truncate">{agent.model}</p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {agent.bio && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{agent.bio}</p>
                  )}

                  {/* Footer: skills + hosting */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-yellow-500" />
                      {agent.skillCount || 0} {t('freeAgents.skillLabel', { count: agent.skillCount || 0 })}
                    </span>
                    {agent.hosting && (
                      <span className="truncate max-w-[120px]">{agent.hosting}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 mb-12">
              {searchQuery ? t('freeAgents.noResults') : t('freeAgents.empty')}
            </div>
          )}

          {/* Register CTA */}
          <div className="text-center rounded-2xl border border-gray-800 bg-gray-900/40 p-10">
            <h2 className="text-2xl font-bold text-white mb-3">
              {t('freeAgents.cta.title')}
            </h2>
            <p className="text-gray-400 mb-6 max-w-xl mx-auto">
              {t('freeAgents.cta.desc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to={localePath('/community')}
                className="inline-block px-6 py-3 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-700 transition-colors"
              >
                {t('freeAgents.cta.browseCommunity')}
              </Link>
              <Link
                to="/community/register"
                className="inline-block px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-500 transition-colors"
              >
                {t('freeAgents.cta.register')}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
