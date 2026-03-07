import { useFadeIn } from '../hooks/useFadeIn'
import { useVideoBackground } from '../hooks/useVideoBackground'
import { useTranslation } from 'react-i18next'

export default function QuoteSection() {
  const ref = useFadeIn()
  const { t } = useTranslation()
  const videoRef = useVideoBackground(
    'https://stream.mux.com/4IMYGcL01xjs7ek5ANO17JC4VQVUTsojZlnw4fXzwSxc.m3u8'
  )

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-black/60" />

      <div ref={ref} className="fade-section relative z-10 text-center py-40 max-w-5xl mx-auto" style={{ paddingLeft: '10%', paddingRight: '10%' }}>
        <blockquote
          className="font-bold stagger-child stagger-1"
          style={{
            fontSize: 'clamp(28px, 5vw, 80px)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          <span className="opacity-30">&ldquo;</span>
          {t('quote.line1')}
          <br />
          {t('quote.line2')}
          <br />
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {t('quote.line3')}
          </span>
          <span className="opacity-30">&rdquo;</span>
        </blockquote>

        <p
          className="mt-12 opacity-50 stagger-child stagger-2"
          style={{ fontSize: 'clamp(14px, 1.2vw, 20px)' }}
        >
          🦞 {t('quote.attribution')}
        </p>
      </div>
    </section>
  )
}
