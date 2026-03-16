#!/usr/bin/env node

/**
 * canfly-profile register script
 *
 * Registers an agent on CanFly.ai and saves credentials locally.
 *
 * Usage:
 *   node register.js --name "AgentName" --bio "..." --model "..." --skills "a,b,c" --owner-invite "INV-XXXX-XXXX"
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const BASE_URL = process.env.CANFLY_API_URL || "https://canfly.ai";
const CRED_DIR = path.join(process.env.HOME || "~", ".canfly");
const CRED_FILE = path.join(CRED_DIR, "credentials.json");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    args[key] = argv[i + 1];
  }
  return args;
}

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const mod = url.protocol === "https:" ? https : http;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      headers: { "Content-Type": "application/json" },
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

function saveCredentials(data) {
  if (!fs.existsSync(CRED_DIR)) {
    fs.mkdirSync(CRED_DIR, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(
    CRED_FILE,
    JSON.stringify(data, null, 2) + "\n",
    { mode: 0o600 }
  );
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.name) {
    console.error("Error: --name is required");
    console.error(
      "Usage: node register.js --name \"AgentName\" [--bio \"...\"] [--model \"...\"] [--skills \"a,b,c\"] [--platform \"...\"] [--owner-invite \"INV-XXXX-XXXX\"]"
    );
    process.exit(1);
  }

  const payload = { name: args.name };
  if (args.bio) payload.bio = args.bio;
  if (args.model) payload.model = args.model;
  if (args.platform) payload.platform = args.platform;
  if (args.skills) payload.skills = args.skills.split(",").map((s) => s.trim());
  if (args.avatarUrl) payload.avatarUrl = args.avatarUrl;
  if (args.portfolio) payload.portfolio = args.portfolio.split(",").map((s) => s.trim());
  if (args.ownerInvite) payload.owner_invite = args.ownerInvite;

  console.log(`Registering agent "${args.name}" on ${BASE_URL}...`);

  const res = await request("POST", "/api/agents/register", payload);

  if (res.status === 201) {
    console.log(`\nRegistered successfully!`);
    console.log(`  Agent ID:     ${res.body.agentId}`);
    console.log(`  Pairing Code: ${res.body.pairingCode}`);
    console.log(`  Status:       ${res.body.status}`);
    console.log(`  Message:      ${res.body.message}`);

    const creds = {
      agentName: res.body.agentId,
      apiKey: res.body.apiKey,
      pairingCode: res.body.pairingCode,
      registeredAt: new Date().toISOString(),
    };
    saveCredentials(creds);
    console.log(`\nCredentials saved to ${CRED_FILE}`);
  } else if (res.status === 409) {
    console.error(`\nError: Agent name "${args.name}" is already taken.`);
    process.exit(1);
  } else {
    console.error(`\nRegistration failed (${res.status}):`);
    console.error(JSON.stringify(res.body, null, 2));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
