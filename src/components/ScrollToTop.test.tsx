import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScrollToTop from './ScrollToTop'

describe('ScrollToTop', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('scrolls to top when the pathname changes', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    render(
      <MemoryRouter initialEntries={['/apps/hardware/mac-mini-m4']}>
        <ScrollToTop />
        <Routes>
          <Route
            path="/apps/hardware/mac-mini-m4"
            element={<Link to="/learn/mac-mini-m4">Start Free Tutorial</Link>}
          />
          <Route path="/learn/mac-mini-m4" element={<h1>Tutorial</h1>} />
        </Routes>
      </MemoryRouter>,
    )

    scrollTo.mockClear()
    fireEvent.click(screen.getByText('Start Free Tutorial'))

    expect(screen.getByText('Tutorial')).toBeInTheDocument()
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('scrolls the hash target into view when present', () => {
    const el = document.createElement('div')
    el.id = 'faq'
    el.scrollIntoView = vi.fn()
    document.body.appendChild(el)
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    render(
      <MemoryRouter initialEntries={['/learn/mac-mini-m4#faq']}>
        <ScrollToTop />
        <p>page</p>
      </MemoryRouter>,
    )

    expect(el.scrollIntoView).toHaveBeenCalled()
    expect(scrollTo).not.toHaveBeenCalled()
    el.remove()
  })
})
