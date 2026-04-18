/**
 * POST /api/agents/:name/reconfigure — Owner-initiated config repair
 *
 * Re-runs the config.patch + gateway token sync on an existing Zeabur
 * deployment. Use when a deployment is in status='failed' (CONFIG_PATCH_FAILED,
 * CHAT_ENDPOINT_DEAD, NO_GATEWAY_TOKEN) or when chat reports NEEDS_RECONFIGURE.
 *
 * This is the user-facing equivalent of /api/admin/fix-config — same logic,
 * owner auth instead of CRON_SECRET.
 *
 * Auth: agent owner (Privy JWT / X-Wallet-Address / X-Edit-Token)
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'
import { importKey, decrypt, encrypt } from '../../../lib/crypto'
import {
  zeaburGQL,
  buildConfigPatchPayload,
  patchConfigViaCLI,
  readGatewayToken,
} from '../../../lib/openclaw-config'

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

  // Pick the latest deployment regardless of status — we need to be able to
  // repair 'failed' ones too.
  const deployment = await env.DB.prepare(
    `SELECT id, zeabur_project_id, zeabur_service_id, deploy_url, status, metadata, phase_data
     FROM v3_zeabur_deployments WHERE agent_name = ?1
     ORDER BY created_at DESC LIMIT 1`
  ).bind(agentName).first<{
    id: string
    zeabur_project_id: string
    zeabur_service_id: string
    deploy_url: string | null
    status: string
    metadata: string
    phase_data: string | null
  }>()
  if (!deployment) return errorResponse('No Zeabur deployment found for this agent', 404)

  const metadata = JSON.parse(deployment.metadata || '{}') as Record<string, unknown>
  const phaseData = JSON.parse(deployment.phase_data || '{}') as Record<string, unknown>
  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  const rawKey = (metadata.zeaburApiKey as string) || ''
  const zeaburApiKey = cryptoKey && rawKey ? await decrypt(rawKey, cryptoKey) : rawKey
  if (!zeaburApiKey) return errorResponse('Missing Zeabur API key for this deployment', 500)

  const serviceId = deployment.zeabur_service_id
  const publicUrl = (phaseData.publicUrl as string) || deployment.deploy_url || ''
  if (!serviceId || !publicUrl) return errorResponse('Deployment missing service id or public URL', 500)

  // Resolve production environment
  const envResult = await zeaburGQL(zeaburApiKey, `
    query { project(_id: "${deployment.zeabur_project_id}") { environments { _id name } } }
  `)
  const envs = (envResult.data?.project as { environments: Array<{ _id: string; name: string }> })?.environments || []
  const prodEnv = envs.find(e => e.name === 'production') || envs[0]
  if (!prodEnv) return errorResponse('No environment found for Zeabur project', 500)
  const envId = prodEnv._id

  // Re-run the patch
  const patchPayload = buildConfigPatchPayload(publicUrl)
  const patchResult = await patchConfigViaCLI(zeaburApiKey, serviceId, envId, patchPayload)

  // Re-read the token regardless (some restarts rotate it)
  const gatewayToken = await readGatewayToken(zeaburApiKey, serviceId, envId)

  // Verify chat endpoint is reachable now
  let chatReady = false
  try {
    const testRes = await fetch(`${publicUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(gatewayToken ? { Authorization: `Bearer ${gatewayToken}` } : {}),
      },
      body: JSON.stringify({ model: 'openclaw', messages: [{ role: 'user', content: 'ping' }], stream: false }),
    })
    chatReady = testRes.status === 200 || testRes.status === 401
  } catch { /* not ready */ }

  let tokenStored = false
  if (gatewayToken && cryptoKey) {
    const encToken = await encrypt(gatewayToken, cryptoKey)
    const cardOverride = JSON.stringify({ url: publicUrl, gateway_token: encToken })
    await env.DB.prepare(
      'UPDATE agents SET agent_card_override = ?1 WHERE name = ?2'
    ).bind(cardOverride, agentName).run()
    tokenStored = true
  }

  // If everything checks out, move the deployment back to running.
  const fullyRepaired = patchResult.success && chatReady && tokenStored
  if (fullyRepaired) {
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET
        status = 'running', error_code = NULL, error_message = NULL,
        deploy_url = ?1, updated_at = datetime('now')
       WHERE id = ?2`
    ).bind(publicUrl, deployment.id).run()
  } else {
    // Record why we couldn't fully repair so the next user action is informed.
    const errMsg = !patchResult.success
      ? `Config patch failed: ${patchResult.error || 'unknown'}`
      : !chatReady
      ? 'Chat endpoint /v1/chat/completions not responding after reconfigure'
      : 'Gateway token could not be read'
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET
        status = 'failed', error_code = 'RECONFIGURE_INCOMPLETE', error_message = ?1, updated_at = datetime('now')
       WHERE id = ?2`
    ).bind(errMsg, deployment.id).run()
  }

  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'reconfigure', ?2)`
  ).bind(agentName, JSON.stringify({
    owner: auth.username,
    patchSuccess: patchResult.success,
    patchMethod: patchResult.method,
    patchError: patchResult.error,
    chatReady,
    tokenStored,
    fullyRepaired,
    previousStatus: deployment.status,
  })).run()

  return json({
    agentName,
    success: fullyRepaired,
    patchMethod: patchResult.method,
    patchError: patchResult.success ? null : patchResult.error,
    chatReady,
    tokenStored,
    status: fullyRepaired ? 'running' : 'failed',
  })
}
