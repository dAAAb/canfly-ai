/**
 * Pinata Agents API helper — CAN-302
 *
 * Wraps user-JWT-authenticated calls to agents.pinata.cloud. The user provides
 * their own Pinata JWT (CanFly does not own the Pinata account); we proxy on
 * their behalf for the lifetime of the lobster.
 *
 * ⚠️ Why this uses `cloudflare:sockets` instead of fetch():
 *   Pinata's CF zone rejects any incoming request carrying CF-Connecting-IP
 *   (verified 2026-04-26 via header bisection). CF Workers' fetch() auto-injects
 *   that header on cross-zone subrequests. Cloudflare's Smart Shield docs note
 *   `connect()` and `fetch()` use different egress paths — `connect()` is raw
 *   TCP without the auto-injection, so we use that via fetchViaSockets().
 *
 * Optional: setting env.PINATA_RELAY_URL still routes through a non-CF relay
 * (see relay/README.md) — useful as a fallback if cloudflare:sockets ever
 * stops working or has issues in a specific edge.
 */
import { fetchViaSockets } from './pinata-sockets'

const AGENTS_DIRECT = 'https://agents.pinata.cloud'

/** Subset of Env we need — accepts the fuller community/_helpers Env via structural typing. */
export interface PinataEnv {
  PINATA_RELAY_URL?: string
}

/** Raised on any non-2xx response. Status preserved so callers can map to HTTP codes. */
export class PinataApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly body: string
  ) {
    super(`Pinata ${endpoint} → ${status}: ${body}`)
    this.name = 'PinataApiError'
  }
}

async function pinataFetch(
  env: PinataEnv,
  jwt: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const headers = {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    ...(init?.headers || {}),
  }

  // Optional escape hatch: route through a non-CF relay (Deno Deploy etc.)
  // if PINATA_RELAY_URL is set. Default path uses cloudflare:sockets.
  const relay = env.PINATA_RELAY_URL
  if (relay && /^https?:\/\//.test(relay)) {
    return fetch(`${relay.replace(/\/$/, '')}${path}`, { ...init, headers })
  }
  return fetchViaSockets(`${AGENTS_DIRECT}${path}`, { ...init, headers })
}

async function ok<T>(res: Response, endpoint: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new PinataApiError(res.status, endpoint, text)
  }
  // Defensive: 200 with HTML body usually means we hit a Cloudflare challenge
  // / cached error page, not the real API. Surface it as a typed error
  // instead of crashing on JSON.parse downstream.
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('json')) {
    const text = await res.text().catch(() => '')
    throw new PinataApiError(
      res.status,
      endpoint,
      `Non-JSON response (content-type: ${ct}): ${text.slice(0, 200)}`,
    )
  }
  return (await res.json()) as T
}

// ── Read (verified) ───────────────────────────────────────────────────

export interface PinataAgentSummary {
  agentId: string
  userId: string
  name: string
  description?: string
  emoji?: string
  vibe?: string
  status: string
  agentVersion?: string
  hostProvider?: string
  channelsJson?: string
  manifestJson?: string
  // ⚠️ Sensitive — only persist a hash, never plaintext:
  gatewayToken?: string
}

/** FREE tier accounts get a runtime budget exposed as a structured object. */
export interface PinataTimeCredits {
  totalSeconds: number
  usedSeconds: number
  remainingSeconds: number
  isTicking: boolean
}

export interface PinataAgentsList {
  agents: PinataAgentSummary[]
  agentLimit: number
  /** Object on FREE tier ({totalSeconds, usedSeconds, ...}); null on paid tiers. */
  timeCredits: PinataTimeCredits | null
}

export async function pinataListAgents(env: PinataEnv, jwt: string): Promise<PinataAgentsList> {
  const res = await pinataFetch(env, jwt, '/v0/agents')
  return ok<PinataAgentsList>(res, 'GET /v0/agents')
}

export async function pinataGetAgent(env: PinataEnv, jwt: string, agentId: string): Promise<PinataAgentSummary> {
  const res = await pinataFetch(env, jwt, `/v0/agents/${agentId}`)
  return ok<PinataAgentSummary>(res, `GET /v0/agents/${agentId}`)
}

// ── Write (verified 2026-04-25 via scripts/spike-pinata-create.ts) ────

/**
 * Pinata Secrets are a flat env-var-style key→value vault on the user's
 * Pinata account. There is no `provider` enum — it's just `name + value`.
 * The `name` must match env var rules: [A-Z_][A-Z0-9_]*.
 *
 * For OpenRouter integration, name = "OPENROUTER_API_KEY" so OpenClaw picks
 * it up out of the box (matches `aiProviderEnvVar('openrouter')` from
 * functions/api/zeabur/deploy.ts).
 */
export interface CreateSecretPayload {
  /** Env-var name (UPPERCASE_WITH_UNDERSCORES). E.g. 'OPENROUTER_API_KEY'. */
  name: string
  /** Plaintext value. Caller should pass freshly-decrypted then drop ASAP. */
  value: string
}

export interface CreateAgentPayload {
  name: string
  description?: string
  emoji?: string
  vibe?: string
}

export interface CreatedAgent {
  agentId: string
  userId: string
  name: string
  description: string | null
  vibe: string | null
  emoji: string | null
  /** ⚠️ Sensitive — only persist a hash. Used for WebSocket chat. */
  gatewayToken: string
  createdAt: string
  status: string
  hostProvider: string
}

/** POST /v0/secrets → { success, secret: { id, name, type, ... } } */
export async function pinataCreateSecret(
  env: PinataEnv,
  jwt: string,
  payload: CreateSecretPayload
): Promise<{ id: string; name: string }> {
  const res = await pinataFetch(env, jwt, '/v0/secrets', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const body = await ok<{ success: boolean; secret: { id: string; name: string } }>(res, 'POST /v0/secrets')
  return { id: body.secret.id, name: body.secret.name }
}

/**
 * POST /v0/agents → { success: true, agent: {...} }
 * Pinata accepts: name (required), description, vibe, emoji.
 * The created agent is automatically `status: 'running'`.
 */
export async function pinataCreateAgent(
  env: PinataEnv,
  jwt: string,
  payload: CreateAgentPayload
): Promise<CreatedAgent> {
  const res = await pinataFetch(env, jwt, '/v0/agents', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const body = await ok<{ success: boolean; agent: CreatedAgent }>(res, 'POST /v0/agents')
  return body.agent
}

/** Idempotent — 404 swallowed so rollback paths can call freely. */
export async function pinataDeleteAgent(env: PinataEnv, jwt: string, agentId: string): Promise<void> {
  const res = await pinataFetch(env, jwt, `/v0/agents/${agentId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new PinataApiError(res.status, `DELETE /v0/agents/${agentId}`, text)
  }
}

/** Idempotent — 404 swallowed. */
export async function pinataDeleteSecret(env: PinataEnv, jwt: string, secretId: string): Promise<void> {
  const res = await pinataFetch(env, jwt, `/v0/secrets/${secretId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new PinataApiError(res.status, `DELETE /v0/secrets/${secretId}`, text)
  }
}

/**
 * Attach one or more existing secrets to an agent.
 * POST /v0/agents/{id}/secrets body: { secretIds: ["...", ...] }
 */
export async function pinataAttachSecrets(
  env: PinataEnv,
  jwt: string,
  agentId: string,
  secretIds: string[]
): Promise<{ attached: number }> {
  const res = await pinataFetch(env, jwt, `/v0/agents/${agentId}/secrets`, {
    method: 'POST',
    body: JSON.stringify({ secretIds }),
  })
  const body = await ok<{ success: boolean; attached: number }>(res, `POST /v0/agents/${agentId}/secrets`)
  return { attached: body.attached }
}

// ── Channels (verified 2026-04-25; Telegram only for V4 Phase A) ──────

export interface AgentChannels {
  telegram: { botUsername?: string; [k: string]: unknown } | null
  slack: unknown | null
  discord: unknown | null
  whatsapp: unknown | null
  version?: string
}

export interface ConnectTelegramResult {
  botUsername: string
  status: 'pending' | 'active' | 'failed'
}

/** Read all channel bindings on an agent in one call. */
export async function pinataGetChannels(env: PinataEnv, jwt: string, agentId: string): Promise<AgentChannels> {
  const res = await pinataFetch(env, jwt, `/v0/agents/${agentId}/channels`)
  return ok<AgentChannels>(res, `GET /v0/agents/${agentId}/channels`)
}

/**
 * POST /v0/agents/{id}/channels/telegram body: { botToken: "<BotFather token>" }
 *
 * Pinata verifies the token against Telegram's getMe endpoint synchronously,
 * returning 400 with `{ error: "Telegram rejected the bot token: ..." }` if
 * Telegram rejects it. On success, the channel binding is active immediately
 * (no separate pairing step like the Zeabur OpenClaw flow).
 */
export async function pinataConnectTelegram(
  env: PinataEnv,
  jwt: string,
  agentId: string,
  botToken: string
): Promise<ConnectTelegramResult> {
  const res = await pinataFetch(env, jwt, `/v0/agents/${agentId}/channels/telegram`, {
    method: 'POST',
    body: JSON.stringify({ botToken }),
  })
  const body = await ok<Record<string, unknown>>(res, `POST /v0/agents/${agentId}/channels/telegram`)
  return {
    botUsername: typeof body.botUsername === 'string' ? body.botUsername : '',
    status: (body.status as ConnectTelegramResult['status']) ?? 'active',
  }
}

export async function pinataDisconnectTelegram(env: PinataEnv, jwt: string, agentId: string): Promise<void> {
  const res = await pinataFetch(env, jwt, `/v0/agents/${agentId}/channels/telegram`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new PinataApiError(res.status, `DELETE /v0/agents/${agentId}/channels/telegram`, text)
  }
}

// ── Container exec + restart + model selection (verified 2026-04-26) ──

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Execute a shell command inside the agent's container.
 * Verified endpoint: POST /v0/agents/{id}/console/exec body { command }
 */
export async function pinataExec(
  env: PinataEnv,
  jwt: string,
  agentId: string,
  command: string
): Promise<ExecResult> {
  const res = await pinataFetch(env, jwt, `/v0/agents/${agentId}/console/exec`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  })
  return ok<ExecResult>(res, `POST /v0/agents/${agentId}/console/exec`)
}

/**
 * Restart the agent's container so config / secret changes take effect.
 * POST /v0/agents/{id}/restart → { success: true, message, previousProcessId }
 */
export async function pinataRestartAgent(env: PinataEnv, jwt: string, agentId: string): Promise<void> {
  const res = await pinataFetch(env, jwt, `/v0/agents/${agentId}/restart`, { method: 'POST' })
  await ok(res, `POST /v0/agents/${agentId}/restart`)
}

/**
 * Set the agent's default LLM model via `openclaw config set`.
 *
 * MUST run AFTER pinataRestartAgent (so OPENROUTER_API_KEY is loaded into the
 * runtime env) and CANNOT be followed by another restart — Pinata's restart
 * triggers an R2 snapshot restore that wipes /home/node/.openclaw/openclaw.json
 * back to baseline `openrouter/auto` (which routes to a paid model and trips
 * our limit=0 child key).
 *
 * @param modelSlug full slug, e.g. `openrouter/nvidia/nemotron-3-super-120b-a12b:free`
 */
export async function pinataSetDefaultModel(
  env: PinataEnv,
  jwt: string,
  agentId: string,
  modelSlug: string
): Promise<void> {
  if (!/^openrouter\/[A-Za-z0-9_./-]+:free$/.test(modelSlug)) {
    throw new Error(`Refusing to set non-free model slug: ${modelSlug}`)
  }
  const cmd = `openclaw config set agents.defaults.model.primary ${modelSlug} 2>&1 && echo CFG_OK`
  const res = await pinataExec(env, jwt, agentId, cmd)
  if (!res.stdout.includes('CFG_OK')) {
    throw new Error(`Failed to set default model: ${res.stderr || res.stdout}`)
  }
}
