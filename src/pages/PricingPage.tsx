import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { useHead } from '../hooks/useHead'
import Navbar from '../components/Navbar'
import { Check, ChevronDown, Rocket, Crown } from 'lucide-react'

export default function PricingPage() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()

  useHead({
    title: t('meta.pricing.title'),
    description: t('meta.pricing.description'),
    canonical: `https://canfly.ai${localePath('/pricing')}`,
    ogType: 'website',
  })

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black page-enter">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-medium tracking-wider uppercase mb-3">
              {t('pricing.eyebrow')}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              {t('pricing.title')}
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              {t('pricing.subtitle')}
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-24">
            {/* Free Plan */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gray-700/40 border border-gray-600/40 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-gray-300" />
                </div>
                <h2 className="text-xl font-bold text-white">{t('pricing.free.name')}</h2>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$0</span>
                <span className="text-gray-500 ml-2">{t('pricing.free.period')}</span>
              </div>

              <p className="text-gray-400 text-sm mb-6">{t('pricing.free.desc')}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    {t(`pricing.free.features.${i}`)}
                  </li>
                ))}
              </ul>

              <Link
                to={localePath('/learn/ollama-openclaw')}
                className="block w-full text-center py-3 rounded-lg border border-gray-600 text-white font-medium hover:bg-gray-800 transition-colors"
              >
                {t('pricing.free.cta')}
              </Link>
            </div>

            {/* White-Glove Plan */}
            <div className="rounded-2xl border border-blue-600/60 bg-gradient-to-b from-blue-950/30 to-gray-900/40 p-8 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                {t('pricing.pro.badge')}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-600/40 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">{t('pricing.pro.name')}</h2>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$50</span>
                <span className="text-gray-500 ml-2">{t('pricing.pro.period')}</span>
              </div>

              <p className="text-gray-400 text-sm mb-6">{t('pricing.pro.desc')}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    {t(`pricing.pro.features.${i}`)}
                  </li>
                ))}
              </ul>

              <Link
                to={localePath('/checkout')}
                className="block w-full text-center py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                {t('pricing.pro.cta')}
              </Link>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-10">
              {t('pricing.faq.title')}
            </h2>
            <div className="space-y-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <FAQItem
                  key={i}
                  question={t(`pricing.faq.items.${i}.q`)}
                  answer={t(`pricing.faq.items.${i}.a`)}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <span className="font-medium text-white pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-4 text-gray-400 text-sm leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}
