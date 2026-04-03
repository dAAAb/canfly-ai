/**
 * PUT  /api/agents/:name/skills/:slug — Create or update a single skill
 * DELETE /api/agents/:name/skills/:slug — Delete a skill
 *
 * Auth: Bearer {apiKey} OR X-Edit-Token (agent's edit_token)
 *
 * PUT body fields:
 *   name         (string, required on create)
 *   description  (string, optional)
 *   url          (string, optional)
 *   type         ('free' | 'purchasable', default 'free')
 *   price        (number, optional)
 *   currency     (string, optional — e.g. 'USDC')
 *   sla          (string, optional — e.g. '5 minutes')
 *   payment_methods (string[] | string, optional)
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../../community/_helpers'

interface SkillBody {
  name?: string
  description?: string | null
  url?: string | null
  type?: string
  price?: number | null
  currency?: string | null
  sla?: string | null
  payment_methods?: string | string[] | null
}

/** Authenticate agent by Bearer apiKey or X-Edit-Token */
async function authenticateAgent(
  request: Request,
  db: D1Database,
  agentName: string,
): Promise<{ agent: Record<string, unknown> } | Response> {
  const authHeader = request.headers.get('Authorization')
  const editToken = request.headers.get('X-Edit-Token')

  if (!authHeader && !editToken) {
    return errorResponse('Authorization: Bearer {apiKey} or X-Edit-Token required', 401)
  }

  const agent = await db
    .prepare('SELECT name, api_key, edit_token FROM agents WHERE name = ?1')
    .bind(agentName)
    .first()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }

  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) {
      return errorResponse('Invalid Authorization header format', 401)
    }
    const apiKey = authHeader.slice(7)
    if (!agent.api_key || agent.api_key !== apiKey) {
      return errorResponse('Invalid API key', 403)
    }
  } else if (editToken) {
    if (!agent.edit_token || agent.edit_token !== editToken) {
      return errorResponse('Invalid edit token', 403)
    }
  }

  return { agent }
}

export const onRequestPut: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string
  const slug = params.slug as string

  const authResult = await authenticateAgent(request, env.DB, agentName)
  if (authResult instanceof Response) return authResult

  const body = await parseBody<SkillBody>(request)
  if (!body) {
    return errorResponse('Invalid request body', 400)
  }

  // Validate type if provided
  if (body.type && body.type !== 'free' && body.type !== 'purchasable') {
    return errorResponse('type must be "free" or "purchasable"', 400)
  }

  // Validate purchasable skills: require price + currency, auto-fill payment_methods
  if (body.type === 'purchasable') {
    if (!body.price || body.price <= 0) {
      return errorResponse('purchasable skills require a price > 0', 400)
    }
    if (!body.currency) {
      body.currency = 'USDC'
    }
    if (!body.payment_methods) {
      body.payment_methods = ['USDC (Base)']
    }
  }

  // Check if skill exists
  const existing = await env.DB.prepare(
    'SELECT id, name FROM skills WHERE agent_name = ?1 AND slug = ?2',
  )
    .bind(agentName, slug)
    .first()

  const paymentMethods = body.payment_methods
    ? typeof body.payment_methods === 'string'
      ? body.payment_methods
      : JSON.stringify(body.payment_methods)
    : null

  if (existing) {
    // Update existing skill
    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (body.name !== undefined) {
      updates.push(`name = ?${idx}`)
      values.push(body.name)
      idx++
    }
    if (body.description !== undefined) {
      updates.push(`description = ?${idx}`)
      values.push(body.description)
      idx++
    }
    if (body.url !== undefined) {
      updates.push(`url = ?${idx}`)
      values.push(body.url)
      idx++
    }
    if (body.type !== undefined) {
      updates.push(`type = ?${idx}`)
      values.push(body.type)
      idx++
    }
    if (body.price !== undefined) {
      updates.push(`price = ?${idx}`)
      values.push(body.price)
      idx++
    }
    if (body.currency !== undefined) {
      updates.push(`currency = ?${idx}`)
      values.push(body.currency)
      idx++
    }
    if (body.sla !== undefined) {
      updates.push(`sla = ?${idx}`)
      values.push(body.sla)
      idx++
    }
    if (body.payment_methods !== undefined) {
      updates.push(`payment_methods = ?${idx}`)
      values.push(paymentMethods)
      idx++
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400)
    }

    values.push(existing.id)
    await env.DB.prepare(`UPDATE skills SET ${updates.join(', ')} WHERE id = ?${idx}`)
      .bind(...values)
      .run()

    const updated = await env.DB.prepare('SELECT * FROM skills WHERE id = ?1')
      .bind(existing.id)
      .first()

    return json({ skill: formatSkill(updated), created: false, updated: true })
  } else {
    // Create new skill — name is required
    const skillName = body.name
    if (!skillName) {
      return errorResponse('name is required when creating a new skill', 400)
    }

    await env.DB.prepare(
      `INSERT INTO skills (agent_name, name, slug, description, url, type, price, currency, payment_methods, sla)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    )
      .bind(
        agentName,
        skillName,
        slug,
        body.description || null,
        body.url || null,
        body.type || 'free',
        body.price ?? null,
        body.currency || null,
        paymentMethods,
        body.sla || null,
      )
      .run()

    const created = await env.DB.prepare(
      'SELECT * FROM skills WHERE agent_name = ?1 AND slug = ?2',
    )
      .bind(agentName, slug)
      .first()

    return json({ skill: formatSkill(created), created: true, updated: false }, 201)
  }
}

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string
  const slug = params.slug as string

  const authResult = await authenticateAgent(request, env.DB, agentName)
  if (authResult instanceof Response) return authResult

  const existing = await env.DB.prepare(
    'SELECT id FROM skills WHERE agent_name = ?1 AND slug = ?2',
  )
    .bind(agentName, slug)
    .first()

  if (!existing) {
    return errorResponse('Skill not found', 404)
  }

  await env.DB.prepare('DELETE FROM skills WHERE id = ?1').bind(existing.id).run()

  return json({ deleted: true, slug })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()

/** Format a skill row into a clean response object */
function formatSkill(row: Record<string, unknown> | null) {
  if (!row) return null
  let pm = row.payment_methods
  if (typeof pm === 'string') {
    try {
      pm = JSON.parse(pm)
    } catch {
      // leave as string
    }
  }
  return {
    id: row.id,
    agent_name: row.agent_name,
    name: row.name,
    slug: row.slug,
    description: row.description,
    url: row.url,
    type: row.type || 'free',
    price: row.price,
    currency: row.currency,
    sla: row.sla,
    payment_methods: pm,
  }
}
