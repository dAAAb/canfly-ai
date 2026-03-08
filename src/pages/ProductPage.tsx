import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { ExternalLink, CheckCircle, Play } from 'lucide-react'
import Navbar from '../components/Navbar'
import ShareBar from '../components/ShareBar'
import ReviewVideoPlayer from '../components/ReviewVideoPlayer'
import { productsBySlug } from '../data/products'
import { useHead } from '../hooks/useHead'

function isExternal(url: string) {
  return url.startsWith('http')
}

function NotifyForm({ productName }: { productName: string }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Connect to email service (e.g. Mailchimp, Resend)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="p-4 bg-green-900/30 border border-green-800 rounded-lg text-center">
        <p className="text-green-400 font-medium">You're on the list!</p>
        <p className="text-gray-400 text-sm mt-1">We'll notify you when {productName} launches on Canfly.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
      />
      <button
        type="submit"
        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
      >
        Notify Me
      </button>
    </form>
  )
}

export default function ProductPage() {
  const { slug } = useParams()
  const [activeScreenshot, setActiveScreenshot] = useState(0)

  const product = productsBySlug[slug as string]
  const isComingSoon = product?.status === 'coming-soon'

  useHead(product ? {
    title: `${product.name} — Canfly`,
    description: product.description,
    canonical: `https://canfly.ai/apps/${slug}`,
  } : {})

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

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-10 page-enter">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link to="/apps" className="hover:text-white transition-colors">Apps</Link>
          <span>&gt;</span>
          <span className="text-white">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left column - Screenshots / Logo */}
          <div>
            <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
              {isComingSoon && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-purple-600 text-white text-sm font-medium rounded-full">
                  Coming Soon
                </div>
              )}
              {product.screenshots[activeScreenshot] ? (
                <img
                  src={product.screenshots[activeScreenshot]}
                  alt={`${product.name} screenshot`}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="text-center">
                  <div className="text-7xl mb-3 opacity-60">{product.name[0]}</div>
                  {isComingSoon && <div className="text-gray-500 text-sm">Integration coming soon</div>}
                </div>
              )}
            </div>

            {/* Screenshot thumbnails */}
            {product.screenshots.length > 0 && (
              <div className="flex gap-2">
                {product.screenshots.map((_screenshot, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveScreenshot(index)}
                    className={`aspect-video w-20 rounded border-2 transition-all overflow-hidden relative hover:border-blue-400 ${
                      activeScreenshot === index ? 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'border-gray-700'
                    }`}
                  >
                    <img
                      src={_screenshot}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover object-top opacity-40"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium text-white drop-shadow-md">{index + 1}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Review Video */}
            {product.reviewVideo && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Review</h3>
                <ReviewVideoPlayer
                  src={product.reviewVideo}
                  poster={product.reviewVideo.replace('.mp4', '-poster.jpg')}
                  subtitles={[
                    { label: 'English', srclang: 'en', src: product.reviewVideo.replace('.mp4', '.en.vtt') },
                    { label: '繁體中文', srclang: 'zh-TW', src: product.reviewVideo.replace('.mp4', '.zh-TW.vtt') },
                    { label: '简体中文', srclang: 'zh-CN', src: product.reviewVideo.replace('.mp4', '.zh-CN.vtt') },
                  ]}
                />
              </div>
            )}
          </div>

          {/* Right column - Product info */}
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{product.name}</h1>
                {isComingSoon && (
                  <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full border border-purple-600/40">
                    Coming Soon
                  </span>
                )}
                {!isComingSoon && product.affiliateLink && (
                  <span className="px-2 py-1 bg-blue-600 text-xs rounded-full">
                    OpenClaw Partner
                  </span>
                )}
              </div>
              <p className="text-xl text-gray-400 mb-4">{product.tagline}</p>
              <p className="text-gray-300 leading-relaxed">{product.description}</p>
            </div>

            {/* Coming Soon: Notify Me section */}
            {isComingSoon ? (
              <div className="mb-6 p-5 bg-gray-900 rounded-lg border border-gray-800">
                <div className="mb-4">
                  <div className="text-lg font-semibold mb-1">Get notified when it launches</div>
                  <p className="text-gray-400 text-sm">We'll send you an email when {product.name} is available on Canfly.</p>
                </div>
                <NotifyForm productName={product.name} />
                {product.cta.secondaryLink && isExternal(product.cta.secondaryLink) && (
                  <a
                    href={product.cta.secondaryLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {product.cta.secondary}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ) : (
              /* Pricing - only for available products */
              <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-400">{product.price}</div>
                    {product.affiliateDiscount && product.affiliateCode && (
                      <div className="text-sm text-blue-400">{product.affiliateDiscount} with code: {product.affiliateCode}</div>
                    )}
                    {product.commission && (
                      <div className="text-xs text-gray-500">{product.commission} affiliate commission</div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {isExternal(product.cta.primaryLink) ? (
                      <a
                        href={product.cta.primaryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all inline-flex items-center gap-2 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                      >
                        {product.cta.primary}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <Link
                        to={product.cta.primaryLink}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
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
            )}

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

            <ShareBar title={product.name} className="mb-8" />

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

            {/* JSON-LD structured data */}
            <script type="application/ld+json">
              {JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": product.name,
                "description": product.description,
                "url": `https://canfly.ai/apps/${slug}`,
                "applicationCategory": product.category === 'free' ? 'DeveloperApplication' :
                  product.category === 'skills' ? 'MultimediaApplication' :
                  product.category === 'hosting' ? 'WebApplication' : 'DesktopApplication',
                "operatingSystem": "All",
                "offers": {
                  "@type": "Offer",
                  "price": product.price === 'Free' ? '0' : product.price.replace(/[^0-9.]/g, ''),
                  "priceCurrency": "USD",
                  "availability": product.status === 'available'
                    ? "https://schema.org/InStock"
                    : "https://schema.org/PreOrder"
                },
                "featureList": product.features,
                ...(product.affiliateLink ? { "installUrl": product.affiliateLink } : {}),
                ...(product.tutorial ? { "softwareHelp": { "@type": "CreativeWork", "url": `https://canfly.ai${product.tutorial}` } } : {}),
                "provider": {
                  "@type": "Organization",
                  "name": "Canfly",
                  "url": "https://canfly.ai"
                }
              })}
            </script>
          </div>
        </div>
      </div>
    </div>
  )
}
