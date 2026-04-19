/**
 * POST /api/agents/:name/telegram-approve — Approve a Telegram pairing code
 *
 * After the user sends /start on Telegram, the bot returns a pairing code.
 * The user pastes it back into CanFly and this endpoint runs
 * `openclaw pairing approve telegram <code>` inside the container, which adds
 * the Telegram user to the bot's allowlist and fully activates the connection.
 *
 * On success, flips v3_telegram_connections.status from 'pending' to 'active'.
 *
 * Auth: agent owner.
 */
import { type Env, json, errorResponse, handleOptions, parseBody } from '../../community/_helpers'
import { authenticateRequest } from '../../_auth'
import { importKey, decrypt } from '../../../lib/crypto'
import { zeaburGQL, execCommand } from '../../../lib/openclaw-config'

interface ApproveBody { pairingCode: string }

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const agent = await env.DB.prepare(
    'SELECT owner_username FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ owner_username: string | null }>()
  if (!agent) return errorResponse('Agent not found', 404)
  if (agent.owner_username !== auth.username) return errorResponse('Not authorized', 403)

  const body = await parseBody<ApproveBody>(request)
  const code = (body?.pairingCode || '').trim().toUpperCase()
  // OpenClaw pairing codes look like ABC12DEF — accept 4-16 alnum chars.
  if (!/^[A-Z0-9]{4,16}$/.test(code)) {
    return errorResponse('Invalid pairing code format', 400)
  }

  const connection = await env.DB.prepare(
    `SELECT id, status FROM v3_telegram_connections WHERE agent_name = ?1
     ORDER BY updated_at DESC LIMIT 1`
  ).bind(agentName).first<{ id: string; status: string }>()
  if (!connection) return errorResponse('No Telegram connection to approve', 404)

  const deployment = await env.DB.prepare(
    `SELECT zeabur_project_id, zeabur_service_id, metadata FROM v3_zeabur_deployments
     WHERE agent_name = ?1 ORDER BY updated_at DESC LIMIT 1`
  ).bind(agentName).first<{
    zeabur_project_id: string; zeabur_service_id: string | null; metadata: string
  }>()
  if (!deployment?.zeabur_service_id) {
    return errorResponse('Agent has no Zeabur deployment', 422)
  }

  const metadata = JSON.parse(deployment.metadata || '{}') as Record<string, unknown>
  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  const rawKey = (metadata.zeaburApiKey as string) || ''
  const zeaburApiKey = cryptoKey && rawKey ? await decrypt(rawKey, cryptoKey) : rawKey
  if (!zeaburApiKey) return errorResponse('Missing Zeabur API key', 500)

  const envResult = await zeaburGQL(zeaburApiKey, `
    query { project(_id: "${deployment.zeabur_project_id}") { environments { _id name } } }
  `)
  const envs = (envResult.data?.project as { environments: Array<{ _id: string; name: string }> })?.environments || []
  const prodEnv = envs.find(e => e.name === 'production') || envs[0]
  if (!prodEnv) return errorResponse('No environment found', 500)

  // Single exec: try each known CLI path and run the approve command inline.
  // Two round-trips (env lookup + this) fit safely inside CF Pages' 30s cap;
  // the previous three-step flow (env + discovery + approve) routinely timed
  // out and surfaced as "Network error" in the browser.
  const safeCode = code.replace(/[^A-Z0-9]/g, '') // already validated by regex, belt-and-braces
  const approveResult = await execCommand(
    zeaburApiKey, deployment.zeabur_service_id, prodEnv._id,
    ['sh', '-c',
      `NO_COLOR=1 TERM=dumb; for bin in openclaw /home/node/.openclaw/bin/openclaw /usr/local/bin/openclaw; do ` +
      `command -v "$bin" >/dev/null 2>&1 || [ -x "$bin" ] || continue; ` +
      `"$bin" pairing approve telegram ${safeCode} 2>&1; exit $?; done; echo NO_CLI_FOUND; exit 127`,
    ],
  )
  const output = approveResult.output || ''
  const approved = approveResult.exitCode === 0 &&
    /approved|success|\bok\b/i.test(output) &&
    !/error|failed|not found/i.test(output)

  if (!approved) {
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'telegram_pair_failed', ?2)`
    ).bind(agentName, JSON.stringify({
      owner: auth.username,
      exitCode: approveResult.exitCode,
      output: output.slice(0, 300),
    })).run()
    return json({
      approved: false,
      error: output.slice(0, 300) || `Pairing approval failed (exit ${approveResult.exitCode})`,
    }, 400)
  }

  await env.DB.prepare(
    `UPDATE v3_telegram_connections SET status = 'active',
      connected_at = COALESCE(connected_at, datetime('now')),
      updated_at = datetime('now')
     WHERE id = ?1`
  ).bind(connection.id).run()

  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'telegram_paired', ?2)`
  ).bind(agentName, JSON.stringify({ owner: auth.username })).run()

  return json({ approved: true, status: 'active' })
}
