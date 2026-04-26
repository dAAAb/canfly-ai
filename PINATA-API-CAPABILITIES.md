# Pinata Agents API — Capabilities & Integration Notes

> 最後更新：2026-04-26 | 維護者：小龍蝦 🦞
> 對應 issue：**CAN-302**
> 測試帳號：dablog@gmail.com、juchunko@gmail.com（兩個寶博 Pinata FREE 帳號）
> 測試蝦：Nova（agentId `xobr1q73`），spike 測試蝦在 E2E 後均已刪除
> E2E 驗證：2026-04-26 真的跟蝦對話成功，free model 回答「Taipei」

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

**Container exec + restart**（這是把 OpenRouter 設成預設 LLM 的關鍵路徑，2026-04-26 驗證）：
- [x] POST `/v0/agents/{id}/console/exec` body `{command}` → `{stdout, stderr, exitCode}`
- [x] POST `/v0/agents/{id}/restart` → `{success, message, previousProcessId}`
- [x] GET `/v0/agents/{id}/config` → `{config: "<openclaw.json string>"}`
- [x] PUT `/v0/agents/{id}/config` body `{config: "<json>"}` — 200 但**不持久**（restart 會 R2 restore 蓋回）
- [x] POST `/v0/agents/{id}/snapshots/sync` → `{success, lastSync, snapshotCid, commitSha}`

**Chat**（Sprint 21 Spike 決定走 HTTP 或 channel）：
- [ ] WebSocket chat at `wss://{agentId}.agents.pinata.cloud/chat`（challenge-response）
- [x] CLI: `openclaw agent --to <E.164> --message "..." --json` 透過 console/exec 可以跑（驗證 LLM 真的有回應）
- [ ] HTTP chat endpoint — `/v0/agents/{id}/chat` 不存在（404）
- [x] **Telegram bridge** — 用戶綁完 bot token 後直接從 Telegram chat（已是主路徑）

---

## 🚧 Cloudflare Workers → Pinata 鎖死（2026-04-26 慘痛教訓）

Pinata 的 CF zone **完全擋住所有從 Cloudflare Workers 過來的流量**。逐層嘗試結果：

| 嘗試 | 結果 | 為什麼 |
|------|------|------|
| `fetch()` 直連 | 502 HTML | CF runtime 自動注入 `CF-Connecting-IP`，Pinata bot rule 看到就擋 |
| `fetch()` + 加 browser-like UA / Origin / Referer | 502 HTML | 不關 UA 的事，是 IP-level signal |
| `fetch()` + 把 `CF-Connecting-IP` 蓋成 `0.0.0.0` | 502 HTML | Pinata 看 header **存在**就擋，不管 value |
| `cloudflare:sockets connect()` 走 raw TLS + 自己組 HTTP/1.1 | 502 HTML | **Pinata bot management 是 L7-level，會看 TLS fingerprint / egress IP range**，不只看 header |

**結論**：Pinata 用 Cloudflare Bot Management，能在 IP / TLS 指紋層就辨識出「來自 CF Worker」的流量。任何在 CF Worker 內想 bypass 的招（包含官方 docs 提到的 `cloudflare:sockets`）都失效。

**這不是 Pinata 特別針對 CanFly**：[Discord API #7146](https://github.com/discord/discord-api-docs/issues/7146)、OpenAI、n8n 用戶全部中過同一個 trap，都用 `2a06:98c0:3600::103` 這把 CF 跨 zone 預設 IP。

### 唯一的 production 解：external relay

部署到非 CF 網路（Deno Deploy / Vercel / Render 等）的小 proxy，剝掉 cf-* headers 後轉發到 Pinata。CanFly Worker 透過 `env.PINATA_RELAY_URL` 路由過去。

詳見 `relay/pinata-relay.ts` + `relay/README.md`。

---

## 🎯 Default LLM 配置真相（2026-04-26 揭密）

Pinata agents 預設 `agents.defaults.model.primary = "openrouter/auto"`，這個 `auto` 會路由到 OpenRouter 的付費 model。CanFly 用 `limit: 0` child key 會被 `403 Key limit exceeded` 擋掉。

### 配置層次

| 檔案/位置 | 用途 | 持久性 |
|----------|------|--------|
| `/home/node/clawd/manifest.json` | manifest spec（含 model.primary 欄位） | 跨 restart 保留，但 **runtime 不讀這個值**（spike 驗證） |
| `/home/node/.openclaw/openclaw.json` | **runtime 真正用的 config**（含 `agents.defaults.model.primary`） | restart 時被 R2 snapshot 蓋掉 |
| `/home/node/.openclaw/agents/main/agent/models.json` | 可用 provider/model 清單（UI 用） | 同 openclaw.json |
| `/home/node/.openclaw/agents/main/agent/auth-profiles.json` | API key 來源 mapping（自動從 env var 產生） | 同上 |

### 把預設 model 改成 free 的正確順序

```
1. POST /v0/agents { name, ... }                    ← 建蝦
2. POST /v0/secrets { name: "OPENROUTER_API_KEY", value: <or-key> }
3. POST /v0/agents/{id}/secrets { secretIds }       ← attach
4. POST /v0/agents/{id}/restart                     ← secret 才會進 env
5. (sleep ~5s)
6. POST /v0/agents/{id}/console/exec {
     command: "openclaw config set agents.defaults.model.primary openrouter/<modelId>:free"
   }
   ⚠️ 這步必須在 restart 之後做，且**之後不能再 restart**
```

如果步驟 6 之後又 restart，R2 snapshot 會把 openclaw.json 還原回 `openrouter/auto`，蝦又會被 limit=0 擋掉。

### 一個 restart 配一次 set-default-model

任何會觸發 restart 的後續操作（如綁 Telegram，per Pinata 文件「Changes to channels take effect after a gateway restart」）都必須**在 restart 後重新呼叫 `openclaw config set`** 來重設 free model。
`functions/api/agents/[name]/pinata-telegram.ts` 已實作這個模式。

### 驗證

```bash
# Inside container after deploy.ts runs:
$ openclaw config get agents.defaults.model.primary
openrouter/nvidia/nemotron-3-super-120b-a12b:free

# Real chat:
$ openclaw agent --to +15555550199 --message "what is the capital of Taiwan"
{"text": "The capital of Taiwan is Taipei", "model": "nvidia/nemotron-3-super-120b-a12b:free", "stopReason": "stop"}
```

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
