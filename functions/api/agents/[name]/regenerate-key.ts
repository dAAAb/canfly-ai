/**
 * POST /api/agents/:name/regenerate-key — Regenerate CanFly API key
 *
 * Only the agent's owner (authenticated via Privy JWT / edit token) can regenerate.
 * If the agent has a Zeabur deployment, the new key is automatically injected
 * into the service's environment variables and the service is restarted.
 */
import { type Env, json, errorResponse, handleOptions, generateApiKey } from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'

const ZEABUR_GRAPHQL = 'https://api.zeabur.com/graphql'

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

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request, params }) => {
  const agentName = params.name as string

  // Auth: must be the agent's owner
  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) {
    return errorResponse('Authentication required', 401)
  }

  // Verify agent exists and caller is owner
  const agent = await env.DB.prepare(
    'SELECT name, owner_username FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ name: string; owner_username: string | null }>()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }
  if (agent.owner_username !== auth.username) {
    return errorResponse('Only the agent owner can regenerate the API key', 403)
  }

  // Generate new key
  const newApiKey = generateApiKey()

  // Update both api_key and edit_token (they share the same value for agent self-auth)
  await env.DB.prepare(
    `UPDATE agents SET api_key = ?1, edit_token = ?1, updated_at = datetime('now') WHERE name = ?2`
  ).bind(newApiKey, agentName).run()

  // Try to auto-inject into Zeabur deployment
  let zeaburInjected = false
  let zeaburError: string | null = null

  const deployment = await env.DB.prepare(
    `SELECT zeabur_service_id, zeabur_project_id, metadata
     FROM v3_zeabur_deployments WHERE agent_name = ?1 AND status = 'running'
     ORDER BY created_at DESC LIMIT 1`
  ).bind(agentName).first<{
    zeabur_service_id: string | null
    zeabur_project_id: string
    metadata: string
  }>()

  if (deployment?.zeabur_service_id) {
    try {
      const metadata = JSON.parse(deployment.metadata || '{}')
      const zeaburApiKey = metadata.zeaburApiKey

      if (zeaburApiKey) {
        // Get environment ID
        const envResult = await zeaburGQL(zeaburApiKey, `
          query { project(_id: "${deployment.zeabur_project_id}") { environments { _id } } }
        `)
        const envId = (envResult.data?.project as { environments: Array<{ _id: string }> })?.environments?.[0]?._id

        if (envId) {
          // Inject CANFLY_API_KEY
          await zeaburGQL(zeaburApiKey,
            `mutation{updateSingleEnvironmentVariable(serviceID:"${deployment.zeabur_service_id}",environmentID:"${envId}",oldKey:"CANFLY_API_KEY",newKey:"CANFLY_API_KEY",value:"${newApiKey}"){key}}`
          )

          // Also ensure CANFLY_AGENT_NAME and CANFLY_API_URL are set
          await zeaburGQL(zeaburApiKey,
            `mutation{updateSingleEnvironmentVariable(serviceID:"${deployment.zeabur_service_id}",environmentID:"${envId}",oldKey:"CANFLY_AGENT_NAME",newKey:"CANFLY_AGENT_NAME",value:"${agentName}"){key}}`
          )
          await zeaburGQL(zeaburApiKey,
            `mutation{updateSingleEnvironmentVariable(serviceID:"${deployment.zeabur_service_id}",environmentID:"${envId}",oldKey:"CANFLY_API_URL",newKey:"CANFLY_API_URL",value:"https://canfly.ai/api"){key}}`
          )

          // Restart service to pick up new env vars
          await zeaburGQL(zeaburApiKey,
            `mutation{restartService(serviceID:"${deployment.zeabur_service_id}",environmentID:"${envId}")}`
          )

          zeaburInjected = true
        } else {
          zeaburError = 'Could not find Zeabur environment'
        }
      } else {
        zeaburError = 'No Zeabur API key stored for this deployment'
      }
    } catch (err) {
      zeaburError = (err as Error).message
    }
  }

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'api_key_regenerated', ?2)`
  ).bind(agentName, JSON.stringify({ by: auth.username, zeaburInjected })).run()

  return json({
    agentName,
    apiKey: newApiKey,
    zeaburInjected,
    zeaburError,
    message: zeaburInjected
      ? 'API key regenerated and automatically deployed to your Zeabur service. The agent will restart momentarily.'
      : 'API key regenerated. Set CANFLY_API_KEY in your agent\'s environment variables manually.',
  })
}
