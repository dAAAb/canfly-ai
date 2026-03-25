#!/usr/bin/env node
/**
 * LittleLobster Heartbeat Cron (CAN-212)
 *
 * Runs every 5 minutes (or custom interval) to:
 * 1. POST heartbeat to maintain "live" status
 * 2. Check for paid tasks and trigger skill execution
 * 3. Check BaseMail inbox for new orders (if configured)
 *
 * Usage:
 *   node heartbeat-cron.cjs                   # Run once (all checks)
 *   node heartbeat-cron.cjs --interval 300    # Continuous: every 300s (5 min)
 *   node heartbeat-cron.cjs --skip-inbox      # Skip BaseMail inbox check
 *
 * Env vars:
 *   CANFLY_API_URL       CanFly API base (default: https://canfly.ai)
 *   BASEMAIL_API_KEY     BaseMail API key (for inbox check)
 *   BASEMAIL_HANDLE      BaseMail handle (override credentials)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// --- Config ------------------------------------------------------------------

const CANFLY_API_URL = process.env.CANFLY_API_URL || 'https://canfly.ai';
const CRED_FILE = path.join(process.env.HOME || '~', '.canfly', 'credentials.json');
const DISPATCHER_DIR = __dirname;

// --- HTTP helper -------------------------------------------------------------

function httpRequest(method, baseUrl, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const mod = url.protocol === 'https:' ? https : http;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json', ...headers },
    };

    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// --- CLI args ----------------------------------------------------------------

function parseArgs() {
  const args = { interval: 0, skipInbox: false };
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--interval' && process.argv[i + 1]) {
      args.interval = parseInt(process.argv[++i], 10);
    } else if (arg === '--skip-inbox') {
      args.skipInbox = true;
    }
  }
  return args;
}

function loadCredentials() {
  if (!fs.existsSync(CRED_FILE)) {
    console.error(`Error: No credentials found at ${CRED_FILE}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CRED_FILE, 'utf-8'));
}

// --- Step 1: Heartbeat -------------------------------------------------------

async function sendHeartbeat(agentName, apiKey) {
  const res = await httpRequest(
    'POST',
    CANFLY_API_URL,
    `/api/agents/${encodeURIComponent(agentName)}/heartbeat`,
    {},
    { Authorization: `Bearer ${apiKey}` }
  );

  if (res.status === 200) {
    return { ok: true, status: res.body.status };
  }
  return { ok: false, error: `HTTP ${res.status}` };
}

// --- Step 2: Check paid tasks ------------------------------------------------

async function fetchPaidTasks(agentName) {
  // Use the tasks list endpoint — filter for paid tasks awaiting execution
  // The tasks API returns completed tasks publicly, so we query the DB directly
  // via a lightweight status endpoint
  const res = await httpRequest(
    'GET',
    CANFLY_API_URL,
    `/api/agents/${encodeURIComponent(agentName)}/tasks?status=paid`,
    null,
    {}
  );

  if (res.status === 200) {
    return res.body?.tasks || [];
  }
  return [];
}

/**
 * Execute a paid task via the local dispatcher.
 */
function executeTask(skillName, params, taskId) {
  const dispatcherPath = path.join(DISPATCHER_DIR, 'dispatch.cjs');

  // Clean params: remove internal fields
  const cleanParams = { ...params };
  delete cleanParams.message_id;
  delete cleanParams._basemail_from;

  try {
    const result = execSync(
      `node ${JSON.stringify(dispatcherPath)} ` +
      `--skill ${JSON.stringify(skillName)} ` +
      `--params ${JSON.stringify(JSON.stringify(cleanParams))} ` +
      `--task-id ${JSON.stringify(taskId)}`,
      {
        encoding: 'utf-8',
        timeout: 5 * 60 * 1000,
        env: { ...process.env },
      }
    );
    return JSON.parse(result);
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// --- Step 3: BaseMail inbox --------------------------------------------------

function runInboxCheck() {
  const inboxScript = path.join(DISPATCHER_DIR, 'basemail-inbox.cjs');
  if (!fs.existsSync(inboxScript)) {
    console.log('  BaseMail inbox script not found. Skipping.');
    return;
  }

  try {
    const output = execSync(`node ${JSON.stringify(inboxScript)}`, {
      encoding: 'utf-8',
      timeout: 2 * 60 * 1000,
      env: { ...process.env },
    });
    // Print indented output
    output.split('\n').forEach((line) => {
      if (line.trim()) console.log(`  ${line}`);
    });
  } catch (err) {
    console.warn(`  BaseMail inbox check failed: ${err.message}`);
  }
}

// --- Main tick ---------------------------------------------------------------

async function tick(creds, args) {
  const ts = () => new Date().toISOString();
  const agentName = creds.agentName;
  const apiKey = creds.apiKey;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${ts()}] Heartbeat cron tick — ${agentName}`);
  console.log(`${'='.repeat(60)}`);

  // 1. Send heartbeat
  const hb = await sendHeartbeat(agentName, apiKey);
  console.log(`[${ts()}] Heartbeat: ${hb.ok ? `OK (${hb.status})` : `FAILED (${hb.error})`}`);

  // 2. Check for paid tasks
  console.log(`[${ts()}] Checking for paid tasks...`);
  const paidTasks = await fetchPaidTasks(agentName);

  if (paidTasks.length > 0) {
    console.log(`  Found ${paidTasks.length} paid task(s) to execute.`);
    for (const task of paidTasks) {
      console.log(`\n  Task ${task.id}: ${task.skill || task.skill_name}`);

      let params = {};
      if (task.params) {
        try {
          params = typeof task.params === 'string' ? JSON.parse(task.params) : task.params;
        } catch { /* use empty */ }
      }

      const result = executeTask(task.skill || task.skill_name, params, task.id);
      console.log(`  Result: ${result.ok ? 'SUCCESS' : 'FAILED'} (${result.elapsedSeconds || '?'}s)`);

      if (!result.ok) {
        console.warn(`  Error: ${result.error}`);
      }
    }
  } else {
    console.log('  No paid tasks pending.');
  }

  // 3. BaseMail inbox check
  if (!args.skipInbox && process.env.BASEMAIL_API_KEY) {
    console.log(`[${ts()}] Checking BaseMail inbox...`);
    runInboxCheck();
  }

  console.log(`[${ts()}] Tick complete.`);
}

// --- Entry -------------------------------------------------------------------

async function main() {
  const args = parseArgs();
  const creds = loadCredentials();

  console.log(`Agent: ${creds.agentName} | API: ${CANFLY_API_URL}`);
  console.log(`Interval: ${args.interval > 0 ? `${args.interval}s` : 'once'}`);
  console.log(`BaseMail inbox: ${args.skipInbox ? 'disabled' : (process.env.BASEMAIL_API_KEY ? 'enabled' : 'no API key')}`);

  await tick(creds, args);

  if (args.interval > 0) {
    console.log(`\nContinuous mode: running every ${args.interval}s (Ctrl+C to stop)`);
    setInterval(() => tick(creds, args).catch((e) => console.error('Tick error:', e.message)), args.interval * 1000);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
