import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import '../i18n'
import HeroSection from './HeroSection'

vi.mock('../hooks/useLanguage', () => ({
  useLanguage: () => ({
    localePath: (path: string) => path,
  }),
}))

vi.mock('../utils/analytics', () => ({
  trackCTAClick: vi.fn(),
}))

describe('HeroSection window shade', () => {
  it('keeps the shade inside the clipped aperture and the bezel above it', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>,
    )

    const windowFrame = container.querySelector('.cabin-window')
    const aperture = container.querySelector('.cabin-window__inner')
    const shade = container.querySelector('.cabin-window__shade')
    const bezel = container.querySelector('.cabin-window__bezel')
    const toggle = screen.getByRole('button', { name: 'Close window shade' })

    expect(aperture).toContainElement(shade)
    expect(aperture).not.toContainElement(bezel)
    expect(aperture).not.toContainElement(toggle)
    expect(windowFrame).toContainElement(aperture)
    expect(windowFrame).toContainElement(bezel)
    expect(windowFrame).toContainElement(toggle)
  })

  it('toggles the closed cabin state', () => {
    const { container } = render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Close window shade' }))

    expect(container.querySelector('.cabin-hero')).toHaveClass('cabin-hero--shade-closed')
    expect(screen.getByRole('button', { name: 'Open window shade' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
