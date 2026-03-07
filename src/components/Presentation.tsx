import { useState, useEffect, useCallback, useRef, ReactElement } from 'react'
import { ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react'

interface PresentationProps {
  slides: ReactElement[]
}

export default function Presentation({ slides }: PresentationProps) {
  const [current, setCurrent] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const scrollAccum = useRef(0)
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>()
  const total = slides.length

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= total || transitioning) return
      setTransitioning(true)
      setCurrent(index)
      setTimeout(() => setTransitioning(false), 600)
    },
    [total, transitioning]
  )

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          prev()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen()
            setIsFullscreen(false)
          }
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev, toggleFullscreen])

  // Scroll (wheel) navigation — accumulate delta then trigger
  useEffect(() => {
    const THRESHOLD = 80

    const handler = (e: WheelEvent) => {
      e.preventDefault()

      scrollAccum.current += e.deltaY

      // Reset accumulator after idle
      clearTimeout(scrollTimeout.current)
      scrollTimeout.current = setTimeout(() => {
        scrollAccum.current = 0
      }, 200)

      if (scrollAccum.current > THRESHOLD) {
        scrollAccum.current = 0
        next()
      } else if (scrollAccum.current < -THRESHOLD) {
        scrollAccum.current = 0
        prev()
      }
    }

    window.addEventListener('wheel', handler, { passive: false })
    return () => window.removeEventListener('wheel', handler)
  }, [next, prev])

  // Auto-hide controls
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const handleMove = () => {
      setShowControls(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => setShowControls(false), 3000)
    }
    window.addEventListener('mousemove', handleMove)
    handleMove()
    return () => {
      window.removeEventListener('mousemove', handleMove)
      clearTimeout(timeout)
    }
  }, [])

  // Touch swipe (horizontal + vertical)
  useEffect(() => {
    let startX = 0
    let startY = 0
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }
    const onEnd = (e: TouchEvent) => {
      const dx = startX - e.changedTouches[0].clientX
      const dy = startY - e.changedTouches[0].clientY
      // Use whichever axis has more movement
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)
      const threshold = 50

      if (absDx > threshold || absDy > threshold) {
        // Determine primary direction
        if (absDy >= absDx) {
          // Vertical swipe: swipe up = next, swipe down = prev
          dy > 0 ? next() : prev()
        } else {
          // Horizontal swipe: swipe left = next, swipe right = prev
          dx > 0 ? next() : prev()
        }
      }
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  }, [next, prev])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Slides */}
      {slides.map((slide, i) => {
        const offset = i - current
        return (
          <div
            key={i}
            className="absolute inset-0 transition-all duration-500 ease-in-out"
            style={{
              opacity: offset === 0 ? 1 : 0,
              transform: `scale(${offset === 0 ? 1 : offset < 0 ? 0.95 : 1.05})`,
              pointerEvents: offset === 0 ? 'auto' : 'none',
              zIndex: offset === 0 ? 1 : 0,
            }}
          >
            {slide}
          </div>
        )
      })}

      {/* Controls */}
      <div
        className="absolute inset-x-0 bottom-0 z-50 transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        {/* Keyboard hint */}
        <div
          className="absolute top-0 right-0 -translate-y-full pr-[8%] pb-3"
          style={{ fontSize: 'clamp(9px, 0.85vw, 13px)', opacity: 0.35 }}
        >
          ← → ↑ ↓ Scroll · F Fullscreen
        </div>

        <div className="flex items-center justify-between px-[8%] pb-[3%] pt-[1.5%]">
          {/* Slide counter */}
          <span
            className="tabular-nums"
            style={{ fontSize: 'clamp(11px, 1vw, 15px)', opacity: 0.5 }}
          >
            {current + 1} / {total}
          </span>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="transition-all duration-300 rounded-full cursor-pointer"
                style={{
                  width: i === current ? 24 : 6,
                  height: 6,
                  backgroundColor: i === current ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={prev}
              className="p-1.5 rounded-lg transition-all cursor-pointer hover:bg-white/10"
              style={{ opacity: current === 0 ? 0.2 : 0.5 }}
              disabled={current === 0}
            >
              <ChevronLeft style={{ width: 'clamp(16px, 1.5vw, 22px)', height: 'clamp(16px, 1.5vw, 22px)' }} />
            </button>
            <button
              onClick={next}
              className="p-1.5 rounded-lg transition-all cursor-pointer hover:bg-white/10"
              style={{ opacity: current === total - 1 ? 0.2 : 0.5 }}
              disabled={current === total - 1}
            >
              <ChevronRight style={{ width: 'clamp(16px, 1.5vw, 22px)', height: 'clamp(16px, 1.5vw, 22px)' }} />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg transition-all cursor-pointer hover:bg-white/10"
              style={{ opacity: 0.5 }}
            >
              {isFullscreen ? (
                <Minimize style={{ width: 'clamp(14px, 1.3vw, 20px)', height: 'clamp(14px, 1.3vw, 20px)' }} />
              ) : (
                <Maximize style={{ width: 'clamp(14px, 1.3vw, 20px)', height: 'clamp(14px, 1.3vw, 20px)' }} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
