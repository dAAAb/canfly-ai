/**
 * POST /api/admin/fix-config — One-off: patch OpenClaw config on a running deployment
 *
 * Re-runs the setting_up_config phase for an existing deployment without
 * triggering a container restart. Uses config.patch CLI or file+SIGUSR1 fallback.
 *
 * Body: { agentName: string }
 * Auth: Bearer CRON_SECRET
 *
 * DELETE THIS FILE after all existing deployments are fixed.
 */
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'
import { importKey, decrypt, encrypt } from '../../lib/crypto'
import {
  zeaburGQL,
  buildConfigPatchPayload,
  patchConfigViaCLI,
  readGatewayToken,
  execCommand,
} from '../../lib/openclaw-config'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  // Auth
  const cronSecret = (env as unknown as Record<string, string>).CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (token !== cronSecret) return errorResponse('Unauthorized', 401)
  }

  const body = await request.json() as { agentName?: string }
  if (!body?.agentName) return errorResponse('agentName is required', 400)

  // Find running deployment
  const deployment = await env.DB.prepare(
    `SELECT id, zeabur_project_id, zeabur_service_id, deploy_url, metadata, phase_data
     FROM v3_zeabur_deployments WHERE agent_name = ?1 AND status = 'running'
     ORDER BY created_at DESC LIMIT 1`
  ).bind(body.agentName).first<{
    id: string; zeabur_project_id: string; zeabur_service_id: string
    deploy_url: string | null; metadata: string; phase_data: string | null
  }>()

  if (!deployment) return errorResponse(`No running deployment for ${body.agentName}`, 404)

  const metadata = JSON.parse(deployment.metadata || '{}')
  const phaseData = JSON.parse(deployment.phase_data || '{}')
  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  const rawKey = metadata.zeaburApiKey || ''
  const zeaburApiKey = cryptoKey && rawKey ? await decrypt(rawKey, cryptoKey) : rawKey
  if (!zeaburApiKey) return errorResponse('Missing Zeabur API key', 500)

  const serviceId = deployment.zeabur_service_id
  const publicUrl = phaseData.publicUrl || deployment.deploy_url || ''

  // Get environment ID
  const envResult = await zeaburGQL(zeaburApiKey, `
    query { project(_id: "${deployment.zeabur_project_id}") { environments { _id name } } }
  `)
  const envs = (envResult.data?.project as { environments: Array<{ _id: string; name: string }> })?.environments || []
  const prodEnv = envs.find(e => e.name === 'production') || envs[0]
  if (!prodEnv) return errorResponse('No environment found', 500)

  const envId = prodEnv._id

  // Step 1: Read current config (before patch)
  let configBefore = ''
  try {
    const { output } = await execCommand(zeaburApiKey, serviceId, envId,
      ['node', '-e', `try{const c=require('json5').parse(require('fs').readFileSync('/home/node/.openclaw/openclaw.json','utf8'));console.log(JSON.stringify(c.gateway?.controlUi))}catch(e){console.log('err:'+e.message)}`],
    )
    configBefore = output.trim()
  } catch { /* ok */ }

  // Step 2: Patch config
  const patchPayload = buildConfigPatchPayload(publicUrl)
  const patchResult = await patchConfigViaCLI(zeaburApiKey, serviceId, envId, patchPayload)

  // Step 3: Read config (after patch)
  let configAfter = ''
  try {
    const { output } = await execCommand(zeaburApiKey, serviceId, envId,
      ['node', '-e', `try{const c=require('json5').parse(require('fs').readFileSync('/home/node/.openclaw/openclaw.json','utf8'));console.log(JSON.stringify(c.gateway?.controlUi))}catch(e){console.log('err:'+e.message)}`],
    )
    configAfter = output.trim()
  } catch { /* ok */ }

  // Step 4: Update gateway token if needed
  let tokenUpdated = false
  if (patchResult.success) {
    const token = await readGatewayToken(zeaburApiKey, serviceId, envId)
    if (token && cryptoKey) {
      const encToken = await encrypt(token, cryptoKey)
      const cardOverride = JSON.stringify({ url: publicUrl, gateway_token: encToken })
      await env.DB.prepare(
        'UPDATE agents SET agent_card_override = ?1 WHERE name = ?2'
      ).bind(cardOverride, body.agentName).run()
      tokenUpdated = true
    }
  }

  // Log
  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'admin_fix_config', ?2)`
  ).bind(body.agentName, JSON.stringify({
    patchResult,
    configBefore: configBefore.slice(0, 500),
    configAfter: configAfter.slice(0, 500),
    tokenUpdated,
  })).run()

  return json({
    agentName: body.agentName,
    patchResult,
    configBefore: configBefore.slice(0, 500),
    configAfter: configAfter.slice(0, 500),
    tokenUpdated,
  })
}
