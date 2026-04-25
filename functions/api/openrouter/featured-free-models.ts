/**
 * GET /api/openrouter/featured-free-models — CAN-302
 *
 * Public read of CanFly's curated free model list. Used by the Pinata wizard
 * Step 3 to render the model picker.
 *
 * The list is editorial (rank assigned by hand, monthly review) and a daily
 * cron at /api/cron/openrouter-model-health auto-disables any entry whose
 * source has gained an `expiration_date` or non-zero pricing.
 */
import { type Env, json, handleOptions, errorResponse } from '../community/_helpers'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const result = await env.DB.prepare(
      `SELECT id, display_name, provider_logo_url, context_length, use_case_zh, rank
       FROM featured_free_models
       WHERE active = 1
       ORDER BY rank ASC
       LIMIT 10`
    ).all()

    return json({ models: result.results || [] })
  } catch (err) {
    return errorResponse(`Failed to load featured free models: ${err instanceof Error ? err.message : 'unknown'}`, 500)
  }
}
