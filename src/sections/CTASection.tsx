import { useFadeIn } from '../hooks/useFadeIn'
import { Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export default function CTASection() {
  const ref = useFadeIn()
  const { t } = useTranslation()

  return (
    <section
      className="relative"
      style={{ paddingLeft: '8%', paddingRight: '8%', paddingTop: '12vh', paddingBottom: '14vh' }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />

      <div
        ref={ref}
        className="fade-section relative z-10"
        style={{ maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}
      >
        <h2
          className="font-bold stagger-child stagger-1"
          style={{
            fontSize: 'clamp(36px, 6vw, 96px)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
          }}
        >
          {t('cta.headingLine1')}
          <br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
            {t('cta.headingHighlight')}
          </span>
        </h2>

        <p
          className="stagger-child stagger-2"
          style={{
            fontSize: 'clamp(16px, 1.5vw, 24px)',
            lineHeight: 1.7,
            opacity: 0.7,
            maxWidth: '560px',
            marginLeft: 'auto',
            marginRight: 'auto',
            marginTop: 'clamp(24px, 3vw, 48px)',
          }}
        >
          {t('cta.desc').split('\n').map((line, i) => (
            <span key={i}>{line}{i === 0 && <br />}</span>
          ))}
        </p>

        {/* CTA buttons */}
        <div
          className="stagger-child stagger-3"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 'clamp(16px, 2vw, 24px)',
            marginTop: 'clamp(32px, 4vw, 64px)',
          }}
        >
          <a
            href="mailto:hi@canfly.ai"
            className="inline-flex items-center gap-4 rounded-2xl no-underline text-white transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)',
              padding: 'clamp(16px, 2vw, 24px) clamp(28px, 3vw, 44px)',
            }}
          >
            <Mail className="w-5 h-5 opacity-70 flex-shrink-0" />
            <span style={{ fontSize: 'clamp(15px, 1.2vw, 20px)' }}>hi@canfly.ai</span>
          </a>

          <a
            href="https://x.com/dAAAb"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-4 rounded-2xl no-underline text-white transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)',
              padding: 'clamp(16px, 2vw, 24px) clamp(28px, 3vw, 44px)',
            }}
          >
            <XIcon />
            <span style={{ fontSize: 'clamp(15px, 1.2vw, 20px)' }}>{t('cta.followX')}</span>
          </a>
        </div>
      </div>
    </section>
  )
}
