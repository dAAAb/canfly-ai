/**
 * PUT /api/agents/:name — Agent self-update via Bearer API key
 *
 * Agents use their apiKey (from registration) to update their own profile.
 * Authorization: Bearer {apiKey}
 *
 * Supports rename (once only), bio, model, platform, avatar, skills, portfolio.
 * Skills accept objects: { name, slug?, description?, url? }
 */
import { type Env, json, errorResponse, handleOptions, parseBody, isValidAgentName } from '../community/_helpers'

interface SkillEntry {
  name: string
  slug?: string | null
  description?: string | null
  url?: string | null
}

interface UpdateBody {
  name?: string              // Rename (max 1 time)
  bio?: string | null
  skills?: (string | SkillEntry)[]
  portfolio?: string[]
  avatarUrl?: string | null
  model?: string | null
  platform?: string
  walletAddress?: string | null
  basename?: string | null
  hosting?: string | null
}

export const onRequestPut: PagesFunction<Env> = async ({ env, params, request }) => {
  const currentName = params.name as string

  // Extract Bearer token
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authorization: Bearer {apiKey} required', 401)
  }
  const apiKey = authHeader.slice(7)

  // Verify agent exists and API key matches
  const agent = await env.DB.prepare(
    'SELECT name, api_key, rename_count FROM agents WHERE name = ?1'
  )
    .bind(currentName)
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

  // ── Handle rename ──
  let finalName = currentName
  if (body.name && body.name !== currentName) {
    const renameCount = (agent.rename_count as number) || 0
    if (renameCount >= 1) {
      return errorResponse('Agent name can only be changed once. No more renames allowed.', 403)
    }
    if (!isValidAgentName(body.name)) {
      return errorResponse('Invalid agent name. Must be 2-50 chars, alphanumeric/hyphens/underscores/spaces.', 400)
    }
    // Check new name is unique
    const clash = await env.DB.prepare('SELECT name FROM agents WHERE name = ?1')
      .bind(body.name)
      .first()
    if (clash) {
      return errorResponse('Agent name already taken', 409)
    }

    finalName = body.name

    // Rename: read old row, insert new, update FKs, delete old
    // (SQLite doesn't allow UPDATE on PK)
    const oldAgent = await env.DB.prepare('SELECT * FROM agents WHERE name = ?1')
      .bind(currentName).first()
    if (!oldAgent) return errorResponse('Agent disappeared during rename', 500)

    // Insert new row with new name
    await env.DB.prepare(
      `INSERT INTO agents (name, owner_username, wallet_address, basename, platform,
                           avatar_url, bio, model, hosting, capabilities, erc8004_url,
                           is_public, edit_token, source, api_key, pairing_code,
                           pairing_code_expires, registration_source, created_at,
                           updated_at, discovered_at, rename_count)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, datetime('now'), ?20, ?21)`
    ).bind(
      finalName,
      oldAgent.owner_username,
      oldAgent.wallet_address,
      oldAgent.basename,
      oldAgent.platform,
      oldAgent.avatar_url,
      oldAgent.bio,
      oldAgent.model,
      oldAgent.hosting,
      oldAgent.capabilities,
      oldAgent.erc8004_url,
      oldAgent.is_public,
      oldAgent.edit_token,
      oldAgent.source,
      oldAgent.api_key,
      oldAgent.pairing_code,
      oldAgent.pairing_code_expires,
      oldAgent.registration_source,
      oldAgent.created_at,
      oldAgent.discovered_at,
      ((oldAgent.rename_count as number) || 0) + 1,
    ).run()

    // Update FKs and delete old row
    await env.DB.batch([
      env.DB.prepare('UPDATE skills SET agent_name = ?1 WHERE agent_name = ?2')
        .bind(finalName, currentName),
      env.DB.prepare('UPDATE agent_pending_bindings SET agent_name = ?1 WHERE agent_name = ?2')
        .bind(finalName, currentName),
      env.DB.prepare('UPDATE activity_log SET entity_id = ?1 WHERE entity_type = \'agent\' AND entity_id = ?2')
        .bind(finalName, currentName),
      env.DB.prepare('DELETE FROM agents WHERE name = ?1')
        .bind(currentName),
    ])

    // Log rename
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'renamed', ?2)`
    ).bind(finalName, JSON.stringify({ from: currentName, to: finalName }))
      .run()
  }

  // ── Build dynamic UPDATE for other fields ──
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
  if (body.hosting !== undefined) {
    updates.push(`hosting = ?${paramIdx}`)
    values.push(body.hosting || null)
    paramIdx++
  }
  if (body.portfolio !== undefined) {
    updates.push(`capabilities = ?${paramIdx}`)
    values.push(JSON.stringify({ portfolio: body.portfolio }))
    paramIdx++
  }

  // Always update updated_at
  updates.push(`updated_at = datetime('now')`)

  const hasFieldUpdates = updates.length > 1
  const hasSkillUpdates = body.skills !== undefined

  if (!hasFieldUpdates && !hasSkillUpdates && finalName === currentName) {
    return errorResponse('No fields to update', 400)
  }

  // Update agent row
  if (hasFieldUpdates) {
    values.push(finalName)
    await env.DB.prepare(
      `UPDATE agents SET ${updates.join(', ')} WHERE name = ?${paramIdx}`
    )
      .bind(...values)
      .run()
  }

  // Replace skills if provided (enhanced: support objects with slug/description/url)
  if (hasSkillUpdates) {
    await env.DB.prepare('DELETE FROM skills WHERE agent_name = ?1')
      .bind(finalName)
      .run()

    if (body.skills && body.skills.length > 0) {
      for (const skill of body.skills) {
        if (typeof skill === 'string') {
          await env.DB.prepare(
            `INSERT INTO skills (agent_name, name, slug, description, url)
             VALUES (?1, ?2, NULL, NULL, NULL)`
          ).bind(finalName, skill).run()
        } else {
          await env.DB.prepare(
            `INSERT INTO skills (agent_name, name, slug, description, url)
             VALUES (?1, ?2, ?3, ?4, ?5)`
          ).bind(
            finalName,
            skill.name,
            skill.slug || null,
            skill.description || null,
            skill.url || null,
          ).run()
        }
      }
    }
  }

  // Check remaining rename ability
  const currentRenameCount = finalName !== currentName
    ? ((agent.rename_count as number) || 0) + 1
    : ((agent.rename_count as number) || 0)
  const renameAvailable = currentRenameCount < 1

  return json({
    name: finalName,
    renamed: finalName !== currentName,
    updated: true,
    rename: {
      available: renameAvailable,
      used: currentRenameCount,
      max: 1,
      info: renameAvailable
        ? 'ℹ️ You can rename your agent once. Use your real identity name (from IDENTITY.md), ENS/Basename, X handle, or Moltbook handle. Choose carefully — this cannot be undone.'
        : '⚠️ Rename has been used. No more renames allowed.',
    },
    ...(finalName !== currentName ? { previousName: currentName } : {}),
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
