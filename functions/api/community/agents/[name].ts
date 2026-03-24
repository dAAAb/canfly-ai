/**
 * GET  /api/community/agents/:name — Single agent with owner info + skills
 * PUT  /api/community/agents/:name — Update agent profile (requires edit token)
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../_helpers'

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
      `SELECT username, display_name, wallet_address, avatar_url, verification_level, links, external_ids
       FROM users WHERE username = ?1`
    )
      .bind(agent.owner_username as string)
      .first()
  }

  // Build identity object from various sources
  const capabilities = JSON.parse((agent.capabilities as string) || '{}')
  const ownerLinks = owner ? JSON.parse((owner.links as string) || '{}') : {}
  const ownerExternalIds = owner ? JSON.parse((owner.external_ids as string) || '{}') : {}

  // Extract basemail handle from capabilities email or erc8004_url
  const emailCap = capabilities.email
  const basemailHandle = typeof emailCap === 'string' && emailCap.includes('@basemail.ai')
    ? emailCap.replace(/@basemail\.ai$/, '')
    : null

  // Check World ID verification for the owner
  let worldIdVerified = false
  let worldIdLevel: string | null = null
  if (agent.owner_username) {
    const worldId = await env.DB.prepare(
      `SELECT verification_level FROM world_id_verifications WHERE username = ?1 LIMIT 1`
    )
      .bind(agent.owner_username as string)
      .first()
    if (worldId) {
      worldIdVerified = true
      worldIdLevel = worldId.verification_level as string
    }
  }

  // GitHub from owner links or external_ids
  const github = ownerExternalIds.github || ownerLinks.github || null

  // Strip links/external_ids from owner response (internal data)
  if (owner) {
    delete (owner as Record<string, unknown>).links
    delete (owner as Record<string, unknown>).external_ids
  }

  return json({
    ...agent,
    capabilities,
    isPublic: agent.is_public === 1,
    skills: skillsResult.results,
    owner,
    identity: {
      wallet: agent.wallet_address || null,
      basename: agent.basename || null,
      basemail: basemailHandle,
      basemailEmail: typeof emailCap === 'string' ? emailCap : null,
      nadmail: typeof capabilities.nadmail === 'string' ? capabilities.nadmail : null,
      erc8004Url: agent.erc8004_url || null,
      worldId: worldIdVerified ? { verified: true, level: worldIdLevel } : null,
      github,
    },
  })
}

// ── PUT /api/community/agents/:name ──────────────────────────────────
interface UpdateAgentBody {
  ownerUsername?: string | null
  walletAddress?: string | null
  basename?: string | null
  platform?: string
  avatarUrl?: string | null
  bio?: string | null
  model?: string | null
  hosting?: string | null
  capabilities?: Record<string, unknown>
  erc8004Url?: string | null
  isPublic?: boolean
  skills?: Array<{ name: string; slug?: string; description?: string }>
}

export const onRequestPut: PagesFunction<Env> = async ({ env, params, request }) => {
  const name = params.name as string
  const editToken = request.headers.get('X-Edit-Token')

  if (!editToken) {
    return errorResponse('X-Edit-Token header required', 401)
  }

  // Verify agent exists and edit token matches
  const agent = await env.DB.prepare(
    'SELECT name, edit_token FROM agents WHERE name = ?1'
  )
    .bind(name)
    .first()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }
  if (agent.edit_token !== editToken) {
    return errorResponse('Invalid edit token', 403)
  }

  const body = await parseBody<UpdateAgentBody>(request)
  if (!body) {
    return errorResponse('Invalid request body', 400)
  }

  // If changing owner, verify the new owner exists
  if (body.ownerUsername !== undefined && body.ownerUsername !== null) {
    const user = await env.DB.prepare('SELECT username FROM users WHERE username = ?1')
      .bind(body.ownerUsername)
      .first()
    if (!user) {
      return errorResponse('Owner user not found', 404)
    }
  }

  // Build dynamic UPDATE
  const updates: string[] = []
  const values: unknown[] = []
  let paramIdx = 1

  if (body.ownerUsername !== undefined) {
    updates.push(`owner_username = ?${paramIdx}`)
    values.push(body.ownerUsername || null)
    paramIdx++
  }
  if (body.walletAddress !== undefined) {
    updates.push(`wallet_address = ?${paramIdx}`)
    values.push(body.walletAddress || null)
    paramIdx++
  }
  if (body.basename !== undefined) {
    updates.push(`basename = ?${paramIdx}`)
    values.push(body.basename || null)
    paramIdx++
  }
  if (body.platform !== undefined) {
    updates.push(`platform = ?${paramIdx}`)
    values.push(body.platform)
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
  if (body.model !== undefined) {
    updates.push(`model = ?${paramIdx}`)
    values.push(body.model || null)
    paramIdx++
  }
  if (body.hosting !== undefined) {
    updates.push(`hosting = ?${paramIdx}`)
    values.push(body.hosting || null)
    paramIdx++
  }
  if (body.capabilities !== undefined) {
    updates.push(`capabilities = ?${paramIdx}`)
    values.push(JSON.stringify(body.capabilities))
    paramIdx++
  }
  if (body.erc8004Url !== undefined) {
    updates.push(`erc8004_url = ?${paramIdx}`)
    values.push(body.erc8004Url || null)
    paramIdx++
  }
  if (body.isPublic !== undefined) {
    updates.push(`is_public = ?${paramIdx}`)
    values.push(body.isPublic ? 1 : 0)
    paramIdx++
  }

  // Always update updated_at
  updates.push(`updated_at = datetime('now')`)

  if (updates.length === 1) {
    // Only updated_at, no real fields — check if skills update is needed
    if (!body.skills) {
      return errorResponse('No fields to update', 400)
    }
  }

  // Update agent row
  if (updates.length > 0) {
    values.push(name)
    await env.DB.prepare(
      `UPDATE agents SET ${updates.join(', ')} WHERE name = ?${paramIdx}`
    )
      .bind(...values)
      .run()
  }

  // Replace skills if provided
  if (body.skills !== undefined) {
    await env.DB.prepare('DELETE FROM skills WHERE agent_name = ?1')
      .bind(name)
      .run()

    if (body.skills && body.skills.length > 0) {
      for (const skill of body.skills) {
        await env.DB.prepare(
          `INSERT INTO skills (agent_name, name, slug, description)
           VALUES (?1, ?2, ?3, ?4)`
        )
          .bind(name, skill.name, skill.slug || null, skill.description || null)
          .run()
      }
    }
  }

  return json({ name, updated: true })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
