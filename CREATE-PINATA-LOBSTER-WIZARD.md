# 創 Pinata 蝦 Wizard — UX & 輸入規格

> 最後更新：2026-04-25 | 維護者：小龍蝦 🦞
> 對應 issue：**CAN-302（V4 Phase A）**
> 配套檔案：`PINATA-API-CAPABILITIES.md`、`OPENROUTER-MANAGEMENT-API.md`、`V4-PLAN.md`

---

## 🎯 設計目標

讓「完全沒接觸過 AI agent 的新手」在 30 秒內擁有自己的第一隻 Pinata 免費蝦。
取代 Zeabur Hub Key flow，**唯一的credential 入口是 Pinata JWT**（OpenRouter key 由 CanFly management API 自動建）。

**架構決策：路徑 A（BYO Pinata JWT）**。
理由：Pinata 沒 OAuth，也還沒談 partnership service-account；FREE tier 限 1 蝦/帳號 → CanFly fronts 不可能規模化。
未來談成 partnership 後升級 fast-path 不影響 D1，只是 wizard 加分支。

---

## 🔁 與 Zeabur 蝦 wizard 的對照

| 步驟 | Zeabur 蝦 | **Pinata 蝦** |
|------|----------|--------------|
| 1. 巢穴 provider | `zeabur` | `pinata` |
| 2. 巢穴 credential | Zeabur Server token | **Pinata JWT** |
| 3. AI provider | Zeabur AI Hub Key（用戶貼） | **OpenRouter（CanFly 自動建子 key, `limit:0`）** |
| 4. 預設 model | Zeabur Hub model 列表 | **CanFly 精選 5 個 free model（過濾 `expiration_date`）** |
| 5. 蝦身份 | name / emoji / vibe | name / emoji / vibe |
| 6. Telegram 綁定 | 創蝦後另開頁綁 | **創蝦後另開頁綁**（與 Zeabur 一致） |
| 7. 升級路徑 | 改方案 → PATCH server spec | PATCH OpenRouter key `limit` → 升級成付費 model |

→ 對 CanFly 用戶來說只差「貼 Zeabur token」變「貼 Pinata JWT」+「不用自己貼 AI key」。**整體流程更短**。

---

## 📥 用戶輸入分層

### 🔴 必填（Wizard 第 1-3 頁）

| 欄位 | 為什麼必填 | 取得方式 |
|------|-----------|---------|
| **Pinata JWT** | Pinata 沒 OAuth，必須 BYO token | [app.pinata.cloud](https://app.pinata.cloud) → API Keys → 建 scoped JWT 貼回來。Wizard 內嵌 30s 教學影片 + screenshot |
| **蝦名字** | Lobster 身份 | 自由命名；CanFly 提供 8 個建議名稱（小龍蝦、Nova、阿蝦…） |
| **預設 free model** | 蝦的 AI 腦 | 從 CanFly featured 5 個 free model 下拉。每個顯示：provider logo + ctx 大小 + 一句適合場景描述 |

→ 僅這 3 項即可啟動。預估 wizard 完成時間 < 60 秒。

### 🟡 選填（Wizard 預設值，可改）

| 欄位 | 預設值 | 影響 |
|------|--------|------|
| Emoji | 🦞（隨機從 CanFly emoji set 選） | UI 顯示 |
| 簡介 description | 「我是 {name}，CanFly 的免費小蝦」 | Lobster self-intro |
| 個性 vibe | 「友善、簡潔、幫得上忙」 | 蝦的 system prompt 風格 |
| Pinata Template | **「從零開始」（不掛 template）** | 詳見下方 [Template 預設討論](#-template-預設討論) |
| 初始任務指示 | 無 | 第一次喚醒蝦時的 prompt |

### ⚙️ CanFly 自動處理（用戶完全不碰）

| 工作 | 怎麼做 |
|------|------|
| 建 OpenRouter 子 key | management key → `POST /v1/keys { name: "canfly-{userId}-{lobsterId}", limit: 0 }` |
| 加密存 D1 | AES-256-GCM 寫 `lobsters.ai_config.encryptedKey` |
| Push 到 Pinata Secrets Vault | `POST /v0/secrets`（用戶 Pinata JWT 認證） |
| Attach secret 到新蝦 | `POST /v0/agents/{id}/secrets/{secretId}` |
| 創 Pinata agent 本體 | `POST /v0/agents`（payload shape 待 spike） |
| Workspace / Farm 歸屬 | 從登入態抓 |
| 額度監控 | Cron 抓 `limit_remaining`、`usage_*`（OpenRouter）+ `timeCredits`（Pinata） |

---

## 📨 創蝦後流程：Telegram 綁定（與 Zeabur 一致）

**設計鐵律**：Telegram 是「創蝦後」獨立流程，**不**塞進 wizard。
理由：
- 跟 Zeabur 蝦一致，降低用戶學習成本
- Telegram bot token 是另一條 credential 流，混入 wizard 會讓必填欄位翻倍
- 創蝦失敗時不該因為 Telegram 步驟壞掉而連帶失敗

### Flow

```
創蝦完成 → Lobster 詳情頁
              │
              ├─ [概覽 / Tasks / Skills / Channels]  ← tab
              │
              └─ Channels tab → Telegram 卡片
                                   │
                                   ├─ 「綁定 Telegram」按鈕
                                   ├─ 用戶貼 bot token（@BotFather 拿的）
                                   ├─ CanFly Worker → POST /v0/agents/{id}/channels
                                   └─ 成功後顯示 bot username + 測試訊息按鈕
```

### 對應 Pinata API

從 `PINATA-API-CAPABILITIES.md` 已知：
- `GET/POST /v0/agents/{agentId}/channels/...` 管理 Telegram/Slack/Discord
- 蝦的 `channelsJson` 欄位記錄目前綁定的 channels

V4 Phase A MVP **只做 Telegram**。Slack / Discord 留 Phase B。

---

## 🪅 Template 預設討論

### 用戶提出的問題

> 預先指定一律多安裝 [Privy Wallet Agent](https://agents.pinata.cloud/landing/marketplace/tgny401x) template 會造成失敗率提高嗎？

### 結論：**會明顯拉高失敗率，不應該預設裝**

### Privy Wallet Agent 的真實成本

研究來源：
- Pinata marketplace 頁（`/landing/marketplace/tgny401x`）
- [privy-io/privy-agentic-wallets-skill GitHub](https://github.com/privy-io/privy-agentic-wallets-skill)
- [Privy 官方 blog](https://privy.io/blog/securely-equipping-openclaw-agents-with-privy-wallets)

**裝這個 template 的硬性前置條件**：

| 條件 | 影響新手用戶 |
|------|------------|
| 需要 Privy 帳號（去 dashboard.privy.io 註冊） | 多一個註冊 |
| 需要 Privy App ID | 多一個複製貼上 |
| 需要 Privy App Secret | 多一個複製貼上 + 安全顧慮（這是 server-side secret） |
| 兩個都要設成 env var：`PRIVY_APP_ID`、`PRIVY_APP_SECRET` | 蝦容器裡缺 env 蝦會壞 |
| 蝦會被預設賦予「上鏈執行交易」能力 | 對非 web3 用戶來說是恐怖功能而非賣點 |

**失敗模式**：
- 用戶沒設 Privy env → 蝦能跑但任何錢包相關指令會丟錯
- 用戶設錯 → 認證失敗，agent 容器裡產生大量 error log
- 用戶不懂 Privy 是什麼 → 直接放棄
- 對非 web3 用戶完全無用，反而增加困惑面積

### 跟 V4 Layer 0 的核心矛盾

V4-PLAN.md Layer 0 的賣點是：
> 「$0、不裝軟體、不要信用卡」

預裝 Privy Wallet Agent 直接破壞所有三條：
- ❌ 雖然 Privy free tier 有，但要註冊
- ❌ 等於「裝了個會出錯的擴充」
- ❌ 雖不要信用卡但要面對自己的鏈上錢包概念

### 建議分流

| 用戶情境 | Template 預設 |
|---------|--------------|
| 新手 / 立委辦公室 / 一般用戶（**99% case**）| **「從零開始」**，最乾淨 |
| 「我是 Web3 開發者」用戶（自己勾選） | 提供 template picker，**Privy 是其中一個選項，但不是預設** |
| Phase B：CanFly 自家 template（PM 蝦、影像生成蝦…） | 不預設，但放在 picker 推薦位置 |

### Wizard UI 對應

```
┌─ 進階選項（預設摺疊）─────────────────────┐
│ ☐ 我想用 Pinata Marketplace template       │
│   ↓（展開）                                 │
│   ⚪ 從零開始（推薦）                       │
│   ⚪ Privy Wallet Agent（需要 Privy 帳號）  │
│   ⚪ Polygon Agent CLI（需要 Polygon RPC）  │
│   ⚪ Alchemy / ampersend / Tempo …          │
│                                             │
│   ⚠️ 每個 template 顯示：                    │
│      - 額外需要的 credential                │
│      - 適合的用戶情境                        │
│      - 安裝失敗的常見原因                    │
└─────────────────────────────────────────────┘
```

→ 「進階」二字是關鍵，把選擇成本留給有需求的用戶。

---

## 🗃️ D1 schema 對應

### 新增 / 改動

```sql
-- nests 加 provider = 'pinata'
-- spec JSON 結構：
{
  "pinataAgentId": "xobr1q73",
  "pinataJwtEnc": "<AES-256-GCM ciphertext>",   -- 用戶貼的 JWT
  "pinataPlan": "FREE",
  "runtimeLimit": 7200,                          -- 秒（FREE = 2hr/月）
  "runtimeUsed": 0,
  "agentVersion": "2026.3.2",
  "snapshotCid": "Qm..."
}

-- lobsters
ai_provider = 'openrouter-canfly-managed'
ai_config JSON：
{
  "openrouterKeyHash": "21ec6d97...260f2cc0",   -- 後續 PATCH/DELETE 用
  "openrouterKeyLabel": "sk-or-v1-a42...787",   -- mask 給 UI 顯示
  "openrouterKeyEnc": "<AES-256-GCM ciphertext>",
  "freeModelId": "nvidia/nemotron-3-super-120b-a12b:free",
  "modelLockedToFree": true                      -- UI flag，未來升級時改 false
}

-- 新表：CanFly 維護的 free model 精選
CREATE TABLE featured_free_models (
  id TEXT PRIMARY KEY,                          -- e.g. 'nvidia/nemotron-3-super-120b-a12b:free'
  display_name TEXT NOT NULL,
  provider_logo_url TEXT,
  context_length INTEGER,
  use_case_zh TEXT,                             -- '一般對話 / 程式 / 視覺...'
  rank INTEGER NOT NULL,                        -- CanFly 編輯給的排序
  active INTEGER DEFAULT 1,                     -- 下架時設 0
  reviewed_at TEXT NOT NULL,                    -- 上次 review 時間（提醒每月 review）
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Cron 對 featured_free_models 的健康檢查

每天一次：
1. 抓 `https://openrouter.ai/api/v1/models`
2. 對每個 `active=1` 的 featured：
   - 確認還在 `pricing.prompt = "0"`
   - 確認 `expiration_date` 是 null
   - 否則自動 `active = 0` 並通知小龍蝦/寶博
3. 給仍 active 的更新 `context_length` 等 metadata

---

## 🗺️ Wizard Flow 細節

```
[頁 1：Provider 選擇]
   選 🪅 Pinata FREE / 🦐 Zeabur 🦐 / 🦞 Zeabur 🦞 / 🏠 本地

   ↓（選 Pinata）

[頁 2：Pinata JWT]
   - 貼 JWT 輸入框（隱藏文字、可貼上）
   - 「怎麼拿？」展開教學（30s 影片 + 3 步驟 screenshot）
   - 即時驗證：呼叫 GET /v0/agents 檢查 token 有效
   - ❌ 失敗時顯示具體錯誤（401 = token 錯、403 = 權限不夠）

   ↓

[頁 3：蝦身份]
   - name（必填，建議 8 個）
   - emoji（必填，預設隨機）
   - description（選填，預設）
   - vibe（選填，預設）

   ↓

[頁 4：選腦袋]
   - Free model 5 選 1（卡片式）
   - 每個卡片：logo / name / ctx / 適合做什麼
   - 預設選第 1 個（rank=1 of featured_free_models）

   ↓

[頁 5：進階（摺疊）]
   - Template picker（預設「從零開始」）
   - 初始任務（選填）

   ↓

[頁 6：確認]
   - 顯示所有設定
   - 「創蝦」按鈕
   - 顯示「將自動為你建立 OpenRouter 免費 key（限定 free model）」說明

   ↓（點創蝦）

[loading：5-15 秒]
   1. POST /v1/keys（建 OpenRouter 子 key）
   2. POST /v0/secrets（push 到 Pinata vault）
   3. POST /v0/agents（建 Pinata agent，attach secret + model）
   4. INSERT D1（farm/lobster/nest 三表）
   5. 跳轉 lobster 詳情頁

   ↓

[Lobster 詳情頁]
   - Channels tab → 引導綁 Telegram（選填，創後做）
```

---

## ✅ Wizard MVP 驗收條件

- [ ] 全程 ≤ 60 秒（量測 P50）
- [ ] 必填欄位 = 3（Pinata JWT / name / model）
- [ ] Telegram 綁定獨立於創蝦流程
- [ ] Privy / Polygon 等 template **不預設**，藏在「進階」
- [ ] 創蝦失敗時：D1 不留半成品（transactional 或 cleanup cron）
- [ ] OpenRouter 子 key `limit: 0` 驗證通過（free 通、paid 擋）
- [ ] 失敗 / 額度用盡時，UI 清楚顯示升級路徑（→ Pinata PICNIC / CanFly Zeabur）

---

## 🦞 小龍蝦結論

1. **路徑 A（BYO Pinata JWT）= V4 Phase A 共識**。Partnership 升級成 fast-path 是未來事。
2. **Telegram 綁定學 Zeabur 流程**：創後在 lobster 詳情頁的 Channels tab 做。
3. **Privy Wallet Agent 不預設裝**：會把「30 秒新手體驗」變「30 分鐘 web3 註冊馬拉松」。藏在進階，給有 Privy 帳號的用戶自勾。
4. **Wizard 必填 3 項**：Pinata JWT / 蝦名 / Free model。其他全部有預設。
5. **D1 改動小**：`nests.provider` 加值、`lobsters.ai_provider` 加值、新增 `featured_free_models` table。
