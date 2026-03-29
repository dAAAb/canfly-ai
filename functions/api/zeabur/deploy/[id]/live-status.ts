/**
 * GET /api/zeabur/deploy/:id/live-status — Query real-time Zeabur service status
 *
 * Uses the platform ZEABUR_ADMIN_API_KEY (not the user's key) to query
 * Zeabur service status. Returns the live status (RUNNING, QUEUED, DEPLOYING, etc.)
 *
 * No auth required — deployment ID is opaque UUID, status is non-sensitive.
 */
import { type Env, json, errorResponse, handleOptions } from '../../../community/_helpers'

const ZEABUR_GRAPHQL = 'https://api.zeabur.com/graphql'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const deploymentId = params.id as string

  if (!env.ZEABUR_ADMIN_API_KEY) {
    return errorResponse('Zeabur admin API key not configured', 503)
  }

  // Look up deployment record
  const deployment = await env.DB.prepare(
    `SELECT zeabur_service_id, zeabur_project_id, status, agent_name
     FROM v3_zeabur_deployments WHERE id = ?1`
  ).bind(deploymentId).first<{
    zeabur_service_id: string | null
    zeabur_project_id: string
    status: string
    agent_name: string | null
  }>()

  if (!deployment) {
    return errorResponse('Deployment not found', 404)
  }

  if (!deployment.zeabur_service_id) {
    return json({
      deploymentId,
      agentName: deployment.agent_name,
      canflyStatus: deployment.status,
      zeaburStatus: null,
      message: 'No Zeabur service ID — deployment may still be initializing.',
    })
  }

  // Get environment ID
  let envId: string | null = null
  try {
    const res = await fetch(ZEABUR_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.ZEABUR_ADMIN_API_KEY}`,
      },
      body: JSON.stringify({
        query: `{ project(_id: "${deployment.zeabur_project_id}") { environments { _id } } }`,
      }),
    })
    const data = (await res.json()) as {
      data?: { project?: { environments?: Array<{ _id: string }> } }
    }
    envId = data.data?.project?.environments?.[0]?._id || null
  } catch {
    return json({
      deploymentId,
      agentName: deployment.agent_name,
      canflyStatus: deployment.status,
      zeaburStatus: null,
      message: 'Failed to query Zeabur project.',
    })
  }

  if (!envId) {
    return json({
      deploymentId,
      agentName: deployment.agent_name,
      canflyStatus: deployment.status,
      zeaburStatus: null,
      message: 'No environment found in Zeabur project.',
    })
  }

  // Query service status
  try {
    const res = await fetch(ZEABUR_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.ZEABUR_ADMIN_API_KEY}`,
      },
      body: JSON.stringify({
        query: `query { service(_id: "${deployment.zeabur_service_id}") { status(environmentID: "${envId}") } }`,
      }),
    })
    const data = (await res.json()) as {
      data?: { service?: { status: string } }
      errors?: Array<{ message: string }>
    }

    const zeaburStatus = data.data?.service?.status?.toUpperCase() || null

    return json({
      deploymentId,
      agentName: deployment.agent_name,
      canflyStatus: deployment.status,
      zeaburStatus,
    })
  } catch {
    return json({
      deploymentId,
      agentName: deployment.agent_name,
      canflyStatus: deployment.status,
      zeaburStatus: null,
      message: 'Failed to query Zeabur service status.',
    })
  }
}
