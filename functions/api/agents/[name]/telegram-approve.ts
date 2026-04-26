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
import { pinataExec } from '../../../lib/pinata'

interface ApproveBody { pairingCode: string }

export const onRequestOptions: PagesFunction<Env> = () => handleOptions()

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const agent = await env.DB.prepare(
    'SELECT owner_username, hosting FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ owner_username: string | null; hosting: string | null }>()
  if (!agent) return errorResponse('Agent not found', 404)
  if (agent.owner_username !== auth.username) return errorResponse('Not authorized', 403)

  const body = await parseBody<ApproveBody>(request)
  const code = (body?.pairingCode || '').trim().toUpperCase()
  // OpenClaw pairing codes look like ABC12DEF — accept 4-16 alnum chars.
  if (!/^[A-Z0-9]{4,16}$/.test(code)) {
    return errorResponse('Invalid pairing code format', 400)
  }

  // ── Pinata path: run `openclaw pairing approve` via pinataExec ──
  if (agent.hosting === 'pinata') {
    return await approveOnPinata(env, agentName, auth.username, code)
  }

  const connection = await env.DB.prepare(
    `SELECT id, status FROM v3_telegram_connections WHERE agent_name = ?1
     ORDER BY updated_at DESC LIMIT 1`
  ).bind(agentName).first<{ id: string; status: string }>()
  if (!connection) return errorResponse('No Telegram connection to approve', 404)

  const deployment = await env.DB.prepare(
    `SELECT zeabur_project_id, zeabur_service_id, metadata, phase_data FROM v3_zeabur_deployments
     WHERE agent_name = ?1 ORDER BY updated_at DESC LIMIT 1`
  ).bind(agentName).first<{
    zeabur_project_id: string; zeabur_service_id: string | null; metadata: string; phase_data: string | null
  }>()
  if (!deployment?.zeabur_service_id) {
    return errorResponse('Agent has no Zeabur deployment', 422)
  }

  const metadata = JSON.parse(deployment.metadata || '{}') as Record<string, unknown>
  const phaseData = JSON.parse(deployment.phase_data || '{}') as Record<string, unknown>
  const cryptoKey = env.ENCRYPTION_KEY ? await importKey(env.ENCRYPTION_KEY) : null
  const rawKey = (metadata.zeaburApiKey as string) || ''
  const zeaburApiKey = cryptoKey && rawKey ? await decrypt(rawKey, cryptoKey) : rawKey
  if (!zeaburApiKey) return errorResponse('Missing Zeabur API key', 500)

  // Reuse cached prodEnvId from phase_data — saves one Zeabur round-trip.
  // Fall back to the project→environments query only if not cached (old
  // deployments from before this field was persisted).
  let envId = (phaseData.prodEnvId as string) || ''
  if (!envId) {
    const envResult = await zeaburGQL(zeaburApiKey, `
      query { project(_id: "${deployment.zeabur_project_id}") { environments { _id name } } }
    `)
    const envs = (envResult.data?.project as { environments: Array<{ _id: string; name: string }> })?.environments || []
    const prodEnv = envs.find(e => e.name === 'production') || envs[0]
    if (!prodEnv) return errorResponse('No environment found', 500)
    envId = prodEnv._id
  }

  // Run pairing approve via gateway RPC — same WebSocket endpoint config.patch
  // uses (known fast and reliable when gateway is up). Single attempt, 22s
  // cap: two attempts × 18s each previously blew past CF Pages' 30s wall
  // clock and surfaced as 500 + CF edge HTML.
  //
  // If the gateway RPC isn't available on this OpenClaw version, the CLI
  // exits fast with a clear error that we surface to the user.
  const safeCode = code.replace(/[^A-Z0-9]/g, '') // already validated by regex, belt-and-braces
  const rpcParams = JSON.stringify({ channel: 'telegram', code: safeCode }).replace(/'/g, `'\\''`)
  const script =
    `NO_COLOR=1 TERM=dumb; ` +
    `BIN=""; for b in openclaw /home/node/.openclaw/bin/openclaw /usr/local/bin/openclaw; do ` +
    `  if command -v "$b" >/dev/null 2>&1; then BIN="$b"; break; fi; ` +
    `done; ` +
    `if [ -z "$BIN" ]; then echo NO_CLI_FOUND; exit 127; fi; ` +
    `timeout 22 "$BIN" gateway call pairing.approve --params '${rpcParams}' --json 2>&1; exit $?`

  let approveResult: { exitCode: number; output: string }
  try {
    approveResult = await execCommand(zeaburApiKey, deployment.zeabur_service_id, envId, ['sh', '-c', script])
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'telegram_pair_failed', ?2)`
    ).bind(agentName, JSON.stringify({ owner: auth.username, transport: 'exec_failed', error: msg })).run()
    return json({
      approved: false,
      error: `Could not reach the agent container: ${msg}. Disconnect and try again — the pairing code may also have expired.`,
    }, 502)
  }

  const stripAnsi = (s: string) => s.replace(/\u001b\[[0-9;?]*[a-zA-Z]/g, '').replace(/[\r\u2500-\u257f\u25cb-\u25ff]/g, '')
  const output = stripAnsi(approveResult.output || '')
  // exit 124 == timeout(1) killed the process. Surface that distinctly.
  const timedOut = approveResult.exitCode === 124
  const approved = !timedOut && approveResult.exitCode === 0 &&
    (/approved|success|"ok"\s*:\s*true|\bok\b/i.test(output)) &&
    !/error|failed|not found/i.test(output)

  if (!approved) {
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'telegram_pair_failed', ?2)`
    ).bind(agentName, JSON.stringify({
      owner: auth.username,
      exitCode: approveResult.exitCode,
      timedOut,
      output: output.slice(0, 400),
    })).run()
    const userMsg = timedOut
      ? 'The agent container did not respond in time (gateway may be busy). Disconnect Telegram and try again — the pairing code may have expired too.'
      : (output.slice(0, 300) || `Pairing approval failed (exit ${approveResult.exitCode})`)
    return json({ approved: false, error: userMsg }, 400)
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

// ── PATCH: Manual "mark as active" escape hatch ───────────
/**
 * When the CLI-based approve keeps timing out but the user can confirm the
 * bot is responding on Telegram (e.g. received an LLM reply to /start), we
 * trust them and flip the DB row to 'active' without rerunning the CLI.
 * The functional state matters; the DB status is just UI bookkeeping.
 */
// ── Pinata-hosted approve helper ──────────────────────────────────────
// Pinata lobsters don't have a v3_telegram_connections row (the channel state
// lives in Pinata's channelsJson). We just need to exec the pairing approve
// command in the agent's container — same OpenClaw CLI, different transport.
async function approveOnPinata(
  env: Env,
  agentName: string,
  username: string,
  code: string,
): Promise<Response> {
  const deployment = await env.DB.prepare(
    `SELECT id, pinata_agent_id, metadata FROM v3_pinata_deployments
     WHERE agent_name = ?1 AND status NOT IN ('stopped', 'failed')
     ORDER BY created_at DESC LIMIT 1`
  ).bind(agentName).first<{ id: string; pinata_agent_id: string | null; metadata: string }>()
  if (!deployment?.pinata_agent_id) return errorResponse('No active Pinata deployment', 404)

  if (!env.ENCRYPTION_KEY) return errorResponse('Server is missing ENCRYPTION_KEY', 500)
  const cryptoKey = await importKey(env.ENCRYPTION_KEY)
  const meta = JSON.parse(deployment.metadata || '{}') as { pinataJwt?: string }
  if (!meta.pinataJwt) return errorResponse('Deployment metadata missing JWT', 500)
  const jwt = await decrypt(meta.pinataJwt, cryptoKey)

  const safeCode = code.replace(/[^A-Z0-9]/g, '')
  const command = `openclaw pairing approve telegram ${safeCode}`

  let result: { stdout?: string; stderr?: string; exitCode?: number; output?: string }
  try {
    result = await pinataExec(env, jwt, deployment.pinata_agent_id, command)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'telegram_pair_failed', ?2)`
    ).bind(agentName, JSON.stringify({ owner: username, transport: 'pinata_exec_failed', error: msg })).run()
    return json({
      approved: false,
      error: `Could not reach the Pinata agent: ${msg}. The pairing code may also have expired — message the bot again to get a new one.`,
    }, 502)
  }

  const stripAnsi = (s: string) => s.replace(/\[[0-9;?]*[a-zA-Z]/g, '')
  const output = stripAnsi((result.stdout || '') + (result.stderr || '') + (result.output || ''))
  const approved = (result.exitCode === 0 || result.exitCode == null) &&
    /approved|success|"ok"\s*:\s*true|\bok\b/i.test(output) &&
    !/error|failed|not found|expired/i.test(output)

  if (!approved) {
    await env.DB.prepare(
      `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
       VALUES ('agent', ?1, 'telegram_pair_failed', ?2)`
    ).bind(agentName, JSON.stringify({
      owner: username, exitCode: result.exitCode, output: output.slice(0, 400),
    })).run()
    return json({
      approved: false,
      error: output.slice(0, 300) || `Pairing approval failed (exit ${result.exitCode})`,
    }, 400)
  }

  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'telegram_paired', ?2)`
  ).bind(agentName, JSON.stringify({ owner: username, transport: 'pinata' })).run()

  return json({ approved: true, status: 'active' })
}

export const onRequestPatch: PagesFunction<Env> = async ({ env, params, request }) => {
  const agentName = params.name as string

  const auth = await authenticateRequest(request, env.DB, env.PRIVY_APP_ID)
  if (!auth) return errorResponse('Authentication required', 401)

  const agent = await env.DB.prepare(
    'SELECT owner_username FROM agents WHERE name = ?1'
  ).bind(agentName).first<{ owner_username: string | null }>()
  if (!agent) return errorResponse('Agent not found', 404)
  if (agent.owner_username !== auth.username) return errorResponse('Not authorized', 403)

  const connection = await env.DB.prepare(
    `SELECT id, status FROM v3_telegram_connections WHERE agent_name = ?1
     ORDER BY updated_at DESC LIMIT 1`
  ).bind(agentName).first<{ id: string; status: string }>()
  if (!connection) return errorResponse('No Telegram connection to mark', 404)

  await env.DB.prepare(
    `UPDATE v3_telegram_connections SET status = 'active',
      connected_at = COALESCE(connected_at, datetime('now')),
      error_message = NULL,
      updated_at = datetime('now')
     WHERE id = ?1`
  ).bind(connection.id).run()

  await env.DB.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, action, metadata)
     VALUES ('agent', ?1, 'telegram_manually_activated', ?2)`
  ).bind(agentName, JSON.stringify({ owner: auth.username, previousStatus: connection.status })).run()

  return json({ approved: true, status: 'active', manual: true })
}
