# Base Agent CLI — 可行性研究

> 日期：2026-04-23
> 觸發：Pinata 2026-04-22 發布 Polygon Agent CLI
> 目標：評估 CanFly 做一個 **Base Agent CLI** 作為 Pinata marketplace template 的可行性
> 狀態：**研究階段，不實作**

---

## 🎯 結論先講

**完全可行，而且時機對。** 原因：

1. **地基已經存在**：Coinbase 官方已開源 **AgentKit**（`github.com/coinbase/agentkit`），就是 Base 生態版本的「給 agent 錢包與鏈上能力」工具包。**我們不用從零寫，只需要把 AgentKit 包成 OpenClaw skill + Pinata template**。
2. **生態對齊**：寶博、小龍蝦、BaseMail、Basemail_ai、Basename 全部已經在 Base 紮根。**Polygon 對我們是外生，Base 是自然延伸**。
3. **Pinata 策略空窗**：Pinata 現有 template（Alchemy、ampersend、Tempo、Polygon）都**沒有 Base 專屬**。這是空窗，CanFly 可以搶位。
4. **政治/品牌訊號**：Base = Coinbase，對 AI agent 的態度正面且持續投資。CanFly 做 Base Agent CLI = 站在正確的趨勢一邊。

---

## 📦 Coinbase AgentKit 現況

### 已有功能（直接可用）
來源：<https://github.com/coinbase/agentkit>

- **框架不綁死**：可配任何 AI framework（LangChain、Vercel AI SDK、MCP、OpenAI Agents SDK、Pydantic AI…）
- **錢包不綁死**：支援 CDP、Privy、viem、Smart Wallet
- **TypeScript + Python 雙版本**monorepo
- **50+ 個 actions**（TS 版）/ 30+ 個 actions（Python 版）已內建
- 開箱即得：
  - Wallet creation / funding（含 testnet faucet）
  - 交易發送（ETH + ERC-20 stablecoins，USDC 原生支援）
  - Smart Wallet（Coinbase 的 ERC-4337 帳戶抽象）
  - **Fee-free stablecoin payments**（官方賣點）
  - 與 Farcaster、XMTP 這些 Base 生態工具整合
  - X402 支付（2026-02 Coinbase 同步推出的 HTTP 付款協定）

### 支援的 Base-native 能力（對 CanFly 有價值的）

| 能力 | 對 CanFly 意義 |
|------|---------------|
| Basename 整合 | 蝦自動取得 `<name>.base.eth` 身份 |
| USDC 原生支付 | CanFly AI CREDIT 可走鏈上（Sprint 20 方向延伸） |
| Smart Wallet | 蝦有 recoverable wallet（比 EOA 安全） |
| Farcaster Skill | 蝦可以 post 到 Farcaster（AI agent 社群） |
| XMTP Skill | agent-to-agent 加密訊息（跟 BaseMail 競合也互補） |
| X402 | HTTP-native micropayments（可做 CanFly skill marketplace 底層） |

---

## 🆚 Base Agent CLI vs Polygon Agent CLI 對比

| 維度 | Polygon Agent CLI (Pinata 2026-04-22) | Base Agent CLI (提案) |
|------|---------------------------------------|---------------------|
| 生態背景 | Matic / Polygon PoS | Coinbase / Base L2 |
| 官方 SDK | 整合 Polygon 自家 | **Coinbase AgentKit**（開源成熟） |
| 穩定幣原生支付 | 看 polygon 架構 | **USDC 原生免手續費**（Base 優勢） |
| Agent 生態成熟度 | 較新 | **很成熟**（Farcaster、XMTP、Basenames、BaseMail…） |
| 跟 CanFly / 寶博生態 | 0 | **100%**（已在 Base 紮根）|
| 身份標準 | 自定 | ENS / Basenames（L2 first-class） |
| 對 AI agent 戰略投入 | 近期開始 | **長期、持續、公開**（Coinbase 重點） |
| 台灣市場接受度 | 較少 | **較高**（Coinbase 上市、Base 生態熟） |

**結論**：Base 在每一項都更強或至少平手。

---

## 🏗️ 提議的 Base Agent CLI Template 架構

### 層次堆疊

```
┌─────────────────────────────────────────────────┐
│ OpenClaw Agent (Pinata container / CanFly nest) │
└───────────────────────┬─────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │ Base Agent CLI     │  ← 我們新包的
              │  Skill / Template  │
              └─────────┬──────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
  ┌──────────┐  ┌──────────────┐  ┌───────────┐
  │ AgentKit │  │ Basename SDK │  │ X402 SDK  │
  │(Coinbase)│  │              │  │ (Coinbase)│
  └────┬─────┘  └──────┬───────┘  └─────┬─────┘
       │               │                │
       └───────────────┼────────────────┘
                       ▼
              ┌────────────────┐
              │  Base L2       │
              │  (Mainnet /    │
              │   Sepolia)     │
              └────────────────┘
```

### OpenClaw Skill 包裝方式

1. 做成 **ClawHub-publishable skill**（slug `@canfly/base-agent`）
2. Skill 包含：
   - AgentKit runtime（Node.js 版）
   - Basename register / lookup helper
   - CanFly-specific wallet 設定（預設 Coinbase Smart Wallet）
   - X402 micro-payment helper
   - **SKILL.md 教蝦怎麼用**（自然語言指令 → AgentKit action）
3. 做成 **Pinata marketplace template**：
   - 預設 attach 此 skill
   - 預設 prompt personality：「你是一隻 Base 原生 agent，會管理自己的錢包與身份」
   - 預設附帶 example workflow（註冊 Basename、收 USDC、回報）

---

## 💰 商業模式三條路

### 路徑 A：純推廣（零收入但有品牌效益）
- 免費發布 template
- 當作 CanFly 對 OpenClaw / Base / Pinata 三方生態的貢獻
- 讓 Pinata 用戶認識 CanFly → 漏斗 Layer 2

### 路徑 B：Coinbase 合作（若談成）
- 跟 Coinbase Developer Platform 申請 partnership
- CanFly 幫他們做 OpenClaw 生態代表作
- 可能的回報：Coinbase 官方推廣、X 社群曝光、Base 生態撥款（Base grants）

### 路徑 C：CanFly 加值服務（主流）
- Template 本身免費
- 但附加「CanFly 代管 Smart Wallet + 預算管理 + 蝦之間的 USDC 結算」作為 CanFly Premium 功能
- 與 CanFly AI CREDIT（Sprint 20）整合：CanFly 點數 ↔ USDC 互換

**推薦**：A + C 並行。B 在 Phase C 有具體 demo 後再談。

---

## ⚠️ 風險與未知

| 風險 | 評估 | 緩解 |
|------|-----|------|
| AgentKit 升級快，skill 要持續維護 | 中 | 固定版本 + 季度 update cron |
| Coinbase CDP API Key 要用戶自己申請 | 低 | 文件教學；未來可走 Coinbase OAuth |
| Pinata marketplace 是否收 CanFly 做的 template | 中 | 同時做 Partnership 談判（見 V4-PLAN Partnership 章節） |
| 用戶蝦拿到錢包等於拿到真錢 | 高 | 預設 testnet-only，要升級到 mainnet 需明確授權 + spending cap |
| 中國用戶使用 Coinbase / Base 的法規問題 | 低 | CanFly 預設台灣 + 國際市場 |

---

## 🗺️ Phase C 里程碑（預估，不啟動）

假設 Phase A/B 都順利走完，Phase C 可能的節奏：

1. **Spike**（3-5 天）— 裝 AgentKit、跑 example、確認 Base Sepolia 測試鏈工作流程
2. **OpenClaw skill 原型**（1 週）— 包成 `@canfly/base-agent` skill
3. **Pinata template 版本**（3-5 天）— 寫 manifest.json、personality、example workflow
4. **發布到 marketplace**（需 Pinata 合作談妥或用自家機制）
5. **社群推廣**（Farcaster + X + 立委身份）

**全部估工**：2-3 週純 coding，但要等前置條件滿足（V3 穩定 + Pinata 整合做完）。

---

## 📎 相關資源

- Coinbase AgentKit GitHub: <https://github.com/coinbase/agentkit>
- AgentKit 文件: <https://docs.cdp.coinbase.com/agent-kit/welcome>
- Agentic Wallets 發布文（2026-02-10）: <https://www.coinbase.com/developer-platform/discover/launches/agentic-wallets>
- Basename: <https://www.base.org/names>
- Polygon Agent CLI（比較對象）: <https://pinata.cloud/blog/announcing-the-polygon-agent-cli/>
- V4-PLAN.md — CanFly 四層漏斗策略
- PINATA-API-CAPABILITIES.md — Pinata 整合 API 研究

---

## 🦞 小龍蝦結論

**這不是可不可行的問題，是「我們什麼時候動手」的問題。**

Coinbase AgentKit 已經把 90% 的工作做完了。CanFly 只需要：
1. 包裝成 OpenClaw 可辨識的 skill 格式
2. 標定 CanFly 品牌（預設配置、示範 workflow）
3. 發布到兩處（ClawHub + Pinata marketplace）

**但不要現在做**。等順序：
- 先把 V3 核心（Zeabur BYO + Paperclip Bridge）穩定
- 再做 V4 Phase A（Pinata 整合 + OpenRouter 免費漏斗）
- 然後 V4 Phase B（反向推 CanFly template 到 Pinata）
- 最後才是 Phase C（Base Agent CLI template）

**時機選擇**：如果 Coinbase 或 Base 生態有明確 grant 計畫，可以提前插隊。
