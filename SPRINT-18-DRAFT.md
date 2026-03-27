# Sprint 18 Draft — 品質鞏固 + 用戶體驗 + 自動部署修復

> 草擬者：小龍蝦 🦞 | 日期：2026-03-27
> 狀態：待 CEO 回饋 → 寶博確認

## 🎯 主題：Stabilization & User Experience

Sprint 15B-17 高速衝刺完成了 Escrow 系統 + Atomic Ordering + 自動執行引擎。
現在要回頭修 bug、改善用戶體驗、修復 CI/CD，穩固基礎再推進。

---

## 📋 Tickets

### Bug Fixes（P0 — 先修再說）

| # | 類別 | 標題 | Priority | 建議指派 | 說明 |
|---|------|------|----------|----------|------|
| 1 | [Bug] | 用戶註冊 username 未設定問題 | critical | Dev | ciri784 回報：Login with email works，但 profile 顯示 "No username set"。需調查 registration flow 是否正確寫入 username 到 D1。檢查 POST /api/community/users 和 Privy callback 流程 |
| 2 | [Bug] | CF Pages 自動部署修復 | high | Dev | GitHub push to main 後 CF Pages 不自動 build（3/26 發現）。檢查 GitHub webhook integration 設定、CF Pages build trigger。修復或重新設定 webhook |
| 3 | [Bug] | JSON Parse Failure on registration | high | Dev | ciri784 回報（3/25）：Kiri 註冊時遇到 JSON Parse Failure。需重現並修復 registration API error handling |

### User Experience 改善

| # | 類別 | 標題 | Priority | 建議指派 | 說明 |
|---|------|------|----------|----------|------|
| 4 | [Feature] | Agent Profile birthday 欄位改善 | medium | Dev | ciri784 建議：birthday 欄位目前是自由文字，建議改為 date picker 或有驗證格式。改善 agent profile 編輯體驗 |
| 5 | [Feature] | Tasks list 頁面 — 買方/賣方 dashboard | high | Dev | 買方能看到自己下過的訂單和狀態；賣方（agent owner）能看到收到的訂單。前端 UI，已有 Tasks API 支援 |
| 6 | [Feature] | Task 完成後自動 BaseMail 通知買方 | medium | Dev | task completed 時自動寄 BaseMail 給 buyer_email，附上 result_url 和感謝訊息。提升買方體驗，不用一直 poll |

### 內容 & SEO

| # | 類別 | 標題 | Priority | 建議指派 | 說明 |
|---|------|------|----------|----------|------|
| 7 | [Content] | Learn 教學：Escrow 付款完整流程 | medium | Content Writer | 更新或新增教學頁面，說明新的 Escrow-first atomic ordering 流程。包含 API 範例 + BaseMail 範例 + 前端截圖 |
| 8 | [Content] | Agent Card 展示頁 SEO 優化 | low | Content Writer | 每個 agent card 頁面加 meta description、OG image、structured data (JSON-LD)。讓 Google/AI 能索引到 agent 服務 |

### 基礎設施

| # | 類別 | 標題 | Priority | 建議指派 | 說明 |
|---|------|------|----------|----------|------|
| 9 | [Infra] | Escrow 資金釋放 confirm API | high | Dev | 買方 confirm delivery 後釋放 escrow 資金給賣方的 API。目前 escrow 完成但缺少 confirm/release 的前端+API 路徑 |
| 10 | [Infra] | Rate limiting + abuse prevention | medium | Dev | Tasks API 加 rate limit（每 IP/agent 每小時 X 次）。防止 spam 訂單佔用資源 |

---

## 📐 執行順序建議

```
Day 1-2:  #1 → #2 → #3  (Bug fixes first！修完才能安心)
Day 3-4:  #5 → #9        (Task dashboard + escrow confirm)
Day 5-6:  #4 → #6 → #10  (UX improvements)
Day 7:    #7 → #8         (Content)
```

---

## 💡 背景筆記

### ciri784 是活躍社群成員
- 多次寄信回報 bug 和建議
- 自己有技能上架（規則怪談產生器）
- 重視這些回饋 = 留住早期用戶

### Escrow confirm 是閉環關鍵
- Sprint 17 完成了 deposit → verify → execute → complete
- 但缺少 buyer confirm → release funds 這最後一步
- 沒有 confirm 機制，escrow 資金就卡住了

---

*待 CEO 回饋 → 寶博確認 → 建票開幹*
