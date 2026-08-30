import { useFadeIn } from '../hooks/useFadeIn'
import { Mail, PlayCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { trackCTAClick } from '../utils/analytics'
import { useEffect, useRef } from 'react'
import { takeoffPointPercent, takeoffProgress } from './CTASection.logic'

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export default function CTASection() {
  const ref = useFadeIn()
  const sectionRef = useRef<HTMLElement>(null)
  const { t } = useTranslation()
  const { localePath } = useLanguage()

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    let animationFrame = 0

    function updateTakeoffPosition() {
      animationFrame = 0
      const bounds = section.getBoundingClientRect()
      const progress = takeoffProgress({
        sectionTop: bounds.top,
        sectionHeight: bounds.height,
        viewportHeight: window.innerHeight,
      })
      section.style.setProperty('--takeoff-y', `${takeoffPointPercent(progress)}%`)
    }

    function requestUpdate() {
      if (animationFrame !== 0) return
      animationFrame = window.requestAnimationFrame(updateTakeoffPosition)
    }

    updateTakeoffPosition()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)

    return () => {
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      if (animationFrame !== 0) window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <section ref={sectionRef} className="home-section home-cta">
      <div className="home-cta__runway" aria-hidden="true">
        <span />
      </div>

      <div ref={ref} className="fade-section home-cta__content">
        <p className="flight-eyebrow">FINAL CALL · CF 001</p>
        <h2 className="stagger-child stagger-1">
          {t('cta.headingLine1')}
          <br />
          <span>{t('cta.headingHighlight')}</span>
        </h2>

        <p className="home-cta__description stagger-child stagger-2">
          {t('cta.desc').split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </p>

        <div className="home-cta__primary stagger-child stagger-3">
          <Link
            to={localePath('/apps/free/ollama')}
            className="flight-button flight-button--primary"
            onClick={() => trackCTAClick('start_free', 'cta_section')}
          >
            <PlayCircle className="w-6 h-6" />
            {t('cta.ctaButton')}
          </Link>
        </div>

        <div className="home-cta__secondary stagger-child stagger-4">
          <a
            href="mailto:hi@canfly.ai"
            onClick={() => trackCTAClick('email_contact', 'cta_section')}
            className="flight-button flight-button--secondary"
          >
            <Mail className="w-5 h-5 opacity-70 flex-shrink-0" />
            <span>hi@canfly.ai</span>
          </a>

          <a
            href="https://x.com/dAAAb"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackCTAClick('follow_x', 'cta_section')}
            className="flight-button flight-button--secondary"
          >
            <XIcon />
            <span>{t('cta.followX')}</span>
          </a>
        </div>
      </div>
    </section>
  )
}
