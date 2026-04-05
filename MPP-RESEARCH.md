# MPP (Machine Payments Protocol) 研究報告

**研究日期**：2026-04-05
**研究者**：小龍蝦 🦞
**來源**：
- https://tempo.xyz/blog/mainnet
- https://tempo.xyz/blog/mpp-sessions
- https://mpp.dev/overview
- https://mpp.dev/quickstart/agent
- https://mpp.dev/protocol/http-402
- https://mpp.dev/services
- https://paymentauth.org/

---

## 一、概述

MPP（Machine Payments Protocol）是由 **Stripe** 和 **Tempo Labs** 共同制定的開放協議，目標是成為 AI Agent 之間付款的 HTTP 標準。已提交 IETF 標準化（paymentauth.org）。

**Tempo** 是專為支付設計的區塊鏈（非通用鏈），具備 sub-second finality、可預測低手續費、高吞吐量。2026 年 4 月 mainnet 上線。

**一句話總結**：MPP 讓 AI Agent 像瀏覽網頁一樣自然地付款 — 不需要 API key、不需要註冊帳號、不需要 billing dashboard。

---

## 二、核心架構（三層）

### Layer 1: Tempo 鏈（結算層）
- 支付專用區塊鏈，非通用智能合約平台
- Sub-second finality（即時結算）
- 可預測低手續費（不會因網路擁塞飆升）
- 穩定幣原生（PathUSD / USDC.e）
- 合作夥伴：Anthropic、OpenAI、Visa、Mastercard、Stripe、Shopify、Revolut、Nubank、Standard Chartered、DoorDash、Ramp

### Layer 2: MPP 協議（標準層）
- 建立在 HTTP 402 (Payment Required) 之上的開放標準
- **Rail-agnostic**：不綁定特定支付方式
- 已支援的 payment methods：
  - **Tempo**（穩定幣，charge + session）
  - **Stripe**（信用卡）
  - **Visa**（卡片支付）
  - **Lightning Network**（BTC，charge + session）
  - **Solana**（charge）
  - **Stellar**（charge）
- 兩種 intent：
  - **Charge**：一次性付款（如單次 API call）
  - **Session**：串流計費（如 LLM token streaming）

### Layer 3: 服務目錄（應用層）
- 100+ 服務已接入
- `llms.txt` 供 agent 自動發現可付費服務
- `GET https://mpp.dev/api/services` 回傳完整 JSON 目錄

---

## 三、付款流程

### 基本流程（Charge）
```
Agent  → GET /resource
Server → 402 Payment Required
         WWW-Authenticate: Payment id="abc123",
           realm="example.com",
           method="tempo",
           intent="charge",
           request="eyJ..."
Agent  → 付款（鏈上交易）
Agent  → GET /resource
         Authorization: Payment credential="eyJ..."
Server → 200 OK
         Payment-Receipt: receipt="eyJ..."
```

### Session 模式（串流計費，最重要的創新）
```
1. 開 session（1 筆鏈上 tx）→ deposit 資金到 escrow
2. 每消費一單位 → agent 簽一個 offchain voucher（累計金額）
   - voucher 驗證只需微秒（密碼學簽名驗證）
   - 每個新 voucher 取代前一個
3. 關 session（1 筆鏈上 tx）→ server 提交最後一個 voucher 結算
   - 未使用的 deposit 退還 agent
```

**關鍵數字**：不管中間交換了 10 還是 100,000 個 voucher，永遠只有 **2 筆鏈上交易**。

**類比**：像加油站預授權 — 先刷卡授權，加多少油都行，最後結帳一次。

### HTTP 402 規範重點
- 402 用於所有付款相關 challenge（包括付款憑證驗證失敗）
- 認證順序：先 401（身份驗證）→ 再 402（付款）
- 錯誤類型：invalid-challenge、malformed-credential、payment-insufficient、verification-failed 等
- 支援 Problem Details (RFC 9457) 格式的錯誤回應

---

## 四、IETF 規範文件

MPP 已提交 IETF 標準化，規範文件在 https://paymentauth.org/：

| 規範 | 說明 |
|------|------|
| `draft-httpauth-payment-00` | 核心："Payment" HTTP Authentication Scheme |
| `draft-payment-intent-charge-00` | Charge intent 規範 |
| `draft-payment-discovery-00` | 服務發現規範 |
| `draft-payment-transport-mcp-00` | JSON-RPC & MCP Transport（MCP 整合！）|
| `draft-tempo-charge-00` | Tempo charge 實作 |
| `draft-tempo-session-00` | Tempo session 實作 |
| `draft-card-charge-00` | 信用卡 charge 實作（Visa/Stripe）|
| `draft-lightning-charge-00` | Lightning Network charge 實作 |
| `draft-lightning-session-00` | Lightning Network session 實作 |
| `draft-solana-charge-00` | Solana charge 實作 |
| `draft-stellar-charge-00` | Stellar charge 實作 |
| `draft-stripe-charge-00` | Stripe charge 實作 |

**值得注意**：有 MCP Transport 規範（`draft-payment-transport-mcp-00`），代表 MPP 設計時就考慮了跟 Model Context Protocol 的整合。

---

## 五、服務目錄完整清單（截至 2026-04-05）

### 🤖 AI / LLM
| 服務 | 整合方式 | 計費模式 | 說明 |
|------|---------|---------|------|
| **Anthropic** (Claude) | third-party proxy | session | Sonnet, Opus, Haiku，按 token |
| **Google Gemini** | third-party proxy | session | 文字 + Veo 影片 + Nano Banana 圖片 |
| **OpenAI** | third-party proxy | session | GPT 系列，按 token |
| **fal.ai** | third-party proxy | charge | 600+ model（Flux, SD, Recraft, Grok）|

### 🔍 搜尋 / Web
| 服務 | 整合方式 | 計費模式 | 價格 |
|------|---------|---------|------|
| **Exa** | third-party proxy | charge | $0.005/search |
| **Browserbase** | first-party | charge | $0.12/hr（無頭瀏覽器）|
| **Firecrawl** | third-party proxy | charge | 動態（爬蟲/結構化提取）|
| **Parallel** | first-party | session | 動態（web search）|
| **Tavily** | — | charge | 搜尋 |
| **Perplexity Sonar** | — | session | AI 搜尋 |

### ⛓️ 區塊鏈 / 鏈上數據
| 服務 | 整合方式 | 計費模式 | 價格 |
|------|---------|---------|------|
| **Dune** | first-party | session | $0.05-$10/query |
| **Allium** | first-party | charge | $0.02-$0.03/request |
| **Codex** | first-party | charge | $0.001/GraphQL query |
| **Nansen** | first-party | charge | 動態（smart money 分析）|

### 🏗️ 基礎設施
| 服務 | 整合方式 | 計費模式 | 價格 |
|------|---------|---------|------|
| **AgentMail** | first-party | charge | inbox $2，發信 $0.01 |
| **Doma** | first-party | charge | 域名註冊，依 TLD |
| **Build With Locus** | first-party | charge | 容器+PG+Redis，動態 |
| **Modal** | third-party proxy | charge | GPU 運算，動態 |
| **Smithery** | first-party | charge | MCP server hosting |
| **Resend** | — | charge | Email API |

### 整合方式說明
- **first-party**：服務方直接實作 MPP server，agent 直連
- **third-party proxy**：透過 Tempo proxy（`*.mpp.tempo.xyz`），Tempo 代理付款

---

## 六、開發者體驗

### Agent 端（消費者）
```bash
# 安裝 Tempo CLI
curl -L https://tempo.xyz/install | bash

# 登入（建立 passkey 錢包）
tempo wallet login

# 付費請求（自動處理 402 + 付款）
tempo request https://openai.mpp.tempo.xyz/v1/chat/completions \
  -X POST --json '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello"}]}'

# 預覽費用（不付款）
tempo request --dry-run https://openai.mpp.tempo.xyz/v1/chat/completions
```

### SDK
- **TypeScript SDK**：`@anthropic-ai/sdk`（已內建 MPP 支援？待確認）
- **mppx CLI**：輕量級 MPP client，開發調試用
  ```bash
  mppx account create
  mppx https://mpp.dev/api/ping/paid
  ```

### 服務端（提供者）
- 實作 402 response + payment verification
- 註冊到 MPP 服務目錄
- 詳見 https://mpp.dev/quickstart/server

---

## 七、競品比較

| | **MPP** | **Virtuals ACP** | **CanFly A2A** | **Stripe Connect** |
|---|---|---|---|---|
| **定位** | 通用 agent 付款協議 | Agent 任務市場 | 垂直服務市場 | 人類付款平台 |
| **付款方式** | 穩定幣/卡/BTC/多鏈 | VIRTUAL token (Base) | USDC escrow (Base) | 信用卡/銀行 |
| **發現機制** | HTTP 402 + llms.txt | Agent 瀏覽器 | CanFly 平台 | 手動整合 |
| **計費模式** | charge + session | 按任務 | 按任務/月費 | 按交易 |
| **標準化** | IETF draft ✅ | 自有 | 自有 | 產業標準 |
| **鏈** | Tempo（自有鏈）| Base | Base | 無（傳統金融）|
| **門檻** | 有錢包即可 | 需註冊 agent | 需 CanFly 帳號 | 需 KYC |
| **適合** | 通用 M2M 支付 | AI agent 經濟 | 龍蝦/AI agent 服務 | 人類電商 |

---

## 八、對 CanFly 的策略啟發

### 🟢 立即可借鏡

**1. HTTP 402 作為付費 API 標準**
- CanFly Agent API 可以用 402 讓 agent 自動知道「這個 endpoint 要付錢」
- 比自訂 error code 更 universal，符合 IETF 標準

**2. llms.txt 服務發現**
- 我們已有 AIEO 概念，MPP 的 `llms.txt` 是現成範本
- CanFly 可提供 `canfly.ai/llms.txt` 讓 agent 自動發現服務
- 結構化 JSON endpoint：`canfly.ai/api/services`

**3. Session voucher 模式 → V3 租蝦計費**
- deposit → offchain voucher 記帳 → 月結結算
- 省 gas 又即時，完美適合按用量計費

### 🟡 中期考慮

**4. CanFly 接入 MPP 生態**
- 把 CanFly 服務（租蝦、AI 代管、圖片生成等）註冊為 MPP service
- 全球 agent 可透過 `tempo request` 直接購買 CanFly 服務
- 等於免費獲得 Stripe + Anthropic + OpenAI 的 agent 用戶群

**5. MPP 作為 A2A Task Protocol 付款層**
- 我們不用自己造付款輪子
- A2A Task 的 escrow 可用 MPP Session 實現
- 但需要 Tempo 鏈上的穩定幣（目前我們在 Base 上）

**6. BaseMail vs AgentMail**
- AgentMail 已在 MPP 上（建 inbox $2，發信 $0.01）
- BaseMail 差異化：onchain identity (Basename) + 錢包綁定
- 考慮：BaseMail 也接入 MPP？或保持 Base 生態定位？

### 🔴 風險 / 取捨

**7. Tempo 是自有鏈，不在 Base/Ethereum 上**
- 我們的資產和身份都在 Base
- 接入 MPP 意味著需要橋接到 Tempo 鏈
- 但 MPP 是 rail-agnostic 的，理論上可以實作 Base 上的 MPP payment method

**8. Stripe 背書 ≠ 一定贏**
- 優勢：傳統金融 + 加密貨幣的正式橋梁
- 風險：Tempo 鏈採用率未知、與 Base/Solana 等既有生態的競爭
- 觀察指標：服務目錄成長速度、agent 實際使用量

**9. MCP Transport 規範**
- MPP 有 MCP transport 規範（`draft-payment-transport-mcp-00`）
- 這意味著 MCP server 可以直接收費
- CanFly 的蝦如果提供 MCP server，可以透過 MPP 收費

---

## 九、行動建議

### 短期（Sprint 19-21）
- [ ] 不改架構，維持現有 Base 上的 USDC escrow
- [ ] 在 V3 設計文件中預留 MPP 兼容的 interface
- [ ] `canfly.ai/llms.txt` 先做出來（即使不接 MPP，服務發現也有用）

### 中期（V3.1+）
- [ ] 評估 CanFly 服務接入 MPP 的 ROI
- [ ] 實驗 MPP Session 模式用於租蝦按用量計費
- [ ] 研究 Base 上實作 MPP payment method 的可能性

### 長期
- [ ] BaseMail 是否接入 MPP（vs AgentMail 的競爭策略）
- [ ] CanFly 作為 MPP service provider 的商業模式
- [ ] 觀察 MPP 標準化進度和市場採用率

---

## 十、參考連結

- **MPP 官網**: https://mpp.dev
- **Tempo 官網**: https://tempo.xyz
- **IETF 規範**: https://paymentauth.org
- **服務目錄 API**: https://mpp.dev/api/services
- **llms.txt**: https://mpp.dev/services/llms.txt
- **Tempo 文件**: https://docs.tempo.xyz
- **Tempo Wallet**: https://wallet.tempo.xyz
