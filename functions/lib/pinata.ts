/**
 * Pinata Agents API helper — CAN-302
 *
 * Wraps user-JWT-authenticated calls to agents.pinata.cloud. The user provides
 * their own Pinata JWT (CanFly does not own the Pinata account); we proxy on
 * their behalf for the lifetime of the lobster.
 *
 * Verified read endpoints (2026-04-19, see PINATA-API-CAPABILITIES.md):
 *   - GET /v0/agents
 *   - GET /v0/agents/{id}
 *   - GET /v0/agents/{id}/tasks
 *
 * Write endpoints (POST /v0/agents, /v0/secrets, channels) — payload shape is
 * NOT yet officially documented; helper signatures here are based on observed
 * GET response shapes and are pending verification by scripts/spike-pinata-create.ts.
 * Adjust this file once Step 8 spike completes.
 */

const AGENTS_BASE = 'https://agents.pinata.cloud'

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
  jwt: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${AGENTS_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
}

async function ok<T>(res: Response, endpoint: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new PinataApiError(res.status, endpoint, text)
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

export async function pinataListAgents(jwt: string): Promise<PinataAgentsList> {
  const res = await pinataFetch(jwt, '/v0/agents')
  return ok<PinataAgentsList>(res, 'GET /v0/agents')
}

export async function pinataGetAgent(jwt: string, agentId: string): Promise<PinataAgentSummary> {
  const res = await pinataFetch(jwt, `/v0/agents/${agentId}`)
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
  jwt: string,
  payload: CreateSecretPayload
): Promise<{ id: string; name: string }> {
  const res = await pinataFetch(jwt, '/v0/secrets', {
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
  jwt: string,
  payload: CreateAgentPayload
): Promise<CreatedAgent> {
  const res = await pinataFetch(jwt, '/v0/agents', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const body = await ok<{ success: boolean; agent: CreatedAgent }>(res, 'POST /v0/agents')
  return body.agent
}

/** Idempotent — 404 swallowed so rollback paths can call freely. */
export async function pinataDeleteAgent(jwt: string, agentId: string): Promise<void> {
  const res = await pinataFetch(jwt, `/v0/agents/${agentId}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new PinataApiError(res.status, `DELETE /v0/agents/${agentId}`, text)
  }
}

/** Idempotent — 404 swallowed. */
export async function pinataDeleteSecret(jwt: string, secretId: string): Promise<void> {
  const res = await pinataFetch(jwt, `/v0/secrets/${secretId}`, { method: 'DELETE' })
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
  jwt: string,
  agentId: string,
  secretIds: string[]
): Promise<{ attached: number }> {
  const res = await pinataFetch(jwt, `/v0/agents/${agentId}/secrets`, {
    method: 'POST',
    body: JSON.stringify({ secretIds }),
  })
  const body = await ok<{ success: boolean; attached: number }>(res, `POST /v0/agents/${agentId}/secrets`)
  return { attached: body.attached }
}

/**
 * @deprecated Use pinataAttachSecrets which matches Pinata's actual schema.
 * Kept for backward compatibility with earlier draft callers. Will be removed.
 */
export async function pinataAttachSecret(
  jwt: string,
  agentId: string,
  secretId: string
): Promise<void> {
  await pinataAttachSecrets(jwt, agentId, [secretId])
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
export async function pinataGetChannels(jwt: string, agentId: string): Promise<AgentChannels> {
  const res = await pinataFetch(jwt, `/v0/agents/${agentId}/channels`)
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
  jwt: string,
  agentId: string,
  botToken: string
): Promise<ConnectTelegramResult> {
  const res = await pinataFetch(jwt, `/v0/agents/${agentId}/channels/telegram`, {
    method: 'POST',
    body: JSON.stringify({ botToken }),
  })
  // Pinata responses confirmed via spike to include botUsername; status field
  // is inferred — if absent we synthesize 'active' since the call is sync.
  const body = await ok<Record<string, unknown>>(res, `POST /v0/agents/${agentId}/channels/telegram`)
  return {
    botUsername: typeof body.botUsername === 'string' ? body.botUsername : '',
    status: (body.status as ConnectTelegramResult['status']) ?? 'active',
  }
}

// ── Container exec + manifest + restart (verified 2026-04-26) ────────

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

/**
 * Execute a shell command inside the agent's container.
 * Verified endpoint: POST /v0/agents/{id}/console/exec body { command }
 * Used to write /home/node/clawd/manifest.json which controls model.primary
 * (POST /v0/agents and PUT /v0/agents/{id}/config don't accept model fields).
 */
export async function pinataExec(
  jwt: string,
  agentId: string,
  command: string
): Promise<ExecResult> {
  const res = await pinataFetch(jwt, `/v0/agents/${agentId}/console/exec`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  })
  return ok<ExecResult>(res, `POST /v0/agents/${agentId}/console/exec`)
}

/**
 * Restart the agent's container so config / secret changes take effect.
 * POST /v0/agents/{id}/restart → { success: true, message, previousProcessId }
 */
export async function pinataRestartAgent(jwt: string, agentId: string): Promise<void> {
  const res = await pinataFetch(jwt, `/v0/agents/${agentId}/restart`, { method: 'POST' })
  await ok(res, `POST /v0/agents/${agentId}/restart`)
}

/**
 * Set the agent's default LLM model via `openclaw config set`.
 *
 * This MUST run AFTER pinataRestartAgent (so OPENROUTER_API_KEY is loaded
 * into the runtime environment) and CANNOT be followed by another restart —
 * Pinata's restart triggers an R2 snapshot restore that wipes /home/node/.openclaw/openclaw.json
 * back to its baked default of `openrouter/auto`.
 *
 * `openrouter/auto` is OpenRouter's smart-routing model that picks the
 * cheapest/best paid model and is therefore blocked by our limit=0 child
 * keys. Setting an explicit free model id like `openrouter/nvidia/nemotron-3-super-120b-a12b:free`
 * routes calls through that specific free model instead.
 *
 * @param modelSlug full slug, e.g. `openrouter/nvidia/nemotron-3-super-120b-a12b:free`
 */
export async function pinataSetDefaultModel(
  jwt: string,
  agentId: string,
  modelSlug: string
): Promise<void> {
  // Reject anything that isn't a known free-tier shape, defense-in-depth.
  if (!/^openrouter\/[A-Za-z0-9_./-]+:free$/.test(modelSlug)) {
    throw new Error(`Refusing to set non-free model slug: ${modelSlug}`)
  }
  const cmd = `openclaw config set agents.defaults.model.primary ${modelSlug} 2>&1 && echo CFG_OK`
  const res = await pinataExec(jwt, agentId, cmd)
  if (!res.stdout.includes('CFG_OK')) {
    throw new Error(`Failed to set default model: ${res.stderr || res.stdout}`)
  }
}

export async function pinataDisconnectTelegram(jwt: string, agentId: string): Promise<void> {
  const res = await pinataFetch(jwt, `/v0/agents/${agentId}/channels/telegram`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '')
    throw new PinataApiError(res.status, `DELETE /v0/agents/${agentId}/channels/telegram`, text)
  }
}
