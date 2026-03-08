import { useVideoBackground } from '../hooks/useVideoBackground'
import { Link } from 'react-router-dom'
import { ArrowRight, PlayCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../hooks/useLanguage'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function HeroSection() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()
  const videoRef = useVideoBackground(
    'https://stream.mux.com/JNJEOYI6B3EffB9f5ZhpGbuxzc6gSyJcXaCBbCgZKRg.m3u8'
  )

  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
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
      <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between py-10" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
        <Link to={localePath('/')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-xl">🦞</span>
          <span className="font-bold text-xl tracking-tight">Canfly</span>
        </Link>
        <div className="flex items-center gap-6">
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
      </nav>

      {/* Content */}
      <div className="relative z-10 text-center max-w-5xl mx-auto" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
        <h1
          className="font-black tracking-tight"
          style={{
            fontSize: 'clamp(48px, 10vw, 140px)',
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
          className="mt-16 mx-auto opacity-80"
          style={{
            fontSize: 'clamp(18px, 2.5vw, 32px)',
            lineHeight: 1.5,
            textAlign: 'center',
            paddingTop: '30px',
          }}
        >
          {t('hero.subtitle').split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </p>

        {/* CTA Buttons */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
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
          <p>{t('hero.funnel')}</p>
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
