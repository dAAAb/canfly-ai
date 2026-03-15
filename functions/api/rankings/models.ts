/**
 * GET /api/rankings/models
 *
 * Returns AI model leaderboard data from PinchBench.
 * Uses D1 rankings_cache with 60-minute stale-while-revalidate strategy.
 *
 * Query params:
 *   provider  — filter by provider (e.g. "anthropic", "openai")
 *   sort      — "score" (default) | "cost" | "speed"
 *   limit     — max results (default 50, max 200)
 */

interface Env {
  DB: D1Database
}

const PINCHBENCH_URL = 'https://api.pinchbench.com/api/leaderboard'
const CACHE_KEY = 'pinchbench-leaderboard'
const CACHE_MAX_AGE_SEC = 60 * 60 // 60 minutes

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

interface LeaderboardEntry {
  model: string
  provider: string
  best_score_percentage: number
  average_score_percentage: number
  average_execution_time_seconds: number
  best_execution_time_seconds: number
  average_cost_usd: number
  best_cost_usd: number
  submission_count: number
  latest_submission: string
  best_submission_id: string
  weights: string
  hf_link: string | null
}

interface PinchBenchResponse {
  leaderboard: LeaderboardEntry[]
  total_models: number
  generated_at: string
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS })
}

async function fetchFromPinchBench(): Promise<PinchBenchResponse> {
  const res = await fetch(PINCHBENCH_URL)
  if (!res.ok) {
    throw new Error(`PinchBench API returned ${res.status}`)
  }
  return res.json() as Promise<PinchBenchResponse>
}

async function getCachedData(db: D1Database): Promise<{ data: PinchBenchResponse; fresh: boolean } | null> {
  const row = await db
    .prepare('SELECT data, fetched_at FROM rankings_cache WHERE key = ? AND category = ?')
    .bind(CACHE_KEY, 'models')
    .first<{ data: string; fetched_at: string }>()

  if (!row) return null

  const ageMs = Date.now() - new Date(row.fetched_at + 'Z').getTime()
  return {
    data: JSON.parse(row.data) as PinchBenchResponse,
    fresh: ageMs < CACHE_MAX_AGE_SEC * 1000,
  }
}

async function updateCache(db: D1Database, payload: PinchBenchResponse): Promise<void> {
  const jsonStr = JSON.stringify(payload)
  await db
    .prepare(
      `INSERT INTO rankings_cache (key, category, data, fetched_at)
       VALUES (?, 'models', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`
    )
    .bind(CACHE_KEY, jsonStr)
    .run()
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url)
  const providerFilter = url.searchParams.get('provider')?.toLowerCase()
  const sort = url.searchParams.get('sort') || 'score'
  const limitParam = parseInt(url.searchParams.get('limit') || '50', 10)
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 50 : limitParam), 200)

  try {
    // Try cache first
    const cached = await getCachedData(env.DB)
    let data: PinchBenchResponse

    if (cached?.fresh) {
      data = cached.data
    } else {
      // Fetch fresh data (fall back to stale cache on error)
      try {
        data = await fetchFromPinchBench()
        // Update cache in background — don't block response
        await updateCache(env.DB, data)
      } catch (fetchErr) {
        if (cached) {
          // Serve stale cache
          data = cached.data
        } else {
          throw fetchErr
        }
      }
    }

    let entries = data.leaderboard

    // Filter by provider
    if (providerFilter) {
      entries = entries.filter((e) => e.provider.toLowerCase() === providerFilter)
    }

    // Sort
    switch (sort) {
      case 'cost':
        entries = [...entries].sort((a, b) => a.best_cost_usd - b.best_cost_usd)
        break
      case 'speed':
        entries = [...entries].sort((a, b) => a.best_execution_time_seconds - b.best_execution_time_seconds)
        break
      case 'score':
      default:
        entries = [...entries].sort((a, b) => b.best_score_percentage - a.best_score_percentage)
        break
    }

    // Limit
    entries = entries.slice(0, limit)

    return json({
      models: entries,
      total: entries.length,
      total_all: data.total_models,
      source: 'pinchbench',
      generated_at: data.generated_at,
    })
  } catch (err) {
    return json(
      { error: 'Failed to fetch model rankings', detail: err instanceof Error ? err.message : 'Unknown error' },
      502
    )
  }
}
