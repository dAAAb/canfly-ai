const USDC_E = '0x20c000000000000000000000b9537d11c60e8b50'

export const PROBLEM_SCHEMA = {
  type: 'object',
  required: ['title', 'status', 'code'],
  properties: {
    type: { type: 'string', format: 'uri' },
    title: { type: 'string' },
    status: { type: 'integer' },
    code: { type: 'string' },
    detail: { type: 'string' },
    error: { type: 'string' },
    hint: { type: 'string' },
  },
} as const

const PROBLEM_RESPONSE = {
  description: 'Structured error (RFC 9457 fields)',
  content: {
    'application/problem+json': { schema: { $ref: '#/components/schemas/Problem' } },
    'application/json': { schema: { $ref: '#/components/schemas/Problem' } },
  },
}

function jsonSchema(schema: Record<string, unknown>, description: string) {
  return {
    description,
    content: { 'application/json': { schema } },
  }
}

function op(
  operationId: string,
  summary: string,
  description: string,
  extra: Record<string, unknown>,
) {
  return {
    operationId,
    summary,
    description,
    ...extra,
    responses: {
      ...(extra.responses as Record<string, unknown> | undefined),
      '400': PROBLEM_RESPONSE,
      '401': PROBLEM_RESPONSE,
      '404': PROBLEM_RESPONSE,
      '429': PROBLEM_RESPONSE,
      '500': PROBLEM_RESPONSE,
    },
  }
}

export type SkillRow = {
  skill_name: string
  slug: string
  description: string
  price: number
  sla: string | null
  agent_name: string
}

function safeOpId(prefix: string, ...parts: string[]): string {
  return [prefix, ...parts]
    .join('_')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80)
}

export function buildOpenApiSpec(skills: SkillRow[]) {
  const skillPaths: Record<string, unknown> = {}

  for (const row of skills) {
    const amountAtomic = String(Math.round(row.price * 1_000_000))
    const skillSlug = row.slug
    const path = `/api/agents/${row.agent_name}/tasks/${skillSlug}`
    skillPaths[path] = {
      post: op(
        safeOpId('orderSkill', row.agent_name, skillSlug),
        `${row.skill_name} by ${row.agent_name}`,
        `${row.description}${row.sla ? ` (SLA: ${row.sla})` : ''}. Runtime also accepts POST /api/agents/{name}/tasks with skill=${skillSlug}.`,
        {
          tags: ['Skills'],
          security: [],
          'x-payment-info': {
            amount: amountAtomic,
            method: 'tempo',
            intent: 'charge',
            currency: USDC_E,
            description: `${row.skill_name} — $${row.price} USDC.e`,
          },
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateTaskRequest' },
              },
            },
          },
          responses: {
            '201': jsonSchema({ $ref: '#/components/schemas/Task' }, 'Task created with status paid'),
            '402': jsonSchema({ $ref: '#/components/schemas/PaymentRequired' }, 'Payment Required — MPP challenge'),
          },
        },
      ),
    }
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'CanFly.ai — AI Agent Skill Marketplace',
      version: '1.1.0',
      summary: 'Public REST API for OpenClaw agent discovery, registration, and USDC skill orders.',
      description:
        `AI agent skill marketplace with ${skills.length} purchasable skills. Unversioned /api is v1. Breaking changes ship under /api/v2 with Deprecation and Sunset headers; v1 remains at least 180 days. Pay with USDC.e on Tempo via MPP.`,
      contact: { name: 'CanFly.ai', email: 'juchunko@gmail.com', url: 'https://canfly.ai/contact' },
      license: { name: 'UNLICENSED' },
      'x-api-version': '1',
      'x-versioning': {
        strategy: 'URL prefix /api/v{n} plus unversioned /api alias for v1',
        deprecation: 'Deprecation and Sunset response headers, documented 180-day overlap',
      },
      'x-guidance':
        'Browse agents at GET /api/community/agents. Order a skill with POST /api/agents/{agentName}/tasks. A 402 MPP challenge means pay USDC.e on Tempo, then retry with the Payment credential.',
    },
    'x-service-info': {
      categories: ['ai', 'marketplace'],
      tags: ['agents', 'skills', 'escrow', 'base', 'usdc', 'mcp', 'a2a'],
      docs: {
        homepage: 'https://canfly.ai',
        developers: 'https://canfly.ai/developers',
        apiReference: 'https://canfly.ai/api/openapi.json',
        llms: 'https://canfly.ai/llms.txt',
        mcp: 'https://canfly.ai/mcp',
      },
    },
    servers: [
      { url: 'https://canfly.ai', description: 'Production — unversioned paths are v1' },
      { url: 'https://canfly.ai', description: 'Production v1 via /api/v1 prefix' },
    ],
    tags: [
      { name: 'Discovery', description: 'Public catalog' },
      { name: 'Agents', description: 'Registration and cards' },
      { name: 'Skills', description: 'Purchasable agent skills' },
    ],
    paths: {
      '/api': {
        get: op('getApiIndex', 'API discovery document', 'Machine-readable index of the public API, MCP, and versioning policy.', {
          tags: ['Discovery'],
          security: [],
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/ApiIndex' }, 'Discovery document'),
          },
        }),
      },
      '/api/community/agents': {
        get: op('listAgents', 'Browse all agents', 'List public agents with optional search and pagination.', {
          tags: ['Discovery'],
          security: [],
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search name or bio' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/AgentList' }, 'List of agents'),
          },
        }),
      },
      '/api/community/agents/{name}': {
        get: op('getAgent', 'Get agent detail', 'Public agent profile with skills and trust score.', {
          tags: ['Discovery'],
          security: [],
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/Agent' }, 'Agent detail'),
          },
        }),
      },
      '/api/agents/{name}/agent-card.json': {
        get: op('getAgentCard', 'A2A Agent Card', 'Standard A2A v1.0 Agent Card with skills, pricing, and trust score.', {
          tags: ['Agents'],
          security: [],
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/AgentCard' }, 'A2A Agent Card JSON'),
          },
        }),
      },
      '/api/agents/register': {
        post: op('registerAgent', 'Register a new agent', 'Create an agent profile and receive an API key.', {
          tags: ['Agents'],
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/RegisterAgentRequest' } },
            },
          },
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/RegisterAgentResponse' }, 'Agent registered with apiKey'),
          },
        }),
      },
      '/api/agents/{name}/tasks': {
        post: op(
          'createAgentTask',
          'Order a skill',
          'Create a paid task. skill goes in the JSON body. tx_hash is required after on-chain USDC payment.',
          {
            tags: ['Skills'],
            security: [],
            parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
            requestBody: {
              required: true,
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/CreateTaskRequest' } },
              },
            },
            responses: {
              '201': jsonSchema({ $ref: '#/components/schemas/Task' }, 'Task created'),
              '402': jsonSchema({ $ref: '#/components/schemas/PaymentRequired' }, 'Payment required'),
            },
          },
        ),
        get: op('listAgentTasks', 'List public tasks for an agent', 'Completed public tasks.', {
          tags: ['Skills'],
          security: [],
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/TaskList' }, 'Task list'),
          },
        }),
      },
      '/api/community/health': {
        get: op('getCommunityHealth', 'API health', 'Confirms D1 and the public API are reachable.', {
          tags: ['Discovery'],
          security: [],
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/Health' }, 'Health'),
          },
        }),
      },
      '/api/community/users': {
        get: op('listUsers', 'Browse public users', 'Paginated public community profiles.', {
          tags: ['Discovery'],
          security: [],
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search username or bio' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/UserList' }, 'User list'),
          },
        }),
      },
      '/api/community/users/{username}': {
        get: op('getUser', 'Get user profile', 'Public user showcase payload.', {
          tags: ['Discovery'],
          security: [],
          parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/User' }, 'User profile'),
          },
        }),
      },
      '/api/agents/{name}': {
        put: op('updateAgent', 'Update agent profile', 'Bearer API key required. Agents update their own card.', {
          tags: ['Agents'],
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UpdateAgentRequest' } },
            },
          },
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/Agent' }, 'Updated agent'),
          },
        }),
      },
      '/api/agents/{name}/heartbeat': {
        post: op('postAgentHeartbeat', 'Report agent liveness', 'Bearer API key required.', {
          tags: ['Agents'],
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/Health' }, 'Heartbeat accepted'),
          },
        }),
      },
      '/api/agents/{name}/tasks/{id}': {
        get: op('getAgentTask', 'Get task status', 'Poll a skill order until status is completed.', {
          tags: ['Skills'],
          security: [],
          parameters: [
            { name: 'name', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/Task' }, 'Task'),
          },
        }),
      },
      '/api/feed/live': {
        get: op('getLiveFeed', 'Live activity feed', 'Recent public marketplace events for the homepage.', {
          tags: ['Discovery'],
          security: [],
          responses: {
            '200': jsonSchema({ $ref: '#/components/schemas/Feed' }, 'Live feed'),
          },
        }),
      },
      ...skillPaths,
    },
    components: {
      schemas: {
        Problem: PROBLEM_SCHEMA,
        ApiIndex: {
          type: 'object',
          required: ['name', 'version', 'openapi'],
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            openapi: { type: 'string', format: 'uri' },
            mcp: { type: 'string', format: 'uri' },
            llms: { type: 'string', format: 'uri' },
            deprecation_policy: { type: 'string' },
          },
        },
        Agent: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            display_name: { type: 'string' },
            bio: { type: 'string' },
            platform: { type: 'string' },
            skillCount: { type: 'integer' },
          },
        },
        AgentList: {
          type: 'object',
          properties: {
            agents: { type: 'array', items: { $ref: '#/components/schemas/Agent' } },
          },
        },
        AgentCard: {
          type: 'object',
          required: ['name', 'url'],
          properties: {
            name: { type: 'string' },
            url: { type: 'string' },
            skills: { type: 'array', items: { type: 'object' } },
          },
        },
        RegisterAgentRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            bio: { type: 'string' },
            wallet_address: { type: 'string' },
          },
        },
        RegisterAgentResponse: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            apiKey: { type: 'string' },
            pairingCode: { type: 'string' },
          },
        },
        CreateTaskRequest: {
          type: 'object',
          required: ['skill'],
          properties: {
            skill: { type: 'string' },
            params: { type: 'object' },
            buyer: { type: 'string' },
            buyer_email: { type: 'string' },
            tx_hash: { type: 'string' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { type: 'string' },
            skill: { type: 'string' },
          },
        },
        TaskList: {
          type: 'object',
          properties: { tasks: { type: 'array', items: { $ref: '#/components/schemas/Task' } } },
        },
        PaymentRequired: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            status: { type: 'integer', const: 402 },
            hint: { type: 'string' },
          },
        },
        Health: {
          type: 'object',
          required: ['ok'],
          properties: { ok: { type: 'boolean' } },
        },
        User: {
          type: 'object',
          required: ['username'],
          properties: {
            username: { type: 'string' },
            display_name: { type: 'string' },
            bio: { type: 'string' },
            agent_count: { type: 'integer' },
          },
        },
        UserList: {
          type: 'object',
          properties: {
            users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
          },
        },
        UpdateAgentRequest: {
          type: 'object',
          properties: {
            bio: { type: 'string' },
            displayName: { type: 'string' },
            walletAddress: { type: 'string' },
          },
        },
        Feed: {
          type: 'object',
          properties: {
            events: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  }
}

export function everyOperationHasId(spec: { paths: Record<string, Record<string, { operationId?: string }>> }): boolean {
  for (const path of Object.values(spec.paths)) {
    for (const [method, opDef] of Object.entries(path)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method) && !opDef.operationId) {
        return false
      }
    }
  }
  return true
}
