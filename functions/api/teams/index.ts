/**
 * Team API v1 — CAN-252
 *
 * GET  /api/teams         — list teams (optional ?owner=username)
 * POST /api/teams         — create team (assigns caller as PM)
 *
 * Auth: Bearer agent API key
 * Gate: v3_agent_registry feature flag
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'
import { requireV3Flag, authenticateAgent, isValidSlug, VALID_TEAM_ROLES } from './_helpers'

interface CreateTeamBody {
  name: string
  slug: string
  description?: string
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

/** GET — list teams */
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const flagError = await requireV3Flag(env)
  if (flagError) return flagError

  const url = new URL(request.url)
  const owner = url.searchParams.get('owner')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 100)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0

  let query: string
  let bindings: unknown[]

  if (owner) {
    query = 'SELECT id, name, slug, description, owner_username, created_at, updated_at FROM v3_teams WHERE owner_username = ?1 ORDER BY created_at DESC LIMIT ?2 OFFSET ?3'
    bindings = [owner, limit, offset]
  } else {
    query = 'SELECT id, name, slug, description, owner_username, created_at, updated_at FROM v3_teams ORDER BY created_at DESC LIMIT ?1 OFFSET ?2'
    bindings = [limit, offset]
  }

  const { results } = await env.DB.prepare(query).bind(...bindings).all()
  return json({ teams: results, count: results.length })
}

/** POST — create team */
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const flagError = await requireV3Flag(env)
  if (flagError) return flagError

  const auth = await authenticateAgent(request, env)
  if ('error' in auth) return auth.error

  const body = await parseBody<CreateTeamBody>(request)
  if (!body?.name || !body?.slug) {
    return errorResponse('name and slug are required', 400)
  }

  if (!isValidSlug(body.slug)) {
    return errorResponse('Invalid slug. Must be 2-50 chars, lowercase alphanumeric + hyphens.', 400)
  }

  if (body.name.length < 2 || body.name.length > 100) {
    return errorResponse('Team name must be 2-100 characters', 400)
  }

  // Check slug uniqueness
  const existing = await env.DB.prepare('SELECT id FROM v3_teams WHERE slug = ?1').bind(body.slug).first()
  if (existing) {
    return errorResponse('Team slug already taken', 409)
  }

  // Look up agent's owner_username for team ownership
  const agent = await env.DB.prepare('SELECT owner_username FROM agents WHERE name = ?1')
    .bind(auth.agentName).first<{ owner_username: string | null }>()

  const teamId = crypto.randomUUID()
  const membershipId = crypto.randomUUID()

  // Create team
  await env.DB.prepare(
    `INSERT INTO v3_teams (id, name, slug, description, owner_username)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  ).bind(teamId, body.name, body.slug, body.description || null, agent?.owner_username || null).run()

  // Add the creating agent as PM
  await env.DB.prepare(
    `INSERT INTO v3_team_memberships (id, team_id, agent_name, role, invited_by)
     VALUES (?1, ?2, ?3, 'pm', ?4)`
  ).bind(membershipId, teamId, auth.agentName, auth.agentName).run()

  return json({
    id: teamId,
    name: body.name,
    slug: body.slug,
    description: body.description || null,
    owner_username: agent?.owner_username || null,
    pm: auth.agentName,
    created_at: new Date().toISOString(),
  }, 201)
}
