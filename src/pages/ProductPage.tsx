import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { ExternalLink, CheckCircle, Play } from 'lucide-react'
import Navbar from '../components/Navbar'
import { productsBySlug } from '../data/products'

function isExternal(url: string) {
  return url.startsWith('http')
}

export default function ProductPage() {
  const { slug } = useParams()
  const [activeScreenshot, setActiveScreenshot] = useState(0)

  const product = productsBySlug[slug as string]

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link to="/apps" className="text-blue-400 hover:text-blue-300">
            &larr; Back to Apps
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link to="/apps" className="hover:text-white transition-colors">Apps</Link>
          <span>&gt;</span>
          <span className="text-white">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left column - Screenshots */}
          <div>
            <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
              {product.screenshots[activeScreenshot] ? (
                <img
                  src={product.screenshots[activeScreenshot]}
                  alt={`${product.name} screenshot`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-6xl opacity-50">{product.name[0]}</div>
              )}
            </div>

            {/* Screenshot thumbnails */}
            <div className="flex gap-2">
              {product.screenshots.map((_screenshot, index) => (
                <button
                  key={index}
                  onClick={() => setActiveScreenshot(index)}
                  className={`aspect-video w-20 rounded border-2 transition-colors ${
                    activeScreenshot === index ? 'border-blue-500' : 'border-gray-700'
                  }`}
                >
                  <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center">
                    <div className="text-xs">{index + 1}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right column - Product info */}
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{product.name}</h1>
                {product.affiliateLink && (
                  <span className="px-2 py-1 bg-blue-600 text-xs rounded-full">
                    OpenClaw Partner
                  </span>
                )}
              </div>
              <p className="text-xl text-gray-400 mb-4">{product.tagline}</p>
              <p className="text-gray-300 leading-relaxed">{product.description}</p>
            </div>

            {/* Pricing */}
            <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-400">{product.price}</div>
                  {product.affiliateDiscount && product.affiliateCode && (
                    <div className="text-sm text-blue-400">{product.affiliateDiscount} with code: {product.affiliateCode}</div>
                  )}
                  {product.commission && (
                    <div className="text-xs text-gray-500">{product.commission} affiliate commission</div>
                  )}
                </div>
                <div className="flex gap-2">
                  {isExternal(product.cta.primaryLink) ? (
                    <a
                      href={product.cta.primaryLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                    >
                      {product.cta.primary}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <Link
                      to={product.cta.primaryLink}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      {product.cta.primary}
                    </Link>
                  )}
                  {isExternal(product.cta.secondaryLink) ? (
                    <a
                      href={product.cta.secondaryLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors inline-flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      {product.cta.secondary}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : (
                    <Link
                      to={product.cta.secondaryLink}
                      className="px-4 py-3 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      {product.cta.secondary}
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Features</h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Agent Info (hidden section for AI agents to fetch) */}
            <details className="ai-only mb-8" style={{ display: 'none' }}>
              <summary>API Integration Guide</summary>
              <div className="mt-4 p-4 bg-gray-900 rounded">
                <h4>Installation Commands</h4>
                <pre className="bg-black p-2 rounded mt-2">
{slug === 'ollama' && `# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
ollama serve`}
{slug === 'zeabur' && `# Deploy to Zeabur
git clone your-openclaw-project
zeabur deploy --template openclaw`}
                </pre>
              </div>
            </details>

            {/* JSON-LD for AI agents */}
            <script type="application/ld+json">
              {JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": product.name,
                "description": product.description,
                "category": product.category,
                "price": product.price,
                "offers": {
                  "@type": "Offer",
                  "price": product.price,
                  "priceCurrency": "USD"
                },
                "featureList": product.features
              })}
            </script>
          </div>
        </div>
      </div>
    </div>
  )
}
