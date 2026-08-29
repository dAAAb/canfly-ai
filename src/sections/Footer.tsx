import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { isUserSubdomain } from '../utils/subdomain'
import FlightMark from '../components/FlightMark'

declare const __APP_VERSION__: string

export default function Footer() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()
  const onUserHost = isUserSubdomain(window.location.hostname)
  const mainBase = onUserHost ? 'https://canfly.ai' : ''

  const explore = [
    { to: localePath('/'), label: t('footer.home') },
    { to: localePath('/apps'), label: t('nav.browseApps') },
    { to: localePath('/community'), label: t('nav.community') },
    { to: localePath('/rankings'), label: t('nav.rankings') },
    { to: localePath('/blog'), label: t('nav.blog') },
    { to: localePath('/free'), label: t('footer.freeAgents') },
  ]

  const company = [
    { to: localePath('/about'), label: t('footer.about') },
    { to: localePath('/contact'), label: t('footer.contact') },
    { to: localePath('/privacy'), label: t('footer.privacy') },
    { to: localePath('/developers'), label: t('footer.developers') },
  ]

  return (
    <footer className="flight-footer">
      <div className="flight-footer__horizon" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="flight-footer__inner">
        <div className="flight-footer__route">
          <div>
            <span>{t('footer.departure', 'Departure')}</span>
            <strong>TPE</strong>
          </div>
          <div className="flight-footer__route-line">
            <FlightMark />
          </div>
          <div>
            <span>{t('footer.destination', 'Destination')}</span>
            <strong>AI</strong>
          </div>
        </div>

        <div className="flight-footer__grid">
          <div className="flight-footer__brand">
            <p>
              <FlightMark />
              <span>CanFly.ai</span>
            </p>
            <p>
              {t('footer.brandLine')}
            </p>
          </div>
          <div>
            <p className="flight-footer__label">
              {t('footer.explore')}
            </p>
            <nav className="flight-footer__links">
              {explore.map((item) =>
                onUserHost ? (
                  <a
                    key={item.to}
                    href={`${mainBase}${item.to}`}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.to}
                    to={item.to}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
          <div>
            <p className="flight-footer__label">
              {t('footer.company')}
            </p>
            <nav className="flight-footer__links">
              {company.map((item) =>
                onUserHost ? (
                  <a
                    key={item.to}
                    href={`${mainBase}${item.to}`}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.to}
                    to={item.to}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
          <div className="flight-footer__note">
            <span>{t('footer.cabinNote', 'Cabin note')}</span>
            <p>
              {t('footer.tagline')}
            </p>
            <p>
              {t('footer.affiliateDisclosure')}
            </p>
          </div>
        </div>
        <div className="flight-footer__bottom">
          <span>{t('footer.copyright')} · v{__APP_VERSION__}</span>
          <span>CF 001 · {t('footer.status', 'Cleared for takeoff')}</span>
        </div>
      </div>
    </footer>
  )
}
