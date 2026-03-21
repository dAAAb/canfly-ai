import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import TrustBadge from '../components/TrustBadge'
import { getTrustLevel } from '../utils/trustLevel'
import skillsData from '../../data/rankings-skills.json'
import hardwareData from '../../data/rankings-hardware.json'

type Tab = 'skills' | 'hardware' | 'models'
type View = 'global' | 'community'
type SkillSort = 'popularity' | 'clawhub' | 'stars' | 'newest' | 'price'
type HardwareSort = 'popularity' | 'geekbench' | 'rating' | 'newest' | 'price'
type ModelSort = 'score' | 'speed' | 'cost'
type CommunitySort = 'trustScore' | 'agents' | 'newest' | 'activity'

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

/** Compute a composite trust score (0-100) from verification + agent activity */
function computeTrustScore(user: CommunityUser): number {
  const vl = user.verification_level?.toLowerCase()
  let verificationPts = 0
  if (vl === 'orb') verificationPts = 50
  else if (vl === 'world' || vl === 'device' || vl === 'worldid') verificationPts = 40
  else if (user.wallet_address) verificationPts = 20

  // Agent contribution: up to 30 points (logarithmic scale)
  const agentPts = Math.min(30, user.agent_count > 0 ? Math.log2(user.agent_count + 1) * 15 : 0)

  // Account age bonus: up to 20 points (max at 30 days)
  const refDate = user.claimed_at || user.created_at
  const ageDays = Math.max((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24), 0)
  const agePts = Math.min(20, (ageDays / 30) * 20)

  return Math.min(100, Math.round(verificationPts + agentPts + agePts))
}

/** Activity score: recent activity weighted by verification */
function activityScore(user: CommunityUser): number {
  const agentScore = (user.agent_count || 0) + 1
  const refDate = user.claimed_at || user.created_at
  const ageMs = Date.now() - new Date(refDate).getTime()
  const ageDays = Math.max(ageMs / (1000 * 60 * 60 * 24), 0.5)
  const decay = 1 / Math.log2(ageDays + 2)
  const vl = user.verification_level?.toLowerCase()
  const vWeight = (vl === 'orb' || vl === 'world' || vl === 'device' || vl === 'worldid') ? 2 : user.wallet_address ? 1.5 : 1
  return agentScore * decay * vWeight
}

interface ModelEntry {
  model: string
  provider: string
  best_score_percentage: number
  average_score_percentage: number
  average_execution_time_seconds: number
  best_execution_time_seconds: number
  average_cost_usd: number
  best_cost_usd: number
  submission_count: number
  latest_submission: string
  best_submission_id: string
  weights: string
  hf_link: string | null
}

const PROVIDER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  anthropic: { bg: 'bg-amber-900/30', text: 'text-amber-300', border: 'border-amber-700/50' },
  google: { bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700/50' },
  openai: { bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-700/50' },
  deepseek: { bg: 'bg-cyan-900/30', text: 'text-cyan-300', border: 'border-cyan-700/50' },
  mistral: { bg: 'bg-orange-900/30', text: 'text-orange-300', border: 'border-orange-700/50' },
  meta: { bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700/50' },
  cohere: { bg: 'bg-purple-900/30', text: 'text-purple-300', border: 'border-purple-700/50' },
}

const DEFAULT_PROVIDER_COLOR = { bg: 'bg-gray-800/50', text: 'text-gray-300', border: 'border-gray-700/50' }

function getProviderColor(provider: string) {
  return PROVIDER_COLORS[provider.toLowerCase()] || DEFAULT_PROVIDER_COLOR
}

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
  pricing: string
  pricingNote: string
  keySpec: string
  canflySlug: string | null
  website: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  'ai-framework': 'AI Framework',
  tts: 'Voice / TTS',
  'tts-stt': 'Voice / TTS',
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

/** Convert raw values to percentile ranks (0-100). Items with null/0 get null. */
function computePercentiles<T>(items: T[], getter: (item: T) => number | null | undefined): Map<T, number | null> {
  const result = new Map<T, number | null>()
  const withValues: { item: T; val: number }[] = []
  for (const item of items) {
    const v = getter(item)
    if (v != null && v > 0) {
      withValues.push({ item, val: v })
    } else {
      result.set(item, null)
    }
  }
  if (withValues.length === 0) return result
  withValues.sort((a, b) => a.val - b.val)
  for (let i = 0; i < withValues.length; i++) {
    // Use (i+1)/(n+1) so the lowest is never 0 and the highest is never exactly 100
    const pct = withValues.length === 1 ? 100 : Math.round(((i + 1) / (withValues.length + 1)) * 100)
    result.set(withValues[i].item, pct)
  }
  return result
}

/** Compute weighted popularity from percentile maps. Missing metrics get zeroed and remaining weights rescale. */
function weightedPopularity<T>(
  item: T,
  metrics: { pctMap: Map<T, number | null>; weight: number }[]
): number {
  let totalWeight = 0
  let score = 0
  for (const { pctMap, weight } of metrics) {
    const pct = pctMap.get(item)
    if (pct != null) {
      totalWeight += weight
      score += pct * weight
    }
  }
  return totalWeight > 0 ? score / totalWeight : 0
}

function formatNum(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`
  return String(val)
}

export default function RankingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('skills')
  const [view, setView] = useState<View>('global')
  const [skillSort, setSkillSort] = useState<SkillSort>('popularity')
  const [skillPriceAsc, setSkillPriceAsc] = useState(true)
  const [hardwareSort, setHardwareSort] = useState<HardwareSort>('popularity')
  const [hardwarePriceAsc, setHardwarePriceAsc] = useState(true)
  const [search, setSearch] = useState('')
  const [showAllSkills, setShowAllSkills] = useState(false)
  const [scoringInfo, setScoringInfo] = useState<'skills' | 'hardware' | null>(null)
  const [modelSort, setModelSort] = useState<ModelSort>('score')
  const [modelsData, setModelsData] = useState<ModelEntry[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [communitySort, setCommunitySort] = useState<CommunitySort>('trustScore')
  const [communityUsers, setCommunityUsers] = useState<CommunityUser[]>([])
  const [communityLoading, setCommunityLoading] = useState(false)

  useEffect(() => {
    if (tab !== 'models' || modelsData.length > 0) return
    setModelsLoading(true)
    setModelsError(null)
    fetch(`/api/rankings/models?sort=score&limit=100`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { models: ModelEntry[] }) => {
        setModelsData(data.models)
      })
      .catch(err => {
        setModelsError(err instanceof Error ? err.message : 'Unknown error')
      })
      .finally(() => setModelsLoading(false))
  }, [tab, modelsData.length])

  // Fetch community users when switching to community view
  useEffect(() => {
    if (view !== 'community' || communityUsers.length > 0) return
    setCommunityLoading(true)
    fetch('/api/community/users?limit=100')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { users: CommunityUser[] }) => {
        setCommunityUsers(data.users)
      })
      .catch(() => {
        // silently fail — will show empty state
      })
      .finally(() => setCommunityLoading(false))
  }, [view, communityUsers.length])

  // Sorted & filtered community users
  const communityRanked = useMemo(() => {
    const q = search.toLowerCase()
    let filtered = communityUsers.filter(u =>
      !q ||
      u.username.toLowerCase().includes(q) ||
      (u.display_name || '').toLowerCase().includes(q)
    )

    const trustScores = new Map<CommunityUser, number>()
    const activityScores = new Map<CommunityUser, number>()
    for (const u of filtered) {
      trustScores.set(u, computeTrustScore(u))
      activityScores.set(u, activityScore(u))
    }

    switch (communitySort) {
      case 'agents':
        filtered = [...filtered].sort((a, b) => b.agent_count - a.agent_count)
        break
      case 'newest':
        filtered = [...filtered].sort((a, b) =>
          new Date(b.claimed_at || b.created_at).getTime() -
          new Date(a.claimed_at || a.created_at).getTime()
        )
        break
      case 'activity':
        filtered = [...filtered].sort((a, b) => (activityScores.get(b) ?? 0) - (activityScores.get(a) ?? 0))
        break
      case 'trustScore':
      default:
        filtered = [...filtered].sort((a, b) => (trustScores.get(b) ?? 0) - (trustScores.get(a) ?? 0))
        break
    }

    return { users: filtered, trustScores, activityScores }
  }, [communityUsers, communitySort, search])

  // Community stats
  const communityStats = useMemo(() => {
    const total = communityUsers.length
    const verified = communityUsers.filter(u => {
      const vl = u.verification_level?.toLowerCase()
      return vl === 'orb' || vl === 'world' || vl === 'device' || vl === 'worldid'
    }).length
    const totalAgents = communityUsers.reduce((sum, u) => sum + u.agent_count, 0)
    const avgAgents = total > 0 ? (totalAgents / total).toFixed(1) : '0'
    return { total, verified, totalAgents, avgAgents }
  }, [communityUsers])

  const sortedModels = useMemo(() => {
    const items = [...modelsData]
    const q = search.toLowerCase()
    const filtered = q
      ? items.filter(m => m.model.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q))
      : items
    switch (modelSort) {
      case 'speed':
        return filtered.sort((a, b) => a.best_execution_time_seconds - b.best_execution_time_seconds)
      case 'cost':
        return filtered.sort((a, b) => {
          const ratioA = a.best_cost_usd > 0 ? a.best_score_percentage / a.best_cost_usd : Infinity
          const ratioB = b.best_cost_usd > 0 ? b.best_score_percentage / b.best_cost_usd : Infinity
          return ratioB - ratioA
        })
      case 'score':
      default:
        return filtered.sort((a, b) => b.best_score_percentage - a.best_score_percentage)
    }
  }, [modelsData, modelSort, search])

  const skills = useMemo(() => {
    const allItems = skillsData as SkillItem[]

    // Compute percentiles across ALL items (before filtering)
    const clawhubPct = computePercentiles(allItems, s => s.clawhubDownloads)
    const githubPct = computePercentiles(allItems, s => s.githubStars)
    const npmPct = computePercentiles(allItems, s => s.npmWeekly)
    const pypiPct = computePercentiles(allItems, s => s.pypiWeekly)
    const dockerPct = computePercentiles(allItems, s => s.dockerPulls)
    const phPct = computePercentiles(allItems, s => s.productHuntUpvotes)

    const popularityScores = new Map<SkillItem, number>()
    for (const item of allItems) {
      popularityScores.set(item, weightedPopularity(item, [
        { pctMap: clawhubPct, weight: 0.30 },
        { pctMap: githubPct, weight: 0.20 },
        { pctMap: npmPct, weight: 0.15 },
        { pctMap: pypiPct, weight: 0.15 },
        { pctMap: dockerPct, weight: 0.10 },
        { pctMap: phPct, weight: 0.10 },
      ]))
    }

    // Filter by search
    let items = allItems.filter(
      (s) =>
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.brand.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase())
    )

    // Separate in-site apps from external-only items
    const inSiteApps = items.filter(item => item.canflySlug)
    const externalOnly = items.filter(item => !item.canflySlug)

    const sortFn = (a: SkillItem, b: SkillItem) => {
      if (skillSort === 'popularity') return (popularityScores.get(b) ?? 0) - (popularityScores.get(a) ?? 0)
      if (skillSort === 'clawhub') return (b.clawhubDownloads ?? 0) - (a.clawhubDownloads ?? 0)
      if (skillSort === 'stars') return (b.githubStars ?? 0) - (a.githubStars ?? 0)
      if (skillSort === 'newest') return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
      if (skillSort === 'price') {
        const diff = parsePriceNum(a.pricing) - parsePriceNum(b.pricing)
        return skillPriceAsc ? diff : -diff
      }
      return 0
    }

    const sortedInSite = [...inSiteApps].sort(sortFn)
    const sortedExternal = [...externalOnly].sort(sortFn)

    return {
      inSiteApps: sortedInSite,
      externalApps: sortedExternal,
      all: [...sortedInSite, ...sortedExternal],
      popularityScores,
    }
  }, [skillSort, skillPriceAsc, search])

  const hardware = useMemo(() => {
    const allItems = hardwareData as HardwareItem[]

    // Compute percentiles across ALL items
    const geekPct = computePercentiles(allItems, h => h.geekbenchMultiCore)
    const reviewCountPct = computePercentiles(allItems, h => h.amazonReviewCount)
    const ratingPct = computePercentiles(allItems, h => h.amazonRating)
    // BSR is inverted — lower BSR is better
    const bsrPct = computePercentiles(allItems, h => h.amazonBSR ? (1000 - h.amazonBSR) : null)
    const mediaPct = computePercentiles(allItems, h => h.mediaScore)
    const phPct = computePercentiles(allItems, () => null) // no PH data in hardware

    const popularityScores = new Map<HardwareItem, number>()
    for (const item of allItems) {
      popularityScores.set(item, weightedPopularity(item, [
        { pctMap: geekPct, weight: 0.25 },
        { pctMap: reviewCountPct, weight: 0.20 },
        { pctMap: ratingPct, weight: 0.15 },
        { pctMap: bsrPct, weight: 0.15 },
        { pctMap: mediaPct, weight: 0.15 },
        { pctMap: phPct, weight: 0.10 },
      ]))
    }

    let items = allItems.filter(
      (h) =>
        !search ||
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.brand.toLowerCase().includes(search.toLowerCase()) ||
        h.category.toLowerCase().includes(search.toLowerCase())
    )

    items = [...items].sort((a, b) => {
      if (hardwareSort === 'popularity') return (popularityScores.get(b) ?? 0) - (popularityScores.get(a) ?? 0)
      if (hardwareSort === 'geekbench') return (b.geekbenchMultiCore ?? 0) - (a.geekbenchMultiCore ?? 0)
      if (hardwareSort === 'rating') return (b.amazonRating ?? 0) - (a.amazonRating ?? 0)
      if (hardwareSort === 'newest') return 0 // no date field in hardware, keep original order
      if (hardwareSort === 'price') {
        const diff = parsePriceNum(a.pricing) - parsePriceNum(b.pricing)
        return hardwarePriceAsc ? diff : -diff
      }
      return 0
    })
    return { items, popularityScores }
  }, [hardwareSort, hardwarePriceAsc, search])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'skills', label: `🛠️ ${t('rankings.tabs.skills')}` },
    { key: 'hardware', label: `🏠 ${t('rankings.tabs.hardware')}` },
    { key: 'models', label: `🧠 ${t('rankings.tabs.models')}` },
  ]

  const brandSlug = (brand: string) =>
    brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleSkillPriceToggle = () => {
    if (skillSort === 'price') {
      setSkillPriceAsc(prev => !prev)
    } else {
      setSkillSort('price')
      setSkillPriceAsc(true)
    }
  }

  const handleHardwarePriceToggle = () => {
    if (hardwareSort === 'price') {
      setHardwarePriceAsc(prev => !prev)
    } else {
      setHardwareSort('price')
      setHardwarePriceAsc(true)
    }
  }

  const skillSortButtons: { key: SkillSort; label: string; isPrice?: boolean }[] = [
    { key: 'popularity', label: `🔥 ${t('rankings.skills.sortBy.popular')}` },
    { key: 'clawhub', label: `📦 ${t('rankings.skills.sortBy.clawhub')}` },
    { key: 'stars', label: `⭐ ${t('rankings.skills.sortBy.stars')}` },
    { key: 'newest', label: `🆕 ${t('rankings.skills.sortBy.newest')}` },
    { key: 'price', label: `💰 ${t('rankings.skills.sortBy.price')}${skillSort === 'price' ? (skillPriceAsc ? '▲' : '▼') : ''}`, isPrice: true },
  ]

  const hardwareSortButtons: { key: HardwareSort; label: string; isPrice?: boolean }[] = [
    { key: 'popularity', label: `🔥 ${t('rankings.hardware.sortBy.popular')}` },
    { key: 'geekbench', label: `🏆 ${t('rankings.hardware.sortBy.geekbench')}` },
    { key: 'rating', label: `⭐ ${t('rankings.hardware.sortBy.rating')}` },
    { key: 'newest', label: `🆕 ${t('rankings.hardware.sortBy.newest')}` },
    { key: 'price', label: `💰 ${t('rankings.hardware.sortBy.price')}${hardwareSort === 'price' ? (hardwarePriceAsc ? '▲' : '▼') : ''}`, isPrice: true },
  ]

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

          {/* Community Rankings */}
          {view === 'community' ? (
            communityLoading ? (
              <div className="text-center py-24">
                <div className="inline-block h-8 w-8 border-2 border-gray-600 border-t-white rounded-full animate-spin mb-4" />
                <p className="text-gray-400">{t('rankings.community.loading')}</p>
              </div>
            ) : communityRanked.users.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-gray-400">{t('rankings.community.noResults')}</p>
              </div>
            ) : (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                  {([
                    { key: 'totalMembers', value: communityStats.total, icon: '👥' },
                    { key: 'verified', value: communityStats.verified, icon: '🌍' },
                    { key: 'totalAgents', value: communityStats.totalAgents, icon: '🤖' },
                    { key: 'avgAgents', value: communityStats.avgAgents, icon: '📊' },
                  ] as const).map(({ key, value, icon }) => (
                    <div key={key} className="bg-gray-900/50 rounded-lg border border-gray-800 p-4">
                      <div className="text-xs text-gray-400 mb-1">{icon} {t(`rankings.community.stats.${key}`)}</div>
                      <div className="text-2xl font-bold text-white">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Leaderboard header + sort buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      🏆 {t('rankings.community.leaderboard')}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {t('rankings.community.leaderboardDesc')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 bg-gray-900 rounded-lg p-1">
                    {([
                      { key: 'trustScore' as CommunitySort, icon: '🛡️', label: t('rankings.community.sortBy.trustScore') },
                      { key: 'agents' as CommunitySort, icon: '🤖', label: t('rankings.community.sortBy.agents') },
                      { key: 'activity' as CommunitySort, icon: '🔥', label: t('rankings.community.sortBy.activity') },
                      { key: 'newest' as CommunitySort, icon: '🆕', label: t('rankings.community.sortBy.newest') },
                    ] as const).map(({ key, icon, label }) => (
                      <button
                        key={key}
                        onClick={() => setCommunitySort(key)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          communitySort === key
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {icon} {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bar Chart — top 10 */}
                {(() => {
                  const top10 = communityRanked.users.slice(0, 10)
                  const getVal = (u: CommunityUser): number => {
                    if (communitySort === 'agents') return u.agent_count
                    if (communitySort === 'activity') return communityRanked.activityScores.get(u) ?? 0
                    if (communitySort === 'newest') return new Date(u.claimed_at || u.created_at).getTime()
                    return communityRanked.trustScores.get(u) ?? 0
                  }
                  const getLabel = (u: CommunityUser): string => {
                    if (communitySort === 'agents') return String(u.agent_count)
                    if (communitySort === 'activity') return (communityRanked.activityScores.get(u) ?? 0).toFixed(1)
                    if (communitySort === 'newest') {
                      const d = new Date(u.claimed_at || u.created_at)
                      return `${d.getMonth() + 1}/${d.getDate()}`
                    }
                    return String(communityRanked.trustScores.get(u) ?? 0)
                  }
                  const maxVal = Math.max(...top10.map(getVal), 1)
                  const barColor = communitySort === 'agents' ? 'bg-purple-500/60' :
                    communitySort === 'activity' ? 'bg-orange-500/60' :
                    communitySort === 'newest' ? 'bg-cyan-500/60' :
                    'bg-gradient-to-r from-yellow-500/60 via-blue-500/60 to-green-500/60'

                  return (
                    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 sm:p-6 mb-8">
                      <div className="space-y-3">
                        {top10.map((user, i) => {
                          const val = getVal(user)
                          const pct = communitySort === 'newest'
                            ? 100 - ((maxVal - val) / (maxVal - Math.min(...top10.map(getVal))) * 80)
                            : maxVal > 0 ? (val / maxVal) * 100 : 0
                          const trust = getTrustLevel(user)
                          return (
                            <div key={user.username} className="flex items-center gap-3 group">
                              <span className="text-gray-500 font-mono text-sm w-6 text-right shrink-0">{i + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {user.avatar_url && (
                                      <img
                                        src={user.avatar_url}
                                        alt=""
                                        className="w-5 h-5 rounded-full shrink-0"
                                      />
                                    )}
                                    <Link
                                      to={`/u/${user.username}`}
                                      className="text-white text-sm font-medium hover:text-blue-400 transition-colors truncate"
                                    >
                                      {user.display_name || user.username}
                                    </Link>
                                    <TrustBadge level={trust} size="sm" />
                                  </div>
                                  <span className="text-gray-300 text-sm font-mono shrink-0 ml-2">
                                    {getLabel(user)}
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

                {/* Full leaderboard table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400">
                        <th className="py-3 pr-3 w-10">{t('rankings.community.table.rank')}</th>
                        <th className="py-3 pr-3">{t('rankings.community.table.member')}</th>
                        <th className="py-3 pr-3">{t('rankings.community.table.trust')}</th>
                        <th className="py-3 pr-3">{t('rankings.community.table.agents')}</th>
                        <th className="py-3 pr-3 hidden sm:table-cell">{t('rankings.community.table.score')}</th>
                        <th className="py-3 pr-3 hidden md:table-cell">{t('rankings.community.table.joined')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {communityRanked.users.map((user, i) => {
                        const trust = getTrustLevel(user)
                        const score = communityRanked.trustScores.get(user) ?? 0
                        const joinDate = new Date(user.claimed_at || user.created_at)
                        return (
                          <tr
                            key={user.username}
                            className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors"
                          >
                            <td className="py-3 pr-3 text-gray-500 font-mono">{i + 1}</td>
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-2">
                                {user.avatar_url && (
                                  <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full shrink-0" />
                                )}
                                <Link
                                  to={`/u/${user.username}`}
                                  className="text-white font-medium hover:text-blue-400 transition-colors truncate"
                                >
                                  {user.display_name || user.username}
                                </Link>
                              </div>
                            </td>
                            <td className="py-3 pr-3">
                              <TrustBadge level={trust} size="sm" />
                            </td>
                            <td className="py-3 pr-3">
                              <span className="font-mono text-gray-300">{user.agent_count}</span>
                            </td>
                            <td className="py-3 pr-3 hidden sm:table-cell">
                              <div className="flex items-center gap-2">
                                <span className={`font-mono ${
                                  score >= 80 ? 'text-green-400' :
                                  score >= 50 ? 'text-yellow-400' :
                                  'text-gray-400'
                                }`}>
                                  {score}
                                </span>
                                <div className="w-16 bg-gray-800 rounded-full h-1.5 hidden lg:block">
                                  <div
                                    className={`h-full rounded-full ${
                                      score >= 80 ? 'bg-green-500/60' :
                                      score >= 50 ? 'bg-yellow-500/60' :
                                      'bg-gray-600'
                                    }`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-3 hidden md:table-cell text-gray-400 text-xs">
                              {joinDate.toLocaleDateString()}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Trust Level Distribution */}
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['orb', 'world', 'wallet', 'unverified'] as const).map(level => {
                    const count = communityUsers.filter(u => getTrustLevel(u) === level).length
                    const pct = communityUsers.length > 0 ? Math.round((count / communityUsers.length) * 100) : 0
                    return (
                      <div key={level} className="bg-gray-900/50 rounded-lg border border-gray-800 p-3">
                        <TrustBadge level={level} size="sm" />
                        <div className="text-white font-bold text-lg mt-2">{count}</div>
                        <div className="text-gray-500 text-xs">{pct}%</div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          ) : tab === 'models' ? (
            <>
              {/* Models sub-tab bar */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {([
                  { key: 'score' as ModelSort, icon: '🎯', label: t('rankings.models.subtabs.score') },
                  { key: 'speed' as ModelSort, icon: '⚡', label: t('rankings.models.subtabs.speed') },
                  { key: 'cost' as ModelSort, icon: '💰', label: t('rankings.models.subtabs.costEfficiency') },
                ] as const).map(({ key, icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setModelSort(key)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      modelSort === key
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-400 hover:text-white bg-gray-900'
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>

              {/* Loading / Error / Data */}
              {modelsLoading ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400">
                        <th className="py-3 pr-3 w-10"><div className="h-3 w-4 bg-gray-800 rounded animate-pulse" /></th>
                        <th className="py-3 pr-3"><div className="h-3 w-24 bg-gray-800 rounded animate-pulse" /></th>
                        <th className="py-3 pr-3 hidden sm:table-cell"><div className="h-3 w-16 bg-gray-800 rounded animate-pulse" /></th>
                        <th className="py-3 pr-3"><div className="h-3 w-12 bg-gray-800 rounded animate-pulse" /></th>
                        <th className="py-3 pr-3 hidden sm:table-cell"><div className="h-3 w-12 bg-gray-800 rounded animate-pulse" /></th>
                        <th className="py-3 pr-3 hidden md:table-cell"><div className="h-3 w-12 bg-gray-800 rounded animate-pulse" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-gray-800/50">
                          <td className="py-3 pr-3"><div className="h-4 w-5 bg-gray-800/60 rounded animate-pulse" /></td>
                          <td className="py-3 pr-3"><div className="h-4 bg-gray-800/60 rounded animate-pulse" style={{ width: `${140 - i * 8}px` }} /></td>
                          <td className="py-3 pr-3 hidden sm:table-cell"><div className="h-5 w-16 bg-gray-800/60 rounded-full animate-pulse" /></td>
                          <td className="py-3 pr-3"><div className="h-4 w-12 bg-gray-800/60 rounded animate-pulse" /></td>
                          <td className="py-3 pr-3 hidden sm:table-cell"><div className="h-4 w-14 bg-gray-800/60 rounded animate-pulse" /></td>
                          <td className="py-3 pr-3 hidden md:table-cell"><div className="h-4 w-10 bg-gray-800/60 rounded animate-pulse" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : modelsError ? (
                <div className="text-center py-24">
                  <p className="text-4xl mb-4">🔌</p>
                  <p className="text-red-400 mb-2">{t('rankings.models.error')}</p>
                  <p className="text-gray-500 text-sm mb-4">{t('rankings.models.errorHint')}</p>
                  <button
                    onClick={() => { setModelsData([]); setModelsError(null) }}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {t('rankings.models.retry')}
                  </button>
                </div>
              ) : sortedModels.length === 0 ? (
                <div className="text-center py-24">
                  <p className="text-4xl mb-4">🔍</p>
                  <p className="text-gray-400">{t('rankings.models.noResults')}</p>
                </div>
              ) : (
                <>
                  {/* Models table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400">
                          <th className="py-3 pr-3 w-10">{t('rankings.models.table.rank')}</th>
                          <th className="py-3 pr-3">{t('rankings.models.table.model')}</th>
                          <th className="py-3 pr-3 hidden sm:table-cell">{t('rankings.models.table.provider')}</th>
                          <th className="py-3 pr-3" title={t('rankings.models.tooltips.score')}>
                            🎯 {t('rankings.models.table.score')} <span className="text-gray-600 cursor-help">ℹ</span>
                          </th>
                          <th className="py-3 pr-3 hidden sm:table-cell" title={t('rankings.models.tooltips.cost')}>
                            💰 {t('rankings.models.table.cost')} <span className="text-gray-600 cursor-help">ℹ</span>
                          </th>
                          <th className="py-3 pr-3 hidden md:table-cell" title={t('rankings.models.tooltips.speed')}>
                            ⚡ {t('rankings.models.table.speed')} <span className="text-gray-600 cursor-help">ℹ</span>
                          </th>
                          <th className="py-3 pr-3 hidden lg:table-cell">{t('rankings.models.table.submissions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedModels.map((model, i) => {
                          const providerColor = getProviderColor(model.provider)
                          const costEfficiency = model.best_cost_usd > 0
                            ? (model.best_score_percentage / model.best_cost_usd).toFixed(0)
                            : '∞'
                          return (
                            <tr
                              key={model.model}
                              className="border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors"
                            >
                              <td className="py-3 pr-3 text-gray-500 font-mono">{i + 1}</td>
                              <td className="py-3 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-medium">{model.model}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded border sm:hidden ${providerColor.bg} ${providerColor.text} ${providerColor.border}`}>
                                    {model.provider}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 pr-3 hidden sm:table-cell">
                                <span className={`text-xs px-2 py-0.5 rounded border ${providerColor.bg} ${providerColor.text} ${providerColor.border}`}>
                                  {model.provider}
                                </span>
                              </td>
                              <td className="py-3 pr-3">
                                <span className={`font-mono ${
                                  model.best_score_percentage >= 80 ? 'text-green-400' :
                                  model.best_score_percentage >= 60 ? 'text-yellow-400' :
                                  'text-gray-400'
                                }`}>
                                  {model.best_score_percentage.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-3 pr-3 hidden sm:table-cell">
                                <div className="font-mono text-gray-300">
                                  ${model.best_cost_usd.toFixed(3)}
                                  <span className="text-gray-500 text-xs">{t('rankings.models.perRun')}</span>
                                </div>
                                {modelSort === 'cost' && (
                                  <div className="text-xs text-gray-500">
                                    {costEfficiency} pts/$
                                  </div>
                                )}
                              </td>
                              <td className="py-3 pr-3 hidden md:table-cell">
                                <span className="font-mono text-gray-300">
                                  {model.best_execution_time_seconds.toFixed(1)}{t('rankings.models.seconds')}
                                </span>
                              </td>
                              <td className="py-3 pr-3 hidden lg:table-cell text-gray-400 font-mono">
                                {model.submission_count}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Attribution badge */}
                  <div className="flex items-center justify-end mt-6">
                    <a
                      href="https://pinchbench.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-700/50 bg-gray-900/50 text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-xs"
                    >
                      Powered by PinchBench 🦀
                    </a>
                  </div>
                </>
              )}
            </>
          ) : tab === 'skills' ? (
            <>
              {/* Leaderboard Section */}
              <div className="mb-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      📊 {t('rankings.skills.leaderboard.title')}
                      <button
                        onClick={() => setScoringInfo('skills')}
                        className="text-gray-500 hover:text-gray-300 transition-colors text-base font-normal"
                        title={t('rankings.scoringInfo.tooltip')}
                      >
                        ℹ️
                      </button>
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {t('rankings.skills.leaderboard.description')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 bg-gray-900 rounded-lg p-1">
                    {skillSortButtons.map(({ key, label, isPrice }) => (
                      <button
                        key={key}
                        onClick={() => isPrice ? handleSkillPriceToggle() : setSkillSort(key)}
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

                {/* Bar Chart — top 10 */}
                {(() => {
                  const top10 = skills.all.slice(0, 10)
                  const getVal = (s: SkillItem): number => {
                    if (skillSort === 'clawhub') return s.clawhubDownloads ?? 0
                    if (skillSort === 'stars') return s.githubStars ?? 0
                    if (skillSort === 'newest') return 0
                    if (skillSort === 'price') return parsePriceNum(s.pricing)
                    return skills.popularityScores.get(s) ?? 0
                  }
                  const getLabel = (s: SkillItem): string => {
                    if (skillSort === 'popularity') {
                      const score = skills.popularityScores.get(s) ?? 0
                      return score.toFixed(0)
                    }
                    const val = getVal(s)
                    if (skillSort === 'price') return s.pricing
                    return formatNum(val)
                  }
                  const maxVal = Math.max(...top10.map(getVal), 1)
                  const barColor = skillSort === 'stars' ? 'bg-yellow-500/60' :
                    skillSort === 'clawhub' ? 'bg-orange-500/60' :
                    skillSort === 'price' ? 'bg-emerald-500/60' :
                    'bg-gradient-to-r from-orange-500/60 via-blue-500/60 to-yellow-500/60'
                  return (
                    <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 sm:p-6 mb-8">
                      <div className="space-y-3">
                        {top10.map((skill, i) => {
                          const val = getVal(skill)
                          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
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
                                      by{' '}
                                      <Link
                                        to={`/rankings/brand/${brandSlug(skill.brand)}`}
                                        className="text-gray-500 hover:text-white transition-colors"
                                      >
                                        {skill.brand}
                                      </Link>
                                    </span>
                                  </div>
                                  <span className="text-gray-300 text-sm font-mono shrink-0 ml-2">
                                    {getLabel(skill)}
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
                  {/* In-Site Apps Section */}
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

                  {/* External Tools Section */}
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
                {hardwareSortButtons.map(({ key, label, isPrice }) => (
                  <button
                    key={key}
                    onClick={() => isPrice ? handleHardwarePriceToggle() : setHardwareSort(key)}
                    className={`px-2 py-1 rounded transition-colors ${
                      hardwareSort === key
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-600/40'
                        : 'hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setScoringInfo('hardware')}
                  className="ml-auto text-gray-500 hover:text-gray-300 transition-colors"
                  title={t('rankings.scoringInfo.tooltip')}
                >
                  ℹ️
                </button>
              </div>

              {/* Hardware table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="py-3 pr-3 w-10">#</th>
                      <th className="py-3 pr-3">{t('rankings.hardware.table.name')}</th>
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

      {/* Scoring Info Modal */}
      {scoringInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setScoringInfo(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                {t(`rankings.scoringInfo.${scoringInfo}.title`)}
              </h3>
              <button
                onClick={() => setScoringInfo(null)}
                className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              {t(`rankings.scoringInfo.${scoringInfo}.description`)}
            </p>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-2">
                {t('rankings.scoringInfo.dataSources')}
              </h4>
              <ul className="space-y-1.5">
                {(t(`rankings.scoringInfo.${scoringInfo}.sources`, { returnObjects: true }) as string[]).map((source, i) => (
                  <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                    <span className="text-gray-500 shrink-0">•</span>
                    {source}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-2">
                {t('rankings.scoringInfo.normalization')}
              </h4>
              <p className="text-gray-400 text-sm">
                {t('rankings.scoringInfo.normalizationDescription')}
              </p>
            </div>
            <div className="text-xs text-gray-500 border-t border-gray-800 pt-3">
              {t('rankings.scoringInfo.footer')}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
