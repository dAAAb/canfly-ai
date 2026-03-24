/**
 * GET /api/agents/:name/agent-card.json — A2A standard Agent Card
 *
 * Auto-generates an A2A spec v1.0 compliant Agent Card JSON from
 * the agent's registered data in D1.
 *
 * Spec fields: name, description, url, version, provider, capabilities,
 * skills, authentication.
 * Extensions: walletAddress, birthday, heartbeat, erc8004.
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'

const SITE = 'https://canfly.ai'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const name = params.name as string

  const agent = await env.DB.prepare(
    `SELECT name, owner_username, wallet_address, basename, platform,
            avatar_url, bio, model, hosting, capabilities, erc8004_url,
            is_public, created_at, agentbook_registered
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

  // Fetch skills
  const skillsResult = await env.DB.prepare(
    `SELECT id, name, slug, description, url FROM skills WHERE agent_name = ?1`
  )
    .bind(name)
    .all()

  // Build agent URL — with owner subdomain or free pool
  const ownerUsername = agent.owner_username as string | null
  const agentUrl = ownerUsername
    ? `${SITE}/u/${ownerUsername}/agent/${encodeURIComponent(name as string)}`
    : `${SITE}/free/agent/${encodeURIComponent(name as string)}`

  // Parse stored capabilities JSON
  const storedCaps = JSON.parse((agent.capabilities as string) || '{}')

  // Build A2A skills array
  const a2aSkills = skillsResult.results.map((s) => ({
    id: s.slug || String(s.id),
    name: s.name,
    description: s.description || undefined,
    ...(s.url ? { url: s.url } : {}),
    tags: [],
  }))

  // Build A2A Agent Card
  const agentCard: Record<string, unknown> = {
    name: agent.name,
    description: agent.bio || '',
    url: agentUrl,
    version: '1.0.0',
    provider: {
      organization: 'CanFly',
      url: SITE,
    },
    capabilities: {
      streaming: storedCaps.streaming ?? false,
      pushNotifications: storedCaps.pushNotifications ?? false,
    },
    defaultInputModes: storedCaps.defaultInputModes || ['text/plain'],
    defaultOutputModes: storedCaps.defaultOutputModes || ['text/plain'],
    skills: a2aSkills,
    authentication: {
      schemes: storedCaps.auth_schemes || ['none'],
    },
    // CanFly extensions (prefixed with underscore per convention)
    _extensions: {
      platform: agent.platform,
      model: agent.model || undefined,
      hosting: agent.hosting || undefined,
      avatarUrl: agent.avatar_url || undefined,
      walletAddress: agent.wallet_address || undefined,
      basename: agent.basename || undefined,
      agentbookRegistered: agent.agentbook_registered === 1,
      erc8004Url: agent.erc8004_url || undefined,
      birthday: agent.created_at,
      canflyUrl: agentUrl,
      ...(ownerUsername ? { owner: ownerUsername } : {}),
    },
  }

  // Remove undefined values from _extensions
  const ext = agentCard._extensions as Record<string, unknown>
  for (const key of Object.keys(ext)) {
    if (ext[key] === undefined) delete ext[key]
  }

  // Remove undefined from skills
  for (const skill of a2aSkills) {
    if (skill.description === undefined) delete (skill as Record<string, unknown>).description
  }

  return new Response(JSON.stringify(agentCard, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
