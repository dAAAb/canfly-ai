/**
 * POST /api/zeabur/retry — Retry a failed Zeabur deployment (CAN-251)
 *
 * Allows the deployment owner to reset a failed deployment to 'pending'
 * so Zeabur can re-attempt deployment.
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

interface RetryBody {
  deploymentId: string
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await parseBody<RetryBody>(request)
  if (!body?.deploymentId) {
    return errorResponse('deploymentId is required', 400)
  }

  // Fetch deployment
  const deployment = await env.DB.prepare(
    `SELECT id, owner_username, status, retry_count, zeabur_project_id, error_code, error_message
     FROM v3_zeabur_deployments WHERE id = ?1`
  ).bind(body.deploymentId).first()

  if (!deployment) {
    return errorResponse('Deployment not found', 404)
  }

  // Auth: check edit token or wallet address matches owner
  const editToken = request.headers.get('X-Edit-Token')
  const walletAddress = request.headers.get('X-Wallet-Address')
  const ownerUsername = deployment.owner_username as string

  let authorized = false
  if (editToken) {
    const user = await env.DB.prepare(
      'SELECT username FROM users WHERE username = ?1 AND edit_token = ?2'
    ).bind(ownerUsername, editToken).first()
    authorized = !!user
  }
  if (!authorized && walletAddress) {
    const user = await env.DB.prepare(
      'SELECT username FROM users WHERE username = ?1 AND LOWER(wallet_address) = LOWER(?2)'
    ).bind(ownerUsername, walletAddress).first()
    authorized = !!user
  }
  if (!authorized) {
    return errorResponse('Unauthorized. Only the deployment owner can retry.', 403)
  }

  // Only failed or stopped deployments can be retried
  if (deployment.status !== 'failed' && deployment.status !== 'stopped') {
    return errorResponse(
      `Cannot retry a deployment with status "${deployment.status}". Only failed or stopped deployments can be retried.`,
      409
    )
  }

  // Max 5 retries
  const retryCount = (deployment.retry_count as number) + 1
  if (retryCount > 5) {
    return errorResponse('Maximum retry attempts (5) exceeded. Please create a new deployment.', 429)
  }

  // Reset to pending
  await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET
      status = 'pending', error_code = NULL, error_message = NULL,
      retry_count = ?1, last_retry_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?2`
  ).bind(retryCount, body.deploymentId).run()

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('deployment', ?1, 'zeabur_retry', ?2)`
  ).bind(body.deploymentId, JSON.stringify({
    retryCount,
    previousError: deployment.error_code,
    owner: ownerUsername,
  })).run()

  return json({
    deploymentId: body.deploymentId,
    status: 'pending',
    retryCount,
    message: `Deployment reset to pending. Retry attempt ${retryCount}/5.`,
  })
}
