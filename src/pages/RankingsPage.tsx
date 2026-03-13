import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import skillsData from '../../data/rankings-skills.json'
import hardwareData from '../../data/rankings-hardware.json'

type Tab = 'skills' | 'hardware' | 'models'
type View = 'global' | 'community'
type SkillSort = 'popularity' | 'clawhub' | 'github' | 'newest' | 'price'
type HardwareSort = 'popularity' | 'performance' | 'rating' | 'newest' | 'price'
type PriceDir = 'asc' | 'desc'

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
  clawhubDownloads?: number | null
  productHuntUpvotes?: number | null
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
  amazonBSR: number | null
  mediaScore: number | null
  productHuntUpvotes?: number | null
  pricing: string
  pricingNote: string
  keySpec: string
  canflySlug: string | null
  website: string | null
  updatedAt?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  'ai-framework': 'AI Framework',
  'tts-stt': 'Voice / TTS',
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

// Percentile normalization: rank items by a metric, return 0-100 score
function computePercentiles(items: { value: number | null }[]): (number | null)[] {
  const validValues = items
    .map((item, i) => ({ value: item.value, index: i }))
    .filter((x) => x.value !== null && x.value !== undefined)
    .sort((a, b) => (a.value as number) - (b.value as number))

  const scores: (number | null)[] = new Array(items.length).fill(null)
  const n = validValues.length
  if (n === 0) return scores

  validValues.forEach((item, rank) => {
    scores[item.index] = n === 1 ? 100 : (rank / (n - 1)) * 100
  })

  return scores
}

// Skills popularity: ClawHub 30%, GitHub 20%, npm 15%, PyPI 15%, Docker 10%, PH 10%
function computeSkillPopularity(items: SkillItem[]): number[] {
  const weights = [
    { key: 'clawhubDownloads' as const, weight: 0.3 },
    { key: 'githubStars' as const, weight: 0.2 },
    { key: 'npmWeekly' as const, weight: 0.15 },
    { key: 'pypiWeekly' as const, weight: 0.15 },
    { key: 'dockerPulls' as const, weight: 0.1 },
    { key: 'productHuntUpvotes' as const, weight: 0.1 },
  ]

  const percentilesByMetric = weights.map(({ key }) =>
    computePercentiles(items.map((item) => ({ value: (item[key] as number | null | undefined) ?? null })))
  )

  return items.map((_, i) => {
    let totalWeight = 0
    let weightedSum = 0

    weights.forEach(({ weight }, mi) => {
      const pctile = percentilesByMetric[mi][i]
      if (pctile !== null) {
        totalWeight += weight
        weightedSum += pctile * weight
      }
    })

    if (totalWeight === 0) return 0
    return weightedSum / totalWeight
  })
}

// Hardware popularity: Geekbench 25%, Amazon Reviews 20%, Rating 15%, BSR 15%, Media 15%, PH 10%
function computeHardwarePopularity(items: HardwareItem[]): number[] {
  const weights: { key: string; weight: number; invert?: boolean }[] = [
    { key: 'geekbenchMultiCore', weight: 0.25 },
    { key: 'amazonReviewCount', weight: 0.2 },
    { key: 'amazonRating', weight: 0.15 },
    { key: 'amazonBSR', weight: 0.15, invert: true },
    { key: 'mediaScore', weight: 0.15 },
    { key: 'productHuntUpvotes', weight: 0.1 },
  ]

  const percentilesByMetric = weights.map(({ key, invert }) => {
    const pctiles = computePercentiles(
      items.map((item) => ({ value: (item[key as keyof HardwareItem] as number | null) ?? null }))
    )
    if (invert) {
      return pctiles.map((p) => (p !== null ? 100 - p : null))
    }
    return pctiles
  })

  return items.map((_, i) => {
    let totalWeight = 0
    let weightedSum = 0

    weights.forEach(({ weight }, mi) => {
      const pctile = percentilesByMetric[mi][i]
      if (pctile !== null) {
        totalWeight += weight
        weightedSum += pctile * weight
      }
    })

    if (totalWeight === 0) return 0
    return weightedSum / totalWeight
  })
}

export default function RankingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('skills')
  const [view, setView] = useState<View>('global')
  const [skillSort, setSkillSort] = useState<SkillSort>('popularity')
  const [hardwareSort, setHardwareSort] = useState<HardwareSort>('popularity')
  const [skillPriceDir, setSkillPriceDir] = useState<PriceDir>('asc')
  const [hwPriceDir, setHwPriceDir] = useState<PriceDir>('asc')
  const [search, setSearch] = useState('')
  const [showAllSkills, setShowAllSkills] = useState(false)

  const skills = useMemo(() => {
    const items = (skillsData as SkillItem[]).filter(
      (s) =>
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.brand.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())
    )

    const popularityScores = computeSkillPopularity(items)
    const inSiteApps = items.filter((item) => item.canflySlug)
    const externalOnly = items.filter((item) => !item.canflySlug)
    const popMap = new Map(items.map((item, i) => [item.name, popularityScores[i]]))

    const sortFn = (a: SkillItem, b: SkillItem) => {
      if (skillSort === 'popularity') return (popMap.get(b.name) ?? 0) - (popMap.get(a.name) ?? 0)
      if (skillSort === 'clawhub') return (b.clawhubDownloads ?? 0) - (a.clawhubDownloads ?? 0)
      if (skillSort === 'github') return (b.githubStars ?? 0) - (a.githubStars ?? 0)
      if (skillSort === 'newest') return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
      if (skillSort === 'price') {
        const diff = parsePriceNum(a.pricing) - parsePriceNum(b.pricing)
        return skillPriceDir === 'asc' ? diff : -diff
      }
      return 0
    }

    const sortedInSite = [...inSiteApps].sort(sortFn)
    const sortedExternal = [...externalOnly].sort(sortFn)

    return {
      inSiteApps: sortedInSite,
      externalApps: sortedExternal,
      all: [...sortedInSite, ...sortedExternal],
      popMap,
    }
  }, [skillSort, skillPriceDir, search])

  const hardware = useMemo(() => {
    const items = (hardwareData as HardwareItem[]).filter(
      (h) =>
        !search ||
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.brand.toLowerCase().includes(search.toLowerCase()) ||
        h.category.toLowerCase().includes(search.toLowerCase())
    )

    const popularityScores = computeHardwarePopularity(items)
    const popMap = new Map(items.map((item, i) => [item.name, popularityScores[i]]))

    const sorted = [...items].sort((a, b) => {
      if (hardwareSort === 'popularity') return (popMap.get(b.name) ?? 0) - (popMap.get(a.name) ?? 0)
      if (hardwareSort === 'performance') return (b.geekbenchMultiCore ?? 0) - (a.geekbenchMultiCore ?? 0)
      if (hardwareSort === 'rating') return (b.amazonRating ?? 0) - (a.amazonRating ?? 0)
      if (hardwareSort === 'newest') return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
      if (hardwareSort === 'price') {
        const diff = parsePriceNum(a.pricing) - parsePriceNum(b.pricing)
        return hwPriceDir === 'asc' ? diff : -diff
      }
      return 0
    })
    return { items: sorted, popMap }
  }, [hardwareSort, hwPriceDir, search])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'skills', label: '\uD83D\uDEE0\uFE0F ' + t('rankings.tabs.skills') },
    { key: 'hardware', label: '\uD83C\uDFE0 ' + t('rankings.tabs.hardware') },
    { key: 'models', label: '\uD83E\uDDE0 ' + t('rankings.tabs.models') },
  ]

  const skillSortTabs: { key: SkillSort; label: string }[] = [
    { key: 'popularity', label: '\uD83D\uDD25 ' + t('rankings.skills.sortBy.popularity') },
    { key: 'clawhub', label: '\uD83D\uDCE6 ' + t('rankings.skills.sortBy.clawhub') },
    { key: 'github', label: '\u2B50 ' + t('rankings.skills.sortBy.github') },
    { key: 'newest', label: '\uD83C\uDD95 ' + t('rankings.skills.sortBy.newest') },
    { key: 'price', label: '\uD83D\uDCB0 ' + t('rankings.skills.sortBy.price') + (skillSort === 'price' ? (skillPriceDir === 'asc' ? '\u25B2' : '\u25BC') : '') },
  ]

  const hwSortTabs: { key: HardwareSort; label: string }[] = [
    { key: 'popularity', label: '\uD83D\uDD25 ' + t('rankings.hardware.sortBy.popularity') },
    { key: 'performance', label: '\uD83C\uDFC6 ' + t('rankings.hardware.sortBy.performance') },
    { key: 'rating', label: '\u2B50 ' + t('rankings.hardware.sortBy.rating') },
    { key: 'newest', label: '\uD83C\uDD95 ' + t('rankings.hardware.sortBy.newest') },
    { key: 'price', label: '\uD83D\uDCB0 ' + t('rankings.hardware.sortBy.price') + (hardwareSort === 'price' ? (hwPriceDir === 'asc' ? '\u25B2' : '\u25BC') : '') },
  ]

  const brandSlug = (brand: string) =>
    brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleSkillSortClick = (key: SkillSort) => {
    if (key === 'price' && skillSort === 'price') {
      setSkillPriceDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSkillSort(key)
      if (key === 'price') setSkillPriceDir('asc')
    }
  }

  const handleHwSortClick = (key: HardwareSort) => {
    if (key === 'price' && hardwareSort === 'price') {
      setHwPriceDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setHardwareSort(key)
      if (key === 'price') setHwPriceDir('asc')
    }
  }

  const getSkillBarVal = (skill: SkillItem) => {
    if (skillSort === 'popularity') return skills.popMap.get(skill.name) ?? 0
    if (skillSort === 'clawhub') return skill.clawhubDownloads ?? 0
    if (skillSort === 'github') return skill.githubStars ?? 0
    if (skillSort === 'price') return parsePriceNum(skill.pricing)
    return 0
  }

  const formatBarVal = (val: number) => {
    if (skillSort === 'popularity') return val.toFixed(0)
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`
    return String(val)
  }

  return (
    <>
      <Navbar
        search={{ value: search, onChange: setSearch, placeholder: t('rankings.searchPlaceholder') }}
      />
      <main className="min-h-screen bg-black page-enter">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {t('rankings.title')}
            </h1>
            <p className="text-gray-400">
              {t('rankings.description')}
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
                🌍 {t('rankings.views.global')}
              </button>
              <button
                onClick={() => setView('community')}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  view === 'community'
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🦞 {t('rankings.views.community')}
              </button>
            </div>
          </div>

          {/* Community Coming Soon overlay */}
          {view === 'community' ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-4">🦞</p>
              <h2 className="text-2xl font-bold text-white mb-2">
                {t('rankings.community.title')}
              </h2>
              <p className="text-gray-400">{t('rankings.comingSoon')}</p>
              <p className="text-gray-500 text-sm mt-2">
                {t('rankings.community.description')}
              </p>
            </div>
          ) : tab === 'models' ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-4">🧠</p>
              <h2 className="text-2xl font-bold text-white mb-2">
                {t('rankings.models.title')}
              </h2>
              <p className="text-gray-400">{t('rankings.comingSoon')}</p>
              <p className="text-gray-500 text-sm mt-2">
                {t('rankings.models.description')}
              </p>
            </div>
          ) : tab === 'skills' ? (
            <>
              {/* Leaderboard Section */}
              <div className="mb-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      📊 {t('rankings.skills.leaderboard.title')}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {t('rankings.skills.leaderboard.description')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 bg-gray-900 rounded-lg p-1">
                    {skillSortTabs.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => handleSkillSortClick(key)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          skillSort === key
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bar Chart — top 10 (not for newest) */}
                {skillSort !== 'newest' && (() => {
                  const top10 = skills.all.slice(0, 10)
                  const maxVal = Math.max(...top10.map(getSkillBarVal), 1)
                  const barColor = skillSort === 'github' ? 'bg-yellow-500/60' :
                    skillSort === 'clawhub' ? 'bg-orange-500/60' :
                    skillSort === 'price' ? 'bg-emerald-500/60' :
                    'bg-gradient-to-r from-blue-500/60 via-green-500/60 to-yellow-500/60'
                  return (
                    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 sm:p-6 mb-8">
                      <div className="space-y-3">
                        {top10.map((skill, i) => {
                          const val = getSkillBarVal(skill)
                          const pct = (val / maxVal) * 100
                          return (
                            <div key={skill.name} className="flex items-center gap-3 group">
                              <span className="text-gray-500 font-mono text-sm w-6 text-right shrink-0">{i + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {skill.canflySlug ? (
                                      <Link
                                        to={`/apps/${skill.canflySlug}`}
                                        className="text-white text-sm font-medium hover:text-blue-400 transition-colors truncate"
                                      >
                                        {skill.name}
                                      </Link>
                                    ) : (
                                      <a
                                        href={skill.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white text-sm font-medium hover:text-blue-400 transition-colors truncate"
                                      >
                                        {skill.name}
                                      </a>
                                    )}
                                    <span className="text-gray-600 text-xs hidden sm:inline">
                                      by {skill.brand}
                                    </span>
                                  </div>
                                  <span className="text-gray-300 text-sm font-mono shrink-0 ml-2">
                                    {skillSort === 'price' ? skill.pricing : formatBarVal(val)}
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

                {/* Newest view: simple list with dates */}
                {skillSort === 'newest' && (
                  <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 sm:p-6 mb-8">
                    <div className="space-y-2">
                      {skills.all.slice(0, 10).map((skill, i) => (
                        <div key={skill.name} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-gray-500 font-mono text-sm w-6 text-right shrink-0">{i + 1}.</span>
                            {skill.canflySlug ? (
                              <Link
                                to={`/apps/${skill.canflySlug}`}
                                className="text-white text-sm font-medium hover:text-blue-400 transition-colors truncate"
                              >
                                {skill.name}
                              </Link>
                            ) : (
                              <a
                                href={skill.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white text-sm font-medium hover:text-blue-400 transition-colors truncate"
                              >
                                {skill.name}
                              </a>
                            )}
                            <span className="text-gray-600 text-xs hidden sm:inline">by {skill.brand}</span>
                          </div>
                          <span className="text-gray-400 text-xs font-mono shrink-0">{skill.updatedAt ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show more toggle */}
                {showAllSkills ? null : skills.all.length > 10 && (
                  <div className="text-center mb-8">
                    <button
                      onClick={() => setShowAllSkills(true)}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {t('rankings.skills.showMore')} ↓
                    </button>
                  </div>
                )}
              </div>

              {/* Category Breakdown */}
              <div className="mb-12">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                  🏷️ {t('rankings.skills.byCategory.title')}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(
                    skills.all.reduce<Record<string, number>>((acc, s) => {
                      acc[s.category] = (acc[s.category] || 0) + 1
                      return acc
                    }, {})
                  ).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                    <div key={cat} className="bg-gray-900/50 rounded-lg border border-gray-800 p-3 hover:border-gray-700 transition-colors">
                      <div className="text-xs text-gray-400">{CATEGORY_LABELS[cat] || cat}</div>
                      <div className="text-white font-bold text-lg">{count}</div>
                      <div className="text-gray-500 text-xs">{t('rankings.skills.byCategory.skillsLabel')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full List (if expanded) */}
              {showAllSkills && (
                <>
                  {skills.inSiteApps.length > 0 && (
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-white mb-4">{t('rankings.skills.allSkills.inSiteApps')}</h2>
                      <div className="space-y-2">
                        {skills.inSiteApps.map((skill, i) => (
                          <div key={skill.name} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-900/50 transition-colors border-b border-gray-800/30">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-gray-600 font-mono text-sm w-7 text-right shrink-0">{i + 1}.</span>
                              <div className="min-w-0">
                                <Link
                                  to={`/apps/${skill.canflySlug}`}
                                  className="text-white text-sm font-medium hover:text-blue-400 transition-colors"
                                >
                                  {skill.name}
                                </Link>
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
                                {skill.clawhubDownloads ? (
                                  <span className="text-orange-400/70 hidden lg:inline">
                                    🦞 {skill.clawhubDownloads >= 1000 ? `${(skill.clawhubDownloads / 1000).toFixed(1)}k` : skill.clawhubDownloads}
                                  </span>
                                ) : null}
                                {skill.productHuntUpvotes ? (
                                  <span className="text-red-400/70 hidden lg:inline">
                                    🔺 {skill.productHuntUpvotes >= 1000 ? `${(skill.productHuntUpvotes / 1000).toFixed(1)}k` : skill.productHuntUpvotes}
                                  </span>
                                ) : null}
                              </div>
                              <Link
                                to={`/apps/${skill.canflySlug}`}
                                className="text-xs px-2 py-0.5 rounded-full bg-green-600/20 text-green-400 border border-green-600/40 hover:bg-green-600/30 transition-colors"
                              >
                                {t('rankings.skills.allSkills.tutorialButton')}
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {skills.externalApps.length > 0 && (
                    <div className="mb-8">
                      <h2 className="text-xl font-bold text-white mb-4">{t('rankings.skills.allSkills.moreTools')}</h2>
                      <div className="space-y-2">
                        {skills.externalApps.map((skill, i) => (
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
                                {skill.clawhubDownloads ? (
                                  <span className="text-orange-400/70 hidden lg:inline">
                                    🦞 {skill.clawhubDownloads >= 1000 ? `${(skill.clawhubDownloads / 1000).toFixed(1)}k` : skill.clawhubDownloads}
                                  </span>
                                ) : null}
                                {skill.productHuntUpvotes ? (
                                  <span className="text-red-400/70 hidden lg:inline">
                                    🔺 {skill.productHuntUpvotes >= 1000 ? `${(skill.productHuntUpvotes / 1000).toFixed(1)}k` : skill.productHuntUpvotes}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <p className="text-gray-500 text-xs">
                Data from GitHub, npm, PyPI, Docker Hub, ClawHub, Product Hunt • Updated {skills.all[0]?.updatedAt || 'recently'}
              </p>
            </>
          ) : (
            <>
              {/* Hardware sort controls */}
              <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-gray-400">
                <span>{t('rankings.hardware.sortBy.label')}:</span>
                {hwSortTabs.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => handleHwSortClick(key)}
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
                      <th className="py-3 pr-3">{t('rankings.hardware.table.name')}</th>
                      {hardwareSort === 'popularity' && (
                        <th className="py-3 pr-3 hidden sm:table-cell">
                          🔥 {t('rankings.hardware.sortBy.popularity')}
                        </th>
                      )}
                      <th className="py-3 pr-3 hidden sm:table-cell">
                        🏆 {t('rankings.hardware.table.geekbench')}
                      </th>
                      <th className="py-3 pr-3 hidden md:table-cell">
                        {t('rankings.hardware.table.ram')}
                      </th>
                      <th className="py-3 pr-3 hidden sm:table-cell">
                        ⭐ {t('rankings.hardware.table.rating')}
                      </th>
                      <th className="py-3 pr-3 hidden lg:table-cell">
                        📰 {t('rankings.hardware.table.mediaScore')}
                      </th>
                      <th className="py-3 pr-3">💰 {t('rankings.hardware.table.price')}</th>
                      <th className="py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hardware.items.map((hw, i) => (
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
                        {hardwareSort === 'popularity' && (
                          <td className="py-3 pr-3 hidden sm:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500/60 to-yellow-500/60"
                                  style={{ width: `${Math.max(hardware.popMap.get(hw.name) ?? 0, 2)}%` }}
                                />
                              </div>
                              <span className="text-gray-300 text-xs font-mono">
                                {(hardware.popMap.get(hw.name) ?? 0).toFixed(0)}
                              </span>
                            </div>
                          </td>
                        )}
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
                              {hw.amazonBSR ? (
                                <div className="text-gray-500 mt-0.5">
                                  BSR #{hw.amazonBSR}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-3 hidden lg:table-cell">
                          {hw.mediaScore ? (
                            <span className={`text-sm font-mono ${
                              hw.mediaScore >= 90 ? 'text-green-400' :
                              hw.mediaScore >= 80 ? 'text-yellow-400' :
                              'text-gray-400'
                            }`}>
                              {hw.mediaScore}/100
                            </span>
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
                              {t('rankings.hardware.table.viewButton')}
                            </Link>
                          ) : hw.amazonUrl ? (
                            <a
                              href={hw.amazonUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-2.5 py-1 rounded-full bg-yellow-600/20 text-yellow-400 border border-yellow-600/40 hover:bg-yellow-600/30 transition-colors"
                            >
                              {t('rankings.hardware.table.amazonButton')}
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-gray-500 text-xs mt-4">
                {t('rankings.hardware.itemsListed', { count: hardware.items.length })}
              </p>
            </>
          )}
        </div>
      </main>
    </>
  )
}
