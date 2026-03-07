import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { ExternalLink, CheckCircle, Play, Star } from 'lucide-react'
import Navbar from '../components/Navbar'

// Product data - should match AppsPage.tsx
const products = {
  ollama: {
    name: 'Ollama',
    tagline: 'Free local AI models',
    description: 'Run powerful AI models locally without requiring API keys or internet connection. Perfect for privacy-conscious users and development environments.',
    price: 'Free',
    category: 'free',
    status: 'available',
    features: [
      'No API keys required',
      'Privacy-focused local processing',
      'Multiple model support (Llama, CodeLlama, Mistral)',
      'Easy command-line interface',
      'Works with OpenClaw agents'
    ],
    screenshots: [
      '/images/ollama-terminal.jpg',
      '/images/ollama-models.jpg',
      '/images/ollama-openclaw.jpg'
    ],
    tutorial: '/learn/ollama-setup',
    cta: {
      primary: 'Start Free Tutorial',
      secondary: 'View on GitHub'
    }
  },
  zeabur: {
    name: 'Zeabur',
    tagline: 'One-click cloud deployment',
    description: 'Deploy your OpenClaw agents to the cloud with zero configuration. Get started in minutes with our affiliate partnership.',
    price: '$5/month',
    category: 'hosting',
    status: 'available',
    affiliate: 'OpenClaw',
    affiliateDiscount: '10% off',
    features: [
      'One-click deployment',
      'Automatic HTTPS',
      'Global CDN',
      '24/7 monitoring',
      'OpenClaw optimized templates'
    ],
    screenshots: [
      '/images/zeabur-dashboard.jpg',
      '/images/zeabur-deploy.jpg',
      '/images/zeabur-logs.jpg'
    ],
    tutorial: '/learn/zeabur-deployment',
    cta: {
      primary: 'Deploy Now (10% off)',
      secondary: 'View Tutorial'
    }
  },
  elevenlabs: {
    name: 'ElevenLabs',
    tagline: 'AI voice synthesis',
    description: 'Add realistic voice capabilities to your OpenClaw agents. High-quality text-to-speech with multiple voice options.',
    price: '$5/month',
    category: 'skills',
    status: 'coming-soon',
    affiliate: 'https://try.elevenlabs.io/clawhub',
    commission: '22% recurring',
    features: [
      'Natural-sounding voices',
      'Multi-language support',
      'Voice cloning capabilities',
      'API integration',
      'OpenClaw skill available'
    ],
    screenshots: [
      '/images/elevenlabs-interface.jpg',
      '/images/elevenlabs-voices.jpg',
      '/images/elevenlabs-openclaw.jpg'
    ],
    tutorial: '/learn/elevenlabs-integration',
    cta: {
      primary: 'Coming Soon',
      secondary: 'Get Notified'
    }
  }
}

export default function ProductPage() {
  const { slug } = useParams()
  const [activeScreenshot, setActiveScreenshot] = useState(0)

  const product = products[slug as keyof typeof products]

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link to="/apps" className="text-blue-400 hover:text-blue-300">
            ← Back to Apps
          </Link>
        </div>
      </div>
    )
  }

  const isComingSoon = product.status === 'coming-soon'

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-10">
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
              {product.screenshots.map((screenshot, index) => (
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
                {product.affiliate && (
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
                  {product.affiliateDiscount && (
                    <div className="text-sm text-blue-400">{product.affiliateDiscount} with code: {product.affiliate}</div>
                  )}
                  {product.commission && (
                    <div className="text-xs text-gray-500">{product.commission} affiliate commission</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      isComingSoon
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    disabled={isComingSoon}
                  >
                    {product.cta.primary}
                  </button>
                  <Link
                    to={product.tutorial}
                    className="px-4 py-3 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {product.cta.secondary}
                  </Link>
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
