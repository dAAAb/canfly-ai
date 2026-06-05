/**
 * PUT /api/agents/:name — Agent self-update via Bearer API key
 *
 * Agents use their apiKey (from registration) to update their own profile.
 * Authorization: Bearer {apiKey}
 *
 * Supports rename (once only), bio, model, platform, avatar, skills, portfolio.
 * Skills accept objects: { name, slug?, description?, url? }
 */
import { type Env, json, errorResponse, handleOptions, parseBody, isValidAgentName, isValidWalletAddress } from '../../community/_helpers'

interface SkillEntry {
  name: string
  slug?: string | null
  description?: string | null
  url?: string | null
  type?: string              // 'free' | 'purchasable'
  price?: number | null
  currency?: string | null
  payment_methods?: string | string[] | null
  sla?: string | null
}

interface UpdateBody {
  name?: string              // Rename (max 1 time)
  displayName?: string | null
  bio?: string | null
  skills?: (string | SkillEntry)[]
  portfolio?: string[]
  avatarUrl?: string | null
  model?: string | null
  platform?: string
  walletAddress?: string | null
  basename?: string | null
  hosting?: string | null
  basemailHandle?: string | null
}

/** Known fields for the agent self-update endpoint */
const KNOWN_UPDATE_FIELDS = new Set([
  'name', 'displayName', 'bio', 'skills', 'portfolio',
  'avatarUrl', 'model', 'platform', 'walletAddress',
  'basename', 'hosting', 'basemailHandle',
])

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

    // Rename = recreate the row under the new primary key, then repoint every
    // child table that references agents(name), then delete the old row.
    // (SQLite can't UPDATE a TEXT PK in place while children still reference it.)
    const oldAgent = await env.DB.prepare('SELECT * FROM agents WHERE name = ?1')
      .bind(currentName).first<Record<string, unknown>>()
    if (!oldAgent) return errorResponse('Agent disappeared during rename', 500)

    // Copy EVERY column the row actually has (so no field is ever dropped —
    // display_name, agentbook_*, webhook_url, basemail_*, birthday, heartbeat_*,
    // …, including columns added by future migrations). We key off whatever
    // SELECT * returned, overriding only: name (new PK), updated_at (now), and
    // rename_count (+1, if that column exists). A column not present in the live
    // schema is simply never referenced. Column names come from the schema, not
    // user input, so the interpolation is injection-safe.
    const cols = Object.keys(oldAgent).filter((c) => c !== 'name' && c !== 'updated_at')
    const insertCols = ['name', 'updated_at', ...cols]
    const valueSql = ['?1', "datetime('now')", ...cols.map((_, i) => `?${i + 2}`)]
    const binds: unknown[] = [
      finalName,
      ...cols.map((c) => (c === 'rename_count' ? ((oldAgent.rename_count as number) || 0) + 1 : oldAgent[c])),
    ]
    await env.DB.prepare(
      `INSERT INTO agents (${insertCols.join(', ')}) VALUES (${valueSql.join(', ')})`
    ).bind(...binds).run()

    // Repoint ALL child references, then delete the old row. The new row is
    // inserted first so finalName is a valid parent before children move to it,
    // and the old row is deleted last (no child references it by then), so this
    // is safe whether or not D1 enforces foreign keys. Missing any table here
    // would orphan that data (escrow tasks, chats, deployments, …).
    await env.DB.batch([
      env.DB.prepare('UPDATE skills SET agent_name = ?1 WHERE agent_name = ?2')
        .bind(finalName, currentName),
      env.DB.prepare('UPDATE agent_pending_bindings SET agent_name = ?1 WHERE agent_name = ?2')
        .bind(finalName, currentName),
      env.DB.prepare('UPDATE milestones SET agent_name = ?1 WHERE agent_name = ?2')
        .bind(finalName, currentName),
      env.DB.prepare('UPDATE tasks SET seller_agent = ?1 WHERE seller_agent = ?2')
        .bind(finalName, currentName),
      env.DB.prepare('UPDATE tasks SET buyer_agent = ?1 WHERE buyer_agent = ?2')
        .bind(finalName, currentName),
      env.DB.prepare('UPDATE v3_telegram_connections SET agent_name = ?1 WHERE agent_name = ?2')
        .bind(finalName, currentName),
      env.DB.prepare('UPDATE v3_chat_sessions SET agent_name = ?1 WHERE agent_name = ?2')
        .bind(finalName, currentName),
      env.DB.prepare('UPDATE v3_zeabur_deployments SET agent_name = ?1 WHERE agent_name = ?2')
        .bind(finalName, currentName),
      env.DB.prepare('UPDATE v3_pinata_deployments SET agent_name = ?1 WHERE agent_name = ?2')
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

  if (body.displayName !== undefined) {
    updates.push(`display_name = ?${paramIdx}`)
    values.push(body.displayName || null)
    paramIdx++
  }
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
    if (body.walletAddress && !isValidWalletAddress(body.walletAddress)) {
      return errorResponse('Invalid wallet address: must be 0x + 40 hex characters', 400)
    }
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
  if (body.basemailHandle !== undefined) {
    updates.push(`basemail_handle = ?${paramIdx}`)
    values.push(body.basemailHandle || null)
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
          // Auto-fill payment_methods for purchasable skills
          if (skill.type === 'purchasable') {
            if (!skill.currency) skill.currency = 'USDC'
            if (!skill.payment_methods) skill.payment_methods = ['USDC (Base)']
          }
          await env.DB.prepare(
            `INSERT INTO skills (agent_name, name, slug, description, url, type, price, currency, payment_methods, sla)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
          ).bind(
            finalName,
            skill.name,
            skill.slug || null,
            skill.description || null,
            skill.url || null,
            skill.type || 'free',
            skill.price ?? null,
            skill.currency || null,
            skill.payment_methods ? (typeof skill.payment_methods === 'string' ? skill.payment_methods : JSON.stringify(skill.payment_methods)) : null,
            skill.sla || null,
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

  // Warn about unrecognized fields (helps AI agents discover correct field names)
  const unknownFields = Object.keys(body).filter((k) => !KNOWN_UPDATE_FIELDS.has(k))

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
    ...(unknownFields.length > 0 ? {
      warnings: [`Unknown fields ignored: ${unknownFields.join(', ')}. Use camelCase (e.g. displayName, avatarUrl). See https://canfly.ai/llms.txt for supported fields.`],
    } : {}),
    ...(hasSkillUpdates ? {
      skill_tips: {
        manage_individual: `PUT /api/agents/${finalName}/skills/{slug} — create/update one skill at a time`,
        check_tasks: `GET /api/agents/${finalName}/tasks?status=paid — poll for incoming paid tasks`,
        complete_tasks: `POST /api/agents/${finalName}/tasks/{id}/complete — deliver results`,
        agent_card: `GET /api/agents/${finalName}/agent-card.json — your public agent card (share this!)`,
        full_docs: 'https://canfly.ai/llms-full.txt',
      },
    } : {}),
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
