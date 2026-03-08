import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, CheckCircle, Play } from 'lucide-react'
import Navbar from '../components/Navbar'
import ShareBar from '../components/ShareBar'
import ReviewVideoPlayer from '../components/ReviewVideoPlayer'
import { productsBySlug } from '../data/products'
import { useHead } from '../hooks/useHead'
import { useLanguage } from '../hooks/useLanguage'

function isExternal(url: string) {
  return url.startsWith('http')
}

function NotifyForm({ productName, t }: { productName: string; t: (key: string, opts?: Record<string, string>) => string }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)

    try {
      const res = await fetch('https://buttondown.com/api/emails/embed-subscribe/canfly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, tag: productName }),
      })
      if (res.ok || res.status === 201) {
        setSubmitted(true)
        setEmail('')
      } else {
        throw new Error('fetch failed')
      }
    } catch {
      // Fallback: submit via form action
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = 'https://buttondown.com/api/emails/embed-subscribe/canfly'
      form.target = '_blank'
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'email'
      input.value = email
      form.appendChild(input)
      const tagInput = document.createElement('input')
      tagInput.type = 'hidden'
      tagInput.name = 'tag'
      tagInput.value = productName
      form.appendChild(tagInput)
      document.body.appendChild(form)
      form.submit()
      document.body.removeChild(form)
      setSubmitted(true)
      setEmail('')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-4 bg-green-900/30 border border-green-800 rounded-lg text-center">
        <p className="text-green-400 font-medium">{t('product.notifySuccess')}</p>
        <p className="text-gray-400 text-sm mt-1">{t('product.notifySuccessDescription', { name: productName })}</p>
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
        disabled={loading}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
      >
        {t('product.notifyButton')}
      </button>
    </form>
  )
}

export default function ProductPage() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const { localePath } = useLanguage()
  const [activeScreenshot, setActiveScreenshot] = useState(0)

  const product = productsBySlug[slug as string]
  const isComingSoon = product?.status === 'coming-soon'
  const pid = product?.id ?? ''

  useHead(product ? {
    title: `${product.name} — Canfly`,
    description: t(`product.products.${pid}.description`, { defaultValue: product.description }),
    canonical: `https://canfly.ai${localePath(`/apps/${slug}`)}`,
    ogImage: product.heroImage ? `https://canfly.ai${product.heroImage}` : product.icon ? `https://canfly.ai${product.icon}` : undefined,
    ogType: 'website',
  } : {})

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('product.notFound')}</h1>
          <Link to={localePath('/apps')} className="text-blue-400 hover:text-blue-300">
            {t('product.backToApps')}
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
          <Link to={localePath('/apps')} className="hover:text-white transition-colors">{t('product.breadcrumbApps')}</Link>
          <span>&gt;</span>
          <span className="text-white">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left column - Screenshots / Logo */}
          <div>
            <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
              {isComingSoon && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-purple-600 text-white text-sm font-medium rounded-full">
                  {t('product.comingSoon')}
                </div>
              )}
              {product.screenshots[activeScreenshot] ? (
                <img
                  src={product.screenshots[activeScreenshot]}
                  alt={`${product.name} screenshot`}
                  className="w-full h-full object-cover object-top"
                />
              ) : product.heroImage ? (
                <img
                  src={product.heroImage}
                  alt={product.name}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="text-center">
                  <div className="text-7xl mb-3 opacity-60">{product.name[0]}</div>
                  {isComingSoon && <div className="text-gray-500 text-sm">{t('product.integrationComingSoon')}</div>}
                </div>
              )}
            </div>

            {/* Screenshot thumbnails */}
            {product.screenshots.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                {product.screenshots.map((_screenshot, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveScreenshot(index)}
                    className={`aspect-video w-20 shrink-0 rounded border-2 transition-all overflow-hidden relative hover:border-blue-400 ${
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
                <h3 className="text-lg font-semibold mb-3">{t('product.review')}</h3>
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
                    {t('product.comingSoon')}
                  </span>
                )}
                {!isComingSoon && product.affiliateLink && (
                  <span className="px-2 py-1 bg-blue-600 text-xs rounded-full">
                    {t('product.openclawPartner')}
                  </span>
                )}
              </div>
              <p className="text-xl text-gray-400 mb-4">{t(`product.products.${pid}.tagline`, { defaultValue: product.tagline })}</p>
              <p className="text-gray-300 leading-relaxed">{t(`product.products.${pid}.description`, { defaultValue: product.description })}</p>
            </div>

            {/* Coming Soon: Notify Me section */}
            {isComingSoon ? (
              <div className="mb-6 p-5 bg-gray-900 rounded-lg border border-gray-800">
                <div className="mb-4">
                  <div className="text-lg font-semibold mb-1">{t('product.notifyTitle')}</div>
                  <p className="text-gray-400 text-sm">{t('product.notifyDescription', { name: product.name })}</p>
                </div>
                <NotifyForm productName={product.name} t={t} />
                {product.cta.secondaryLink && isExternal(product.cta.secondaryLink) && (
                  <a
                    href={product.cta.secondaryLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {t(`product.products.${pid}.ctaSecondary`, { defaultValue: product.cta.secondary })}
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
                      <div className="text-sm text-blue-400">{t('product.discountWithCode', { discount: product.affiliateDiscount, code: product.affiliateCode })}</div>
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
                        {t(`product.products.${pid}.ctaPrimary`, { defaultValue: product.cta.primary })}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <Link
                        to={localePath(product.cta.primaryLink)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                      >
                        {t(`product.products.${pid}.ctaPrimary`, { defaultValue: product.cta.primary })}
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
                        {t(`product.products.${pid}.ctaSecondary`, { defaultValue: product.cta.secondary })}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <Link
                        to={localePath(product.cta.secondaryLink)}
                        className="px-4 py-3 border border-gray-600 rounded-lg hover:border-gray-500 transition-colors flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        {t(`product.products.${pid}.ctaSecondary`, { defaultValue: product.cta.secondary })}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">{t('product.features')}</h3>
              <ul className="space-y-2">
                {(t(`product.products.${pid}.features`, { returnObjects: true, defaultValue: product.features }) as string[]).map((feature, index) => (
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
