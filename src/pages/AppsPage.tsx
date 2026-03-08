import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, HelpCircle, LayoutGrid, List, ArrowRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { products, categories } from '../data/products'
import { useLanguage } from '../hooks/useLanguage'
import { useHead } from '../hooks/useHead'

const categoryFeatured: Record<string, string[]> = {
  all: ['ollama', 'zeabur'],
  free: ['ollama'],
  skills: ['heygen', 'elevenlabs'],
  hosting: ['zeabur', 'umbrel'],
  hardware: ['mac-mini-m4', 'macbook-neo'],
  vm: ['utm', 'virtual-buddy'],
}

const featuredGradients: Record<string, string> = {
  ollama: 'bg-gradient-to-br from-green-950/60 to-emerald-950/40 border border-green-800/30 hover:border-green-700/50',
  zeabur: 'bg-gradient-to-br from-blue-950/60 to-indigo-950/40 border border-blue-800/30 hover:border-blue-700/50',
  heygen: 'bg-gradient-to-br from-violet-950/60 to-purple-950/40 border border-violet-800/30 hover:border-violet-700/50',
  elevenlabs: 'bg-gradient-to-br from-pink-950/60 to-rose-950/40 border border-pink-800/30 hover:border-pink-700/50',
  umbrel: 'bg-gradient-to-br from-indigo-950/60 to-blue-950/40 border border-indigo-800/30 hover:border-indigo-700/50',
  'mac-mini-m4': 'bg-gradient-to-br from-gray-800/60 to-zinc-900/40 border border-gray-600/30 hover:border-gray-500/50',
  'macbook-neo': 'bg-gradient-to-br from-gray-800/60 to-slate-900/40 border border-gray-600/30 hover:border-gray-500/50',
  utm: 'bg-gradient-to-br from-cyan-950/60 to-teal-950/40 border border-cyan-800/30 hover:border-cyan-700/50',
  'virtual-buddy': 'bg-gradient-to-br from-teal-950/60 to-emerald-950/40 border border-teal-800/30 hover:border-teal-700/50',
}

export default function AppsPage() {
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') ?? 'all'
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [searchTerm, setSearchTerm] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCategoryInfo, setShowCategoryInfo] = useState(false)
  const { t } = useTranslation()
  const { localePath } = useLanguage()

  useHead({
    title: t('meta.apps.title'),
    description: t('meta.apps.description'),
    canonical: `https://canfly.ai${localePath('/apps')}`,
    ogImage: 'https://canfly.ai/og-image.png',
    ogType: 'website',
  })

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    const tagline = t(`product.products.${product.id}.tagline`)
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tagline.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const featuredIds = categoryFeatured[selectedCategory] ?? []
  const featuredProducts = !searchTerm && featuredIds.length > 0
    ? products.filter(p => featuredIds.includes(p.id))
    : []

  const categoryInfoKey = `apps.categoryInfo.${selectedCategory}`
  const categoryInfo = t(categoryInfoKey, { defaultValue: '' })
  const hasCategoryInfo = categoryInfo !== '' && categoryInfo !== categoryInfoKey

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar search={{ value: searchTerm, onChange: setSearchTerm, placeholder: t('apps.searchPlaceholder') }} />

      {/* Mobile horizontal tabs */}
      <div className="md:hidden overflow-x-auto border-b border-gray-800 bg-gray-950/50 px-4 py-3 flex gap-2" style={{ scrollbarWidth: 'none' }}>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => { setSelectedCategory(category.id); setShowCategoryInfo(false) }}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {t(`apps.categoryNames.${category.id}`)} ({category.count})
          </button>
        ))}
      </div>

      <div className="flex">
        {/* Sidebar — hidden on mobile */}
        <aside
          className={`hidden md:block ${sidebarOpen ? 'w-64' : 'w-0'} shrink-0 transition-all duration-200 overflow-hidden border-r border-gray-800 bg-gray-950/50`}
          style={{ minHeight: 'calc(100vh - 65px)' }}
        >
          <div className="w-64 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{t('apps.categories')}</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-gray-500 hover:text-white transition-colors"
                title={t('apps.collapseSidebar')}
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            <nav className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => { setSelectedCategory(category.id); setShowCategoryInfo(false) }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex justify-between items-center text-sm ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.3)]'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>{t(`apps.categoryNames.${category.id}`)}</span>
                  <span className={`text-xs ${selectedCategory === category.id ? 'text-blue-200' : 'text-gray-600'}`}>
                    {category.count}
                  </span>
                </button>
              ))}
            </nav>

            {/* Quick links */}
            <div className="mt-8 space-y-4">
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{t('apps.quickStart')}</h3>
                <Link
                  to={localePath('/apps/ollama')}
                  className="block p-3 bg-green-900/20 border border-green-800/40 rounded-lg hover:bg-green-900/30 transition-all hover:shadow-[0_0_12px_rgba(34,197,94,0.15)] hover:border-green-700/60"
                >
                  <div className="text-sm font-medium text-green-400">{t('apps.startFree')}</div>
                  <div className="text-xs text-gray-500 mt-1">{t('apps.ollamaOpenClaw')}</div>
                </Link>
              </div>

              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{t('apps.staffPicks')}</h3>
                <Link
                  to={localePath('/apps/zeabur')}
                  className="block p-3 bg-blue-900/20 border border-blue-800/40 rounded-lg hover:bg-blue-900/30 transition-all hover:shadow-[0_0_12px_rgba(59,130,246,0.15)] hover:border-blue-700/60"
                >
                  <div className="text-sm font-medium text-blue-400">{t('apps.cloudDeploy')}</div>
                  <div className="text-xs text-gray-500 mt-1">{t('apps.oneClickSetup')}</div>
                </Link>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="px-4 md:px-8 py-8 max-w-6xl page-enter">
            {/* Header row */}
            <div className="flex items-center gap-4 mb-8">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="hidden md:block p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
                  title={t('apps.openSidebar')}
                >
                  <PanelLeftOpen className="w-5 h-5" />
                </button>
              )}
              <div className="flex-1 relative">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">
                    {selectedCategory === 'all' ? t('apps.allApps') : t(`apps.categoryNames.${selectedCategory}`)}
                  </h1>
                  {hasCategoryInfo && (
                    <button
                      onClick={() => setShowCategoryInfo(!showCategoryInfo)}
                      className="p-1 text-gray-500 hover:text-blue-400 transition-colors rounded-full hover:bg-gray-800/50"
                      title={t('apps.categoryInfoTooltip', { defaultValue: 'About this category' })}
                    >
                      <HelpCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <p className="text-gray-500 mt-1 text-sm">
                  {t('apps.appCount', { count: filteredProducts.length })}
                </p>
                {/* Category info popup */}
                {showCategoryInfo && hasCategoryInfo && (
                  <div className="absolute top-full left-0 mt-2 z-20 w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl p-5 shadow-xl shadow-black/40">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-300 leading-relaxed">{categoryInfo}</p>
                      <button
                        onClick={() => setShowCategoryInfo(false)}
                        className="shrink-0 p-1 text-gray-500 hover:text-white transition-colors rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  title={t('apps.gridView')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  title={t('apps.listView')}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Featured banner — per-category featured products */}
            {featuredProducts.length > 0 && (
              <div className={`grid grid-cols-1 ${featuredProducts.length > 1 ? 'md:grid-cols-2' : ''} gap-4 mb-8`}>
                {featuredProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={localePath(`/apps/${product.id}`)}
                    className={`relative overflow-hidden rounded-2xl p-6 flex items-center gap-5 group transition-all hover:scale-[1.01] ${
                      featuredGradients[product.id] ?? 'bg-gradient-to-br from-gray-800/60 to-gray-900/40 border border-gray-700/30 hover:border-gray-600/50'
                    }`}
                  >
                    <div className="w-16 h-16 shrink-0 rounded-2xl bg-black/30 border border-white/10 flex items-center justify-center overflow-hidden">
                      <img src={product.icon} alt={product.name} className="w-11 h-11 object-contain" loading="lazy" decoding="async" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{t('apps.featured')}</div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">{product.name}</h3>
                      <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">{t(`product.products.${product.id}.tagline`)}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={localePath(`/apps/${product.id}`)}
                    className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all hover:scale-[1.02] group card-hover"
                  >
                    {/* Gradient area with icon */}
                    <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative flex items-center justify-center">
                      <div className="text-6xl text-gray-700/40 font-bold select-none">{product.name[0]}</div>
                      {/* App icon — bottom-left overlay */}
                      <div className="absolute bottom-3 left-4 w-14 h-14 rounded-xl bg-gray-900/80 border border-gray-700/50 flex items-center justify-center overflow-hidden backdrop-blur-sm shadow-lg">
                        <img
                          src={product.icon}
                          alt={product.name}
                          className="w-10 h-10 object-contain"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement
                            el.style.display = 'none'
                            el.parentElement!.innerHTML = `<span class="text-xl text-gray-400 font-bold">${product.name[0]}</span>`
                          }}
                        />
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-0.5">{t(`product.products.${product.id}.tagline`)}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          {product.status === 'coming-soon' ? (
                            <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded-full border border-purple-600/40 whitespace-nowrap">
                              Coming Soon
                            </span>
                          ) : (
                            <div className="text-sm font-medium text-white whitespace-nowrap">{product.price}</div>
                          )}
                        </div>
                      </div>

                      {product.affiliateLink && (
                        <div className="text-xs text-blue-400 mt-2">
                          {product.affiliateCode ? t('apps.useCode', { code: product.affiliateCode }) : t('apps.openclawPartner')}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={localePath(`/apps/${product.id}`)}
                    className="flex items-center gap-4 p-4 bg-gray-900/40 border border-gray-800 rounded-xl hover:border-gray-600 transition-all group"
                  >
                    {/* Icon */}
                    <div className="w-14 h-14 shrink-0 rounded-xl bg-gray-800 border border-gray-700/50 flex items-center justify-center overflow-hidden">
                      <img
                        src={product.icon}
                        alt={product.name}
                        className="w-10 h-10 object-contain"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement
                          el.style.display = 'none'
                          el.parentElement!.innerHTML = `<span class="text-xl text-gray-400 font-bold">${product.name[0]}</span>`
                        }}
                      />
                    </div>

                    {/* Name + tagline */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{t(`product.products.${product.id}.tagline`)}</p>
                    </div>

                    {/* Price */}
                    <div className="shrink-0">
                      {product.status === 'coming-soon' ? (
                        <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded-full border border-purple-600/40 whitespace-nowrap">
                          Coming Soon
                        </span>
                      ) : (
                        <div className="text-sm font-medium text-white whitespace-nowrap">{product.price}</div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center py-16">
                <div className="text-gray-400 text-lg">{t('apps.noAppsFound')}</div>
                <div className="text-gray-600 text-sm mt-2">{t('apps.noAppsHint')}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
