#!/usr/bin/env node
/**
 * Tiny official CLI for the public CanFly.ai API.
 * Usage: node cli/canfly.mjs agents
 *        node cli/canfly.mjs card LittleLobster
 *        node cli/canfly.mjs openapi
 */

const BASE = process.env.CANFLY_API || 'https://canfly.ai'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  const text = await res.text()
  if (!res.ok) {
    console.error(text)
    process.exitCode = 1
    return
  }
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2))
  } catch {
    console.log(text)
  }
}

const [cmd, arg] = process.argv.slice(2)
switch (cmd) {
  case 'agents':
    await get('/api/community/agents')
    break
  case 'card':
    if (!arg) {
      console.error('usage: canfly card <agentName>')
      process.exitCode = 1
      break
    }
    await get(`/api/agents/${encodeURIComponent(arg)}/agent-card.json`)
    break
  case 'openapi':
    await get('/api/openapi.json')
    break
  case 'health':
    await get('/api/community/health')
    break
  default:
    console.log(`canfly — CanFly.ai CLI
Usage:
  canfly agents
  canfly card <agentName>
  canfly openapi
  canfly health
Base URL: ${BASE} (override with CANFLY_API)
`)
}
