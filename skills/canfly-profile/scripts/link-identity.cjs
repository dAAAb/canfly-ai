#!/usr/bin/env node

/**
 * canfly-profile link-identity script
 *
 * Links on-chain identity (BaseMail, wallet, basename) to the agent's CanFly profile.
 *
 * Usage:
 *   node link-identity.cjs --basemail-handle "myagent"
 *   node link-identity.cjs --wallet "0x1234..."
 *   node link-identity.cjs --basename "myagent.base.eth"
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const BASE_URL = process.env.CANFLY_API_URL || "https://canfly.ai";
const CRED_FILE = path.join(process.env.HOME || "~", ".canfly", "credentials.json");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
      args[key] = argv[++i];
    } else {
      args[key] = true;
    }
  }
  return args;
}

function loadCredentials() {
  if (!fs.existsSync(CRED_FILE)) {
    console.error(`Error: No credentials found at ${CRED_FILE}`);
    console.error("Run register.cjs first to create your CanFly profile.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CRED_FILE, "utf-8"));
}

function request(method, urlPath, body, apiKey) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const mod = url.protocol === "https:" ? https : http;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    };

    const req = mod.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          reject(new Error(`Invalid JSON response (${res.statusCode}): ${data}`));
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function linkBasemail(creds, args) {
  const payload = {};
  if (args.basemailHandle) payload.basemail_handle = args.basemailHandle;
  if (args.wallet) payload.wallet_address = args.wallet;

  if (!payload.basemail_handle && !payload.wallet_address) {
    console.error("Error: Provide --basemail-handle or --wallet");
    console.error("Usage: node link-identity.cjs --basemail-handle \"myagent\"");
    console.error("       node link-identity.cjs --wallet \"0x1234...\"");
    process.exit(1);
  }

  console.log("Linking BaseMail identity...");
  const res = await request(
    "PUT",
    `/api/agents/${encodeURIComponent(creds.agentName)}/basemail`,
    payload,
    creds.apiKey
  );

  if (res.status === 200) {
    console.log("Identity linked!");
    console.log(`  BaseMail:  ${res.body.basemail_handle || "(none)"}`);
    console.log(`  Email:     ${res.body.basemail_email || "(none)"}`);
    console.log(`  ERC-8004:  ${res.body.erc8004_url || "(none)"}`);
    console.log(`  Source:    ${res.body.source}`);
  } else if (res.status === 401 || res.status === 403) {
    console.error("Authentication failed. Your API key may be invalid.");
    process.exit(1);
  } else {
    console.error(`Link failed (${res.status}):`, JSON.stringify(res.body));
    process.exit(1);
  }
}

async function updateProfile(creds, args) {
  const payload = {};
  if (args.wallet) payload.walletAddress = args.wallet;
  if (args.basename) payload.basename = args.basename;

  if (Object.keys(payload).length === 0) return;

  console.log("Syncing wallet/basename to profile...");
  const res = await request(
    "PUT",
    `/api/agents/${encodeURIComponent(creds.agentName)}`,
    payload,
    creds.apiKey
  );

  if (res.status === 200) {
    console.log(`  Profile updated: ${res.body.name}`);
  } else {
    console.error(`Profile update failed (${res.status}):`, JSON.stringify(res.body));
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const creds = loadCredentials();

  console.log(`Agent: ${creds.agentName} | Target: ${BASE_URL}`);

  // Update wallet/basename on profile if provided
  await updateProfile(creds, args);

  // Link BaseMail identity
  await linkBasemail(creds, args);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
