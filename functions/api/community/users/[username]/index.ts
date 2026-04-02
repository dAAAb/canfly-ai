/**
 * GET  /api/community/users/:username — Single user with agents array
 * PUT  /api/community/users/:username — Update user profile (requires edit token)
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const username = params.username as string

  const user = await env.DB.prepare(
    `SELECT username, display_name, wallet_address, avatar_url,
            bio, links, is_public, created_at, claimed, verification_level, owner_invite_code
     FROM users WHERE username = ?1 COLLATE NOCASE`
  )
    .bind(username)
    .first()

  if (!user) {
    return errorResponse('User not found', 404)
  }

  if (user.is_public === 0) {
    return errorResponse('User profile is private', 403)
  }

  // Use the canonical username from DB (preserves original case)
  const canonicalUsername = user.username as string

  // Get user's agents with their skills
  const agentsResult = await env.DB.prepare(
    `SELECT name, display_name, wallet_address, basename, platform, avatar_url,
            bio, model, hosting, capabilities, erc8004_url, is_public, created_at,
            agentbook_registered
     FROM agents WHERE owner_username = ?1 COLLATE NOCASE AND is_public = 1
     ORDER BY created_at ASC`
  )
    .bind(canonicalUsername)
    .all()

  const agents = await Promise.all(
    agentsResult.results.map(async (agent: Record<string, unknown>) => {
      const skillsResult = await env.DB.prepare(
        `SELECT name, slug, description FROM skills WHERE agent_name = ?1`
      )
        .bind(agent.name as string)
        .all()

      return {
        ...agent,
        capabilities: JSON.parse((agent.capabilities as string) || '{}'),
        isPublic: agent.is_public === 1,
        skills: skillsResult.results,
      }
    })
  )

  // Get user's hardware
  const hardwareResult = await env.DB.prepare(
    `SELECT name, slug, role FROM hardware WHERE username = ?1 COLLATE NOCASE`
  )
    .bind(canonicalUsername)
    .all()

  // Get user's Zeabur deployments (lobsters)
  const deploymentsResult = await env.DB.prepare(
    `SELECT id, agent_name, zeabur_project_id, zeabur_service_id, status,
            deploy_url, error_code, error_message, retry_count, template_id,
            created_at, updated_at
     FROM v3_zeabur_deployments WHERE owner_username = ?1
     ORDER BY created_at DESC`
  )
    .bind(canonicalUsername)
    .all()
    .catch(() => ({ results: [] }))

  return json({
    ...user,
    links: JSON.parse((user.links as string) || '{}'),
    isPublic: user.is_public === 1,
    claimed: user.claimed as number,
    verification_level: user.verification_level as string,
    ownerInviteCode: user.owner_invite_code || null,
    agents,
    hardware: hardwareResult.results,
    deployments: deploymentsResult.results,
  })
}

// ── PUT /api/community/users/:username ───────────────────────────────
interface UpdateUserBody {
  displayName?: string
  avatarUrl?: string
  bio?: string
  links?: Record<string, string>
}

export const onRequestPut: PagesFunction<Env> = async ({ env, params, request }) => {
  const username = params.username as string
  const editToken = request.headers.get('X-Edit-Token')

  if (!editToken) {
    return errorResponse('X-Edit-Token header required', 401)
  }

  // Verify edit token
  const user = await env.DB.prepare(
    'SELECT username, edit_token FROM users WHERE username = ?1'
  )
    .bind(username)
    .first()

  if (!user) {
    return errorResponse('User not found', 404)
  }
  if (user.edit_token !== editToken) {
    return errorResponse('Invalid edit token', 403)
  }

  const body = await parseBody<UpdateUserBody>(request)
  if (!body) {
    return errorResponse('Invalid request body', 400)
  }

  const updates: string[] = []
  const values: unknown[] = []
  let paramIdx = 1

  if (body.displayName !== undefined) {
    updates.push(`display_name = ?${paramIdx}`)
    values.push(body.displayName)
    paramIdx++
  }
  if (body.avatarUrl !== undefined) {
    updates.push(`avatar_url = ?${paramIdx}`)
    values.push(body.avatarUrl || null)
    paramIdx++
  }
  if (body.bio !== undefined) {
    updates.push(`bio = ?${paramIdx}`)
    values.push(body.bio || null)
    paramIdx++
  }
  if (body.links !== undefined) {
    updates.push(`links = ?${paramIdx}`)
    values.push(JSON.stringify(body.links))
    paramIdx++
  }

  if (updates.length === 0) {
    return errorResponse('No fields to update', 400)
  }

  values.push(username)
  await env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE username = ?${paramIdx}`
  )
    .bind(...values)
    .run()

  return json({ username, updated: true })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
