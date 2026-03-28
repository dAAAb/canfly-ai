/**
 * GET /api/zeabur/deploy/:id/status — Poll deployment status (CAN-275)
 *
 * Checks Zeabur service status. When RUNNING, auto-registers the lobster
 * via the existing callback endpoint logic.
 *
 * Auth: deployment owner (X-Edit-Token or X-Wallet-Address)
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  generateApiKey,
  generatePairingCode,
} from '../../../community/_helpers'

const ZEABUR_GRAPHQL = 'https://gateway.zeabur.com/graphql'

function generateUUID(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Authenticate user, return username or null */
async function authenticateUser(db: D1Database, request: Request): Promise<string | null> {
  const editToken = request.headers.get('X-Edit-Token')
  const walletAddress = request.headers.get('X-Wallet-Address')

  if (editToken) {
    const user = await db.prepare(
      'SELECT username FROM users WHERE edit_token = ?1'
    ).bind(editToken).first<{ username: string }>()
    if (user) return user.username
  }

  if (walletAddress) {
    const user = await db.prepare(
      'SELECT username FROM users WHERE LOWER(wallet_address) = LOWER(?1)'
    ).bind(walletAddress).first<{ username: string }>()
    if (user) return user.username
  }

  return null
}

/** Call Zeabur GraphQL API */
async function zeaburGQL(
  apiKey: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }> {
  const res = await fetch(ZEABUR_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  })
  return res.json() as Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }>
}

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
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ env, request, params }) => {
  const deploymentId = params.id as string
  if (!deploymentId) {
    return errorResponse('Deployment ID is required', 400)
  }

  // Auth
  const username = await authenticateUser(env.DB, request)
  if (!username) {
    return errorResponse('Authentication required. Provide X-Edit-Token or X-Wallet-Address header.', 401)
  }

  // Fetch deployment
  const deployment = await env.DB.prepare(
    `SELECT id, owner_username, zeabur_project_id, zeabur_service_id, agent_name,
            status, deploy_url, error_code, error_message, metadata
     FROM v3_zeabur_deployments WHERE id = ?1`
  ).bind(deploymentId).first<DeploymentRow>()

  if (!deployment) {
    return errorResponse('Deployment not found', 404)
  }

  if (deployment.owner_username !== username) {
    return errorResponse('Unauthorized. Only the deployment owner can check status.', 403)
  }

  // If terminal status, return immediately
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

  // Still deploying — poll Zeabur for live status
  const metadata = JSON.parse(deployment.metadata || '{}')
  const zeaburApiKey = metadata.zeaburApiKey

  if (!zeaburApiKey || !deployment.zeabur_service_id) {
    return json({
      deploymentId: deployment.id,
      status: deployment.status,
      message: 'Deployment in progress. Waiting for Zeabur service ID.',
    })
  }

  // Query Zeabur for service status
  // First get the environment ID from the project
  const envResult = await zeaburGQL(zeaburApiKey, `
    query GetEnvironments($projectID: ObjectID!) {
      environments(projectID: $projectID) {
        _id
        name
      }
    }
  `, { projectID: deployment.zeabur_project_id })

  const environments = (envResult.data?.environments as Array<{ _id: string; name: string }>) || []
  const prodEnv = environments.find(e => e.name === 'production') || environments[0]

  if (!prodEnv) {
    return json({
      deploymentId: deployment.id,
      status: 'deploying',
      message: 'Waiting for Zeabur environment setup.',
    })
  }

  // Check service status
  const statusResult = await zeaburGQL(zeaburApiKey, `
    query ServiceStatus($serviceID: ObjectID!, $environmentID: ObjectID!) {
      service(_id: $serviceID) {
        status(environmentID: $environmentID)
        ports(environmentID: $environmentID) {
          publishedPort
        }
      }
    }
  `, { serviceID: deployment.zeabur_service_id, environmentID: prodEnv._id })

  if (statusResult.errors?.length) {
    return json({
      deploymentId: deployment.id,
      status: 'deploying',
      message: `Waiting for service. Zeabur: ${statusResult.errors[0].message}`,
    })
  }

  const service = statusResult.data?.service as {
    status: string
    ports?: Array<{ publishedPort: number }>
  } | null

  if (!service) {
    return json({
      deploymentId: deployment.id,
      status: 'deploying',
      message: 'Service not ready yet.',
    })
  }

  const zeaburStatus = service.status?.toUpperCase()

  if (zeaburStatus === 'RUNNING') {
    // Get server IP for gateway URL
    const serverResult = await zeaburGQL(zeaburApiKey, `
      query ServerInfo($serverID: ObjectID!) {
        server(_id: $serverID) {
          ip
        }
      }
    `, { serverID: metadata.serverNodeId })

    const serverIp = (serverResult.data?.server as { ip?: string })?.ip
    const port = service.ports?.[0]?.publishedPort
    const gatewayUrl = serverIp && port
      ? `http://${serverIp}:${port}`
      : deployment.deploy_url

    // Update deployment to running
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET
        status = 'running', deploy_url = ?1, updated_at = datetime('now')
      WHERE id = ?2`
    ).bind(gatewayUrl || null, deployment.id).run()

    // Auto-register lobster if not already registered
    if (!deployment.agent_name) {
      const agentName = await registerLobster(env, {
        ownerUsername: deployment.owner_username,
        agentName: metadata.agentName || `lobster-${deployment.zeabur_project_id.slice(0, 8)}`,
        agentBio: metadata.agentBio,
        agentModel: metadata.agentModel,
        deployUrl: gatewayUrl || undefined,
        projectId: deployment.zeabur_project_id,
      }, deployment.id)

      return json({
        deploymentId: deployment.id,
        status: 'running',
        agentName,
        deployUrl: gatewayUrl,
        message: 'Deployment successful. Lobster registered.',
      })
    }

    return json({
      deploymentId: deployment.id,
      status: 'running',
      agentName: deployment.agent_name,
      deployUrl: gatewayUrl,
    })
  }

  if (zeaburStatus === 'FAILED' || zeaburStatus === 'ERROR') {
    await env.DB.prepare(
      `UPDATE v3_zeabur_deployments SET
        status = 'failed', error_message = 'Zeabur service failed', updated_at = datetime('now')
      WHERE id = ?1`
    ).bind(deployment.id).run()

    return json({
      deploymentId: deployment.id,
      status: 'failed',
      errorMessage: 'Zeabur service failed. You can retry via POST /api/zeabur/retry.',
    })
  }

  // Still starting
  return json({
    deploymentId: deployment.id,
    status: 'deploying',
    message: `Zeabur service status: ${zeaburStatus || 'STARTING'}. Keep polling.`,
  })
}

/**
 * Register a lobster agent and bind ownership (mirrors callback.ts logic).
 */
async function registerLobster(
  env: Env,
  opts: {
    ownerUsername: string
    agentName: string
    agentBio?: string
    agentModel?: string
    deployUrl?: string
    projectId: string
  },
  deploymentId: string
): Promise<string> {
  const baseName = opts.agentName

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

  await env.DB.prepare(
    `INSERT INTO agents (name, owner_username, platform, avatar_url, bio, model,
                         hosting, capabilities, is_public, edit_token, source,
                         api_key, pairing_code, pairing_code_expires, registration_source)
     VALUES (?1, ?2, 'zeabur', NULL, ?3, ?4,
             'zeabur-cloud', ?5, 1, ?6, 'registered',
             ?7, ?8, ?9, 'zeabur_deploy')`
  ).bind(
    agentName,
    opts.ownerUsername,
    opts.agentBio || `Deployed on Zeabur`,
    opts.agentModel || null,
    JSON.stringify({ deployUrl: opts.deployUrl, zeaburProjectId: opts.projectId }),
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
  ).bind(ownershipId, agentName, opts.ownerUsername).run()

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'zeabur_registered', ?2)`
  ).bind(agentName, JSON.stringify({
    owner: opts.ownerUsername,
    deploymentId,
    deployUrl: opts.deployUrl,
  })).run()

  return agentName
}
