import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronLeft } from 'lucide-react'

// Product data structure
const products = [
  {
    id: 'ollama',
    name: 'Ollama',
    tagline: 'Free local AI models',
    category: 'free',
    price: 'Free',
    image: '/images/ollama.jpg',
    status: 'available',
    description: 'Run AI models locally without API keys',
  },
  {
    id: 'zeabur',
    name: 'Zeabur',
    tagline: 'One-click cloud deployment',
    category: 'hosting',
    price: '$5/month',
    image: '/images/zeabur.jpg',
    status: 'available',
    affiliate: 'OpenClaw',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    tagline: 'AI voice synthesis',
    category: 'skills',
    price: '$5/month',
    image: '/images/elevenlabs.jpg',
    status: 'coming-soon',
    affiliate: 'https://try.elevenlabs.io/clawhub',
  },
  {
    id: 'heygen',
    name: 'HeyGen',
    tagline: 'AI video generation',
    category: 'skills',
    price: '$29/month',
    image: '/images/heygen.jpg',
    status: 'coming-soon',
    affiliate: 'https://www.heygen.com/?sid=rewardful&via=clawhub',
  },
  {
    id: 'umbrel',
    name: 'Umbrel',
    tagline: 'Self-hosted home server',
    category: 'hardware',
    price: '$299',
    image: '/images/umbrel.jpg',
    status: 'coming-soon',
  },
]

const categories = [
  { id: 'all', name: 'All Apps', count: products.length },
  { id: 'free', name: 'Free Tools', count: products.filter(p => p.category === 'free').length },
  { id: 'skills', name: 'AI Skills', count: products.filter(p => p.category === 'skills').length },
  { id: 'hosting', name: 'Cloud Hosting', count: products.filter(p => p.category === 'hosting').length },
  { id: 'hardware', name: 'Hardware', count: products.filter(p => p.category === 'hardware').length },
]

export default function AppsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.tagline.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white">
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Back to CanFly.ai</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search apps..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none w-64"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-950 border-r border-gray-800 h-screen sticky top-16">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-6">Categories</h2>
            <nav className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex justify-between items-center ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>{category.name}</span>
                  <span className="text-xs text-gray-500">{category.count}</span>
                </button>
              ))}
            </nav>

            {/* Featured sections */}
            <div className="mt-8 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Start</h3>
                <Link
                  to="/apps/ollama"
                  className="block p-3 bg-green-900/20 border border-green-800 rounded-lg hover:bg-green-900/30 transition-colors"
                >
                  <div className="text-sm font-medium text-green-400">Start Free</div>
                  <div className="text-xs text-gray-400 mt-1">Ollama + OpenClaw</div>
                </Link>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Staff Picks</h3>
                <Link
                  to="/apps/zeabur"
                  className="block p-3 bg-blue-900/20 border border-blue-800 rounded-lg hover:bg-blue-900/30 transition-colors"
                >
                  <div className="text-sm font-medium text-blue-400">Cloud Deploy</div>
                  <div className="text-xs text-gray-400 mt-1">One-click setup</div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-6">
          <div className="max-w-6xl">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">
                {selectedCategory === 'all' ? 'All Apps' : categories.find(c => c.id === selectedCategory)?.name}
              </h1>
              <p className="text-gray-400 mt-2">
                {filteredProducts.length} app{filteredProducts.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/apps/${product.id}`}
                  className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-600 transition-all hover:scale-105 group"
                >
                  {/* Product image placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="text-4xl">{product.name[0]}</div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-400">{product.tagline}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">{product.price}</div>
                        {product.status === 'coming-soon' && (
                          <div className="text-xs text-yellow-400">Coming Soon</div>
                        )}
                      </div>
                    </div>

                    {product.affiliate && (
                      <div className="text-xs text-blue-400">
                        Works with OpenClaw
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg">No apps found</div>
                <div className="text-gray-500 text-sm mt-2">Try adjusting your search or category filter</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
