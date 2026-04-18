/**
 * POST /api/zeabur/retry — Retry a failed Zeabur deployment (CAN-251)
 *
 * Two retry paths, chosen by error_code:
 *   - Post-deploy failure (container is up, only config/token broken):
 *     CONFIG_PATCH_FAILED / NO_GATEWAY_TOKEN / CHAT_ENDPOINT_DEAD /
 *     RECONFIGURE_INCOMPLETE → run reconfigure (patch + token + probe), no
 *     container restart. Avoids the "restart → entrypoint re-adds dangerous
 *     flags → config storm" loop that a full redeploy would trigger.
 *   - Everything else (real crash / Zeabur-side failure) → reset to 'pending',
 *     letting the normal deploy flow re-run from the top.
 *
 * Auth: owner's edit token or wallet address.
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  parseBody,
} from '../community/_helpers'
import { authenticateRequest } from '../_auth'
import {
  runReconfigure,
  isPostDeployFailure,
  type ReconfigureDeploymentRow,
} from '../../lib/reconfigure-core'

interface RetryBody {
  deploymentId: string
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await parseBody<RetryBody>(request)
  if (!body?.deploymentId) {
    return errorResponse('deploymentId is required', 400)
  }

  const deployment = await env.DB.prepare(
    `SELECT id, owner_username, status, retry_count, zeabur_project_id, zeabur_service_id,
            error_code, error_message, deploy_url, metadata, phase_data, agent_name
     FROM v3_zeabur_deployments WHERE id = ?1`
  ).bind(body.deploymentId).first<{
    id: string
    owner_username: string
    status: string
    retry_count: number
    zeabur_project_id: string
    zeabur_service_id: string | null
    error_code: string | null
    error_message: string | null
    deploy_url: string | null
    metadata: string
    phase_data: string | null
    agent_name: string | null
  }>()

  if (!deployment) {
    return errorResponse('Deployment not found', 404)
  }

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) {
    return errorResponse('Authentication required', 401)
  }
  if (auth.username !== deployment.owner_username) {
    return errorResponse('Unauthorized. Only the deployment owner can retry.', 403)
  }

  if (deployment.status !== 'failed' && deployment.status !== 'stopped') {
    return errorResponse(
      `Cannot retry a deployment with status "${deployment.status}". Only failed or stopped deployments can be retried.`,
      409
    )
  }

  const retryCount = deployment.retry_count + 1
  if (retryCount > 5) {
    return errorResponse('Maximum retry attempts (5) exceeded. Please create a new deployment.', 429)
  }

  // ── Post-deploy failure → reconfigure path ──
  // Container is already running on Zeabur; only config / token need repair.
  // Going through 'pending' would restart the container and re-run the
  // entrypoint, which re-adds dangerous flags and causes a reload storm.
  if (isPostDeployFailure(deployment.error_code)) {
    const depRow: ReconfigureDeploymentRow = {
      id: deployment.id,
      zeabur_project_id: deployment.zeabur_project_id,
      zeabur_service_id: deployment.zeabur_service_id,
      deploy_url: deployment.deploy_url,
      status: deployment.status,
      metadata: deployment.metadata,
      phase_data: deployment.phase_data,
      agent_name: deployment.agent_name,
    }
    const result = await runReconfigure(env, depRow, auth.username)

    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET retry_count = ?1, last_retry_at = datetime('now') WHERE id = ?2`
    ).bind(retryCount, body.deploymentId).run()

    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('deployment', ?1, 'zeabur_retry_reconfigure', ?2)`
    ).bind(body.deploymentId, JSON.stringify({
      retryCount,
      previousError: deployment.error_code,
      reconfigureSuccess: result.success,
      owner: deployment.owner_username,
    })).run()

    return json({
      deploymentId: body.deploymentId,
      status: result.status,
      retryCount,
      mode: 'reconfigure',
      success: result.success,
      patchMethod: result.patchMethod,
      chatReady: result.chatReady,
      tokenStored: result.tokenStored,
      errorMessage: result.errorMessage,
      message: result.success
        ? `Reconfigured on retry ${retryCount}/5. Chat is now live.`
        : `Reconfigure attempt ${retryCount}/5 incomplete: ${result.errorMessage || 'see logs'}`,
    })
  }

  // ── Full-redeploy retry path (real container failure) ──
  await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET
      status = 'pending', error_code = NULL, error_message = NULL,
      retry_count = ?1, last_retry_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?2`
  ).bind(retryCount, body.deploymentId).run()

  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('deployment', ?1, 'zeabur_retry', ?2)`
  ).bind(body.deploymentId, JSON.stringify({
    retryCount,
    previousError: deployment.error_code,
    owner: deployment.owner_username,
  })).run()

  return json({
    deploymentId: body.deploymentId,
    status: 'pending',
    retryCount,
    mode: 'redeploy',
    message: `Deployment reset to pending. Retry attempt ${retryCount}/5.`,
  })
}
