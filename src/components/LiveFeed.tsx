import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useFadeIn } from '../hooks/useFadeIn'

interface FeedEvent {
  id: number
  event_type: string
  emoji: string
  actor: string
  target: string | null
  link: string | null
  message_en: string
  message_zh_tw: string | null
  message_zh_cn: string | null
  created_at: string
}

const POLL_INTERVAL = 30_000
const DISPLAY_INTERVAL = 5_000
const DESKTOP_VISIBLE = 5
const MOBILE_VISIBLE = 3

function relativeTime(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (mins < 1) return t('liveFeed.justNow')
  if (mins < 60) return t('liveFeed.minutesAgo', { count: mins })
  if (hours < 24) return t('liveFeed.hoursAgo', { count: hours })
  return t('liveFeed.daysAgo', { count: days })
}

function getLocalizedMessage(event: FeedEvent, lang: string): string {
  if (lang.startsWith('zh-TW') && event.message_zh_tw) return event.message_zh_tw
  if (lang.startsWith('zh-CN') && event.message_zh_cn) return event.message_zh_cn
  return event.message_en
}

export default function LiveFeed() {
  const { t, i18n } = useTranslation()
  const fadeRef = useFadeIn()
  const [allEvents, setAllEvents] = useState<FeedEvent[]>([])
  const [displayEvents, setDisplayEvents] = useState<FeedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [enteringId, setEnteringId] = useState<number | null>(null)
  const queueRef = useRef<FeedEvent[]>([])
  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/feed/live?limit=20')
      if (!res.ok) return
      const data = (await res.json()) as { events: FeedEvent[] }
      setAllEvents(data.events)
      setLoading(false)
    } catch {
      /* silently retry next poll */
    }
  }, [])

  // Initial fetch + polling
  useEffect(() => {
    fetchEvents()
    const timer = setInterval(fetchEvents, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [fetchEvents])

  // Queue new events for animated display
  useEffect(() => {
    if (allEvents.length === 0) return

    // On first load, show initial batch immediately
    if (displayEvents.length === 0) {
      setDisplayEvents(allEvents.slice(0, DESKTOP_VISIBLE))
      queueRef.current = allEvents.slice(DESKTOP_VISIBLE)
      return
    }

    // Find new events not yet displayed
    const displayedIds = new Set(displayEvents.map((e) => e.id))
    const newEvents = allEvents.filter((e) => !displayedIds.has(e.id))
    if (newEvents.length > 0) {
      queueRef.current = [...newEvents, ...queueRef.current]
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents])

  // Drip-feed queued events one at a time
  useEffect(() => {
    if (displayTimerRef.current) clearInterval(displayTimerRef.current)

    displayTimerRef.current = setInterval(() => {
      if (queueRef.current.length === 0) return

      const next = queueRef.current.shift()!
      setEnteringId(next.id)
      setDisplayEvents((prev) => [next, ...prev.slice(0, DESKTOP_VISIBLE - 1)])

      // Clear entering state after animation
      setTimeout(() => setEnteringId(null), 600)
    }, DISPLAY_INTERVAL)

    return () => {
      if (displayTimerRef.current) clearInterval(displayTimerRef.current)
    }
  }, [])

  const lang = i18n.language

  return (
    <section
      ref={fadeRef}
      className="fade-section w-full"
      style={{ paddingLeft: '8%', paddingRight: '8%' }}
    >
      <div
        className="mx-auto my-12 max-w-5xl overflow-hidden rounded-2xl border border-white/10 p-6 md:p-8"
        style={{
          background: '#0A0E1A',
          boxShadow: '0 0 40px rgba(96, 165, 250, 0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <h3 className="mb-4 text-sm font-semibold tracking-widest uppercase text-cyan-400">
          {t('liveFeed.title')}
        </h3>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded-lg bg-white/5"
              />
            ))}
          </div>
        ) : displayEvents.length === 0 ? (
          <p className="text-sm text-white/40">{t('liveFeed.empty')}</p>
        ) : (
          <ul className="space-y-1">
            {displayEvents
              .slice(0, typeof window !== 'undefined' && window.innerWidth < 768 ? MOBILE_VISIBLE : DESKTOP_VISIBLE)
              .map((event) => (
                <li
                  key={event.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5 ${
                    enteringId === event.id ? 'livefeed-slide-in' : ''
                  }`}
                >
                  <span className="shrink-0 text-base">{event.emoji}</span>
                  <span className="min-w-0 flex-1 truncate text-white/80">
                    {(() => {
                      const msg = getLocalizedMessage(event, lang)
                      // Highlight actor and target names as clickable links within the message
                      const parts: React.ReactNode[] = []
                      let remaining = msg
                      // Replace actor name with link
                      if (event.actor && remaining.includes(event.actor)) {
                        const idx = remaining.indexOf(event.actor)
                        if (idx > 0) parts.push(remaining.slice(0, idx))
                        parts.push(
                          event.link ? (
                            <a key="actor" href={event.link} className="font-medium text-cyan-400 hover:underline">{event.actor}</a>
                          ) : (
                            <span key="actor" className="font-medium text-cyan-400">{event.actor}</span>
                          )
                        )
                        remaining = remaining.slice(idx + event.actor.length)
                      }
                      // Replace target name with link
                      if (event.target && remaining.includes(event.target)) {
                        const idx = remaining.indexOf(event.target)
                        if (idx > 0) parts.push(remaining.slice(0, idx))
                        parts.push(
                          <span key="target" className="font-medium text-cyan-400">{event.target}</span>
                        )
                        remaining = remaining.slice(idx + event.target.length)
                      }
                      if (remaining) parts.push(remaining)
                      return parts.length > 0 ? parts : msg
                    })()}
                  </span>
                  <span className="shrink-0 text-xs text-white/30">
                    {relativeTime(event.created_at, t)}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  )
}
