import { useTranslation } from 'react-i18next'
import { useHead } from '../hooks/useHead'
import { useLanguage } from '../hooks/useLanguage'
import HeroSection from '../sections/HeroSection'
import VisionSection from '../sections/VisionSection'
import FeaturesSection from '../sections/FeaturesSection'
import QuoteSection from '../sections/QuoteSection'
import NewsletterSection from '../sections/NewsletterSection'
import CTASection from '../sections/CTASection'

export default function HomePage() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()

  useHead({
    title: t('meta.home.title'),
    description: t('meta.home.description'),
    canonical: `https://canfly.ai${localePath('/')}`,
    ogImage: 'https://canfly.ai/og-image.png',
    ogType: 'website',
  })

  return (
    <div className="bg-black text-white">
      <HeroSection />
      <VisionSection />
      <FeaturesSection />
      <QuoteSection />
      <NewsletterSection />
      <CTASection />
    </div>
  )
}
