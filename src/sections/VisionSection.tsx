import { useFadeIn } from '../hooks/useFadeIn'
import { useTranslation } from 'react-i18next'

export default function VisionSection() {
  const ref = useFadeIn()
  const { t } = useTranslation()

  return (
    <section className="home-section home-manifest">
      <div className="home-manifest__cloud-line" aria-hidden="true" />
      <div ref={ref} className="fade-section home-manifest__panel">
        <header className="home-section__header">
          <p className="flight-eyebrow stagger-child stagger-1">{t('vision.eyebrow')}</p>
          <h2 className="stagger-child stagger-2">
            {t('vision.headingLine1')}
            <br />
            {t('vision.headingLine2')}{' '}
            <span>{t('vision.headingHighlight')}</span>
          </h2>
          <p className="home-section__lead stagger-child stagger-3">{t('vision.nameOrigin')}</p>
        </header>

        <div className="home-manifest__columns">
          <div className="stagger-child stagger-3">
            <span>01 · {t('vision.eyebrow')}</span>
            <p>{t('vision.descLeft1')}</p>
            <p>{t('vision.descLeft2')}</p>
          </div>
          <div className="stagger-child stagger-4">
            <span>02 · CANFLY</span>
            <p>{t('vision.descRight1')}</p>
            <p>{t('vision.descRight2')}</p>
          </div>
        </div>

        <div className="home-instruments">
          <div className="stagger-child stagger-3">
            <span>
              {t('vision.stat1Value')}
            </span>
            <p>{t('vision.stat1Label')}</p>
          </div>
          <div className="stagger-child stagger-4">
            <span>
              {t('vision.stat2Value')}
            </span>
            <p>{t('vision.stat2Label')}</p>
          </div>
          <div className="stagger-child stagger-5">
            <span>
              {t('vision.stat3Value')}
            </span>
            <p>{t('vision.stat3Label')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
