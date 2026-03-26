/**
 * POST /api/agents/:name/tasks/:id/rate — Buyer rates seller after confirmed delivery
 *
 * Rules:
 * - Only confirmed tasks (escrow_status = 'released') can be rated
 * - Each task can only be rated once
 * - Triggers trust_score recalculation
 *
 * CAN-218: Buyer rating API
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../../../community/_helpers'
import { recalcTrustScore } from '../../../_trust'

interface RateBody {
  score: number    // 1-5
  comment?: string // Optional review text
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string
  const taskId = params.id as string

  // Auth: Bearer {apiKey} — buyer authenticates
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('Authorization: Bearer {apiKey} required', 401)
  }
  const apiKey = authHeader.slice(7)

  // Get task
  const task = await env.DB.prepare(
    `SELECT id, buyer_agent, seller_agent, status, escrow_status, confirmed_at
     FROM tasks WHERE id = ?1 AND seller_agent = ?2`
  ).bind(taskId, agentName).first()

  if (!task) return errorResponse('Task not found', 404)

  // Verify buyer identity via API key
  if (!task.buyer_agent) return errorResponse('Task has no buyer agent', 400)

  const buyer = await env.DB.prepare(
    'SELECT name, api_key FROM agents WHERE name = ?1'
  ).bind(task.buyer_agent).first()

  if (!buyer) return errorResponse('Buyer agent not found', 404)
  if (!buyer.api_key || buyer.api_key !== apiKey) return errorResponse('Invalid API key — only the buyer can rate', 403)

  // Validate task state: must be confirmed (escrow released)
  if (task.escrow_status !== 'released') {
    return errorResponse(
      `Cannot rate: task escrow status is "${task.escrow_status}". Task must be confirmed (escrow released) before rating.`,
      400,
    )
  }

  // Parse and validate body
  const body = await parseBody<RateBody>(request)
  if (!body || typeof body.score !== 'number') {
    return errorResponse('Missing required field: score (1-5)', 400)
  }

  const score = Math.round(body.score)
  if (score < 1 || score > 5) {
    return errorResponse('score must be between 1 and 5', 400)
  }

  const comment = body.comment ? String(body.comment).trim().slice(0, 1000) : null

  // Check for duplicate rating
  const existing = await env.DB.prepare(
    `SELECT id FROM ratings WHERE task_id = ?1 AND rater_agent = ?2`
  ).bind(taskId, task.buyer_agent as string).first()

  if (existing) {
    return errorResponse('This task has already been rated by you', 409)
  }

  // Generate rating ID
  const ratingId = crypto.randomUUID()

  // Insert rating
  await env.DB.prepare(
    `INSERT INTO ratings (id, task_id, rater_agent, rated_agent, role, score, comment)
     VALUES (?1, ?2, ?3, ?4, 'buyer', ?5, ?6)`
  ).bind(ratingId, taskId, task.buyer_agent as string, agentName, score, comment).run()

  // Recalculate seller trust score (CAN-220)
  const trustScore = await recalcTrustScore(env, agentName)

  return json({
    id: ratingId,
    task_id: taskId,
    rated_agent: agentName,
    score,
    comment,
    trust_score: trustScore,
    created_at: new Date().toISOString(),
  }, 201)
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
