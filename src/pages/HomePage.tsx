import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useHead } from '../hooks/useHead'
import { useLanguage } from '../hooks/useLanguage'
import Navbar from '../components/Navbar'
import BoardingGate from '../sections/BoardingGate'
import HeroSection from '../sections/HeroSection'
import VisionSection from '../sections/VisionSection'
import FeaturesSection from '../sections/FeaturesSection'
import QuoteSection from '../sections/QuoteSection'
import AvatarSection from '../sections/AvatarSection'
import NewsletterSection from '../sections/NewsletterSection'
import CTASection from '../sections/CTASection'
import LiveFeed from '../components/LiveFeed'
import {
  setSkipBoardingPreference,
  shouldSkipBoarding,
} from '../utils/boardingPreference'

export default function HomePage() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()
  const [boarded, setBoarded] = useState(shouldSkipBoarding)

  function completeBoarding(skipNextTime: boolean) {
    setSkipBoardingPreference(skipNextTime)
    setBoarded(true)
  }

  useHead({
    title: t('meta.home.title'),
    description: t('meta.home.description'),
    canonical: `https://canfly.ai${localePath('/')}`,
    ogImage: 'https://canfly.ai/og-image.webp',
    ogType: 'website',
  })

  return (
    <div className={`site-home ${boarded ? 'site-home--boarded' : ''}`}>
      {!boarded && <BoardingGate onBoarded={completeBoarding} />}

      <div className="site-home__cabin" aria-hidden={!boarded} inert={!boarded}>
        <Navbar variant="hero" />
        <main>
          <HeroSection />
          <LiveFeed />
          <VisionSection />
          <FeaturesSection />
          <AvatarSection />
          <QuoteSection />
          <NewsletterSection />
          <CTASection />
        </main>
      </div>
    </div>
  )
}
