import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { products, categories } from '../data/products'
import { useLanguage } from '../hooks/useLanguage'

export default function AppsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { t } = useTranslation()
  const { localePath } = useLanguage()

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    const tagline = t(`product.products.${product.id}.tagline`)
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tagline.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar search={{ value: searchTerm, onChange: setSearchTerm, placeholder: t('apps.searchPlaceholder') }} />

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'w-64' : 'w-0'} shrink-0 transition-all duration-200 overflow-hidden border-r border-gray-800 bg-gray-950/50`}
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
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex justify-between items-center text-sm ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
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
                  className="block p-3 bg-green-900/20 border border-green-800/40 rounded-lg hover:bg-green-900/30 transition-colors"
                >
                  <div className="text-sm font-medium text-green-400">{t('apps.startFree')}</div>
                  <div className="text-xs text-gray-500 mt-1">{t('apps.ollamaOpenClaw')}</div>
                </Link>
              </div>

              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{t('apps.staffPicks')}</h3>
                <Link
                  to={localePath('/apps/zeabur')}
                  className="block p-3 bg-blue-900/20 border border-blue-800/40 rounded-lg hover:bg-blue-900/30 transition-colors"
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
          <div className="px-8 py-8 max-w-6xl">
            {/* Header row */}
            <div className="flex items-center gap-4 mb-8">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
                  title={t('apps.openSidebar')}
                >
                  <PanelLeftOpen className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="text-3xl font-bold">
                  {selectedCategory === 'all' ? t('apps.allApps') : t(`apps.categoryNames.${selectedCategory}`)}
                </h1>
                <p className="text-gray-500 mt-1 text-sm">
                  {t('apps.appCount', { count: filteredProducts.length })}
                </p>
              </div>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={localePath(`/apps/${product.id}`)}
                  className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all hover:scale-[1.02] group"
                >
                  {/* Image placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="text-4xl text-gray-600">{product.name[0]}</div>
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
                        <div className="text-sm font-medium text-white">{product.price}</div>
                        {product.status === 'coming-soon' && (
                          <div className="text-xs text-yellow-500">{t('apps.comingSoon')}</div>
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
