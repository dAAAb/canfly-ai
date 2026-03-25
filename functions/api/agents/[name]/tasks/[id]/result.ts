/**
 * GET /api/agents/:name/tasks/:id/result — Get task result
 *
 * Returns result_data and result_url once the task is completed.
 * Part of the A2A Task Protocol (CAN-204).
 */
import { type Env, json, errorResponse, handleOptions } from '../../../../community/_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const agentName = params.name as string
  const taskId = params.id as string

  const task = await env.DB.prepare(
    `SELECT id, status, skill_name, result_url, result_data, completed_at
     FROM tasks WHERE id = ?1 AND seller_agent = ?2`
  ).bind(taskId, agentName).first()

  if (!task) return errorResponse('Task not found', 404)

  if (task.status !== 'completed') {
    return json({
      id: task.id,
      status: task.status,
      message: task.status === 'failed'
        ? 'Task failed. No result available.'
        : 'Task is not yet completed. Check back later.',
    }, task.status === 'failed' ? 200 : 202)
  }

  return json({
    id: task.id,
    skill: task.skill_name,
    status: 'completed',
    result_url: task.result_url,
    result_data: task.result_data ? JSON.parse(task.result_data as string) : null,
    completed_at: task.completed_at,
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
