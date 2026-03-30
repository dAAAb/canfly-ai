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
  isValidAgentName,
  toAgentSlug,
} from '../community/_helpers'
import { authenticateRequest } from '../_auth'
import { importKey, encrypt } from '../../lib/crypto'

interface DeployBody {
  zeaburApiKey: string
  serverNodeId: string
  agentName: string
  agentDisplayName?: string
  agentBio?: string
  agentModel?: string
  aiHubKey?: string
  templateCode?: string | null
  rawSpecYaml?: string | null
  tier: 'light' | 'general'
}

const ZEABUR_GRAPHQL = 'https://api.zeabur.com/graphql'

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
  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) {
    return errorResponse('Authentication required', 401)
  }
  const username = auth.username

  // Parse + validate body
  const body = await parseBody<DeployBody>(request)
  if (!body) {
    return errorResponse('Invalid JSON body', 400)
  }
  if (!body.zeaburApiKey || !body.serverNodeId || !body.agentName) {
    return errorResponse('zeaburApiKey, serverNodeId, and agentName are required', 400)
  }

  // Derive slug from display name (or raw agentName)
  const agentDisplayName = body.agentDisplayName?.trim() || body.agentName.trim()
  body.agentName = toAgentSlug(body.agentName)
  if (!isValidAgentName(body.agentName)) {
    return errorResponse('Invalid agent name. The generated slug must be 2-40 chars with lowercase letters, numbers, and hyphens.', 400)
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

  // deployTemplate returns project ID, not service ID — query services to get it
  let zeaburServiceId: string | null = null
  try {
    const servicesResult = await zeaburGQL(body.zeaburApiKey, `
      query GetServices($projectID: ObjectID!) {
        project(_id: $projectID) {
          services { _id name }
        }
      }
    `, { projectID: zeaburProjectId })
    const services = (servicesResult.data?.project as { services: Array<{ _id: string }> })?.services
    zeaburServiceId = services?.[0]?._id || null
  } catch { /* fallback: will be resolved during status poll */ }

  // Step 3: Fix env vars IMMEDIATELY (before service fully starts)
  // Template variables like ${ZEABUR_AI_HUB_API_KEY} don't expand via API deploy
  if (zeaburServiceId) {
    // Get environment ID
    let envId: string | null = null
    try {
      const envResult = await zeaburGQL(body.zeaburApiKey, `
        query { project(_id: "${zeaburProjectId}") { environments { _id } } }
      `)
      envId = (envResult.data?.project as { environments: Array<{ _id: string }> })?.environments?.[0]?._id || null
    } catch { /* will retry in status poller */ }

    if (envId) {
      // Fix ZEABUR_AI_HUB_API_KEY
      if (body.aiHubKey) {
        await zeaburGQL(body.zeaburApiKey,
          `mutation{updateSingleEnvironmentVariable(serviceID:"${zeaburServiceId}",environmentID:"${envId}",oldKey:"ZEABUR_AI_HUB_API_KEY",newKey:"ZEABUR_AI_HUB_API_KEY",value:"${body.aiHubKey}"){key}}`
        ).catch(() => {})
      }
      // Fix ENABLE_CONTROL_UI
      await zeaburGQL(body.zeaburApiKey,
        `mutation{updateSingleEnvironmentVariable(serviceID:"${zeaburServiceId}",environmentID:"${envId}",oldKey:"ENABLE_CONTROL_UI",newKey:"ENABLE_CONTROL_UI",value:"true"){key}}`
      ).catch(() => {})

      // Add domain (zeabur.app via isGenerated=true)
      try {
        const slug = body.agentName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
        const domain = `${slug}-canfly`
        await zeaburGQL(body.zeaburApiKey,
          `mutation{addDomain(serviceID:"${zeaburServiceId}",environmentID:"${envId}",domain:"${domain}",isGenerated:true){domain}}`
        ).catch(() => {})
      } catch { /* domain will be added in status poller */ }

      // Restart to apply env var changes (service may not be fully up yet, that's OK)
      await zeaburGQL(body.zeaburApiKey,
        `mutation{restartService(serviceID:"${zeaburServiceId}",environmentID:"${envId}")}`
      ).catch(() => {})
    }
  }

  // Step 4: Record deployment in D1
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
    await (async () => {
      const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
      return JSON.stringify({
        tier: body.tier,
        agentName: body.agentName,
        agentDisplayName: agentDisplayName,
        agentBio: body.agentBio || null,
        agentModel: body.agentModel || null,
        aiHubKey: cryptoKey && body.aiHubKey ? await encrypt(body.aiHubKey, cryptoKey) : (body.aiHubKey || null),
        serverNodeId: body.serverNodeId,
        zeaburApiKey: cryptoKey ? await encrypt(body.zeaburApiKey, cryptoKey) : body.zeaburApiKey,
      })
    })(),
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

// ── GET /api/zeabur/deploy?owner=username — List user's deployments ──
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) {
    return errorResponse('Authentication required', 401)
  }

  const url = new URL(request.url)
  const owner = url.searchParams.get('owner') || auth.username

  // Only allow querying own deployments
  if (owner !== auth.username) {
    return errorResponse('Can only query own deployments', 403)
  }

  const result = await env.DB.prepare(
    `SELECT id, agent_name, zeabur_project_id, zeabur_service_id, status, deploy_url, created_at, updated_at
     FROM v3_zeabur_deployments
     WHERE owner_username = ?1
     ORDER BY created_at DESC LIMIT 50`
  ).bind(owner).all()

  return json({ deployments: result.results || [] })
}
