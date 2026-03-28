/**
 * POST /api/zeabur/deploy — Kick off a Zeabur deployment (CAN-275)
 *
 * Accepts user's Zeabur API key + deployment params.
 * Creates a Zeabur project, deploys a template, records the deployment.
 *
 * Guards:
 *   1. v3_zeabur_deploy feature flag
 *   2. User auth (X-Edit-Token or X-Wallet-Address)
 *   3. Max 3 concurrent deployments per user
 */
import {
  type Env,
  json,
  errorResponse,
  handleOptions,
  parseBody,
} from '../community/_helpers'

interface DeployBody {
  zeaburApiKey: string
  serverNodeId: string
  agentName: string
  agentBio?: string
  agentModel?: string
  templateCode?: string | null
  rawSpecYaml?: string | null
  tier: 'light' | 'general'
}

const ZEABUR_GRAPHQL = 'https://gateway.zeabur.com/graphql'

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

/** Authenticate user via X-Edit-Token or X-Wallet-Address, return username or null */
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

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  // Guard 1: Feature flag
  const flagEnabled = await isFeatureEnabled(env.DB, 'v3_zeabur_deploy')
  if (!flagEnabled) {
    return errorResponse('Zeabur deploy is currently disabled', 503)
  }

  // Guard 2: User auth
  const username = await authenticateUser(env.DB, request)
  if (!username) {
    return errorResponse('Authentication required. Provide X-Edit-Token or X-Wallet-Address header.', 401)
  }

  // Parse + validate body
  const body = await parseBody<DeployBody>(request)
  if (!body) {
    return errorResponse('Invalid JSON body', 400)
  }
  if (!body.zeaburApiKey || !body.serverNodeId || !body.agentName) {
    return errorResponse('zeaburApiKey, serverNodeId, and agentName are required', 400)
  }
  if (body.tier !== 'light' && body.tier !== 'general') {
    return errorResponse('tier must be "light" or "general"', 400)
  }
  if (!body.templateCode && !body.rawSpecYaml) {
    return errorResponse('Either templateCode or rawSpecYaml is required', 400)
  }

  // Guard 3: Max 3 concurrent deployments per user
  const activeCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM v3_zeabur_deployments
     WHERE owner_username = ?1 AND status IN ('pending', 'deploying')`
  ).bind(username).first<{ cnt: number }>()
  if (activeCount && activeCount.cnt >= 3) {
    return errorResponse('Maximum 3 concurrent deployments allowed. Wait for existing deployments to complete.', 429)
  }

  // Step 1: Create Zeabur project
  const region = `server-${body.serverNodeId}`
  const projectName = `canfly-${body.agentName}`

  const createProjectResult = await zeaburGQL(body.zeaburApiKey, `
    mutation CreateProject($name: String!, $region: String!) {
      createProject(name: $name, region: $region) {
        _id
      }
    }
  `, { name: projectName, region })

  if (createProjectResult.errors?.length) {
    return errorResponse(
      `Zeabur createProject failed: ${createProjectResult.errors[0].message}`,
      502
    )
  }

  const zeaburProjectId = (createProjectResult.data?.createProject as { _id: string })?._id
  if (!zeaburProjectId) {
    return errorResponse('Zeabur createProject returned no project ID', 502)
  }

  // Step 2: Deploy template or raw spec
  let deployResult: { data?: Record<string, unknown>; errors?: Array<{ message: string }> }

  if (body.templateCode) {
    deployResult = await zeaburGQL(body.zeaburApiKey, `
      mutation DeployTemplate($code: String!, $projectID: ObjectID!) {
        deployTemplate(code: $code, projectID: $projectID) {
          _id
        }
      }
    `, { code: body.templateCode, projectID: zeaburProjectId })
  } else {
    deployResult = await zeaburGQL(body.zeaburApiKey, `
      mutation DeployTemplate($rawSpecYaml: String!, $projectID: ObjectID!) {
        deployTemplate(rawSpecYaml: $rawSpecYaml, projectID: $projectID) {
          _id
        }
      }
    `, { rawSpecYaml: body.rawSpecYaml, projectID: zeaburProjectId })
  }

  if (deployResult.errors?.length) {
    return errorResponse(
      `Zeabur deployTemplate failed: ${deployResult.errors[0].message}`,
      502
    )
  }

  const zeaburServiceId = (deployResult.data?.deployTemplate as { _id: string })?._id || null

  // Step 3: Record deployment in D1
  const deploymentId = generateUUID()
  await env.DB.prepare(
    `INSERT INTO v3_zeabur_deployments
      (id, owner_username, zeabur_project_id, zeabur_service_id, zeabur_environment,
       template_id, status, metadata)
    VALUES (?1, ?2, ?3, ?4, 'production', ?5, 'deploying', ?6)`
  ).bind(
    deploymentId,
    username,
    zeaburProjectId,
    zeaburServiceId,
    body.templateCode || null,
    JSON.stringify({
      tier: body.tier,
      agentName: body.agentName,
      agentBio: body.agentBio || null,
      agentModel: body.agentModel || null,
      serverNodeId: body.serverNodeId,
      zeaburApiKey: body.zeaburApiKey,
    }),
  ).run()

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('deployment', ?1, 'zeabur_deploy_initiated', ?2)`
  ).bind(deploymentId, JSON.stringify({
    owner: username,
    tier: body.tier,
    agentName: body.agentName,
    zeaburProjectId,
  })).run()

  return json({
    deploymentId,
    zeaburProjectId,
    status: 'deploying',
    message: 'Deployment initiated. Poll /api/zeabur/deploy/{id}/status for updates.',
  }, 201)
}
