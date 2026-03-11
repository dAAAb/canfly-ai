# CanFly 版本管理 & 回滾指南

## 版本歷史

| 版本 | Git Tag | 日期 | 說明 |
|------|---------|------|------|
| v0.5 | `v0.5` | 2026-03-11 | Pre-community baseline（現有功能完整） |
| v1.0 | `v1.0` | TBD | Flight Community + Agent Cards + Rankings |

## 回滾到 v0.5

### 1. Code rollback
```bash
cd ~/clawd/canfly-ai
git checkout v0.5
```

### 2. Deploy v0.5 to Cloudflare Pages
```bash
npx vite build
CLOUDFLARE_API_TOKEN=$(cat ~/.config/canfly/cf-api-key) \
CLOUDFLARE_ACCOUNT_ID=3f1f83a939b2fc99ca45fd8987962514 \
npx wrangler pages deploy dist --project-name=canfly-ai
```

### 3. Cloudflare D1 cleanup（v1.0 新增的）
v1.0 會新增 D1 database，v0.5 不使用。回滾時：
- D1 database 可以保留不刪（不影響 v0.5 運行）
- 如果要完全清除：`wrangler d1 delete canfly-community`
- ⚠️ 刪除 D1 = 所有 community 資料永久消失

### 4. Cloudflare Pages Functions
v1.0 會新增 `functions/api/community/` 下的 API endpoints。
v0.5 不包含這些 functions — deploy v0.5 code 就會自動移除。

### 5. 新增的路由（v1.0）
以下路由是 v1.0 才有的，回滾後會變成 404：
- `/@{username}` — User Showcase
- `/@{username}/agent/{name}` — Agent Card
- `/free` — Free Agents
- `/free/agent/{name}` — Free Agent Card
- `/rankings` — Rankings
- `/rankings/brand/{name}` — Brand pages
- `/community/register` — 註冊表單

v0.5 保留的路由：
- `/u/{username}` — 舊版 mock profile（仍有效）
- `/community` — 舊版 community page

### 6. Environment Variables / Bindings
v1.0 會新增：
- D1 database binding: `DB`
- 可能新增 KV namespace for rankings cache

回滾時這些 binding 可以保留（不影響 v0.5），或在 CF Dashboard 移除。

---

## 注意事項
- **永遠先 `git tag` 再開始新 sprint**
- **每個 sprint 結束都 tag 一次**（如 `v0.6`, `v0.7`...）
- **D1 migration 要寫 up 和 down**，確保可逆
