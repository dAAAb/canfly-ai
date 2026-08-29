import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import BoardingGate, { boardingProgress } from './BoardingGate'

describe('boardingProgress', () => {
  it('clamps progress to the scanner track', () => {
    expect(boardingProgress(-20, 100)).toBe(0)
    expect(boardingProgress(62, 100)).toBe(0.62)
    expect(boardingProgress(140, 100)).toBe(1)
    expect(boardingProgress(20, 0)).toBe(0)
  })
})

describe('BoardingGate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('boards by keyboard and restores document scrolling', () => {
    vi.useFakeTimers()
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const onBoarded = vi.fn()
    const { unmount } = render(<BoardingGate onBoarded={onBoarded} />)

    expect(document.documentElement.style.overflowY).toBe('hidden')

    fireEvent.keyDown(
      screen.getByRole('button', { name: /slide boarding pass right/i }),
      { key: 'Enter' },
    )

    expect(screen.getByText('Boarding accepted')).toBeInTheDocument()
    expect(onBoarded).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1_180)
    })

    expect(onBoarded).toHaveBeenCalledOnce()
    unmount()
    expect(document.documentElement.style.overflowY).toBe('')
    scrollTo.mockRestore()
  })

  it('offers a visible non-drag fallback', () => {
    vi.useFakeTimers()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const onBoarded = vi.fn()
    const { unmount } = render(<BoardingGate onBoarded={onBoarded} />)

    fireEvent.click(screen.getByRole('button', { name: 'Enter cabin' }))
    act(() => {
      vi.advanceTimersByTime(1_180)
    })

    expect(onBoarded).toHaveBeenCalledOnce()
    unmount()
    vi.mocked(window.scrollTo).mockRestore()
  })
})
