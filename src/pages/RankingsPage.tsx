import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import skillsData from '../../data/rankings-skills.json'
import hardwareData from '../../data/rankings-hardware.json'

type Tab = 'skills' | 'hardware' | 'models'
type View = 'global' | 'community'
type SkillSort = 'popularity' | 'stars' | 'npm' | 'pypi' | 'name'
type HardwareSort = 'geekbench' | 'rating' | 'price'

interface SkillItem {
  name: string
  category: string
  brand: string
  description: string
  githubRepo?: string | null
  githubStars?: number | null
  npmPackage?: string | null
  npmWeekly?: number | null
  pypiPackage?: string | null
  pypiWeekly?: number | null
  dockerImage?: string | null
  dockerPulls?: number | null
  pricing: string
  website: string
  canflySlug?: string | null
  updatedAt?: string
}

interface HardwareItem {
  name: string
  brand: string
  category: string
  description: string
  geekbenchSingleCore: number | null
  geekbenchMultiCore: number | null
  maxMemoryGB: number | null
  amazonUrl: string | null
  amazonRating: number | null
  amazonReviewCount: number | null
  pricing: string
  pricingNote: string
  keySpec: string
  canflySlug: string | null
  website: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  'ai-framework': 'AI Framework',
  tts: 'Voice / TTS',
  video: 'Video',
  email: 'Email',
  web3: 'Web3',
  coding: 'Coding',
  iot: 'IoT',
  search: 'Search',
  hosting: 'Hosting',
  payments: 'Payments',
  mac: 'Mac',
  cloud: 'Cloud',
  budget: 'Budget PC',
  accessory: 'Accessory',
}

function parsePriceNum(pricing: string): number {
  const match = pricing.match(/\$[\d,]+/)
  if (!match) return 0
  return parseInt(match[0].replace(/[$,]/g, ''), 10)
}

export default function RankingsPage() {
  const [tab, setTab] = useState<Tab>('skills')
  const [view, setView] = useState<View>('global')
  const [skillSort, setSkillSort] = useState<SkillSort>('popularity')
  const [hardwareSort, setHardwareSort] = useState<HardwareSort>('geekbench')
  const [search, setSearch] = useState('')
  const [showAllSkills, setShowAllSkills] = useState(false)

  const skills = useMemo(() => {
    let items = (skillsData as SkillItem[]).filter(
      (s) =>
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.brand.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())
    )
    items = [...items].sort((a, b) => {
      if (skillSort === 'popularity') {
        const aScore = (a.githubStars ?? 0) + (a.npmWeekly ?? 0) + (a.pypiWeekly ?? 0) + (a.dockerPulls ?? 0) / 1000
        const bScore = (b.githubStars ?? 0) + (b.npmWeekly ?? 0) + (b.pypiWeekly ?? 0) + (b.dockerPulls ?? 0) / 1000
        return bScore - aScore
      }
      if (skillSort === 'stars') return (b.githubStars ?? 0) - (a.githubStars ?? 0)
      if (skillSort === 'npm') return (b.npmWeekly ?? 0) - (a.npmWeekly ?? 0)
      if (skillSort === 'pypi') return (b.pypiWeekly ?? 0) - (a.pypiWeekly ?? 0)
      if (skillSort === 'name') return a.name.localeCompare(b.name)
      return 0
    })
    return items
  }, [skillSort, search])

  const hardware = useMemo(() => {
    let items = (hardwareData as HardwareItem[]).filter(
      (h) =>
        !search ||
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.brand.toLowerCase().includes(search.toLowerCase()) ||
        h.category.toLowerCase().includes(search.toLowerCase())
    )
    items = [...items].sort((a, b) => {
      if (hardwareSort === 'geekbench')
        return (b.geekbenchMultiCore ?? 0) - (a.geekbenchMultiCore ?? 0)
      if (hardwareSort === 'rating')
        return (b.amazonRating ?? 0) - (a.amazonRating ?? 0)
      if (hardwareSort === 'price')
        return parsePriceNum(a.pricing) - parsePriceNum(b.pricing)
      return 0
    })
    return items
  }, [hardwareSort, search])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'skills', label: '🛠️ Skills' },
    { key: 'hardware', label: '🏠 Hardware' },
    { key: 'models', label: '🧠 Models' },
  ]

  const brandSlug = (brand: string) =>
    brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  return (
    <>
      <Navbar
        search={{ value: search, onChange: setSearch, placeholder: 'Search rankings...' }}
      />
      <main className="min-h-screen bg-black page-enter">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Rankings
            </h1>
            <p className="text-gray-400">
              AI Skills & Hardware ranked by the community
            </p>
          </div>

          {/* Tab bar + View toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    tab === t.key
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
              <button
                onClick={() => setView('global')}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  view === 'global'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🌍 Global
              </button>
              <button
                onClick={() => setView('community')}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  view === 'community'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🦞 Community
              </button>
            </div>
          </div>

          {/* Community Coming Soon overlay */}
          {view === 'community' ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-4">🦞</p>
              <h2 className="text-2xl font-bold text-white mb-2">
                Community Rankings
              </h2>
              <p className="text-gray-400">Coming Soon</p>
              <p className="text-gray-500 text-sm mt-2">
                Community members will vote and rank their favorite tools
              </p>
            </div>
          ) : tab === 'models' ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-4">🧠</p>
              <h2 className="text-2xl font-bold text-white mb-2">
                Model Rankings
              </h2>
              <p className="text-gray-400">Coming Soon</p>
              <p className="text-gray-500 text-sm mt-2">
                Open-source and commercial model benchmarks
              </p>
            </div>
          ) : tab === 'skills' ? (
            <>
              {/* Leaderboard Section — OpenRouter-style */}
              <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      📊 Skill Leaderboard
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Compare the most popular AI skills by real usage data
                    </p>
                  </div>
                  <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
                    {([
                      ['popularity', '🔥 Popular'],
                      ['stars', '⭐ Stars'],
                      ['npm', '📦 npm'],
                      ['pypi', '🐍 PyPI'],
                    ] as [SkillSort, string][]).map(([s, label]) => (
                      <button
                        key={s}
                        onClick={() => setSkillSort(s)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          skillSort === s
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bar Chart — top 10 */}
                {(() => {
                  const top10 = skills.slice(0, 10)
                  const getVal = (s: SkillItem) => {
                    if (skillSort === 'stars') return s.githubStars ?? 0
                    if (skillSort === 'npm') return s.npmWeekly ?? 0
                    if (skillSort === 'pypi') return s.pypiWeekly ?? 0
                    return (s.githubStars ?? 0) + (s.npmWeekly ?? 0) + (s.pypiWeekly ?? 0) + ((s.dockerPulls ?? 0) / 1000)
                  }
                  const maxVal = Math.max(...top10.map(getVal), 1)
                  const barColor = skillSort === 'stars' ? 'bg-yellow-500/60' :
                    skillSort === 'npm' ? 'bg-green-500/60' :
                    skillSort === 'pypi' ? 'bg-blue-500/60' : 'bg-gradient-to-r from-blue-500/60 via-green-500/60 to-yellow-500/60'
                  return (
                    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 sm:p-6 mb-8">
                      <div className="space-y-3">
                        {top10.map((skill, i) => {
                          const val = getVal(skill)
                          const pct = (val / maxVal) * 100
                          return (
                            <div key={skill.name} className="flex items-center gap-3 group">
                              <span className="text-gray-500 font-mono text-sm w-6 text-right shrink-0">{i + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <a
                                      href={skill.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-white text-sm font-medium hover:text-blue-400 transition-colors truncate"
                                    >
                                      {skill.name}
                                    </a>
                                    <span className="text-gray-600 text-xs hidden sm:inline">
                                      by {skill.brand}
                                    </span>
                                  </div>
                                  <span className="text-gray-300 text-sm font-mono shrink-0 ml-2">
                                    {val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` :
                                     val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                    style={{ width: `${Math.max(pct, 2)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Show more toggle */}
                {showAllSkills ? null : skills.length > 10 && (
                  <div className="text-center mb-8">
                    <button
                      onClick={() => setShowAllSkills(true)}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      Show more ↓
                    </button>
                  </div>
                )}
              </div>

              {/* Category Breakdown */}
              <div className="mb-12">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                  🏷️ By Category
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(
                    skills.reduce<Record<string, number>>((acc, s) => {
                      acc[s.category] = (acc[s.category] || 0) + 1
                      return acc
                    }, {})
                  ).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                    <div key={cat} className="bg-gray-900/50 rounded-lg border border-gray-800 p-3 hover:border-gray-700 transition-colors">
                      <div className="text-xs text-gray-400">{CATEGORY_LABELS[cat] || cat}</div>
                      <div className="text-white font-bold text-lg">{count}</div>
                      <div className="text-gray-500 text-xs">skills</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full List (if expanded or on mobile) */}
              {showAllSkills && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-4">All Skills</h2>
                  <div className="space-y-2">
                    {skills.map((skill, i) => {
                      const mainVal = skillSort === 'stars' ? skill.githubStars :
                        skillSort === 'npm' ? skill.npmWeekly :
                        skillSort === 'pypi' ? skill.pypiWeekly : null
                      return (
                        <div key={skill.name} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-900/50 transition-colors border-b border-gray-800/30">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-gray-600 font-mono text-sm w-7 text-right shrink-0">{i + 1}.</span>
                            <div className="min-w-0">
                              <a
                                href={skill.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white text-sm font-medium hover:text-blue-400 transition-colors"
                              >
                                {skill.name}
                              </a>
                              <span className="text-gray-600 text-xs ml-2">
                                {skill.brand}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 hidden sm:inline-block">
                              {CATEGORY_LABELS[skill.category] || skill.category}
                            </span>
                            <div className="flex gap-3 text-xs font-mono">
                              {skill.githubStars ? (
                                <span className="text-yellow-400/70">
                                  ⭐ {skill.githubStars >= 1000 ? `${(skill.githubStars / 1000).toFixed(0)}k` : skill.githubStars}
                                </span>
                              ) : null}
                              {skill.npmWeekly ? (
                                <span className="text-green-400/70 hidden md:inline">
                                  📦 {skill.npmWeekly >= 1000000 ? `${(skill.npmWeekly / 1000000).toFixed(1)}M` : `${(skill.npmWeekly / 1000).toFixed(0)}k`}
                                </span>
                              ) : null}
                              {skill.pypiWeekly ? (
                                <span className="text-blue-400/70 hidden md:inline">
                                  🐍 {skill.pypiWeekly >= 1000000 ? `${(skill.pypiWeekly / 1000000).toFixed(1)}M` : `${(skill.pypiWeekly / 1000).toFixed(0)}k`}
                                </span>
                              ) : null}
                            </div>
                            {skill.canflySlug && (
                              <Link
                                to={`/apps/${skill.canflySlug}`}
                                className="text-xs px-2 py-0.5 rounded-full bg-green-600/20 text-green-400 border border-green-600/40 hover:bg-green-600/30 transition-colors"
                              >
                                Tutorial
                              </Link>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <p className="text-gray-500 text-xs">
                Data from GitHub, npm, PyPI, Docker Hub • Updated {skills[0]?.updatedAt || 'recently'}
              </p>
            </>
          ) : (
            <>
              {/* Hardware sort controls */}
              <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
                <span>Sort by:</span>
                {(
                  [
                    ['geekbench', 'Geekbench'],
                    ['rating', 'Rating'],
                    ['price', 'Price'],
                  ] as [HardwareSort, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setHardwareSort(key)}
                    className={`px-2 py-1 rounded transition-colors ${
                      hardwareSort === key
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-600/40'
                        : 'hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Hardware table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="py-3 pr-3 w-10">#</th>
                      <th className="py-3 pr-3">Name</th>
                      <th className="py-3 pr-3 hidden sm:table-cell">
                        🏆 Geekbench
                      </th>
                      <th className="py-3 pr-3 hidden md:table-cell">
                        RAM
                      </th>
                      <th className="py-3 pr-3 hidden sm:table-cell">
                        ⭐ Rating
                      </th>
                      <th className="py-3 pr-3">💰 Price</th>
                      <th className="py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hardware.map((hw, i) => (
                      <tr
                        key={hw.name}
                        className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors"
                      >
                        <td className="py-3 pr-3 text-gray-500 font-mono">
                          {i + 1}
                        </td>
                        <td className="py-3 pr-3">
                          <div>
                            {hw.website ? (
                              <a
                                href={hw.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white font-medium hover:text-blue-400 transition-colors"
                              >
                                {hw.name}
                              </a>
                            ) : (
                              <span className="text-white font-medium">
                                {hw.name}
                              </span>
                            )}
                            <div className="text-gray-500 text-xs mt-0.5">
                              by{' '}
                              <Link
                                to={`/rankings/brand/${brandSlug(hw.brand)}`}
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                {hw.brand}
                              </Link>
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                                {CATEGORY_LABELS[hw.category] || hw.category}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3 hidden sm:table-cell">
                          {hw.geekbenchSingleCore ? (
                            <div className="text-xs">
                              <span className="text-white font-mono">
                                {hw.geekbenchMultiCore?.toLocaleString()}
                              </span>
                              <span className="text-gray-500 ml-1">MC</span>
                              <br />
                              <span className="text-gray-400 font-mono">
                                {hw.geekbenchSingleCore?.toLocaleString()}
                              </span>
                              <span className="text-gray-500 ml-1">SC</span>
                            </div>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-3 hidden md:table-cell text-gray-300 text-xs">
                          {hw.maxMemoryGB ? `${hw.maxMemoryGB} GB` : '—'}
                        </td>
                        <td className="py-3 pr-3 hidden sm:table-cell">
                          {hw.amazonRating ? (
                            <div className="text-xs">
                              <span className="text-yellow-400">
                                {hw.amazonRating}
                              </span>
                              <span className="text-gray-500 ml-1">
                                ({hw.amazonReviewCount?.toLocaleString()})
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="text-white font-medium text-sm">
                            {hw.pricing}
                          </div>
                          <div className="text-gray-500 text-xs truncate max-w-[120px]">
                            {hw.pricingNote}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          {hw.canflySlug ? (
                            <Link
                              to={`/apps/hardware/${hw.canflySlug}`}
                              className="text-xs px-2.5 py-1 rounded-full bg-green-600/20 text-green-400 border border-green-600/40 hover:bg-green-600/30 transition-colors"
                            >
                              View
                            </Link>
                          ) : hw.amazonUrl ? (
                            <a
                              href={hw.amazonUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-2.5 py-1 rounded-full bg-yellow-600/20 text-yellow-400 border border-yellow-600/40 hover:bg-yellow-600/30 transition-colors"
                            >
                              Amazon
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-gray-500 text-xs mt-4">
                {hardware.length} items listed
              </p>
            </>
          )}
        </div>
      </main>
    </>
  )
}
