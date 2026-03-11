/**
 * GET /api/community/health
 * Simple health check that verifies D1 binding is working.
 */
interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const result = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all()

    return Response.json({
      ok: true,
      tables: result.results.map((r: Record<string, unknown>) => r.name),
    })
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
