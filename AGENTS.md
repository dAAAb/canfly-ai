# AGENTS.md — CanFly.ai 團隊指引

## 🔧 Paperclip API（本機）

所有 agent 都可以用 curl 直接操作 Paperclip API：

```bash
API="http://127.0.0.1:3100/api"
COMPANY="84078dce-87b6-419f-b769-e2ea7b764667"
PROJECT="cbf019b5-3fc3-4391-b826-b6e434cd0d00"
GOAL="cc30fd90-98db-492f-86bf-c564004b98f4"
```

### 建立 Issue
```bash
curl -s -X POST "$API/companies/$COMPANY/issues" \
  -H "Content-Type: application/json" \
  -d '{"title":"[Bug] 問題描述","priority":"high","projectId":"'$PROJECT'","goalId":"'$GOAL'","assigneeAgentId":"AGENT_ID","description":"詳細說明"}'
```

### Agent IDs
| Agent | ID | 職責 |
|-------|-----|------|
| CEO | `fa63af48-ab45-4ef0-bdf4-a54667efdab6` | 監督、分派、品質 |
| Dev | `c2e3505b-fb5a-4548-aa1e-7d15557cc343` | 程式碼、技術 |
| Content Writer | `1616d905-593f-4bbb-a7cf-1c5cf05a3951` | 文案、教學 |
| LittleLobster (CMO) | `b04ebe41-3618-41cb-a61f-7f985e5c9b83` | 影片、截圖、素材 |

### 新增 Comment
```bash
curl -s -X POST "$API/issues/ISSUE_ID/comments" \
  -H "Content-Type: application/json" \
  -d '{"body":"訊息內容","authorAgentId":"YOUR_AGENT_ID"}'
```

### 查看所有 Issues
```bash
curl -s "$API/companies/$COMPANY/issues" | python3 -c "import sys,json; [print(f\"{i['identifier']} {i['status']} {i['title']}\") for i in json.load(sys.stdin)]"
```

## 🔄 Sprint 工作流

見 `WORKFLOW.md`。

## 🌐 i18n 規則

### URL 策略（2026-03-11 寶博確認，所有人必須遵守！）

**混合策略：產品頁 = 語言前綴（SEO），用戶頁 = cookie（乾淨 URL）**

| 路由類型 | 範例 | 語言前綴 | 換語系方式 | 理由 |
|---------|------|---------|-----------|------|
| 首頁、Apps、教學 | `/zh-tw/apps`, `/zh-tw/learn/xxx` | ✅ `/:lang/` | URL 切換 | SEO 可索引 |
| Community 瀏覽 | `/zh-tw/community` | ✅ `/:lang/` | URL 切換 | SEO，UI 文字需翻譯 |
| Rankings 排行 | `/zh-tw/rankings` | ✅ `/:lang/` | URL 切換 | SEO 重要頁面 |
| Free Agents | `/zh-tw/free` | ✅ `/:lang/` | URL 切換 | SEO，UI 文字需翻譯 |
| **User Showcase** | `/@dAAAb` | ❌ 無前綴 | cookie `canfly_lang` | UGC 內容，跟 Twitter/GitHub 一樣 |
| **Agent Card** | `/@dAAAb/agent/LittleLobster` | ❌ 無前綴 | cookie `canfly_lang` | Agent 名稱是品牌，不翻譯 |

**規則：**
1. `/@` 開頭的路由**永遠不加語言前綴**（使用者分享的 URL 要乾淨）
2. 如果有人訪問 `/zh-tw/@username` → 自動 redirect 到 `/@username`（StripLangRedirect）
3. `/@` 頁面的 UI 語言由 cookie `canfly_lang` 決定，Navbar 語言切換器只寫 cookie 不改 URL
4. 其他所有頁面都要支援 `/:lang/` 前綴
5. 新增頁面時，**先判斷是 UGC 頁面還是產品頁面**，再決定要不要加語言前綴

**參考業界：**
- CoinMarketCap = 產品頁有前綴 ✅
- Twitter / GitHub / Instagram = 用戶頁無前綴，cookie-based ✅
- Google SEO 建議 = subpath 是多語言最佳實踐

**技術實作：**
- 有語言前綴的路由用 `<LangSync>` wrapper
- 無語言前綴的路由用 `<AutoLangSync>` wrapper（從 cookie 讀語言）
- `useLanguage()` hook 的 `switchLang()` 會自動判斷：有 prefix 就改 URL，沒有就只寫 cookie

### 翻譯檔

**每次修改或新增頁面內容時，必須同時更新三個語言檔：**
- `src/i18n/en.json` — 英文
- `src/i18n/zh-TW.json` — 繁體中文
- `src/i18n/zh-CN.json` — 簡體中文

**Content Writer 負責翻譯品質，Dev 負責確保 key 同步。**

### ⚠️ 語言切換 — 必須遵守的 async 規則（CAN-76 教訓）

翻譯檔是 **lazy import**（zh-TW.json / zh-CN.json 不在初始 bundle 中）。
任何切換語言的程式碼，**必須先載完翻譯再切語言**，否則會閃英文：

```typescript
import { loadLanguage } from '../i18n'

// ❌ 錯誤：翻譯還沒載完就切語言 → 閃英文
i18n.changeLanguage('zh-TW')

// ✅ 正確：先載翻譯，再切語言
await loadLanguage('zh-TW')
i18n.changeLanguage('zh-TW')
```

**已修好的三個路徑（不要改壞）：**
1. `App.tsx` → `LangSync` — useEffect + await loadLanguage
2. `hooks/useLanguage.ts` → useEffect — loadLanguage().then(changeLanguage)
3. `hooks/useLanguage.ts` → `switchLang` — await loadLanguage

**如果你新增了任何語言切換邏輯，一定要走這個 pattern！**

## 🚀 Git Push 流程（重要！）

**Agent 不可以自己 push！** 正確流程：

```
Agent 完成工作 → git commit → 回報 CEO → CEO review → CEO push
```

### Agent（Dev / Content Writer / LittleLobster）的職責：
1. 做完工作後 `git add` + `git commit`
2. **不要自己 `git push`**
3. 在 ticket comment 回報 CEO：「已完成，請 review」
4. 等 CEO review 通過

### CEO 的職責：
1. 收到 agent 回報後 review 程式碼品質
2. 驗證 `npx vite build` 通過
3. 驗證 i18n 三語 key 數量一致
4. 用 curl 抽查頁面功能
5. 通過後 `git push origin main`
6. 確認 Cloudflare 部署成功

### CEO 定期巡檢（每次 heartbeat 必做！）
1. `git log origin/main..HEAD` — 有沒有 commit 了但沒 push 的？
2. 有未 push 的 commits → review → 沒問題就 push
3. **不要讓 commits 堆積！每次巡檢都要清空**

---

## 🔍 自主巡檢（CEO 職責）

CEO 每次 heartbeat 除了監督進度，還要：
1. **巡檢網站**：用 curl 抓幾個頁面，看有沒有壞掉的連結、缺翻譯、404
2. **檢查 git diff**：看最近的 commit 有沒有問題
3. **自建 Bug ticket**：發現問題就自己建 issue，不用等人指派
4. **推動改善**：主動發現可以優化的地方，建 issue 提案
5. **檢查未 push commits**：`git log origin/main..HEAD`，有就 review + push
