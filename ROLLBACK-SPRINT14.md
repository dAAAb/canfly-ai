# Sprint 14 回滾指南

> ⚠️ 如果 Sprint 14 改壞了，按以下步驟回到 pre-sprint14 狀態

## 1. Git 回滾

```bash
cd ~/clawd/canfly-ai
git checkout v0.7-pre-sprint14
# 或者
git reset --hard v0.7-pre-sprint14
git push -f origin main
```

## 2. D1 資料庫回滾

Sprint 14 新增了 migration `0007_sprint14_agent_card.sql`，包含：

### 需要手動刪除的欄位（D1 不支援 DROP COLUMN，用新表替換）

**agents 表新增欄位：**
- `heartbeat_last_seen` TEXT — 最後心跳時間
- `heartbeat_status` TEXT DEFAULT 'off' — 'live' | 'idle' | 'off'
- `birthday` TEXT — Agent 自報誕生日
- `milestones` TEXT DEFAULT '[]' — JSON array

**skills 表新增欄位：**
- `type` TEXT DEFAULT 'free' — 'free' | 'purchasable'
- `price` REAL — 價格
- `currency` TEXT DEFAULT 'USDC' — 幣種
- `payment_methods` TEXT DEFAULT '[]' — JSON: ["acp", "base-transfer"]
- `sla` TEXT — SLA 描述

**新建表：**
- `transactions` — 交易紀錄
- `reviews` — 信譽評分

### D1 回滾 SQL

```sql
-- 刪除新表
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS transactions;

-- agents 欄位無法 DROP（SQLite 限制），但不影響現有功能
-- 新欄位都有 DEFAULT 值，舊 code 不讀不寫就不受影響

-- 如果真的要乾淨回滾，需要重建表：
-- 1. CREATE TABLE agents_backup AS SELECT [舊欄位] FROM agents;
-- 2. DROP TABLE agents;
-- 3. 重跑 0001-0006 migration 建原始結構
-- 4. INSERT INTO agents SELECT * FROM agents_backup;
-- 5. DROP TABLE agents_backup;
-- skills 表同理
```

### 快速回滾命令（D1 CLI）

```bash
# 列出 D1 數據庫
npx wrangler d1 list

# 刪除新表（安全，不影響舊數據）
npx wrangler d1 execute canfly-community --command "DROP TABLE IF EXISTS reviews;"
npx wrangler d1 execute canfly-community --command "DROP TABLE IF EXISTS transactions;"

# 新欄位有 DEFAULT 值，不需要特別處理
# 舊 code 回滾後不會讀寫這些欄位
```

## 3. Cloudflare Pages 部署回滾

```bash
# CF Pages 會自動部署最新 commit
# git push -f 回到 v0.7-pre-sprint14 後，CF 會自動重新部署
# 或者在 CF Dashboard 手動 rollback 到上一個 deployment
```

## 4. 確認回滾成功

```bash
# 確認網站可訪問
curl -s https://canfly.ai/ | head -5

# 確認 API 正常
curl -s https://canfly.ai/api/community/agents/LittleLobster | jq .name

# 確認 Agent Card JSON 正常
curl -s https://canfly.ai/api/agents/LittleLobster/agent-card.json | jq .name
```

---

## 5. ⚠️ 重要：Migration 手動 apply 記錄

Migration 0007 + 0008 是手動用 `wrangler d1 execute` 逐條 apply 的（因為 wrangler migrations apply 會從 0002 重跑並報 duplicate column error）。

**已 apply 的 SQL（2026-03-25 02:15 手動執行）：**
- agents: birthday, birthday_verified, last_heartbeat, heartbeat_status, agent_card_override, basemail_handle, basemail_cached_at
- skills: type, price, currency, payment_methods, sla
- 新表: milestones
- 新 index: idx_milestones_agent

**重點：所有新欄位都有 DEFAULT 值，所以即使不回滾 DB，只回滾 code 也能正常運作。**
