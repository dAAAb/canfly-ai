import { useFadeIn } from '../hooks/useFadeIn'
import { Rocket, BookOpen, Wrench, Users, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const featureIcons = [Rocket, BookOpen, Wrench, Users, Globe]
const featureGradients = [
  'from-cyan-400 to-blue-500',
  'from-purple-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-green-400 to-emerald-500',
  'from-blue-400 to-indigo-500',
]

function FeatureCard({ index }: { index: number }) {
  const ref = useFadeIn(0.1)
  const { t } = useTranslation()
  const Icon = featureIcons[index]
  const gradient = featureGradients[index]
  const title = t(`features.items.${index}.title`)
  const desc = t(`features.items.${index}.desc`)

  return (
    <div ref={ref} className="fade-section w-full flex">
      <div
        className="relative rounded-3xl overflow-hidden h-full w-full glass-hover"
        style={{
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: 'clamp(28px, 4vw, 56px)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 20% 20%, rgba(255,255,255,0.04), transparent 60%)',
          }}
        />

        <div className="relative text-center">
          <Icon
            className={`stagger-child stagger-${index + 1}`}
            style={{ width: 'clamp(36px, 4vw, 56px)', height: 'clamp(36px, 4vw, 56px)', marginBottom: '1.5rem', marginLeft: 'auto', marginRight: 'auto' }}
            strokeWidth={1.3}
          />

          <h3
            className={`font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
            style={{ fontSize: 'clamp(24px, 2.5vw, 40px)', lineHeight: 1.2 }}
          >
            {title}
          </h3>

          <p style={{ fontSize: 'clamp(15px, 1.2vw, 20px)', lineHeight: 1.75, opacity: 0.7, marginTop: '1.25rem' }}>
            {desc}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function FeaturesSection() {
  const headerRef = useFadeIn()
  const { t } = useTranslation()

  return (
    <section className="relative py-36 md:py-52" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
      <div style={{ maxWidth: '1024px', marginLeft: 'auto', marginRight: 'auto' }}>
        {/* Section header */}
        <div ref={headerRef} className="fade-section" style={{ textAlign: 'center', marginBottom: 'clamp(48px, 6vw, 96px)' }}>
          <p
            className="text-cyan-400 font-semibold uppercase tracking-widest stagger-child stagger-1"
            style={{ fontSize: 'clamp(11px, 1vw, 14px)', marginBottom: '2rem' }}
          >
            {t('features.eyebrow')}
          </p>
          <h2
            className="font-bold stagger-child stagger-2"
            style={{
              fontSize: 'clamp(32px, 5vw, 72px)',
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
            }}
          >
            {t('features.headingLine1')}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
              {t('features.headingHighlight')}
            </span>
          </h2>
        </div>

        {/* Feature cards grid — 6-col so bottom row of 2 aligns with top row of 3 */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-8 items-stretch">
          {[0, 1, 2].map((i) => (
            <div key={i} className="md:col-span-2 flex">
              <FeatureCard index={i} />
            </div>
          ))}
          {[3, 4].map((i) => (
            <div key={i} className="md:col-span-3 flex">
              <FeatureCard index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
