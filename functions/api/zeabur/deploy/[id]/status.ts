/**
 * GET /api/zeabur/deploy/:id/status — Poll deployment status (multi-phase)
 *
 * Checks Zeabur service status. When RUNNING, transitions through setup phases:
 *   deploying → setting_up_init → setting_up_wait → setting_up_config → running
 *
 * Auth: deployment owner (Privy JWT / X-Wallet-Address)
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  generateApiKey,
  generatePairingCode,
  pairingCodeExpires,
  toAgentSlug,
} from '../../../community/_helpers'
import { authenticateRequest } from '../../../_auth'
import { importKey, decrypt, encrypt } from '../../../../lib/crypto'
import { aiProviderEnvVar, aiProviderDefaultModel } from '../../../zeabur/deploy'
import {
  zeaburGQL,
  checkServiceReady,
  readGatewayToken,
  injectCanflyEnvVars,
  buildConfigPatchPayload,
  patchConfigViaCLI,
  writeAuthProfile,
  isPhaseTimedOut,
  generateUUID,
} from '../../../../lib/openclaw-config'

interface DeploymentRow {
  id: string
  owner_username: string
  zeabur_project_id: string
  zeabur_service_id: string | null
  agent_name: string | null
  status: string
  deploy_url: string | null
  error_code: string | null
  error_message: string | null
  metadata: string
  phase_data: string | null
  phase_started_at: string | null
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) => {
  const deploymentId = params.id as string
  if (!deploymentId) return errorResponse('Deployment ID is required', 400)

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const deployment = await env.DB.prepare(
    `SELECT id, owner_username, zeabur_project_id, zeabur_service_id, agent_name,
            status, deploy_url, error_code, error_message, metadata, phase_data, phase_started_at
     FROM v3_zeabur_deployments WHERE id = ?1`
  ).bind(deploymentId).first<DeploymentRow>()

  if (!deployment) return errorResponse('Deployment not found', 404)
  if (deployment.owner_username !== auth.username) {
    return errorResponse('Unauthorized. Only the deployment owner can check status.', 403)
  }

  // Terminal states — return immediately
  if (['running', 'failed', 'stopped'].includes(deployment.status)) {
    return json({
      deploymentId: deployment.id,
      status: deployment.status,
      agentName: deployment.agent_name,
      deployUrl: deployment.deploy_url,
      errorCode: deployment.error_code,
      errorMessage: deployment.error_message,
    })
  }

  // Legacy 'setting_up' — mark failed, ask user to retry
  if (deployment.status === 'setting_up') {
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET status = 'failed', error_message = '系統已升級，請重新部署', updated_at = datetime('now') WHERE id = ?1`
    ).bind(deploymentId).run()
    return json({ deploymentId, status: 'failed', errorMessage: '系統已升級，請重新部署' })
  }

  // Phase timeout check
  const setupPhases = ['setting_up_init', 'setting_up_init_locked', 'setting_up_wait', 'setting_up_config', 'setting_up_config_locked']
  if (setupPhases.includes(deployment.status)) {
    if (isPhaseTimedOut(deployment.phase_started_at)) {
      // Set error_code so retry.ts can classify this as a post-deploy recoverable
      // failure (container is probably up, setup just stalled) and route through
      // reconfigure instead of full redeploy.
      await env.DB.prepare(
        `UPDATE v3_zeabur_deployments SET status = 'failed', error_code = 'PHASE_TIMEOUT',
          error_message = 'Setup timed out after 15 minutes — click Retry to reconfigure.',
          updated_at = datetime('now') WHERE id = ?1`
      ).bind(deploymentId).run()
      return json({ deploymentId, status: 'failed', errorCode: 'PHASE_TIMEOUT', errorMessage: 'Setup timed out after 15 minutes' })
    }
  }

  // Decrypt API key (guard empty string to avoid decrypt throw)
  const metadata = JSON.parse(deployment.metadata || '{}')
  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  const rawKey = metadata.zeaburApiKey || ''
  const zeaburApiKey = cryptoKey && rawKey ? await decrypt(rawKey, cryptoKey) : rawKey
  const phaseData = JSON.parse(deployment.phase_data || '{}')

  // All setup phases need a valid API key
  if (setupPhases.includes(deployment.status)) {
    if (!zeaburApiKey) return errorResponse('Missing Zeabur API key for setup phase', 500)
  }

  // Phase dispatcher for setup phases
  if (deployment.status === 'setting_up_init' || deployment.status === 'setting_up_init_locked') {
    return handleInit(env, deployment, zeaburApiKey, metadata, phaseData, cryptoKey, deploymentId)
  }
  if (deployment.status === 'setting_up_wait') {
    return handleWait(env, deployment, zeaburApiKey, phaseData, deploymentId)
  }
  if (deployment.status === 'setting_up_config' || deployment.status === 'setting_up_config_locked') {
    return handleConfig(env, deployment, zeaburApiKey, metadata, phaseData, cryptoKey, deploymentId)
  }

  // ── Still deploying — poll Zeabur for live status ──
  if (!zeaburApiKey || !deployment.zeabur_service_id) {
    return json({
      deploymentId: deployment.id,
      status: deployment.status,
      message: 'Deployment in progress. Waiting for Zeabur service ID.',
    })
  }

  // Get environment ID
  const envResult = await zeaburGQL(zeaburApiKey, `
    query GetEnvironments($projectID: ObjectID!) {
      environments(projectID: $projectID) { _id name }
    }
  `, { projectID: deployment.zeabur_project_id })

  const environments = (envResult.data?.environments as Array<{ _id: string; name: string }>) || []
  const prodEnv = environments.find(e => e.name === 'production') || environments[0]

  if (!prodEnv) {
    return json({ deploymentId: deployment.id, status: 'deploying', message: 'Waiting for Zeabur environment setup.' })
  }

  // Check service status
  const statusResult = await zeaburGQL(zeaburApiKey, `
    query ServiceStatus($serviceID: ObjectID!, $environmentID: ObjectID!) {
      service(_id: $serviceID) {
        status(environmentID: $environmentID)
        ports(environmentID: $environmentID) { port }
      }
    }
  `, { serviceID: deployment.zeabur_service_id, environmentID: prodEnv._id })

  if (statusResult.errors?.length) {
    return json({ deploymentId: deployment.id, status: 'deploying', message: `Waiting for service. Zeabur: ${statusResult.errors[0].message}` })
  }

  const service = statusResult.data?.service as { status: string; ports?: Array<{ port: number }> } | null
  if (!service) {
    return json({ deploymentId: deployment.id, status: 'deploying', message: 'Service not ready yet.' })
  }

  const zeaburStatus = service.status?.toUpperCase()

  if (zeaburStatus === 'RUNNING') {
    // Atomic transition: deploying → setting_up_init
    const transition = await env.DB.prepare(
      `UPDATE v3_zeabur_deployments
       SET status = 'setting_up_init', phase_data = ?1, phase_started_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?2 AND status = 'deploying'`
    ).bind(
      JSON.stringify({ prodEnvId: prodEnv._id, serverNodeId: metadata.serverNodeId }),
      deploymentId,
    ).run()

    if (!transition.meta?.changes) {
      // Already transitioned by another poll
      return json({ deploymentId: deployment.id, status: 'deploying', message: 'Setting up deployed service...' })
    }

    return json({ deploymentId: deployment.id, status: 'setting_up_init', message: 'Service is running. Configuring...' })
  }

  if (zeaburStatus === 'FAILED' || zeaburStatus === 'ERROR') {
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET status = 'failed', error_message = 'Zeabur service failed', updated_at = datetime('now') WHERE id = ?1`
    ).bind(deployment.id).run()
    return json({ deploymentId: deployment.id, status: 'failed', errorMessage: 'Zeabur service failed. You can retry via POST /api/zeabur/retry.' })
  }

  // Still starting
  return json({
    deploymentId: deployment.id,
    status: 'deploying',
    zeaburStatus: zeaburStatus || 'STARTING',
    message: `Zeabur service status: ${zeaburStatus || 'STARTING'}. Keep polling.`,
  })
}

// ── Phase: setting_up_init ────────────────────────────────
async function handleInit(
  env: Env,
  deployment: DeploymentRow,
  zeaburApiKey: string,
  metadata: Record<string, unknown>,
  phaseData: Record<string, unknown>,
  cryptoKey: CryptoKey | null,
  deploymentId: string,
) {
  // Optimistic lock: only one poll can run init
  const lock = await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET status = 'setting_up_init_locked', updated_at = datetime('now')
     WHERE id = ?1 AND status = 'setting_up_init'`
  ).bind(deploymentId).run()
  if (!lock.meta?.changes) {
    return json({ deploymentId, status: 'setting_up_init', message: 'Configuring service...' })
  }

  const serviceId = deployment.zeabur_service_id!
  const prodEnvId = phaseData.prodEnvId as string

  // 1. Fix environment variables (template variables don't auto-expand via API deploy)
  const rawAiKey = (metadata.aiProviderKey || metadata.aiHubKey || metadata.zeaburAiHubKey || '') as string
  const aiKey = cryptoKey && rawAiKey ? await decrypt(rawAiKey, cryptoKey) : rawAiKey
  const aiProvider = (metadata.aiProvider || (rawAiKey ? 'zeabur-ai-hub' : '')) as string
  if (aiKey && aiProvider) {
    const envVarName = aiProviderEnvVar(aiProvider)
    await zeaburGQL(zeaburApiKey,
      `mutation{updateSingleEnvironmentVariable(serviceID:"${serviceId}",environmentID:"${prodEnvId}",oldKey:"${envVarName}",newKey:"${envVarName}",value:"${aiKey}"){key}}`,
    )
  }
  await zeaburGQL(zeaburApiKey,
    `mutation{updateSingleEnvironmentVariable(serviceID:"${serviceId}",environmentID:"${prodEnvId}",oldKey:"ENABLE_CONTROL_UI",newKey:"ENABLE_CONTROL_UI",value:"true"){key}}`,
  )

  // 2. Add domain
  const agentSlug = toAgentSlug((metadata.agentName as string) || `lobster-${deployment.zeabur_project_id.slice(0, 8)}`)
  const domain = `${agentSlug}-canfly`
  const addDomainResult = await zeaburGQL(zeaburApiKey,
    `mutation{addDomain(serviceID:"${serviceId}",environmentID:"${prodEnvId}",domain:"${domain}",isGenerated:true){domain}}`,
  ).catch(() => null)
  const assignedDomain = (addDomainResult?.data?.addDomain as { domain?: string })?.domain
  const publicUrl = assignedDomain ? `https://${assignedDomain}` : `https://${domain}.zeabur.app`

  // 3. Register agent
  let finalAgentName = deployment.agent_name
  let agentApiKey: string | null = null
  if (!finalAgentName) {
    const result = await registerLobster(env, {
      ownerUsername: deployment.owner_username,
      agentName: (metadata.agentName as string) || `lobster-${deployment.zeabur_project_id.slice(0, 8)}`,
      agentDisplayName: metadata.agentDisplayName as string | undefined,
      agentBio: metadata.agentBio as string | undefined,
      agentModel: metadata.agentModel as string | undefined,
      deployUrl: publicUrl,
      projectId: deployment.zeabur_project_id,
    }, deploymentId)
    finalAgentName = result.agentName
    agentApiKey = result.apiKey
  }

  // 4. Inject CANFLY env vars
  if (agentApiKey && finalAgentName) {
    await injectCanflyEnvVars(zeaburApiKey, serviceId, prodEnvId, {
      CANFLY_API_KEY: agentApiKey,
      CANFLY_AGENT_NAME: finalAgentName,
      CANFLY_API_URL: 'https://canfly.ai/api',
    })
  }

  // 5. Final restart (applies env vars — this is the LAST container restart)
  await zeaburGQL(zeaburApiKey,
    `mutation{restartService(serviceID:"${serviceId}",environmentID:"${prodEnvId}")}`,
  )

  // 6. Transition → setting_up_wait
  await env.DB.prepare(
    `UPDATE v3_zeabur_deployments
     SET status = 'setting_up_wait', agent_name = ?1,
         phase_data = ?2, phase_started_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?3`
  ).bind(
    finalAgentName,
    JSON.stringify({
      ...phaseData,
      publicUrl,
      agentApiKey: agentApiKey || null,
      finalAgentName,
      aiProvider,
      waitAttempts: 0,
    }),
    deploymentId,
  ).run()

  return json({ deploymentId, status: 'setting_up_wait', message: 'Service configured. Waiting for boot...' })
}

// ── Phase: setting_up_wait ────────────────────────────────
async function handleWait(
  env: Env,
  deployment: DeploymentRow,
  zeaburApiKey: string,
  phaseData: Record<string, unknown>,
  deploymentId: string,
) {
  const serviceId = deployment.zeabur_service_id!
  const prodEnvId = phaseData.prodEnvId as string
  const publicUrl = phaseData.publicUrl as string
  const waitAttempts = (phaseData.waitAttempts as number) || 0

  // Two gates: container process alive AND public domain routable.
  // Zeabur's subdomain provisioning (cert issuance + DNS propagation) can
  // lag minutes behind container readiness. If we advance to config phase
  // while the domain isn't routing yet, the chat probe against publicUrl
  // 502s even though OpenClaw is fine internally.
  const containerReady = await checkServiceReady(zeaburApiKey, serviceId, prodEnvId)
  let domainReady = false
  if (containerReady && publicUrl) {
    try {
      const res = await fetch(`${publicUrl}/health`, { method: 'GET', signal: AbortSignal.timeout(5000) })
      domainReady = res.status === 200
    } catch { /* not routing yet */ }
  }

  if (!containerReady || !domainReady) {
    const newAttempts = waitAttempts + 1
    if (newAttempts > 60) {
      const reason = !containerReady
        ? 'Service did not start within 5 minutes'
        : 'Public domain did not become routable within 5 minutes (Zeabur subdomain provisioning)'
      await env.DB.prepare(
        `UPDATE v3_zeabur_deployments SET status = 'failed', error_message = ?1, updated_at = datetime('now') WHERE id = ?2`
      ).bind(reason, deploymentId).run()
      return json({ deploymentId, status: 'failed', errorMessage: reason })
    }

    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET phase_data = ?1, updated_at = datetime('now') WHERE id = ?2`
    ).bind(JSON.stringify({ ...phaseData, waitAttempts: newAttempts }), deploymentId).run()

    const msg = !containerReady
      ? 'Waiting for service to start...'
      : 'Service up — waiting for public domain to route...'
    return json({ deploymentId, status: 'setting_up_wait', message: msg, attempt: newAttempts, containerReady, domainReady })
  }

  // Both ready → transition to setting_up_config
  await env.DB.prepare(
    `UPDATE v3_zeabur_deployments
     SET status = 'setting_up_config', phase_data = ?1, phase_started_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?2 AND status = 'setting_up_wait'`
  ).bind(JSON.stringify({ ...phaseData, configRetryCount: 0 }), deploymentId).run()

  return json({ deploymentId, status: 'setting_up_config', message: 'Service is up. Applying security settings...' })
}

// ── Phase: setting_up_config ──────────────────────────────
async function handleConfig(
  env: Env,
  deployment: DeploymentRow,
  zeaburApiKey: string,
  metadata: Record<string, unknown>,
  phaseData: Record<string, unknown>,
  cryptoKey: CryptoKey | null,
  deploymentId: string,
) {
  const serviceId = deployment.zeabur_service_id!
  const prodEnvId = phaseData.prodEnvId as string
  const publicUrl = phaseData.publicUrl as string
  const finalAgentName = phaseData.finalAgentName as string || deployment.agent_name!
  const aiProvider = (phaseData.aiProvider as string) || ''
  const configRetryCount = (phaseData.configRetryCount as number) || 0

  // Optimistic lock — concurrent CF polls used to stack parallel patchConfigViaCLI
  // calls, each triggering a SIGUSR1 reload. That caused OpenClaw to thrash, fail
  // its health check, restart, re-run the entrypoint (which re-enables the
  // dangerous flags), and loop — the "post-deploy high CPU" we've seen on Zeabur.
  // Single-flight the patch.
  const lock = await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET status = 'setting_up_config_locked', updated_at = datetime('now')
     WHERE id = ?1 AND status = 'setting_up_config'`
  ).bind(deploymentId).run()
  if (!lock.meta?.changes) {
    return json({ deploymentId, status: 'setting_up_config', message: 'Applying security settings...' })
  }

  // 1a. Write auth-profiles.json for AI provider (env vars get stripped by OpenClaw sandbox)
  if (aiProvider && aiProvider !== 'zeabur-ai-hub') {
    const rawAiKey = (metadata.aiProviderKey || metadata.aiHubKey || '') as string
    const aiKey = cryptoKey && rawAiKey ? await decrypt(rawAiKey, cryptoKey) : rawAiKey
    if (aiKey) {
      // Map Canfly provider name to OpenClaw provider name
      const openclawProvider = aiProvider === 'google-gemini' ? 'google' : aiProvider
      await writeAuthProfile(zeaburApiKey, serviceId, prodEnvId, openclawProvider, aiKey)
    }
  }

  // 1b. Patch config (after final restart — entrypoint already ran)
  const defaultModel = aiProviderDefaultModel(aiProvider)
  const patchPayload = buildConfigPatchPayload(publicUrl, { defaultModel })
  const patchResult = await patchConfigViaCLI(zeaburApiKey, serviceId, prodEnvId, patchPayload)

  if (!patchResult.success) {
    if (configRetryCount < 3) {
      // Release lock by resetting status so the next poll can acquire it.
      await env.DB.prepare(
        `UPDATE v3_zeabur_deployments SET status = 'setting_up_config', phase_data = ?1, updated_at = datetime('now') WHERE id = ?2`
      ).bind(JSON.stringify({ ...phaseData, configRetryCount: configRetryCount + 1 }), deploymentId).run()
      return json({ deploymentId, status: 'setting_up_config', message: `Config patch attempt ${configRetryCount + 1}/3 failed, retrying...` })
    }
    // Max retries exhausted — this is terminal. The chat proxy depends on
    // chatCompletions being enabled in the gateway config, so running=true
    // without a successful patch gives the user a broken lobster.
    const errMsg = `Config patch failed after 3 retries: ${patchResult.error || 'unknown'}`
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'config_patch_failed', ?2)`
    ).bind(finalAgentName, JSON.stringify({ method: patchResult.method, error: patchResult.error, configRetryCount })).run()
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET status = 'failed', error_code = 'CONFIG_PATCH_FAILED', error_message = ?1, updated_at = datetime('now') WHERE id = ?2`
    ).bind(errMsg, deploymentId).run()
    return json({ deploymentId, status: 'failed', errorCode: 'CONFIG_PATCH_FAILED', errorMessage: errMsg, canReconfigure: true })
  }

  // 2. Read gateway token
  const gatewayToken = await readGatewayToken(zeaburApiKey, serviceId, prodEnvId)

  // 3. Chat verify with backoff — OpenClaw needs a few seconds to settle after
  //    SIGUSR1 reload; a single-shot probe catches a transient failure window
  //    and falsely marks the deployment failed (observed: my-fast-lobs probe
  //    fired during the ~10s settle window, had to be rescued via reconfigure).
  let chatReady = false
  for (let i = 0; i < 5; i++) {
    try {
      const testRes = await fetch(`${publicUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(gatewayToken ? { Authorization: `Bearer ${gatewayToken}` } : {}),
        },
        body: JSON.stringify({ model: 'openclaw', messages: [{ role: 'user', content: 'ping' }], stream: false }),
      })
      if (testRes.status === 200 || testRes.status === 401) {
        chatReady = true
        break
      }
    } catch { /* probe failed */ }
    if (i < 4) await new Promise(r => setTimeout(r, 2000))
  }

  // Hard gate: both pieces must be present — otherwise chat proxy can't work.
  if (!gatewayToken || !chatReady) {
    const errMsg = !gatewayToken
      ? 'Gateway token could not be read from OpenClaw'
      : 'Chat endpoint /v1/chat/completions is not responding'
    const errCode = !gatewayToken ? 'NO_GATEWAY_TOKEN' : 'CHAT_ENDPOINT_DEAD'
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'chat_readiness_failed', ?2)`
    ).bind(finalAgentName, JSON.stringify({ chatReady, hasToken: !!gatewayToken, patchMethod: patchResult.method })).run()
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET status = 'failed', error_code = ?1, error_message = ?2, updated_at = datetime('now') WHERE id = ?3`
    ).bind(errCode, errMsg, deploymentId).run()
    return json({ deploymentId, status: 'failed', errorCode: errCode, errorMessage: errMsg, canReconfigure: true })
  }

  // 4. Store gateway token (we know it's present at this point)
  const encToken = cryptoKey ? await encrypt(gatewayToken, cryptoKey) : gatewayToken
  const cardOverride = JSON.stringify({ url: publicUrl, gateway_token: encToken })
  await env.DB.prepare(
    'UPDATE agents SET agent_card_override = ?1 WHERE name = ?2'
  ).bind(cardOverride, finalAgentName).run()

  // 5. Update deployment → running (we hold the config lock, so no race here)
  await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET
      status = 'running', deploy_url = ?1, updated_at = datetime('now')
    WHERE id = ?2 AND status = 'setting_up_config_locked'`
  ).bind(publicUrl, deploymentId).run()

  return json({
    deploymentId: deployment.id,
    status: 'running',
    agentName: finalAgentName,
    deployUrl: publicUrl,
    errorCode: null,
    errorMessage: null,
    configPatchFallback: patchResult.method === 'fallback' || undefined,
  })
}

// ── Register lobster helper ───────────────────────────────
async function registerLobster(
  env: Env,
  opts: {
    ownerUsername: string
    agentName: string
    agentDisplayName?: string
    agentBio?: string
    agentModel?: string
    deployUrl?: string
    projectId: string
  },
  deploymentId: string,
): Promise<{ agentName: string; apiKey: string }> {
  const baseName = toAgentSlug(opts.agentName)
  const displayName = opts.agentDisplayName || opts.agentName

  let agentName = baseName
  let suffix = 0
  while (true) {
    const exists = await env.DB.prepare('SELECT name FROM agents WHERE name = ?1').bind(agentName).first()
    if (!exists) break
    suffix++
    agentName = `${baseName}-${suffix}`
  }

  const apiKey = generateApiKey()
  const pairingCode = generatePairingCode()
  const expires = pairingCodeExpires()

  await env.DB.prepare(
    `INSERT INTO agents (name, display_name, owner_username, platform, avatar_url, bio, model,
                         hosting, capabilities, is_public, edit_token, source,
                         api_key, pairing_code, pairing_code_expires, registration_source)
     VALUES (?1, ?2, ?3, 'openclaw', NULL, ?4, ?5,
             'zeabur-cloud', ?6, 1, ?7, 'registered',
             ?8, ?9, ?10, 'zeabur_deploy')`
  ).bind(
    agentName, displayName, opts.ownerUsername,
    opts.agentBio || 'Deployed on Zeabur',
    opts.agentModel || null,
    JSON.stringify({ deployUrl: opts.deployUrl, zeaburProjectId: opts.projectId }),
    apiKey, apiKey, pairingCode, expires,
  ).run()

  await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET agent_name = ?1, updated_at = datetime('now') WHERE id = ?2`
  ).bind(agentName, deploymentId).run()

  const ownershipId = generateUUID()
  await env.DB.prepare(
    `INSERT INTO v3_ownership_records (id, agent_name, owner_type, owner_id, ownership_level, granted_by)
     VALUES (?1, ?2, 'user', ?3, 'full', 'zeabur_deploy')`
  ).bind(ownershipId, agentName, opts.ownerUsername).run()

  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'zeabur_registered', ?2)`
  ).bind(agentName, JSON.stringify({ owner: opts.ownerUsername, deploymentId, deployUrl: opts.deployUrl })).run()

  return { agentName, apiKey }
}
