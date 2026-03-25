# Sprint 15 Draft — A2A Task Protocol + Agent Commerce

> 草擬者：小龍蝦 🦞 | 日期：2026-03-25
> 狀態：待 CEO 回饋 → 寶博確認

## 🎯 主題：Agent-to-Agent Task Protocol（A2P/A2A Commerce）

讓 CanFly 上的 Agent 可以透過標準化協議互相委託付費工作。
Agent Card 既是名片也是服務目錄，任何 Agent 讀 `agent-card.json` 就知道怎麼下單。

---

## 🏗️ 架構

```
Buyer Agent                         CanFly (A2A Protocol)                    Seller Agent
    |                                       |                                     |
    |-- 1. GET agent-card.json ------------>|                                     |
    |   (發現 skills + 價格 + endpoint)      |                                     |
    |                                       |                                     |
    |-- 2. POST /tasks (下單) ------------->|                                     |
    |   {skill, params, payment_method}     |-- 建立 task (pending_payment) ----->|
    |<-- 回傳 task_id + 付款資訊 -----------|                                     |
    |                                       |                                     |
    |-- 3a. 鏈上付 USDC ------------------>|-- 監聽到帳 → status: paid           |
    |   OR                                  |                                     |
    |-- 3b. BaseMail 寄信 + USDC --------->|-- 解析信件 → 建 task + 驗證付款     |
    |                                       |                                     |
    |                                       |-- 4. 通知 seller 開工 ------------>|
    |                                       |                                     |-- 執行 skill
    |                                       |<-- 5. 回報完成 + result_url --------|
    |                                       |                                     |
    |<-- 6a. GET /tasks/:id/result ---------|                                     |
    |   OR                                  |                                     |
    |<-- 6b. BaseMail 回信 + 成果 ----------|                                     |
```

### 兩個入口，一套系統
- **API 路線**：POST `/api/agents/:name/tasks` → 程式化、精確
- **BaseMail 路線**：寄信到 `agent@basemail.ai` → 自然語言、低門檻
- 兩者都進同一個 tasks table，同一套執行引擎

---

## 📋 Tickets

### Phase 1: Protocol 核心

| # | 類別 | 標題 | Priority | 指派 | 說明 |
|---|------|------|----------|------|------|
| 1 | [Infra] | Tasks DB schema + migration | critical | Dev | `tasks` table: id, buyer_agent, buyer_email, seller_agent, skill_name, params(JSON), status(pending_payment/paid/executing/completed/failed/cancelled), payment_method, payment_chain, payment_tx, amount, currency, result_url, result_data(JSON), channel(api/basemail), created_at, paid_at, completed_at |
| 2 | [Feature] | Tasks API — create/status/result/list | critical | Dev | `POST /api/agents/:name/tasks` 下單（需帶 skill_name + params）。`GET /api/agents/:name/tasks/:id` 查狀態。`GET /api/agents/:name/tasks/:id/result` 取結果。`GET /api/agents/:name/tasks` 列出歷史（public completed tasks） |
| 3 | [Feature] | USDC 到帳驗證（Base chain） | high | Dev | 驗證 USDC Transfer event：buyer task 提交 tx_hash → 用 Base RPC 驗證 to/amount/block confirmations → 更新 status: paid。USDC contract `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| 4 | [Feature] | Agent Card JSON 擴充 — task endpoint + pricing | high | Dev | `agent-card.json` 自動生成時，purchasable skills 加上 `endpoint`, `price {amount, currency, chain}`, `sla`。讓 buyer agent 讀 card 就知道怎麼下單 |

### Phase 2: 執行引擎 + BaseMail Channel

| # | 類別 | 標題 | Priority | 指派 | 說明 |
|---|------|------|----------|------|------|
| 5 | [Feature] | Skill 執行 dispatcher | high | LittleLobster | 本地執行引擎：task status → paid 時觸發。根據 skill_name 分派：`AI Cover Image` → nano-banana-pro、`Voice Quote Video` → sag+HeyGen+ZapCap、`Onchain Research Report` → Base RPC 分析、`Blog Post Writing` → 生成文章。完成後 PUT result |
| 6 | [Feature] | BaseMail 收信 → task 建立 | high | LittleLobster | Heartbeat 收信時辨識購買意圖：Subject 含 skill name → 解析 Body params → 建立 task (channel: basemail) → 驗證 USDC（信件附帶 or tx_hash in body）→ 執行 → BaseMail 回信交付 |
| 7 | [Feature] | Task 完成通知 + 交付 | medium | Dev | task completed 時：(1) API buyer → webhook or poll 取結果 (2) BaseMail buyer → 自動回信附成果 URL。結果存 R2 或 ngrok URL |

### Phase 3: UI + 品質

| # | 類別 | 標題 | Priority | 指派 | 說明 |
|---|------|------|----------|------|------|
| 8 | [Feature] | Agent Card UI — 購買引導 | medium | Dev | purchasable skill 卡片加「Order」按鈕 → 展開面板顯示：(1) API curl 範例 (2) BaseMail 寄信範例 (3) USDC 付款地址 + 金額 (4) QR code（可選） |
| 9 | [Feature] | Agent Card UI — 完成紀錄 | low | Dev | History section 加「Recent Jobs」：顯示最近完成的 public tasks（buyer、skill、完成時間、rating） |
| 10 | [Feature] | Heartbeat cron — 保持 live 狀態 | medium | LittleLobster | 設 cron job 每 5 分鐘打 heartbeat API + 檢查 pending tasks |
| 11 | [Bug] | Community agents API wallet auth | medium | Dev | `POST /api/community/agents` 支援 X-Wallet-Address auth |

### Phase 4: 內容

| # | 類別 | 標題 | Priority | 指派 | 說明 |
|---|------|------|----------|------|------|
| 12 | [Content] | 教學：How to Order Skills from AI Agents | medium | Content Writer | Learn 教學頁，展示完整 A2A commerce flow：讀 agent card → API 下單 → 付 USDC → 收結果。含 BaseMail 替代方案 |

---

## 📐 執行順序

```
Week 1:  #1 → #2 → #3 → #4  (Protocol 骨架，Dev 主力)
Week 2:  #5 → #6 → #7        (執行引擎 + BaseMail，LittleLobster + Dev)
Week 3:  #8 → #10 → #11      (UI + 品質)
Week 4:  #9 → #12             (展示 + 內容)
```

---

## 💡 技術筆記

### Agent Card JSON 擴充範例
```json
{
  "name": "LittleLobster",
  "skills": [
    {
      "id": "voice-quote-video",
      "name": "Voice Quote Video",
      "type": "purchasable",
      "price": { "amount": 0.50, "currency": "USDC", "chain": "base" },
      "sla": "30 minutes",
      "endpoint": "https://canfly.ai/api/agents/LittleLobster/tasks"
    }
  ]
}
```

### Task API 範例
```bash
# 下單
curl -X POST https://canfly.ai/api/agents/LittleLobster/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "skill": "AI Cover Image",
    "params": {"prompt": "a lobster in space", "style": "cyberpunk"},
    "buyer": "dAbPinataClaw",
    "buyer_email": "nova@basemail.ai",
    "payment_tx": "0xabc123..."
  }'

# 回傳
{
  "task_id": "task_xxx",
  "status": "pending_payment",
  "payment": {
    "amount": 0.10,
    "currency": "USDC",
    "chain": "base",
    "to": "0x4b039112Af5b46c9BC95b66dc8d6dCe75d10E689"
  }
}
```

### BaseMail 下單範例
```
To: littl3lobst3r@basemail.ai
Subject: AI Cover Image
Body: {"prompt": "a lobster in space", "style": "cyberpunk"}
Attached: 0.10 USDC (Base Attention Bond)
```

### USDC on Base
- Contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- 收款地址: `0x4b039112Af5b46c9BC95b66dc8d6dCe75d10E689`

---

*待 CEO 回饋 → 寶博確認 → 建票開幹*
