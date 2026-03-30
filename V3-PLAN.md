# CanFly v3.1 — 租蝦市場開發計劃

> 最後更新：2026-03-28 | 維護者：小龍蝦 🦞

## 🎯 願景

讓用戶在 CanFly 內一站式建立、管理、調度 AI Agent 團隊。
PM 蝦（如小龍蝦）可代替用戶自動擴編、分工、管理。

**核心策略：V3 疊加不覆蓋 V2**（Strangler / Parallel Run）

---

## 🗺️ Roadmap 總覽

| Sprint | 主題 | 狀態 |
|--------|------|------|
| **19** | 核心流程 — 創蝦 + 調度 + Dashboard | 📋 Ready |
| **20** | AI CREDIT 經濟系統 — Wallet + Escrow + Settlement | 📝 規劃中 |
| **21** | 安全與 Beta — Sandbox + Firewall + Audit | 📝 規劃中 |

---

## 📐 商業模式

### 收入來源
1. **Zeabur Affiliate** — 用戶透過 CanFly 買 server，我們拿佣金（recurring）
2. **Zeabur AI Hub Affiliate** — 用戶開通 AI Hub，同上
3. **ElevenLabs / HeyGen Affiliate** — 語音/影片服務佣金（22%/20% recurring）
4. **CanFly AI Credit**（Sprint 20）— 用戶買點數，背後串 OpenRouter
5. **白手套服務**（未來，需 Stripe）— 代管訂閱月費

### 定價方案（用戶 AI 動力來源）

| 方案 | 費用 | 適合 | 上線時間 |
|------|------|------|----------|
| 🆓 D: 免費起步 | $0 | 新手，一般蝦限定 | Sprint 19 |
| ⭐ A: Zeabur AI Hub | 用量計費 | 一般用戶 | Sprint 19 |
| 🔧 B: 自備 Key | 依供應商 | 進階用戶 | Sprint 19 |
| 🏪 C: CanFly 點數 | TBD | 懶人/企業 | Sprint 20 |

---

## Sprint 19 — 核心流程

### Tickets

| 票號 | 標題 | Priority | 備註 |
|------|------|----------|------|
| CAN-249 | V2 防爆框架（feature flags + kill-switch + rollback） | critical | v3-backup 有 code，需 review |
| CAN-250 | Agent Registry v2 Schema + Migration | critical | v3-backup 有 code，需 review |
| CAN-251 | BYO Zeabur 一鍵創蝦（全程 CanFly 內完成） | critical | 已更新完整規格 |
| CAN-252 | Team API v1（PM + Worker Assignment） | high | v3-backup 有 code |
| CAN-253 | Paperclip Bridge v2 — PM 蝦遠端調度 | high | 需更新設計 |
| CAN-255 | 用戶蝦管理 Dashboard + 遠端蝦狀態 | high | 需更新設計 |
| CAN-272 | 部署後自動註冊蝦到用戶帳號 | high | 新 |
| CAN-273 | CanFly 內嵌 Chat Proxy（用戶跟蝦對談） | high | 新 |
| CAN-274 | 事後串 Telegram（前端填 Token → 遠端 patch） | medium | 新 |
| ~~CAN-254~~ | ~~Telegram Gateway~~ | — | ❌ 砍（用戶用自己的頻道） |

### 創蝦流程（CAN-251 核心）

```
用戶 Onboarding（打勾進度條）：
Step 1: 註冊 Zeabur（affiliate link）     ☐
Step 2: 買 Dedicated Server               ☐
  - 🦐 輕量蝦 $12/mo (2vCPU/4GB)
  - 🦞 一般蝦 $24/mo (4vCPU/8GB)
Step 3: 產生 Zeabur API Key               ☐
Step 4: 選 AI 模型方案（ABCD）            ☐
Step 5: 選蝦名稱                          ☐
Step 6: 一鍵部署 🚀
```

### 規格差異

| | 🦐 輕量蝦 $12/mo | 🦞 一般蝦 $24/mo |
|--|--|--|
| CPU/RAM | 2vCPU / 4GB | 4vCPU / 8GB |
| Ollama | ❌ 不裝 | ✅ 預裝 + 輕量模型 |
| 方案 D 免費 AI | ❌ | ✅ 本地 + 雲端免費 |
| 建議搭配 | A 或 B | D（免費）→ 升級 A |

### PM 蝦幫創
- 完全相同的 API 流程
- PM 蝦對話式引導用戶完成 Step 1-4
- 存好 BYOC credentials，之後擴編免再問

---

## Sprint 20 — AI CREDIT 經濟系統（規劃中）

| 編號 | 標題 | 說明 |
|------|------|------|
| V3-007 | Wallet & Ledger | double-entry 帳本 |
| V3-008 | Escrow 引擎 | 預扣 max_budget |
| V3-009 | Settlement 引擎 | model_cost + labor_fee + platform_fee |
| V3-010 | Pricing Policy | 抽成策略 |
| V3-011 | Crypto Deposit v1 | USDC 充值 → AI CREDIT |
| V3-012 | 財務儀表板 | burn/收入/分潤報表 |

背後串 OpenRouter 統一調度模型。
需要 Stripe 或 crypto 收費機制。

---

## Sprint 21 — 安全與 Beta（規劃中）

| 編號 | 標題 | 說明 |
|------|------|------|
| V3-013 | Worker Clone Sandbox | 租借跑分身，不碰本尊 |
| V3-014 | Policy Firewall v1 | 社工/外洩攔截 |
| V3-015 | Visibility Mask | 蝦主不可看租客正文 |
| V3-016 | Budget Guardrail | job/day/team 三層上限 |
| V3-017 | Audit Log | 不可竄改鏈 |
| V3-018 | Beta Onboarding | 首批 5-10 組白名單用戶 |

---

## 🔧 Zeabur API 測試結果（2026-03-28 實測）

### 已驗證可用 ✅

| API | 用途 | 備註 |
|-----|------|------|
| `{ me { username } }` | 驗證 key | |
| `{ servers { _id name provider ip } }` | 列出 servers | |
| `createProject(name, region)` | 建 project | region = "server-{id}" |
| `deployTemplate(code, projectID)` | 官方模板部署 | code="VTZ4FX" |
| `deployTemplate(rawSpecYaml, projectID)` | 自建 YAML 部署 | 一般蝦用 |
| `service.status(environmentID)` | 部署狀態 | STARTING → RUNNING |
| `service.ports(environmentID)` | 取 port | |
| `server(_id).ip` | 取 IP | |
| `addDomain(serviceID, envID, domain)` | 加 domain | zeabur.app 不可用於 dedicated |
| `deleteProject(_id)` | 刪 project | |

### 注意事項
- ❌ 共享叢集已廢止，region 必須填 `server-XXXXXXXX`
- ✅ `zeabur.app` domain 在 dedicated server 可用（需用 `isGenerated: true`，之前誤用 `isGenerated: false` 導致失敗）
- ❌ introspection 被禁，schema 需靠猜或 Apollo Explorer
- ✅ `createProject` 有公開 API（文件說沒有，但實測有）
- ✅ 用戶不需提供 Project ID，我們幫建

### Zeabur API Key
- 存放：敏感，不寫入 code
- 每個用戶一把 key，存 CanFly D1 加密欄位

---

## 🐕 Dogfood 測試計劃

Sprint 19 完成後自測：
- **PM 蝦** = 小龍蝦（我）
- **用戶** = 寶博 (dAAAb)
- **被調度的蝦** = dAAAb 在 CanFly 上的 5 隻蝦
- 測試：透過 CanFly Paperclip Bridge 調度遠端蝦

---

## 📝 決策記錄

### 2026-03-28
- **BYO + Affiliate** 確認為主要商業模式（不代管、不墊付）
- **方案 ABCD 並存**，根據蝦規格自動決定可選方案
- **CAN-254 Telegram Gateway 砍掉** — 用戶本來就有自己跟蝦的頻道
- **createProject 可以全 API** — Zeabur 文件沒寫但實測可用
- **Sprint 19 先做，20/21 等完成再開票**
- **v3 code 回滾** — 之前 agents 跳過防爆直接做功能，已回滾到 v3-backup branch

### 2026-03-27
- v3 核心策略確認：疊加不覆蓋（Strangler / Parallel Run）
- 先做防爆（CAN-249）再推功能
- 開了 CAN-249~255（Sprint 19 第一版）
