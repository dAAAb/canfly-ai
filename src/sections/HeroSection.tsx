import { useState } from 'react'
import { useVideoBackground } from '../hooks/useVideoBackground'
import { Link } from 'react-router-dom'
import { ArrowRight, PlayCircle, Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function HeroSection() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const videoRef = useVideoBackground(
    'https://stream.mux.com/JNJEOYI6B3EffB9f5ZhpGbuxzc6gSyJcXaCBbCgZKRg.m3u8'
  )

  return (
    <section className="relative min-h-[100dvh] w-full overflow-x-hidden flex items-center justify-center">
      {/* Video background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-black/50" />

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between py-6 sm:py-10" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
        <Link to={localePath('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-xl">🦞</span>
          <span className="font-bold text-xl tracking-tight">Canfly</span>
        </Link>
        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-6">
          <Link to={localePath('/apps')} className="text-sm text-gray-300 hover:text-white transition-colors">
            {t('nav.browseApps')}
          </Link>
          <LanguageSwitcher />
          <Link
            to={localePath('/apps/ollama')}
            className="text-sm bg-green-600/20 border border-green-600 px-3 py-1 rounded-full hover:bg-green-600/30 transition-colors"
          >
            {t('nav.startFree')}
          </Link>
        </div>
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="sm:hidden p-2 text-gray-300 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>
      {/* Mobile dropdown */}
      {mobileNavOpen && (
        <div className="absolute top-16 left-0 right-0 z-20 bg-black/90 backdrop-blur-md border-b border-gray-800 px-[8%] py-4 sm:hidden space-y-3">
          <Link to={localePath('/apps')} onClick={() => setMobileNavOpen(false)} className="block text-sm text-gray-300 hover:text-white transition-colors">
            {t('nav.browseApps')}
          </Link>
          <LanguageSwitcher />
          <Link
            to={localePath('/apps/ollama')}
            onClick={() => setMobileNavOpen(false)}
            className="inline-block text-sm bg-green-600/20 border border-green-600 px-3 py-1 rounded-full hover:bg-green-600/30 transition-colors"
          >
            {t('nav.startFree')}
          </Link>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 text-center max-w-5xl mx-auto pt-28 pb-20" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
        <h1
          className="font-black tracking-tight"
          style={{
            fontSize: 'clamp(40px, 8vw, 120px)',
            lineHeight: 1.0,
            letterSpacing: '-0.03em',
          }}
        >
          {t('hero.titleLine1')}
          <br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
            {t('hero.titleLine2')}
          </span>
        </h1>

        <p
          className="mt-8 mx-auto opacity-80"
          style={{
            fontSize: 'clamp(16px, 2vw, 28px)',
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          {t('hero.subtitle').split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to={localePath('/apps/ollama')}
            className="group flex items-center gap-3 bg-green-600 hover:bg-green-700 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-105 cta-glow"
          >
            <PlayCircle className="w-6 h-6" />
            {t('hero.ctaFree')}
            <span className="text-sm opacity-80">{t('hero.ctaFreeTag')}</span>
          </Link>

          <Link
            to={localePath('/apps')}
            className="group flex items-center gap-3 bg-white/10 border border-white/20 backdrop-blur-sm px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-105 hover:bg-white/15"
          >
            {t('hero.ctaBrowse')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-300">
          <p className="mb-4 text-xs uppercase tracking-widest opacity-60">{t('hero.funnel')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch max-w-3xl mx-auto">
            <Link
              to={localePath('/apps/ollama')}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 hover:bg-white/10 transition-colors text-left"
            >
              <span className="text-green-400 font-semibold text-sm">{t('hero.funnelStep1')}</span>
              <span className="block text-xs text-gray-400 mt-1">{t('hero.funnelStep1Desc')}</span>
            </Link>
            <span className="hidden sm:flex items-center text-gray-500">→</span>
            <Link
              to={localePath('/learn/zeabur')}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 hover:bg-white/10 transition-colors text-left"
            >
              <span className="text-blue-400 font-semibold text-sm">{t('hero.funnelStep2')}</span>
              <span className="block text-xs text-gray-400 mt-1">{t('hero.funnelStep2Desc')}</span>
            </Link>
            <span className="hidden sm:flex items-center text-gray-500">→</span>
            <Link
              to={localePath('/apps') + '?category=skills'}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 hover:bg-white/10 transition-colors text-left"
            >
              <span className="text-purple-400 font-semibold text-sm">{t('hero.funnelStep3')}</span>
              <span className="block text-xs text-gray-400 mt-1">{t('hero.funnelStep3Desc')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center opacity-40 animate-bounce">
        <span className="text-xs tracking-widest uppercase mb-2">{t('hero.scroll')}</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  )
}
