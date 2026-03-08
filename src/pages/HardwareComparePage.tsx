import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, XCircle, Minus, ExternalLink } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useHead } from '../hooks/useHead'

interface HardwareOption {
  id: string
  nameKey: string
  priceKey: string
  imageInitial: string
  accent: string
}

const hardware: HardwareOption[] = [
  { id: 'umbrel', nameKey: 'umbrelHome', priceKey: 'umbrelPrice', imageInitial: 'U', accent: 'purple' },
  { id: 'mac-mini', nameKey: 'macMini', priceKey: 'macMiniPrice', imageInitial: 'M', accent: 'blue' },
  { id: 'raspberry-pi', nameKey: 'raspberryPi', priceKey: 'raspberryPiPrice', imageInitial: 'R', accent: 'green' },
]

type Rating = 'easy' | 'medium' | 'hard'
type Support = 'yes' | 'no' | 'partial'

interface CompareRow {
  labelKey: string
  type: 'rating' | 'support' | 'text'
  values: (Rating | Support | string)[]
}

const rows: CompareRow[] = [
  { labelKey: 'setupDifficulty', type: 'rating', values: ['easy', 'medium', 'hard'] },
  { labelKey: 'targetAudience', type: 'text', values: ['targetUmbrel', 'targetMac', 'targetPi'] },
  { labelKey: 'performance', type: 'text', values: ['perfUmbrel', 'perfMac', 'perfPi'] },
  { labelKey: 'storage', type: 'text', values: ['storageUmbrel', 'storageMac', 'storagePi'] },
  { labelKey: 'ollamaSupport', type: 'support', values: ['yes', 'yes', 'partial'] },
  { labelKey: 'appStore', type: 'support', values: ['yes', 'no', 'partial'] },
  { labelKey: 'alwaysOn', type: 'support', values: ['yes', 'no', 'yes'] },
  { labelKey: 'noSubscription', type: 'support', values: ['yes', 'yes', 'yes'] },
  { labelKey: 'portability', type: 'rating', values: ['medium', 'medium', 'easy'] },
  { labelKey: 'communitySize', type: 'text', values: ['communityUmbrel', 'communityMac', 'communityPi'] },
]

function RatingBadge({ rating, t }: { rating: Rating; t: any }) {
  const colors = {
    easy: 'bg-green-900/40 text-green-400 border-green-700/40',
    medium: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/40',
    hard: 'bg-red-900/40 text-red-400 border-red-700/40',
  }
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded-full border ${colors[rating]}`}>
      {t(`hardwareCompare.ratings.${rating}`)}
    </span>
  )
}

function SupportIcon({ support }: { support: Support }) {
  if (support === 'yes') return <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
  if (support === 'no') return <XCircle className="w-5 h-5 text-gray-600 mx-auto" />
  return <Minus className="w-5 h-5 text-yellow-400 mx-auto" />
}

export default function HardwareComparePage() {
  const { t } = useTranslation()

  useHead({
    title: t('hardwareCompare.pageTitle'),
    description: t('hardwareCompare.subtitle'),
    canonical: 'https://canfly.ai/learn/hardware-compare',
  })

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-950 via-black to-gray-950 pt-12 pb-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">
            {t('hardwareCompare.title')}
          </h1>
          <p className="text-gray-400 text-lg mb-4 max-w-2xl mx-auto">
            {t('hardwareCompare.subtitle')}
          </p>
        </div>
      </div>

      {/* Comparison Cards (mobile-friendly summary) */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {hardware.map((hw) => {
            const accentBorder = hw.accent === 'purple' ? 'border-purple-600/40' : hw.accent === 'blue' ? 'border-blue-600/40' : 'border-green-600/40'
            const accentText = hw.accent === 'purple' ? 'text-purple-400' : hw.accent === 'blue' ? 'text-blue-400' : 'text-green-400'
            const accentBg = hw.accent === 'purple' ? 'from-purple-900/20' : hw.accent === 'blue' ? 'from-blue-900/20' : 'from-green-900/20'

            return (
              <div key={hw.id} className={`bg-gradient-to-b ${accentBg} to-gray-950 border ${accentBorder} rounded-xl p-6`}>
                <div className={`text-5xl font-bold ${accentText} mb-3 opacity-60`}>{hw.imageInitial}</div>
                <h3 className="text-xl font-bold mb-1">{t(`hardwareCompare.devices.${hw.nameKey}`)}</h3>
                <div className={`text-2xl font-bold ${accentText} mb-3`}>
                  {t(`hardwareCompare.devices.${hw.priceKey}`)}
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {t(`hardwareCompare.devices.${hw.id}Desc`)}
                </p>
              </div>
            )
          })}
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm w-1/4">
                  {t('hardwareCompare.feature')}
                </th>
                {hardware.map((hw) => (
                  <th key={hw.id} className="py-3 px-4 text-center font-medium text-sm">
                    {t(`hardwareCompare.devices.${hw.nameKey}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Price row */}
              <tr className="border-b border-gray-800/50">
                <td className="py-3 px-4 text-gray-400 text-sm">{t('hardwareCompare.rows.price')}</td>
                {hardware.map((hw) => {
                  const accentText = hw.accent === 'purple' ? 'text-purple-400' : hw.accent === 'blue' ? 'text-blue-400' : 'text-green-400'
                  return (
                    <td key={hw.id} className={`py-3 px-4 text-center font-bold ${accentText}`}>
                      {t(`hardwareCompare.devices.${hw.priceKey}`)}
                    </td>
                  )
                })}
              </tr>

              {rows.map((row, i) => (
                <tr key={row.labelKey} className={`border-b border-gray-800/50 ${i % 2 === 0 ? 'bg-gray-950/50' : ''}`}>
                  <td className="py-3 px-4 text-gray-400 text-sm">{t(`hardwareCompare.rows.${row.labelKey}`)}</td>
                  {row.values.map((val, j) => (
                    <td key={j} className="py-3 px-4 text-center text-sm">
                      {row.type === 'rating' && <RatingBadge rating={val as Rating} t={t} />}
                      {row.type === 'support' && <SupportIcon support={val as Support} />}
                      {row.type === 'text' && (
                        <span className="text-gray-300">{t(`hardwareCompare.values.${val}`)}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recommendations */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-2 text-purple-400">{t('hardwareCompare.rec.umbrelTitle')}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">{t('hardwareCompare.rec.umbrelDesc')}</p>
            <Link
              to="/apps/umbrel"
              className="inline-flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              {t('hardwareCompare.rec.learnMore')} →
            </Link>
          </div>
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-2 text-blue-400">{t('hardwareCompare.rec.macTitle')}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">{t('hardwareCompare.rec.macDesc')}</p>
            <a
              href="https://www.apple.com/mac-mini/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {t('hardwareCompare.rec.visitSite')} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-2 text-green-400">{t('hardwareCompare.rec.piTitle')}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">{t('hardwareCompare.rec.piDesc')}</p>
            <a
              href="https://www.raspberrypi.com/products/raspberry-pi-5/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              {t('hardwareCompare.rec.visitSite')} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 mb-4">{t('hardwareCompare.ctaText')}</p>
          <Link
            to="/learn/ollama"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            {t('hardwareCompare.ctaButton')}
          </Link>
        </div>

        {/* JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "name": t('hardwareCompare.title'),
            "description": t('hardwareCompare.subtitle'),
            "url": "https://canfly.ai/learn/hardware-compare",
            "publisher": {
              "@type": "Organization",
              "name": "Canfly",
              "url": "https://canfly.ai"
            }
          })}
        </script>
      </div>
    </div>
  )
}
