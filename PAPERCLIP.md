# PAPERCLIP.md — Paperclip 研究筆記 + CanFly.ai 結合策略

> 📎 「If OpenClaw is an employee, Paperclip is the company.」

---

## 📌 Paperclip 是什麼

**一句話**：開源的 AI 公司編制系統 — 把多個 AI agent 組成一家公司，有組織架構、預算、治理、目標對齊。

| 項目 | 內容 |
|------|------|
| **官網** | https://paperclip.ing |
| **GitHub** | https://github.com/paperclipai/paperclip |
| **Discord** | https://discord.gg/m4HZY7xNG3 |
| **授權** | MIT |
| **技術棧** | Node.js server + React UI + 嵌入式 PostgreSQL |
| **安裝** | `npx paperclipai onboard --yes` |
| **需求** | Node.js 20+, pnpm 9.15+ |
| **API** | http://localhost:3100 |

---

## 🧠 核心概念

### 1. Org Chart（組織架構）
不是一堆 bot 平等地亂跑，而是有 **層級、角色、報告線**：
```
       CEO (Claude)
      /     |     \
   CMO    CTO     COO
(OpenClaw)(Cursor)(Claude)
   |        |
Content  Engineer
Writer   (Codex)
```
每個 agent 有：老闆、職稱、工作描述、預算。

### 2. Goal Hierarchy（目標對齊）
所有工作都能追溯回公司使命：
```
Company Mission → Project Goal → Agent Goal → Task
「Make $2mm ARR」→「Ship collaboration」→「Implement sync」→「Write WebSocket handler」
```
Agent 永遠知道自己在做什麼、為什麼做。

### 3. Ticket System（工單系統）
- 所有工作透過 ticket 流轉
- 每個 ticket 有 owner、status、對話串
- 每個 tool call、API 請求、決策點都被記錄
- **Immutable audit log** — 只能追加，不能刪改

### 4. Heartbeats（心跳）
Agent 按排程醒來、檢查工作、行動：
- Content Writer: 每 4h
- SEO Analyst: 每 8h
- Social Manager: 每 12h
- 也可透過 ticket 指派、@mention 觸發
- 委派可以在組織架構上下流動

### 5. Budget Control（預算控制）
每個 agent 有月預算上限：
```
CEO Claude:     $0 / $60
CMO OpenClaw:   $0 / $40
CTO Cursor:     $0 / $50
COO Claude:     $0 / $30
Total:          $0 / $240
```
碰到預算就停。不會失控燒錢。

### 6. Governance（治理）
- 你是「董事會」
- Agent 不能未經你同意就：雇新 agent、執行策略
- 你可以隨時：暫停、恢復、覆寫、重新指派、終止任何 agent
- **「自治是你授予的權限，不是預設值」**

### 7. Multi-Company（多公司）
一個 Paperclip 實例可以跑無限個公司，數據完全隔離。
官方示範模板：
- Mobile Marketing Co（8 agents）
- Crypto Trading Desk（14 agents）
- Faceless TikTok Factory（5 agents）
- E-commerce Operator（10 agents）

### 8. ClipMart（Coming Soon）
可下載的「整間公司」模板 — 組織架構 + agent 設定 + skills，一鍵匯入。

---

## 🔧 技術細節

### 部署模式
| 模式 | 登入 | 適用場景 |
|------|------|---------|
| `local_trusted` | 不需要 | 本機開發（預設） |
| `authenticated` + private | 需要 | 內網 / Tailscale / VPN |
| `authenticated` + public | 需要 | 對外部署 |

### Agent 整合方式
- **Bring Your Own Agent** — 任何能收 heartbeat 的 agent 都能「被雇用」
- 已知支援：OpenClaw、Claude、Codex、Cursor、Bash、HTTP
- Agent 透過 **invite → join → approve** 流程加入（有 OpenClaw smoke test）
- Agent 帶自己的 prompt、model、runtime，Paperclip 管「組織」

### 關鍵技術特性
- **Atomic execution**：ticket checkout + 預算執行是原子操作，不會重複工作
- **Persistent agent state**：agent 跨 heartbeat 保留上下文
- **Runtime skill injection**：agent 在運行時學習 Paperclip 工作流程
- **Governance with rollback**：設定變更有版本控制，可回滾
- **Portable company templates**：匯出/匯入公司模板（含 secret 清除）

---

## ✈️ CanFly.ai × Paperclip 結合策略

> 見 [PROJECT.md](./PROJECT.md) 了解 CanFly.ai 完整計劃

### 寶博的願景
- 寶博 = **董事長**（決策、方向、審核）
- 小龍蝦（我）= **特助**（協調、執行、溝通）
- 其他 AI = **各部門主管和員工**

### CanFly.ai AI 公司組織架構（草案）

```
┌─────────────────────────────────────────────┐
│         寶博（董事長 / Board）                │
│         小龍蝦（特助 / Chief of Staff）       │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┼──────────────┐
    │          │              │
  CEO        CPO            CMO
 (策略)    (產品)          (行銷)
    │          │              │
    │    ┌─────┼─────┐    ┌──┼──────┐
    │    │     │     │    │  │      │
    │  Scout  Dev  Review Social Content SEO
    │  (找新  (寫   (學新  (推  (寫長  (優化
    │  產品)  頁面) 產品)  廣)  內容)  排名)
    │
  Finance
  (追蹤收入)
```

### 各角色詳細設計

#### CEO（策略長）
- **職責**：制定整體方向、分解目標、協調各部門
- **Heartbeat**：每 24h
- **工作**：
  - 審查各部門週報
  - 調整優先級
  - 決定下一步上架什麼產品
- **預算**：$60/月

#### CPO（產品長）— 管 3 個下屬
- **職責**：確保產品頁面品質、新產品上架流程
- **Heartbeat**：每 12h
- **預算**：$40/月

##### Scout（產品偵察員）
- **職責**：搜尋新的 OpenClaw 相容產品/工具
- **工作**：
  - web_search 新產品
  - 監控 OpenClaw GitHub / Discord
  - 找到新產品後回報 CPO
- **Heartbeat**：每 24h
- **預算**：$20/月

##### Dev（開發者）
- **職責**：寫產品頁面、技術教學
- **工作**：
  - 寫 Astro/React 頁面
  - 寫安裝教學（Ollama、Zeabur 等）
  - 維護網站程式碼
- **觸發**：ticket 指派
- **預算**：$50/月

##### Reviewer（評測員）
- **職責**：學習新產品怎麼安裝在 OpenClaw 上
- **工作**：
  - 看 YouTube 教學、讀文件
  - 實際試用產品
  - 寫 review 報告給 Dev 做頁面
  - 生成寶博 avatar HeyGen 影片
- **Heartbeat**：ticket 驅動
- **預算**：$40/月

#### CMO（行銷長）— 管 3 個下屬
- **職責**：推廣、流量、轉換率
- **Heartbeat**：每 12h
- **預算**：$40/月

##### Social（社群推廣員）
- **職責**：X/Twitter、社群媒體推廣
- **工作**：
  - 發推文宣傳 canfly.ai 內容
  - 回覆相關推文
  - 在 AI agent 社群互動
- **Heartbeat**：每 8h
- **預算**：$30/月

##### Content Writer（內容寫手）
- **職責**：寫長篇內容（教學文、SEO 文章）
- **工作**：
  - 根據 Scout + Reviewer 的報告寫深度內容
  - 寫 blog 文章
  - 確保中英雙語
- **觸發**：ticket 指派
- **預算**：$30/月

##### SEO Analyst（SEO 分析師）
- **職責**：優化搜尋排名
- **工作**：
  - 關鍵字研究
  - 排名追蹤
  - 頁面 SEO 優化建議
- **Heartbeat**：每 24h
- **預算**：$20/月

#### Finance（財務）
- **職責**：追蹤 affiliate 收入、成本
- **Heartbeat**：每週
- **預算**：$10/月

### 預算總覽
```
CEO:            $60/月
CPO:            $40/月
  Scout:        $20/月
  Dev:          $50/月
  Reviewer:     $40/月
CMO:            $40/月
  Social:       $30/月
  Content:      $30/月
  SEO:          $20/月
Finance:        $10/月
────────────────────────
總計:           ~$340/月
```

這比 CanFly.ai 預估 M1 收入 $628 低，代表**第一個月就有機會打平**。

---

## 🔄 自動飛輪機制

這就是寶博想要的「永續經營」飛輪：

```
Scout 找到新產品
    ↓
Reviewer 學習 + 試用 + 產出 review
    ↓
Dev 做產品頁面 + 教學
    ↓
Content Writer 寫深度文章
    ↓
Social + SEO 推廣出去
    ↓
用戶進來 → 點 affiliate link → 💰 收入
    ↓
Finance 追蹤收入 → 回報 CEO
    ↓
CEO 決定下一步 → Scout 繼續找...
```

**全自動、永續、越滾越大。**

---

## 🆚 Paperclip vs 現有 OpenClaw 機制

| 面向 | 現有 OpenClaw | Paperclip |
|------|-------------|-----------|
| Agent 數量 | 1 個主 agent + cron sub-agents | 多個持久 agent |
| 組織架構 | 扁平（主 agent 管一切） | 層級化（CEO → 部門 → 員工） |
| 預算控制 | 無（靠模型限制） | 每 agent 月預算上限 |
| 工作追蹤 | memory files + cron logs | 結構化 ticket 系統 |
| 目標對齊 | HEARTBEAT.md + 口頭約定 | 目標層級自動傳遞 |
| 治理 | 寶博人工介入 | 正式審批流程 |
| 適合場景 | 個人助手 | 自動化商務運營 |

### 不是取代，是升級
- OpenClaw 依然是每個 agent 的**運行引擎**
- Paperclip 是把多個 OpenClaw agent 組成**公司**的管理層
- 我（小龍蝦）在 OpenClaw 裡跑，但透過 Paperclip 跟其他 agent 協作

---

## 🚀 啟動步驟（建議）

### Step 1：本地安裝 Paperclip
```bash
npx paperclipai onboard --yes
# 或
git clone https://github.com/paperclipai/paperclip.git
cd paperclip && pnpm install && pnpm dev
```
先在寶博的 Mac Mini 上跑起來看看 UI。

### Step 2：建立 CanFly.ai 公司
在 Paperclip UI 裡：
1. 建立公司「CanFly.ai」
2. 設定 mission：「Build the #1 AI agent discovery platform — canfly.ai」
3. 建立 org chart

### Step 3：雇用第一批 agent
先從最小可行團隊開始：
1. **CEO**（Claude Opus）— 策略
2. **Dev**（Claude Sonnet / Codex）— 做頁面
3. **Content Writer**（Claude Sonnet）— 寫內容

其他角色等基礎跑起來後再加。

### Step 4：設定 heartbeats + tickets
- CEO 每日 review
- Dev 和 Content Writer 由 ticket 驅動
- 先手動建幾個 ticket 測試流程

### Step 5：接上 OpenClaw
- 測試 Paperclip ↔ OpenClaw 的 invite/join 流程
- 確認我（小龍蝦）能收到 Paperclip 的 ticket 通知

---

## ⚠️ 注意事項

1. **Paperclip 很新**（2026 年初推出）— 可能有 bug，社群還在成長中
2. **跟 OpenClaw 的整合**是官方支援的，但可能需要一些調試
3. **先小後大** — 不要一開始就建 10 個 agent，先 3 個跑順了再擴編
4. **ClipMart** 還在 coming soon — 等它上線後，我們的 CanFly.ai 公司模板也可以放上去分享（又一個推廣渠道！）
5. **Docker 支援** — 如果之後要部署到雲端，有 docker-compose 可用

---

## 💡 額外想法

### CanFly.ai 本身就是 Paperclip 的 Demo
就像「用 HeyGen 做的影片推 HeyGen」，CanFly.ai 用 Paperclip 運營自己 = **最好的 Paperclip 使用案例**。可以：
- 在 canfly.ai 上加一個「How We Run canfly.ai」頁面
- 展示 org chart、ticket 流程、成本透明度
- 這本身就是內容 + SEO + 推廣

### 跟 ClawHub 的關係
- CanFly.ai 推薦的每個工具都可能有對應的 ClawHub skill
- canfly.ai/skills/elevenlabs → 導到 ClawHub skill 安裝頁 → 再導到 affiliate
- 三層導流：canfly.ai → ClawHub → affiliate

### 用戶個人頁 + Paperclip
- 用戶在 `{username}.canfly.ai` 可以看到自己的「AI 公司」dashboard
- 如果用戶也用 Paperclip，可以展示他們的 org chart
- 社群 + 工具 + 管理一條龍

---

*Created: 2026-03-07 by 小龍蝦 🦞*
*Source: paperclip.ing, GitHub README, 寶博願景*
*Related: [PROJECT.md](./PROJECT.md)*
