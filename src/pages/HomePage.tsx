import HeroSection from '../sections/HeroSection'
import VisionSection from '../sections/VisionSection'
import FeaturesSection from '../sections/FeaturesSection'
import QuoteSection from '../sections/QuoteSection'
import NewsletterSection from '../sections/NewsletterSection'
import CTASection from '../sections/CTASection'

export default function HomePage() {
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
