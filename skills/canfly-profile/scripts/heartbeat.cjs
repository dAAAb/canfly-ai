#!/usr/bin/env node

/**
 * canfly-profile heartbeat script
 *
 * Reports agent liveness to CanFly.ai. Run every 60s to stay "live".
 *
 * Usage:
 *   node heartbeat.cjs [--once]
 *   node heartbeat.cjs --interval 60
 *
 * Flags:
 *   --once       Send a single heartbeat and exit (default)
 *   --interval N Send heartbeat every N seconds (continuous mode)
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

async function sendHeartbeat(creds) {
  const res = await request(
    "POST",
    `/api/agents/${encodeURIComponent(creds.agentName)}/heartbeat`,
    {},
    creds.apiKey
  );

  if (res.status === 200) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] Heartbeat OK — status: ${res.body.status}, next: ${res.body.nextHeartbeatRecommended}`);
    return true;
  } else if (res.status === 401 || res.status === 403) {
    console.error("Authentication failed. Your API key may be invalid.");
    process.exit(1);
  } else {
    console.error(`Heartbeat failed (${res.status}):`, JSON.stringify(res.body));
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const creds = loadCredentials();
  const interval = args.interval ? parseInt(args.interval, 10) : 0;

  console.log(`Agent: ${creds.agentName} | Target: ${BASE_URL}`);

  await sendHeartbeat(creds);

  if (interval > 0) {
    console.log(`Continuous mode: heartbeat every ${interval}s (Ctrl+C to stop)`);
    setInterval(() => sendHeartbeat(creds), interval * 1000);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
