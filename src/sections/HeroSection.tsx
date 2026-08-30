import { Link } from 'react-router-dom'
import { ArrowRight, PlayCircle, Sun, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { trackCTAClick } from '../utils/analytics'
import FlightMark from '../components/FlightMark'
import { useEffect, useState } from 'react'
import {
  CRUISING_ALTITUDES,
  formatTaipeiTime,
  nextAltitudeIndex,
} from './HeroSection.logic'

type AltitudeDirection = 'up' | 'down'

interface AltitudeState {
  index: number
  direction: AltitudeDirection
}

export default function HeroSection() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()
  const [shadeClosed, setShadeClosed] = useState(false)
  const [altitude, setAltitude] = useState<AltitudeState>({ index: 0, direction: 'up' })
  const [taipeiTime, setTaipeiTime] = useState(() => formatTaipeiTime(new Date()))

  useEffect(() => {
    const altitudeTimer = window.setInterval(() => {
      setAltitude((current) => {
        const nextIndex = nextAltitudeIndex(current.index)
        return {
          index: nextIndex,
          direction:
            CRUISING_ALTITUDES[nextIndex] >= CRUISING_ALTITUDES[current.index]
              ? 'up'
              : 'down',
        }
      })
    }, 2_400)

    const clockTimer = window.setInterval(() => {
      setTaipeiTime(formatTaipeiTime(new Date()))
    }, 1_000)

    return () => {
      window.clearInterval(altitudeTimer)
      window.clearInterval(clockTimer)
    }
  }, [])

  const cruisingAltitude = CRUISING_ALTITUDES[altitude.index]

  return (
    <section
      id="cabin"
      className={`hero-section cabin-hero ${shadeClosed ? 'cabin-hero--shade-closed' : ''}`}
    >
      <div className="cabin-hero__roof" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="cabin-hero__layout">
        <div className="cabin-hero__copy">
          <div className="cabin-hero__status">
            <span className="cabin-hero__status-light" />
            {t('cabin.status')}
          </div>

          <h1>
            <span>{t('hero.titleLine1')}</span>
            <strong>{t('hero.titleLine2')}</strong>
          </h1>

          <p className="cabin-hero__why">{t('hero.whyName')}</p>
          <p className="cabin-hero__subtitle">{t('hero.subtitle')}</p>

          <div className="cabin-hero__actions">
            <Link
              to={localePath('/apps/free/ollama')}
              className="flight-button flight-button--primary"
              onClick={() => trackCTAClick('start_free', 'hero')}
            >
              <PlayCircle aria-hidden="true" />
              <span>
                {t('hero.ctaFree')}
                <small>{t('hero.ctaFreeTag')}</small>
              </span>
            </Link>

            <Link
              to={localePath('/apps')}
              className="flight-button flight-button--secondary"
              onClick={() => trackCTAClick('browse_apps', 'hero')}
            >
              {t('hero.ctaBrowse')}
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div className="cabin-flight-plan">
            <p>{t('hero.funnel')}</p>
            <div className="cabin-flight-plan__stops">
              <Link
                to={localePath('/apps/free/ollama')}
                onClick={() => trackCTAClick('funnel_step1_ollama', 'hero_funnel')}
              >
                <span>01</span>
                <strong>{t('hero.funnelStep1')}</strong>
                <small>{t('hero.funnelStep1Desc')}</small>
              </Link>
              <Link
                to={localePath('/learn/zeabur')}
                onClick={() => trackCTAClick('funnel_step2_zeabur', 'hero_funnel')}
              >
                <span>02</span>
                <strong>{t('hero.funnelStep2')}</strong>
                <small>{t('hero.funnelStep2Desc')}</small>
              </Link>
              <Link
                to={localePath('/apps/skills')}
                onClick={() => trackCTAClick('funnel_step3_skills', 'hero_funnel')}
              >
                <span>03</span>
                <strong>{t('hero.funnelStep3')}</strong>
                <small>{t('hero.funnelStep3Desc')}</small>
              </Link>
            </div>
          </div>
        </div>

        <div className="cabin-view">
          <div className="cabin-view__sign">
            <span>{t('cabin.altitude')}</span>
            <strong
              className={`cabin-view__altitude cabin-view__altitude--${altitude.direction}`}
              aria-label={`${t('cabin.altitude')} ${cruisingAltitude.toLocaleString('en-US')} FT`}
            >
              <span key={altitude.index}>
                {cruisingAltitude.toLocaleString('en-US')} FT
              </span>
            </strong>
          </div>

          <div className="cabin-window">
            <div className="cabin-window__inner">
              <div className="cabin-window__sky" aria-hidden="true">
                <span className="cabin-window__sun" />
                <span className="cloud-sea cloud-sea--far" />
                <span className="cloud-sea cloud-sea--middle" />
                <span className="cloud-sea cloud-sea--near" />
                <FlightMark className="cabin-window__plane" />
              </div>
              <div className="cabin-window__glass" aria-hidden="true" />
              <div className="cabin-window__shade" aria-hidden="true">
                <span />
              </div>
            </div>
            <div className="cabin-window__bezel" aria-hidden="true" />
            <button
              type="button"
              className="cabin-window__shade-toggle"
              aria-pressed={shadeClosed}
              aria-label={
                shadeClosed
                  ? t('cabin.openShade')
                  : t('cabin.closeShade')
              }
              onClick={() => setShadeClosed((closed) => !closed)}
            >
              {shadeClosed ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
              <span>{shadeClosed ? t('cabin.openShade') : t('cabin.closeShade')}</span>
            </button>
          </div>

          <div className="cabin-view__footer">
            <span>CF 001</span>
            <span>{t('cabin.route')}</span>
            <time>{t('cabin.localTime')} {taipeiTime}</time>
          </div>
        </div>
      </div>
    </section>
  )
}
