# CanFly v4 — 零門檻免費蝦 + 多層漏斗策略

> 最後更新：2026-04-19 | 維護者：小龍蝦 🦞
> 承接 V3.1 租蝦市場，下一階段主推 **零門檻免費養蝦**

---

## 🎯 核心策略

**「讓第一隻蝦完全免費、零安裝、零信用卡。」**

V3 解決了「付費用戶怎麼養蝦」的問題（Zeabur BYO）。
V4 要解決 **「一個完全沒接觸過 AI agent 的新用戶，怎麼在 30 秒內擁有自己的第一隻蝦」**。

這個 onboarding 漏斗如果做好，是 CanFly 最大的 top-of-funnel 差異化。
市面上目前沒有任何一家做到「$0、不裝軟體、不要信用卡」的完整 AI agent 體驗。

---

## 🔥 突破性發現（2026-04-19 寶博 insight）

### 發現 1：Pinata Agents = hosted OpenClaw

[Pinata 官方文件原文](https://docs.pinata.cloud/agents/overview)：
> "Pinata Agents are hosted **OpenClaw** instances"

Pinata 把 OpenClaw 包成 SaaS 賣，跟 CanFly 是**同源技術、互補定位**：

| 面向 | Pinata | CanFly |
|------|--------|--------|
| 核心 | 單蝦託管 + 漂亮 UX | 多蝦編排 + Multica 四層抽象 |
| FREE | 1 隻、2hr/月 | — |
| 付費 | PICNIC $20（1 隻無限）、FIESTA（最多 3）| Zeabur 🦐 $12 / 🦞 $24 |
| 優勢 | IPFS 整合、Templates 生態、channels 託管 | 多蝦、Skills 共享、affiliate 飛輪 |
| 能否整合 | ✅ 完整 CLI/API + JSONL streaming chat + git clone | — |

**結論**：Pinata 不是競爭對手，是天然的「免費漏斗入口」。

### 發現 2：OpenRouter FREE 已經有 28 個免費模型

2026/04 實際盤點：

- **不需要信用卡**
- 限額：20 req/分鐘、200 req/天（per model）
- 精選：GPT-OSS 120B、Qwen3 Coder 480B、Nemotron 3 Super 120B、Gemma 4 26B/31B、GLM 4.5 Air、Llama 3.3 70B、Hermes-3 405B…
- 涵蓋 Tools / Vision / Reasoning / Coding 全部主流能力
- 隱私：預設不走會訓練的 provider，但部分會 log prompts

### 發現 3：Pinata 原生支援 OpenRouter

Pinata Secrets Vault 四個 first-class AI provider：Anthropic / OpenAI / **OpenRouter** / Venice。
→ **不用自己包 API gateway，兩個服務原生打通**。

### 黃金組合

```
Pinata FREE 容器（2hr/月）
  +
OpenRouter FREE AI（28 model, 200 req/day）
  =
完全 $0、零安裝、零信用卡的「真正的第一隻蝦」
```

---

## 🔽 CanFly 四層漏斗（V4 終極版）

```
┌─────────────────────────────────────────────────────────┐
│  🆓 Layer 0 — 零門檻免費蝦（V4 主打）                    │
├─────────────────────────────────────────────────────────┤
│  巢穴：Pinata FREE（2hr runtime/月）                     │
│  AI：  OpenRouter FREE（28 models, 200 req/day）         │
│  成本：$0，不要信用卡                                      │
│  代價：runtime 有限 + 部分 provider 會 log prompts        │
│                                                           │
│  漏斗角色：top-of-funnel。吸引完全沒接觸過 agent 的新手。  │
└─────────────────────────────────────────────────────────┘
        ↓（runtime 用完 / 想多蝦 / 想長時跑）
┌─────────────────────────────────────────────────────────┐
│  💰 Layer 1 — 升級路徑（V3 已有 + V4 延伸）               │
├─────────────────────────────────────────────────────────┤
│  A. Pinata PICNIC $20/mo    — 1 隻蝦無限 runtime          │
│  B. CanFly Zeabur 🦐 $12/mo — 輕量蝦、自己的雲            │
│  C. CanFly Zeabur 🦞 $24/mo — 一般蝦、預裝 Ollama         │
│                                                           │
│  漏斗角色：轉換點。CanFly 主收入 + Pinata affiliate。    │
└─────────────────────────────────────────────────────────┘
        ↓（多蝦需求 / 進階用戶）
┌─────────────────────────────────────────────────────────┐
│  🏪 Layer 2 — 多蝦編排（CanFly 核心差異化）               │
├─────────────────────────────────────────────────────────┤
│  Multica 四層抽象：蝦場 → 蝦 → 巢穴 → 技能                │
│  PM 蝦自動分派、跨蝦協作、Skills 共享                      │
│  AI CREDIT 經濟（Sprint 20）                              │
│                                                           │
│  漏斗角色：護城河。Pinata 只支援 1-3 隻，CanFly 才編排。  │
└─────────────────────────────────────────────────────────┘
        ↓（隱私敏感用戶：立委/律師/記者）
┌─────────────────────────────────────────────────────────┐
│  🔐 Layer 3 — 隱私優先                                    │
├─────────────────────────────────────────────────────────┤
│  Ollama 本機（完全離線，要裝）                             │
│  BYO Anthropic / OpenAI Key（可控）                      │
│  Venice Pro $18/mo（未來可選，針對高隱私需求）            │
│                                                           │
│  漏斗角色：niche 市場。高 ARPU，低量，但品牌加分。       │
└─────────────────────────────────────────────────────────┘
```

---

## 🔒 隱私等級規範（UI 必標示）

**不能偷懶省略。** 任何選擇 AI provider 的地方都要清楚顯示：

| 等級 | Provider | 說明 |
|------|----------|------|
| 🟢 | Ollama 本機 | 完全離線 |
| 🟢 | Venice Pro | 官方隱私 AI（API 付費） |
| 🟡 | Anthropic / OpenAI BYO | 自己的 key，有 enterprise 合約可控 |
| 🟠 | OpenRouter FREE | 預設不訓練但部分會 log |
| 🟠 | OpenRouter Dolphin-Venice-Free | 免費 + uncensored，隱私中等 |
| 🔴 | 免費配額最差情況 | 資料可能被訓練 |

針對立委辦公室、律師、記者、政府相關用戶，onboarding 時主動建議走 🟢 路徑。

---

## 🗺️ Roadmap

| Sprint | 主題 | 狀態 |
|--------|------|------|
| **19** | V3 核心流程（創蝦 + 調度 + Dashboard） | 進行中 |
| **20** | V3 AI CREDIT 經濟系統 | 規劃中 |
| **21** | **V4 Phase A — Pinata Nest + OpenRouter 免費漏斗** | 📋 Ready（CAN-302） |
| **22** | V4 Phase B — Affiliate 整合 + 升級漏斗 UX | 📝 Draft |
| **23+** | V4 Phase C — Venice 隱私方案 / Skills marketplace | 規劃中 |

---

## 🎯 V4 Phase A — Sprint 21

### CAN-302（已開 issue）

**標題**：Pinata Nest Provider 整合 — 零門檻免費蝦
**Priority**：High
**估工**：1 Sprint（10 天）
**Paperclip ID**：`a9bc9143-e323-457a-b63e-bdb7703b4236`

### 範圍（摘要）

**後端**：
- D1 `nests` 加 `provider = 'pinata'`
- CF Worker `/api/nests/pinata/*` proxy 到 Pinata API
- Pinata token 管理（OAuth / BYO token 兩種路徑）
- `spec` JSON 加 `{pinataAgentId, plan, runtimeLimit, runtimeUsed}`

**前端**：
- Deploy Wizard 加「🪅 Pinata FREE」選項
- **Template Picker**（2026-04-23 新增）— 讓用戶從 Pinata Marketplace 選建蝦模板
  - 已知 templates：Alchemy、ampersend、Tempo、**Polygon Agent CLI**（2026-04-22 Pinata 發布）
  - CanFly 標記「推薦」（與 affiliate 對齊）
  - 未來追加「CanFly 自行開發」template（見新增 Phase B）
- Nest 頁顯示剩餘 runtime + 升級按鈕
- Chat Proxy 支援 Pinata JSONL streaming

### Phase B：CanFly 反向推 Template 到 Pinata Marketplace（2026-04-23 新增）

**洞察**：Pinata marketplace 在快速擴充 templates（Alchemy、ampersend、Tempo、Polygon Agent CLI…）。這是 **雙向流量機會**。

| CanFly Template | 內容 | 價值 |
|----------------|------|------|
| 🦞 **CanFly PM 蝦** | 預裝 Multica 四層抽象 + Paperclip-style PM 能力 | Pinata 用戶 → 一鍵嘗試「管蝦」→ 認識 CanFly 多蝦編排 |
| 🎨 **CanFly 影像生成蝦** | 預裝 nano-banana-pro, Gemini, HeyGen skill | 展示 CanFly 的媒體生態 |
| 📽 **CanFly HeyGen 影片蝦** | HeyGen + ZapCap 自動化 | 展示 CanFly 的 content pipeline |
| 💼 **CanFly Sprint 自動化蝦** | 內建 Paperclip Bridge + workflow | 展示 CanFly multi-agent 編排 |

**效果預計**：Pinata 已付費用戶看到 CanFly template → 點進去 → Layer 2 多蝦編排進漏斗。
**行動對應**：等 Phase A 基礎整合完成後，把 template 格式研究清楚，反向推。

### Phase C：Base Agent CLI（與 Polygon 競爭提案，2026-04-23 新增）

**背景**：2026-04-22 Pinata 發布 Polygon Agent CLI（Matic 生態），幫蝦加鏈上錢包/付款/swap/identity 能力。但寶博、小龍蝦、CanFly 全部在 **Base 生態** 紮根（Basename、BaseMail、Base wallet、Basemail_ai…），Polygon 對我們價值不高。

**提案**：做一個 **Base Agent CLI template**，當作 CanFly 對 Pinata marketplace 的旗艦貢獻。詳細分析見 `BASE-AGENT-CLI-RESEARCH.md`。

**待確認**：
- Pinata API 第三方代管機制（OAuth vs Service Account）
- OpenRouter key 處理方式（CanFly 統一 vs 用戶 BYO vs Pinata global vault）
- Dependencies：等 Sprint 20 AI CREDIT 做完才能設計完整升級路徑

---

## 🤝 Pinata Partnership 並行推進

Email draft 已完成：`canfly-ai/partnerships/pinata-partnership-draft.md`

### 三大合作提案
1. Pinata 作為 first-class CanFly Nest provider
2. Shared Skills ecosystem（ClawHub 本來就通）
3. Referral / affiliate mechanic

### 合作成功 vs 失敗的退路

| 反應 | 我們的下一步 |
|------|-------------|
| 熱情歡迎 + OAuth 路徑 | Sprint 21 立刻做，demo 回給 Pinata |
| 客氣但保留（怕被視為競爭） | 改提 referral + Skills 互推 |
| 不回 | 做 unofficial integration（用戶自備 token） |
| 拒絕 | 放棄 Pinata，改推 Ollama + Zeabur 免費入門 |

### 寶博待決定
- [ ] 用哪個 email 署名（juchunko@gmail.com / ko@canfly.ai / 立委辦公室）
- [ ] 時機：現在寄建關係 vs V3 Beta 後
- [ ] 收件人：先去 Pinata 官方 Discord / X / LinkedIn 找對的人

---

## 🚫 不做（明確排除）

### Venice 整合（暫緩）
- Venice FREE 沒 API（只有網站 chat），不能接 Pinata 蝦
- Venice Pro $18/mo 跟 Pinata/Zeabur 價位撞車，不是我們的升級路徑目標
- OpenRouter 已有 `dolphin-mistral-24b-venice-edition:free` 免費取得 uncensored 體驗
- **結論**：不納入 Sprint 21。留作 Layer 3 隱私旗艦選項，等 niche 有需求再做。

### AWS RoboMaker / Google Cloud Robotics 作為後端
- 都已停服或半死，不適合押

### 自己做容器託管
- 不要重造輪子。Pinata / Zeabur 已經做得很好。
- CanFly 的價值在編排、Multica 抽象、UX、affiliate 飛輪。

---

## 💡 為什麼這個策略成立

### 市場現況
- OpenAI、Anthropic 都不做 hosted agent platform（只給 API）
- Pinata 做了但只到單蝦、最多 3 隻
- Zeabur 是 PaaS 不是 agent 專用
- **CanFly 卡位**：hosted agent orchestration + 多蝦 + 免費入口 → 這個組合沒人做

### 品牌角度
寶博作為立委推廣「AI 普惠」、「科技民主化」，搭配「零門檻免費蝦」的故事天然契合：
- 不用信用卡、不用裝軟體 → 降低所有人接觸 AI 的門檻
- Taiwan-based 的開源/開放精神
- 跟 Basemail、CanFly 的 AI 身份基礎建設路線一致

### 收入角度
- Layer 0 本身不賺錢，但它是 funnel top
- Layer 1 轉換：Pinata PICNIC affiliate + CanFly Zeabur 訂閱
- Layer 2 差異化：多蝦編排 = 無法被 Pinata 取代的價值
- Layer 3 高 ARPU：隱私旗艦（未來）

---

## 🦞 小龍蝦筆記

這是寶博 2026-04-19 的 insight，連 OpenClaw 本身都還沒看到這個 opportunity。
如果 Sprint 21 執行得漂亮，CanFly 就是第一個「全免費養蝦」平台。

下一步：等寶博確認合作 email 寄出時機 + Sprint 20 順利收尾，就可以開始 Sprint 21 的 spike。
