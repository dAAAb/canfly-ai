/**
 * POST /api/admin/diagnose — Diagnose a Zeabur deployment
 *
 * Queries Zeabur API for service status, runtime logs, and container state.
 * Body: { projectId: string } or { agentName: string }
 * Auth: Bearer CRON_SECRET
 */
import { type Env, json, errorResponse, handleOptions } from '../community/_helpers'
import { importKey, decrypt } from '../../lib/crypto'
import { zeaburGQL, execCommand } from '../../lib/openclaw-config'

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const cronSecret = (env as unknown as Record<string, string>).CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (token !== cronSecret) return errorResponse('Unauthorized', 401)
  }

  const body = await request.json() as { projectId?: string; agentName?: string }

  // Find deployment by projectId or agentName
  let deployment: { id: string; zeabur_project_id: string; zeabur_service_id: string | null; status: string; metadata: string; phase_data: string | null } | null = null

  if (body.projectId) {
    deployment = await env.DB.prepare(
      `SELECT id, zeabur_project_id, zeabur_service_id, status, metadata, phase_data
       FROM v3_zeabur_deployments WHERE zeabur_project_id = ?1 ORDER BY created_at DESC LIMIT 1`
    ).bind(body.projectId).first()
  } else if (body.agentName) {
    deployment = await env.DB.prepare(
      `SELECT id, zeabur_project_id, zeabur_service_id, status, metadata, phase_data
       FROM v3_zeabur_deployments WHERE agent_name = ?1 ORDER BY created_at DESC LIMIT 1`
    ).bind(body.agentName).first()
  } else {
    return errorResponse('projectId or agentName required', 400)
  }

  if (!deployment) return errorResponse('Deployment not found', 404)

  const metadata = JSON.parse(deployment.metadata || '{}')
  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  const rawKey = metadata.zeaburApiKey || ''
  const zeaburApiKey = cryptoKey && rawKey ? await decrypt(rawKey, cryptoKey) : rawKey
  if (!zeaburApiKey) return errorResponse('Missing Zeabur API key', 500)

  const projectId = deployment.zeabur_project_id
  const results: Record<string, unknown> = { deploymentStatus: deployment.status }

  // 1. List all services + their status
  try {
    const projResult = await zeaburGQL(zeaburApiKey, `
      query { project(_id: "${projectId}") {
        services { _id name }
        environments { _id name }
      } }
    `)
    const proj = projResult.data?.project as {
      services: Array<{ _id: string; name: string }>
      environments: Array<{ _id: string; name: string }>
    } | null

    results.services = proj?.services || []
    results.environments = proj?.environments || []

    const prodEnv = proj?.environments?.find(e => e.name === 'production') || proj?.environments?.[0]

    if (prodEnv && proj?.services) {
      // Get status for each service
      const serviceStatuses: Record<string, unknown>[] = []
      for (const svc of proj.services) {
        try {
          const statusResult = await zeaburGQL(zeaburApiKey, `
            query { service(_id: "${svc._id}") {
              status(environmentID: "${prodEnv._id}")
              ports(environmentID: "${prodEnv._id}") { port }
              domains(environmentID: "${prodEnv._id}") { domain }
            } }
          `)
          const svcData = statusResult.data?.service as { status: string; ports: Array<{ port: number }>; domains: Array<{ domain: string }> } | null
          serviceStatuses.push({
            name: svc.name,
            id: svc._id,
            status: svcData?.status,
            ports: svcData?.ports,
            domains: svcData?.domains,
          })
        } catch (e) {
          serviceStatuses.push({ name: svc.name, id: svc._id, error: String(e) })
        }
      }
      results.serviceStatuses = serviceStatuses

      // 2. Try executeCommand on the OpenClaw service (if we can find it)
      const openclawSvc = proj.services.find(s => s.name === 'OpenClaw')
        || proj.services.find(s => /openclaw/i.test(s.name))

      if (openclawSvc) {
        results.openclawServiceId = openclawSvc._id

        // Check if container is responsive
        try {
          const ping = await execCommand(zeaburApiKey, openclawSvc._id, prodEnv._id,
            ['node', '-e', 'console.log("ALIVE:" + Date.now())'],
          )
          results.containerAlive = ping.output.includes('ALIVE')
          results.containerOutput = ping.output.trim().slice(0, 200)
        } catch (e) {
          results.containerAlive = false
          results.containerError = String(e).slice(0, 200)
        }

        // Check gateway health
        if (results.containerAlive) {
          try {
            const health = await execCommand(zeaburApiKey, openclawSvc._id, prodEnv._id,
              ['node', '-e', `const http=require('http');const r=http.get('http://127.0.0.1:18789/health',(res)=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>console.log('GW:'+res.statusCode+':'+d.slice(0,200)))});r.on('error',(e)=>console.log('GW_ERR:'+e.message));r.setTimeout(5000,()=>{r.destroy();console.log('GW_TIMEOUT')})`],
            )
            results.gatewayHealth = health.output.trim().slice(0, 500)
          } catch (e) {
            results.gatewayHealth = `error: ${e}`
          }

          // Check disk usage
          try {
            const disk = await execCommand(zeaburApiKey, openclawSvc._id, prodEnv._id,
              ['sh', '-c', 'df -h /home/node 2>/dev/null | tail -1; du -sh /home/node/.openclaw 2>/dev/null'],
            )
            results.diskUsage = disk.output.trim().slice(0, 300)
          } catch { /* ok */ }
        }
      }

      // 3. Get runtime logs (last few entries)
      try {
        const logResult = await zeaburGQL(zeaburApiKey, `
          query { runtimeLogs(projectID: "${projectId}", serviceID: "${openclawSvc?._id || proj.services[0]._id}", environmentID: "${prodEnv._id}", timestampCursor: 0) }
        `)
        const logs = logResult.data?.runtimeLogs
        results.runtimeLogs = typeof logs === 'string' ? logs.slice(-2000) : JSON.stringify(logs).slice(-2000)
      } catch (e) {
        results.runtimeLogs = `error: ${e}`
      }
    }
  } catch (e) {
    results.projectError = String(e)
  }

  return json(results)
}
