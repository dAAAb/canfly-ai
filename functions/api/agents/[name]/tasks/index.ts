/**
 * POST /api/agents/:name/tasks — Create a new task (order a skill)
 * GET  /api/agents/:name/tasks — List completed public tasks
 *
 * Part of the A2A Task Protocol (CAN-204).
 */
import { type Env, json, errorResponse, handleOptions, parseBody, intParam } from '../../../community/_helpers'

interface CreateTaskBody {
  skill: string           // skill name or slug
  params?: Record<string, unknown>
  buyer?: string          // buyer agent name
  buyer_email?: string    // buyer email / basemail
  payment_tx?: string     // on-chain tx hash (optional at creation)
  payment_method?: string // 'usdc_base' | 'basemail'
}

function generateTaskId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return 'task_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  // Verify agent exists and is public
  const agent = await env.DB.prepare(
    'SELECT name, wallet_address, is_public FROM agents WHERE name = ?1'
  ).bind(agentName).first()

  if (!agent) return errorResponse('Agent not found', 404)
  if (agent.is_public === 0) return errorResponse('Agent profile is private', 403)

  const body = await parseBody<CreateTaskBody>(request)
  if (!body) return errorResponse('Invalid request body', 400)
  if (!body.skill) return errorResponse('Missing required field: skill', 400)

  // Find the skill (match by name or slug)
  const skill = await env.DB.prepare(
    `SELECT id, name, slug, type, price, currency, payment_methods, sla
     FROM skills WHERE agent_name = ?1 AND (name = ?2 OR slug = ?2)`
  ).bind(agentName, body.skill).first()

  if (!skill) return errorResponse(`Skill not found: ${body.skill}`, 404)
  if (skill.type !== 'purchasable') return errorResponse('This skill is not purchasable', 400)

  const taskId = generateTaskId()
  const amount = skill.price as number | null
  const currency = (skill.currency as string) || 'USDC'

  await env.DB.prepare(
    `INSERT INTO tasks (id, buyer_agent, buyer_email, seller_agent, skill_name, params,
                        status, payment_method, payment_chain, payment_tx,
                        amount, currency, channel)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
  ).bind(
    taskId,
    body.buyer || null,
    body.buyer_email || null,
    agentName,
    skill.name,
    body.params ? JSON.stringify(body.params) : null,
    'pending_payment',
    body.payment_method || 'usdc_base',
    'base',
    body.payment_tx || null,
    amount,
    currency,
    'api',
  ).run()

  // Build payment info from agent wallet
  const walletAddress = agent.wallet_address as string | null
  const payment = walletAddress ? {
    amount,
    currency,
    chain: 'base',
    to: walletAddress,
  } : null

  return json({
    task_id: taskId,
    status: 'pending_payment',
    skill: skill.name,
    sla: skill.sla || null,
    payment,
    next_steps: {
      pay: `Send ${payment.amount} ${payment.currency} to ${payment.to} on ${payment.chain}`,
      verify: `POST /api/agents/${agentName}/tasks/${taskId}/verify-payment`,
      verify_body: '{"tx_hash": "0x..."}',
      check_status: `GET /api/agents/${agentName}/tasks/${taskId}`,
    },
  }, 201)
}

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string
  const url = new URL(request.url)
  const limit = intParam(url, 'limit', 20)
  const offset = intParam(url, 'offset', 0)

  // Verify agent exists
  const agent = await env.DB.prepare(
    'SELECT name, is_public FROM agents WHERE name = ?1'
  ).bind(agentName).first()

  if (!agent) return errorResponse('Agent not found', 404)
  if (agent.is_public === 0) return errorResponse('Agent profile is private', 403)

  // List all tasks (public transaction history)
  const statusFilter = url.searchParams.get('status') // optional filter: completed, paid, pending_payment, all
  const statusClause = statusFilter && statusFilter !== 'all'
    ? `AND status = '${statusFilter.replace(/[^a-z_]/g, '')}'`
    : ''

  const result = await env.DB.prepare(
    `SELECT id, buyer_agent, buyer_email, skill_name, status, amount, currency,
            payment_tx, payment_chain, channel, result_url,
            created_at, paid_at, completed_at
     FROM tasks
     WHERE seller_agent = ?1 ${statusClause}
     ORDER BY created_at DESC
     LIMIT ?2 OFFSET ?3`
  ).bind(agentName, limit, offset).all()

  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM tasks
     WHERE seller_agent = ?1 ${statusClause}`
  ).bind(agentName).first()

  return json({
    agent: agentName,
    tasks: result.results.map((t) => ({
      id: t.id,
      buyer: t.buyer_agent || null,
      buyer_email: t.buyer_email || null,
      skill: t.skill_name,
      status: t.status,
      amount: t.amount,
      currency: t.currency,
      payment_tx: t.payment_tx || null,
      payment_chain: t.payment_chain || null,
      channel: t.channel,
      result_url: t.status === 'completed' ? (t.result_url || null) : null,
      created_at: t.created_at,
      paid_at: t.paid_at || null,
      completed_at: t.completed_at || null,
      basescan_url: t.payment_tx ? `https://basescan.org/tx/${t.payment_tx}` : null,
    })),
    total: (countResult?.total as number) || 0,
    limit,
    offset,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
