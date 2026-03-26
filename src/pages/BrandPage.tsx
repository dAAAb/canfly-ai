import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink, ArrowLeft, Star, Package, Globe, Zap } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useHead } from '../hooks/useHead'
import { useLanguage } from '../hooks/useLanguage'
import { products, type Product } from '../data/products'
import skillsData from '../../data/rankings-skills.json'
import hardwareData from '../../data/rankings-hardware.json'

/* ─── types ─── */
interface SkillEntry {
  name: string
  brand: string
  category: string
  description: string
  githubStars?: number
  npmWeekly?: number
  pypiWeekly?: number
  clawhubDownloads?: number
  productHuntUpvotes?: number
  pricing: string
  website: string
  canflySlug: string | null
}

interface HardwareEntry {
  name: string
  brand: string
  category: string
  description: string
  pricing: string
  website: string | null
  canflySlug: string | null
  amazonUrl?: string | null
  amazonRating?: number | null
  amazonReviewCount?: number | null
  keySpec?: string
}

/* ─── helpers ─── */
const brandSlug = (brand: string) =>
  brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

/** Find the primary product for this brand (highest-commission or first match). */
function findPrimaryProduct(brandProducts: Product[]): Product | undefined {
  // Prefer products with affiliate links (revenue-generating)
  const withAffiliate = brandProducts.filter(p => p.affiliateLink)
  if (withAffiliate.length) return withAffiliate[0]
  return brandProducts[0]
}

/* ─── brand metadata for descriptions, colors, and categories ─── */
const BRAND_META: Record<string, { color: string; emoji: string; category: string }> = {
  'ollama': { color: 'from-gray-700 to-gray-900', emoji: '🦙', category: 'AI Framework' },
  'openclaw': { color: 'from-orange-600 to-red-700', emoji: '🦀', category: 'AI Agent Platform' },
  'elevenlabs': { color: 'from-indigo-600 to-purple-700', emoji: '🎙️', category: 'Voice AI' },
  'heygen': { color: 'from-blue-600 to-cyan-700', emoji: '🎬', category: 'Video AI' },
  'zeabur': { color: 'from-purple-600 to-pink-600', emoji: '☁️', category: 'Cloud Hosting' },
  'perplexity': { color: 'from-teal-600 to-emerald-700', emoji: '🔍', category: 'AI Search' },
  'apple': { color: 'from-gray-600 to-gray-800', emoji: '🍎', category: 'Hardware' },
  'geekom': { color: 'from-blue-700 to-blue-900', emoji: '🖥️', category: 'Mini PC' },
  'beelink': { color: 'from-yellow-600 to-orange-700', emoji: '🐝', category: 'Mini PC' },
  'raspberry-pi-foundation': { color: 'from-green-600 to-green-800', emoji: '🫐', category: 'SBC' },
  'umbrel': { color: 'from-blue-500 to-purple-600', emoji: '☂️', category: 'Home Server' },
  'switchbot': { color: 'from-red-600 to-red-800', emoji: '🤖', category: 'Smart Home' },
  'pinata': { color: 'from-purple-500 to-pink-500', emoji: '🪅', category: 'Web3 Storage' },
  'agentcard': { color: 'from-emerald-600 to-teal-700', emoji: '💳', category: 'Agent Payments' },
  'agentmail': { color: 'from-sky-600 to-blue-700', emoji: '📧', category: 'Agent Email' },
  'basemail': { color: 'from-blue-700 to-indigo-800', emoji: '📬', category: 'Crypto Email' },
  'brave': { color: 'from-orange-500 to-red-600', emoji: '🦁', category: 'Search API' },
  'even-realities': { color: 'from-gray-600 to-blue-800', emoji: '👓', category: 'Smart Glasses' },
  'utm': { color: 'from-cyan-600 to-blue-700', emoji: '🖥️', category: 'Virtual Machine' },
  'openai': { color: 'from-green-700 to-emerald-800', emoji: '🤖', category: 'AI Research' },
  'evanlak': { color: 'from-gray-600 to-gray-700', emoji: '🔌', category: 'Accessories' },
  'elgato': { color: 'from-gray-700 to-black', emoji: '🎛️', category: 'Accessories' },
  'fifine': { color: 'from-red-700 to-gray-800', emoji: '🎤', category: 'Accessories' },
  'guilherme-rambo': { color: 'from-purple-700 to-indigo-800', emoji: '🖥️', category: 'Virtual Machine' },
}

const DEFAULT_META = { color: 'from-gray-600 to-gray-800', emoji: '🏷️', category: 'Technology' }

export default function BrandPage() {
  const { brandName } = useParams<{ brandName: string }>()
  const { t } = useTranslation()
  const { localePath } = useLanguage()

  // Resolve slug → brand data
  const slug = brandName || ''

  // Find all matching skills and hardware entries by brand slug
  const matchingSkills = (skillsData as SkillEntry[]).filter(
    s => brandSlug(s.brand) === slug
  )
  const matchingHardware = (hardwareData as HardwareEntry[]).filter(
    h => brandSlug(h.brand) === slug
  )

  // Find matching products by brand name
  const brandDisplayName = matchingSkills[0]?.brand || matchingHardware[0]?.brand || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  // Match products: check if product name contains the brand name, or the product belongs to a brand
  const brandProducts = products.filter(p => {
    const pName = p.name.toLowerCase()
    const bName = brandDisplayName.toLowerCase()
    // Direct name match
    if (pName.includes(bName)) return true
    // Check by known brand → product mappings
    if (bName === 'apple' && (pName.includes('mac') || pName.includes('apple'))) return true
    if (bName === 'evanlak' && pName.includes('evanlak')) return true
    if (bName === 'elgato' && pName.includes('elgato')) return true
    if (bName === 'fifine' && pName.includes('fifine')) return true
    if (bName === 'raspberry pi foundation' && pName.includes('raspberry')) return true
    if (bName === 'guilherme rambo' && pName.includes('virtual buddy')) return true
    if (bName === 'openai' && pName.includes('whisper')) return true
    // Exact id match for simple brands
    if (p.id === slug) return true
    return false
  })

  const primaryProduct = findPrimaryProduct(brandProducts)
  const meta = BRAND_META[slug] || DEFAULT_META
  const website = matchingSkills[0]?.website || matchingHardware[0]?.website || primaryProduct?.cta.secondaryLink

  // Aggregate stats
  const totalGithubStars = matchingSkills.reduce((sum, s) => sum + (s.githubStars || 0), 0)
  const totalClawhubDl = matchingSkills.reduce((sum, s) => sum + (s.clawhubDownloads || 0), 0)
  const totalNpmWeekly = matchingSkills.reduce((sum, s) => sum + (s.npmWeekly || 0), 0)

  useHead({
    title: `${brandDisplayName} — ${t('brand.titleSuffix')} | CanFly.ai`,
    description: `${brandDisplayName} ${t('brand.metaDesc')}`,
    canonical: `https://canfly.ai${localePath(`/rankings/brand/${slug}`)}`,
    ogImage: 'https://canfly.ai/og-image.webp',
    ogType: 'website',
  })

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        {/* Hero banner */}
        <div className={`bg-gradient-to-br ${meta.color} border-b border-gray-800`}>
          <div className="max-w-5xl mx-auto px-6 py-16 md:py-20">
            <Link
              to={localePath('/rankings')}
              className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('brand.backToRankings')}
            </Link>

            <div className="flex items-start gap-5">
              <span className="text-5xl md:text-6xl">{meta.emoji}</span>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {brandDisplayName}
                </h1>
                <p className="text-white/70 text-lg mb-3">{meta.category}</p>
                {(matchingSkills[0]?.description || matchingHardware[0]?.description) && (
                  <p className="text-white/80 max-w-2xl">
                    {matchingSkills[0]?.description || matchingHardware[0]?.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {t('brand.visitWebsite')}
                    </a>
                  )}
                  {primaryProduct?.affiliateLink && (
                    <a
                      href={primaryProduct.affiliateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {primaryProduct.affiliateDiscount
                        ? `${t('brand.getStarted')} (${primaryProduct.affiliateDiscount})`
                        : t('brand.getStarted')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Stats row */}
          {(totalGithubStars > 0 || totalClawhubDl > 0 || totalNpmWeekly > 0 || matchingHardware.some(h => h.amazonRating)) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {totalGithubStars > 0 && (
                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 text-center">
                  <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-white">{formatNumber(totalGithubStars)}</div>
                  <div className="text-xs text-gray-400">GitHub Stars</div>
                </div>
              )}
              {totalClawhubDl > 0 && (
                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 text-center">
                  <Package className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-white">{formatNumber(totalClawhubDl)}</div>
                  <div className="text-xs text-gray-400">ClawHub Downloads</div>
                </div>
              )}
              {totalNpmWeekly > 0 && (
                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 text-center">
                  <Package className="w-5 h-5 text-red-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-white">{formatNumber(totalNpmWeekly)}</div>
                  <div className="text-xs text-gray-400">npm Weekly</div>
                </div>
              )}
              {matchingHardware.filter(h => h.amazonRating).map(h => (
                <div key={h.name} className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 text-center">
                  <Star className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-white">{h.amazonRating}/5</div>
                  <div className="text-xs text-gray-400">Amazon ({formatNumber(h.amazonReviewCount || 0)} reviews)</div>
                </div>
              ))}
            </div>
          )}

          {/* Products section */}
          {brandProducts.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-white mb-6">
                {t('brand.productsOnCanfly')}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {brandProducts.map(product => (
                  <Link
                    key={product.id}
                    to={localePath(`/apps/${product.id}`)}
                    className="group bg-gray-900/50 rounded-xl border border-gray-800 hover:border-gray-600 p-5 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={product.icon}
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1 line-clamp-2">{product.tagline}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-500">{product.price}</span>
                          {product.commission && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-600/20 text-green-400 border border-green-600/40">
                              {product.commission}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {product.features.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {product.features.slice(0, 3).map((f, i) => (
                          <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                            <span className="text-gray-600 mt-0.5">•</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Skills / Software from this brand */}
          {matchingSkills.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-white mb-6">
                {t('brand.skillsAndTools')}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-800">
                      <th className="pb-3 font-medium">{t('brand.table.name')}</th>
                      <th className="pb-3 font-medium">{t('brand.table.category')}</th>
                      <th className="pb-3 font-medium text-right">{t('brand.table.pricing')}</th>
                      <th className="pb-3 font-medium text-right">{t('brand.table.popularity')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingSkills.map(skill => (
                      <tr key={skill.name} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                        <td className="py-3">
                          {skill.canflySlug ? (
                            <Link to={localePath(`/apps/${skill.canflySlug}`)} className="text-white hover:text-blue-400 transition-colors font-medium">
                              {skill.name}
                            </Link>
                          ) : (
                            <span className="text-white font-medium">{skill.name}</span>
                          )}
                          <p className="text-gray-500 text-xs mt-0.5">{skill.description}</p>
                        </td>
                        <td className="py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                            {skill.category}
                          </span>
                        </td>
                        <td className="py-3 text-right text-gray-400">{skill.pricing}</td>
                        <td className="py-3 text-right">
                          {skill.githubStars ? (
                            <span className="text-yellow-400 text-xs">{formatNumber(skill.githubStars)} ★</span>
                          ) : skill.clawhubDownloads ? (
                            <span className="text-orange-400 text-xs">{formatNumber(skill.clawhubDownloads)} dl</span>
                          ) : skill.productHuntUpvotes ? (
                            <span className="text-orange-400 text-xs">{formatNumber(skill.productHuntUpvotes)} ▲</span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Hardware from this brand */}
          {matchingHardware.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold text-white mb-6">
                {t('brand.hardwareProducts')}
              </h2>
              <div className="grid gap-4">
                {matchingHardware.map(hw => (
                  <div key={hw.name} className="bg-gray-900/50 rounded-xl border border-gray-800 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-white font-semibold">
                          {hw.canflySlug ? (
                            <Link to={localePath(`/apps/${hw.canflySlug}`)} className="hover:text-blue-400 transition-colors">
                              {hw.name}
                            </Link>
                          ) : hw.name}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">{hw.description}</p>
                        {hw.keySpec && (
                          <p className="text-gray-500 text-xs mt-2">{hw.keySpec}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-white font-bold">{hw.pricing}</div>
                        {hw.amazonRating && (
                          <div className="text-yellow-400 text-xs mt-1">
                            {hw.amazonRating}/5 ({formatNumber(hw.amazonReviewCount || 0)})
                          </div>
                        )}
                      </div>
                    </div>
                    {hw.amazonUrl && (
                      <a
                        href={hw.amazonUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-yellow-600/20 text-yellow-400 border border-yellow-600/40 text-sm hover:bg-yellow-600/30 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {t('brand.buyOnAmazon')}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Affiliate CTA */}
          {primaryProduct?.affiliateLink && (
            <section className="mb-12">
              <div className={`bg-gradient-to-r ${meta.color} rounded-xl p-8 text-center`}>
                <h2 className="text-2xl font-bold text-white mb-3">
                  {t('brand.ctaTitle', { brand: brandDisplayName })}
                </h2>
                <p className="text-white/70 mb-6 max-w-lg mx-auto">
                  {primaryProduct.description.slice(0, 150)}...
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <a
                    href={primaryProduct.affiliateLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {primaryProduct.cta.primary}
                  </a>
                  {primaryProduct.tutorial && (
                    <Link
                      to={localePath(primaryProduct.tutorial)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                    >
                      {t('brand.viewTutorial')}
                    </Link>
                  )}
                </div>
                {primaryProduct.commission && (
                  <p className="text-white/50 text-xs mt-4">
                    {t('brand.affiliateNote')}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* No data fallback */}
          {matchingSkills.length === 0 && matchingHardware.length === 0 && brandProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg mb-4">{t('brand.notFound')}</p>
              <Link
                to={localePath('/rankings')}
                className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('brand.backToRankings')}
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
