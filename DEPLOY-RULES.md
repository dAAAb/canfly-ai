# DEPLOY-RULES.md — 部署 + 驗證規則（寶博指示，所有 Agent 必須遵守）

## 每張票完成前必須做

1. **Build** — `npm run build` 確認無 error
2. **Deploy** — `CLOUDFLARE_API_TOKEN="$(cat ~/.config/canfly/cf-api-key)" npx wrangler pages deploy dist --project-name canfly-ai`
3. **DB Migration** — 如果有新 migration 檔：
   ```bash
   CLOUDFLARE_API_TOKEN="$(cat ~/.config/canfly/cf-api-key)" npx wrangler d1 execute canfly-community --remote --file migrations/XXXX.sql
   ```
4. **Production 驗證** — curl API 端點確認回正確結果，開瀏覽器/curl 確認頁面正常
5. **在 issue comment 回報驗證結果** — 包含 curl 輸出或截圖

## ❌ 不合格

- 只 commit 不 deploy = **NOT DONE**
- Deploy 了但沒驗證 = **NOT DONE**
- 驗證發現 500/crash = 立即修，不能標 done

## CEO 巡檢

CEO 每次 heartbeat 要：
1. 確認 idle agent 立刻 checkout 下一張 backlog ticket
2. Review 已 done 的票是否有 deploy + verify 記錄
3. 沒有 → reject，重新 checkout 回 Dev

## 驗證腳本（每次部署後必跑！）

```bash
bash scripts/verify-production.sh
```

如果有任何 ❌ FAILED → **立即修復，不能放著不管。**
