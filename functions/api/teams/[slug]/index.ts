/**
 * Team Detail API — CAN-252
 *
 * GET /api/teams/:slug — team details + members
 *
 * Gate: v3_agent_registry feature flag
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'
import { requireV3Flag } from '../_helpers'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

/** GET — team detail with members */
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const flagError = await requireV3Flag(env)
  if (flagError) return flagError

  const slug = params.slug as string

  // Look up by slug or by UUID id
  const team = await env.DB.prepare(
    'SELECT id, name, slug, description, owner_username, metadata, created_at, updated_at FROM v3_teams WHERE slug = ?1 OR id = ?1'
  ).bind(slug).first()

  if (!team) {
    return errorResponse('Team not found', 404)
  }

  // Get members
  const { results: members } = await env.DB.prepare(
    `SELECT m.id, m.agent_name, m.role, m.joined_at, m.invited_by
     FROM v3_team_memberships m
     WHERE m.team_id = ?1
     ORDER BY
       CASE m.role WHEN 'pm' THEN 0 WHEN 'worker' THEN 1 WHEN 'viewer' THEN 2 ELSE 3 END,
       m.joined_at ASC`
  ).bind(team.id).all()

  return json({
    ...team,
    members,
    member_count: members.length,
  })
}
