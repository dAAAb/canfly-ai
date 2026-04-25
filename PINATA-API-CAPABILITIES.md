# Pinata Agents API — Capabilities & Integration Notes

> 最後更新：2026-04-19 | 維護者：小龍蝦 🦞
> 對應 issue：**CAN-302**
> 測試帳號：dablog@gmail.com（寶博的 Pinata FREE 帳號）
> 測試蝦：Nova（agentId `xobr1q73`，FREE tier，1 agent limit）

---

## ⚠️ 安全規則

**此文件不得包含任何實際 JWT、api_key、api_secret、gatewayToken、operator token、device id**。
所有範例都用 placeholder。
實際憑證存在主人主機 `~/.config/pinata/credentials.env`（chmod 600，非 git repo），由 CanFly 運維流程從用戶端自行提供。

---

## 🔑 認證模型（三層）

Pinata Agents 有 **三種不同 credential**，用途完全不同：

| Credential | 長度 | 用途 | Scope |
|-----------|------|------|-------|
| `api_key` + `api_secret` | 20 + 64 chars | **傳統 IPFS API**（files, groups, gateways） | 帳號層級 |
| **`JWT`** | 幾百 chars（3 段 `.` 分隔） | **Agents HTTP API** ⭐ 整合主力 | 帳號層級（scoped key） |
| **`gatewayToken`** | UUID | **WebSocket chat + operator connect** | 單一 agent |

### 重要教訓

- 傳統文件只教 JWT 給 IPFS API 用，但**同一把 JWT 對 Agents API 也有效**
- CLI `pinata auth` 只接受 JWT，不接受 api_key
- WebSocket chat **不能用 JWT**，必須用該 agent 的 `gatewayToken`
- `gatewayToken` 可以從 HTTP API `GET /v0/agents` 回應裡拿到

---

## 🌐 Host / Endpoint 拓樸

```
api.pinata.cloud            ← 傳統 IPFS/Files API（用 api_key+secret 或 JWT）
agents.pinata.cloud         ← Agents 管理 HTTP API（用 JWT）⭐ CanFly 整合主力
<agentId>.agents.pinata.cloud  ← 個別 agent 的 WebSocket（用 gatewayToken + 挑戰-回應）
app.pinata.cloud            ← Web Dashboard UI
```

---

## ✅ 已驗證可行的 HTTP API（全部回 200）

全部 endpoint 都用 `Authorization: Bearer <JWT>` header。
測試時間：2026-04-19 19:50 GMT+8

### Agents 資源

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/v0/agents` | 列出所有 agents（含 workspace fileManifest、channels、cron、devices、limits） |
| GET | `/v0/agents/{agentId}` | 取得單一 agent 完整資訊 |
| GET | `/v0/agents/{agentId}/tasks?includeDisabled=true` | 列出 agent 的 cron tasks |

### 帳號層級資源

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/v0/templates` | 列出可用 templates |
| GET | `/v0/skills` | 列出 skills library |
| GET | `/v0/secrets` | 列出帳號 global secrets（**Pinata 的設計特色**：secrets vault 是 global，不是 per-agent） |
| GET | `/v0/available-agent-versions` | 可用的 OpenClaw 版本 |

---

## ✅ Write Endpoints — 已驗證（2026-04-25 via `scripts/spike-pinata-create.ts`）

全部用 `Authorization: Bearer <JWT>`，spike 測試帳號：juchunko@gmail.com（FREE tier）

### Agent 生命週期

#### `POST /v0/agents` — 建 agent

**Body**：
```jsonc
{
  "name": "string",          // ✅ 必填，free-form（不是 slug；Pinata 會接受空格、特殊字元）
  "description": "string",   // 選填
  "vibe": "string",          // 選填，agent personality
  "emoji": "string"          // 選填
}
```

**Response 201**：
```jsonc
{
  "success": true,
  "agent": {
    "agentId": "xobr1q73",          // 8-char id，後續所有 ops 用這個
    "userId": "<uuid>",
    "name": "...",
    "description": null,            // echo back from body
    "vibe": null,
    "emoji": null,
    "gatewayToken": "<uuid>",       // ⚠️ 敏感，WebSocket 認證用，只在這裡回傳一次
    "createdAt": "2026-04-25T...",
    "status": "running",            // 馬上 running，不需要 polling
    "snapshotCid": "Qm...",
    "hostProvider": "pinclaw",
    "manifestJson": "{...}"         // 自動產生的 OpenClaw manifest
  }
}
```

**錯誤**：缺 `name` 回 400 ZodError；FREE 帳號超過 1 隻時應該回 quota 錯誤（未實測）。

> ⚠️ POST /v0/agents **不接受** `model`、`templateId`、`secretIds` 等欄位（沒看到對應 schema 鍵）。Model 由 attached secret 內的 `OPENROUTER_API_KEY` 等 env var 決定，template 機制目前僅在 Pinata UI 開放。

#### `DELETE /v0/agents/{agentId}` — 刪 agent

**Response 200**：`{"success":true,"message":"Agent xxx deleted","wasInRegistry":true,"r2ObjectsDeleted":N}`

### Secrets Vault（global, account-level）

#### `POST /v0/secrets` — 建 secret

**Body**（注意：**不是** `{provider, key}`，是純 env-var 形式）：
```jsonc
{
  "name": "OPENROUTER_API_KEY",   // ✅ 必須符合 env var 命名：[A-Z_][A-Z0-9_]*
  "value": "sk-or-v1-..."          // ✅ 真實 API key
}
```

**Response 201**：
```jsonc
{
  "success": true,
  "secret": {
    "id": "<uuid>",
    "userId": "<uuid>",
    "name": "OPENROUTER_API_KEY",
    "type": "secret",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**錯誤**：name 不符合 env var 格式 → `{"error":"name must be a valid environment variable name..."}` 400

**FREE tier 上限**：`secretLimit: 3`（從 GET /v0/secrets response 看到）

#### `DELETE /v0/secrets/{secretId}` — 刪 secret

**Response 200**：`{"success":true}`

### Attach Secrets to Agent

#### `POST /v0/agents/{agentId}/secrets` — 批量 attach

**Body**：
```jsonc
{ "secretIds": ["<secret-uuid>", "<secret-uuid>", ...] }
```

**Response 200**：`{"success":true,"attached":1}`

> ⚠️ **不是** `POST /v0/agents/{id}/secrets/{secretId}`（這個路徑回 404）。
> 必須走 `POST /v0/agents/{id}/secrets` + body `{secretIds: [...]}`。

Attach 後 `GET /v0/agents/{id}` 的 `secrets` 欄位會出現：
```jsonc
[{ "id": "...", "name": "OPENROUTER_API_KEY", "createdAt": "...", "synced": false }]
```
`synced: false` 代表還沒同步到容器；agent runtime 啟動後會變 true。

### Channels（Telegram 已驗，Slack/Discord/WhatsApp 未測）

#### `GET /v0/agents/{agentId}/channels` — 讀取所有 channel 設定

**Response 200**：
```jsonc
{ "telegram": null, "slack": null, "discord": null, "whatsapp": null, "version": "2026.3.8" }
```
（綁定後對應欄位會變物件而非 null）

#### `POST /v0/agents/{agentId}/channels/telegram` — 綁定 bot

**Body**：`{ "botToken": "123456789:ABC-DEF..." }`

**行為**：Pinata 同步呼叫 Telegram getMe 驗 token，**不是** async pairing flow。
- 成功 → 200，channel 立即啟用
- 假 token → `{"error":"Telegram rejected the bot token: Unauthorized"}` 400
- 缺 botToken → `{"error":"botToken is required (string)"}` 400

#### `DELETE /v0/agents/{agentId}/channels/telegram` — 解除綁定（未實測，預期 200/204）

---

---

## 💬 Chat 是走 WebSocket（不是 REST POST）

這是踩過的坑。`POST /v1/agents/{id}/chat` 返回 HTML（SPA route），不是 API。

### 正確路徑

```
wss://<agentId>.agents.pinata.cloud/chat
```

### 認證 = 挑戰-回應（Challenge-Response）

實測流程：
1. Client 開 WebSocket（帶 `Authorization: Bearer <gatewayToken>` 或 `?token=<gatewayToken>`）
2. Server 立刻送：
   ```json
   {"type":"event","event":"connect.challenge","payload":{"nonce":"<uuid>","ts":<epoch_ms>}}
   ```
3. Client 必須用 operator token 簽 nonce 回應（**我們還沒驗證這步正確 payload shape**）
4. 簽錯會被 close code `1008 invalid request frame`

### 這代表什麼給 CanFly

CanFly **不需要自己實作 WebSocket chat**。兩種可行路徑：

**A. HTTP chat endpoint（如果存在的話）**
- 可能是 `POST /v0/agents/{id}/chat` 或 `/v1/...`（需要再探測，binary strings 裡有 `ChatSendParams` 但沒看到明確路徑）
- 這最乾淨，能直接從 CF Worker proxy

**B. 走 channels 代替 chat UI**
- 讓用戶把 CanFly UI 當 Telegram channel 一樣配置（CanFly 發 webhook-style 訊息給 Nova 的 Telegram webhook）
- 蝦通過 Telegram 回覆，CanFly 攔截 bot token 的 webhook
- 稍微 hack 但可行

**C. 代理 WebSocket**
- CanFly Worker 擔任 WS relay，自己處理挑戰-回應
- 需要用戶授權 CanFly 拿 operator token（較複雜）

**推薦方案**：**選 A**（如果存在）或選 **B**（已知可行）。等 Pinata 官方 partnership 談成，他們可能給 CanFly 專屬的 REST chat endpoint。

---

## 🏗️ Agent 資料結構（從 Nova 抽樣）

```jsonc
{
  "agentId": "xobr1q73",
  "userId": "<pinata user uuid>",
  "name": "Nova",
  "description": "...",
  "emoji": "🧠",
  "vibe": "Creative problem-solver...",
  "gatewayToken": "<uuid>",   // ⚠️ 敏感，WebSocket 認證用
  "status": "running",        // 'running' | 'stopped' | ...
  "createdAt": "2026-03-07T03:26:56.355Z",
  "lastSync": "2026-04-19T11:37:52.309Z",
  "snapshotCid": "Qm...",     // workspace 的 IPFS CID（可 git clone 或 IPFS 拉）
  "fileManifest": "...",      // 多行字串，每行 "<size> <path>"
  "hostProvider": "pinclaw",  // Pinata 的自家容器 provider
  "agentVersion": "2026.3.2", // OpenClaw 版本
  "channelsJson": "{...}",    // Telegram/Slack/Discord 設定（JSON-in-string）
  "devicesJson": "{...}",     // 已配對的 operator devices（含 tokens ⚠️）
  "cronJobsJson": "{...}",    // Cron tasks
  "manifestJson": "{...}",    // Agent 的 manifest.json（model、secrets、tasks 宣告）
  "portForwardingJson": null, // Port forwarding rules
  "lifecycleJson": "{...}",   // Deployment lifecycle 狀態
  "deletedAt": null
}
```

### 頂層 metadata（quota / billing）

```jsonc
{
  "agents": [...],
  "agentLimit": 1,        // FREE tier 限 1 隻
  "timeCredits": null     // FREE tier runtime 剩餘（2hr/月）
}
```

**CanFly D1 可以直接映射**：
- `lobsters` table 存 `name / description / emoji / vibe / status / agentVersion`
- `nests` table 存 `hostProvider / agentVersion`、spec JSON 放 `agentLimit / timeCredits`
- `spec.pinata = {agentId, gatewayToken_hash, lastSync, snapshotCid}`（⚠️ gatewayToken 只存 hash 或加密，不存明文）

---

## 🔐 Secrets Vault 設計

Pinata secrets 是 **account-level global vault**（不是每隻蝦各自保管）。

### 支援 providers
- Anthropic（First-class）
- OpenAI（First-class）
- **OpenRouter**（First-class，CanFly V4 主力）
- **Venice**（First-class，但免費版沒 API）
- 其他（rawkey / custom）

### CanFly 整合路徑

**方案 X（推薦）**：用戶在 CanFly 貼一把 **OpenRouter free key** + 一把 **Pinata JWT** → CanFly 把 OpenRouter key push 到 Pinata secrets vault（以 CanFly 帳號 namespace）→ 自動 attach 到新建的 agent。

**方案 Y**：引導用戶自己去 Pinata Dashboard 連接 OpenRouter（一鍵 OAuth），CanFly 只負責 orchestration。

**方案 Z**：CanFly 作為中介人（proxy OpenRouter），不在 Pinata 存 key，但 Pinata 蝦要連到 CanFly Worker 做 API 轉發 → 繞太遠，不推薦。

---

## 📡 發現的隱藏 endpoints（從 binary strings 解析）

這些 pattern 證明有 API 但沒正式文件：

- `https://<host>/v0/agents/<id>` ✅ 已驗證
- `https://<host>/v3/files/<id>` - IPFS files
- `https://<host>/v3/groups/<id>` - file groups
- `https://<host>/v3/pinata/keys` - API key 管理
- `https://<host>/v3/ipfs/gateways` - 自訂 gateway
- `https://<host>/%s/agents%s` - admin agent endpoints
- `agents.pinata.cloud/%s/tasks/%s/toggle` - task toggle
- `/snapshots/sync?submittedBy=me` - snapshot 同步
- `/console/exec` - 容器內執行指令
- `wss://<agentId>.agents.pinata.cloud` - WebSocket chat

---

## 🚧 已知限制（對 CanFly 整合的意義）

| 限制 | 影響 | 緩解 |
|------|------|------|
| WebSocket chat 要挑戰-回應簽名 | 不能簡單 proxy | 用 HTTP chat（如存在）或走 Telegram channel |
| FREE tier 限 1 agent | CanFly 多蝦用戶會卡住 | 引導升級到 Pinata PICNIC 或轉 CanFly Zeabur |
| `timeCredits` 機制不透明 | 不知道怎麼從 API 查剩餘 runtime | 寫信問 Pinata 或 reverse engineer dashboard |
| Secrets 是 global vault | 多蝦用戶 secrets 會互相看到 | CanFly 要在 UI 層警告用戶 |
| gatewayToken 要避免外洩 | 洩露 = 別人可以接管蝦 | CanFly DB 只存 hash，原 token 只在 CF Worker 記憶體短暫使用 |
| Pinata 官方沒有 OAuth | 用戶要手動貼 JWT 給 CanFly | UX 設計要清楚告知風險；未來談合作拿 OAuth |

---

## 🎯 CanFly V4 Sprint 21 的 API 需求清單

基於以上驗證，Sprint 21 MVP 需要 proxy 這些 endpoint：

**Read**（100% 可行）：
- [ ] GET `/v0/agents` — 列用戶所有蝦
- [ ] GET `/v0/agents/{id}` — 詳細資訊
- [ ] GET `/v0/agents/{id}/tasks` — cron 任務
- [ ] GET `/v0/templates` — 可用模板
- [ ] GET `/v0/skills` — skills library

**Write**（已於 2026-04-25 spike 驗證 → 見上方「Write Endpoints — 已驗證」段）：
- [x] POST `/v0/agents` — body `{name, description?, vibe?, emoji?}`，回 `{success, agent: {agentId, gatewayToken, ...}}`
- [x] DELETE `/v0/agents/{id}` — 回 `{success: true, message, wasInRegistry, r2ObjectsDeleted}`
- [x] POST `/v0/secrets` — body `{name, value}`（**不是** `{provider, key}`），name 必須是 env var 名稱
- [x] DELETE `/v0/secrets/{id}` — 回 `{success: true}`
- [x] POST `/v0/agents/{id}/secrets` — body `{secretIds: [...]}`（**不是** path-style `/secrets/{secretId}`）
- [ ] POST `/v0/agents/{id}/tasks` — 建 cron task（V4 Phase A 不需要）
- [ ] POST `/v0/agents/{id}/tasks/{jobId}/run` — 立即跑（V4 Phase A 不需要）

**Channels**（已驗證 Telegram；Slack/Discord/WhatsApp 同 endpoint pattern 預期可行）：
- [x] GET `/v0/agents/{id}/channels` — 一次拿四個 channel 狀態
- [x] POST `/v0/agents/{id}/channels/telegram` — body `{botToken}`，**同步** call Telegram getMe 驗 token
- [ ] DELETE `/v0/agents/{id}/channels/telegram` — 預期 200，未實測

**Chat**（Sprint 21 Spike 決定走 HTTP 或 channel）：
- [ ] 先找 HTTP chat endpoint（`/v0/agents/{id}/chat` 或 `/v1/...`）
- [ ] 找不到再設計 Telegram bridge 方案

---

## 🦞 小龍蝦觀察

1. **Pinata Agents 的 API 設計比想像中完整** — 全生命週期都有 endpoint，不是只有建立/刪除
2. **Secrets global vault 是亮點也是陷阱** — 對 CanFly 整合有利（不用同步），但多蝦用戶要注意
3. **gatewayToken 分離 JWT 很聰明** — JWT 可以 rotate，蝦連線不受影響
4. **WebSocket 挑戰-回應讓 ClaudeAI chat 比較難外部接** — 可能是 Pinata 想保護他們的 chat UI 獨特性
5. **`console/exec` endpoint 代表 CanFly 可以直接在 Pinata 蝦上跑指令** — 這對「CanFly PM 蝦遠端調度」很有價值

---

## 🔗 相關檔案

- `V4-PLAN.md` — V4 漏斗策略
- `partnerships/pinata-partnership-draft.md` — 合作提案 email
- CAN-302 — Paperclip issue
- `~/.config/pinata/credentials.env` — 實際 JWT（⚠️ 不入 repo）
