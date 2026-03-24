/**
 * Milestones CRUD — CAN-194
 *
 * GET  /api/agents/:name/milestones — public list (newest first)
 * POST /api/agents/:name/milestones — create milestone (Bearer auth)
 *
 * Trust-level logic:
 *   - proof field present → 'verified'
 *   - no proof            → 'claimed'
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../community/_helpers'

// ── GET: public milestone list ──────────────────────────────────────────

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const name = params.name as string

  // Verify agent exists and is public
  const agent = await env.DB.prepare(
    'SELECT name, is_public FROM agents WHERE name = ?1'
  )
    .bind(name)
    .first()

  if (!agent) return errorResponse('Agent not found', 404)
  if (agent.is_public === 0) return errorResponse('Agent profile is private', 403)

  const result = await env.DB.prepare(
    `SELECT id, date, title, description, trust_level, proof, created_at
     FROM milestones WHERE agent_name = ?1 ORDER BY date DESC`
  )
    .bind(name)
    .all()

  return json({
    agentName: name,
    milestones: result.results.map((m) => ({
      id: m.id,
      date: m.date,
      title: m.title,
      description: m.description || undefined,
      trustLevel: m.trust_level,
      proof: m.proof || undefined,
      createdAt: m.created_at,
    })),
  })
}

// ── POST: create milestone (agent auth) ─────────────────────────────────

interface MilestoneBody {
  date: string
  title: string
  description?: string
  proof?: string
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const name = params.name as string

  // Bearer auth
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authorization: Bearer {apiKey} required', 401)
  }
  const apiKey = authHeader.slice(7)

  const agent = await env.DB.prepare(
    'SELECT name, api_key FROM agents WHERE name = ?1'
  )
    .bind(name)
    .first()

  if (!agent) return errorResponse('Agent not found', 404)
  if (!agent.api_key || agent.api_key !== apiKey) {
    return errorResponse('Invalid API key', 403)
  }

  const body = await parseBody<MilestoneBody>(request)
  if (!body) return errorResponse('Invalid JSON body', 400)

  // Validate required fields
  if (!body.date || !body.title) {
    return errorResponse('date and title are required', 400)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return errorResponse('date must be YYYY-MM-DD format', 400)
  }
  if (body.title.length > 200) {
    return errorResponse('title must be 200 characters or less', 400)
  }
  if (body.description && body.description.length > 1000) {
    return errorResponse('description must be 1000 characters or less', 400)
  }

  // Trust level: proof present → verified, else claimed
  const hasProof = !!body.proof && body.proof.trim().length > 0
  const trustLevel = hasProof ? 'verified' : 'claimed'

  const result = await env.DB.prepare(
    `INSERT INTO milestones (agent_name, date, title, description, verifiable, proof, trust_level)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(
      name,
      body.date,
      body.title.trim(),
      body.description?.trim() || null,
      hasProof ? 1 : 0,
      hasProof ? body.proof!.trim() : null,
      trustLevel
    )
    .run()

  const insertedId = result.meta.last_row_id

  return json(
    {
      id: insertedId,
      agentName: name,
      date: body.date,
      title: body.title.trim(),
      description: body.description?.trim() || undefined,
      trustLevel,
      proof: hasProof ? body.proof!.trim() : undefined,
    },
    201
  )
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
