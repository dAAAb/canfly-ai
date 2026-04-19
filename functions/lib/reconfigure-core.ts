/**
 * Shared reconfigure flow — re-apply config.patch + re-sync gateway token on
 * an already-deployed OpenClaw service, without restarting the container.
 *
 * Used by:
 *  - POST /api/agents/:name/reconfigure  (owner-initiated repair button)
 *  - POST /api/zeabur/retry              (when error_code is a post-deploy
 *                                          failure, retrying via reconfigure
 *                                          avoids the restart→entrypoint loop
 *                                          that would re-break config)
 */
import type { Env } from '../api/community/_helpers'
import { importKey, decrypt, encrypt } from './crypto'
import {
  zeaburGQL,
  buildConfigPatchPayload,
  patchConfigViaCLI,
  readGatewayToken,
} from './openclaw-config'

export interface ReconfigureDeploymentRow {
  id: string
  zeabur_project_id: string
  zeabur_service_id: string | null
  deploy_url: string | null
  status: string
  metadata: string
  phase_data: string | null
  agent_name: string | null
}

export interface ReconfigureResult {
  success: boolean
  patchMethod: string
  patchError: string | null
  chatReady: boolean
  tokenStored: boolean
  status: 'running' | 'failed'
  errorMessage: string | null
}

/**
 * Run config.patch + gateway token sync on an existing deployment.
 * Transitions status → 'running' on full success, 'failed' with
 * RECONFIGURE_INCOMPLETE otherwise.
 */
export async function runReconfigure(
  env: Env,
  deployment: ReconfigureDeploymentRow,
  actor: string,
): Promise<ReconfigureResult> {
  const metadata = JSON.parse(deployment.metadata || '{}') as Record<string, unknown>
  const phaseData = JSON.parse(deployment.phase_data || '{}') as Record<string, unknown>
  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  const rawKey = (metadata.zeaburApiKey as string) || ''
  const zeaburApiKey = cryptoKey && rawKey ? await decrypt(rawKey, cryptoKey) : rawKey
  const agentName = deployment.agent_name

  if (!zeaburApiKey) {
    return terminalFail(env, deployment, actor, 'Missing Zeabur API key for this deployment')
  }

  const serviceId = deployment.zeabur_service_id
  const publicUrl = (phaseData.publicUrl as string) || deployment.deploy_url || ''
  if (!serviceId || !publicUrl) {
    return terminalFail(env, deployment, actor, 'Deployment missing service id or public URL')
  }

  // Resolve production environment
  const envResult = await zeaburGQL(zeaburApiKey, `
    query { project(_id: "${deployment.zeabur_project_id}") { environments { _id name } } }
  `)
  const envs = (envResult.data?.project as { environments: Array<{ _id: string; name: string }> })?.environments || []
  const prodEnv = envs.find(e => e.name === 'production') || envs[0]
  if (!prodEnv) {
    return terminalFail(env, deployment, actor, 'No environment found for Zeabur project')
  }
  const envId = prodEnv._id

  // Re-run the patch (SIGUSR1 reload — no container restart, entrypoint stays put)
  const patchPayload = buildConfigPatchPayload(publicUrl)
  const patchResult = await patchConfigViaCLI(zeaburApiKey, serviceId, envId, patchPayload)

  // Re-read the token regardless (some restarts rotate it)
  const gatewayToken = await readGatewayToken(zeaburApiKey, serviceId, envId)

  // Probe chat endpoint — multi-shot with backoff since OpenClaw can take
  // 20-30s to re-register routes after SIGUSR1 reload via fallback patch
  // (observed: my-april-best-lobs probe caught the reload window and all
  // 5 × 2s attempts failed, even though endpoint came up seconds later).
  //
  // CRITICAL: probe WITHOUT a valid Authorization header. A POST with valid auth
  // and a real `messages` payload invokes the agent run, which has hit a known
  // upstream pi-agent-core race condition ("Agent listener invoked outside
  // active run") that crashes the gateway and triggers a 1-hour cooldown.
  // Auth failure happens before the agent is invoked, so an unauthenticated
  // POST returns 401 fast: 401 = endpoint registered (chatCompletions enabled),
  // 404 = not registered.
  let chatReady = false
  for (let i = 0; i < 15; i++) {
    try {
      const testRes = await fetch(`${publicUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(5000),
      })
      if (testRes.status === 401) {
        chatReady = true
        break
      }
    } catch { /* probe failed */ }
    if (i < 14) await new Promise(r => setTimeout(r, 2000))
  }

  let tokenStored = false
  if (gatewayToken && cryptoKey && agentName) {
    const encToken = await encrypt(gatewayToken, cryptoKey)
    const cardOverride = JSON.stringify({ url: publicUrl, gateway_token: encToken })
    await env.DB.prepare(
      'UPDATE agents SET agent_card_override = ?1 WHERE name = ?2'
    ).bind(cardOverride, agentName).run()
    tokenStored = true
  }

  // Patch + token are the hard requirements (chat proxy literally can't work
  // without them). chatReady is advisory only: the probe often fires inside
  // the SIGUSR1 reload window where /v1/chat/completions briefly 404s even
  // though it comes back seconds later. If chat turns out to actually be
  // broken, chat.ts returns NEEDS_RECONFIGURE at message time and the user
  // clicks Retry — much better than permanent deploy failure every time.
  const fullyRepaired = patchResult.success && tokenStored
  let errorMessage: string | null = null
  if (fullyRepaired) {
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET
        status = 'running', error_code = NULL, error_message = NULL,
        deploy_url = ?1, updated_at = datetime('now')
       WHERE id = ?2`
    ).bind(publicUrl, deployment.id).run()
  } else {
    errorMessage = !patchResult.success
      ? `Config patch failed: ${patchResult.error || 'unknown'}`
      : 'Gateway token could not be read'
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET
        status = 'failed', error_code = 'RECONFIGURE_INCOMPLETE', error_message = ?1, updated_at = datetime('now')
       WHERE id = ?2`
    ).bind(errorMessage, deployment.id).run()
  }

  if (agentName) {
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'reconfigure', ?2)`
    ).bind(agentName, JSON.stringify({
      actor,
      patchSuccess: patchResult.success,
      patchMethod: patchResult.method,
      patchError: patchResult.error,
      chatReady,
      tokenStored,
      fullyRepaired,
      previousStatus: deployment.status,
    })).run()
  }

  return {
    success: fullyRepaired,
    patchMethod: patchResult.method,
    patchError: patchResult.success ? null : (patchResult.error || null),
    chatReady,
    tokenStored,
    status: fullyRepaired ? 'running' : 'failed',
    errorMessage,
  }
}

/**
 * Error codes that mean "deployment is up, just needs config repair" —
 * retry should reconfigure, not full redeploy.
 */
export function isPostDeployFailure(errorCode: string | null | undefined): boolean {
  if (!errorCode) return false
  return [
    'CONFIG_PATCH_FAILED',
    'NO_GATEWAY_TOKEN',
    'CHAT_ENDPOINT_DEAD',
    'RECONFIGURE_INCOMPLETE',
    // PHASE_TIMEOUT: setup stalled, but container is likely alive. Reconfigure
    // (no restart) is the right recovery — full redeploy would restart the
    // container and re-trigger the entrypoint dangerous-flag cycle.
    'PHASE_TIMEOUT',
  ].includes(errorCode)
}

async function terminalFail(
  env: Env,
  deployment: ReconfigureDeploymentRow,
  actor: string,
  msg: string,
): Promise<ReconfigureResult> {
  await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET
      status = 'failed', error_code = 'RECONFIGURE_INCOMPLETE', error_message = ?1, updated_at = datetime('now')
     WHERE id = ?2`
  ).bind(msg, deployment.id).run()
  if (deployment.agent_name) {
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'reconfigure', ?2)`
    ).bind(deployment.agent_name, JSON.stringify({ actor, fatal: msg })).run()
  }
  return {
    success: false,
    patchMethod: 'n/a',
    patchError: msg,
    chatReady: false,
    tokenStored: false,
    status: 'failed',
    errorMessage: msg,
  }
}
