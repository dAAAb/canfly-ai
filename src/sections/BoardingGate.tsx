import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type TouchEvent,
  type WheelEvent,
} from 'react'
import { ArrowRight, Check, ScanLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import FlightMark from '../components/FlightMark'
import { BoardingPreferenceSwitch } from '../components/BoardingPreferenceToggle'
import { boardingProgress } from './BoardingGate.logic'

type BoardingPhase = 'ready' | 'dragging' | 'scanning' | 'departing'

interface BoardingGateProps {
  onBoarded: (skipNextTime: boolean) => void
}

const ACCEPT_THRESHOLD = 0.62
const SCROLL_BOARDING_THRESHOLD = 120
const SCAN_DURATION_MS = 420
const DEPARTURE_DURATION_MS = 760

export default function BoardingGate({ onBoarded }: BoardingGateProps) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<BoardingPhase>('ready')
  const [offset, setOffset] = useState(0)
  const [progress, setProgress] = useState(0)
  const [skipNextTime, setSkipNextTime] = useState(true)
  const offsetRef = useRef(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const passRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef(0)
  const startOffsetRef = useRef(0)
  const wheelTravelRef = useRef(0)
  const touchStartYRef = useRef<number | null>(null)
  const touchStartTravelRef = useRef(0)
  const timersRef = useRef<number[]>([])

  const getTravel = useCallback(() => {
    const track = trackRef.current
    const pass = passRef.current
    if (!track || !pass) return 0
    return Math.max(0, track.clientWidth - pass.clientWidth - 18)
  }, [])

  const movePass = useCallback((nextOffset: number, travel: number) => {
    const nextProgress = boardingProgress(nextOffset, travel)
    const boundedOffset = travel * nextProgress
    offsetRef.current = boundedOffset
    setOffset(boundedOffset)
    setProgress(nextProgress)
  }, [])

  const beginBoarding = useCallback(() => {
    if (phase === 'scanning' || phase === 'departing') return

    const travel = getTravel()
    movePass(travel, travel)
    setPhase('scanning')

    const departTimer = window.setTimeout(() => {
      setPhase('departing')
    }, SCAN_DURATION_MS)
    const completeTimer = window.setTimeout(() => {
      onBoarded(skipNextTime)
    }, SCAN_DURATION_MS + DEPARTURE_DURATION_MS)

    timersRef.current.push(departTimer, completeTimer)
  }, [getTravel, movePass, onBoarded, phase, skipNextTime])

  useEffect(() => {
    const root = document.documentElement
    const previousOverflowY = root.style.overflowY
    const timers = timersRef.current
    window.scrollTo(0, 0)
    root.style.overflowY = 'hidden'

    return () => {
      root.style.overflowY = previousOverflowY
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [])

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (phase === 'scanning' || phase === 'departing') return
    wheelTravelRef.current = 0
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartRef.current = event.clientX
    startOffsetRef.current = offset
    setPhase('dragging')
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (phase !== 'dragging') return
    const travel = getTravel()
    movePass(startOffsetRef.current + event.clientX - dragStartRef.current, travel)
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (phase !== 'dragging') return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const travel = getTravel()
    if (boardingProgress(offsetRef.current, travel) >= ACCEPT_THRESHOLD) {
      beginBoarding()
      return
    }

    movePass(0, travel)
    wheelTravelRef.current = 0
    setPhase('ready')
  }

  function handlePassKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    beginBoarding()
  }

  function updateScrollBoarding(nextTravel: number) {
    const nextScrollProgress = boardingProgress(
      nextTravel,
      SCROLL_BOARDING_THRESHOLD,
    )
    wheelTravelRef.current = nextScrollProgress * SCROLL_BOARDING_THRESHOLD

    const travel = getTravel()
    offsetRef.current = travel * nextScrollProgress
    setOffset(offsetRef.current)
    setProgress(nextScrollProgress)
    setPhase(nextScrollProgress > 0 ? 'dragging' : 'ready')

    if (nextScrollProgress >= 1) beginBoarding()
  }

  function handleWheel(event: WheelEvent<HTMLElement>) {
    if (phase === 'scanning' || phase === 'departing') return
    updateScrollBoarding(wheelTravelRef.current + event.deltaY)
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    if (phase === 'scanning' || phase === 'departing') return
    if (
      event.target instanceof Element
      && event.target.closest('button, a, input, label, [role="button"]')
    ) {
      return
    }

    const touch = event.touches[0]
    if (!touch) return
    touchStartYRef.current = touch.clientY
    touchStartTravelRef.current = wheelTravelRef.current
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>) {
    const startY = touchStartYRef.current
    const touch = event.touches[0]
    if (startY === null || !touch) return

    updateScrollBoarding(
      touchStartTravelRef.current + startY - touch.clientY,
    )
  }

  function handleTouchEnd() {
    touchStartYRef.current = null
    touchStartTravelRef.current = wheelTravelRef.current
  }

  const status =
    phase === 'scanning' || phase === 'departing'
      ? t('boarding.accepted')
      : t('boarding.scannerReady')

  return (
    <section
      className={`boarding-gate boarding-gate--${phase}`}
      aria-label={t('boarding.title')}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="boarding-gate__sky" aria-hidden="true">
        <span className="boarding-gate__cloud boarding-gate__cloud--one" />
        <span className="boarding-gate__cloud boarding-gate__cloud--two" />
        <span className="boarding-gate__cloud boarding-gate__cloud--three" />
      </div>

      <header className="boarding-gate__header">
        <div className="boarding-wordmark">
          <FlightMark />
          <span>CanFly.ai</span>
        </div>
        <span className="boarding-gate__flight">CF 001 · TPE → AI</span>
      </header>

      <div className="boarding-gate__content">
        <div className="boarding-gate__copy">
          <p className="flight-eyebrow">{t('boarding.eyebrow')}</p>
          <h1>{t('boarding.title')}</h1>
          <p>{t('boarding.subtitle')}</p>
        </div>

        <div className="boarding-track" ref={trackRef}>
          <div
            ref={passRef}
            className="boarding-pass"
            role="button"
            tabIndex={phase === 'scanning' || phase === 'departing' ? -1 : 0}
            aria-label={t('boarding.passAction')}
            onKeyDown={handlePassKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
            style={{
              transform: `translate3d(${offset}px, 0, 0) rotate(${progress * 1.2}deg)`,
              opacity: 1 - progress * 0.16,
            }}
          >
            <div className="boarding-pass__stub">
              <FlightMark />
              <span>{t('boarding.passLabel')}</span>
              <strong>CF</strong>
            </div>
            <div className="boarding-pass__main">
              <div className="boarding-pass__topline">
                <span>CANFLY.AI</span>
                <span>{t('boarding.oneWay')}</span>
              </div>
              <div className="boarding-pass__route">
                <div>
                  <strong>{t('boarding.routeFromCode')}</strong>
                  <span>{t('boarding.routeFrom')}</span>
                </div>
                <div className="boarding-pass__route-line">
                  <FlightMark />
                </div>
                <div>
                  <strong>{t('boarding.routeToCode')}</strong>
                  <span>{t('boarding.routeTo')}</span>
                </div>
              </div>
              <dl className="boarding-pass__details">
                <div>
                  <dt>{t('boarding.flight')}</dt>
                  <dd>CF 001</dd>
                </div>
                <div>
                  <dt>{t('boarding.gate')}</dt>
                  <dd>AI</dd>
                </div>
                <div>
                  <dt>{t('boarding.seat')}</dt>
                  <dd>5M</dd>
                </div>
              </dl>
              <div className="boarding-pass__barcode" aria-hidden="true" />
            </div>
          </div>

          <div className="boarding-scanner" aria-live="polite">
            <div className="boarding-scanner__screen">
              {phase === 'scanning' || phase === 'departing' ? (
                <Check aria-hidden="true" />
              ) : (
                <ScanLine aria-hidden="true" />
              )}
              <span>{status}</span>
            </div>
            <div className="boarding-scanner__slot" aria-hidden="true">
              <span />
            </div>
            <span className="boarding-scanner__label">CANFLY GATE 01</span>
          </div>
        </div>

        <div className="boarding-gate__instructions">
          <span className="boarding-gate__gesture">
            <ArrowRight aria-hidden="true" />
            {t('boarding.dragHint')}
          </span>
          <div className="boarding-gate__options">
            <BoardingPreferenceSwitch
              checked={skipNextTime}
              onCheckedChange={setSkipNextTime}
              label={t('boarding.skipNext')}
              compact
            />
            <button type="button" onClick={beginBoarding}>
              {t('boarding.enterCabin')}
            </button>
          </div>
        </div>
      </div>

      <div className="boarding-gate__status" aria-hidden="true">
        <span style={{ width: `${Math.max(7, progress * 100)}%` }} />
      </div>
    </section>
  )
}
