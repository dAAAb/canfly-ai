/**
 * GET /api/world-id/status/:username
 * Public: check if a user is World ID verified.
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const username = params.username as string

  const record = await env.DB.prepare(
    'SELECT verification_level, verified_at FROM world_id_verifications WHERE username = ?1 LIMIT 1'
  ).bind(username).first<{ verification_level: string; verified_at: string }>()

  if (!record) {
    return json({ username, is_human: false })
  }

  return json({
    username,
    is_human: true,
    verification_level: record.verification_level,
    verified_at: record.verified_at,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
