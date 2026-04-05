/**
 * POST /api/admin/backfill-slugs — One-time: generate slugs for skills missing them
 * Auth: X-Canfly-Api-Key must match CRON_SECRET
 */
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'
import { slugify } from '../../lib/slugify'

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const secret = request.headers.get('X-Canfly-Api-Key')
  if (!secret || secret !== env.CRON_SECRET) {
    return errorResponse('Unauthorized', 401)
  }

  const { results } = await env.DB.prepare(
    `SELECT id, name, slug FROM skills WHERE slug IS NULL OR slug = ''`
  ).all()

  const updated: Array<{ id: number; name: string; slug: string }> = []

  for (const row of results) {
    const newSlug = slugify(row.name as string)
    await env.DB.prepare('UPDATE skills SET slug = ?1 WHERE id = ?2')
      .bind(newSlug, row.id)
      .run()
    updated.push({ id: row.id as number, name: row.name as string, slug: newSlug })
  }

  return json({ backfilled: updated.length, skills: updated })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
