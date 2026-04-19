# CanFly v3 — 多蝦調度架構（Multica-inspired）

> 最後更新：2026-04-15 | 維護者：小龍蝦 🦞
> 取代先前的「Paperclip 概念自建」方案（2026-04-02）

## 🧭 架構轉向：為什麼從 Paperclip 轉向 Multica 模型

### 先前方案（2026-04-02 決定）
> 把 Paperclip 當學習參考，核心調度能力直接寫進 CanFly repo

問題：Paperclip 的「公司治理模擬」（CEO、組織架構、審批鏈）對 CanFly 用戶太重。
CanFly 用戶不是在模擬公司，他們是在**管理自己的 AI 團隊**。

### 新方案（2026-04-15）
> 學 Multica 的四層抽象，用 CanFly 的技術棧（D1 + Workers）實作

Multica 的「像管人一樣管 agent」比 Paperclip 的「像經營公司一樣管 agent」更貼合 CanFly 的用戶場景。

---

## 🏗️ 四層抽象：Multica → CanFly 對映

| Multica 概念 | CanFly 對映 | 說明 |
|-------------|------------|------|
| **Workspace** | **蝦場 (Farm)** | 用戶的獨立工作空間，所有蝦、任務、設定都在這裡 |
| **Agent** | **蝦 (Lobster)** | 有名字、有 profile、會回報進度、出現在 board 上 |
| **Runtime** | **巢穴 (Nest)** | 蝦跑在哪（Zeabur instance / 本地 Mac / 雲 VPS） |
| **Skills** | **技能 (Skills)** | 蝦學到的可複用能力，可跨蝦分享 |
| **Issue** | **任務 (Task)** | 分派給蝦的工作，有狀態追蹤 |

### 為什麼這個對映更好

1. **Workspace → 蝦場**：比 Paperclip 的 "Company" 更直覺。用戶是養蝦的人，不是公司 CEO。
2. **Runtime → 巢穴**：明確把「蝦的邏輯身份」和「蝦跑在哪」分開。同一隻蝦可以換巢穴（遷移），同一個巢穴可以跑多隻蝦。
3. **Skills → 技能**：**Paperclip 完全沒有的殺手功能**。蝦學會一件事，記錄下來，下次不用重學。跨蝦分享 = 團隊越用越強。

---

## 📊 D1 Schema 設計

### 核心表

```sql
-- 蝦場（用戶的工作空間）
CREATE TABLE farms (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,           -- CanFly 用戶 ID
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  settings TEXT DEFAULT '{}',      -- JSON: 偏好、通知、預算上限
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 巢穴（運算環境）
CREATE TABLE nests (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  provider TEXT NOT NULL,          -- 'zeabur' | 'local' | 'vps'
  provider_ref TEXT,               -- Zeabur server ID / IP / etc.
  status TEXT DEFAULT 'offline',   -- 'online' | 'offline' | 'deploying'
  spec TEXT DEFAULT '{}',          -- JSON: cpu, ram, region, plan
  detected_clis TEXT DEFAULT '[]', -- JSON: ['openclaw', 'claude', ...]
  last_heartbeat TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (farm_id) REFERENCES farms(id)
);

-- 蝦（Agent 身份）
CREATE TABLE lobsters (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  nest_id TEXT,                    -- 目前跑在哪個巢穴（可 NULL = 未部署）
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'worker',      -- 'pm' | 'worker' | 'specialist'
  ai_provider TEXT,                -- 'zeabur-hub' | 'byok' | 'canfly-credit' | 'ollama'
  ai_config TEXT DEFAULT '{}',     -- JSON: model, api_key (encrypted), etc.
  status TEXT DEFAULT 'idle',      -- 'idle' | 'working' | 'error' | 'offline'
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (farm_id) REFERENCES farms(id),
  FOREIGN KEY (nest_id) REFERENCES nests(id)
);

-- 技能（可複用能力）
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  farm_id TEXT,                    -- NULL = 全域技能（社群分享）
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,                   -- 'deployment' | 'coding' | 'writing' | 'research' | ...
  instructions TEXT NOT NULL,      -- 蝦執行此技能的 step-by-step
  source_lobster_id TEXT,          -- 誰學會的
  source_task_id TEXT,             -- 從哪個任務學到的
  usage_count INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,           -- 社群評分（0-5）
  is_public INTEGER DEFAULT 0,    -- 1 = 社群可見
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (farm_id) REFERENCES farms(id)
);

-- 任務（分派給蝦的工作）
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog',   -- 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled'
  priority TEXT DEFAULT 'medium',  -- 'critical' | 'high' | 'medium' | 'low'
  assigned_to TEXT,                -- lobster_id
  parent_task_id TEXT,             -- 支援子任務
  skills_used TEXT DEFAULT '[]',   -- JSON: 用了哪些 skill
  created_by TEXT,                 -- user_id 或 lobster_id（蝦也能建任務）
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (farm_id) REFERENCES farms(id),
  FOREIGN KEY (assigned_to) REFERENCES lobsters(id)
);

-- 任務留言（蝦跟蝦、蝦跟人的溝通）
CREATE TABLE task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  author_type TEXT NOT NULL,       -- 'user' | 'lobster'
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  mentions TEXT DEFAULT '[]',      -- JSON: 被 @mention 的 lobster_id
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- 預算追蹤（從 Paperclip 保留的好概念）
CREATE TABLE budget_ledger (
  id TEXT PRIMARY KEY,
  farm_id TEXT NOT NULL,
  lobster_id TEXT,
  type TEXT NOT NULL,              -- 'ai_token' | 'compute' | 'service'
  amount_cents INTEGER NOT NULL,   -- 負數 = 消費，正數 = 充值
  balance_after INTEGER NOT NULL,
  description TEXT,
  task_id TEXT,                    -- 關聯的任務
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (farm_id) REFERENCES farms(id)
);
```

---

## 🔄 任務生命週期

```
                  ┌──── 蝦自建 ────┐
                  │                │
                  v                │
  [backlog] ──> [todo] ──> [in_progress] ──> [done]
     │                        │       │
     │                        v       └──> [cancelled]
     │                    [blocked]
     │                        │
     └────────────────────────┘
                 (解除後回 todo)
```

### 與 Multica 的差異

| 機制 | Multica | CanFly |
|------|---------|--------|
| 任務認領 | Agent 自動 claim | PM 蝦分派 或 蝦自己 claim |
| 進度回報 | WebSocket 即時串流 | Heartbeat + Webhook（CF Workers 無 long-lived WS）|
| 阻塞處理 | 手動標記 blocked | 蝦可自己標 blocked + 在 comment @PM 求助 |
| 子任務 | ❌ | ✅ parent_task_id（從 Paperclip 保留）|

---

## 🧠 Skills 系統（Multica 的殺手功能，CanFly 版）

### 技能生命週期

```
蝦完成任務 → 偵測可複用模式 → 自動/手動建立 Skill
                                    │
                                    v
                              [Farm 私有技能]
                                    │
                              用戶選擇公開
                                    v
                              [社群技能市場]
                                    │
                              其他蝦場引用
                                    v
                              usage_count++, rating 累積
```

### 技能分類

| 類別 | 範例 |
|------|------|
| `deployment` | 部署 Next.js 到 Zeabur、設定 Cloudflare DNS |
| `coding` | 寫 React component、修 TypeScript 型別錯誤 |
| `writing` | 寫 blog post、翻譯中英文 |
| `research` | 市場調研、競品分析 |
| `media` | 生成 AI 圖片、剪輯影片 |
| `ops` | 監控服務、自動重啟 |

### 商業化切點

1. **免費蝦**：只能用公開社群技能
2. **付費蝦**：可建立私有技能 + 無限引用
3. **技能市場**：高品質技能可付費購買（作者分潤）← 未來
4. **技能數量**：蝦用越久、技能越多、用戶越捨不得走（黏性）

---

## 🏠 巢穴管理（Runtime 抽象）

### 支援的巢穴類型

| 類型 | 說明 | 偵測方式 |
|------|------|---------|
| **Zeabur（BYO）** | 用戶自己的 Zeabur server | Zeabur API 查 status |
| **本地 Mac/PC** | 用戶電腦上跑 OpenClaw | Agent 回報 heartbeat |
| **VPS** | 任何可 SSH 的機器 | SSH heartbeat probe |

### Heartbeat 機制（CF Cron Trigger）

```
每 5 分鐘：
1. 遍歷所有 online nests
2. 對每個 nest 發 heartbeat probe
   - Zeabur: 查 service status API
   - 本地/VPS: 等 agent 主動回報（timeout = 10min → 標 offline）
3. 更新 nests.status + nests.last_heartbeat
4. 如果 nest 掛了 → 通知用戶 + 暫停該巢穴的蝦
```

---

## 🔗 與現有 V3 計劃的關係

### 不變的部分（V3-PLAN.md 繼續有效）

- ✅ BYO + Affiliate 商業模式
- ✅ 方案 ABCD（AI 動力來源）
- ✅ Zeabur 一鍵創蝦流程
- ✅ Sprint 20 AI CREDIT 經濟系統
- ✅ Sprint 21 安全與 Beta
- ✅ 全 Cloudflare 技術棧（D1 + Workers + Pages）

### 改變的部分

| 舊（Paperclip-inspired） | 新（Multica-inspired） |
|---|---|
| Company 隔離 | Farm（蝦場）隔離 |
| CEO / 組織架構 / 審批鏈 | PM 蝦 + 扁平團隊 |
| Issue 系統 | Task 系統（更輕量，蝦也能建任務）|
| 無 skill 系統 | Skills（可複用、可分享、可交易）|
| Agent 只是 worker | 蝦有 profile、有技能樹、有成長 |
| 單一 runtime | 多巢穴（同一蝦可遷移）|

### Sprint 19 Ticket 影響

| Ticket | 影響 | 動作 |
|--------|------|------|
| CAN-249 防爆框架 | 不變 | 照做 |
| CAN-250 Agent Registry Schema | **大改** | 用新的 lobsters + nests + skills schema |
| CAN-251 BYO 一鍵創蝦 | 小改 | 創蝦同時建 nest |
| CAN-252 Team API | **重設計** | 改為 Farm API + Task API + Skills API |
| CAN-253 Paperclip Bridge | **砍掉** | 不需要 bridge，調度原生在 CanFly |
| CAN-255 Dashboard | 小改 | 加 Skills 面板 + 巢穴狀態 |
| CAN-272 自動註冊蝦 | 不變 | 照做 |
| CAN-273 Chat Proxy | 不變 | 照做 |
| CAN-274 Telegram 串接 | 不變 | 照做 |

---

## 📡 API 設計概要

### Farm API
```
GET    /api/farms                    # 列出我的蝦場
POST   /api/farms                    # 建立蝦場
GET    /api/farms/:id                # 蝦場詳情
```

### Lobster API
```
GET    /api/farms/:id/lobsters       # 列出蝦場的蝦
POST   /api/farms/:id/lobsters       # 新增蝦
PATCH  /api/farms/:id/lobsters/:lid  # 更新蝦設定
DELETE /api/farms/:id/lobsters/:lid  # 移除蝦
```

### Nest API
```
GET    /api/farms/:id/nests          # 列出巢穴
POST   /api/farms/:id/nests          # 新增巢穴（含 Zeabur 部署）
PATCH  /api/farms/:id/nests/:nid     # 更新巢穴
GET    /api/farms/:id/nests/:nid/heartbeat  # 巢穴回報心跳
```

### Task API
```
GET    /api/farms/:id/tasks          # 列出任務（支援 filter by status, assignee）
POST   /api/farms/:id/tasks          # 建立任務（人或蝦都可以建）
PATCH  /api/farms/:id/tasks/:tid     # 更新任務狀態
POST   /api/farms/:id/tasks/:tid/comments  # 新增留言
POST   /api/farms/:id/tasks/:tid/claim     # 蝦認領任務
```

### Skills API
```
GET    /api/farms/:id/skills         # 蝦場私有技能
GET    /api/skills/community         # 社群技能市場
POST   /api/farms/:id/skills         # 新增技能
POST   /api/skills/:sid/fork         # 複製社群技能到自己蝦場
```

---

## 🎯 里程碑

| 階段 | 目標 | 時間 |
|------|------|------|
| **M1** | Schema + Farm/Lobster/Nest API | Sprint 19 |
| **M2** | Task 系統 + 看板 UI | Sprint 19-20 |
| **M3** | Skills 系統 v1（建立 + 蝦場內複用）| Sprint 20 |
| **M4** | Skills 社群市場 | Sprint 21+ |
| **M5** | 多巢穴調度（蝦遷移 + 負載平衡）| 未來 |

---

## 📝 決策記錄

### 2026-04-15
- **架構轉向**：從 Paperclip 概念自建 → Multica 四層抽象（Workspace/Agent/Runtime/Skills）
- **命名**：Workspace → 蝦場、Agent → 蝦、Runtime → 巢穴、Skills → 技能
- **Skills 系統確認為核心差異化功能**：蝦越用越強、社群分享飛輪、付費切點
- **砍 Paperclip Bridge**（CAN-253）：不再需要，調度原生在 CanFly
- **技術棧不變**：仍然全 Cloudflare（D1 + Workers + Pages）
- **Heartbeat 用 CF Cron Triggers**（不用 WebSocket，serverless 環境限制）
- **保留 Paperclip 的好概念**：預算管控（budget_ledger）、子任務、@mention 溝通
