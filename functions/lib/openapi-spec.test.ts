import { describe, expect, it } from 'vitest'
import { buildOpenApiSpec, everyOperationHasId, PROBLEM_SCHEMA } from './openapi-spec'

describe('OpenAPI spec', () => {
  const spec = buildOpenApiSpec([
    {
      skill_name: 'Demo',
      slug: 'demo',
      description: 'A demo skill',
      price: 1,
      sla: '24h',
      agent_name: 'LittleLobster',
    },
  ])

  it('documents a typed error model', () => {
    expect(spec.components.schemas.Problem).toEqual(PROBLEM_SCHEMA)
    expect(spec.info['x-versioning']).toBeTruthy()
  })

  it('gives every operation an operationId and a 200/201 or 402 schema', () => {
    expect(everyOperationHasId(spec)).toBe(true)
    for (const path of Object.values(spec.paths)) {
      for (const [method, op] of Object.entries(path) as [string, { operationId?: string; responses: Record<string, { content?: unknown }> }][]) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue
        expect(op.operationId).toBeTruthy()
        const keys = Object.keys(op.responses)
        expect(keys.some((status) => ['200', '201', '402'].includes(status))).toBe(true)
        expect(op.responses['404']?.content).toBeTruthy()
      }
    }
  })
})
