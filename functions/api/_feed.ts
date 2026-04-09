/**
 * Live feed helper — fire-and-forget event emitter for the public_feed table.
 * CAN-300
 */

export interface FeedEvent {
  event_type: string
  emoji: string
  actor: string
  target?: string
  link?: string
  message_en: string
  message_zh_tw?: string
  message_zh_cn?: string
}

/**
 * Insert a feed event into public_feed. Best-effort — never throws.
 */
export async function emitFeedEvent(db: D1Database, event: FeedEvent): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO public_feed (event_type, emoji, actor, target, link, message_en, message_zh_tw, message_zh_cn)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    ).bind(
      event.event_type,
      event.emoji,
      event.actor,
      event.target || null,
      event.link || null,
      event.message_en,
      event.message_zh_tw || null,
      event.message_zh_cn || null,
    ).run()
  } catch {
    // Feed logging is non-critical — swallow errors
  }
}
