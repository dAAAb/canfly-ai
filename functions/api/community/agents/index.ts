/**
 * GET  /api/community/agents — List agents (paginated, filterable)
 * POST /api/community/agents — Register a new agent
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  generateEditToken,
  isValidAgentName,
  parseBody,
  intParam,
} from '../_helpers'
import { authenticateRequest } from '../../_auth'

// ── GET /api/community/agents ───────────────────────────────────────────
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
  const q = url.searchParams.get('q') || ''
  const platform = url.searchParams.get('platform') || ''
  const owner = url.searchParams.get('owner') || ''
  const free = url.searchParams.get('free')
  const skill = url.searchParams.get('skill') || ''
  const limit = Math.min(intParam(url, 'limit', 20), 100)
  const offset = intParam(url, 'offset', 0)

  let sql = `
    SELECT a.name, a.owner_username, a.wallet_address, a.basename,
           a.platform, a.avatar_url, a.bio, a.model, a.hosting,
           a.capabilities, a.erc8004_url, a.is_public, a.created_at,
           a.agentbook_registered,
           (SELECT COUNT(*) FROM skills s WHERE s.agent_name = a.name) AS skill_count
    FROM agents a
    WHERE a.is_public = 1
  `
  const params: unknown[] = []

  if (q) {
    sql += ` AND (a.name LIKE ?${params.length + 1} OR a.bio LIKE ?${params.length + 1})`
    params.push(`%${q}%`)
  }

  if (platform) {
    sql += ` AND a.platform = ?${params.length + 1}`
    params.push(platform)
  }

  if (owner) {
    sql += ` AND a.owner_username = ?${params.length + 1}`
    params.push(owner)
  }

  if (free === 'true') {
    sql += ` AND a.owner_username IS NULL`
  }

  if (skill) {
    sql += ` AND EXISTS (SELECT 1 FROM skills s WHERE s.agent_name = a.name AND s.name LIKE ?${params.length + 1})`
    params.push(`%${skill}%`)
  }

  sql += ` ORDER BY a.created_at DESC LIMIT ?${params.length + 1} OFFSET ?${params.length + 2}`
  params.push(limit, offset)

  const result = await env.DB.prepare(sql)
    .bind(...params)
    .all()

  const agents = result.results.map((row: Record<string, unknown>) => ({
    ...row,
    capabilities: JSON.parse((row.capabilities as string) || '{}'),
    isPublic: row.is_public === 1,
    skillCount: row.skill_count as number,
  }))

  return json({ agents, limit, offset })
}

// ── POST /api/community/agents ──────────────────────────────────────────
interface CreateAgentBody {
  name: string
  ownerUsername?: string
  walletAddress?: string
  basename?: string
  platform?: string
  avatarUrl?: string
  bio?: string
  birthday?: string
  model?: string
  hosting?: string
  capabilities?: Record<string, unknown>
  erc8004Url?: string
  skills?: Array<{ name: string; slug?: string; description?: string }>
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await parseBody<CreateAgentBody>(request)
  if (!body || !body.name) {
    return errorResponse('name is required', 400)
  }

  const { name, ownerUsername, walletAddress, basename, platform, avatarUrl, bio, birthday, model, hosting, capabilities, erc8004Url, skills } = body

  // Validate birthday format (YYYY-MM-DD) if provided
  if (birthday) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || isNaN(new Date(birthday).getTime())) {
      return errorResponse('Invalid birthday format. Use YYYY-MM-DD.', 400)
    }
  }

  if (!isValidAgentName(name)) {
    return errorResponse(
      'Invalid agent name. Must be 2-50 chars, alphanumeric/hyphens/underscores/spaces.',
      400
    )
  }

  // Check if agent name already exists
  const existing = await env.DB.prepare('SELECT name FROM agents WHERE name = ?1')
    .bind(name)
    .first()
  if (existing) {
    return errorResponse('Agent name already taken', 409)
  }

  // If ownerUsername provided, authenticate caller and verify user exists
  if (ownerUsername) {
    const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
    if (!auth) {
      return errorResponse('Authentication required when setting ownerUsername', 401)
    }
    if (auth.username !== ownerUsername) {
      return errorResponse('Unauthorized', 403)
    }
  }

  const editToken = generateEditToken()

  await env.DB.prepare(
    `INSERT INTO agents (name, owner_username, wallet_address, basename, platform,
                         avatar_url, bio, birthday, model, hosting, capabilities, erc8004_url, edit_token)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
  )
    .bind(
      name,
      ownerUsername || null,
      walletAddress || null,
      basename || null,
      platform || 'other',
      avatarUrl || null,
      bio || null,
      birthday || null,
      model || null,
      hosting || null,
      JSON.stringify(capabilities || {}),
      erc8004Url || null,
      editToken
    )
    .run()

  // Insert skills if provided
  if (skills && skills.length > 0) {
    for (const skill of skills) {
      await env.DB.prepare(
        `INSERT INTO skills (agent_name, name, slug, description)
         VALUES (?1, ?2, ?3, ?4)`
      )
        .bind(name, skill.name, skill.slug || null, skill.description || null)
        .run()
    }
  }

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'registered', ?2)`
  )
    .bind(name, JSON.stringify({ ownerUsername: ownerUsername || null }))
    .run()

  return json({ name, editToken }, 201)
}

// ── OPTIONS (CORS preflight) ────────────────────────────────────────────
export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
