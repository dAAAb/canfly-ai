/**
 * DELETE /api/agents/:name/delete-deployment — Remove a CanFly-created Zeabur agent
 *
 * Deletes the Zeabur project + cleans up all CanFly DB records.
 * Only works for agents deployed via CanFly (has v3_zeabur_deployments record).
 *
 * Auth: X-Edit-Token or X-Wallet-Address (must be agent owner)
 */
import { type Env, json, errorResponse, handleOptions } from '../../community/_helpers'

const ZEABUR_GRAPHQL = 'https://api.zeabur.com/graphql'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestDelete: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string
  const editToken = request.headers.get('X-Edit-Token')
  const walletAddress = request.headers.get('X-Wallet-Address')

  if (!editToken && !walletAddress) {
    return errorResponse('X-Edit-Token or X-Wallet-Address header required', 401)
  }

  // Verify agent exists + ownership
  const agent = await env.DB.prepare(
    `SELECT a.name, a.owner_username, a.edit_token,
            u.wallet_address AS owner_wallet
     FROM agents a
     LEFT JOIN users u ON a.owner_username = u.username
     WHERE a.name = ?1`
  ).bind(agentName).first()

  if (!agent) {
    return errorResponse('Agent not found', 404)
  }

  let authorized = false
  if (editToken && agent.edit_token === editToken) authorized = true
  if (walletAddress && agent.owner_wallet &&
      (walletAddress as string).toLowerCase() === (agent.owner_wallet as string).toLowerCase()) authorized = true
  if (!authorized) {
    return errorResponse('Not authorized', 403)
  }

  // Find Zeabur deployment record
  const deployment = await env.DB.prepare(
    `SELECT id, zeabur_project_id, zeabur_service_id, status, metadata
     FROM v3_zeabur_deployments
     WHERE agent_name = ?1
     ORDER BY created_at DESC LIMIT 1`
  ).bind(agentName).first()

  if (!deployment) {
    return errorResponse('No CanFly deployment found for this agent. Only CanFly-created agents can be deleted here.', 404)
  }

  const zeaburProjectId = deployment.zeabur_project_id as string
  let zeaburDeleted = false
  let zeaburError: string | null = null

  // Delete Zeabur project (if we have the API key in metadata)
  if (zeaburProjectId) {
    try {
      const metadata = JSON.parse((deployment.metadata as string) || '{}')
      const zeaburApiKey = metadata.zeaburApiKey

      if (zeaburApiKey) {
        const r = await fetch(ZEABUR_GRAPHQL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${zeaburApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `mutation { deleteProject(_id: "${zeaburProjectId}") }`,
          }),
        })
        const d = await r.json() as { data?: { deleteProject: boolean }; errors?: Array<{ message: string }> }
        if (d.data?.deleteProject) {
          zeaburDeleted = true
        } else {
          zeaburError = d.errors?.[0]?.message || 'Unknown Zeabur error'
        }
      } else {
        zeaburError = 'No Zeabur API key stored — delete the project manually in Zeabur Dashboard'
      }
    } catch (err) {
      zeaburError = `Zeabur API error: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  // Clean up CanFly DB (regardless of Zeabur deletion result)
  // Order matters: child records first
  await env.DB.prepare(
    'DELETE FROM v3_telegram_connections WHERE agent_name = ?1'
  ).bind(agentName).run()

  await env.DB.prepare(
    `DELETE FROM v3_chat_messages WHERE session_id IN
     (SELECT id FROM v3_chat_sessions WHERE agent_name = ?1)`
  ).bind(agentName).run()

  await env.DB.prepare(
    'DELETE FROM v3_chat_sessions WHERE agent_name = ?1'
  ).bind(agentName).run()

  await env.DB.prepare(
    'DELETE FROM v3_zeabur_deployments WHERE agent_name = ?1'
  ).bind(agentName).run()

  await env.DB.prepare(
    'DELETE FROM agents WHERE name = ?1'
  ).bind(agentName).run()

  // Log activity
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'delete_deployment', ?2)`
  ).bind(agentName, JSON.stringify({
    owner: agent.owner_username,
    zeaburProjectId,
    zeaburDeleted,
    zeaburError,
  })).run()

  return json({
    deleted: true,
    agentName,
    zeaburProjectDeleted: zeaburDeleted,
    zeaburError,
    message: zeaburDeleted
      ? `Agent ${agentName} and its Zeabur project have been completely removed.`
      : `Agent ${agentName} removed from CanFly. ${zeaburError || 'Please also delete the Zeabur project manually.'}`,
  })
}
