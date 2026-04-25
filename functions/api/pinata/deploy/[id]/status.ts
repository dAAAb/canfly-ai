/**
 * GET /api/pinata/deploy/:id/status — Read Pinata deployment status (CAN-302)
 *
 * Pinata deploy is synchronous (POST /v0/agents returns immediately), so unlike
 * Zeabur this endpoint isn't a polling target during creation. It exists for:
 *   - Post-creation health/usage checks from the lobster detail page
 *   - Wizard fallback UI in case the synchronous POST somehow returns 202
 *   - Audit / debug
 */
import { type Env, json, errorResponse, handleOptions } from '../../../community/_helpers'
import { authenticateRequest } from '../../../_auth'

interface DeploymentRow {
  id: string
  owner_username: string
  agent_name: string | null
  pinata_agent_id: string | null
  status: string
  deploy_url: string | null
  free_model_id: string
  openrouter_key_hash: string | null
  error_code: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) => {
  const deploymentId = params.id as string
  if (!deploymentId) return errorResponse('Deployment ID is required', 400)

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const deployment = await env.DB.prepare(
    `SELECT id, owner_username, agent_name, pinata_agent_id, status, deploy_url,
            free_model_id, openrouter_key_hash, error_code, error_message,
            created_at, updated_at
     FROM v3_pinata_deployments WHERE id = ?1`
  ).bind(deploymentId).first<DeploymentRow>()

  if (!deployment) return errorResponse('Deployment not found', 404)
  if (deployment.owner_username !== auth.username) {
    return errorResponse('Only the deployment owner can read this', 403)
  }

  return json({
    deploymentId: deployment.id,
    status: deployment.status,
    agentName: deployment.agent_name,
    pinataAgentId: deployment.pinata_agent_id,
    deployUrl: deployment.deploy_url,
    freeModelId: deployment.free_model_id,
    errorCode: deployment.error_code,
    errorMessage: deployment.error_message,
    createdAt: deployment.created_at,
    updatedAt: deployment.updated_at,
  })
}
