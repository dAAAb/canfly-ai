/**
 * POST /api/agents/:name/reconfigure — Owner-initiated config repair
 *
 * Re-runs the config.patch + gateway token sync on an existing Zeabur
 * deployment. Use when a deployment is in status='failed' (CONFIG_PATCH_FAILED,
 * CHAT_ENDPOINT_DEAD, NO_GATEWAY_TOKEN) or when chat reports NEEDS_RECONFIGURE.
 *
 * Auth: agent owner (Privy JWT / X-Wallet-Address / X-Edit-Token)
 *
 * Shares its core flow with /api/zeabur/retry via lib/reconfigure-core.ts.
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'
import { runReconfigure, type ReconfigureDeploymentRow } from '../../../lib/reconfigure-core'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const agent = await env.DB.prepare(
    'SELECT name, owner_username FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ name: string; owner_username: string | null }>()
  if (!agent) return errorResponse('Agent not found', 404)
  if (agent.owner_username !== auth.username) return errorResponse('Not authorized', 403)

  const deployment = await env.DB.prepare(
    `SELECT id, zeabur_project_id, zeabur_service_id, deploy_url, status, metadata, phase_data, agent_name
     FROM v3_zeabur_deployments WHERE agent_name = ?1
     ORDER BY created_at DESC LIMIT 1`
  ).bind(agentName).first<ReconfigureDeploymentRow>()
  if (!deployment) return errorResponse('No Zeabur deployment found for this agent', 404)

  const result = await runReconfigure(env, deployment, auth.username)

  return json({
    agentName,
    success: result.success,
    patchMethod: result.patchMethod,
    patchError: result.patchError,
    chatReady: result.chatReady,
    tokenStored: result.tokenStored,
    status: result.status,
    errorMessage: result.errorMessage,
  })
}
