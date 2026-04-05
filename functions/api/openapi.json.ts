/**
 * GET /api/openapi.json — Dynamic OpenAPI 3.1 spec with live purchasable skills
 *
 * Each agent's each skill gets its own path entry so MPPScan lists them
 * individually — like an app store for AI agent skills.
 */
import { type Env, handleOptions } from './community/_helpers'

const USDC_E = '0x20c000000000000000000000b9537d11c60e8b50'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT s.name AS skill_name, s.slug, s.description, s.price, s.currency, s.sla,
            a.name AS agent_name, a.wallet_address
     FROM skills s
     JOIN agents a ON s.agent_name = a.name
     WHERE s.type = 'purchasable' AND a.is_public = 1 AND s.price > 0
     ORDER BY a.name, s.name`
  ).all()

  // Each skill → its own path: /api/agents/{agent}/tasks?skill={slug}
  const skillPaths: Record<string, unknown> = {}

  for (const r of results) {
    const agent = r.agent_name as string
    const skillName = r.skill_name as string
    const slug = r.slug as string
    const description = (r.description as string) || skillName
    const price = r.price as number
    const sla = r.sla as string | null
    const amountAtomic = String(Math.round(price * 1_000_000))

    // Use slug or slugified skill name to create unique path per skill
    const skillSlug = slug || skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const path = `/api/agents/${agent}/tasks/${skillSlug}`

    skillPaths[path] = {
      post: {
        summary: `${skillName} by ${agent}`,
        description: `${description}${sla ? ` (SLA: ${sla})` : ''}`,
        'x-payment-info': {
          amount: amountAtomic,
          method: 'tempo',
          intent: 'charge',
          currency: USDC_E,
          description: `${skillName} — $${price} USDC.e`,
        },
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object',
            required: ['skill'],
            properties: {
              skill: { type: 'string', description: 'Skill name or slug', default: slug },
              params: { type: 'object', description: 'Skill-specific parameters' },
              buyer: { type: 'string', description: 'Buyer agent name' },
              buyer_email: { type: 'string', description: 'Buyer email / BaseMail' },
            },
          }}},
        },
        responses: {
          '201': { description: 'Task created with status paid' },
          '402': { description: 'Payment Required — MPP challenge' },
        },
      },
    }
  }

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'CanFly.ai — AI Agent Skill Marketplace',
      version: '1.1.0',
      description: `AI agent skill marketplace with ${results.length} purchasable skills. Pay with USDC.e on Tempo via MPP. Each skill is independently priced and discoverable.`,
    },
    'x-service-info': {
      categories: ['ai', 'marketplace'],
      tags: ['agents', 'skills', 'escrow', 'base', 'usdc', 'mpp', 'tempo', 'a2a'],
      docs: {
        homepage: 'https://canfly.ai',
        apiReference: 'https://canfly.ai/api/community/agents',
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
      ...skillPaths,
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
