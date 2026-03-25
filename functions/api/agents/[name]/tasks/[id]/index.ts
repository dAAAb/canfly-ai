/**
 * GET /api/agents/:name/tasks/:id — Get task status
 *
 * Part of the A2A Task Protocol (CAN-204).
 */
import { type Env, json, errorResponse, handleOptions } from '../../../../community/_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const agentName = params.name as string
  const taskId = params.id as string

  const task = await env.DB.prepare(
    `SELECT id, buyer_agent, buyer_email, seller_agent, skill_name, params,
            status, payment_method, payment_chain, payment_tx,
            amount, currency, channel, result_url, result_data,
            created_at, started_at, paid_at, completed_at
     FROM tasks WHERE id = ?1 AND seller_agent = ?2`
  ).bind(taskId, agentName).first()

  if (!task) return errorResponse('Task not found', 404)

  // Calculate execution time if completed
  const startTime = task.started_at || task.paid_at || task.created_at
  const executionMs = startTime && task.completed_at
    ? new Date(task.completed_at as string).getTime() - new Date(startTime as string).getTime()
    : null

  return json({
    id: task.id,
    seller: task.seller_agent,
    buyer: task.buyer_agent,
    buyer_email: task.buyer_email,
    skill: task.skill_name,
    params: task.params ? JSON.parse(task.params as string) : null,
    status: task.status,
    payment: {
      method: task.payment_method,
      chain: task.payment_chain,
      tx: task.payment_tx,
      amount: task.amount,
      currency: task.currency,
    },
    channel: task.channel,
    created_at: task.created_at,
    started_at: task.started_at,
    paid_at: task.paid_at,
    completed_at: task.completed_at,
    execution_time_ms: executionMs,
    result_url: task.result_url || null,
    result_data: task.result_data ? JSON.parse(task.result_data as string) : null,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
