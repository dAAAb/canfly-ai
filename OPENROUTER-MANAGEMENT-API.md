# OpenRouter Management API — Capabilities & Integration Notes

> 最後更新：2026-04-25 | 維護者：小龍蝦 🦞
> 對應 issue：**CAN-302（V4 Phase A）**
> 配套檔案：`PINATA-API-CAPABILITIES.md`、`V4-PLAN.md`

---

## ⚠️ 安全規則

**此文件不得包含任何實際 management key、provisioned key、user key**。
所有範例都用 placeholder。
實際憑證存在主人主機 `~/.config/openrouter/credentials.env`（chmod 600，非 git repo），由 CanFly 運維流程從用戶端自行提供。

> CanFly 帳號 management key 屬於 **legislator workspace** `b378fddc-558c-5607-94eb-bb8224ade34b`（從 list 回應觀察到，與既有 `Free Canfly Claw`、`MiroFish`、`Aifferent API - Prod` 等 key 同 workspace）。

---

## 🎯 為什麼研究這個

V4 Phase A 想做「創 Pinata 蝦時自動帶 OpenRouter free model」。原本要請用戶自己去 OpenRouter 註冊+貼 key。研究目標：用 management API **代替用戶建子 key**，並確保子 key **只能用 free model、不能花錢、用戶不能升級成付費**。

實測結論（2026-04-25）：**完全可行。`limit: 0` 是關鍵開關**。

---

## 🔑 認證模型

OpenRouter 的 key 系統有兩種角色：

| Key 類型 | 能做什麼 | 不能做什麼 | Scope |
|---------|---------|-----------|-------|
| **Management key** | `/v1/keys/*` 全部管理動作（list/create/get/PATCH/delete） | ❌ 不能呼叫 chat completions | 帳號層級 |
| **Provisioned (child) key** | 呼叫 `/v1/chat/completions`、其他 inference endpoints | ❌ 不能 list/get/PATCH/delete 任何 key（包含自己） | 帳號層級（受 limit 約束） |

### 實測：子 key 嘗試管理動作

| 動作 | 結果 |
|------|------|
| `GET /v1/keys`（list） | `401 Invalid management key` |
| `GET /v1/keys/{ownHash}`（get self） | `401 Invalid management key` |
| `PATCH /v1/keys/{ownHash}`（escalate own limit） | `401 Invalid management key` |

→ **子 key 完全無法升級自己。所有限制由 management key 持有者（CanFly Worker）獨佔控制**。

---

## 🌐 Endpoint 清單

Base URL：`https://openrouter.ai/api/v1/keys`
Header：`Authorization: Bearer <MANAGEMENT_KEY>`

| Method | Endpoint | 用途 |
|--------|----------|------|
| GET | `/` | 列出最近 100 把 key（支援 `?offset=` 分頁） |
| POST | `/` | 建立新 key（只此一次回傳完整 key 字串） |
| GET | `/{keyHash}` | 取得單一 key 資料 |
| PATCH | `/{keyHash}` | 更新 key（rename / 改 limit / disable / 改 reset frequency） |
| DELETE | `/{keyHash}` | 刪除 key |

---

## 🏗️ 建立 key 的 schema

### Request 欄位

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `name` | string | ✅ | Key 名稱（自由命名） |
| `creator_user_id` | string\|null | — | 組織擁有的 key 才有意義（標誰建的） |
| `expires_at` | string (ISO8601 UTC)\|null | — | Key 自動失效時間 |
| `limit` | number\|null | — | **USD 花費上限。**`0` = 不允許任何花費 |
| `limit_reset` | `'daily'\|'weekly'\|'monthly'\|null` | — | Limit 重置週期 |
| `include_byok_in_limit` | boolean | — | BYOK 是否計入 limit（CanFly 用不到 BYOK，留 false） |
| `workspace_id` | UUID | — | 指定 workspace |

### Response 結構

```jsonc
{
  "data": {
    "hash": "21ec6d97...260f2cc0",       // 後續 PATCH/DELETE 用這個
    "name": "canfly-test-limit-zero",
    "label": "sk-or-v1-a42...787",        // 列表時看得到的 mask
    "disabled": false,
    "limit": 0,
    "limit_remaining": 0,
    "limit_reset": null,
    "include_byok_in_limit": false,
    "usage": 0,
    "usage_daily": 0,
    "usage_weekly": 0,
    "usage_monthly": 0,
    "byok_usage": 0,                      // BYOK 各週期 usage（multi-row 略）
    "created_at": "2026-04-25T13:52:51.454769+00:00",
    "updated_at": null,
    "expires_at": null,
    "creator_user_id": null,
    "workspace_id": "b378fddc-558c-5607-94eb-bb8224ade34b"
  },
  "key": "sk-or-v1-a42...787"           // ⭐ 完整 key 只在 POST 時回一次，之後再也拿不到
}
```

> ⚠️ **`key` 只在 POST 時返回一次**。CanFly Worker 必須在這個 response 之後立刻：
> 1. 加密存進 D1（建議 AES-256-GCM）或 push 到 Pinata Secrets Vault；
> 2. 把 `data.hash` 一併存著，因為日後管理（disable/delete/raise limit）只用 hash，不用 key 字串。

---

## 🧪 關鍵實測：`limit: 0` 的真正行為

**疑問**：`limit: 0` 是「全部擋」還是「只擋花錢的」？

**實測**（2026-04-25，建一把 `limit: 0` 子 key）：

| 測試 | Model | 結果 | 結論 |
|------|-------|------|------|
| Free model | `meta-llama/llama-3.3-70b-instruct:free` | `429` upstream rate-limited（auth + limit gate **通過**） | ✅ Free model 可用 |
| Paid model | `anthropic/claude-3.5-haiku` | `403 Key limit exceeded (total limit)` | ✅ 付費 model 被擋 |

**結論**：`limit: 0` 是「只擋花錢的」。Free model（`pricing.prompt = "0"`）的呼叫不消耗 limit，所以通過。**這正是我們要的設計**。

> 📝 上游 429 不是 OpenRouter 擋，是 free model 的 provider 自身 rate limit（per-day / per-min quota）。要靠多 model fallback 緩解（見後文）。

---

## 📦 Free model 過濾（從 `/api/v1/models`）

### Schema

```jsonc
{
  "id": "tencent/hy3-preview:free",
  "canonical_slug": "tencent/hy3-preview-20260421",
  "hugging_face_id": "tencent/Hy3-preview",
  "name": "Tencent: Hy3 preview (free)",
  "created": 1776878150,
  "description": "...",
  "context_length": 262144,
  "architecture": {"modality": "text->text", "input_modalities": [...], "output_modalities": [...], "tokenizer": "Other", "instruct_type": null},
  "pricing": {"prompt": "0", "completion": "0"},
  "top_provider": {"context_length": 262144, "max_completion_tokens": 262144, "is_moderated": false},
  "expiration_date": "2026-05-08",        // ⭐ 「going away」唯一欄位
  "supported_parameters": ["frequency_penalty", "include_reasoning", ...]
}
```

### 過濾規則

```
isFree = pricing.prompt === "0"
isGoingAway = expiration_date != null
shouldOffer = isFree && !isGoingAway
```

### 即時盤點（2026-04-25）

- Total free models：**30**
- 有 `expiration_date`（要過濾掉）：**3**
  - `inclusionai/ling-2.6-flash:free` → 2026-04-29
  - `inclusionai/ling-2.6-1t:free` → 2026-04-30
  - `tencent/hy3-preview:free` → 2026-05-08
- 乾淨 free models：**27**

### Top 5 候選（按 `created` desc，無 expiration_date）

1. `nvidia/nemotron-3-super-120b-a12b:free`（262K ctx）
2. `google/gemma-4-31b-it:free`（262K ctx）
3. `google/gemma-4-26b-a4b-it:free`（262K ctx）
4. `qwen/qwen3-next-80b-a3b-instruct:free`（262K ctx）
5. `openai/gpt-oss-120b:free`（131K ctx）

---

## ⚠️ 「Top Weekly」排序的缺口

OpenRouter 網頁 `?order=top-weekly` 是按 token usage 排，**API 沒有這個欄位**。三個解法：

| 方案 | 優 | 劣 |
|------|---|---|
| **A. CanFly D1 維護一份精選 5 名單** | 完全可控、可加品牌策略 | 需要每月人工 review |
| B. Reverse engineer frontend stats endpoint | 自動更新 | 未文件化、可能違 ToS、不穩 |
| C. 按 `created` desc + 知名 provider 白名單 | 自動且穩定 | 可能漏掉小 provider 的好 model |

**推薦 A**：D1 加 `featured_free_models` table，每月 review 一次。CanFly Worker 把 OpenRouter `/v1/models` 結果跟這份白名單交集（同時剔除已加上 `expiration_date` 的）。

---

## 🛠️ 完整生命週期（V4 Phase A 實作對照）

### 創 Pinata 蝦時

```
1. 用戶按「🪅 創 Pinata FREE 蝦」
2. CanFly Worker:
   POST https://openrouter.ai/api/v1/keys
   Authorization: Bearer <CANFLY_OR_MANAGEMENT_KEY>
   {
     "name": "canfly-{userId}-{lobsterId}",
     "limit": 0,
     "include_byok_in_limit": false
   }
   → 拿到 { data.hash, key }
3. 加密存 D1:
   lobsters.ai_provider = 'openrouter-canfly-managed'
   lobsters.ai_config = { keyHash, keyLabel, freeModelId, encryptedKey }
4. push 到 Pinata Secrets Vault (POST /v0/secrets) attach 到該 agent
5. UI 顯示 free model 下拉（從 D1 featured_free_models ∩ /v1/models 過濾）
6. 用戶選的 freeModelId 寫進 lobster manifest 的 model 欄位
```

### 用戶要升級 / CanFly 要 rotate

```
- 升級到付費：PATCH /v1/keys/{hash} { "limit": <新額度> }
- 改名：     PATCH /v1/keys/{hash} { "name": "..." }
- 暫停：     PATCH /v1/keys/{hash} { "disabled": true }
- 撤銷：     DELETE /v1/keys/{hash}
```

### 蝦被刪 / 用戶離開

```
DELETE /v1/keys/{hash}
→ 立刻 404 on subsequent GET（已驗證）
```

---

## 🔐 安全考量

| 風險 | 緩解 |
|------|------|
| Management key 外洩 = 攻擊者可代開無限子 key 燒 CanFly OpenRouter 帳號 | 只存於 Worker secrets，不入 repo；定期 rotate；OpenRouter dashboard 監控異常 key 數量 |
| 子 key 在 D1 plaintext = 資料庫被讀就全洩 | AES-256-GCM 加密（CanFly Zeabur 已有同 pattern，見 `project_canfly_zeabur_encryption`） |
| Free model 被某用戶 abuse 撞到 OpenRouter free quota，影響其他用戶 | （a）每用戶建獨立子 key，OpenRouter rate limit 是 per-key not per-account；（b）監控 `usage_daily` / `usage_weekly`；（c）退階 BYO |
| 用戶離開但 key 沒清 → CanFly 帳號裡長期累積 zombie key | 對應 lobster `deletedAt` 時 cascade DELETE 子 key |
| `limit: 0` 行為被 OpenRouter 改 | 文件化監控 + 自動測試 canary key 每日確認行為 |

---

## 🚧 待驗證 / 下一步可探的東西

- [ ] `expires_at` 實測（自動 disable 還是要手動 PATCH）
- [ ] `creator_user_id` 是否能在 dashboard 分群統計
- [ ] Management key 自身被 rotate 後，已創出的子 key 是否還有效
- [ ] 是否有「per-key model allowlist」（目前看 schema 沒有）— 若未來開放，可以從「靠 limit=0 防呆」升級成「明確只能跑 free model 列表」
- [ ] BYOK 模式（`include_byok_in_limit`）對未來 Layer 1 升級路徑是否有幫助
- [ ] 高併發下 `POST /v1/keys` 速率限制（沒文件化，但批量建 key 時要小心）

---

## 🔗 相關檔案

- `V4-PLAN.md` — V4 漏斗策略（Layer 0 = Pinata FREE + OpenRouter FREE）
- `PINATA-API-CAPABILITIES.md` — Pinata Agents API（Secrets Vault 是首要 attach 目標）
- `V3-ORCHESTRATION-ARCH.md` — D1 schema（`lobsters.ai_provider` 新增 `'openrouter-canfly-managed'`）
- `~/.config/openrouter/credentials.env` — 實際 management key（⚠️ 不入 repo）

---

## 🦞 小龍蝦結論

1. **Management API 設計乾淨**：management key 跟 inference key 完全分權，management 不能 inference、inference 不能 management — 沒有 escalation 路徑。
2. **`limit: 0` 是這個整合的命脈**：它讓「只給 free model」這件事不用靠 model allowlist（schema 沒有），就能用 USD 花費這個維度卡住。
3. **Free model 的 `expiration_date` 一定要過濾**：今天的列表裡就有 3 個 4-5 月底會消失的，預設帶這些用戶會踩坑。
4. **「Top Weekly」沒有 API**，CanFly 自己維護一份精選清單比逆向工程穩。
5. **整體可行**，可以直接進 V4 Phase A 設計階段。
