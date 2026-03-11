/**
 * POST /api/community/publish — For canfly-profile skill (future)
 * Accepts a full profile payload and upserts user + agent data.
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  generateEditToken,
  isValidUsername,
  isValidAgentName,
  parseBody,
} from './_helpers'

interface PublishPayload {
  editToken: string
  user: {
    username: string
    displayName?: string
    walletAddress?: string
    avatarUrl?: string
    bio?: string
    links?: Record<string, string>
  }
  agent: {
    name: string
    walletAddress?: string
    basename?: string
    platform?: string
    avatarUrl?: string
    bio?: string
    model?: string
    hosting?: string
    capabilities?: Record<string, unknown>
    erc8004Url?: string
    skills?: Array<{ name: string; slug?: string; description?: string }>
  }
  hardware?: Array<{ name: string; slug?: string; role?: string }>
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await parseBody<PublishPayload>(request)
  if (!body || !body.user?.username || !body.agent?.name || !body.editToken) {
    return errorResponse('user.username, agent.name, and editToken are required', 400)
  }

  const { user, agent, hardware, editToken } = body

  if (!isValidUsername(user.username)) {
    return errorResponse('Invalid username', 400)
  }
  if (!isValidAgentName(agent.name)) {
    return errorResponse('Invalid agent name', 400)
  }

  // Verify edit token — user must already exist
  const existing = await env.DB.prepare(
    'SELECT username, edit_token FROM users WHERE username = ?1'
  )
    .bind(user.username)
    .first()

  if (!existing) {
    return errorResponse('User not found. Register first via POST /api/community/users', 404)
  }

  if (existing.edit_token !== editToken) {
    return errorResponse('Invalid edit token', 403)
  }

  // Update user
  await env.DB.prepare(
    `UPDATE users SET
       display_name = ?1, wallet_address = ?2, avatar_url = ?3,
       bio = ?4, links = ?5, updated_at = datetime('now')
     WHERE username = ?6`
  )
    .bind(
      user.displayName || '',
      user.walletAddress || null,
      user.avatarUrl || null,
      user.bio || null,
      JSON.stringify(user.links || {}),
      user.username
    )
    .run()

  // Upsert agent
  const existingAgent = await env.DB.prepare('SELECT name FROM agents WHERE name = ?1')
    .bind(agent.name)
    .first()

  if (existingAgent) {
    await env.DB.prepare(
      `UPDATE agents SET
         owner_username = ?1, wallet_address = ?2, basename = ?3, platform = ?4,
         avatar_url = ?5, bio = ?6, model = ?7, hosting = ?8,
         capabilities = ?9, erc8004_url = ?10, updated_at = datetime('now')
       WHERE name = ?11`
    )
      .bind(
        user.username,
        agent.walletAddress || null,
        agent.basename || null,
        agent.platform || 'other',
        agent.avatarUrl || null,
        agent.bio || null,
        agent.model || null,
        agent.hosting || null,
        JSON.stringify(agent.capabilities || {}),
        agent.erc8004Url || null,
        agent.name
      )
      .run()
  } else {
    const agentEditToken = generateEditToken()
    await env.DB.prepare(
      `INSERT INTO agents (name, owner_username, wallet_address, basename, platform,
                           avatar_url, bio, model, hosting, capabilities, erc8004_url, edit_token)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`
    )
      .bind(
        agent.name,
        user.username,
        agent.walletAddress || null,
        agent.basename || null,
        agent.platform || 'other',
        agent.avatarUrl || null,
        agent.bio || null,
        agent.model || null,
        agent.hosting || null,
        JSON.stringify(agent.capabilities || {}),
        agent.erc8004Url || null,
        agentEditToken
      )
      .run()
  }

  // Replace skills for this agent
  await env.DB.prepare('DELETE FROM skills WHERE agent_name = ?1')
    .bind(agent.name)
    .run()

  if (agent.skills && agent.skills.length > 0) {
    for (const skill of agent.skills) {
      await env.DB.prepare(
        `INSERT INTO skills (agent_name, name, slug, description)
         VALUES (?1, ?2, ?3, ?4)`
      )
        .bind(agent.name, skill.name, skill.slug || null, skill.description || null)
        .run()
    }
  }

  // Replace hardware for this user
  if (hardware) {
    await env.DB.prepare('DELETE FROM hardware WHERE username = ?1')
      .bind(user.username)
      .run()

    for (const item of hardware) {
      await env.DB.prepare(
        `INSERT INTO hardware (username, name, slug, role) VALUES (?1, ?2, ?3, ?4)`
      )
        .bind(user.username, item.name, item.slug || null, item.role || null)
        .run()
    }
  }

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'published', ?2)`
  )
    .bind(agent.name, JSON.stringify({ username: user.username }))
    .run()

  return json({ ok: true, username: user.username, agentName: agent.name })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
