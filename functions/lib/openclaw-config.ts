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
    // Check that the container is up AND the gateway port is listening
    // Just running node proves the container is alive, but not that OpenClaw gateway has booted
    const { output } = await execCommand(apiKey, serviceId, envId,
      ['node', '-e', `const http=require('http');const r=http.get('http://127.0.0.1:18789/health',(res)=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>console.log('READY:'+res.statusCode))});r.on('error',()=>console.log('NOT_READY'));r.setTimeout(3000,()=>{r.destroy();console.log('NOT_READY')})`],
    )
    return output.includes('READY:')
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

// ── Auth profiles (API key injection for providers) ──────

/**
 * Write a provider API key into OpenClaw's auth-profiles.json.
 * This is needed because OpenClaw's sandbox strips env vars for security,
 * so env-var-based auth (OPENROUTER_API_KEY etc.) doesn't always work.
 *
 * Format: { version: 1, profiles: { "<provider>:default": { type: "api_key", provider, key } } }
 *
 * Merges with existing profiles (doesn't overwrite other providers).
 */
export async function writeAuthProfile(
  zeaburApiKey: string,
  serviceId: string,
  envId: string,
  provider: string,
  apiKey: string,
): Promise<{ success: boolean; error?: string }> {
  if (!apiKey || !provider) return { success: true } // nothing to write

  const profileKey = `${provider}:default`
  const profile = JSON.stringify({ type: 'api_key', provider, key: apiKey })

  const script = [
    `const fs=require('fs'),path=require('path');`,
    `const dirs=['/home/node/.openclaw/agents/main/agent','/home/node/.openclaw'];`,
    `let written=false;`,
    `for(const d of dirs){`,
    `  const f=d+'/auth-profiles.json';`,
    `  try{`,
    `    fs.mkdirSync(d,{recursive:true});`,
    `    let data={version:1,profiles:{}};`,
    `    try{data=JSON.parse(fs.readFileSync(f,'utf8'))}catch{}`,
    `    data.profiles=data.profiles||{};`,
    `    data.profiles[${JSON.stringify(profileKey)}]=${profile};`,
    `    fs.writeFileSync(f,JSON.stringify(data,null,2));`,
    `    written=true;`,
    `  }catch(e){console.log('skip:'+d+':'+e.message)}`,
    `}`,
    `console.log(written?'auth_ok':'auth_fail')`,
  ].join('')

  try {
    const { output } = await execCommand(zeaburApiKey, serviceId, envId, ['node', '-e', script])
    if (output.includes('auth_ok')) {
      return { success: true }
    }
    return { success: false, error: `auth-profiles write: ${output.slice(0, 200)}` }
  } catch (err) {
    return { success: false, error: `auth-profiles exec: ${(err as Error).message}` }
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
  // Step 1: find the openclaw CLI binary
  let cliBin = ''
  try {
    const findResult = await execCommand(apiKey, serviceId, envId,
      ['sh', '-c', 'which openclaw 2>/dev/null || ls /home/node/.openclaw/bin/openclaw 2>/dev/null || ls /usr/local/bin/openclaw 2>/dev/null || echo "NOT_FOUND"'],
    )
    const path = findResult.output.trim().split('\n')[0]
    if (path && !path.includes('NOT_FOUND')) {
      cliBin = path
    }
  } catch { /* not found */ }

  if (!cliBin) {
    // CLI not available — go straight to fallback
    try {
      return await patchConfigViaFile(apiKey, serviceId, envId, patchPayload)
    } catch (fallbackError) {
      return { success: false, method: 'fallback', error: `No CLI found; Fallback: ${fallbackError}` }
    }
  }

  // Step 2: get current config hash
  try {
    const getResult = await execCommand(apiKey, serviceId, envId,
      [cliBin, 'gateway', 'call', 'config.get', '--json'],
    )

    const hashMatch = getResult.output.match(/"hash"\s*:\s*"([^"]+)"/)
    if (!hashMatch) {
      throw new Error(`Could not parse config.get output: ${getResult.output.slice(0, 200)}`)
    }
    const baseHash = hashMatch[1]

    // Step 3: call config.patch
    const patchParams = JSON.stringify({ raw: patchPayload, baseHash })
    const patchResult = await execCommand(apiKey, serviceId, envId,
      [cliBin, 'gateway', 'call', 'config.patch', '--params', patchParams],
    )

    // Strict success check: must contain "ok" in output (not just exitCode)
    if (patchResult.output.includes('"ok"') || patchResult.output.includes('"ok":true')) {
      // Step 4: verify — read back config to confirm flags are removed
      const verified = await verifyConfigPatched(apiKey, serviceId, envId)
      if (verified) {
        return { success: true, method: 'cli' }
      }
      return { success: false, method: 'cli', error: 'config.patch reported ok but verification failed — dangerous flags still present' }
    }

    return { success: false, method: 'cli', error: `config.patch output: ${patchResult.output.slice(0, 300)}` }
  } catch (cliError) {
    // CLI call failed — fallback to file write
    try {
      return await patchConfigViaFile(apiKey, serviceId, envId, patchPayload)
    } catch (fallbackError) {
      return { success: false, method: 'fallback', error: `CLI: ${cliError}; Fallback: ${fallbackError}` }
    }
  }
}

/**
 * Verify config was patched: read back openclaw.json and check that
 * dangerouslyAllowHostHeaderOriginFallback is absent.
 */
async function verifyConfigPatched(
  apiKey: string,
  serviceId: string,
  envId: string,
): Promise<boolean> {
  try {
    const { output } = await execCommand(apiKey, serviceId, envId,
      ['node', '-e', `const fs=require('fs'),f='/home/node/.openclaw/openclaw.json';function P(s){try{return JSON.parse(s)}catch{try{return require('json5').parse(s)}catch{return JSON.parse(s.replace(/\\/\\/.*$/gm,'').replace(/,\\s*([}\\]])/g,'$1'))}}};try{const c=P(fs.readFileSync(f,'utf8'));console.log(JSON.stringify({hasDangerous:!!c.gateway?.controlUi?.dangerouslyAllowHostHeaderOriginFallback}))}catch(e){console.log('err:'+e.message)}`],
    )
    return output.includes('"hasDangerous":false')
  } catch {
    return false
  }
}

/**
 * Fallback: patch config by directly writing openclaw.json, then send SIGUSR1
 * to the gateway process to trigger an in-process config reload.
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

  // Build the node script — try JSON.parse first, fall back to json5 if available
  let script = `const fs=require('fs'),f='/home/node/.openclaw/openclaw.json';`
  script += `function P(s){try{return JSON.parse(s)}catch{try{return require('json5').parse(s)}catch{return JSON.parse(s.replace(/\\/\\/.*$/gm,'').replace(/,\\s*([}\\]])/g,'$1'))}}};`
  script += `try{const c=P(fs.readFileSync(f,'utf8'));`
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

  if (!output.includes('patched')) {
    return { success: false, method: 'fallback', error: `File patch output: ${output.slice(0, 200)}` }
  }

  // Send SIGUSR1 to openclaw gateway to trigger in-process config reload
  // (without this, the running gateway keeps the old config in memory)
  try {
    await execCommand(apiKey, serviceId, envId,
      ['sh', '-c', 'kill -USR1 $(pgrep -f "openclaw" | head -1) 2>/dev/null || kill -USR1 $(pgrep -f "node.*gateway" | head -1) 2>/dev/null || true'],
    )
  } catch { /* best effort — process may not be named 'openclaw' */ }

  // Wait a moment for reload, then verify
  await new Promise(r => setTimeout(r, 3000))
  const verified = await verifyConfigPatched(apiKey, serviceId, envId)
  if (verified) {
    return { success: true, method: 'fallback' }
  }
  return { success: false, method: 'fallback', error: 'File patched + SIGUSR1 sent but verification failed' }
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

/**
 * Find the OpenClaw service in a project.
 * For single-service projects, returns that service regardless of name.
 * For multi-service, matches by name pattern.
 */
export function findOpenClawService(
  services: Array<{ _id: string; name: string }>,
): { _id: string; name: string } | undefined {
  // Single service — must be the one, regardless of name
  if (services.length === 1) return services[0]

  // Multi-service — match by name
  return services.find(s => s.name === 'OpenClaw')
    || services.find(s => /openclaw/i.test(s.name) && !/sandbox|browser|devbox|wings/i.test(s.name))
}

/**
 * Verify a service is actually running OpenClaw by checking for
 * the ~/.openclaw directory. Use when service name is unreliable.
 */
export async function verifyIsOpenClaw(
  apiKey: string,
  serviceId: string,
  envId: string,
): Promise<boolean> {
  try {
    const { output } = await execCommand(apiKey, serviceId, envId,
      ['sh', '-c', 'test -d /home/node/.openclaw && echo "IS_OPENCLAW" || echo "NOT_OPENCLAW"'],
    )
    return output.includes('IS_OPENCLAW')
  } catch {
    return false
  }
}
