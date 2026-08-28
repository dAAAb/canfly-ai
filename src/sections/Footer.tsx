import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import { isUserSubdomain } from '../utils/subdomain'

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
    <footer className="border-t border-white/8 bg-black">
      <div className="mx-auto max-w-5xl px-[6%] py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <p className="text-lg font-bold tracking-tight text-white">CanFly.ai</p>
            <p className="mt-3 text-sm leading-relaxed text-white/50">
              {t('footer.brandLine')}
            </p>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {t('footer.explore')}
            </p>
            <nav className="flex flex-col gap-2">
              {explore.map((item) =>
                onUserHost ? (
                  <a
                    key={item.to}
                    href={`${mainBase}${item.to}`}
                    className="text-sm text-white/55 transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="text-sm text-white/55 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {t('footer.company')}
            </p>
            <nav className="flex flex-col gap-2">
              {company.map((item) =>
                onUserHost ? (
                  <a
                    key={item.to}
                    href={`${mainBase}${item.to}`}
                    className="text-sm text-white/55 transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="text-sm text-white/55 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
          <div>
            <p className="text-sm leading-relaxed text-white/45">
              {t('footer.tagline')} 🦞
            </p>
            <p className="mt-4 text-xs leading-relaxed text-white/30">
              {t('footer.affiliateDisclosure')}
            </p>
          </div>
        </div>
        <div className="mt-10 border-t border-white/6 pt-6 text-xs text-white/30">
          {t('footer.copyright')} · v{__APP_VERSION__}
        </div>
      </div>
    </footer>
  )
}
