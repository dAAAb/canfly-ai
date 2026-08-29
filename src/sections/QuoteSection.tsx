import { useFadeIn } from '../hooks/useFadeIn'
import { useTranslation } from 'react-i18next'
import FlightMark from '../components/FlightMark'

export default function QuoteSection() {
  const ref = useFadeIn()
  const { t } = useTranslation()

  return (
    <section className="home-section home-quote">
      <div className="home-quote__window" aria-hidden="true">
        <span className="home-quote__moon" />
        <span className="home-quote__clouds" />
        <FlightMark />
      </div>

      <div ref={ref} className="fade-section home-quote__content">
        <p className="flight-eyebrow">CABIN NOTE · 38,000 FT</p>
        <blockquote className="stagger-child stagger-1">
          <span>&ldquo;</span>
          {t('quote.line1')}
          <br />
          {t('quote.line2')}
          <br />
          <strong>
            {t('quote.line3')}
          </strong>
          <span>&rdquo;</span>
        </blockquote>

        <p className="home-quote__attribution stagger-child stagger-2">
          🦞 {t('quote.attribution')}
        </p>
      </div>
    </section>
  )
}
