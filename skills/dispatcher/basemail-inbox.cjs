#!/usr/bin/env node
/**
 * BaseMail Inbox → Task Creation (CAN-208)
 *
 * During heartbeat, checks the agent's BaseMail inbox for purchase-intent
 * emails, creates tasks, verifies USDC payments, dispatches skills, and
 * sends reply emails with results.
 *
 * Usage:
 *   node basemail-inbox.cjs                        # Process inbox once
 *   node basemail-inbox.cjs --dry-run              # Preview without creating tasks
 *   node basemail-inbox.cjs --agent LittleLobster  # Override agent name
 *
 * Env vars:
 *   CANFLY_API_URL       CanFly API base (default: https://canfly.ai)
 *   BASEMAIL_API_URL     BaseMail API base (default: https://api.basemail.me)
 *   BASEMAIL_API_KEY     BaseMail API key (for inbox access)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// --- Config ------------------------------------------------------------------

const CANFLY_API_URL = process.env.CANFLY_API_URL || 'https://canfly.ai';
const BASEMAIL_API_URL = process.env.BASEMAIL_API_URL || 'https://api.basemail.me';
const CRED_FILE = path.join(process.env.HOME || '~', '.canfly', 'credentials.json');

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
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
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
  const args = { dryRun: false, agent: null };
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--agent' && process.argv[i + 1]) args.agent = process.argv[++i];
  }
  return args;
}

function loadCredentials() {
  if (!fs.existsSync(CRED_FILE)) {
    console.error(`Error: No credentials found at ${CRED_FILE}`);
    console.error('Run register.cjs first to create your CanFly profile.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CRED_FILE, 'utf-8'));
}

// --- BaseMail inbox ----------------------------------------------------------

/**
 * Fetch unread messages from BaseMail inbox.
 * Returns array of { message_id, from, subject, body, tx_hash? }
 */
async function fetchInbox(basemailHandle, basemailApiKey) {
  const res = await httpRequest(
    'GET',
    BASEMAIL_API_URL,
    `/v1/inbox?handle=${encodeURIComponent(basemailHandle)}&status=unread&limit=20`,
    null,
    {
      Authorization: `Bearer ${basemailApiKey}`,
      Accept: 'application/json',
    }
  );

  if (res.status !== 200) {
    console.error(`BaseMail inbox fetch failed (${res.status}):`, JSON.stringify(res.body));
    return [];
  }

  const messages = Array.isArray(res.body) ? res.body
    : Array.isArray(res.body?.messages) ? res.body.messages
    : [];

  return messages.map((msg) => ({
    message_id: msg.id || msg.message_id || msg.messageId,
    from: msg.from || msg.sender || msg.from_address,
    subject: msg.subject || '',
    body: msg.body || msg.text || msg.content || '',
    tx_hash: msg.tx_hash || msg.txHash || msg.attention_bond || null,
  }));
}

/**
 * Mark a BaseMail message as read.
 */
async function markAsRead(basemailHandle, messageId, basemailApiKey) {
  try {
    await httpRequest(
      'POST',
      BASEMAIL_API_URL,
      `/v1/inbox/${encodeURIComponent(messageId)}/read`,
      { handle: basemailHandle },
      { Authorization: `Bearer ${basemailApiKey}` }
    );
  } catch (err) {
    console.warn(`Warning: Could not mark message ${messageId} as read:`, err.message);
  }
}

/**
 * Send a reply via BaseMail.
 */
async function sendReply(basemailHandle, toAddress, subject, body, basemailApiKey) {
  try {
    const res = await httpRequest(
      'POST',
      BASEMAIL_API_URL,
      '/v1/send',
      {
        from: basemailHandle,
        to: toAddress,
        subject: `Re: ${subject}`,
        body,
      },
      { Authorization: `Bearer ${basemailApiKey}` }
    );
    if (res.status >= 200 && res.status < 300) {
      console.log(`  Reply sent to ${toAddress}`);
    } else {
      console.warn(`  Reply failed (${res.status}):`, JSON.stringify(res.body));
    }
  } catch (err) {
    console.warn(`  Reply error:`, err.message);
  }
}

// --- CanFly task API ---------------------------------------------------------

async function submitToInboxEndpoint(agentName, apiKey, emails) {
  const res = await httpRequest(
    'POST',
    CANFLY_API_URL,
    `/api/agents/${encodeURIComponent(agentName)}/tasks/basemail-inbox`,
    { emails },
    { Authorization: `Bearer ${apiKey}` }
  );
  return res;
}

async function verifyPayment(agentName, taskId, txHash) {
  const res = await httpRequest(
    'POST',
    CANFLY_API_URL,
    `/api/agents/${encodeURIComponent(agentName)}/tasks/${taskId}/verify-payment`,
    { tx_hash: txHash },
    {}
  );
  return res;
}

// --- Skill dispatcher --------------------------------------------------------

function dispatchSkill(skillName, params, taskId) {
  const dispatcherPath = path.join(__dirname, 'dispatch.cjs');
  try {
    const result = execSync(
      `node ${JSON.stringify(dispatcherPath)} ` +
      `--skill ${JSON.stringify(skillName)} ` +
      `--params ${JSON.stringify(JSON.stringify(params))} ` +
      `--task-id ${JSON.stringify(taskId || '')}`,
      {
        encoding: 'utf-8',
        timeout: 5 * 60 * 1000, // 5 minute timeout per skill
        env: { ...process.env },
      }
    );
    return JSON.parse(result);
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// --- Main flow ---------------------------------------------------------------

async function main() {
  const args = parseArgs();
  const creds = loadCredentials();
  const agentName = args.agent || creds.agentName;
  const apiKey = creds.apiKey;

  const basemailApiKey = process.env.BASEMAIL_API_KEY;
  const basemailHandle = creds.basemailHandle || process.env.BASEMAIL_HANDLE;

  if (!basemailHandle) {
    console.log('No BaseMail handle configured. Skipping inbox check.');
    return;
  }
  if (!basemailApiKey) {
    console.log('No BASEMAIL_API_KEY set. Skipping inbox check.');
    return;
  }

  const ts = () => new Date().toISOString();
  console.log(`[${ts()}] BaseMail inbox check — agent: ${agentName}, handle: ${basemailHandle}`);

  // Step 1: Fetch unread inbox
  const emails = await fetchInbox(basemailHandle, basemailApiKey);
  if (emails.length === 0) {
    console.log(`[${ts()}] No unread messages. Done.`);
    return;
  }
  console.log(`[${ts()}] Found ${emails.length} unread message(s).`);

  if (args.dryRun) {
    console.log('\n--- DRY RUN (no tasks will be created) ---');
    for (const email of emails) {
      console.log(`  From: ${email.from}`);
      console.log(`  Subject: ${email.subject}`);
      console.log(`  TX: ${email.tx_hash || '(none)'}`);
      console.log('');
    }
    return;
  }

  // Step 2: Submit to CanFly inbox endpoint → creates tasks
  const inboxRes = await submitToInboxEndpoint(agentName, apiKey, emails);
  if (inboxRes.status !== 200) {
    console.error(`[${ts()}] Inbox endpoint error (${inboxRes.status}):`, JSON.stringify(inboxRes.body));
    return;
  }

  const { created, skipped, tasks, skipped_details } = inboxRes.body;
  console.log(`[${ts()}] Tasks created: ${created}, skipped: ${skipped}`);

  if (skipped_details?.length) {
    for (const s of skipped_details) {
      console.log(`  Skipped: "${s.subject}" from ${s.from} — ${s.reason}`);
    }
  }

  // Step 3: For each created task with tx_hash, verify payment
  for (const task of tasks || []) {
    console.log(`\n[${ts()}] Task ${task.task_id}: ${task.skill} from ${task.from}`);

    if (task.tx_hash) {
      console.log(`  Verifying payment: ${task.tx_hash}`);
      const verifyRes = await verifyPayment(agentName, task.task_id, task.tx_hash);

      if (verifyRes.status === 200 && verifyRes.body?.status === 'paid') {
        console.log(`  Payment verified! Dispatching skill...`);

        // Step 4: Dispatch skill execution
        const email = emails.find((e) => e.message_id === task.message_id);
        let params = {};
        try {
          const bodyTrimmed = (email?.body || '').trim();
          params = bodyTrimmed.startsWith('{') ? JSON.parse(bodyTrimmed) : { text: bodyTrimmed };
        } catch {
          params = { text: email?.body || '' };
        }

        const result = dispatchSkill(task.skill, params, task.task_id);
        console.log(`  Dispatch result: ${result.ok ? 'SUCCESS' : 'FAILED'}`);

        // Step 5: Reply via BaseMail with result
        if (result.ok && email) {
          const replyBody = buildResultReply(task.skill, result);
          await sendReply(basemailHandle, email.from, email.subject, replyBody, basemailApiKey);
          await markAsRead(basemailHandle, email.message_id, basemailApiKey);
        } else if (email) {
          const errorReply = `Your task "${task.skill}" failed to execute.\n\nError: ${result.error || 'Unknown error'}\n\nPlease contact the agent owner for support.\n\n— ${agentName} via CanFly.ai`;
          await sendReply(basemailHandle, email.from, email.subject, errorReply, basemailApiKey);
          await markAsRead(basemailHandle, email.message_id, basemailApiKey);
        }
      } else {
        console.log(`  Payment verification: ${verifyRes.body?.message || 'pending'}`);
      }
    } else {
      console.log(`  No tx_hash — task awaiting payment.`);
      // Mark as read but reply with payment instructions
      const email = emails.find((e) => e.message_id === task.message_id);
      if (email) {
        const paymentReply = buildPaymentInstructions(task, agentName);
        await sendReply(basemailHandle, email.from, email.subject, paymentReply, basemailApiKey);
        await markAsRead(basemailHandle, email.message_id, basemailApiKey);
      }
    }
  }

  console.log(`\n[${ts()}] Inbox processing complete.`);
}

// --- Reply templates ---------------------------------------------------------

function buildResultReply(skillName, result) {
  const r = result.result || {};
  let body = `Your "${skillName}" task is complete!\n\n`;

  if (r.filepath) {
    body += `Result file: ${r.filename || path.basename(r.filepath)}\n`;
    body += `Size: ${r.sizeBytes ? (r.sizeBytes / 1024).toFixed(1) + ' KB' : 'unknown'}\n`;
    body += `Provider: ${r.provider || 'unknown'}\n`;
  }

  if (r.content || r.text) {
    body += `\n---\n\n${r.content || r.text}\n`;
  }

  body += `\nProcessing time: ${result.elapsedSeconds || '?'}s`;
  body += `\n\n— LittleLobster via CanFly.ai`;
  return body;
}

function buildPaymentInstructions(task, agentName) {
  return [
    `Thanks for your interest in "${task.skill}"!`,
    '',
    'To proceed, please send USDC payment on Base chain:',
    `  Amount: check the agent card for current pricing`,
    `  Chain: Base (Coinbase L2)`,
    `  View pricing: ${CANFLY_API_URL}/api/agents/${agentName}/agent-card.json`,
    '',
    'Then reply with the transaction hash (0x...) and we will process your order.',
    '',
    `Alternatively, include the USDC tx_hash in your original email body.`,
    '',
    `— ${agentName} via CanFly.ai`,
  ].join('\n');
}

// --- Entry point -------------------------------------------------------------

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
