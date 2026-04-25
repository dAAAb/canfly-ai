/**
 * DELETE /api/agents/:name/delete-pinata — Tear down a Pinata-hosted lobster (CAN-302)
 *
 * Order of operations (best-effort cleanup; we don't bail on individual failures):
 *   1. Decrypt stored Pinata JWT + OpenRouter key hash from deployment metadata
 *   2. Pinata DELETE /v0/agents/{id} — remove the agent from user's Pinata workspace
 *   3. OpenRouter DELETE /v1/keys/{hash} — revoke the child key (no orphan billing risk)
 *   4. CanFly DELETE FROM agents — drop the local registration
 *   5. v3_pinata_deployments → status='stopped' (kept for audit, not deleted)
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'
import { importKey, decrypt } from '../../../lib/crypto'
import { revokeManagedKey } from '../../../lib/openrouter'
import { pinataDeleteAgent } from '../../../lib/pinata'

interface DeploymentRow {
  id: string
  owner_username: string
  pinata_agent_id: string | null
  openrouter_key_hash: string | null
  status: string
  metadata: string
}

interface DeploymentMetadata {
  pinataJwt?: string
  openrouterKey?: string
  openrouterKeyLabel?: string
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestDelete: PagesFunction<Env> = async ({ env, request, params }) => {
  const agentName = params.name as string
  if (!agentName) return errorResponse('Agent name is required', 400)

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  // Find the active deployment for this agent
  const deployment = await env.DB.prepare(
    `SELECT id, owner_username, pinata_agent_id, openrouter_key_hash, status, metadata
     FROM v3_pinata_deployments
     WHERE agent_name = ?1 AND status != 'stopped'
     ORDER BY created_at DESC
     LIMIT 1`
  ).bind(agentName).first<DeploymentRow>()

  if (!deployment) {
    return errorResponse('No active Pinata deployment found for this agent', 404)
  }
  if (deployment.owner_username !== auth.username) {
    return errorResponse('Only the deployment owner can delete this lobster', 403)
  }

  if (!env.ENCRYPTION_KEY) {
    return errorResponse('Server is missing ENCRYPTION_KEY', 500)
  }

  const cryptoKey = await importKey(env.ENCRYPTION_KEY)
  const meta: DeploymentMetadata = JSON.parse(deployment.metadata || '{}')

  const cleanupErrors: string[] = []

  // Step 2: delete Pinata agent
  if (deployment.pinata_agent_id && meta.pinataJwt) {
    try {
      const jwt = await decrypt(meta.pinataJwt, cryptoKey)
      await pinataDeleteAgent(jwt, deployment.pinata_agent_id)
    } catch (err) {
      cleanupErrors.push(`pinata: ${err instanceof Error ? err.message : 'fail'}`)
    }
  }

  // Step 3: revoke OpenRouter child key
  if (deployment.openrouter_key_hash && env.OPENROUTER_MANAGEMENT_KEY) {
    try {
      await revokeManagedKey(env.OPENROUTER_MANAGEMENT_KEY, deployment.openrouter_key_hash)
    } catch (err) {
      cleanupErrors.push(`openrouter: ${err instanceof Error ? err.message : 'fail'}`)
    }
  }

  // Step 4: drop local agent record (only if we own it)
  try {
    await env.DB.prepare(
      `DELETE FROM agents WHERE name = ?1 AND owner_username = ?2`
    ).bind(agentName, auth.username).run()
  } catch (err) {
    cleanupErrors.push(`agents: ${err instanceof Error ? err.message : 'fail'}`)
  }

  // Step 5: mark deployment row stopped (audit trail)
  await env.DB.prepare(
    `UPDATE v3_pinata_deployments
     SET status='stopped',
         error_message = ?1,
         updated_at = datetime('now')
     WHERE id = ?2`
  ).bind(
    cleanupErrors.length ? `partial cleanup: ${cleanupErrors.join('; ')}` : null,
    deployment.id,
  ).run()

  // Activity log
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'pinata_lobster_deleted', ?2)`
  ).bind(agentName, JSON.stringify({
    owner: auth.username,
    deploymentId: deployment.id,
    pinataAgentId: deployment.pinata_agent_id,
    cleanupErrors,
  })).run()

  return json({
    deleted: true,
    deploymentId: deployment.id,
    cleanupErrors: cleanupErrors.length ? cleanupErrors : undefined,
  })
}
