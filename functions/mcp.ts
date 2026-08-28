import { handleMcpRpc, mcpHttpHeaders, mcpInitializeResult } from './lib/mcp-server'

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: mcpHttpHeaders() })

export const onRequestGet: PagesFunction = async () => {
  return new Response(
    JSON.stringify(
      {
        name: 'canfly',
        transport: 'streamable-http',
        protocolVersion: '2025-03-26',
        initialize: mcpInitializeResult(),
        usage: 'POST JSON-RPC 2.0 methods: initialize, resources/list, resources/read, tools/list, tools/call',
      },
      null,
      2,
    ),
    { headers: mcpHttpHeaders() },
  )
}

export const onRequestPost: PagesFunction = async (context) => {
  const origin = new URL(context.request.url).origin
  let payload: unknown
  try {
    payload = await context.request.json()
  } catch {
    return new Response(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }), {
      status: 400,
      headers: mcpHttpHeaders(),
    })
  }

  const messages = Array.isArray(payload) ? payload : [payload]
  const results = []
  for (const message of messages) {
    results.push(await handleMcpRpc(message as { method?: string; id?: string | number | null; params?: Record<string, unknown> }, origin))
  }
  const body = Array.isArray(payload) ? results : results[0]
  return new Response(JSON.stringify(body), { headers: mcpHttpHeaders() })
}
