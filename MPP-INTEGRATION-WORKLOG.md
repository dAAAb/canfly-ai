# MPP Integration Worklog

**開始時間**：2026-04-05 18:15
**目標**：P0-P3 MPP 整合
**回滾方案**：每步 commit，隨時 `git revert`

## Checklist

### P0: llms.txt 更新（加入 MPP 相關資訊 + 付費 API 說明）
- [ ] 更新 `public/llms.txt` 加入 MPP payment info
- [ ] 加入 `public/llms-full.txt` 完整版
- [ ] Build + 測試
- [ ] Commit: `feat(mpp): P0 — llms.txt with MPP payment discovery`

### P1: HTTP 402 標準回應
- [ ] 付費 task endpoint 加 402 header（向後相容）
- [ ] agent-card.json 加入 MPP payment method 資訊
- [ ] Build + 測試
- [ ] Commit: `feat(mpp): P1 — HTTP 402 payment required standard`

### P2: BaseMail 接入 MPP（規劃，不在此 repo 實作）
- [ ] 撰寫 BaseMail MPP 整合規劃文件
- [ ] Commit: `docs(mpp): P2 — BaseMail MPP integration plan`

### P3: 提交 MPP 目錄
- [ ] 建立 `public/openapi.json` (x-payment-info)
- [ ] 準備 MPPScan 提交資訊
- [ ] Commit: `feat(mpp): P3 — OpenAPI discovery + MPP directory submission`

### 部署
- [ ] `npm run build` 確認無錯
- [ ] 本地 preview 測試
- [ ] Push to main → CF Pages auto-deploy
- [ ] 線上驗證 canfly.ai/llms.txt、/openapi.json

## 回滾
```bash
# 回到 MPP 之前
git log --oneline  # 找到 8120bb2 (MPP 研究報告之前的 commit)
git revert HEAD~N..HEAD  # 或 git reset --hard 8120bb2
```
