/**
 * PUT /api/agents/:name/agent-card — Layer 3: Upload complete A2A Agent Card JSON
 *
 * Agents can upload a full A2A-compliant Agent Card JSON.
 * CanFly validates required fields, stores the override, and syncs
 * relevant fields back to the DB (bi-directional sync).
 *
 * GET is handled by agent-card.json.ts (the auto-generation endpoint).
 * When agent_card_override exists, it takes priority over auto-generated fields.
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../community/_helpers'

interface A2AAgentCard {
  name: string
  description?: string
  url?: string
  version?: string
  provider?: { organization?: string; url?: string }
  capabilities?: {
    streaming?: boolean
    pushNotifications?: boolean
    [key: string]: unknown
  }
  defaultInputModes?: string[]
  defaultOutputModes?: string[]
  skills?: Array<{
    id: string
    name: string
    description?: string
    tags?: string[]
    [key: string]: unknown
  }>
  authentication?: {
    schemes?: string[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

function validateA2ACard(card: A2AAgentCard): string | null {
  if (!card.name || typeof card.name !== 'string') {
    return 'Agent Card must have a "name" field (string)'
  }
  if (card.skills && !Array.isArray(card.skills)) {
    return '"skills" must be an array'
  }
  if (card.skills) {
    for (let i = 0; i < card.skills.length; i++) {
      const skill = card.skills[i]
      if (!skill.id || !skill.name) {
        return `skills[${i}] must have "id" and "name" fields`
      }
    }
  }
  if (card.defaultInputModes && !Array.isArray(card.defaultInputModes)) {
    return '"defaultInputModes" must be an array of MIME types'
  }
  if (card.defaultOutputModes && !Array.isArray(card.defaultOutputModes)) {
    return '"defaultOutputModes" must be an array of MIME types'
  }
  if (card.authentication?.schemes && !Array.isArray(card.authentication.schemes)) {
    return '"authentication.schemes" must be an array'
  }
  return null
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
    'SELECT name, api_key, capabilities FROM agents WHERE name = ?1'
  )
    .bind(name)
    .first()

  if (!agent) return errorResponse('Agent not found', 404)
  if (!agent.api_key || agent.api_key !== apiKey) return errorResponse('Invalid API key', 403)

  const card = await parseBody<A2AAgentCard>(request)
  if (!card) return errorResponse('Invalid JSON body', 400)

  // Validate A2A schema
  const validationError = validateA2ACard(card)
  if (validationError) return errorResponse(validationError, 400)

  // ── Store the full override (Layer 3) ──
  await env.DB.prepare(
    `UPDATE agents SET agent_card_override = ?1, updated_at = datetime('now') WHERE name = ?2`
  )
    .bind(JSON.stringify(card), name)
    .run()

  // ── Bi-directional sync: extract fields back into DB ──
  const syncUpdates: string[] = []
  const syncValues: unknown[] = []
  let paramIdx = 1

  // Sync description → bio
  if (card.description !== undefined) {
    syncUpdates.push(`bio = ?${paramIdx}`)
    syncValues.push(card.description)
    paramIdx++
  }

  // Sync capabilities back into the capabilities JSON column (Layer 2)
  const existingCaps = JSON.parse((agent.capabilities as string) || '{}')
  let capsChanged = false

  if (card.capabilities?.streaming !== undefined) {
    existingCaps.streaming = card.capabilities.streaming
    capsChanged = true
  }
  if (card.capabilities?.pushNotifications !== undefined) {
    existingCaps.pushNotifications = card.capabilities.pushNotifications
    capsChanged = true
  }
  if (card.defaultInputModes) {
    existingCaps.defaultInputModes = card.defaultInputModes
    capsChanged = true
  }
  if (card.defaultOutputModes) {
    existingCaps.defaultOutputModes = card.defaultOutputModes
    capsChanged = true
  }
  if (card.authentication?.schemes) {
    existingCaps.auth_schemes = card.authentication.schemes
    capsChanged = true
  }

  if (capsChanged) {
    syncUpdates.push(`capabilities = ?${paramIdx}`)
    syncValues.push(JSON.stringify(existingCaps))
    paramIdx++
  }

  // Sync skills → skills table
  if (card.skills && card.skills.length > 0) {
    await env.DB.prepare('DELETE FROM skills WHERE agent_name = ?1')
      .bind(name)
      .run()

    for (const skill of card.skills) {
      const skillType = (skill as Record<string, unknown>).type === 'purchasable' ? 'purchasable' : 'free'
      const price = (skill as Record<string, unknown>).price != null
        ? parseFloat(String((skill as Record<string, unknown>).price))
        : null
      const currency = ((skill as Record<string, unknown>).currency as string) || null
      const paymentMethods = (skill as Record<string, unknown>).paymentMethods
        ? JSON.stringify((skill as Record<string, unknown>).paymentMethods)
        : null
      const sla = ((skill as Record<string, unknown>).sla as string) || null

      await env.DB.prepare(
        `INSERT INTO skills (agent_name, name, slug, description, url, type, price, currency, payment_methods, sla)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
      ).bind(
        name,
        skill.name,
        skill.id,
        skill.description || null,
        (skill as Record<string, unknown>).url as string || null,
        skillType,
        price,
        currency,
        paymentMethods,
        sla,
      ).run()
    }
  }

  // Apply sync updates to agents table
  if (syncUpdates.length > 0) {
    syncValues.push(name)
    await env.DB.prepare(
      `UPDATE agents SET ${syncUpdates.join(', ')} WHERE name = ?${paramIdx}`
    )
      .bind(...syncValues)
      .run()
  }

  return json({
    name,
    stored: true,
    layer: 3,
    synced: {
      bio: card.description !== undefined,
      capabilities: capsChanged,
      skills: card.skills ? card.skills.length : 0,
    },
    info: 'Full A2A Agent Card stored. Fields synced back to DB. GET /agent-card.json will use this override.',
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
