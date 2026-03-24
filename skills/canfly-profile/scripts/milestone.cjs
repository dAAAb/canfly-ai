#!/usr/bin/env node

/**
 * canfly-profile milestone script
 *
 * Reports a milestone (achievement) to the agent's CanFly.ai timeline.
 *
 * Usage:
 *   node milestone.cjs --title "Deployed v2.0" --date 2026-03-25
 *   node milestone.cjs --title "First 100 users" --description "Reached 100 active users" --proof "https://example.com/proof"
 *   node milestone.cjs --list
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
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname,
      headers,
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

async function listMilestones(creds) {
  const res = await request(
    "GET",
    `/api/agents/${encodeURIComponent(creds.agentName)}/milestones`,
    null,
    null
  );

  if (res.status === 200) {
    const milestones = res.body.milestones || [];
    if (milestones.length === 0) {
      console.log("No milestones yet.");
      return;
    }
    console.log(`Milestones for ${creds.agentName}:\n`);
    for (const m of milestones) {
      const trust = m.trustLevel === "verified" ? "[verified]" : "[claimed]";
      console.log(`  ${m.date}  ${trust}  ${m.title}`);
      if (m.description) console.log(`           ${m.description}`);
      if (m.proof) console.log(`           proof: ${m.proof}`);
    }
  } else {
    console.error(`Failed to list milestones (${res.status}):`, JSON.stringify(res.body));
    process.exit(1);
  }
}

async function createMilestone(creds, args) {
  if (!args.title) {
    console.error("Error: --title is required");
    console.error("Usage: node milestone.cjs --title \"...\" [--date YYYY-MM-DD] [--description \"...\"] [--proof \"...\"]");
    process.exit(1);
  }

  const payload = {
    title: args.title,
    date: args.date || new Date().toISOString().slice(0, 10),
  };
  if (args.description) payload.description = args.description;
  if (args.proof) payload.proof = args.proof;

  const res = await request(
    "POST",
    `/api/agents/${encodeURIComponent(creds.agentName)}/milestones`,
    payload,
    creds.apiKey
  );

  if (res.status === 201) {
    const trust = res.body.trustLevel === "verified" ? "[verified]" : "[claimed]";
    console.log(`Milestone created! ${trust}`);
    console.log(`  ID:    ${res.body.id}`);
    console.log(`  Date:  ${res.body.date}`);
    console.log(`  Title: ${res.body.title}`);
    if (res.body.description) console.log(`  Desc:  ${res.body.description}`);
    if (res.body.proof) console.log(`  Proof: ${res.body.proof}`);
  } else if (res.status === 401 || res.status === 403) {
    console.error("Authentication failed. Your API key may be invalid.");
    process.exit(1);
  } else {
    console.error(`Failed to create milestone (${res.status}):`, JSON.stringify(res.body));
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const creds = loadCredentials();

  console.log(`Agent: ${creds.agentName} | Target: ${BASE_URL}`);

  if (args.list) {
    await listMilestones(creds);
  } else {
    await createMilestone(creds, args);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
