# Sprint 17 Draft — Escrow-First Atomic Ordering

> 草擬者：小龍蝦 🦞 | 日期：2026-03-26
> 狀態：待 CEO 回饋 → 寶博確認

## 🎯 主題：付了才有單，沒付就沒單

### 問題
目前下單流程是三步：建空單(pending_payment) → 付款 → verify-payment。
糖果蝦實測卡在第二步 — 建了單但沒付款就停了。
`pending_payment` 是個不該存在的狀態。

### 設計原則
1. **所有訂單都走 Escrow** — 不管金額大小。（上次忘了出貨就是因為沒有 Escrow 保護）
2. **付款即下單** — POST /tasks 帶 tx_hash，驗證 Escrow Deposited event 才建單
3. **AI 和人類走同一個 API** — 只是前面的「發現+付款」體驗不同

### 新流程

**AI Agent：**
```
1. GET agent-card.json → 知道 skill 價格 + Escrow 合約 + seller 地址
2. Escrow.deposit(taskId, seller, amount, slaDeadline) → 鎖 USDC
3. POST /tasks {skill, params, tx_hash} → 驗證 Deposited → 建單 status: paid → 自動執行
```

**人類 UI：**
```
1. 看 Agent Card → 點 Buy → 填 params
2. 點 "Pay & Order" → 前端呼叫 Escrow.deposit → 錢包簽名
3. 前端拿到 tx_hash → 自動 POST /tasks → 完成
```

---

## 📋 Tickets

| # | ID | 類別 | 標題 | Priority | 指派 | 說明 |
|---|-----|------|------|----------|------|------|
| 1 | CAN-230 | [Infra] | Escrow MIN_AMOUNT 降低 + 重新部署 | critical | Dev | 目前 MIN_AMOUNT=0.10 USDC，但最低商品 $0.01。改為 `10_000`（0.01 USDC）或 `1`（0.000001 USDC）。重新部署合約到 Base，更新 .env + wrangler.toml 的 TASK_ESCROW_CONTRACT |
| 2 | CAN-231 | [Feature] | Tasks API 改為 atomic ordering — 付了才建單 | critical | Dev | `POST /tasks` 必須帶 `tx_hash`。收到後：(1) 驗證 Escrow Deposited event (2) 通過 → 建單 status:paid (3) 失敗 → 400 不建單。移除 `pending_payment` 狀態。舊的 verify-payment endpoint 保留但標記 deprecated |
| 3 | CAN-232 | [Feature] | Agent Card JSON 更新 — Escrow-first flow | high | Dev | `agent-card.json` 的 flow 說明改成：先 deposit 再 POST /tasks。加上 `escrow_contract` 地址、`usdc_contract` 地址、`deposit()` function signature + ABI。讓 AI agent 讀了就知道怎麼付款 |
| 4 | CAN-233 | [Feature] | Agent Card UI — 一鍵 Pay & Order | high | Dev | 前端購買流程改為原子化：填 params → 點 Pay → 前端 call Escrow.deposit() → 拿到 tx_hash → 自動 POST /tasks。用戶感知一步完成。需要 ethers.js 或 viem 呼叫合約 |
| 5 | CAN-234 | [Feature] | taskId 生成策略 — 鏈上+鏈下一致 | high | Dev | Escrow.deposit 需要 taskId（bytes32），但目前 taskId 是 API 建單時才生成。改為：buyer 在付款前先用 `keccak256(buyer + seller + skill + timestamp + nonce)` 算出 taskId，deposit 時帶入，POST /tasks 時帶同一個 taskId |
| 6 | CAN-235 | [Bug] | Tasks API list 排序 bug | medium | Dev | 新建的 task 排在 list 後面沒顯示。確認 ORDER BY created_at DESC，以及 limit 是否太小 |
| 7 | CAN-236 | [Feature] | 清理 pending_payment 殭屍單 | low | Dev | Migration：把所有 `pending_payment` 狀態的舊單改為 `cancelled`。加 cron 自動清理超過 24h 的 pending 單（過渡期用） |
| 8 | CAN-237 | [Content] | 教學更新 — Escrow-first ordering flow | medium | Content Writer | 更新 Learn 教學頁 + API docs，反映新的 atomic ordering 流程 |

---

## 📐 執行順序

```
Phase 1 (核心):  #1 → #5 → #2 → #3  (合約 + API + agent-card)
Phase 2 (UI):    #4 → #6             (前端 + bug fix)  
Phase 3 (清理):  #7 → #8             (殭屍單 + 文件)
```

---

## 💡 技術筆記

### taskId 生成（CAN-234）
```solidity
// Buyer 端（或 API 提供 helper）
bytes32 taskId = keccak256(abi.encodePacked(buyer, seller, skillName, block.timestamp, nonce));
```

API 也可以提供 `GET /tasks/generate-id` 讓 buyer 先拿 taskId 再去 deposit。

### Agent Card JSON 新增欄位（CAN-232）
```json
{
  "commerce": {
    "escrow_contract": "0x...",
    "usdc_contract": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "chain": "base",
    "chain_id": 8453,
    "deposit_abi": "deposit(bytes32,address,uint256,uint256)",
    "flow": "deposit → POST /tasks with tx_hash"
  }
}
```

### Escrow MIN_AMOUNT 選項（CAN-230）
- `10_000` = 0.01 USDC（配合目前最低價）
- `1` = 0.000001 USDC（未來彈性）
- 建議用 `10_000`，太低可能被 spam

---

*待 CEO 回饋 → 寶博確認 → 建票開幹*
