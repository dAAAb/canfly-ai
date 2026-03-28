/**
 * Team Members API — CAN-252
 *
 * GET    /api/teams/:slug/members — list members
 * POST   /api/teams/:slug/members — add member (PM only)
 * DELETE /api/teams/:slug/members — remove member (PM only, cannot remove self)
 *
 * Auth: Bearer agent API key (for POST/DELETE)
 * Gate: v3_agent_registry feature flag
 * Roles: pm, worker, viewer
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../community/_helpers'
import { requireV3Flag, authenticateAgent, isTeamPM, VALID_TEAM_ROLES, type TeamRole } from '../_helpers'

interface AddMemberBody {
  agent_name: string
  role: TeamRole
}

interface RemoveMemberBody {
  agent_name: string
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

/** Resolve team by slug or id, return team row or error */
async function resolveTeam(env: Env, slug: string) {
  return env.DB.prepare(
    'SELECT id, name, slug, owner_username FROM v3_teams WHERE slug = ?1 OR id = ?1'
  ).bind(slug).first<{ id: string; name: string; slug: string; owner_username: string | null }>()
}

/** GET — list members */
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const flagError = await requireV3Flag(env)
  if (flagError) return flagError

  const slug = params.slug as string
  const team = await resolveTeam(env, slug)
  if (!team) return errorResponse('Team not found', 404)

  const { results: members } = await env.DB.prepare(
    `SELECT m.id, m.agent_name, m.role, m.joined_at, m.invited_by
     FROM v3_team_memberships m
     WHERE m.team_id = ?1
     ORDER BY
       CASE m.role WHEN 'pm' THEN 0 WHEN 'worker' THEN 1 WHEN 'viewer' THEN 2 ELSE 3 END,
       m.joined_at ASC`
  ).bind(team.id).all()

  return json({ team_id: team.id, team_slug: team.slug, members, count: members.length })
}

/** POST — add member (PM only) */
export const onRequestPost: PagesFunction<Env> = async ({ env, request, params }) => {
  const flagError = await requireV3Flag(env)
  if (flagError) return flagError

  const auth = await authenticateAgent(request, env)
  if ('error' in auth) return auth.error

  const slug = params.slug as string
  const team = await resolveTeam(env, slug)
  if (!team) return errorResponse('Team not found', 404)

  // Only PM can add members
  const isPM = await isTeamPM(env, team.id, auth.agentName)
  if (!isPM) {
    return errorResponse('Only the team PM can add members', 403)
  }

  const body = await parseBody<AddMemberBody>(request)
  if (!body?.agent_name || !body?.role) {
    return errorResponse('agent_name and role are required', 400)
  }

  // Validate role
  if (!VALID_TEAM_ROLES.includes(body.role)) {
    return errorResponse(`Invalid role. Must be one of: ${VALID_TEAM_ROLES.join(', ')}`, 400)
  }

  // Verify target agent exists
  const targetAgent = await env.DB.prepare('SELECT name FROM agents WHERE name = ?1')
    .bind(body.agent_name).first()
  if (!targetAgent) {
    return errorResponse('Agent not found', 404)
  }

  // Check for existing membership
  const existing = await env.DB.prepare(
    'SELECT id, role FROM v3_team_memberships WHERE team_id = ?1 AND agent_name = ?2'
  ).bind(team.id, body.agent_name).first<{ id: string; role: string }>()

  if (existing) {
    // Update role if changed
    if (existing.role === body.role) {
      return errorResponse('Agent already has this role in the team', 409)
    }
    await env.DB.prepare(
      'UPDATE v3_team_memberships SET role = ?1 WHERE id = ?2'
    ).bind(body.role, existing.id).run()

    return json({
      id: existing.id,
      team_id: team.id,
      agent_name: body.agent_name,
      role: body.role,
      updated: true,
    })
  }

  // Add new membership
  const membershipId = crypto.randomUUID()
  await env.DB.prepare(
    `INSERT INTO v3_team_memberships (id, team_id, agent_name, role, invited_by)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  ).bind(membershipId, team.id, body.agent_name, body.role, auth.agentName).run()

  return json({
    id: membershipId,
    team_id: team.id,
    agent_name: body.agent_name,
    role: body.role,
    invited_by: auth.agentName,
    joined_at: new Date().toISOString(),
  }, 201)
}

/** DELETE — remove member (PM only, cannot remove self) */
export const onRequestDelete: PagesFunction<Env> = async ({ env, request, params }) => {
  const flagError = await requireV3Flag(env)
  if (flagError) return flagError

  const auth = await authenticateAgent(request, env)
  if ('error' in auth) return auth.error

  const slug = params.slug as string
  const team = await resolveTeam(env, slug)
  if (!team) return errorResponse('Team not found', 404)

  // Only PM can remove members
  const isPM = await isTeamPM(env, team.id, auth.agentName)
  if (!isPM) {
    return errorResponse('Only the team PM can remove members', 403)
  }

  const body = await parseBody<RemoveMemberBody>(request)
  if (!body?.agent_name) {
    return errorResponse('agent_name is required', 400)
  }

  // PM cannot remove themselves (team must always have a PM)
  if (body.agent_name === auth.agentName) {
    return errorResponse('PM cannot remove themselves from the team', 400)
  }

  // Check membership exists
  const membership = await env.DB.prepare(
    'SELECT id FROM v3_team_memberships WHERE team_id = ?1 AND agent_name = ?2'
  ).bind(team.id, body.agent_name).first()

  if (!membership) {
    return errorResponse('Agent is not a member of this team', 404)
  }

  await env.DB.prepare('DELETE FROM v3_team_memberships WHERE team_id = ?1 AND agent_name = ?2')
    .bind(team.id, body.agent_name).run()

  return json({ ok: true, removed: body.agent_name, team_id: team.id })
}
