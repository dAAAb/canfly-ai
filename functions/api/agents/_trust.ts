/**
 * Trust Score Calculation Helper
 *
 * Formula (CAN-220):
 *   trust_score = 0.4 * completion_rate + 0.3 * avg_rating_norm + 0.2 * volume_score + 0.1 * age_score
 *
 * Where:
 *   completion_rate  = completed / (completed + rejected + timeout)
 *   avg_rating_norm  = (avg_rating - 1) / 4
 *   volume_score     = min(log(total_tasks + 1) / log(100), 1)
 *   age_score        = min(account_age_days / 365, 1)
 *
 * Result: 0–100 score
 *
 * Triggered after: task completed/rejected/timeout, new rating
 */

interface TrustEnv {
  DB: D1Database
}

export async function recalcTrustScore(env: TrustEnv, agentName: string): Promise<number> {
  // 1. Task counts for this agent (as seller)
  const taskCounts = await env.DB.prepare(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'completed' AND (escrow_status IS NULL OR escrow_status NOT IN ('rejected'))) AS completed,
       COUNT(*) FILTER (WHERE escrow_status = 'rejected') AS rejected,
       COUNT(*) FILTER (WHERE status = 'timeout') AS timeout,
       COUNT(*) AS total
     FROM tasks WHERE seller_agent = ?1 AND status IN ('completed', 'failed', 'timeout')`
  ).bind(agentName).first()

  // D1 may not support FILTER — fall back to CASE/SUM
  let completed: number, rejected: number, timeout: number, totalTasks: number

  if (taskCounts && taskCounts.completed != null) {
    completed = Number(taskCounts.completed)
    rejected = Number(taskCounts.rejected)
    timeout = Number(taskCounts.timeout)
    totalTasks = Number(taskCounts.total)
  } else {
    // Fallback: separate counts with CASE
    const counts = await env.DB.prepare(
      `SELECT
         SUM(CASE WHEN status = 'completed' AND (escrow_status IS NULL OR escrow_status != 'rejected') THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN escrow_status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
         SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) AS timeout,
         COUNT(*) AS total
       FROM tasks WHERE seller_agent = ?1 AND status IN ('completed', 'failed', 'timeout')`
    ).bind(agentName).first()

    completed = Number(counts?.completed ?? 0)
    rejected = Number(counts?.rejected ?? 0)
    timeout = Number(counts?.timeout ?? 0)
    totalTasks = Number(counts?.total ?? 0)
  }

  // 2. Average rating from ratings table
  const ratingRow = await env.DB.prepare(
    `SELECT AVG(score) AS avg_rating, COUNT(*) AS total_ratings
     FROM ratings WHERE rated_agent = ?1`
  ).bind(agentName).first()

  const avgRating = Number(ratingRow?.avg_rating ?? 0)
  const totalRatings = Number(ratingRow?.total_ratings ?? 0)

  // 3. Account age (days since agent creation)
  const agentRow = await env.DB.prepare(
    `SELECT created_at FROM agents WHERE name = ?1`
  ).bind(agentName).first()

  const createdAt = agentRow?.created_at ? new Date(agentRow.created_at as string) : new Date()
  const ageDays = Math.max(0, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

  // 4. Calculate components
  const denominator = completed + rejected + timeout
  const completionRate = denominator > 0 ? completed / denominator : 0
  const avgRatingNorm = totalRatings > 0 ? (avgRating - 1) / 4 : 0
  const volumeScore = Math.min(Math.log(totalTasks + 1) / Math.log(100), 1)
  const ageScore = Math.min(ageDays / 365, 1)

  // 5. Weighted formula → 0-100
  const trustScore = Math.round(
    (0.4 * completionRate + 0.3 * avgRatingNorm + 0.2 * volumeScore + 0.1 * ageScore) * 100
  )

  // 6. Upsert trust_scores table
  await env.DB.prepare(
    `INSERT INTO trust_scores (agent_name, completion_rate, avg_rating, total_tasks, total_ratings, reject_count, timeout_count, trust_score, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
     ON CONFLICT(agent_name) DO UPDATE SET
       completion_rate = ?2,
       avg_rating = ?3,
       total_tasks = ?4,
       total_ratings = ?5,
       reject_count = ?6,
       timeout_count = ?7,
       trust_score = ?8,
       updated_at = datetime('now')`
  ).bind(agentName, completionRate, avgRating, totalTasks, totalRatings, rejected, timeout, trustScore).run()

  return trustScore
}

/**
 * Buyer Trust Score Calculation (CAN-223)
 *
 * Tracks buyer reputation:
 *   - reject_rate = buyer_reject_count / buyer_total_purchases
 *   - avg_pay_speed_hrs = average hours from task created_at to confirmed_at
 *   - buyer_trust_score = 0.5 * (1 - reject_rate) + 0.3 * pay_speed_score + 0.2 * volume_score
 *
 * Where:
 *   pay_speed_score = max(0, 1 - avg_pay_speed_hrs / 72)  (0 at 72h+, 1 at instant)
 *   volume_score    = min(log(total_purchases + 1) / log(50), 1)
 *
 * reject_rate > 30% → buyer reputation significantly degraded
 *
 * Result: 0–100 score
 */
export async function recalcBuyerTrustScore(env: TrustEnv, buyerAgent: string): Promise<number> {
  // 1. Buyer task counts
  const counts = await env.DB.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN escrow_status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
       SUM(CASE WHEN escrow_status = 'released' THEN 1 ELSE 0 END) AS confirmed
     FROM tasks WHERE buyer_agent = ?1 AND status IN ('completed', 'failed', 'timeout')`
  ).bind(buyerAgent).first()

  const totalPurchases = Number(counts?.total ?? 0)
  const rejectCount = Number(counts?.rejected ?? 0)
  const confirmedCount = Number(counts?.confirmed ?? 0)

  // 2. Average payment speed (hours from task created_at to confirmed_at)
  const speedRow = await env.DB.prepare(
    `SELECT AVG((julianday(confirmed_at) - julianday(created_at)) * 24) AS avg_hrs
     FROM tasks WHERE buyer_agent = ?1 AND confirmed_at IS NOT NULL`
  ).bind(buyerAgent).first()

  const avgPaySpeedHrs = Number(speedRow?.avg_hrs ?? 0)

  // 3. Calculate components
  const rejectRate = totalPurchases > 0 ? rejectCount / totalPurchases : 0
  const paySpeedScore = Math.max(0, 1 - avgPaySpeedHrs / 72)
  const volumeScore = Math.min(Math.log(totalPurchases + 1) / Math.log(50), 1)

  // 4. Weighted formula → 0-100
  const buyerTrustScore = Math.round(
    (0.5 * (1 - rejectRate) + 0.3 * paySpeedScore + 0.2 * volumeScore) * 100
  )

  // 5. Upsert trust_scores table (buyer columns)
  await env.DB.prepare(
    `INSERT INTO trust_scores (agent_name, buyer_total_purchases, buyer_reject_count, buyer_reject_rate, buyer_avg_pay_speed_hrs, buyer_trust_score, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
     ON CONFLICT(agent_name) DO UPDATE SET
       buyer_total_purchases = ?2,
       buyer_reject_count = ?3,
       buyer_reject_rate = ?4,
       buyer_avg_pay_speed_hrs = ?5,
       buyer_trust_score = ?6,
       updated_at = datetime('now')`
  ).bind(buyerAgent, totalPurchases, rejectCount, rejectRate, avgPaySpeedHrs, buyerTrustScore).run()

  return buyerTrustScore
}
