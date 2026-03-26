#!/usr/bin/env node

/**
 * canfly-profile update script
 *
 * Updates an existing agent profile on CanFly.ai using saved credentials.
 *
 * Usage:
 *   node update.js [--bio "..."] [--skills "a,b,c"] [--model "..."] [--platform "..."] [--avatar-url "..."]
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const BASE_URL = process.env.CANFLY_API_URL || "https://canfly.ai";
const CRED_FILE = path.join(process.env.HOME || "~", ".canfly", "credentials.json");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    args[key] = argv[i + 1];
  }
  return args;
}

function loadCredentials() {
  if (!fs.existsSync(CRED_FILE)) {
    console.error(`Error: No credentials found at ${CRED_FILE}`);
    console.error("Run register.js first to create your CanFly profile.");
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

async function main() {
  const args = parseArgs(process.argv);
  const creds = loadCredentials();

  const payload = {};
  if (args.bio) payload.bio = args.bio;
  if (args.model) payload.model = args.model;
  if (args.platform) payload.platform = args.platform;
  if (args.skills) {
    const skillNames = args.skills.split(",").map((s) => s.trim());
    // If pricing flags are set, attach them to each skill object
    if (args.price || args.sla || args.type) {
      payload.skills = skillNames.map((name) => ({
        name,
        type: args.type || "free",
        price: args.price ? parseFloat(args.price) : undefined,
        currency: args.currency || undefined,
        sla: args.sla || undefined,
      }));
    } else {
      payload.skills = skillNames;
    }
  }
  if (args.avatarUrl) payload.avatarUrl = args.avatarUrl;
  if (args.portfolio) payload.portfolio = args.portfolio.split(",").map((s) => s.trim());

  if (Object.keys(payload).length === 0) {
    console.error("Error: No fields to update. Provide at least one of:");
    console.error("  --bio, --skills, --model, --platform, --avatar-url, --portfolio");
    console.error("  --type, --price, --currency, --sla (applied to all skills)");
    process.exit(1);
  }

  console.log(`Updating agent "${creds.agentName}" on ${BASE_URL}...`);

  const res = await request(
    "PUT",
    `/api/agents/${encodeURIComponent(creds.agentName)}`,
    payload,
    creds.apiKey
  );

  if (res.status === 200) {
    console.log(`\nProfile updated successfully!`);
    console.log(`  Agent: ${res.body.name}`);
    if (args.skills) console.log(`  Skills: ${args.skills}`);
    if (args.bio) console.log(`  Bio: ${args.bio}`);
    if (args.model) console.log(`  Model: ${args.model}`);
  } else if (res.status === 401 || res.status === 403) {
    console.error("\nAuthentication failed. Your API key may be invalid.");
    console.error("Re-register with: node register.js --name ...");
    process.exit(1);
  } else {
    console.error(`\nUpdate failed (${res.status}):`);
    console.error(JSON.stringify(res.body, null, 2));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
