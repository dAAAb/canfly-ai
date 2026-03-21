/**
 * GET /api/og/agent/:agentName — Generate dynamic OG image for Agent Card
 */
import { type Env, errorResponse } from '../../community/_helpers'
import { agentCard, renderOgImage, pngResponse } from '../_og'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const agentName = params.agentName as string

  const agent = await env.DB.prepare(
    `SELECT name, owner_username, avatar_url, bio, model, platform
     FROM agents WHERE name = ?1 COLLATE NOCASE AND is_public = 1`
  )
    .bind(agentName)
    .first()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }

  const skillsResult = await env.DB.prepare(
    `SELECT name FROM skills WHERE agent_name = ?1`
  )
    .bind(agent.name as string)
    .all()

  const skills = skillsResult.results.map((s: Record<string, unknown>) => s.name as string)

  const node = agentCard({
    name: agent.name as string,
    ownerUsername: agent.owner_username as string | null,
    bio: agent.bio as string | null,
    avatarUrl: agent.avatar_url as string | null,
    model: agent.model as string | null,
    platform: (agent.platform as string) || 'other',
    skills,
  })

  const png = await renderOgImage(node)
  return pngResponse(png)
}
