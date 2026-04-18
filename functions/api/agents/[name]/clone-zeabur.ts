/**
 * POST /api/agents/:name/clone-zeabur — Clone lobster to another server (backup)
 * GET  /api/agents/:name/clone-zeabur?cloneId=xxx — Poll clone status (multi-phase)
 *
 * PRINCIPLE: Source lobster is NEVER modified. All writes target the NEW project only.
 *
 * Auth: agent owner (Privy JWT / X-Wallet-Address)
 *
 * Phase flow:
 *   cloning → setting_up_init → setting_up_wait → setting_up_config → running
 *                                                                    → failed
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  parseBody,
  generateApiKey,
  generatePairingCode,
  pairingCodeExpires,
  toAgentSlug,
} from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'
import { importKey, encrypt, decrypt } from '../../../lib/crypto'
import {
  zeaburGQL,
  execCommand,
  checkServiceReady,
  readGatewayToken,
  injectCanflyEnvVars,
  buildConfigPatchPayload,
  patchConfigViaCLI,
  isPhaseTimedOut,
  generateUUID,
  findOpenClawService,
} from '../../../lib/openclaw-config'

interface CloneBody {
  targetServerNodeId: string
}

function dateSuffix(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

interface DeploymentRow {
  id: string
  owner_username: string
  zeabur_project_id: string
  zeabur_service_id: string | null
  status: string
  deploy_url: string | null
  agent_name: string | null
  metadata: string
  phase_data: string | null
  phase_started_at: string | null
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

// ── POST: Start clone ─────────────────────────────────────
export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const agent = await env.DB.prepare(
    'SELECT name, owner_username, display_name FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ name: string; owner_username: string | null; display_name: string | null }>()
  if (!agent) return errorResponse('Agent not found', 404)
  if (agent.owner_username !== auth.username) return errorResponse('Not authorized', 403)

  const body = await parseBody<CloneBody>(request)
  if (!body?.targetServerNodeId) return errorResponse('targetServerNodeId is required', 400)

  // Get source deployment
  const deployment = await env.DB.prepare(
    `SELECT zeabur_project_id, zeabur_service_id, metadata
     FROM v3_zeabur_deployments WHERE agent_name = ?1 AND status = 'running'
     ORDER BY created_at DESC LIMIT 1`
  ).bind(agentName).first<{ zeabur_project_id: string; zeabur_service_id: string; metadata: string }>()
  if (!deployment) return errorResponse('No running Zeabur deployment found for this agent', 404)

  // Decrypt Zeabur API key
  const metadata = JSON.parse(deployment.metadata || '{}')
  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  const zeaburApiKey = cryptoKey ? await decrypt(metadata.zeaburApiKey || '', cryptoKey) : metadata.zeaburApiKey
  if (!zeaburApiKey) return errorResponse('Zeabur API key not found in deployment metadata', 500)

  // Check source project service count — block multi-service projects
  const projCheckResult = await zeaburGQL(zeaburApiKey, `
    query { project(_id: "${deployment.zeabur_project_id}") {
      services { _id name }
      environments { _id name }
    } }
  `)
  const projCheck = projCheckResult.data?.project as {
    services: Array<{ _id: string; name: string }>
    environments: Array<{ _id: string; name: string }>
  } | null

  if ((projCheck?.services?.length || 0) > 1) {
    return errorResponse(
      'Multi-service projects cannot be auto-cloned. Please use one of these alternatives:\n' +
      '1. Use Zeabur Dashboard\'s built-in "Clone Project" feature to clone the entire project\n' +
      '2. Remove extra services (browser, devbox, etc.) before cloning, then reinstall them on the clone',
      400,
    )
  }

  const envs = projCheck?.environments || []
  const prodEnv = envs.find(e => e.name === 'production') || envs[0]
  if (!prodEnv) return errorResponse('Source project has no environment', 500)

  // Clone project (READ-ONLY on source — Zeabur copies internally)
  const targetRegion = `server-${body.targetServerNodeId}`
  const cloneResult = await zeaburGQL(zeaburApiKey, `
    mutation CloneProject($projectId: ObjectID!, $environmentId: ObjectID!, $targetRegion: String!, $suspendOldProject: Boolean!) {
      cloneProject(projectId: $projectId, environmentId: $environmentId, targetRegion: $targetRegion, suspendOldProject: $suspendOldProject) {
        newProjectId
      }
    }
  `, {
    projectId: deployment.zeabur_project_id,
    environmentId: prodEnv._id,
    targetRegion,
    suspendOldProject: false,  // NEVER suspend source
  })

  if (cloneResult.errors?.length) {
    return errorResponse(`Zeabur cloneProject failed: ${cloneResult.errors[0].message}`, 502)
  }

  const newProjectId = (cloneResult.data?.cloneProject as { newProjectId?: string })?.newProjectId
  if (!newProjectId) return errorResponse('Zeabur cloneProject returned no new project ID', 502)

  // Create Canfly deployment record (status='cloning')
  const suffix = dateSuffix()
  const bakSlug = `${toAgentSlug(agentName)}-bak-${suffix}`
  const bakDisplayName = `${agent.display_name || agentName} BAK ${suffix}`
  const deploymentId = generateUUID()

  const encApiKey = cryptoKey ? await encrypt(zeaburApiKey, cryptoKey) : zeaburApiKey
  await env.DB.prepare(
    `INSERT INTO v3_zeabur_deployments
      (id, owner_username, zeabur_project_id, zeabur_service_id, zeabur_environment,
       status, metadata, phase_started_at)
     VALUES (?1, ?2, ?3, NULL, 'production', 'cloning', ?4, datetime('now'))`
  ).bind(
    deploymentId, auth.username, newProjectId,
    JSON.stringify({
      zeaburApiKey: encApiKey,
      serverNodeId: body.targetServerNodeId,
      source: 'clone',
      sourceAgentName: agentName,
      sourceProjectId: deployment.zeabur_project_id,
      bakSlug,
      bakDisplayName,
      clonedAt: new Date().toISOString(),
    }),
  ).run()

  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'zeabur_clone_initiated', ?2)`
  ).bind(agentName, JSON.stringify({
    owner: auth.username,
    sourceProjectId: deployment.zeabur_project_id,
    newProjectId,
    targetRegion,
    bakSlug,
  })).run()

  return json({ cloneId: deploymentId, newProjectId, status: 'cloning', bakSlug, bakDisplayName }, 201)
}

// ── GET: Poll clone status (multi-phase state machine) ────
export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const url = new URL(request.url)
  const cloneId = url.searchParams.get('cloneId')

  // No cloneId → return available servers for backup
  if (!cloneId) {
    const dep = await env.DB.prepare(
      `SELECT zeabur_project_id, metadata FROM v3_zeabur_deployments WHERE agent_name = ?1 AND status = 'running' ORDER BY created_at DESC LIMIT 1`
    ).bind(agentName).first<{ zeabur_project_id: string; metadata: string }>()
    if (!dep) return json({ servers: [], hasDeployment: false })

    const meta = JSON.parse(dep.metadata || '{}')
    const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
    const rawKey = meta.zeaburApiKey || ''
    const apiKey = cryptoKey && rawKey ? await decrypt(rawKey, cryptoKey) : rawKey
    if (!apiKey) return json({ servers: [], hasDeployment: true })

    try {
      const srvResult = await zeaburGQL(apiKey, '{ servers { _id name provider } }')
      const servers = (srvResult.data?.servers as Array<{ _id: string; name: string; provider: string }>) || []

      // Check source project service count for multi-service detection
      let serviceCount = 1
      let canClone = true
      try {
        const projResult = await zeaburGQL(apiKey, `
          query { project(_id: "${dep.zeabur_project_id}") { services { _id name } } }
        `)
        const services = (projResult.data?.project as { services: Array<{ _id: string; name: string }> })?.services || []
        serviceCount = services.length
        canClone = serviceCount <= 1
      } catch { /* default to canClone=true */ }

      return json({ servers, hasDeployment: true, serviceCount, canClone })
    } catch {
      return json({ servers: [], hasDeployment: true })
    }
  }

  const deployment = await env.DB.prepare(
    `SELECT id, owner_username, zeabur_project_id, zeabur_service_id, status,
            deploy_url, agent_name, metadata, phase_data, phase_started_at
     FROM v3_zeabur_deployments WHERE id = ?1`
  ).bind(cloneId).first<DeploymentRow>()
  if (!deployment) return errorResponse('Clone deployment not found', 404)
  if (deployment.owner_username !== auth.username) return errorResponse('Not authorized', 403)

  // Terminal: running — return immediately
  if (deployment.status === 'running') {
    return json({
      cloneId: deployment.id,
      status: deployment.status,
      agentName: deployment.agent_name,
      deployUrl: deployment.deploy_url,
    })
  }

  // Terminal: failed — support retry
  if (deployment.status === 'failed') {
    const retry = url.searchParams.get('retry')
    if (retry === 'resume') {
      // Resume from the appropriate phase based on what data we have
      const pd = JSON.parse(deployment.phase_data || '{}')
      let resumePhase = 'setting_up_wait' // default: service might be up now, re-check
      if (!pd.newServiceId) resumePhase = 'cloning' // never got service ID
      if (!pd.publicUrl) resumePhase = 'setting_up_init' // never got domain
      if (pd.waitAttempts && pd.waitAttempts > 0) resumePhase = 'setting_up_wait' // was waiting for boot
      if (pd.configRetryCount && pd.configRetryCount > 0) resumePhase = 'setting_up_config' // was patching config

      // Reset waitAttempts/configRetryCount for fresh retry
      pd.waitAttempts = 0
      pd.configRetryCount = 0

      await env.DB.prepare(
        `UPDATE v3_zeabur_deployments SET status = ?1, phase_data = ?2, error_message = NULL, phase_started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?3`
      ).bind(resumePhase, JSON.stringify(pd), cloneId).run()
      return json({ cloneId, status: resumePhase, message: `Retrying from ${resumePhase}...` })
    }
    // Not retrying — return failed status with error info
    const pd = JSON.parse(deployment.phase_data || '{}')
    return json({
      cloneId: deployment.id,
      status: 'failed',
      agentName: deployment.agent_name,
      deployUrl: deployment.deploy_url,
      error: deployment.error_message,
      canRetry: !!(pd.newServiceId), // can resume if we at least have service ID
    })
  }

  // Legacy 'setting_up' — mark failed, ask user to retry
  if (deployment.status === 'setting_up') {
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET status = 'failed', error_message = '系統已升級，請重新 clone', updated_at = datetime('now') WHERE id = ?1`
    ).bind(cloneId).run()
    return json({ cloneId, status: 'failed', error: '系統已升級，請重新 clone' })
  }

  // Phase timeout check (applies to all in-progress phases)
  if (isPhaseTimedOut(deployment.phase_started_at)) {
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET status = 'failed', error_code = 'PHASE_TIMEOUT',
        error_message = 'Setup timed out after 15 minutes — click Retry to reconfigure.',
        updated_at = datetime('now') WHERE id = ?1`
    ).bind(cloneId).run()
    return json({ cloneId, status: 'failed', errorCode: 'PHASE_TIMEOUT', error: 'Setup timed out after 15 minutes' })
  }

  // Decrypt API key (guard empty string to avoid decrypt throw)
  const metadata = JSON.parse(deployment.metadata || '{}')
  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  const rawKey = metadata.zeaburApiKey || ''
  const zeaburApiKey = cryptoKey && rawKey ? await decrypt(rawKey, cryptoKey) : rawKey
  if (!zeaburApiKey) return errorResponse('Missing Zeabur API key', 500)

  const phaseData = JSON.parse(deployment.phase_data || '{}')

  // ── Phase dispatcher ──
  switch (deployment.status) {
    case 'cloning':
      return handleCloning(env, deployment, zeaburApiKey, metadata, phaseData, cloneId, agentName)
    case 'setting_up_init':
    case 'setting_up_init_locked':
      return handleInit(env, deployment, zeaburApiKey, metadata, phaseData, cryptoKey, cloneId, auth.username, agentName)
    case 'setting_up_wait':
      return handleWait(env, deployment, zeaburApiKey, phaseData, cloneId)
    case 'setting_up_config':
    case 'setting_up_config_locked':
      return handleConfig(env, deployment, zeaburApiKey, phaseData, cryptoKey, cloneId, auth.username, agentName, metadata)
    default:
      return json({ cloneId, status: deployment.status, message: 'Unknown phase' })
  }
}

// ── Phase: cloning ────────────────────────────────────────
// Poll Zeabur cloneProjectStatus. On completion, find service/env IDs and transition.
async function handleCloning(
  env: Env,
  deployment: DeploymentRow,
  zeaburApiKey: string,
  metadata: Record<string, unknown>,
  phaseData: Record<string, unknown>,
  cloneId: string,
  agentName: string,
) {
  const statusResult = await zeaburGQL(zeaburApiKey, `
    query { cloneProjectStatus(newProjectId: "${deployment.zeabur_project_id}") {
      newProjectId
      events { type message createdAt }
      error
    } }
  `)

  const cloneStatus = statusResult.data?.cloneProjectStatus as {
    newProjectId: string
    events: Array<{ type: string; message: string }>
    error: string | null
  } | null

  if (!cloneStatus) {
    return json({ cloneId, status: 'cloning', message: 'Waiting for Zeabur clone status...' })
  }

  if (cloneStatus.error) {
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET status = 'failed', error_message = ?1, updated_at = datetime('now') WHERE id = ?2`
    ).bind(cloneStatus.error, cloneId).run()
    return json({ cloneId, status: 'failed', error: cloneStatus.error })
  }

  const isComplete = cloneStatus.events?.some(e => e.type === 'CloneProjectCompleted')
  if (!isComplete) {
    const lastEvent = cloneStatus.events?.[cloneStatus.events.length - 1]
    return json({ cloneId, status: 'cloning', message: lastEvent?.message || 'Cloning in progress...' })
  }

  // ── Clone complete — find service/env IDs and transition ──
  const newProjectId = deployment.zeabur_project_id
  const projResult = await zeaburGQL(zeaburApiKey, `
    query { project(_id: "${newProjectId}") {
      services { _id name }
      environments { _id name }
    } }
  `)
  const proj = projResult.data?.project as {
    services: Array<{ _id: string; name: string }>
    environments: Array<{ _id: string; name: string }>
  } | null

  const openClawService = findOpenClawService(proj?.services || [])
  const newServiceId = openClawService?._id
  const newEnvId = (proj?.environments?.find(e => e.name === 'production') || proj?.environments?.[0])?._id

  if (!newServiceId || !newEnvId) {
    const serviceNames = proj?.services?.map(s => s.name).join(', ') || 'none'
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET status = 'failed', error_message = ?1, updated_at = datetime('now') WHERE id = ?2`
    ).bind(`OpenClaw service not found. Services: ${serviceNames}`, cloneId).run()
    return json({ cloneId, status: 'failed', error: `OpenClaw service not found. Found: ${serviceNames}` })
  }

  // Atomic transition: cloning → setting_up_init (optimistic lock)
  const transition = await env.DB.prepare(
    `UPDATE v3_zeabur_deployments
     SET status = 'setting_up_init', zeabur_service_id = ?1,
         phase_data = ?2, phase_started_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?3 AND status = 'cloning'`
  ).bind(
    newServiceId,
    JSON.stringify({ ...phaseData, newServiceId, newEnvId }),
    cloneId,
  ).run()

  if (!transition.meta?.changes) {
    // Another poll already advanced — return current status
    return json({ cloneId, status: 'cloning', message: 'Transitioning to setup...' })
  }

  return json({ cloneId, status: 'setting_up_init', message: 'Clone complete. Configuring service...' })
}

// ── Phase: setting_up_init ────────────────────────────────
// Fast API calls: start service, add domain, register agent, inject env vars, final restart.
async function handleInit(
  env: Env,
  deployment: DeploymentRow,
  zeaburApiKey: string,
  metadata: Record<string, unknown>,
  phaseData: Record<string, unknown>,
  cryptoKey: CryptoKey | null,
  cloneId: string,
  username: string,
  agentName: string,
) {
  // Optimistic lock: only one poll can run init
  const lock = await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET status = 'setting_up_init_locked', updated_at = datetime('now')
     WHERE id = ?1 AND status = 'setting_up_init'`
  ).bind(cloneId).run()
  if (!lock.meta?.changes) {
    return json({ cloneId, status: 'setting_up_init', message: 'Configuring service...' })
  }

  const newServiceId = phaseData.newServiceId as string
  const newEnvId = phaseData.newEnvId as string
  const bakSlug = (metadata.bakSlug as string) || `${toAgentSlug(agentName)}-bak-${dateSuffix()}`
  const bakDisplayName = (metadata.bakDisplayName as string) || `${agentName} BAK ${dateSuffix()}`

  // 1. Start cloned service (cloneProject doesn't auto-start)
  await zeaburGQL(zeaburApiKey,
    `mutation{restartService(serviceID:"${newServiceId}",environmentID:"${newEnvId}")}`,
  ).catch(() => {})

  // 2. Add domain (can do while service is starting)
  const domain = `${bakSlug}-canfly`
  const addDomainResult = await zeaburGQL(zeaburApiKey,
    `mutation{addDomain(serviceID:"${newServiceId}",environmentID:"${newEnvId}",domain:"${domain}",isGenerated:true){domain}}`,
  ).catch(() => null)
  const assignedDomain = (addDomainResult?.data?.addDomain as { domain?: string })?.domain
  const publicUrl = assignedDomain ? `https://${assignedDomain}` : `https://${domain}.zeabur.app`

  // 3. Register new agent in Canfly DB
  let finalAgentName = bakSlug
  let sfx = 0
  while (true) {
    const exists = await env.DB.prepare('SELECT name FROM agents WHERE name = ?1').bind(finalAgentName).first()
    if (!exists) break
    sfx++
    finalAgentName = `${bakSlug}-${sfx}`
  }

  const apiKey = generateApiKey()
  const pairingCode = generatePairingCode()
  const expires = pairingCodeExpires()

  await env.DB.prepare(
    `INSERT INTO agents (name, display_name, owner_username, platform, avatar_url, bio, model,
                         hosting, capabilities, is_public, edit_token, source,
                         api_key, pairing_code, pairing_code_expires, registration_source)
     VALUES (?1, ?2, ?3, 'openclaw', NULL, ?4, NULL,
             'zeabur-cloud', '{}', 1, ?5, 'registered',
             ?6, ?7, ?8, 'zeabur_clone')`
  ).bind(
    finalAgentName, bakDisplayName, username,
    `Backup of ${agentName}`,
    apiKey, apiKey, pairingCode, expires,
  ).run()

  // 4. Inject CANFLY env vars
  await injectCanflyEnvVars(zeaburApiKey, newServiceId, newEnvId, {
    CANFLY_API_KEY: apiKey,
    CANFLY_AGENT_NAME: finalAgentName,
    CANFLY_API_URL: 'https://canfly.ai/api',
  })

  // 5. Final container restart (applies env vars — this is the LAST restart)
  await zeaburGQL(zeaburApiKey,
    `mutation{restartService(serviceID:"${newServiceId}",environmentID:"${newEnvId}")}`,
  )

  // 6. Transition: setting_up_init → setting_up_wait
  const encApiKey = cryptoKey ? await encrypt(apiKey, cryptoKey) : apiKey
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
      apiKey: encApiKey,
      finalAgentName,
      bakDisplayName,
      waitAttempts: 0,
    }),
    cloneId,
  ).run()

  return json({
    cloneId,
    status: 'setting_up_wait',
    message: 'Service configured. Waiting for boot...',
  })
}

// ── Phase: setting_up_wait ────────────────────────────────
// Single readiness check per poll. Max 24 attempts (~120s at 5s interval).
async function handleWait(
  env: Env,
  deployment: DeploymentRow,
  zeaburApiKey: string,
  phaseData: Record<string, unknown>,
  cloneId: string,
) {
  const newServiceId = phaseData.newServiceId as string
  const newEnvId = phaseData.newEnvId as string
  const publicUrl = phaseData.publicUrl as string
  const waitAttempts = (phaseData.waitAttempts as number) || 0

  // Two gates: container process alive AND public domain routable.
  // Zeabur's subdomain provisioning can lag minutes behind container boot,
  // causing the chat probe to 502 even when OpenClaw is fine internally.
  const containerReady = await checkServiceReady(zeaburApiKey, newServiceId, newEnvId)
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
      ).bind(reason, cloneId).run()
      return json({ cloneId, status: 'failed', error: reason })
    }

    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET phase_data = ?1, updated_at = datetime('now') WHERE id = ?2`
    ).bind(JSON.stringify({ ...phaseData, waitAttempts: newAttempts }), cloneId).run()

    return json({
      cloneId,
      status: 'setting_up_wait',
      message: !containerReady
        ? 'Waiting for service to start...'
        : 'Service up — waiting for public domain to route...',
      attempt: newAttempts,
      containerReady,
      domainReady,
    })
  }

  // Both ready → transition to setting_up_config
  await env.DB.prepare(
    `UPDATE v3_zeabur_deployments
     SET status = 'setting_up_config', phase_data = ?1, phase_started_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?2 AND status = 'setting_up_wait'`
  ).bind(JSON.stringify({ ...phaseData, configRetryCount: 0 }), cloneId).run()

  return json({
    cloneId,
    status: 'setting_up_config',
    message: 'Service is up. Applying security settings...',
  })
}

// ── Phase: setting_up_config ──────────────────────────────
// Patch config via OpenClaw CLI, read gateway token, verify chat, finalize.
async function handleConfig(
  env: Env,
  deployment: DeploymentRow,
  zeaburApiKey: string,
  phaseData: Record<string, unknown>,
  cryptoKey: CryptoKey | null,
  cloneId: string,
  username: string,
  agentName: string,
  metadata: Record<string, unknown>,
) {
  const newServiceId = phaseData.newServiceId as string
  const newEnvId = phaseData.newEnvId as string
  const publicUrl = phaseData.publicUrl as string
  const finalAgentName = phaseData.finalAgentName as string
  const bakDisplayName = phaseData.bakDisplayName as string
  const configRetryCount = (phaseData.configRetryCount as number) || 0

  // Optimistic lock — same reasoning as status.ts handleConfig:
  // concurrent polls triggering parallel patchConfigViaCLI caused OpenClaw to
  // thrash (SIGUSR1 reload storm → health check fail → restart → entrypoint
  // re-adds dangerous flags → loop). Single-flight the patch.
  const lock = await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET status = 'setting_up_config_locked', updated_at = datetime('now')
     WHERE id = ?1 AND status = 'setting_up_config'`
  ).bind(cloneId).run()
  if (!lock.meta?.changes) {
    return json({ cloneId, status: 'setting_up_config', message: 'Applying security settings...' })
  }

  // 1. Patch config (after final restart — entrypoint already ran, gateway is up)
  const patchPayload = buildConfigPatchPayload(publicUrl)
  const patchResult = await patchConfigViaCLI(zeaburApiKey, newServiceId, newEnvId, patchPayload)

  if (!patchResult.success) {
    if (configRetryCount < 3) {
      // Release lock by resetting status so the next poll can acquire it.
      await env.DB.prepare(
        `UPDATE v3_zeabur_deployments SET status = 'setting_up_config', phase_data = ?1, updated_at = datetime('now') WHERE id = ?2`
      ).bind(JSON.stringify({ ...phaseData, configRetryCount: configRetryCount + 1 }), cloneId).run()
      return json({
        cloneId,
        status: 'setting_up_config',
        message: `Config patch attempt ${configRetryCount + 1}/3 failed, retrying...`,
        configRetryCount: configRetryCount + 1,
      })
    }
    // Max retries exhausted — terminal failure. Chat proxy depends on the
    // patch having enabled chatCompletions; running without it gives the user
    // a broken lobster, so mark failed and let them reconfigure.
    const errMsg = `Config patch failed after 3 retries: ${patchResult.error || 'unknown'}`
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'config_patch_failed', ?2)`
    ).bind(finalAgentName, JSON.stringify({
      method: patchResult.method,
      error: patchResult.error,
      configRetryCount,
    })).run()
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET status = 'failed', error_code = 'CONFIG_PATCH_FAILED', error_message = ?1, updated_at = datetime('now') WHERE id = ?2`
    ).bind(errMsg, cloneId).run()
    return json({
      cloneId,
      status: 'failed',
      agentName: finalAgentName,
      deployUrl: publicUrl,
      error: errMsg,
      errorCode: 'CONFIG_PATCH_FAILED',
      canReconfigure: true,
      canRetry: true,
    })
  }

  // 2. Read gateway token
  const newGatewayToken = await readGatewayToken(zeaburApiKey, newServiceId, newEnvId)

  // 3. Chat verify with backoff — see status.ts for rationale (probe WITHOUT
  //    auth so we don't trigger the pi-agent-core race condition that crashes
  //    the gateway for an hour).
  let chatReady = false
  for (let i = 0; i < 5; i++) {
    try {
      const testRes = await fetch(`${publicUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (testRes.status === 401) {
        chatReady = true
        break
      }
    } catch { /* probe failed */ }
    if (i < 4) await new Promise(r => setTimeout(r, 2000))
  }

  // Hard gate: both pieces must be present — otherwise chat proxy can't work.
  if (!newGatewayToken || !chatReady) {
    const errMsg = !newGatewayToken
      ? 'Gateway token could not be read from OpenClaw'
      : 'Chat endpoint /v1/chat/completions is not responding'
    const errCode = !newGatewayToken ? 'NO_GATEWAY_TOKEN' : 'CHAT_ENDPOINT_DEAD'
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'chat_readiness_failed', ?2)`
    ).bind(finalAgentName, JSON.stringify({ chatReady, hasToken: !!newGatewayToken, patchMethod: patchResult.method })).run()
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET status = 'failed', error_code = ?1, error_message = ?2, updated_at = datetime('now') WHERE id = ?3`
    ).bind(errCode, errMsg, cloneId).run()
    return json({
      cloneId,
      status: 'failed',
      agentName: finalAgentName,
      deployUrl: publicUrl,
      error: errMsg,
      errorCode: errCode,
      canReconfigure: true,
      canRetry: true,
    })
  }

  // 4. Store encrypted gateway token in agent_card_override
  const encToken = cryptoKey ? await encrypt(newGatewayToken, cryptoKey) : newGatewayToken
  const cardOverride = JSON.stringify({ url: publicUrl, gateway_token: encToken })
  await env.DB.prepare(
    'UPDATE agents SET agent_card_override = ?1 WHERE name = ?2'
  ).bind(cardOverride, finalAgentName).run()

  // 5. Update deployment → running (we hold the config lock, so no race here)
  const runTransition = await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET
      status = 'running', deploy_url = ?1, updated_at = datetime('now')
    WHERE id = ?2 AND status = 'setting_up_config_locked'`
  ).bind(publicUrl, cloneId).run()

  if (!runTransition.meta?.changes) {
    // Another poll already completed — just return current state
    return json({ cloneId, status: 'running', agentName: finalAgentName, deployUrl: publicUrl })
  }

  // 6. Create ownership record
  const ownershipId = generateUUID()
  await env.DB.prepare(
    `INSERT OR IGNORE INTO v3_ownership_records (id, agent_name, owner_type, owner_id, ownership_level, granted_by)
     VALUES (?1, ?2, 'user', ?3, 'full', 'zeabur_clone')`
  ).bind(ownershipId, finalAgentName, username).run()

  // 7. Activity log
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'zeabur_clone_completed', ?2)`
  ).bind(finalAgentName, JSON.stringify({
    owner: username,
    sourceAgentName: agentName,
    sourceProjectId: metadata.sourceProjectId,
    newProjectId: deployment.zeabur_project_id,
    deployUrl: publicUrl,
    chatReady,
    configPatchMethod: patchResult.method,
    configPatchSuccess: patchResult.success,
    configPatchFallback: patchResult.method === 'fallback' || undefined,
  })).run()

  return json({
    cloneId,
    status: 'running',
    agentName: finalAgentName,
    displayName: bakDisplayName,
    deployUrl: publicUrl,
    chatReady,
    configPatchFallback: patchResult.method === 'fallback' || undefined,
  })
}
