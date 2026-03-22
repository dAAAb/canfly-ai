import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import LanguageSwitcher from './LanguageSwitcher'
import AuthButton from './AuthButton'
import { Menu, X } from 'lucide-react'

interface NavbarProps {
  /** Show search box */
  search?: {
    value: string
    onChange: (val: string) => void
    placeholder?: string
  }
  /** Extra right-side elements */
  children?: React.ReactNode
}

export default function Navbar({ search, children }: NavbarProps) {
  const { t } = useTranslation()
  const { localePath } = useLanguage()
  const [mobileOpen, setMobileOpen] = useState(false)

  // On subdomains (e.g. daaab.canfly.ai), nav links should point to main domain
  const isSubdomain = (() => {
    const host = window.location.hostname.toLowerCase()
    const main = 'canfly.ai'
    return host.endsWith(`.${main}`) && host !== `www.${main}`
  })()
  const mainBase = isSubdomain ? 'https://canfly.ai' : ''

  return (
    <div className="border-b border-gray-800 bg-black/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to={localePath('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-xl">🦞</span>
          <span className="font-bold text-lg tracking-tight text-white">Canfly</span>
        </Link>

        {/* Desktop right side */}
        <div className="hidden sm:flex items-center gap-4">
          {search && (
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={search.placeholder || t('apps.searchPlaceholder')}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none w-56 text-sm"
              />
            </div>
          )}
          {children}
          {isSubdomain ? (
            <a href="https://canfly.ai" className="text-sm bg-sky-600/20 border border-sky-600 px-3 py-1.5 rounded-full hover:bg-sky-600/30 transition-all text-sky-400">{t('auth.joinCommunity', 'Join Flight Community')}</a>
          ) : (
            <AuthButton />
          )}
          {isSubdomain ? (
            <>
              <a href={`${mainBase}${localePath('/apps')}`} className="text-sm text-gray-400 hover:text-white transition-colors">{t('nav.browseApps')}</a>
              <a href={`${mainBase}${localePath('/rankings')}`} className="text-sm text-gray-400 hover:text-white transition-colors">{t('nav.rankings')}</a>
              <a href={`${mainBase}${localePath('/community')}`} className="text-sm text-gray-400 hover:text-white transition-colors">{t('nav.community')}</a>
              <LanguageSwitcher />
              <a href={`${mainBase}${localePath('/apps/free/ollama')}`} className="text-sm bg-green-600/20 border border-green-600 px-3 py-1.5 rounded-full hover:bg-green-600/30 transition-all text-green-400 hover:shadow-[0_0_16px_rgba(34,197,94,0.3)]">{t('nav.startFree')}</a>
            </>
          ) : (
            <>
              <Link to={localePath('/apps')} className="text-sm text-gray-400 hover:text-white transition-colors">{t('nav.browseApps')}</Link>
              <Link to={localePath('/rankings')} className="text-sm text-gray-400 hover:text-white transition-colors">{t('nav.rankings')}</Link>
              <Link to={localePath('/community')} className="text-sm text-gray-400 hover:text-white transition-colors">{t('nav.community')}</Link>
              <LanguageSwitcher />
              <Link to={localePath('/apps/free/ollama')} className="text-sm bg-green-600/20 border border-green-600 px-3 py-1.5 rounded-full hover:bg-green-600/30 transition-all text-green-400 hover:shadow-[0_0_16px_rgba(34,197,94,0.3)]">{t('nav.startFree')}</Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="sm:hidden p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-800 bg-black/95 backdrop-blur-md px-6 py-4 space-y-4">
          {search && (
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={search.placeholder || t('apps.searchPlaceholder')}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
          )}
          {children}
          {isSubdomain ? (
            <a href="https://canfly.ai" className="text-sm bg-sky-600/20 border border-sky-600 px-3 py-1.5 rounded-full hover:bg-sky-600/30 transition-all text-sky-400">{t('auth.joinCommunity', 'Join Flight Community')}</a>
          ) : (
            <AuthButton />
          )}
          {isSubdomain ? (
            <>
              <a href={`${mainBase}${localePath('/apps')}`} className="block text-sm text-gray-400 hover:text-white transition-colors">{t('nav.browseApps')}</a>
              <a href={`${mainBase}${localePath('/rankings')}`} className="block text-sm text-gray-400 hover:text-white transition-colors">{t('nav.rankings')}</a>
              <a href={`${mainBase}${localePath('/community')}`} className="block text-sm text-gray-400 hover:text-white transition-colors">{t('nav.community')}</a>
              <LanguageSwitcher />
              <a href={`${mainBase}${localePath('/apps/free/ollama')}`} className="inline-block text-sm bg-green-600/20 border border-green-600 px-3 py-1.5 rounded-full hover:bg-green-600/30 transition-all text-green-400">{t('nav.startFree')}</a>
            </>
          ) : (
            <>
              <Link to={localePath('/apps')} onClick={() => setMobileOpen(false)} className="block text-sm text-gray-400 hover:text-white transition-colors">{t('nav.browseApps')}</Link>
              <Link to={localePath('/rankings')} onClick={() => setMobileOpen(false)} className="block text-sm text-gray-400 hover:text-white transition-colors">{t('nav.rankings')}</Link>
              <Link to={localePath('/community')} onClick={() => setMobileOpen(false)} className="block text-sm text-gray-400 hover:text-white transition-colors">{t('nav.community')}</Link>
              <LanguageSwitcher />
              <Link to={localePath('/apps/free/ollama')} onClick={() => setMobileOpen(false)} className="inline-block text-sm bg-green-600/20 border border-green-600 px-3 py-1.5 rounded-full hover:bg-green-600/30 transition-all text-green-400">{t('nav.startFree')}</Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
