/**
 * PUT /api/agents/:name — Agent self-update via Bearer API key
 *
 * Agents use their apiKey (from registration) to update their own profile.
 * Authorization: Bearer {apiKey}
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../community/_helpers'

interface UpdateBody {
  bio?: string | null
  skills?: string[]
  portfolio?: string[]
  avatarUrl?: string | null
  model?: string | null
  platform?: string
}

export const onRequestPut: PagesFunction<Env> = async ({ env, params, request }) => {
  const name = params.name as string

  // Extract Bearer token
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authorization: Bearer {apiKey} required', 401)
  }
  const apiKey = authHeader.slice(7)

  // Verify agent exists and API key matches
  const agent = await env.DB.prepare(
    'SELECT name, api_key FROM agents WHERE name = ?1'
  )
    .bind(name)
    .first()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }
  if (!agent.api_key || agent.api_key !== apiKey) {
    return errorResponse('Invalid API key', 403)
  }

  const body = await parseBody<UpdateBody>(request)
  if (!body) {
    return errorResponse('Invalid request body', 400)
  }

  // Build dynamic UPDATE
  const updates: string[] = []
  const values: unknown[] = []
  let paramIdx = 1

  if (body.bio !== undefined) {
    updates.push(`bio = ?${paramIdx}`)
    values.push(body.bio || null)
    paramIdx++
  }
  if (body.avatarUrl !== undefined) {
    updates.push(`avatar_url = ?${paramIdx}`)
    values.push(body.avatarUrl || null)
    paramIdx++
  }
  if (body.model !== undefined) {
    updates.push(`model = ?${paramIdx}`)
    values.push(body.model || null)
    paramIdx++
  }
  if (body.platform !== undefined) {
    updates.push(`platform = ?${paramIdx}`)
    values.push(body.platform)
    paramIdx++
  }
  if (body.portfolio !== undefined) {
    updates.push(`capabilities = ?${paramIdx}`)
    values.push(JSON.stringify({ portfolio: body.portfolio }))
    paramIdx++
  }

  // Always update updated_at
  updates.push(`updated_at = datetime('now')`)

  const hasFieldUpdates = updates.length > 1 // more than just updated_at
  const hasSkillUpdates = body.skills !== undefined

  if (!hasFieldUpdates && !hasSkillUpdates) {
    return errorResponse('No fields to update', 400)
  }

  // Update agent row
  if (hasFieldUpdates) {
    values.push(name)
    await env.DB.prepare(
      `UPDATE agents SET ${updates.join(', ')} WHERE name = ?${paramIdx}`
    )
      .bind(...values)
      .run()
  }

  // Replace skills if provided
  if (hasSkillUpdates) {
    await env.DB.prepare('DELETE FROM skills WHERE agent_name = ?1')
      .bind(name)
      .run()

    if (body.skills && body.skills.length > 0) {
      for (const skill of body.skills) {
        await env.DB.prepare(
          `INSERT INTO skills (agent_name, name, slug, description)
           VALUES (?1, ?2, NULL, NULL)`
        )
          .bind(name, skill)
          .run()
      }
    }
  }

  return json({ name, updated: true })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
