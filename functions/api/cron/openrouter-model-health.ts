/**
 * POST /api/cron/openrouter-model-health — Daily curation freshness check (CAN-302)
 *
 * Scans `featured_free_models WHERE active = 1` and disables any row whose
 * source model has either:
 *   - Disappeared from OpenRouter `/api/v1/models`
 *   - Gained a non-zero `pricing.prompt` (no longer free)
 *   - Gained an `expiration_date` (about to be removed by OpenRouter)
 *
 * Auto-disabled rows stay in the table for audit; an editor can manually
 * `UPDATE active = 1` after confirming the model is OK again, or replace the
 * id with a fresh free model.
 *
 * Schedule: invoke daily via external scheduler (cron-job.org) or Cloudflare
 * Workers cron triggers.
 *
 * Auth: same CRON_SECRET pattern as heartbeat-sweep.
 */
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'
import { listStableFreeModelIds } from '../../lib/openrouter'

interface FeaturedRow {
  id: string
  display_name: string
  rank: number
}

function authorizeCron(env: Env, request: Request): Response | null {
  const cronSecret = (env as unknown as Record<string, string>).CRON_SECRET
  if (!cronSecret) return null // no secret configured → allow
  const authHeader = request.headers.get('Authorization')
  const cronHeader = request.headers.get('X-Cron-Secret')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cronHeader
  if (token !== cronSecret) return errorResponse('Unauthorized', 401)
  return null
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const denied = authorizeCron(env, request)
  if (denied) return denied

  let stableIds: Set<string>
  try {
    stableIds = await listStableFreeModelIds()
  } catch (err) {
    return errorResponse(`Failed to fetch OpenRouter models: ${err instanceof Error ? err.message : 'unknown'}`, 502)
  }

  const featured = await env.DB.prepare(
    `SELECT id, display_name, rank FROM featured_free_models WHERE active = 1`
  ).all<FeaturedRow>()

  const disabled: string[] = []
  const stillOk: string[] = []
  const errors: string[] = []

  for (const row of featured.results || []) {
    if (stableIds.has(row.id)) {
      stillOk.push(row.id)
      try {
        await env.DB.prepare(
          `UPDATE featured_free_models SET reviewed_at = datetime('now') WHERE id = ?1`
        ).bind(row.id).run()
      } catch (e) {
        errors.push(`update reviewed_at ${row.id}: ${e instanceof Error ? e.message : 'fail'}`)
      }
      continue
    }
    try {
      await env.DB.prepare(
        `UPDATE featured_free_models
         SET active = 0, reviewed_at = datetime('now')
         WHERE id = ?1`
      ).bind(row.id).run()
      disabled.push(row.id)

      await env.DB.prepare(
        `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
         VALUES ('model', ?1, 'featured_free_model_auto_disabled', ?2)`
      ).bind(row.id, JSON.stringify({
        displayName: row.display_name,
        rank: row.rank,
        reason: 'no longer free or has expiration_date upstream',
      })).run()
    } catch (e) {
      errors.push(`disable ${row.id}: ${e instanceof Error ? e.message : 'fail'}`)
    }
  }

  return json({
    ok: true,
    checkedAt: new Date().toISOString(),
    stillActive: stillOk,
    autoDisabled: disabled,
    errors: errors.length ? errors : undefined,
  })
}
