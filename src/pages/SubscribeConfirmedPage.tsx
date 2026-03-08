import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { useHead } from '../hooks/useHead'
import { useFadeIn } from '../hooks/useFadeIn'
import Navbar from '../components/Navbar'
import { CheckCircle, ArrowRight, Sparkles, BookOpen, Rocket } from 'lucide-react'

const NEXT_STEPS = [
  {
    key: 'tutorial',
    icon: BookOpen,
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/10',
    glowColor: 'rgba(6,182,212,0.12)',
    link: '/learn/ollama-openclaw',
  },
  {
    key: 'apps',
    icon: Sparkles,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    glowColor: 'rgba(168,85,247,0.12)',
    link: '/apps',
  },
  {
    key: 'community',
    icon: Rocket,
    color: 'text-green-400',
    borderColor: 'border-green-500/30',
    bgColor: 'bg-green-500/10',
    glowColor: 'rgba(34,197,94,0.12)',
    link: '/community',
  },
]

export default function SubscribeConfirmedPage() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()
  const heroRef = useFadeIn()
  const stepsRef = useFadeIn(0.1)

  useHead({
    title: t('subscribeConfirmed.meta.title'),
    description: t('subscribeConfirmed.meta.description'),
    canonical: `https://canfly.ai${localePath('/subscribe/confirmed')}`,
    ogType: 'website',
  })

  return (
    <div className="bg-black text-white min-h-screen">
      <Navbar />

      {/* Hero confirmation */}
      <section
        ref={heroRef}
        className="fade-section relative py-24 md:py-36"
        style={{ paddingLeft: '8%', paddingRight: '8%' }}
      >
        <div style={{ maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
          <div className="stagger-child stagger-1 flex justify-center mb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(34,197,94,0.15)',
                border: '2px solid rgba(34,197,94,0.4)',
                boxShadow: '0 0 40px rgba(34,197,94,0.2)',
              }}
            >
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </div>

          <h1
            className="font-bold stagger-child stagger-2"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-0.03em', lineHeight: 1.1 }}
          >
            {t('subscribeConfirmed.heading')}
          </h1>

          <p
            className="text-gray-400 stagger-child stagger-3"
            style={{
              fontSize: 'clamp(16px, 1.3vw, 20px)',
              lineHeight: 1.7,
              marginTop: '20px',
              maxWidth: '520px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {t('subscribeConfirmed.desc')}
          </p>
        </div>
      </section>

      {/* Next steps */}
      <section
        ref={stepsRef}
        className="fade-section pb-36"
        style={{ paddingLeft: '8%', paddingRight: '8%' }}
      >
        <div style={{ maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 className="text-center text-lg font-semibold text-gray-300 mb-8 stagger-child stagger-1">
            {t('subscribeConfirmed.nextStepsHeading')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {NEXT_STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <Link
                  key={step.key}
                  to={localePath(step.link)}
                  className={`stagger-child stagger-${i + 1} block p-6 rounded-2xl border ${step.borderColor} ${step.bgColor} card-hover transition-all duration-300 hover:scale-[1.02]`}
                  style={{ boxShadow: `0 0 30px ${step.glowColor}` }}
                >
                  <div className={`p-3 rounded-xl ${step.bgColor} ${step.color} inline-block mb-4`}>
                    <Icon size={24} />
                  </div>
                  <h3 className={`font-bold text-base ${step.color} mb-2`}>
                    {t(`subscribeConfirmed.nextSteps.${step.key}.title`)}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {t(`subscribeConfirmed.nextSteps.${step.key}.desc`)}
                  </p>
                  <div className={`flex items-center gap-1 mt-3 text-sm ${step.color}`}>
                    {t(`subscribeConfirmed.nextSteps.${step.key}.cta`)}
                    <ArrowRight size={14} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
