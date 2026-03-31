/**
 * Shared helpers for Zeabur GraphQL + OpenClaw config patching.
 *
 * Used by clone-zeabur.ts and deploy/[id]/status.ts to avoid duplication
 * and centralise the multi-phase setup logic.
 */

const ZEABUR_GRAPHQL = 'https://api.zeabur.com/graphql'

// ── Zeabur GraphQL ────────────────────────────────────────

export async function zeaburGQL(
  apiKey: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }> {
  const res = await fetch(ZEABUR_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, variables }),
  })
  return res.json() as Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }>
}

// ── Execute command shorthand ─────────────────────────────

export async function execCommand(
  apiKey: string,
  serviceId: string,
  envId: string,
  cmd: string[],
): Promise<{ exitCode: number; output: string }> {
  const result = await zeaburGQL(apiKey,
    `mutation Exec($cmd:[String!]!){executeCommand(serviceID:"${serviceId}",environmentID:"${envId}",command:$cmd){exitCode output}}`,
    { cmd },
  )
  const exec = result.data?.executeCommand as { exitCode?: number; output?: string } | undefined
  return { exitCode: exec?.exitCode ?? -1, output: exec?.output ?? '' }
}

// ── Service readiness check ───────────────────────────────

export async function checkServiceReady(
  apiKey: string,
  serviceId: string,
  envId: string,
): Promise<boolean> {
  try {
    const { output } = await execCommand(apiKey, serviceId, envId, ['node', '-e', 'console.log("READY")'])
    return output.includes('READY')
  } catch {
    return false
  }
}

// ── Read gateway token ────────────────────────────────────

export async function readGatewayToken(
  apiKey: string,
  serviceId: string,
  envId: string,
): Promise<string> {
  try {
    const { output } = await execCommand(apiKey, serviceId, envId,
      ['node', '-e', 'console.log(process.env.OPENCLAW_GATEWAY_TOKEN || "")'],
    )
    return output.replace(/[\r\n\s]+$/g, '')
  } catch {
    return ''
  }
}

// ── Inject CANFLY env vars (create-or-update) ─────────────

export async function injectCanflyEnvVars(
  apiKey: string,
  serviceId: string,
  envId: string,
  vars: Record<string, string>,
): Promise<void> {
  for (const [key, value] of Object.entries(vars)) {
    const cr = await zeaburGQL(apiKey,
      `mutation{createEnvironmentVariable(serviceID:"${serviceId}",environmentID:"${envId}",key:"${key}",value:"${value}"){key}}`,
    ).catch(() => null)
    if (cr?.errors?.length) {
      await zeaburGQL(apiKey,
        `mutation{updateSingleEnvironmentVariable(serviceID:"${serviceId}",environmentID:"${envId}",oldKey:"${key}",newKey:"${key}",value:"${value}"){key}}`,
      ).catch(() => {})
    }
  }
}

// ── Config patch payload builder ──────────────────────────

/**
 * Build a JSON5 merge-patch payload for OpenClaw config.
 * In JSON merge-patch semantics, `null` means "delete this key".
 */
export function buildConfigPatchPayload(
  publicUrl: string,
  opts?: { defaultModel?: string },
): string {
  const origins = [publicUrl, 'https://canfly.ai'].filter(Boolean)

  // Build as a JS object then serialise — cleaner than string concat
  const patch: Record<string, unknown> = {
    gateway: {
      controlUi: {
        allowedOrigins: origins,
        dangerouslyAllowHostHeaderOriginFallback: null,
        allowInsecureAuth: null,
        dangerouslyDisableDeviceAuth: null,
      },
      http: {
        endpoints: {
          chatCompletions: { enabled: true },
        },
      },
    },
    plugins: {
      entries: {
        '@openclaw/plugin-telegram': null,
        'plugin-telegram': null,
      },
    },
    channels: {
      telegram: null,
    },
  }

  // Set default model if non-default
  if (opts?.defaultModel && opts.defaultModel !== 'zeabur-ai/glm-4.7-flash') {
    patch.agents = {
      defaults: {
        model: {
          primary: opts.defaultModel,
        },
      },
    }
  }

  return JSON.stringify(patch)
}

// ── Patch config via OpenClaw CLI (with fs.writeFileSync fallback) ──

export interface PatchResult {
  success: boolean
  method: 'cli' | 'fallback'
  error?: string
}

/**
 * Patch OpenClaw config using the runtime `config.patch` RPC (preferred)
 * or fall back to direct file write for older OpenClaw versions.
 *
 * CLI approach uses SIGUSR1 (in-process restart) — no container restart,
 * so the entrypoint script does NOT re-run and config is preserved.
 */
export async function patchConfigViaCLI(
  apiKey: string,
  serviceId: string,
  envId: string,
  patchPayload: string,
): Promise<PatchResult> {
  // Step 1: try `openclaw gateway call config.get --json` to get current hash
  try {
    const getResult = await execCommand(apiKey, serviceId, envId,
      ['openclaw', 'gateway', 'call', 'config.get', '--json'],
    )

    // Parse hash from output — look for "hash" field in JSON output
    const hashMatch = getResult.output.match(/"hash"\s*:\s*"([^"]+)"/)
    if (!hashMatch) {
      // CLI exists but couldn't parse output — try with node fallback
      throw new Error(`Could not parse config.get output: ${getResult.output.slice(0, 200)}`)
    }
    const baseHash = hashMatch[1]

    // Step 2: call config.patch with the payload
    const patchParams = JSON.stringify({ raw: patchPayload, baseHash })
    const patchResult = await execCommand(apiKey, serviceId, envId,
      ['openclaw', 'gateway', 'call', 'config.patch', '--params', patchParams],
    )

    // Check for success
    if (patchResult.output.includes('"ok"') || patchResult.output.includes('true') || patchResult.exitCode === 0) {
      return { success: true, method: 'cli' }
    }

    return { success: false, method: 'cli', error: `config.patch returned: ${patchResult.output.slice(0, 300)}` }
  } catch (cliError) {
    // CLI not available or failed — fallback to fs.writeFileSync (no restart after)
    try {
      const fallbackResult = await patchConfigViaFile(apiKey, serviceId, envId, patchPayload)
      return fallbackResult
    } catch (fallbackError) {
      return { success: false, method: 'fallback', error: `CLI: ${cliError}; Fallback: ${fallbackError}` }
    }
  }
}

/**
 * Fallback: patch config by directly writing openclaw.json.
 * Does NOT trigger a restart (caller should NOT restart, or the entrypoint
 * will overwrite the file).
 */
async function patchConfigViaFile(
  apiKey: string,
  serviceId: string,
  envId: string,
  patchPayload: string,
): Promise<PatchResult> {
  // Parse the patch payload to build a file-write script
  const patch = JSON.parse(patchPayload)
  const origins = JSON.stringify(patch.gateway?.controlUi?.allowedOrigins || [])
  const defaultModel = patch.agents?.defaults?.model?.primary

  // Build the node script (same approach as before, but with null-deletion semantics)
  let script = `const fs=require('fs'),J=require('json5'),f='/home/node/.openclaw/openclaw.json';`
  script += `try{const c=J.parse(fs.readFileSync(f,'utf8'));`
  script += `c.gateway.controlUi.allowedOrigins=${origins};`
  script += `delete c.gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback;`
  script += `delete c.gateway.controlUi.allowInsecureAuth;`
  script += `delete c.gateway.controlUi.dangerouslyDisableDeviceAuth;`
  script += `if(!c.gateway.http)c.gateway.http={endpoints:{chatCompletions:{enabled:true}}};`
  script += `else{c.gateway.http.endpoints=c.gateway.http.endpoints||{};c.gateway.http.endpoints.chatCompletions={enabled:true}};`
  if (defaultModel) {
    script += `c.agents=c.agents||{};c.agents.defaults=c.agents.defaults||{};c.agents.defaults.model=c.agents.defaults.model||{};c.agents.defaults.model.primary=${JSON.stringify(defaultModel)};`
  }
  script += `if(c.plugins&&c.plugins.entries){delete c.plugins.entries['@openclaw/plugin-telegram'];delete c.plugins.entries['plugin-telegram']};`
  script += `if(c.channels){delete c.channels.telegram};`
  script += `fs.writeFileSync(f,JSON.stringify(c,null,2));console.log('patched')`
  script += `}catch(e){console.log('err:'+e.message)}`

  const { output } = await execCommand(apiKey, serviceId, envId, ['node', '-e', script])

  if (output.includes('patched')) {
    return { success: true, method: 'fallback' }
  }
  return { success: false, method: 'fallback', error: `File patch output: ${output.slice(0, 200)}` }
}

// ── Phase timeout check ───────────────────────────────────

const PHASE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Check if the current phase has been running too long.
 * Returns true if timed out.
 */
export function isPhaseTimedOut(phaseStartedAt: string | null): boolean {
  if (!phaseStartedAt) return false
  const started = new Date(phaseStartedAt).getTime()
  return Date.now() - started > PHASE_TIMEOUT_MS
}

// ── UUID generator ────────────────────────────────────────

export function generateUUID(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// ── Find OpenClaw service in project ──────────────────────

export function findOpenClawService(
  services: Array<{ _id: string; name: string }>,
): { _id: string; name: string } | undefined {
  return services.find(s => s.name === 'OpenClaw')
    || services.find(s => /openclaw/i.test(s.name) && !/sandbox|browser|devbox|wings/i.test(s.name))
}
