/**
 * GET /api/agents/:name/tasks/:id — Get task status
 *
 * Part of the A2A Task Protocol (CAN-204).
 * CAN-280: Auth required — seller, buyer wallet, or buyer agent.
 */
import { type Env, json, errorResponse, handleOptions } from '../../../../community/_helpers'
import { checkTaskAuth } from '../../../../../lib/task-auth'

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string
  const taskId = params.id as string

  const task = await env.DB.prepare(
    `SELECT id, buyer_agent, buyer_email, buyer_wallet, seller_agent, skill_name, params,
            status, payment_method, payment_chain, payment_tx,
            amount, currency, channel, result_url, result_data,
            result_preview, result_note,
            escrow_tx, escrow_status, sla_deadline, confirmed_at, rejected_at, reject_reason,
            created_at, started_at, paid_at, completed_at
     FROM tasks WHERE id = ?1 AND seller_agent = ?2`
  ).bind(taskId, agentName).first()

  if (!task) return errorResponse('Task not found', 404)

  // CAN-280: Auth guard
  const auth = await checkTaskAuth(env, request, agentName, {
    buyer_agent: task.buyer_agent as string | null,
    buyer_wallet: task.buyer_wallet as string | null,
  })
  if (!auth.authorized) return errorResponse('Forbidden', 403)

  // Calculate execution time if completed
  const startTime = task.started_at || task.paid_at || task.created_at
  const executionMs = startTime && task.completed_at
    ? new Date(task.completed_at as string).getTime() - new Date(startTime as string).getTime()
    : null

  const escrowInfo = task.escrow_tx ? {
    escrow: {
      tx: task.escrow_tx,
      status: task.escrow_status || 'none',
      sla_deadline: task.sla_deadline || null,
      confirmed_at: task.confirmed_at || null,
      rejected_at: task.rejected_at || null,
      reject_reason: task.reject_reason || null,
    },
  } : {}

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
    ...escrowInfo,
    channel: task.channel,
    created_at: task.created_at,
    started_at: task.started_at,
    paid_at: task.paid_at,
    completed_at: task.completed_at,
    execution_time_ms: executionMs,
    result_url: task.result_url || null,
    result_preview: task.result_preview || null,
    result_note: task.result_note || null,
    result_data: task.result_data ? JSON.parse(task.result_data as string) : null,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
