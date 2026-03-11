/**
 * GET /api/community/agents/:name — Single agent with owner info + skills
 */
import { type Env, json, errorResponse, handleOptions } from '../_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const name = params.name as string

  const agent = await env.DB.prepare(
    `SELECT name, owner_username, wallet_address, basename, platform,
            avatar_url, bio, model, hosting, capabilities, erc8004_url,
            is_public, created_at
     FROM agents WHERE name = ?1`
  )
    .bind(name)
    .first()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }

  if (agent.is_public === 0) {
    return errorResponse('Agent profile is private', 403)
  }

  // Get skills
  const skillsResult = await env.DB.prepare(
    `SELECT name, slug, description FROM skills WHERE agent_name = ?1`
  )
    .bind(name)
    .all()

  // Get owner info if exists
  let owner = null
  if (agent.owner_username) {
    owner = await env.DB.prepare(
      `SELECT username, display_name, wallet_address, avatar_url
       FROM users WHERE username = ?1`
    )
      .bind(agent.owner_username as string)
      .first()
  }

  return json({
    ...agent,
    capabilities: JSON.parse((agent.capabilities as string) || '{}'),
    isPublic: agent.is_public === 1,
    skills: skillsResult.results,
    owner,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
