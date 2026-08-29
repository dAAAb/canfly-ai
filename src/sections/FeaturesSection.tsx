import { useFadeIn } from '../hooks/useFadeIn'
import { Rocket, BookOpen, Wrench, Users, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const featureIcons = [Rocket, BookOpen, Wrench, Users, Globe]

function FeatureCard({ index }: { index: number }) {
  const ref = useFadeIn(0.1)
  const { t } = useTranslation()
  const Icon = featureIcons[index]
  const title = t(`features.items.${index}.title`)
  const desc = t(`features.items.${index}.desc`)

  return (
    <div ref={ref} className="fade-section home-route-card-wrap">
      <article className="home-route-card">
        <header>
          <span>0{index + 1}</span>
          <Icon className={`stagger-child stagger-${index + 1}`} strokeWidth={1.45} />
        </header>
        <div>
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>
        <span className="home-route-card__code">CF / {String(index + 1).padStart(2, '0')}</span>
      </article>
    </div>
  )
}

export default function FeaturesSection() {
  const headerRef = useFadeIn()
  const { t } = useTranslation()

  return (
    <section className="home-section home-routes">
      <div className="home-routes__inner">
        <div ref={headerRef} className="fade-section home-section__header home-section__header--light">
          <p className="flight-eyebrow stagger-child stagger-1">
            {t('features.eyebrow')}
          </p>
          <h2 className="stagger-child stagger-2">
            {t('features.headingLine1')}
            <span>{t('features.headingHighlight')}</span>
          </h2>
        </div>

        <div className="home-routes__grid">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <FeatureCard index={i} />
            </div>
          ))}
          {[3, 4].map((i) => (
            <div key={i}>
              <FeatureCard index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
