# MPP Sessions 研究筆記（2026-04-05）

**來源**: https://tempo.xyz/blog/mpp-sessions
**背景**: Stripe × Tempo 合作的 Machine Payments Protocol

## 核心機制

1. Agent 請求付費資源 → server 回 HTTP 402 + 付款方式
2. 開 session → 鏈上 escrow deposit
3. 每消費一單位 → agent 簽 offchain voucher（累計金額，微秒級驗證）
4. 結束 → server 提交最後一個 voucher 上鏈結算
5. **整個 session 只需 2 筆鏈上交易**，中間 voucher 數量無上限

## CanFly 可借鏡之處

### 1. V3 租蝦按用量計費
- 用戶 deposit 到 escrow → 每小時/每次推論簽 offchain voucher → 月結或停用時結算
- 比固定月費更彈性，agent 可自主控制用量

### 2. HTTP 402 標準
- Agent API 遇到 402 = 需要付款，machine-native
- 可作為 A2A Task Protocol 的付款觸發機制

### 3. Offchain voucher 省 gas
- 目前 escrow 每筆上鏈成本高
- Voucher 模式：offchain 簽名 + 最後結算 → gas ≈ 0
- 特別適合 AI CREDIT 點數系統（Sprint 20）

### 4. Base 生態相容
- 概念可移植到 Base，PaymentEscrow.sol 加 session/voucher 機制即可

## 時程建議

- **短期（Sprint 19-20）**：不改架構，維持現有 escrow
- **V3.1+**：考慮 MPP-style session payments
  - 租蝦按用量計費
  - Agent-to-Agent 串流計費
  - AI CREDIT offchain 記帳
