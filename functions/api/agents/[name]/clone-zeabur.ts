/**
 * POST /api/agents/:name/clone-zeabur — Clone lobster to another server (backup)
 * GET  /api/agents/:name/clone-zeabur?cloneId=xxx — Poll clone status
 *
 * PRINCIPLE: Source lobster is NEVER modified. All writes target the NEW project only.
 *
 * Auth: agent owner (Privy JWT / X-Wallet-Address)
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  parseBody,
  generateApiKey,
  generatePairingCode,
  toAgentSlug,
} from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'
import { importKey, encrypt, decrypt } from '../../../lib/crypto'

const ZEABUR_GRAPHQL = 'https://api.zeabur.com/graphql'

interface CloneBody {
  targetServerNodeId: string
}

function generateUUID(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function zeaburGQL(
  apiKey: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }> {
  const res = await fetch(ZEABUR_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, variables }),
  })
  return res.json() as Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }>
}

function dateSuffix(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
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

  // Get source environment ID
  const envResult = await zeaburGQL(zeaburApiKey, `
    query { project(_id: "${deployment.zeabur_project_id}") { environments { _id name } } }
  `)
  const envs = (envResult.data?.project as { environments: Array<{ _id: string; name: string }> })?.environments || []
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
       status, metadata)
     VALUES (?1, ?2, ?3, NULL, 'production', 'cloning', ?4)`
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

// ── GET: Poll clone status ─────────────────────────────────
export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const url = new URL(request.url)
  const cloneId = url.searchParams.get('cloneId')

  // No cloneId → return available servers for backup
  if (!cloneId) {
    const dep = await env.DB.prepare(
      `SELECT metadata FROM v3_zeabur_deployments WHERE agent_name = ?1 AND status = 'running' ORDER BY created_at DESC LIMIT 1`
    ).bind(agentName).first<{ metadata: string }>()
    if (!dep) return json({ servers: [], hasDeployment: false })

    const meta = JSON.parse(dep.metadata || '{}')
    const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
    const apiKey = cryptoKey ? await decrypt(meta.zeaburApiKey || '', cryptoKey) : meta.zeaburApiKey
    if (!apiKey) return json({ servers: [], hasDeployment: true })

    try {
      const srvResult = await zeaburGQL(apiKey, '{ servers { _id name provider } }')
      const servers = (srvResult.data?.servers as Array<{ _id: string; name: string; provider: string }>) || []
      return json({ servers, hasDeployment: true })
    } catch {
      return json({ servers: [], hasDeployment: true })
    }
  }

  const deployment = await env.DB.prepare(
    `SELECT id, owner_username, zeabur_project_id, status, deploy_url, agent_name, metadata
     FROM v3_zeabur_deployments WHERE id = ?1`
  ).bind(cloneId).first<{
    id: string; owner_username: string; zeabur_project_id: string
    status: string; deploy_url: string | null; agent_name: string | null; metadata: string
  }>()
  if (!deployment) return errorResponse('Clone deployment not found', 404)
  if (deployment.owner_username !== auth.username) return errorResponse('Not authorized', 403)

  // Already done or in setup?
  if (['running', 'failed', 'setting_up'].includes(deployment.status)) {
    return json({
      cloneId: deployment.id,
      status: deployment.status === 'setting_up' ? 'cloning' : deployment.status,
      agentName: deployment.agent_name,
      deployUrl: deployment.deploy_url,
      message: deployment.status === 'setting_up' ? 'Setting up cloned service...' : undefined,
    })
  }

  const metadata = JSON.parse(deployment.metadata || '{}')
  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  const zeaburApiKey = cryptoKey ? await decrypt(metadata.zeaburApiKey || '', cryptoKey) : metadata.zeaburApiKey
  if (!zeaburApiKey) return errorResponse('Missing Zeabur API key', 500)

  // Poll Zeabur clone status
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

  // ── Clone complete — run post-clone setup (ONLY on new project) ──

  const newProjectId = deployment.zeabur_project_id

  // Get new project's service + env
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

  // Find the OpenClaw service by name (not services[0] which may be sandbox-browser or devbox-wings)
  const openClawService = proj?.services?.find(s => s.name === 'OpenClaw')
    || proj?.services?.find(s => /openclaw/i.test(s.name) && !/sandbox|browser|devbox|wings/i.test(s.name))
  const newServiceId = openClawService?._id
  const newEnvId = (proj?.environments?.find(e => e.name === 'production') || proj?.environments?.[0])?._id

  if (!newServiceId || !newEnvId) {
    const serviceNames = proj?.services?.map(s => s.name).join(', ') || 'none'
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET status = 'failed', error_message = ?1, updated_at = datetime('now') WHERE id = ?2`
    ).bind(`OpenClaw service not found. Services: ${serviceNames}`, cloneId).run()
    return json({ cloneId, status: 'failed', error: `OpenClaw service not found. Found: ${serviceNames}` })
  }

  // Lock: mark as 'setting_up' to prevent concurrent polls from re-running setup
  await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET status = 'setting_up', zeabur_service_id = ?1, updated_at = datetime('now') WHERE id = ?2`
  ).bind(newServiceId, cloneId).run()

  // ── Post-clone setup (ONLY on new project) ──

  const verifyErrors: string[] = []
  const bakSlug = metadata.bakSlug || `${toAgentSlug(agentName)}-bak-${dateSuffix()}`
  const bakDisplayName = metadata.bakDisplayName || `${agentName} BAK ${dateSuffix()}`

  // 1. Start cloned service (cloneProject doesn't auto-start)
  await zeaburGQL(zeaburApiKey,
    `mutation{restartService(serviceID:"${newServiceId}",environmentID:"${newEnvId}")}`
  ).catch(() => {})

  // 2. Add new domain (can do while service is starting)
  const domain = `${bakSlug}-canfly`
  const addDomainResult = await zeaburGQL(zeaburApiKey,
    `mutation{addDomain(serviceID:"${newServiceId}",environmentID:"${newEnvId}",domain:"${domain}",isGenerated:true){domain}}`
  ).catch(() => null)
  const assignedDomain = (addDomainResult?.data?.addDomain as { domain?: string })?.domain
  const publicUrl = assignedDomain ? `https://${assignedDomain}` : `https://${domain}.zeabur.app`

  // 3. Register new agent in Canfly DB (doesn't need service to be up)
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
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)

  await env.DB.prepare(
    `INSERT INTO agents (name, display_name, owner_username, platform, avatar_url, bio, model,
                         hosting, capabilities, is_public, edit_token, source,
                         api_key, pairing_code, pairing_code_expires, registration_source)
     VALUES (?1, ?2, ?3, 'openclaw', NULL, ?4, NULL,
             'zeabur-cloud', '{}', 1, ?5, 'registered',
             ?6, ?7, ?8, 'zeabur_clone')`
  ).bind(
    finalAgentName, bakDisplayName, auth.username,
    `Backup of ${agentName}`,
    apiKey, apiKey, pairingCode, expires,
  ).run()

  // 4. Wait for OpenClaw gateway to be healthy (up to 60s)
  let serviceReady = false
  for (let attempt = 0; attempt < 12; attempt++) {
    await new Promise(r => setTimeout(r, 5000))
    try {
      const ping = await zeaburGQL(zeaburApiKey,
        `mutation Exec($cmd:[String!]!){executeCommand(serviceID:"${newServiceId}",environmentID:"${newEnvId}",command:$cmd){exitCode output}}`,
        { cmd: ['openclaw', 'health'] }
      )
      const out = (ping.data?.executeCommand as { output?: string; exitCode?: number })
      if (out?.exitCode === 0 || out?.output?.includes('ok') || out?.output?.includes('healthy')) {
        serviceReady = true
        break
      }
    } catch { /* not ready yet */ }
  }

  if (!serviceReady) {
    return json({ cloneId, status: 'cloning', message: 'Clone complete, waiting for service to start...' })
  }

  // 5. Patch config via OpenClaw CLI (safe runtime update, no file race condition)
  const origins = [publicUrl, 'https://canfly.ai'].filter(Boolean)
  const patchPayload = JSON.stringify({
    gateway: {
      controlUi: { allowedOrigins: origins },
      http: { endpoints: { chatCompletions: { enabled: true } } },
    },
  })
  try {
    // Apply config patch (merges + restarts gateway internally)
    await zeaburGQL(zeaburApiKey,
      `mutation Exec($cmd:[String!]!){executeCommand(serviceID:"${newServiceId}",environmentID:"${newEnvId}",command:$cmd){exitCode output}}`,
      { cmd: ['openclaw', 'gateway', 'call', 'config.patch', patchPayload] }
    )
    // Remove Telegram channel + plugin entries
    await zeaburGQL(zeaburApiKey,
      `mutation Exec($cmd:[String!]!){executeCommand(serviceID:"${newServiceId}",environmentID:"${newEnvId}",command:$cmd){exitCode output}}`,
      { cmd: ['openclaw', 'config', 'unset', 'channels.telegram'] }
    ).catch(() => {})
    await zeaburGQL(zeaburApiKey,
      `mutation Exec($cmd:[String!]!){executeCommand(serviceID:"${newServiceId}",environmentID:"${newEnvId}",command:$cmd){exitCode output}}`,
      { cmd: ['openclaw', 'config', 'unset', 'plugins.entries.@openclaw/plugin-telegram'] }
    ).catch(() => {})
  } catch { /* best effort */ }

  // 6. Inject new CANFLY env vars
  for (const [key, value] of [
    ['CANFLY_API_KEY', apiKey],
    ['CANFLY_AGENT_NAME', finalAgentName],
    ['CANFLY_API_URL', 'https://canfly.ai/api'],
  ] as const) {
    const cr = await zeaburGQL(zeaburApiKey,
      `mutation{createEnvironmentVariable(serviceID:"${newServiceId}",environmentID:"${newEnvId}",key:"${key}",value:"${value}"){key}}`
    ).catch(() => null)
    if (cr?.errors?.length) {
      await zeaburGQL(zeaburApiKey,
        `mutation{updateSingleEnvironmentVariable(serviceID:"${newServiceId}",environmentID:"${newEnvId}",oldKey:"${key}",newKey:"${key}",value:"${value}"){key}}`
      ).catch(() => {})
    }
  }

  // 7. Restart to apply config + env vars
  await zeaburGQL(zeaburApiKey,
    `mutation{restartService(serviceID:"${newServiceId}",environmentID:"${newEnvId}")}`
  )

  // 8. Verify: wait for chat endpoint + read fresh gateway token
  let chatReady = false
  let newGatewayToken = ''
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise(r => setTimeout(r, 5000))
    try {
      // Read gateway token
      if (!newGatewayToken) {
        const tokenResult = await zeaburGQL(zeaburApiKey,
          `mutation Exec($cmd:[String!]!){executeCommand(serviceID:"${newServiceId}",environmentID:"${newEnvId}",command:$cmd){exitCode output}}`,
          { cmd: ['node', '-e', 'console.log(process.env.OPENCLAW_GATEWAY_TOKEN || "")'] }
        )
        newGatewayToken = ((tokenResult.data?.executeCommand as { output?: string })?.output || '').replace(/[\r\n\s]+$/g, '')
      }
      // Check chat endpoint
      const testRes = await fetch(`${publicUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(newGatewayToken ? { 'Authorization': `Bearer ${newGatewayToken}` } : {}) },
        body: JSON.stringify({ model: 'openclaw', messages: [{ role: 'user', content: 'ping' }], stream: false }),
      })
      if (testRes.status === 200 || testRes.status === 401) { chatReady = true; break }
    } catch { /* not ready */ }
  }

  // Fallback: re-patch config if chat not ready
  if (!chatReady) {
    try {
      await zeaburGQL(zeaburApiKey,
        `mutation Exec($cmd:[String!]!){executeCommand(serviceID:"${newServiceId}",environmentID:"${newEnvId}",command:$cmd){exitCode output}}`,
        { cmd: ['node', '-e', patchScript] }
      )
      await zeaburGQL(zeaburApiKey,
        `mutation{restartService(serviceID:"${newServiceId}",environmentID:"${newEnvId}")}`
      )
    } catch { /* best effort */ }
  }

  // 9. Re-read gateway token (may have changed after restart)
  try {
    const tokenResult = await zeaburGQL(zeaburApiKey,
      `mutation Exec($cmd:[String!]!){executeCommand(serviceID:"${newServiceId}",environmentID:"${newEnvId}",command:$cmd){exitCode output}}`,
      { cmd: ['node', '-e', 'console.log(process.env.OPENCLAW_GATEWAY_TOKEN)'] }
    )
    const freshToken = ((tokenResult.data?.executeCommand as { output?: string })?.output || '').replace(/[\r\n\s]+$/g, '')
    if (freshToken) newGatewayToken = freshToken
  } catch { /* keep previous token */ }

  // 8. Store agent_card_override with encrypted gateway token
  const encToken = cryptoKey && newGatewayToken ? await encrypt(newGatewayToken, cryptoKey) : newGatewayToken
  const cardOverride = JSON.stringify({ url: publicUrl, gateway_token: encToken })
  await env.DB.prepare(
    'UPDATE agents SET agent_card_override = ?1 WHERE name = ?2'
  ).bind(cardOverride, finalAgentName).run()

  // 9. Update deployment record
  await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET
      status = 'running', agent_name = ?1, deploy_url = ?2, updated_at = datetime('now')
    WHERE id = ?3`
  ).bind(finalAgentName, publicUrl, cloneId).run()

  // 10. Create ownership record
  const ownershipId = generateUUID()
  await env.DB.prepare(
    `INSERT OR IGNORE INTO v3_ownership_records (id, agent_name, owner_type, owner_id, ownership_level, granted_by)
     VALUES (?1, ?2, 'user', ?3, 'full', 'zeabur_clone')`
  ).bind(ownershipId, finalAgentName, auth.username).run()

  // 11. Activity log
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'zeabur_clone_completed', ?2)`
  ).bind(finalAgentName, JSON.stringify({
    owner: auth.username,
    sourceAgentName: agentName,
    sourceProjectId: metadata.sourceProjectId,
    newProjectId,
    deployUrl: publicUrl,
    chatReady,
    verifyErrors: verifyErrors.length ? verifyErrors : undefined,
  })).run()

  return json({
    cloneId,
    status: 'running',
    agentName: finalAgentName,
    displayName: bakDisplayName,
    deployUrl: publicUrl,
    chatReady,
    verifyWarnings: verifyErrors.length ? verifyErrors : undefined,
  })
}
