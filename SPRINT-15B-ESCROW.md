# Sprint 15B — Escrow + Trust System

> 草擬者：小龍蝦 🦞 | 日期：2026-03-26
> 狀態：寶博已確認 ✅ → 建票開幹
> 依賴：Sprint 15A（A2A Task Protocol）已完成

## 🎯 主題：TaskEscrow + 信譽評分系統

讓 CanFly A2A 交易有鏈上保障：USDC 鎖在 escrow 合約，SLA 超時自動退款，完成後放款。
加上 Uber 式混合信譽系統，讓買賣雙方都有評分。

## 📐 架構

```
買方 Agent                    TaskEscrow 合約                    賣方 Agent
    |                              |                                |
    |-- deposit(taskId, USDC) ---->| USDC 鎖定                     |
    |                              |                                |
    |                              |-- 通知 seller 開工 ----------->|
    |                              |                                |-- 執行 skill
    |                              |<-- complete(taskId) -----------|
    |                              |                                |
    |  24h 確認期                   |                                |
    |-- confirm() OR reject() ---->|                                |
    |                              |                                |
    ├ confirm → release() -------->| → USDC 到賣方                  |
    ├ reject → refund() ---------->| → USDC 退買方                  |
    └ 超時沒交付 → refund() ------>| → USDC 退買方（SLA 到期）      |
```

## 📋 Tickets

### Phase 1: Escrow 合約（P0）

| # | ID | 類別 | 標題 | Priority | 指派 |
|---|-----|------|------|----------|------|
| 1 | CAN-215 | [Infra] | TaskEscrow 合約 — 改造 BaseMail PaymentEscrow.sol | critical | Dev |
| 2 | CAN-216 | [Infra] | TaskEscrow 合約部署到 Base chain | critical | Dev |
| 3 | CAN-217 | [Feature] | Tasks API 整合 Escrow — deposit 驗證改為驗 escrow 合約 | critical | Dev |

### Phase 2: 確認期 + 退款（P1）

| # | ID | 類別 | 標題 | Priority | 指派 |
|---|-----|------|------|----------|------|
| 4 | CAN-218 | [Feature] | Task 確認/拒收 API — confirm + reject endpoints | high | Dev |
| 5 | CAN-219 | [Feature] | SLA 超時自動退款 — cron 檢查 + 合約 refund | high | Dev |
| 6 | CAN-220 | [Infra] | D1 Migration — tasks table 加 escrow 欄位 | critical | Dev |

### Phase 3: 信譽系統（P2）

| # | ID | 類別 | 標題 | Priority | 指派 |
|---|-----|------|------|----------|------|
| 7 | CAN-221 | [Infra] | D1 Schema — ratings + trust_scores tables | high | Dev |
| 8 | CAN-222 | [Feature] | 買方評分 API — 1-5 星 + 評語 | medium | Dev |
| 9 | CAN-223 | [Feature] | Trust Score 計算 — 混合信譽公式 | medium | Dev |
| 10 | CAN-224 | [Feature] | Agent Card UI 顯示信譽分數 | medium | Dev |
| 11 | CAN-225 | [Feature] | 買方信譽 — reject rate + 付款速度追蹤 | low | Dev |

### Phase 4: 內容 + 文件

| # | ID | 類別 | 標題 | Priority | 指派 |
|---|-----|------|------|----------|------|
| 12 | CAN-226 | [Content] | 教學：CanFly Escrow — 安全的 Agent 交易 | medium | Content Writer |

---

## 🔍 監督檢查清單（每張票完成時必查）

- [ ] D1 migration 有跑嗎？（CAN-220, CAN-221）
- [ ] 回滾步驟有記錄嗎？
- [ ] Code 有 commit + push 嗎？
- [ ] 功能有實測通過嗎？
- [ ] 測試失敗的有開修 bug 票嗎？

## 💡 技術筆記

### TaskEscrow 合約要點（CAN-215）
- 基底：`~/clawd/BaseMail-repo/contracts/contracts/PaymentEscrow.sol`
- 新增：`slaDeadline`（賣方承諾交付時限）
- 新增：`disputeWindow`（交付後買方確認期，建議 24h）
- 新增：`reject()` 函數（買方拒收 → 退款 + 信譽扣分）
- USDC contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- 部署到 Base mainnet

### D1 Migration（CAN-220）
```sql
ALTER TABLE tasks ADD COLUMN escrow_tx TEXT;
ALTER TABLE tasks ADD COLUMN escrow_status TEXT DEFAULT 'none';
-- escrow_status: none | deposited | released | refunded | rejected
ALTER TABLE tasks ADD COLUMN sla_deadline TEXT;
ALTER TABLE tasks ADD COLUMN confirmed_at TEXT;
ALTER TABLE tasks ADD COLUMN rejected_at TEXT;
ALTER TABLE tasks ADD COLUMN reject_reason TEXT;
```

### Trust Score 公式（CAN-223）
```
trust_score = 0.4 × completion_rate + 0.3 × avg_rating_normalized + 0.2 × log(total_tasks+1)/log(100) + 0.1 × min(account_age_days/365, 1)
```
- 0-100 分制
- 最近 30 天權重 > 歷史

### 信譽展示（CAN-224）
```
🦞 Ciri
⭐ 4.8 (23 reviews) · ✅ 96% completion · 📦 45 tasks
🔒 Escrow Protected · 🕐 Since 2026-03
```

---

*寶博已確認 2026-03-26 ✅ — 建票開幹*
