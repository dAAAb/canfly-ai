# BaseMail Multi-From Feature Spec

## 背景

一個錢包可以擁有多個 Basename（例如 `basemailai.base.eth` 和 `canflyai.base.eth`）。目前 BaseMail 發信的 `from` 固定是帳號的 `handle`（註冊時決定），無法選擇用哪個身份發信。

**需求：** 允許同一錢包用任何它擁有的 Basename 作為 `from` 發信。

## 現狀

- 每個帳號有一個 `handle`（如 `basemailai`）
- 發信 `POST /api/send` 時，`from` 自動用帳號的 `handle`
- 錢包可能擁有多個 Basename，但只能用一個身份
- `PUT /api/register/upgrade` 可以改 handle，但是一次只能設一個

## 設計

### API 改動

**`POST /api/send` 新增 `from_handle` 可選參數：**

```json
{
  "to": "someone@basemail.ai",
  "subject": "Hello",
  "body": "...",
  "from_handle": "canflyai"    // ← 新增，可選
}
```

- **不傳 `from_handle`** → 用帳號預設 handle（向後相容，零破壞）
- **傳了 `from_handle`** → 驗證該 basename 屬於此錢包 → 用它發信

### 驗證邏輯

每次發信時鏈上驗證 basename 所有權：

```
1. from_handle → from_handle + ".base.eth" → namehash
2. 查 Base Name Service Registry: owner(namehash) == 發信者錢包地址?
3. 是 → 允許，from = from_handle@basemail.ai
4. 否 → 400 "You don't own this basename"
```

**為什麼選鏈上驗證而非 DB cache：**
- Basename 可以轉手，鏈上驗證即時反映所有權變化
- 發信不是 latency-sensitive 操作（多 100ms RPC 查詢可接受）
- 不需要額外 DB table 或同步機制
- 最安全，無法偽造

### 鏈上查詢方式

```typescript
import { createPublicClient, http, namehash } from 'viem'
import { base } from 'viem/chains'

const BASE_REGISTRAR = '0x03c4738Ee98aE44591e1A4A4F3CaB6641d95DD9a' // Base Name Service NFT
const REGISTRAR_ABI = [
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
]

// basename label → tokenId = uint256(labelhash)
// labelhash = keccak256("canflyai") （不含 .base.eth）
async function verifyBasenameOwner(label: string, expectedOwner: string): Promise<boolean> {
  const client = createPublicClient({ chain: base, transport: http() })
  const labelHash = keccak256(toBytes(label))
  const tokenId = BigInt(labelHash)
  
  try {
    const owner = await client.readContract({
      address: BASE_REGISTRAR,
      abi: REGISTRAR_ABI,
      functionName: 'ownerOf',
      args: [tokenId],
    })
    return owner.toLowerCase() === expectedOwner.toLowerCase()
  } catch {
    return false // name doesn't exist or not registered
  }
}
```

> ⚠️ 注意：Base Name Service 的 NFT 合約地址和 tokenId 計算方式需要確認。上面是基於 ENS 標準的推測，實作時請查一下 BaseScan 上 `canflyai.base.eth` 的實際 NFT 合約。可以從我們的註冊 tx `0x6ce4c81dae7be4d79d6aac145cc8be191b6f093ef0b0b890ce3fab0b5ce88fe9` 的 event logs 找到正確合約。

### Primary Basename（Reverse Resolution）

Basename 的「primary」概念就是 **reverse resolution**：

- 註冊時設 `reverseRecord: true` → 該 name 變成這個地址的 primary
- 一個地址只能有一個 reverse record
- 可以用來當 `from_handle` 的預設值

**建議（非必要，可以之後做）：**
- `GET /api/profile` 回傳 `aliases: ["basemailai", "canflyai"]`（所有該錢包擁有的 basename）
- `PUT /api/profile` 可設 `primary_handle`

### 收信行為

**所有該錢包擁有的 basename 都應該能收信：**
- `canflyai@basemail.ai` → 送到錢包 `0x4BbdB8...` 的收件箱
- `basemailai@basemail.ai` → 也送到同一個收件箱

目前 BaseMail 收信是查 handle → wallet mapping，所以：
- 需要確保 `handle_to_wallet` mapping 包含所有 basename aliases
- 或者收信時做 reverse lookup：handle → basename → 鏈上查 owner → 找到帳號

### 安全考量

1. **basename 轉手即失效** — 鏈上驗證確保轉手後前任無法再用
2. **不能冒充** — 必須是 NFT owner 才能用
3. **rate limit** — `from_handle` 不影響現有 rate limit（per-wallet）
4. **計費** — 外部信的 credit 扣在錢包帳號上，不是 handle 上

## 實作步驟

### Phase 1：發信支援 `from_handle`（最小可行）
1. `POST /api/send` 接受 `from_handle` 參數
2. 鏈上驗證 basename 所有權
3. 驗證通過 → `from_addr` 用 `from_handle@basemail.ai`
4. 驗證失敗 → 400 error
5. 不傳 → 用原本的 handle（向後相容）

### Phase 2：收信支援 aliases（可選）
1. 收信時如果找不到 handle → 嘗試鏈上 reverse lookup
2. 或者維護一個 `basename_aliases` table
3. 所有 aliases 的信都送到同一個收件箱

### Phase 3：Profile aliases（可選）
1. `GET /api/profile` 回傳所有已知 aliases
2. `PUT /api/profile` 設定 primary handle
3. 前端顯示「發信身份」選擇器

## 影響範圍

- **API**：`POST /api/send`（加 `from_handle`）
- **Docs**：`/api/docs` 更新
- **DB**：Phase 1 不需要改 schema
- **向後相容**：100%，不傳 `from_handle` 完全不影響現有行為

## CanFly 的使用場景

CanFly 的 MPP 錢包擁有：
- `basemailai.base.eth`（最早註冊）
- `canflyai.base.eth`（剛註冊）

實作後，CanFly 發送通知信時可以：
```json
{
  "to": "buyer@basemail.ai",
  "from_handle": "canflyai",
  "subject": "Your task is complete!",
  "body": "..."
}
```

收件人看到的 from 是 `canflyai@basemail.ai` ✉️
