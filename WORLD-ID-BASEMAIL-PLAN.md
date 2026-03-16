# 🌍 World ID × BaseMail × CanFly 整合設計

> 2026-03-14 寶博指示，小龍蝦整理

---

## 一、核心概念

BaseMail 和 CanFly 共用 World ID 作為最高信任基礎，互相引流形成飛輪。

```
BaseMail 用戶               CanFly 用戶
    │                           │
    │  已有 World ID ✅          │  還沒有 World ID
    │                           │
    ▼                           ▼
┌─────────────────┐    ┌─────────────────┐
│ 用同一個錢包地址  │    │ 在 CanFly 掃     │
│ 註冊 CanFly      │    │ World ID 驗證    │
│                 │    │                 │
│ CanFly 呼叫      │    │ CanFly 驗證完    │
│ BaseMail API    │    │ 自動呼叫         │
│ 查到 is_human=1 │    │ BaseMail API    │
│                 │    │ 幫他開 BaseMail  │
│ ✅ 直接升級      │    │ 帳號            │
│ root user       │    │                 │
└─────────────────┘    └─────────────────┘
         │                      │
         ▼                      ▼
    CanFly 🌍 Root User    CanFly 🌍 Root User
    + BaseMail 帳號 ✅      + 新 BaseMail 帳號 🆕
```

---

## 二、兩條驗證路徑

### 路徑 A：已有 BaseMail + World ID 的用戶
1. 用錢包地址註冊 CanFly
2. CanFly 後端呼叫 BaseMail API 查驗證狀態（by wallet address）
3. `is_human: true` → 直接升級 `verification_level = 'worldid'`，免重複掃臉
4. 🎉 一秒變 Root User

### 路徑 B：沒有 BaseMail 的新用戶
1. 在 CanFly 註冊，掃 World ID 驗證
2. 驗證成功 → `verification_level = 'worldid'`
3. CanFly 後端呼叫 BaseMail API，用該錢包地址自動開通 BaseMail 帳號
4. 通知用戶：「🎉 你已獲得 BaseMail！你的 email 是 `{name}@basemail.ai`」
5. 🎉 一步拿到 CanFly Root User + BaseMail 信箱

---

## 三、信任層級

```
🌍 Root User (World ID Orb)      ← 最高，真人生物驗證
   └─ 來源 A: BaseMail 已驗證 (API 互查)
   └─ 來源 B: CanFly 直接掃 World ID
📱 Device Verified (World ID Device) ← 次高
🔗 Wallet / GitHub Verified       ← 中
📧 Email Only                     ← 低
👻 Unverified                     ← 未驗證
```

- World ID 驗證用戶在 Community 排序中有加權
- Trust Badge 顯示對應等級

---

## 四、飛輪效應

```
CanFly 帶新用戶 ──→ World ID 驗證 ──→ 自動開 BaseMail
       ↑                                    │
       │                                    ▼
  BaseMail 用戶 ←── 認識 CanFly ←── BaseMail 導流
```

- **CanFly → BaseMail**：驗完 World ID 自動開帳號，拉 BaseMail 用戶
- **BaseMail → CanFly**：已驗過的免重掃，降低 CanFly 驗證門檻
- **World ID** 是共用的信任基礎，nullifier 防一人多號
- 兩邊的 **Privy 都支援 World ID 登入**，體驗一致

---

## 五、CanFly World ID 憑證

| 項目 | 值 |
|------|-----|
| **Private / Signer Key** | `REDACTED_ROTATE_KEY` |
| **APP ID (Legacy)** | `app_ee5d4fa1aa655b4a3ba0641bb070ad67` |
| **RP ID** | `rp_2eeecd2f22517885` |
| **Management Mode** | Managed |
| **Action** | `real-human-canfly` |

### 環境變數（Cloudflare Pages）
```
WORLD_ID_APP_ID=app_ee5d4fa1aa655b4a3ba0641bb070ad67
WORLD_ID_RP_ID=rp_2eeecd2f22517885
WORLD_ID_ACTION=real-human-canfly
WORLD_ID_SIGNING_KEY=REDACTED_ROTATE_KEY
```

---

## 六、技術實作

### 6.1 CanFly 前端 — World ID 元件

參考 BaseMail 的 `WorldIdVerify.tsx`（IDKit v4 + RP signature 模式）。

```tsx
// 安裝
npm install @worldcoin/idkit

// 使用
import { IDKitRequestWidget, deviceLegacy } from "@worldcoin/idkit";

const WORLD_ID_APP_ID = "app_ee5d4fa1aa655b4a3ba0641bb070ad67";
const WORLD_ID_ACTION = "real-human-canfly";
const WORLD_ID_RP_ID = "rp_2eeecd2f22517885";

// 1. 從後端取 RP signature（signed nonce）
// 2. 開啟 IDKitRequestWidget
// 3. handleVerify → 送 proof 到後端驗證
// 4. onSuccess → 更新 UI
```

### 6.2 CanFly 後端 — World ID 路由

參考 BaseMail 的 `worker/src/routes/world-id.ts`：

```
POST /api/world-id/rp-signature    — 產生 RP signature（需登入）
POST /api/world-id/verify          — 驗證 IDKit proof，存 nullifier
GET  /api/world-id/status/:username — 公開查詢驗證狀態
```

**關鍵實作要點：**
- RP signature 用 `WORLD_ID_SIGNING_KEY` 簽名（見 BaseMail `rp-sign.ts`）
- nullifier hash 去重（同一個 World ID 不能綁多個帳號）
- World ID `/v4/verify` API 會擋 CF Worker IP（403），可改從瀏覽器端驗證或走 proxy
- 驗證成功後更新 `users.verification_level = 'worldid'`

### 6.3 BaseMail 串接 API（需要 BaseMail 側新增）

**查詢 API**（CanFly 呼叫）：
```
GET /api/world-id/status-by-wallet/{address}
→ { is_human: boolean, verification_level: string, handle: string }
```
（現有 BaseMail 只支援 by handle，需加 by wallet 查詢）

**自動開帳號 API**（CanFly 呼叫）：
```
POST /api/accounts/auto-provision
Body: { wallet_address, source: "canfly" }
→ { handle, email }
```
（需要 API key 認證，限制只有 CanFly 後端可呼叫）

### 6.4 各自 World ID App + nullifier 互查

- BaseMail App ID: `app_7099aeba034f8327d91420254b4b660e`
- CanFly App ID: `app_ee5d4fa1aa655b4a3ba0641bb070ad67`
- 各自獨立的 App，但可透過 wallet address 做跨平台比對
- 不共用 nullifier（不同 App 的 nullifier 不同），改用 wallet 地址串接

---

## 七、CanFly DB Schema 對應

已在 Sprint 11 CAN-135 migration 0002 中加入：
```sql
ALTER TABLE users ADD COLUMN verification_level TEXT NOT NULL DEFAULT 'none';
-- 值: 'worldid' | 'wallet' | 'github' | 'email' | 'none'
```

Sprint 12 需加：
```sql
-- World ID 驗證記錄（參考 BaseMail 的 world_id_verifications 表）
CREATE TABLE IF NOT EXISTS world_id_verifications (
  id                 TEXT PRIMARY KEY,
  username           TEXT NOT NULL,           -- FK → users
  wallet             TEXT NOT NULL,
  nullifier_hash     TEXT NOT NULL UNIQUE,    -- 防一人多號
  verification_level TEXT NOT NULL DEFAULT 'orb',  -- 'orb' | 'device'
  world_id_version   TEXT NOT NULL DEFAULT 'v4',
  basemail_handle    TEXT,                    -- 如果有關聯的 BaseMail 帳號
  verified_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worldid_nullifier ON world_id_verifications(nullifier_hash);
CREATE INDEX IF NOT EXISTS idx_worldid_wallet ON world_id_verifications(wallet);
```

---

## 八、BaseMail 參考程式碼位置

| 檔案 | 用途 |
|------|------|
| `web/src/components/WorldIdVerify.tsx` | 前端 IDKit 元件（可直接複用邏輯） |
| `worker/src/routes/world-id.ts` | 後端 RP signature + verify + status API |
| `worker/src/rp-sign.ts` | RP signature 簽名工具函式 |
| `worker/src/routes/identity.ts` | 查詢 is_human 狀態整合 |

GitHub: https://github.com/dAAAb/BaseMail

---

## 九、實作順序

### Sprint 11（現在）
- CAN-139 做 Claim Profile **基本版**（GitHub OAuth + Wallet Sign）
- World ID 欄位已在 schema 中預留（`verification_level`）

### Sprint 12（疊加）
1. CanFly World ID 前端元件 + 後端路由
2. `world_id_verifications` 表 migration
3. BaseMail API 串接（查 is_human + 自動開帳號）
4. BaseMail 側新增 `status-by-wallet` + `auto-provision` API
5. Community 排序 World ID 加權

---

## 十、注意事項

- ⚠️ **Signing Key 是敏感資料** — 只放在 Cloudflare 環境變數，不進 git
- ⚠️ **CF Worker IP 被擋** — World ID `/v4/verify` 會對 CF IP 回 403，需從瀏覽器端驗證（BaseMail 已踩過此坑）
- ⚠️ **auto-provision API 需要認證** — 防止被濫用建帳號
- nullifier 去重要跨 BaseMail/CanFly 做（用 wallet address 串接，因為不同 App 的 nullifier 不同）
