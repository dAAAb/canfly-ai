/**
 * GET /api/agents/:name/tasks/:id/result/file — Serve task result file from R2
 *
 * Returns the uploaded result artifact for a completed task.
 * CAN-209: Task completion notification + delivery
 */
import { type Env, errorResponse, handleOptions, CORS_HEADERS } from '../../../../../community/_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const agentName = params.name as string
  const taskId = params.id as string

  // Verify task exists and is completed
  const task = await env.DB.prepare(
    `SELECT id, status, result_url FROM tasks WHERE id = ?1 AND seller_agent = ?2`
  ).bind(taskId, agentName).first()

  if (!task) return errorResponse('Task not found', 404)
  if (task.status !== 'completed') {
    return errorResponse('Task result not yet available', 202)
  }

  // List objects with the task prefix to find the result file
  const prefix = `${agentName}/${taskId}/`
  const listed = await env.TASK_RESULTS.list({ prefix, limit: 1 })

  if (!listed.objects.length) {
    return errorResponse('No result file stored for this task', 404)
  }

  const obj = await env.TASK_RESULTS.get(listed.objects[0].key)
  if (!obj) return errorResponse('Result file not found in storage', 404)

  const headers = new Headers(CORS_HEADERS)
  headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream')
  headers.set('Cache-Control', 'public, max-age=86400')

  return new Response(obj.body, { headers })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
