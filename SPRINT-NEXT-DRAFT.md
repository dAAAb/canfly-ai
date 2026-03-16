# Sprint 11 草案 — Agent Card + User Discovery + 撈蝦系統

> 小龍蝦 2026-03-14 草擬，待 CEO 回饋 → 寶博確認

## 📊 Sprint 10 成果回顧

**完成 19 張票**（CAN-108 ~ CAN-133），主要成果：
- ✅ D1 production 部署 + seed data
- ✅ Community 瀏覽頁（真實 D1 數據 + 搜尋/篩選）
- ✅ Rankings 排行表（百分位正規化 + 分類加權 + ℹ️ popup）
- ✅ User Showcase Page (/@username)
- ✅ Register + Profile 編輯頁（Privy 登入）
- ✅ Trust Badge 元件（World ID / Wallet / Unverified）
- ✅ Perplexity Affiliate 頁面
- ✅ CTA 事件追蹤埋點
- ✅ Navbar 修復 + i18n 修正 + Hero 重設計

**未完成（blocked）：**
- 🚧 CAN-97：Cloudflare Analytics（需要 API 權限設定）
- 🚧 CAN-45：Amazon Associates（需要申請帳號）

---

## 🎯 Sprint 11 目標

**雙主題：Agent Card + 撈蝦系統**

1. **Agent Card** — 每個 Agent 都有名片頁，是導購入口
2. **撈蝦系統** — 自動發現 OpenClaw 用戶，建預辦會員頁面，追蹤認領狀態
3. **Community 排序改版** — 多維度展示用戶，不只 A-Z

---

## 📋 Ticket 草案

### 🔴 HIGH — 核心功能

| # | 標題 | 指派 | 說明 |
|---|------|------|------|
| 1 | **[DB] Schema Migration — 用戶認領 + 驗證層級 + 撈蝦欄位** | Dev | users 表新增：`source` (seed/scraped/registered), `claimed` (0/1), `claimed_at`, `scraped_at`, `scrape_ref` (來源), `external_ids` (JSON: github/discord/clawhub ID), `verification_level` (worldid/wallet/github/email/none)。agents 表加 `source`, `discovered_at`。寫 migration 0002。 |
| 2 | **[Page] Agent Card 頁面 — /@username/agent/{name}** | Dev | Agent 資料展示：Skills、Specs、Identity、Wallet Gradient banner、capabilities。參考 FLIGHT-COMMUNITY-PLAN 6.2 |
| 3 | **[API] Agent CRUD API — D1 agents 表讀寫** | Dev | GET/POST/PUT agent 資料，含 skills、specs、wallet。Agent Card 的後端。 |

### 🟡 MED — 撈蝦系統 + 排序

| # | 標題 | 指派 | 說明 |
|---|------|------|------|
| 4 | **[Feature] 撈蝦引擎 v1 — ClawHub + GitHub 用戶發現** | LittleLobster | 撰寫 scraper script，從高價值來源撈 OpenClaw 用戶：① ClawHub API（最高價值）② GitHub `openclaw`/`clawd` topic/search ③ 比對 `external_ids` 去重，已存在就 skip 或 update ④ 產出 JSON seed data |
| 5 | **[Feature] Claim Profile 流程 — 預辦會員認領 + 多層驗證** | Dev | `/@username` 頁面加 `✨ Claim this profile` 按鈕（僅 `claimed=0` 顯示）。點擊 → Privy 登入 → 驗證身份。**三層信任等級**：🌍 World ID（最高，人類驗證）> 🔗 GitHub OAuth / Wallet Sign（中）> 📧 Email only（低）。Trust Badge 顯示對應等級。DB 加 `verification_level` 欄位 (worldid/wallet/github/email/none)。World ID 驗證過 = 最高信任，排序加權。 |
| 6 | **[Page] Community Discovery 改版 — 分區 + Trending** | Dev | `/community` 頁面改版。**預設分區展示**：🌟 Featured Flyers → 🔥 Recently Claimed → 🦞 Top Shrimp Farmers → 🆕 New Discoveries（未認領帳號 + Claim 按鈕）。**可切換排序**：🔥 Trending（活躍度×時間衰減）/ 🦞 蝦數量 / 🆕 最新 / 🔤 A-Z。World ID 驗證用戶排序加權。 |
| 7 | **[Page] Free Agents 瀏覽頁 — /{lang}/free** | Dev | 自由球員市場列表，搜尋/篩選，註冊入口。參考 FLIGHT-COMMUNITY-PLAN 6.3 |
| 8 | **[Page] Brand Page — /{lang}/rankings/brand/{name}** | Dev | 品牌導購頁（ElevenLabs、HeyGen 等），affiliate links、功能介紹、使用此品牌的 agents 列表 |
| 9 | **[Data] Brand + Skills seed data** | Content Writer | 填充 5-8 個品牌完整資料 + skills 資料 |

### 🟢 LOW — 輔助

| # | 標題 | 指派 | 說明 |
|---|------|------|------|
| 10 | **[Feature] Agent 註冊表單** | Dev | 已登入用戶在 /@username 下新增 Agent，填 name/skills/wallet/specs |
| 11 | **[Content] 教學文章「5 分鐘上線 CanFly」** | Content Writer | 引導新用戶註冊 + 發布 Agent Card |
| 12 | **[Ops] Amazon Associates 設定** | LittleLobster | 解除 CAN-45 block |

---

## 🦐 撈蝦策略分層（#4 的執行細節）

| 優先級 | 來源 | 方法 | 價值 | 去重 Key |
|--------|------|------|------|---------|
| ⭐⭐⭐ | ClawHub | ClawHub API 搜用戶/skills | 直接是 OpenClaw 用戶 | `clawhub_id` |
| ⭐⭐⭐ | GitHub | Search `openclaw` `clawd` topic/repo | 有 repo = 認真玩 | `github_username` |
| ⭐⭐ | Discord | OpenClaw server 成員 | 社群成員 | `discord_id` |
| ⭐⭐ | Base Chain | `.base.eth` + agent 關鍵字 | Web3 agent 玩家 | `wallet_address` |
| ⭐ | X/Twitter | 搜 `openclaw` `clawd` | 提過就撈 | `x_username` |

**每次撈完**：
1. 比對 `external_ids` JSON → 已存在就 skip（或更新 metadata）
2. 新用戶 → INSERT `source='scraped', claimed=0, scrape_ref='github'`
3. 建預辦 `/@username` 頁面（minimal：頭像 + bio + 來源標記）
4. 記錄到 `activity_log`（action='discovered'）

**漸進增加策略**：
- v1（Sprint 11）：ClawHub + GitHub，手動/cron 觸發
- v2（Sprint 12+）：Discord bot 監聽、Base chain indexer
- v3（未來）：智慧排序 — 根據 repo stars、commit 頻率、agent 數量判斷「有價值帳號」優先撈

---

## 📊 Community 排序邏輯（#6 的設計細節）

### 頁面分區
```
┌─────────────────────────────────────────────┐
│  ✈️ CanFly Community                         │
│                                             │
│  [搜尋] [篩選: Skills|Hardware] [排序 ▼]     │
│                                             │
│  ── 🌟 Featured Flyers ───────────────────  │
│  [手動精選的優質帳號，3-5 個]                 │
│                                             │
│  ── 🔥 Recently Claimed ──────────────────  │
│  [最近認領的帳號，社交證明]                   │
│                                             │
│  ── 🦞 Top Shrimp Farmers ───────────────   │
│  [按蝦數量排序的所有用戶]                     │
│                                             │
│  ── 🆕 New Discoveries ──────────────────   │
│  [最近撈到的未認領帳號]                       │
│  [每個都有 ✨ Claim 按鈕]                     │
└─────────────────────────────────────────────┘
```

### 排序選項（用戶可切換）
| 排序 | 說明 | SQL |
|------|------|-----|
| 🦞 蝦數量 | Agent 最多的排前面 | `ORDER BY agent_count DESC` |
| ⏰ 最近加入 | 新人優先 | `ORDER BY created_at DESC` |
| 🔤 A-Z | 字母排序 | `ORDER BY username ASC` |
| ⭐ 活躍度 | 最近有更新的 | `ORDER BY updated_at DESC` |
| 🎲 隨機 | 探索模式 | `ORDER BY RANDOM()` |

**預設**：不分區時用「🦞 蝦數量」

---

## 💡 備註

- Schema migration (#1) 是基礎，其他票都依賴它，Dev 先做
- Agent Card (#2 #3) 是最重要的功能，做完才有東西展示
- 撈蝦引擎 (#4) 可以我自己寫 script，不佔 Dev 時間
- Claim Profile (#5) 有了才能把「預辦」轉「正式」，閉環！
- canfly-profile skill（agent 自動發布 profile）留 Sprint 12
- CAN-97 (CF Analytics) 待寶博提供 API token

---

## ⏭️ Sprint 12 預覽 — World ID × BaseMail 整合 + 進階功能

> 完整設計文件：`WORLD-ID-BASEMAIL-PLAN.md`

### 🌍 World ID × BaseMail 整合（核心）

| # | 標題 | 優先級 | 說明 |
|---|------|--------|------|
| 1 | [DB] World ID 驗證表 migration | HIGH | 建 `world_id_verifications` 表（nullifier 去重、wallet 索引）|
| 2 | [Feature] CanFly World ID 前端元件 | HIGH | 複用 BaseMail WorldIdVerify.tsx 邏輯，IDKit v4 + RP signature。App ID: `app_ee5d4fa1aa655b4a3ba0641bb070ad67`，Action: `real-human-canfly` |
| 3 | [API] CanFly World ID 後端路由 | HIGH | `POST /api/world-id/rp-signature`、`POST /api/world-id/verify`、`GET /api/world-id/status/:username`。signing key 放 CF 環境變數 |
| 4 | [API] BaseMail 新增 status-by-wallet API | MED | `GET /api/world-id/status-by-wallet/{address}` — CanFly 用錢包地址查 BaseMail 驗證狀態 |
| 5 | [API] BaseMail 自動開帳號 API | MED | `POST /api/accounts/auto-provision` — CanFly 驗完 World ID 後自動幫用戶開 BaseMail 帳號 |
| 6 | [Feature] 路徑 A — BaseMail 已驗證用戶免重掃 | MED | 用戶用錢包地址註冊 CanFly → 查 BaseMail API → is_human=true → 直接升 Root User |
| 7 | [Feature] 路徑 B — 新用戶驗證後自動開 BaseMail | MED | CanFly World ID 驗證成功 → 呼叫 BaseMail auto-provision → 通知用戶拿到 email |
| 8 | [Feature] Community 排序 World ID 加權 | LOW | 已驗證 World ID 的用戶在排序中權重更高 |

### 其他進階功能

- canfly-profile skill（agent 自動發布 profile 到 CanFly）
- 智慧撈蝦 v2（Discord + Base chain + 價值排序）
- Video call 嵌入（Agent Card 內 HeyGen 互動）
- SEO 優化（llms.txt、JSON-LD structured data）
