import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import skillsData from '../../data/rankings-skills.json'
import hardwareData from '../../data/rankings-hardware.json'

type Tab = 'skills' | 'hardware' | 'models'
type View = 'global' | 'community'
type SkillSort = 'name' | 'category' | 'brand'
type HardwareSort = 'geekbench' | 'rating' | 'price'

interface SkillItem {
  name: string
  category: string
  brand: string
  description: string
  githubRepo: string | null
  npmPackage: string | null
  pypiPackage: string | null
  pricing: string
  website: string
  canflyPage: string | null
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
  const [skillSort, setSkillSort] = useState<SkillSort>('name')
  const [hardwareSort, setHardwareSort] = useState<HardwareSort>('geekbench')
  const [search, setSearch] = useState('')

  const skills = useMemo(() => {
    let items = (skillsData as SkillItem[]).filter(
      (s) =>
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.brand.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())
    )
    items = [...items].sort((a, b) => {
      if (skillSort === 'name') return a.name.localeCompare(b.name)
      if (skillSort === 'category') return a.category.localeCompare(b.category)
      if (skillSort === 'brand') return a.brand.localeCompare(b.brand)
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
              {/* Sort controls */}
              <div className="flex items-center gap-2 mb-4 text-sm text-gray-400">
                <span>Sort by:</span>
                {(['name', 'category', 'brand'] as SkillSort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSkillSort(s)}
                    className={`px-2 py-1 rounded transition-colors ${
                      skillSort === s
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-600/40'
                        : 'hover:text-white'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              {/* Skills table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="py-3 pr-3 w-10">#</th>
                      <th className="py-3 pr-3">Name</th>
                      <th className="py-3 pr-3 hidden sm:table-cell">Category</th>
                      <th className="py-3 pr-3 hidden md:table-cell">Pricing</th>
                      <th className="py-3 pr-3 hidden lg:table-cell">Packages</th>
                      <th className="py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {skills.map((skill, i) => (
                      <tr
                        key={skill.name}
                        className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors"
                      >
                        <td className="py-3 pr-3 text-gray-500 font-mono">
                          {i + 1}
                        </td>
                        <td className="py-3 pr-3">
                          <div>
                            <a
                              href={skill.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white font-medium hover:text-blue-400 transition-colors"
                            >
                              {skill.name}
                            </a>
                            <div className="text-gray-500 text-xs mt-0.5">
                              by{' '}
                              <Link
                                to={`/rankings/brand/${brandSlug(skill.brand)}`}
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                {skill.brand}
                              </Link>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-3 hidden sm:table-cell">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                            {CATEGORY_LABELS[skill.category] || skill.category}
                          </span>
                        </td>
                        <td className="py-3 pr-3 hidden md:table-cell text-gray-400 text-xs max-w-[180px] truncate">
                          {skill.pricing}
                        </td>
                        <td className="py-3 pr-3 hidden lg:table-cell">
                          <div className="flex gap-2 text-xs">
                            {skill.githubRepo && (
                              <a
                                href={`https://github.com/${skill.githubRepo}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                GitHub
                              </a>
                            )}
                            {skill.npmPackage && (
                              <a
                                href={`https://www.npmjs.com/package/${skill.npmPackage}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                npm
                              </a>
                            )}
                            {skill.pypiPackage && (
                              <a
                                href={`https://pypi.org/project/${skill.pypiPackage}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-white transition-colors"
                              >
                                PyPI
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          {skill.canflyPage && (
                            <Link
                              to={skill.canflyPage}
                              className="text-xs px-2.5 py-1 rounded-full bg-green-600/20 text-green-400 border border-green-600/40 hover:bg-green-600/30 transition-colors"
                            >
                              Tutorial
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-gray-500 text-xs mt-4">
                {skills.length} skills listed
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
