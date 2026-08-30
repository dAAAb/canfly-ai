import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import LanguageSwitcher from './LanguageSwitcher'
import AuthButton from './AuthButton'
import { Menu, X } from 'lucide-react'
import { isUserSubdomain } from '../utils/subdomain'
import FlightMark from './FlightMark'
import BoardingPreferenceToggle from './BoardingPreferenceToggle'

interface NavbarProps {
  search?: {
    value: string
    onChange: (val: string) => void
    placeholder?: string
  }
  children?: React.ReactNode
  variant?: 'default' | 'hero'
}

export default function Navbar({ search, children, variant = 'default' }: NavbarProps) {
  const { t } = useTranslation()
  const { localePath } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isSubdomain = isUserSubdomain(window.location.hostname)
  const mainBase = isSubdomain ? 'https://canfly.ai' : ''
  const navItems = [
    { path: '/apps', label: t('nav.browseApps') },
    { path: '/rankings', label: t('nav.rankings') },
    { path: '/community', label: t('nav.community') },
    { path: '/blog', label: t('nav.blog') },
  ]

  return (
    <header className={`flight-navbar flight-navbar--${variant}`}>
      <div className="flight-navbar__route" aria-hidden="true">
        <span>TPE</span>
        <i />
        <span>AI</span>
      </div>

      <div className="flight-navbar__inner">
        {isSubdomain ? (
          <a href="https://canfly.ai" className="flight-navbar__brand">
            <FlightMark />
            <span>CanFly.ai</span>
          </a>
        ) : (
          <Link to={localePath('/')} className="flight-navbar__brand">
            <FlightMark />
            <span>CanFly.ai</span>
          </Link>
        )}

        <nav className="flight-navbar__desktop" aria-label={t('nav.primary', 'Primary navigation')}>
          {search && (
            <label className="flight-navbar__search">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={search.placeholder || t('apps.searchPlaceholder')}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
              />
            </label>
          )}
          {children}
          <div className="flight-navbar__links">
            {navItems.map((item) =>
              isSubdomain ? (
                <a key={item.path} href={`${mainBase}${localePath(item.path)}`}>
                  {item.label}
                </a>
              ) : (
                <Link key={item.path} to={localePath(item.path)}>
                  {item.label}
                </Link>
              ),
            )}
            <a href={`${mainBase}/api/openapi.json`}>{t('nav.api')}</a>
          </div>
          <LanguageSwitcher />
          {isSubdomain ? (
            <a href="https://canfly.ai" className="flight-navbar__account">
              {t('auth.joinCommunity', 'Join Flight Community')}
            </a>
          ) : (
            <AuthButton />
          )}
          {isSubdomain ? (
            <a
              href={`${mainBase}${localePath('/apps/free/ollama')}`}
              className="flight-navbar__cta"
            >
              {t('nav.startFree')}
              <ArrowIcon />
            </a>
          ) : (
            <Link to={localePath('/apps/free/ollama')} className="flight-navbar__cta">
              {t('nav.startFree')}
              <ArrowIcon />
            </Link>
          )}
        </nav>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flight-navbar__menu"
          aria-label={t('nav.toggleMenu', 'Toggle menu')}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="flight-navbar__mobile" aria-label={t('nav.primary', 'Primary navigation')}>
          {search && (
            <label className="flight-navbar__search">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={search.placeholder || t('apps.searchPlaceholder')}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
              />
            </label>
          )}
          {children}
          {navItems.map((item) =>
            isSubdomain ? (
              <a key={item.path} href={`${mainBase}${localePath(item.path)}`}>
                {item.label}
              </a>
            ) : (
              <Link
                key={item.path}
                to={localePath(item.path)}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ),
          )}
          <a href={`${mainBase}/api/openapi.json`}>{t('nav.api')}</a>
          <LanguageSwitcher />
          {!isSubdomain && (
            <div className="flight-navbar__boarding-setting">
              <BoardingPreferenceToggle compact />
            </div>
          )}
          {isSubdomain ? (
            <a href="https://canfly.ai" className="flight-navbar__account">
              {t('auth.joinCommunity', 'Join Flight Community')}
            </a>
          ) : (
            <AuthButton />
          )}
          {isSubdomain ? (
            <a
              href={`${mainBase}${localePath('/apps/free/ollama')}`}
              className="flight-navbar__cta"
            >
              {t('nav.startFree')}
              <ArrowIcon />
            </a>
          ) : (
            <Link
              to={localePath('/apps/free/ollama')}
              onClick={() => setMobileOpen(false)}
              className="flight-navbar__cta"
            >
              {t('nav.startFree')}
              <ArrowIcon />
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8h9M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
