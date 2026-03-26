/**
 * GET /api/agents/:name/tasks/generate-id — Generate a bytes32-compatible task ID
 *
 * CAN-235: Returns a random bytes32 hex string that can be used both:
 * - On-chain as the taskId parameter in TaskEscrow.deposit()
 * - Off-chain as the task_id parameter in POST /tasks
 *
 * This ensures the on-chain Deposited event taskId matches the DB task.id.
 */
import { type Env, json, errorResponse, handleOptions } from '../../../community/_helpers'

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const agentName = params.name as string

  // Verify agent exists
  const agent = await env.DB.prepare(
    'SELECT name, is_public FROM agents WHERE name = ?1'
  ).bind(agentName).first()

  if (!agent) return errorResponse('Agent not found', 404)
  if (agent.is_public === 0) return errorResponse('Agent profile is private', 403)

  // Generate a random 32-byte value as 0x-prefixed hex (bytes32 compatible)
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const taskId = '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

  return json({ task_id: taskId })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
