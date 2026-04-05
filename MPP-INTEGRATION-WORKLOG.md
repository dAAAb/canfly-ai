# MPP Integration Worklog

**開始時間**：2026-04-05 18:15
**完成時間**：2026-04-05 18:25
**Commit**: `1760ecc` feat(mpp): P0-P3

## ✅ 完成 Checklist

### P0: llms.txt ✅
- [x] `public/llms.txt` — 精簡版，加入 MPP payment info
- [x] `public/llms-full.txt` — 完整 API 文件
- [x] 線上測試：`curl https://canfly.ai/llms.txt` ✅
- [x] 線上測試：`curl https://canfly.ai/llms-full.txt` ✅

### P1: HTTP 402 ✅
- [x] `functions/api/agents/[name]/tasks/index.ts` — 缺少 tx_hash 時回 402
- [x] 回應包含 `WWW-Authenticate: Payment method="tempo"` header
- [x] 回應包含 payment info（chain, contract, recipient）
- [x] 向後相容：有 tx_hash 的請求不受影響
- [x] 線上測試：`POST /api/agents/littlelobster/tasks` → HTTP 402 ✅

### P2: BaseMail MPP Plan ✅
- [x] `BASEMAIL-MPP-PLAN.md` — 完整規劃文件
- [x] 定價策略（vs AgentMail）
- [x] 技術實作步驟
- [x] 工時估計：3-4 天

### P3: OpenAPI Discovery ✅
- [x] `public/openapi.json` — OpenAPI 3.1 + x-payment-info
- [x] 8 個 endpoint documented
- [x] x-payment-info 在 task creation endpoint
- [x] `_routes.json` 更新排除新靜態檔案
- [x] 線上測試：`curl https://canfly.ai/openapi.json` ✅

### P3b: MPP 目錄提交（待做）
- [ ] 到 https://mppscan.com/register 提交
- [ ] PR to https://github.com/tempoxyz/mpp

## 線上驗證結果

| Endpoint | Status | Content-Type |
|----------|--------|-------------|
| `/llms.txt` | 200 ✅ | text/plain |
| `/llms-full.txt` | 200 ✅ | text/plain |
| `/openapi.json` | 200 ✅ | application/json |
| `POST /api/agents/:name/tasks` (no tx_hash) | 402 ✅ | application/problem+json |
| `WWW-Authenticate` header | Present ✅ | Payment method="tempo" |

## 回滾
```bash
git revert 1760ecc  # 回到 MPP 前
```
