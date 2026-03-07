import Presentation from './components/Presentation'
import CoverSlide from './slides/CoverSlide'
import VisionSlide from './slides/VisionSlide'
import FeaturesSlide from './slides/FeaturesSlide'
import QuoteSlide from './slides/QuoteSlide'
import OutroSlide from './slides/OutroSlide'

function App() {
  return (
    <Presentation
      slides={[
        <CoverSlide />,
        <VisionSlide />,
        <FeaturesSlide />,
        <QuoteSlide />,
        <OutroSlide />,
      ]}
    />
  )
}

export default App
