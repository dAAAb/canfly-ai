import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '../i18n'
import BoardingGate from './BoardingGate'
import { boardingProgress } from './BoardingGate.logic'

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
    expect(onBoarded).toHaveBeenCalledWith(true)
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

  it('boards when the visitor scrolls down on the gate', () => {
    vi.useFakeTimers()
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const onBoarded = vi.fn()
    const { container, unmount } = render(<BoardingGate onBoarded={onBoarded} />)
    const gate = container.querySelector('.boarding-gate')

    expect(gate).not.toBeNull()
    if (!gate) throw new Error('boarding gate not rendered')
    fireEvent.wheel(gate, { deltaY: 60 })
    expect(screen.getByText('Ready to scan')).toBeInTheDocument()
    fireEvent.wheel(gate, { deltaY: 60 })
    expect(screen.getByText('Boarding accepted')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1_180)
    })

    expect(onBoarded).toHaveBeenCalledOnce()
    unmount()
    scrollTo.mockRestore()
  })

  it('boards when a mobile visitor swipes upward on empty gate space', () => {
    vi.useFakeTimers()
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const onBoarded = vi.fn()
    const { container, unmount } = render(<BoardingGate onBoarded={onBoarded} />)
    const gate = container.querySelector('.boarding-gate')

    if (!gate) throw new Error('boarding gate not rendered')

    fireEvent.touchStart(gate, { touches: [{ clientY: 500 }] })
    fireEvent.touchMove(gate, { touches: [{ clientY: 440 }] })
    fireEvent.touchEnd(gate)
    expect(screen.getByText('Ready to scan')).toBeInTheDocument()

    fireEvent.touchStart(gate, { touches: [{ clientY: 500 }] })
    fireEvent.touchMove(gate, { touches: [{ clientY: 440 }] })
    expect(screen.getByText('Boarding accepted')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1_180)
    })

    expect(onBoarded).toHaveBeenCalledOnce()
    unmount()
    scrollTo.mockRestore()
  })

  it('does not save the skip preference when the switch is turned off', () => {
    vi.useFakeTimers()
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const onBoarded = vi.fn()
    const { unmount } = render(<BoardingGate onBoarded={onBoarded} />)

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Skip boarding next time' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Enter cabin' }))

    act(() => {
      vi.advanceTimersByTime(1_180)
    })

    expect(onBoarded).toHaveBeenCalledWith(false)
    unmount()
    scrollTo.mockRestore()
  })
})
