/**
 * POST /api/agents/register — Agent self-registration
 *
 * Two paths:
 * - With owner_invite: status=pending_confirmation, enters pending bindings
 * - Without owner_invite: status=free, enters Free Agents pool
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  generateApiKey,
  generatePairingCode,
  isValidAgentName,
  parseBody,
} from '../community/_helpers'

interface RegisterBody {
  name: string
  bio?: string
  platform?: string
  model?: string
  skills?: string[]
  avatarUrl?: string
  portfolio?: string[]
  owner_invite?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await parseBody<RegisterBody>(request)
  if (!body || !body.name) {
    return errorResponse('name is required', 400)
  }

  const { name, bio, platform, model, skills, avatarUrl, portfolio, owner_invite } = body

  if (!isValidAgentName(name)) {
    return errorResponse(
      'Invalid agent name. Must be 2-50 chars, alphanumeric/hyphens/underscores/spaces.',
      400
    )
  }

  // Check uniqueness
  const existing = await env.DB.prepare('SELECT name FROM agents WHERE name = ?1')
    .bind(name)
    .first()
  if (existing) {
    return errorResponse('Agent name already taken', 409)
  }

  const apiKey = generateApiKey()
  const pairingCode = generatePairingCode()
  // Pairing code expires in 24 hours
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)

  const status = owner_invite ? 'pending_confirmation' : 'free'

  // Insert agent — owner_username is NULL (self-registered, no owner yet)
  await env.DB.prepare(
    `INSERT INTO agents (name, owner_username, platform, avatar_url, bio, model,
                         capabilities, is_public, edit_token, source,
                         api_key, pairing_code, pairing_code_expires, registration_source)
     VALUES (?1, NULL, ?2, ?3, ?4, ?5, ?6, 1, ?7, 'registered', ?8, ?9, ?10, 'self')`
  )
    .bind(
      name,
      platform || 'other',
      avatarUrl || null,
      bio || null,
      model || null,
      JSON.stringify({ portfolio: portfolio || [] }),
      apiKey, // edit_token doubles as fallback; real auth is api_key
      apiKey,
      pairingCode,
      expires
    )
    .run()

  // Insert skills if provided
  if (skills && skills.length > 0) {
    for (const skill of skills) {
      await env.DB.prepare(
        `INSERT INTO skills (agent_name, name, slug, description)
         VALUES (?1, ?2, NULL, NULL)`
      )
        .bind(name, skill)
        .run()
    }
  }

  // If owner_invite provided, create pending binding
  if (owner_invite) {
    await env.DB.prepare(
      `INSERT INTO agent_pending_bindings (agent_name, owner_invite)
       VALUES (?1, ?2)`
    )
      .bind(name, owner_invite)
      .run()
  }

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'self_registered', ?2)`
  )
    .bind(name, JSON.stringify({ platform: platform || 'other', status, hasOwnerInvite: !!owner_invite }))
    .run()

  return json(
    {
      agentId: name,
      pairingCode,
      apiKey,
      status,
      message: owner_invite
        ? `Agent registered. Pending owner confirmation via invite code.`
        : `Agent registered as free agent. Use your apiKey to update your profile.`,
    },
    201
  )
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
