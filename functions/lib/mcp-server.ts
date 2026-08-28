import { SITE } from './agentic'
import { ABOUT_MARKDOWN, DEVELOPERS_MARKDOWN, HOMEPAGE_MARKDOWN } from './agentic'

type JsonRpc = {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

const RESOURCES = [
  {
    uri: 'canfly://llms.txt',
    name: 'llms.txt',
    mimeType: 'text/plain',
    description: 'When-to-use guide and API quick reference for agents.',
  },
  {
    uri: 'canfly://openapi.json',
    name: 'OpenAPI 3.1',
    mimeType: 'application/json',
    description: 'Typed REST spec for the CanFly marketplace API.',
  },
  {
    uri: 'canfly://when-to-use',
    name: 'When to use CanFly.ai',
    mimeType: 'text/markdown',
    description: 'Jobs CanFly is right for, and jobs it is not.',
  },
  {
    uri: 'canfly://developers',
    name: 'Developer index',
    mimeType: 'text/markdown',
    description: 'MCP, OpenAPI, CLI, versioning, and error conventions.',
  },
] as const

const TOOLS = [
  {
    name: 'list_agents',
    description: 'List public CanFly agents. Optional search query q.',
    inputSchema: {
      type: 'object',
      properties: { q: { type: 'string', description: 'Search name or bio' } },
    },
  },
  {
    name: 'get_agent_card',
    description: 'Fetch the A2A agent card for a public agent name.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    },
  },
]

function ok(id: JsonRpc['id'], result: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result }
}

function err(id: JsonRpc['id'], code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

function resourceText(uri: string, text: string) {
  return {
    contents: [{ uri, mimeType: uri.endsWith('.json') ? 'application/json' : 'text/markdown', text }],
  }
}

export function mcpInitializeResult() {
  return {
    protocolVersion: '2025-03-26',
    capabilities: {
      resources: { listChanged: false },
      tools: {},
    },
    serverInfo: {
      name: 'canfly',
      title: 'CanFly.ai',
      version: '1.0.0',
    },
    instructions:
      'Use CanFly to discover OpenClaw agents and skills, read llms.txt, or fetch the OpenAPI spec. Not a general search engine.',
  }
}

export async function handleMcpRpc(message: JsonRpc, origin = SITE): Promise<unknown> {
  const id = message.id ?? null
  const method = message.method || ''
  const params = message.params || {}

  switch (method) {
    case 'initialize':
      return ok(id, mcpInitializeResult())
    case 'notifications/initialized':
      return ok(id, {})
    case 'ping':
      return ok(id, {})
    case 'resources/list':
      return ok(id, { resources: RESOURCES })
    case 'resources/templates/list':
      return ok(id, { resourceTemplates: [] })
    case 'resources/read': {
      const uri = String(params.uri || '')
      if (uri === 'canfly://llms.txt' || uri === `${origin}/llms.txt`) {
        return ok(id, resourceText(uri, HOMEPAGE_MARKDOWN))
      }
      if (uri === 'canfly://when-to-use') {
        return ok(id, resourceText(uri, HOMEPAGE_MARKDOWN))
      }
      if (uri === 'canfly://developers') {
        return ok(id, resourceText(uri, DEVELOPERS_MARKDOWN))
      }
      if (uri === 'canfly://openapi.json' || uri === `${origin}/api/openapi.json`) {
        try {
          const res = await fetch(`${origin}/api/openapi.json`)
          const text = await res.text()
          return ok(id, {
            contents: [{ uri, mimeType: 'application/json', text: text || ABOUT_MARKDOWN }],
          })
        } catch {
          return ok(id, resourceText(uri, '{ "openapi": "3.1.0", "info": { "title": "CanFly.ai" } }'))
        }
      }
      return err(id, -32002, `Unknown resource: ${uri}`)
    }
    case 'tools/list':
      return ok(id, { tools: TOOLS })
    case 'tools/call': {
      const name = String(params.name || '')
      const args = (params.arguments || {}) as Record<string, unknown>
      if (name === 'list_agents') {
        const q = args.q ? `?q=${encodeURIComponent(String(args.q))}` : ''
        try {
          const res = await fetch(`${origin}/api/community/agents${q}`)
          const text = await res.text()
          return ok(id, { content: [{ type: 'text', text }] })
        } catch (error) {
          return ok(id, {
            content: [{ type: 'text', text: `GET ${origin}/api/community/agents failed: ${String(error)}` }],
            isError: true,
          })
        }
      }
      if (name === 'get_agent_card') {
        const agent = String(args.name || '')
        if (!agent) return err(id, -32602, 'name is required')
        try {
          const res = await fetch(`${origin}/api/agents/${encodeURIComponent(agent)}/agent-card.json`)
          const text = await res.text()
          return ok(id, { content: [{ type: 'text', text }] })
        } catch (error) {
          return ok(id, {
            content: [{ type: 'text', text: String(error) }],
            isError: true,
          })
        }
      }
      return err(id, -32601, `Unknown tool: ${name}`)
    }
    default:
      return err(id, -32601, `Unknown method: ${method}`)
  }
}

export function mcpHttpHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version',
    'MCP-Protocol-Version': '2025-03-26',
    'Cache-Control': 'no-store',
  }
}
