import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import {
  setSkipBoardingPreference,
  shouldSkipBoarding,
} from '../utils/boardingPreference'
import HomePage from './HomePage'

vi.mock('../hooks/useHead', () => ({
  useHead: vi.fn(),
}))

vi.mock('../hooks/useLanguage', () => ({
  useLanguage: () => ({
    localePath: (path: string) => path,
  }),
}))

vi.mock('../components/Navbar', () => ({
  default: () => <nav>Navbar</nav>,
}))

vi.mock('../sections/BoardingGate', () => ({
  default: ({
    onBoarded,
  }: {
    onBoarded: (skipNextTime: boolean) => void
  }) => (
    <button type="button" onClick={() => onBoarded(true)}>
      Boarding gate
    </button>
  ),
}))

vi.mock('../sections/HeroSection', () => ({
  default: () => <div>Cabin hero</div>,
}))
vi.mock('../components/LiveFeed', () => ({ default: () => null }))
vi.mock('../sections/VisionSection', () => ({ default: () => null }))
vi.mock('../sections/FeaturesSection', () => ({ default: () => null }))
vi.mock('../sections/AvatarSection', () => ({ default: () => null }))
vi.mock('../sections/QuoteSection', () => ({ default: () => null }))
vi.mock('../sections/NewsletterSection', () => ({ default: () => null }))
vi.mock('../sections/CTASection', () => ({ default: () => null }))

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage boarding preference', () => {
  afterEach(() => {
    setSkipBoardingPreference(false)
  })

  it('shows boarding once, then skips it after the preference is saved', () => {
    setSkipBoardingPreference(false)
    const firstVisit = renderHomePage()

    fireEvent.click(screen.getByRole('button', { name: 'Boarding gate' }))

    expect(shouldSkipBoarding()).toBe(true)
    expect(screen.queryByRole('button', { name: 'Boarding gate' })).not.toBeInTheDocument()
    expect(screen.getByText('Cabin hero')).toBeInTheDocument()

    firstVisit.unmount()
    renderHomePage()

    expect(screen.queryByRole('button', { name: 'Boarding gate' })).not.toBeInTheDocument()
    expect(screen.getByText('Cabin hero')).toBeInTheDocument()
  })

  it('shows boarding again after the preference is cleared', () => {
    setSkipBoardingPreference(true)
    setSkipBoardingPreference(false)
    renderHomePage()

    expect(screen.getByRole('button', { name: 'Boarding gate' })).toBeInTheDocument()
  })
})
