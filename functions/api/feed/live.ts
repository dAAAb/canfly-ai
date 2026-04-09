/**
 * GET /api/feed/live?limit=20 — Public live feed of recent events
 *
 * No auth required. CF Cache 60s via Cache-Control header.
 * CAN-300
 */
import { type Env, json, handleOptions, intParam } from '../community/_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
  const limit = Math.min(intParam(url, 'limit', 20), 50)

  const result = await env.DB.prepare(
    `SELECT id, event_type, emoji, actor, target, link,
            message_en, message_zh_tw, message_zh_cn, created_at
     FROM public_feed
     ORDER BY created_at DESC, id DESC
     LIMIT ?1`
  ).bind(limit).all()

  const resp = json({ events: result.results })

  // CF Cache: 60 seconds for edge caching
  resp.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60')

  return resp
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
