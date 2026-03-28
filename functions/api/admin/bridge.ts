/**
 * Paperclip Bridge API — CAN-253
 *
 * POST /api/admin/bridge          — create a bridge mapping (shadow or active)
 * GET  /api/admin/bridge           — list mappings (filter: ?mode=shadow&status=pending&limit=50)
 * GET  /api/admin/bridge?taskId=N  — get mapping for a specific CanFly task
 *
 * Auth: admin only (Bearer CRON_SECRET)
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  parseBody,
  intParam,
} from '../community/_helpers'
import {
  createMapping,
  getMappingByTaskId,
  listMappings,
  type BridgeMappingInput,
  type MappingRule,
} from '../../lib/paperclipBridge'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

const VALID_RULES: MappingRule[] = ['job_to_epic', 'step_to_subtask', 'manual']

function requireAdmin(request: Request, env: Env): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return 'Authorization required'
  const token = authHeader.slice(7)
  if (!env.CRON_SECRET || token !== env.CRON_SECRET) return 'Forbidden'
  return null
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const authError = requireAdmin(request, env)
  if (authError) return errorResponse(authError, authError === 'Forbidden' ? 403 : 401)

  const body = await parseBody<{
    canflyTaskId: number
    canflyTaskType?: 'task' | 'epic' | 'subtask'
    mappingRule: MappingRule
    canflyPayload: Record<string, unknown>
    paperclipParentId?: string
  }>(request)

  if (!body || typeof body.canflyTaskId !== 'number') {
    return errorResponse('Body must include canflyTaskId (number)', 400)
  }
  if (!body.mappingRule || !VALID_RULES.includes(body.mappingRule)) {
    return errorResponse(`mappingRule must be one of: ${VALID_RULES.join(', ')}`, 400)
  }
  if (!body.canflyPayload || typeof body.canflyPayload !== 'object') {
    return errorResponse('canflyPayload must be an object', 400)
  }

  try {
    const result = await createMapping(env, body as BridgeMappingInput)
    return json(result, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('UNIQUE constraint')) {
      return errorResponse('Mapping already exists for this task and rule', 409)
    }
    return errorResponse(message, 400)
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const authError = requireAdmin(request, env)
  if (authError) return errorResponse(authError, authError === 'Forbidden' ? 403 : 401)

  const url = new URL(request.url)
  const taskId = url.searchParams.get('taskId')

  if (taskId) {
    const id = parseInt(taskId, 10)
    if (isNaN(id)) return errorResponse('taskId must be a number', 400)

    const mapping = await getMappingByTaskId(env, id)
    if (!mapping) return errorResponse('No mapping found for this task', 404)
    return json({ mapping })
  }

  const result = await listMappings(env, {
    bridgeMode: url.searchParams.get('mode') || undefined,
    syncStatus: url.searchParams.get('status') || undefined,
    limit: intParam(url, 'limit', 50),
    offset: intParam(url, 'offset', 0),
  })

  return json(result)
}
