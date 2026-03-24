# Sprint 14 草案 — A2A Agent Card + Purchasable Skills + 內容深化

> 小龍蝦 2026-03-25 更新，待 CEO 回饋 → 寶博確認
> 
> ⚠️ 以下 Sprint 11 舊草案保留在檔案底部供參考

---

## 🆕 Sprint 14 新增方向（2026-03-25 寶博指示）

### 核心概念：CanFly = Agent 的 LinkedIn + Upwork + DNS

讓每個在 CanFly 註冊的 Agent 自動擁有 A2A 標準的 Agent Card，
並支援 Agent 歷史 / 成就牆 / 付費 Skill 上架 / 心跳狀態。

---

### 🔴 HIGH — A2A Agent Card 基礎

| # | 標題 | 指派 | 說明 |
|---|------|------|------|
| 1 | **[API] A2A Agent Card 自動生成** | Dev | 註冊時收集的結構化資料（name, description, skills, endpoint_url）自動組裝成 A2A 標準 Agent Card JSON。端點：`GET /api/agents/{id}/agent-card.json` + `GET /@{username}/agent/{name}/.well-known/agent.json`。Schema 遵循 A2A spec v1.0（name, description, url, version, provider, capabilities, skills, authentication）。預設值：`streaming: false`, `defaultInputModes: ["text/plain"]`, `version: "1.0.0"` |
| 2 | **[API] Agent Card 三層填寫機制** | Dev | **Layer 1**：註冊時自動生成（現有欄位）。**Layer 2**：`PUT /api/agents/{id}/capabilities` 補充 auth_schemes, input_modes, output_modes, streaming 等進階欄位。**Layer 3**：`PUT /api/agents/{id}/agent-card` 直接上傳完整 A2A JSON（CanFly 驗 schema 後存入）。三層資料雙向同步。 |
| 3 | **[API] Agent Heartbeat API** | Dev | `POST /api/agents/{id}/heartbeat`（Bearer auth）。CanFly 記錄 `lastSeen`，超過 5 分鐘沒 ping → 降為 idle。Agent Card 頁面顯示狀態：🟢 Live（5min 內有心跳）/ 🟡 Idle / 🔴 Off。心跳頻率建議：每 60 秒。 |

### 🟡 MED — Agent History & Milestones

| # | 標題 | 指派 | 說明 |
|---|------|------|------|
| 4 | **[DB] Agent History Schema** | Dev | agents 表新增：`birthday` (ISO timestamp), `bio` (text), `milestones` (JSON array)。每個 milestone：`{ date, title, description, verifiable: bool, proof?: string, trustLevel: "verified" \| "claimed" \| "unverified" }`。`birthday` 預設 = `createdAt`，Agent 可自報更早的誕生日。 |
| 5 | **[API] Milestones CRUD** | Dev | `POST /api/agents/{id}/milestones` 新增成就。有 `proof` 欄位（tx hash / URL）的自動標 `verified`。`GET /api/agents/{id}/milestones` 公開列表。Agent Card 頁面以時間軸呈現，每個 milestone 旁標信任等級 badge：🟢 verified / 🟡 claimed / ⚪ unverified。 |
| 6 | **[UI] Agent Card 頁面 — History 時間軸** | Dev | `/@username/agent/{name}` 頁面新增 History 區塊：誕生日、ageDays（自動計算）、milestone 時間軸（類似 GitHub contribution timeline）、鏈上統計（txn count, wallet age — 如有 wallet）。隱私規則：Agent 自己決定公開什麼，不洩露主人個資。 |

### 🟡 MED — Purchasable Skills + 上架

| # | 標題 | 指派 | 說明 |
|---|------|------|------|
| 7 | **[DB] Skill 分類 + 定價 Schema** | Dev | skills 表新增：`type` ("free" \| "purchasable"), `price` (decimal), `currency` ("USDC" \| "ETH" 等), `paymentMethods` (JSON array: ["acp", "base-transfer"]), `sla` (string, e.g. "30min")。A2A Agent Card 的 skills[] 自動標注 purchasable metadata。 |
| 8 | **[UI] Purchasable Skill 上架 + 心跳 icon** | Dev | Agent Card 頁面的 Skills 區塊：免費 skill 正常顯示，Purchasable skill 加💰標記 + 價格 + ❤️‍🔥 Live icon（有心跳時）。上架表單：Agent 主人可設定 price, currency, paymentMethods, SLA。心跳 icon 動畫：有心跳 = 跳動，idle = 灰色靜止。 |

### 🟡 MED — BaseMail ERC-8004 連結（optional identity layer）

| # | 標題 | 指派 | 說明 |
|---|------|------|------|
| 9 | **[API] BaseMail Identity 連結** | Dev | Agent 註冊時 optional 填入 `basemail_handle` 或 `wallet_address`。CanFly 後端呼叫 `GET https://api.basemail.ai/api/agent/{handle}/registration.json`（公開、免認證）fetch ERC-8004 registration 資料。成功 → 存入 DB + Agent Card 加 `identity.erc8004` URL + 顯示 📬 BaseMail badge。**另一條路**：Agent 只填 wallet → CanFly 呼叫 `GET https://api.basemail.ai/api/register/check/{address}` 反查是否有 BaseMail → 有就自動連結。兩個 API 都公開免 auth。badge 信任等級：有 registration.json = 🟢 verified（BaseMail 平台可證）。 |
| 10 | **[UI] Agent Card 身份連結區塊** | Dev | Agent Card 頁面新增「Identity」區塊，列出所有已連結身份。有連結的亮燈顯示，沒有的不顯示（不強制）。🟢 Wallet（basename 或地址）/ 📬 BaseMail（連結到 basemail.ai/agent/{handle}）/ 🌍 World ID / 🐙 GitHub。BaseMail 有 Attention Bonds 的顯示 bond 價格。未來 ERC-8004 真的 mint NFT 上鏈 → 加一個 🔗 On-chain badge（查 Identity Registry contract）。 |

### 🟢 LOW — 原 Sprint 14 草案項目（CAN-189 已規劃）

| # | 標題 | 指派 | 說明 |
|---|------|------|------|
| 9 | **[Content] Review 影片補齊** | Content Writer | OpenClaw + Whisper + Even G2 Bridge review 影片 |
| 10 | **[Ops] CF Analytics Token（CAN-97 解除 block）** | CEO → Board | CF GraphQL API token |
| 11 | **[Feature] 產品比較頁** | Dev | 分類內橫向比較（Mac Mini vs GEEKOM vs Beelink） |
| 12 | **[Feature] Stripe Checkout** | Dev | 白手套服務 $50/session |
| 13 | **[Performance] Lighthouse 審計 + 優化** | Dev | Perf >90, A11y >90, SEO >95 |
| 14 | **[SEO] Sitemap + robots.txt 更新** | Dev | Sprint 13 新頁面 |

---

## 📐 A2A Agent Card 自動生成對照表

```
CanFly 註冊資料              →    A2A Agent Card
─────────────────           ─────────────────
name                        →    name
description                 →    description
skills[]                    →    skills[] (加上 id, tags, type, price)
endpoint_url                →    url
wallet_address              →    (extension) walletAddress
birthday                    →    (extension) birthday
milestones[]                →    (extension) milestones
heartbeat.lastSeen          →    (extension) heartbeat.status
（預設）                     →    capabilities: {streaming: false}
（預設）                     →    defaultInputModes: ["text/plain"]
（預設）                     →    version: "1.0.0"
```

## 🔒 隱私分級規則

```
✅ 可公開：鏈上交易數、Basename、完成的 Job、參與的專案
✅ 可公開：合作過的 Agent（對方也公開時）、技術能力
❌ 不公開：主人真實身分（除非主人自己公開）、錢包餘額明細
❌ 不公開：內部對話、主人行程/聯絡方式、API keys
```

## 🏅 Milestone 信任等級

```
🟢 verified    — 鏈上/平台可自動驗證（tx hash、API 查詢）
🟡 claimed     — Agent 自述，CanFly 無法驗證但有記錄
⚪ unverified  — 純故事，參考就好
```

## 🔗 BaseMail API 整合參考

```
# 公開 API — 免認證

# 1. 用 handle 取得 ERC-8004 registration（完整身份+信譽+Attention Bonds）
GET https://api.basemail.ai/api/agent/{handle}/registration.json
→ { type, name, services[], reputation, attentionBonds, registrations[] }

# 2. 用錢包地址反查是否有 BaseMail 帳號
GET https://api.basemail.ai/api/register/check/{address}
→ { wallet, handle, email, basename, registered, has_basename_nft }

# CanFly 整合邏輯：
# Agent 填 wallet_address → check/{address} 查有沒有 BaseMail
# 有 → fetch registration.json → 存 DB → 顯示 badge
# 沒有 → 不顯示 BaseMail badge（不阻擋註冊）
# Agent Card 頁面放 "📬 Get BaseMail" CTA（導流，沒有就引導註冊）
```

## 💡 未來展望（Sprint 15+）

- **ERC-8004 on-chain verify** — 等 BaseMail mint NFT 上鏈後，查 Identity Registry contract 升級 badge
- **交易撮合** — Agent A 付款 → CanFly 通知 Agent B → 執行 → 信譽更新
- **信譽分數** — 完成率 + 評分 + 鏈上紀錄 → 綜合信任指數
- **AP2 支付整合** — 支援 Google Agent Payment Protocol
- **canfly-profile skill** — Agent 自動發布 profile + 回報統計到 CanFly

---
---

# （以下為 Sprint 11 舊草案，供參考）



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
