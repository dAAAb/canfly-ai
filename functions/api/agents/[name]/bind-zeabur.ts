/**
 * POST /api/agents/:name/bind-zeabur — Deep bind existing Zeabur lobster
 * GET  /api/agents/:name/bind-zeabur — Check binding status
 *
 * Scans user's Zeabur projects/services to find the one matching
 * the provided gateway token, then creates binding records in Canfly DB.
 *
 * Auth: agent owner (Privy JWT / X-Wallet-Address)
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'
import { importKey, encrypt } from '../../../lib/crypto'

const ZEABUR_GRAPHQL = 'https://api.zeabur.com/graphql'

interface BindBody {
  zeaburApiKey: string
  gatewayToken: string  // accepts raw token, URL with ?token=, or AI prompt text
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

/**
 * Extract gateway token from various input formats:
 * 1. URL: "https://xxx.zeabur.app/?token=TOKEN_HERE"
 * 2. Raw token: "TOKEN_HERE"
 * 3. AI prompt text containing "Gateway Token TOKEN_HERE" or "?token=TOKEN_HERE"
 */
function extractGatewayToken(input: string): string {
  const trimmed = input.trim()

  // Try to extract from URL query param ?token=
  const urlMatch = trimmed.match(/[?&]token=([A-Za-z0-9_-]+)/)
  if (urlMatch) return urlMatch[1]

  // Try to extract from "Gateway Token <value>" pattern (AI prompt text)
  const promptMatch = trimmed.match(/Gateway Token\s+([A-Za-z0-9_-]+)/i)
  if (promptMatch) return promptMatch[1]

  // If it looks like a single token (alphanumeric, 20-64 chars), use as-is
  const tokenMatch = trimmed.match(/^[A-Za-z0-9_-]{20,64}$/)
  if (tokenMatch) return tokenMatch[0]

  // Last resort: find any long alphanumeric string in the text
  const anyMatch = trimmed.match(/[A-Za-z0-9_-]{28,64}/)
  if (anyMatch) return anyMatch[0]

  return trimmed
}

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

// ── POST: Bind Zeabur lobster ─────────────────────────────────────
export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  // Auth + ownership
  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const agent = await env.DB.prepare(
    'SELECT name, owner_username FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ name: string; owner_username: string | null }>()

  if (!agent) return errorResponse('Agent not found', 404)
  if (agent.owner_username !== auth.username) return errorResponse('Not authorized', 403)

  // Parse body
  const body = await parseBody<BindBody>(request)
  if (!body?.zeaburApiKey || !body?.gatewayToken) {
    return errorResponse('zeaburApiKey and gatewayToken are required', 400)
  }

  const gatewayToken = extractGatewayToken(body.gatewayToken)
  if (!gatewayToken || gatewayToken.length < 16) {
    return errorResponse('Could not extract a valid gateway token from the provided input', 400)
  }

  // Check no existing binding
  const existing = await env.DB.prepare(
    `SELECT id FROM v3_zeabur_deployments WHERE agent_name = ?1 AND status IN ('running', 'deploying')`
  ).bind(agentName).first()
  if (existing) {
    return errorResponse('Agent already has an active Zeabur deployment. Unbind first.', 409)
  }

  // Scan Zeabur projects
  const projectsResult = await zeaburGQL(body.zeaburApiKey, `
    query { projects(limit: 100) { edges { node { _id name } } } }
  `)
  if (projectsResult.errors?.length) {
    return errorResponse(`Zeabur API error: ${projectsResult.errors[0].message}`, 502)
  }

  const projects = ((projectsResult.data?.projects as { edges: Array<{ node: { _id: string; name: string } }> })?.edges || [])
    .map(e => e.node)

  if (!projects.length) {
    return errorResponse('No projects found under this Zeabur API key', 404)
  }

  // For each project, get services + environments, then check gateway token
  let match: {
    projectId: string; projectName: string
    serviceId: string; serviceName: string
    environmentId: string
  } | null = null

  for (const project of projects) {
    const detailResult = await zeaburGQL(body.zeaburApiKey, `
      query { project(_id: "${project._id}") {
        services { _id name }
        environments { _id name }
      } }
    `)
    const detail = detailResult.data?.project as {
      services: Array<{ _id: string; name: string }>
      environments: Array<{ _id: string; name: string }>
    } | null
    if (!detail?.services?.length || !detail?.environments?.length) continue

    const prodEnv = detail.environments.find(e => e.name === 'production') || detail.environments[0]

    for (const service of detail.services) {
      try {
        const tokenResult = await zeaburGQL(body.zeaburApiKey,
          `mutation Exec($cmd:[String!]!){executeCommand(serviceID:"${service._id}",environmentID:"${prodEnv._id}",command:$cmd){exitCode output}}`,
          { cmd: ['node', '-e', 'console.log(process.env.OPENCLAW_GATEWAY_TOKEN)'] }
        )
        const envToken = ((tokenResult.data?.executeCommand as { output?: string })?.output || '').replace(/[\r\n\s]+$/g, '')

        if (envToken && envToken === gatewayToken) {
          match = {
            projectId: project._id, projectName: project.name,
            serviceId: service._id, serviceName: service.name,
            environmentId: prodEnv._id,
          }
          break
        }
      } catch { /* skip unreachable services */ }
    }
    if (match) break
  }

  if (!match) {
    return errorResponse('No Zeabur service found with matching gateway token. Ensure the lobster is running.', 404)
  }

  // Get deploy URL from service domains
  let deployUrl: string | null = null
  try {
    const domainResult = await zeaburGQL(body.zeaburApiKey, `
      query { service(_id: "${match.serviceId}") { domains { domain } } }
    `)
    const domains = (domainResult.data?.service as { domains?: Array<{ domain: string }> })?.domains || []
    if (domains.length > 0) {
      const d = domains[0].domain
      deployUrl = d.includes('://') ? d : `https://${d}`
    }
  } catch { /* deploy_url will be null */ }

  // Get server/region info
  let serverNodeId: string | null = null
  try {
    const regionResult = await zeaburGQL(body.zeaburApiKey, `
      query { project(_id: "${match.projectId}") { region { key } } }
    `)
    const regionKey = (regionResult.data?.project as { region?: { key?: string } })?.region?.key || ''
    if (regionKey.startsWith('server-')) {
      serverNodeId = regionKey.replace('server-', '')
    }
  } catch { /* optional */ }

  // DB writes — encrypt sensitive data
  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  const encApiKey = cryptoKey ? await encrypt(body.zeaburApiKey, cryptoKey) : body.zeaburApiKey
  const encToken = cryptoKey ? await encrypt(gatewayToken, cryptoKey) : gatewayToken

  // 1. Create deployment record
  const deploymentId = generateUUID()
  await env.DB.prepare(
    `INSERT INTO v3_zeabur_deployments
      (id, owner_username, agent_name, zeabur_project_id, zeabur_service_id,
       zeabur_environment, status, deploy_url, metadata)
     VALUES (?1, ?2, ?3, ?4, ?5, 'production', 'running', ?6, ?7)`
  ).bind(
    deploymentId, auth.username, agentName,
    match.projectId, match.serviceId, deployUrl,
    JSON.stringify({
      zeaburApiKey: encApiKey,
      serverNodeId,
      source: 'deep_bind',
      boundAt: new Date().toISOString(),
    }),
  ).run()

  // 2. Update agent_card_override
  const cardOverride = JSON.stringify({ url: deployUrl, gateway_token: encToken })
  await env.DB.prepare(
    'UPDATE agents SET agent_card_override = ?1 WHERE name = ?2'
  ).bind(cardOverride, agentName).run()

  // 3. Create ownership record
  const ownershipId = generateUUID()
  await env.DB.prepare(
    `INSERT OR IGNORE INTO v3_ownership_records (id, agent_name, owner_type, owner_id, ownership_level, granted_by)
     VALUES (?1, ?2, 'user', ?3, 'full', 'deep_bind')`
  ).bind(ownershipId, agentName, auth.username).run()

  // 4. Activity log
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'zeabur_deep_bind', ?2)`
  ).bind(agentName, JSON.stringify({
    owner: auth.username,
    zeaburProjectId: match.projectId,
    zeaburServiceId: match.serviceId,
    deployUrl,
  })).run()

  return json({
    bound: true,
    deploymentId,
    zeaburProjectId: match.projectId,
    zeaburProjectName: match.projectName,
    zeaburServiceId: match.serviceId,
    zeaburServiceName: match.serviceName,
    deployUrl,
  })
}

// ── GET: Check binding status ─────────────────────────────────────
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const agentName = params.name as string

  const deployment = await env.DB.prepare(
    `SELECT id, zeabur_project_id, zeabur_service_id, status, deploy_url, metadata, created_at
     FROM v3_zeabur_deployments WHERE agent_name = ?1 ORDER BY created_at DESC LIMIT 1`
  ).bind(agentName).first()

  if (!deployment) return json({ bound: false })

  const metadata = JSON.parse((deployment.metadata as string) || '{}')
  return json({
    bound: deployment.status === 'running',
    deploymentId: deployment.id,
    zeaburProjectId: deployment.zeabur_project_id,
    zeaburServiceId: deployment.zeabur_service_id,
    deployUrl: deployment.deploy_url,
    source: metadata.source || 'canfly_deploy',
    createdAt: deployment.created_at,
  })
}
