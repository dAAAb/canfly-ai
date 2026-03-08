import { useFadeIn } from '../hooks/useFadeIn'
import { useTranslation } from 'react-i18next'

export default function VisionSection() {
  const ref = useFadeIn()
  const { t } = useTranslation()

  return (
    <section className="relative py-36 md:py-52" style={{ paddingLeft: '8%', paddingRight: '8%' }}>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950 to-black" />

      <div
        ref={ref}
        className="fade-section relative z-10"
        style={{ maxWidth: '1024px', marginLeft: 'auto', marginRight: 'auto' }}
      >
        {/* Eyebrow */}
        <p
          className="text-cyan-400 font-semibold uppercase tracking-widest stagger-child stagger-1"
          style={{ fontSize: 'clamp(11px, 1vw, 14px)', textAlign: 'center', marginBottom: '2rem' }}
        >
          {t('vision.eyebrow')}
        </p>

        {/* Big heading */}
        <h2
          className="font-bold stagger-child stagger-2"
          style={{
            fontSize: 'clamp(32px, 5vw, 80px)',
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            textAlign: 'center',
          }}
        >
          {t('vision.headingLine1')}
          <br />
          {t('vision.headingLine2')}{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {t('vision.headingHighlight')}
          </span>
        </h2>

        {/* Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-14 md:gap-20" style={{ marginTop: 'clamp(48px, 5vw, 80px)' }}>
          <div className="stagger-child stagger-3">
            <p style={{ fontSize: 'clamp(16px, 1.4vw, 22px)', lineHeight: 1.75, opacity: 0.8 }}>
              {t('vision.descLeft1')}
            </p>
            <p style={{ fontSize: 'clamp(16px, 1.4vw, 22px)', lineHeight: 1.75, opacity: 0.8, marginTop: '2rem' }}>
              {t('vision.descLeft2')}
            </p>
          </div>

          <div className="stagger-child stagger-4">
            <p style={{ fontSize: 'clamp(16px, 1.4vw, 22px)', lineHeight: 1.75, opacity: 0.8 }}>
              {t('vision.descRight1')}
            </p>
            <p style={{ fontSize: 'clamp(16px, 1.4vw, 22px)', lineHeight: 1.75, opacity: 0.8, marginTop: '2rem' }}>
              {t('vision.descRight2')}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-6 md:gap-12" style={{ marginTop: 'clamp(64px, 7vw, 112px)', textAlign: 'center' }}>
          <div className="stagger-child stagger-3">
            <span
              className="font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent block"
              style={{ fontSize: 'clamp(36px, 5vw, 72px)' }}
            >
              {t('vision.stat1Value')}
            </span>
            <p style={{ fontSize: 'clamp(13px, 1vw, 18px)', lineHeight: 1.6, opacity: 0.6, marginTop: '0.75rem' }}>
              {t('vision.stat1Label')}
            </p>
          </div>
          <div className="stagger-child stagger-4">
            <span
              className="font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent block"
              style={{ fontSize: 'clamp(36px, 5vw, 72px)' }}
            >
              {t('vision.stat2Value')}
            </span>
            <p style={{ fontSize: 'clamp(13px, 1vw, 18px)', lineHeight: 1.6, opacity: 0.6, marginTop: '0.75rem' }}>
              {t('vision.stat2Label')}
            </p>
          </div>
          <div className="stagger-child stagger-5">
            <span
              className="font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent block"
              style={{ fontSize: 'clamp(36px, 5vw, 72px)' }}
            >
              {t('vision.stat3Value')}
            </span>
            <p style={{ fontSize: 'clamp(13px, 1vw, 18px)', lineHeight: 1.6, opacity: 0.6, marginTop: '0.75rem' }}>
              {t('vision.stat3Label')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
