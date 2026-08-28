import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../i18n'
import LegalPage from './LegalPage'

vi.mock('../components/Navbar', () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}))

vi.mock('../hooks/useLanguage', () => ({
  useLanguage: () => ({
    localePath: (path: string) => path,
    currentLang: 'en',
    switchLang: vi.fn(),
  }),
}))

function visibleText(container: HTMLElement): string {
  return (container.textContent || '').replace(/\s+/g, ' ').trim()
}

describe('LegalPage', () => {
  for (const page of ['about', 'contact', 'privacy', 'developers'] as const) {
    it(`renders ${page} with an H1 and 500+ characters`, () => {
      const { container } = render(
        <MemoryRouter>
          <LegalPage page={page} />
        </MemoryRouter>,
      )
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(visibleText(container).length).toBeGreaterThan(500)
    })
  }

  it('names CanFly on the developers page', () => {
    render(
      <MemoryRouter>
        <LegalPage page="developers" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/CanFly/)
    expect(screen.getByText('https://canfly.ai/api/openapi.json')).toBeInTheDocument()
  })
})
