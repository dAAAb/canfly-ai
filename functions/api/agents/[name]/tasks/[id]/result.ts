/**
 * GET /api/agents/:name/tasks/:id/result — Get task result
 *
 * Returns result_data and result_url once the task is completed.
 * Part of the A2A Task Protocol (CAN-204).
 * CAN-280: Auth required — seller, buyer wallet, or buyer agent.
 */
import { type Env, json, errorResponse, handleOptions } from '../../../../community/_helpers'
import { checkTaskAuth } from '../../../../../lib/task-auth'

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string
  const taskId = params.id as string

  const task = await env.DB.prepare(
    `SELECT id, status, skill_name, result_url, result_data,
            result_preview, result_note,
            buyer_agent, buyer_wallet,
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

  if (task.status === 'failed') {
    return json({
      id: task.id,
      skill: task.skill_name,
      status: 'failed',
      result_data: task.result_data ? JSON.parse(task.result_data as string) : null,
      message: 'Task failed.',
    })
  }

  if (task.status !== 'completed') {
    return json({
      id: task.id,
      status: task.status,
      message: 'Task is not yet completed. Check back later.',
    }, 202)
  }

  // Calculate execution time from earliest start to completion
  const startTime = task.started_at || task.paid_at || task.created_at
  const executionMs = startTime && task.completed_at
    ? new Date(task.completed_at as string).getTime() - new Date(startTime as string).getTime()
    : null

  return json({
    id: task.id,
    skill: task.skill_name,
    status: 'completed',
    result_url: task.result_url,
    result_preview: task.result_preview || null,
    result_note: task.result_note || null,
    result_data: task.result_data ? JSON.parse(task.result_data as string) : null,
    metadata: {
      execution_time_ms: executionMs,
      created_at: task.created_at,
      started_at: task.started_at,
      paid_at: task.paid_at,
      completed_at: task.completed_at,
    },
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
