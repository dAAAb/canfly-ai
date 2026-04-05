# BaseMail MPP Integration Plan

**Status**: 規劃中（P2）
**目標**: 讓 BaseMail 成為 MPP service provider，與 AgentMail 競爭

## 競爭對手：AgentMail（已在 MPP 上）

| 操作 | AgentMail | BaseMail（建議）|
|------|-----------|----------------|
| 建 inbox | $2.00 | $1.00 |
| 發信 | $0.01 | $0.01 |
| 回信 | $0.01 | $0.01 |
| 建域名 | $10.00 | $5.00 |

## BaseMail 差異化優勢

1. **Onchain Identity** — Basename 綁定，不只是 email
2. **World ID 驗證** — 可選人類身份驗證
3. **Base 鏈原生** — 資產和身份都在 Base 上
4. **CanFly 生態** — 跟 Agent Card、Trust Score 整合
5. **價格更低** — 搶早期市場

## 技術實作步驟

### Step 1: 建 Tempo 收款錢包
- BaseMail 的運營錢包在 Tempo 上天然可用（同一把私鑰）
- 入金：需要在 Tempo 上有 PathUSD 作為收入

### Step 2: 安裝 mppx SDK
```bash
cd BaseMail-repo
npm install mppx
```

### Step 3: 包裝 BaseMail API
在現有 API 前面加一層 MPP middleware：

```typescript
// basmail-mpp-middleware.ts
import { Mppx, tempo } from 'mppx/server'

const mppx = Mppx.create({
  methods: [tempo({
    currency: '0x20c000000000000000000000b9537d11c60e8b50', // PathUSD
    recipient: BASEMAIL_WALLET_ADDRESS,
  })],
})

// POST /api/send — $0.01 per email
export const sendHandler = async (request: Request) => {
  const result = await mppx.charge({ amount: '0.01' })(request)
  if (result.status === 402) return result.challenge
  // 原有 BaseMail 發信邏輯
  return result.withReceipt(await originalSendHandler(request))
}

// POST /api/inbox — $1.00 per inbox
export const createInboxHandler = async (request: Request) => {
  const result = await mppx.charge({ amount: '1.00' })(request)
  if (result.status === 402) return result.challenge
  return result.withReceipt(await originalCreateInboxHandler(request))
}
```

### Step 4: 加入 Discovery
```typescript
import { discovery } from 'mppx/hono'
discovery(app, mppx, {
  auto: true,
  info: { title: 'BaseMail', version: '1.0.0' },
})
```

### Step 5: 提交到 MPP 目錄
- https://mppscan.com/register
- PR to https://github.com/tempoxyz/mpp

### Step 6: 雙軌並行
- 現有 SIWE 認證 API → 不動
- 新增 MPP 入口 → `/mpp/api/send`, `/mpp/api/inbox`
- 或用 middleware 自動偵測：有 Authorization: Payment header → MPP 流程

## 時程估計

| 步驟 | 工時 |
|------|------|
| 錢包設定 | 0.5 天 |
| mppx SDK 整合 | 1 天 |
| API 包裝 + 測試 | 1-2 天 |
| Discovery + 目錄提交 | 0.5 天 |
| **合計** | **3-4 天** |

## 注意事項

- BaseMail 目前部署在 Cloudflare Workers — mppx 支援 Fetch API，相容
- PathUSD 入金：需要確認 Tempo 上的橋接方案（USDC → PathUSD）
- 先在 Tempo testnet (Moderato) 測試
- 不影響現有用戶的 SIWE 認證流程
