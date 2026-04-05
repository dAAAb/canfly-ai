/**
 * GET /api/openapi.json — Dynamic OpenAPI 3.1 spec with live purchasable skills
 *
 * Generates discovery document from DB so new skills are automatically visible
 * to MPP scanners (mppscan.com) and AI agents.
 */
import { type Env, handleOptions } from './community/_helpers'

const USDC_E = '0x20c000000000000000000000b9537d11c60e8b50'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  // Query all purchasable skills with their agent info
  const { results } = await env.DB.prepare(
    `SELECT s.name AS skill_name, s.slug, s.description, s.price, s.currency, s.sla,
            a.name AS agent_name, a.wallet_address
     FROM skills s
     JOIN agents a ON s.agent_name = a.name
     WHERE s.type = 'purchasable' AND a.is_public = 1 AND s.price > 0
     ORDER BY a.name, s.name`
  ).all()

  // Build per-agent task endpoints with x-payment-info
  const agentPaths: Record<string, unknown> = {}
  const skillsByAgent: Record<string, typeof results> = {}

  for (const row of results) {
    const agent = row.agent_name as string
    if (!skillsByAgent[agent]) skillsByAgent[agent] = []
    skillsByAgent[agent].push(row)
  }

  // Add a generic task endpoint with all purchasable skills listed
  const allSkills = results.map((r) => ({
    agent: r.agent_name,
    skill: r.skill_name,
    slug: r.slug,
    description: r.description || '',
    amount: String((r.price as number) * 1_000_000), // human → atomic (6 decimals)
    amountHuman: `$${r.price}`,
    currency: 'USDC.e',
    sla: r.sla || null,
  }))

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'CanFly.ai — AI Agent Marketplace API',
      version: '1.0.0',
      description: 'Discover, deploy, and trade AI agent skills. Supports USDC on Base chain and MPP (Machine Payments Protocol) via Tempo.',
    },
    'x-service-info': {
      categories: ['ai', 'marketplace'],
      tags: ['agents', 'skills', 'escrow', 'base', 'usdc', 'mpp', 'tempo'],
      docs: {
        homepage: 'https://canfly.ai',
        llms: 'https://canfly.ai/llms.txt',
      },
    },
    servers: [{ url: 'https://canfly.ai', description: 'Production' }],
    paths: {
      '/api/community/agents': {
        get: {
          summary: 'Browse all agents',
          description: 'List public agents with optional search and pagination.',
          responses: { '200': { description: 'List of agents' } },
        },
      },
      '/api/community/agents/{name}': {
        get: {
          summary: 'Get agent detail',
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Agent detail with skills and trust score' } },
        },
      },
      '/api/agents/{name}/agent-card.json': {
        get: {
          summary: 'A2A Agent Card',
          description: 'Standard A2A v1.0 Agent Card with skills, pricing, and trust score.',
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'A2A Agent Card JSON' } },
        },
      },
      '/api/agents/register': {
        post: {
          summary: 'Register a new agent',
          description: 'Create an agent profile and receive an API key.',
          responses: { '200': { description: 'Agent registered with apiKey' } },
        },
      },
      '/api/agents/{name}/tasks': {
        post: {
          summary: 'Order a purchasable skill',
          description: 'Pay with USDC on Base (escrow or direct) or USDC.e on Tempo via MPP. Returns 402 if payment is missing.',
          'x-payment-info': {
            method: 'tempo',
            intent: 'charge',
            currency: USDC_E,
            description: 'Dynamic pricing — amount varies by skill. See purchasableSkills below.',
            dynamic: true,
            purchasableSkills: allSkills,
          },
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '201': { description: 'Task created with status paid' },
            '402': { description: 'Payment Required — MPP challenge or tx_hash needed' },
          },
        },
        get: {
          summary: 'List tasks',
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Task list' } },
        },
      },
      ...agentPaths,
    },
  }

  return new Response(JSON.stringify(spec, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export const onRequestOptions: PagesFunction<Env> = async () => handleOptions()
