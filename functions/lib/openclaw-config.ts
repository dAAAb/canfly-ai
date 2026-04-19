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
  timeoutMs = 20000,
): Promise<{ data?: Record<string, unknown>; errors?: Array<{ message: string }> }> {
  // Default 20s timeout — prevents reconfigure / status polls from hanging
  // indefinitely when Zeabur's executeCommand is slow (e.g. during container
  // restart or post-crash cooldown).
  const res = await fetch(ZEABUR_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(timeoutMs),
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

  // Step 2: get current config hash. Wrap via `sh -c` with NO_COLOR + TERM=dumb
  // so the CLI emits plain text (not ANSI escapes + cursor-movement + spinners
  // that break string matching).
  const runCli = async (args: string[]) => {
    // Shell-quote single args safely: only cliBin and flags are trusted; params
    // contain JSON which we pass via a here-doc-free heredoc by escaping.
    const cmd = `NO_COLOR=1 TERM=dumb ` + args.map(a => `'${a.replace(/'/g, `'\\''`)}'`).join(' ')
    return execCommand(apiKey, serviceId, envId, ['sh', '-c', cmd])
  }
  try {
    const getResult = await runCli([cliBin, 'gateway', 'call', 'config.get', '--json'])

    const hashMatch = getResult.output.match(/"hash"\s*:\s*"([^"]+)"/)
    if (!hashMatch) {
      throw new Error(`Could not parse config.get output: ${getResult.output.slice(0, 200)}`)
    }
    const baseHash = hashMatch[1]

    // Step 3: call config.patch
    const patchParams = JSON.stringify({ raw: patchPayload, baseHash })
    const patchResult = await runCli([cliBin, 'gateway', 'call', 'config.patch', '--params', patchParams, '--json'])

    // Success detection: exitCode=0 is the authoritative signal. Also treat
    // `"ok"` / `ok: true` in stripped output as success to handle CLIs that
    // don't yet set exit codes properly. Strip ANSI escapes first — the CLI
    // tried spinners/colors even with NO_COLOR in some versions.
    const stripAnsi = (s: string) => s.replace(/\u001b\[[0-9;?]*[a-zA-Z]/g, '').replace(/[\r\u2500-\u257f\u25cb-\u25ff]/g, '')
    const clean = stripAnsi(patchResult.output)
    const looksOk = /"ok"\s*:\s*true|"ok"\s*$|\bok\b\s*$/mi.test(clean) || clean.trim() === 'ok'
    const okByExit = patchResult.exitCode === 0 && !/error|failed/i.test(clean)

    if (okByExit || looksOk) {
      return { success: true, method: 'cli' }
    }

    return { success: false, method: 'cli', error: `config.patch output: ${clean.slice(0, 300)}` }
  } catch (cliError) {
    // CLI call failed — fallback to file write
    try {
      return await patchConfigViaFile(apiKey, serviceId, envId, patchPayload)
    } catch (fallbackError) {
      return { success: false, method: 'fallback', error: `CLI: ${cliError}; Fallback: ${fallbackError}` }
    }
  }
}

// verifyConfigPatched removed — it checked dangerouslyAllowHostHeaderOriginFallback
// absence, which is only meaningful for the reconfigure payload, and broke
// any other patch (e.g. telegram-only). The CLI exitCode is now authoritative.

/**
 * Fallback: apply the patch payload to openclaw.json via RFC 7396 JSON
 * merge-patch semantics — only the keys present in the payload are touched,
 * `null` means delete the key. Then SIGUSR1 the gateway to reload.
 *
 * Critical: this must be payload-agnostic. Earlier versions hardcoded the
 * reconfigure payload (allowedOrigins always overwritten, telegram entries
 * always deleted) which corrupted configs when called with a Telegram-only
 * patch from connect-telegram (allowedOrigins got set to [] → gateway refused
 * to start with "non-loopback Control UI requires explicit origins").
 */
async function patchConfigViaFile(
  apiKey: string,
  serviceId: string,
  envId: string,
  patchPayload: string,
): Promise<PatchResult> {
  // The merge function is inlined as a string so it executes inside the container.
  // Embed the patch payload as a JSON string literal (JSON.stringify is safe for
  // our config shape — no unsupported types).
  const patchLiteral = JSON.stringify(patchPayload)
  const script = `
    const fs = require('fs');
    const f = '/home/node/.openclaw/openclaw.json';
    function P(s){try{return JSON.parse(s)}catch{try{return require('json5').parse(s)}catch{return JSON.parse(s.replace(/\\/\\/.*$/gm,'').replace(/,\\s*([}\\]])/g,'$1'))}}}
    // RFC 7396 JSON merge-patch: for each key in patch, null deletes, object
    // recurses, anything else overwrites. Unmentioned keys are left alone.
    function merge(target, patch){
      if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch;
      if (target === null || typeof target !== 'object' || Array.isArray(target)) target = {};
      for (const k of Object.keys(patch)) {
        const pv = patch[k];
        if (pv === null) { delete target[k]; continue; }
        if (typeof pv === 'object' && !Array.isArray(pv)) {
          target[k] = merge(target[k], pv);
        } else {
          target[k] = pv;
        }
      }
      return target;
    }
    try {
      const c = P(fs.readFileSync(f, 'utf8'));
      const patch = JSON.parse(${patchLiteral});
      const out = merge(c, patch);
      fs.writeFileSync(f, JSON.stringify(out, null, 2));
      console.log('patched');
    } catch (e) { console.log('err:' + e.message); }
  `
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
