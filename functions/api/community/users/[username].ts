/**
 * GET /api/community/users/:username — Single user with agents array
 */
import { type Env, json, errorResponse, handleOptions } from '../_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const username = params.username as string

  const user = await env.DB.prepare(
    `SELECT username, display_name, wallet_address, avatar_url,
            bio, links, is_public, created_at
     FROM users WHERE username = ?1`
  )
    .bind(username)
    .first()

  if (!user) {
    return errorResponse('User not found', 404)
  }

  if (user.is_public === 0) {
    return errorResponse('User profile is private', 403)
  }

  // Get user's agents with their skills
  const agentsResult = await env.DB.prepare(
    `SELECT name, wallet_address, basename, platform, avatar_url,
            bio, model, hosting, capabilities, erc8004_url, is_public, created_at
     FROM agents WHERE owner_username = ?1 AND is_public = 1
     ORDER BY created_at ASC`
  )
    .bind(username)
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
    `SELECT name, slug, role FROM hardware WHERE username = ?1`
  )
    .bind(username)
    .all()

  return json({
    ...user,
    links: JSON.parse((user.links as string) || '{}'),
    isPublic: user.is_public === 1,
    agents,
    hardware: hardwareResult.results,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
