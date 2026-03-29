/**
 * POST /api/zeabur/callback — Zeabur deployment webhook receiver (CAN-251)
 *
 * Receives deployment status updates from Zeabur.
 * On success: auto-registers a lobster agent and binds ownership.
 *
 * Guards:
 *   1. v3_zeabur_deploy feature flag must be enabled
 *   2. ZEABUR_WEBHOOK_SECRET must match (when configured)
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
} from '../community/_helpers'

interface ZeaburCallbackBody {
  /** Zeabur project ID */
  projectId: string
  /** Zeabur service ID */
  serviceId?: string
  /** Deployment environment */
  environment?: string
  /** Deploy status: 'deploying' | 'running' | 'failed' | 'stopped' */
  status: string
  /** Public URL of the deployed service */
  deployUrl?: string
  /** CanFly username of the deployer */
  ownerUsername: string
  /** Desired agent name for the lobster */
  agentName?: string
  /** Agent bio/description */
  agentBio?: string
  /** Agent model identifier */
  agentModel?: string
  /** Template/image that was deployed */
  templateId?: string
  /** Error code on failure */
  errorCode?: string
  /** Error message on failure */
  errorMessage?: string
}

async function isFeatureEnabled(db: D1Database, flagName: string): Promise<boolean> {
  const row = await db.prepare(
    'SELECT enabled FROM feature_flags WHERE flag_name = ?1 AND scope = ?2 AND scope_id IS NULL'
  ).bind(flagName, 'global').first()
  return row?.enabled === 1
}

function generateUUID(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  // Guard 1: Feature flag
  const flagEnabled = await isFeatureEnabled(env.DB, 'v3_zeabur_deploy')
  if (!flagEnabled) {
    return errorResponse('Zeabur deploy callback is currently disabled', 503)
  }

  // Guard 2: Webhook secret verification (when configured)
  if (env.ZEABUR_WEBHOOK_SECRET) {
    const signature = request.headers.get('X-Zeabur-Signature') ||
      request.headers.get('Authorization')?.replace('Bearer ', '')
    if (signature !== env.ZEABUR_WEBHOOK_SECRET) {
      return errorResponse('Invalid webhook signature', 403)
    }
  }

  const body = await parseBody<ZeaburCallbackBody>(request)
  if (!body || !body.projectId || !body.status || !body.ownerUsername) {
    return errorResponse('projectId, status, and ownerUsername are required', 400)
  }

  const validStatuses = ['deploying', 'running', 'failed', 'stopped']
  if (!validStatuses.includes(body.status)) {
    return errorResponse(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400)
  }

  // Verify owner exists
  const owner = await env.DB.prepare(
    'SELECT username FROM users WHERE username = ?1'
  ).bind(body.ownerUsername).first()
  if (!owner) {
    return errorResponse('Owner username not found', 404)
  }

  // Check for existing deployment record for this Zeabur project
  const existing = await env.DB.prepare(
    'SELECT id, agent_name, status FROM v3_zeabur_deployments WHERE zeabur_project_id = ?1'
  ).bind(body.projectId).first()

  if (existing) {
    // Update existing deployment
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET
        status = ?1, deploy_url = ?2, error_code = ?3, error_message = ?4,
        zeabur_service_id = COALESCE(?5, zeabur_service_id),
        metadata = ?6, updated_at = datetime('now')
      WHERE id = ?7`
    ).bind(
      body.status,
      body.deployUrl || null,
      body.errorCode || null,
      body.errorMessage || null,
      body.serviceId || null,
      JSON.stringify({ templateId: body.templateId, environment: body.environment }),
      existing.id
    ).run()

    // If transitioning to 'running' and no agent yet, register the lobster
    if (body.status === 'running' && !existing.agent_name) {
      const agentName = await registerLobster(env, body, existing.id as string)
      return json({
        deploymentId: existing.id,
        status: 'running',
        agentName,
        message: 'Deployment successful. Lobster registered.',
      })
    }

    return json({
      deploymentId: existing.id,
      status: body.status,
      agentName: existing.agent_name,
      message: `Deployment status updated to ${body.status}.`,
    })
  }

  // Create new deployment record
  const deploymentId = generateUUID()
  await env.DB.prepare(
    `INSERT INTO v3_zeabur_deployments
      (id, owner_username, zeabur_project_id, zeabur_service_id, zeabur_environment,
       template_id, status, deploy_url, error_code, error_message, metadata)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
  ).bind(
    deploymentId,
    body.ownerUsername,
    body.projectId,
    body.serviceId || null,
    body.environment || 'production',
    body.templateId || null,
    body.status,
    body.deployUrl || null,
    body.errorCode || null,
    body.errorMessage || null,
    JSON.stringify({}),
  ).run()

  // If already running (direct success callback), register the lobster
  let agentName: string | null = null
  if (body.status === 'running') {
    agentName = await registerLobster(env, body, deploymentId)
  }

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('deployment', ?1, 'zeabur_callback', ?2)`
  ).bind(deploymentId, JSON.stringify({ status: body.status, owner: body.ownerUsername })).run()

  return json({
    deploymentId,
    status: body.status,
    agentName,
    message: body.status === 'running'
      ? 'Deployment successful. Lobster registered.'
      : `Deployment recorded with status: ${body.status}.`,
  }, 201)
}

/**
 * Register a lobster agent in the agents table and bind ownership.
 */
async function registerLobster(
  env: Env,
  body: ZeaburCallbackBody,
  deploymentId: string
): Promise<string> {
  const baseName = toAgentSlug(body.agentName || `lobster-${body.projectId.slice(0, 8)}`)

  // Ensure uniqueness
  let agentName = baseName
  let suffix = 0
  while (true) {
    const exists = await env.DB.prepare(
      'SELECT name FROM agents WHERE name = ?1'
    ).bind(agentName).first()
    if (!exists) break
    suffix++
    agentName = `${baseName}-${suffix}`
  }

  const apiKey = generateApiKey()
  const pairingCode = generatePairingCode()
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19)

  // Insert agent with owner binding
  await env.DB.prepare(
    `INSERT INTO agents (name, owner_username, platform, avatar_url, bio, model,
                         hosting, capabilities, is_public, edit_token, source,
                         api_key, pairing_code, pairing_code_expires, registration_source)
     VALUES (?1, ?2, 'zeabur', NULL, ?3, ?4,
             'zeabur-cloud', ?5, 1, ?6, 'registered',
             ?7, ?8, ?9, 'zeabur_deploy')`
  ).bind(
    agentName,
    body.ownerUsername,
    body.agentBio || `Deployed on Zeabur (${body.templateId || 'custom'})`,
    body.agentModel || null,
    JSON.stringify({ deployUrl: body.deployUrl, zeaburProjectId: body.projectId }),
    apiKey,
    apiKey,
    pairingCode,
    expires,
  ).run()

  // Link agent to deployment
  await env.DB.prepare(
    `UPDATE v3_zeabur_deployments SET agent_name = ?1, updated_at = datetime('now') WHERE id = ?2`
  ).bind(agentName, deploymentId).run()

  // Create v3 ownership record
  const ownershipId = generateUUID()
  await env.DB.prepare(
    `INSERT INTO v3_ownership_records (id, agent_name, owner_type, owner_id, ownership_level, granted_by)
     VALUES (?1, ?2, 'user', ?3, 'full', 'zeabur_deploy')`
  ).bind(ownershipId, agentName, body.ownerUsername).run()

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'zeabur_registered', ?2)`
  ).bind(agentName, JSON.stringify({
    owner: body.ownerUsername,
    deploymentId,
    deployUrl: body.deployUrl,
  })).run()

  return agentName
}
