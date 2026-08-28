import { describe, expect, it } from 'vitest'
import { handleMcpRpc, mcpInitializeResult } from './mcp-server'

describe('MCP initialize', () => {
  it('advertises resources and tools', () => {
    const result = mcpInitializeResult()
    expect(result.capabilities.resources).toBeTruthy()
    expect(result.serverInfo.name).toBe('canfly')
  })
})

describe('MCP JSON-RPC', () => {
  it('lists at least one readable resource', async () => {
    const listed = await handleMcpRpc({ jsonrpc: '2.0', id: 1, method: 'resources/list' }) as {
      result: { resources: { uri: string }[] }
    }
    expect(listed.result.resources.length).toBeGreaterThan(0)

    const read = await handleMcpRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'resources/read',
      params: { uri: listed.result.resources[0].uri },
    }) as { result: { contents: { text: string; mimeType: string }[] } }
    expect(read.result.contents[0].text.length).toBeGreaterThan(20)
    expect(read.result.contents[0].mimeType).toBeTruthy()
  })

  it('lists tools', async () => {
    const listed = await handleMcpRpc({ jsonrpc: '2.0', id: 3, method: 'tools/list' }) as {
      result: { tools: { name: string }[] }
    }
    expect(listed.result.tools.map((tool) => tool.name)).toContain('list_agents')
  })
})
