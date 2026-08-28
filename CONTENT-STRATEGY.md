# CanFly.ai 全站分析 · 商業／內容策略 · 自動化上稿計畫

> 版本：2026-08-28 · 對應大改版 Phase 1（branch `cursor/site-redesign-seo-aieo-0b02`）
> 本文件是「全站前後端掃描 + 商業/內容策略 + 定時上稿自動化」的總結報告，
> 也是後續 Phase 2/3 的執行藍圖。**大小寫決策**、**SEO/AIEO 現況與缺口**、
> **內容更新頻率建議**、**Cursor / Grok 自動化排程設定**都在這裡。

---

## 0. TL;DR（先讀這段）

- **品牌大小寫**：全站原本 `CanFly` / `Canfly` / `CanFly.ai` 混用。已統一為
  **`CanFly.ai`（wordmark）+ `CanFly`（內文駝峰）**。我的建議是**保留駝峰 CanFly**
  而非 `Canfly`，理由見 §2.1。大小寫本身不影響 Google 排名，**一致性**才是 SEO 重點。
- **Phase 1 已完成（本 PR，已測試不破壞功能）**：品牌/metadata/JSON-LD 一致性、
  首頁 Zen 天空氛圍、robots 對 AI 爬蟲開放、llms.txt 更新、sitemap 補齊。
- **內容更新頻率建議（§5）**：採「**核心週更 + 長青月度深耕 + 資料每日/每週自動刷新**」
  的混合節奏，而非固定單一頻率。詳見節奏表。
- **自動化（§6）**：選題 SOP 在 `content/SCAN.md`，inbox 在 `content/QUEUE.md`。
  每日掃描必須：沿用上次找題策略、看 GA／analytics 報告、去重重排、至少新增 1 項。
  週二／五 Content Writer 只拿「下一步寫」第 1 名。產稿仍走 git commit → CEO review → push。

---

## 1. 全站架構掃描（前端 + 後端）

### 1.1 技術棧
| 層 | 技術 |
|---|---|
| 前端 | React 19 + Vite 7 + Tailwind 4 + React Router 7（SPA，lazy-loaded pages）|
| i18n | i18next（en / zh-TW / zh-CN，lazy bundle，1306 keys 三語同步）|
| 後端 | Cloudflare Pages Functions（`functions/api/**`）+ D1（SQLite）+ R2 |
| 身分 | Privy SDK + World ID；錢包漸層識別；Trust Badge 分級 |
| 金流 | USDC on Base + MPP（Machine Payments Protocol）+ Escrow 合約 |
| 部署 | Cloudflare Pages（push main 自動部署）|

### 1.2 使用者旅程與「兩種用戶」
CanFly 最特別之處：**同一份內容同時服務人類與 AI Agent**。
- **人類**：`/`（首頁）→ `/apps`（工具目錄）→ `/learn/:slug`（教學）→ `/rankings`（排行）
  → `/community`（社群）→ `/u/:username`（個人展示頁）。
- **AI Agent**：`/llms.txt`、`/llms-full.txt`、`/openapi.json`、
  `/api/agents/:name/agent-card.json`（A2A 標準）→ 自我註冊、抓資料、agent-to-agent 交易。

### 1.3 內容六大支柱（對應使用者需求）
| 支柱 | 現況頁面 | 缺口／機會 |
|---|---|---|
| a. 介紹 | `/`, `VisionSection`, `/get-started` | 首頁氛圍已升級；缺「AI Agent 是什麼」常青詞條頁 |
| b. 安裝教學 | `/learn/:slug`（ollama, zeabur, elevenlabs, heygen…）| 教學數量偏少，需系統化擴充（見 §5）|
| c. 軟硬體介紹 | `/apps`, `/rankings`（skills/hardware/models）| 排行資料偏舊、UX 不清楚「這是什麼」（Phase 2）|
| d. 文章 | `/blog`（目前僅 3 篇）| **內容量最大缺口**，是自動化上稿的主戰場 |
| e. 導購 | 產品頁 affiliate（ElevenLabs 22%、HeyGen 20%、Zeabur、Amazon）| 導購與教學未充分交叉連結 |
| f. 社群 | `/community`, `/free`, `/u/:username`, Agent Card | 版面雜亂（Phase 2）；人類+Agent 雙軌已具雛形 |
| +外部連接 | Zeabur / Pinata 一鍵部署 | 已在 llms.txt 標註；前端導引可再強化 |

---

## 2. SEO 現況、已修正、與建議

### 2.1 品牌大小寫決策（回答寶博的問題）
**現況**：`<title>` 用 `CanFly`、OG/Twitter/JSON-LD 用 `Canfly`、nav 用 `Canfly`、
內文與 README 用 `CanFly.ai`／`CanFly`／`Canfly` 混雜。

**我的建議：統一為 `CanFly.ai`（正式 wordmark）＋ `CanFly`（內文駝峰）**，理由：
1. **SEO 面**：Google 對品牌字大小寫不敏感（搜尋不分大小寫），真正影響的是
   **entity 一致性**——`<title>` / OG / Twitter / JSON-LD `name`/`alternateName` /
   頁面可見品牌必須一致，才利於知識圖譜/品牌 SERP 識別。原本的混用會稀釋這個訊號。
2. **品牌面**：駝峰 `CanFly` 保留了「**Can Fly**」的雙關與 slogan「Now You Can Fly」；
   `Canfly` 讀起來變成一個無意義單字，弱化了品牌故事。駝峰 wordmark 也是業界慣例
   （YouTube、GitHub、PayPal、OpenAI）。
3. domain `canfly.ai` 一律小寫（網域不分大小寫），與 wordmark 無衝突。

> 若您最終仍偏好 `Canfly.ai`：這是**一行可反轉**的決定（集中在 metadata/nav/i18n），
> 但無論選哪個，**請全站只用一種**。Phase 1 已把一致性做好。

### 2.2 Phase 1 已修正
- `index.html`：title / OG / Twitter 一致為 `CanFly.ai`，補 `og:site_name`、`og:locale`（en/zh_TW/zh_CN）。
- **JSON-LD 強化**：Organization + WebSite 用 `@id` graph 串接、`ImageObject` logo（1200×630）、
  `alternateName`、`publisher`、agentic 導向的 `knowsAbout`、`sameAs`（GitHub）。
- `useHead` fallback title、頁面 meta title、產品/硬體頁 JSON-LD `name` 全部統一。
- i18n 三語內文的 `Canfly` → `CanFly`（保留 `productsOnCanfly` key 不動）。
- `sitemap.xml` 補上 `/rankings`、`/free`（含 hreflang）。

### 2.3 後續 SEO 建議（Phase 2）
- **每頁 JSON-LD 覆蓋**：`ProductPage`、`HardwareComparePage`、`CommunityPage` 已有；
  建議補 `TutorialPage`（`HowTo` + `FAQPage`）、`BlogPostPage`（`Article` + `author`/`datePublished`）、
  `RankingsPage`（`ItemList`）、`AgentCardPage`（`SoftwareApplication`/`Offer`）。
- **sitemap 自動化**：blog/tutorial 目前手動維護，易漏。建議由 Functions 動態產生
  `/sitemap.xml`（讀 blog/tutorial 清單），杜絕新文章漏收錄。
- **`lastmod`**：sitemap 目前無 `<lastmod>`，補上有助爬蟲判斷更新。
- **Core Web Vitals**：`vendor-privy` chunk 2MB（gzip 613KB）偏大；建議把 Privy 延後到
  需要登入時才載入（route-level dynamic import），提升首頁 LCP/TBT。

---

## 3. AIEO / Agentic-Ready（is-agentic.com 65 分 → 提升計畫）

### 3.1 現有 agentic 資產（相當扎實）
- `/llms.txt` + `/llms-full.txt`（API quick reference）
- `/openapi.json`（OpenAPI 3.1 discovery，`_headers` 已設 CORS + 短快取）
- `/api/agents/:name/agent-card.json`（A2A Agent Card）
- HTTP 402 / MPP / USDC on Base 付費流程
- 多頁 JSON-LD

### 3.2 Phase 1 已修正
- `robots.txt` **明確歡迎 AI 爬蟲**（GPTBot、OAI-SearchBot、ClaudeBot、
  PerplexityBot、Google-Extended、Applebot-Extended、CCBot、Bytespider、
  Meta-ExternalAgent…）並在註解指向 llms.txt / llms-full.txt / openapi.json。
- `llms.txt` 更新日期、明說「雙受眾」模型、補上 Zeabur/Pinata 外部部署 connector。

### 3.3 提升分數的後續建議（Phase 2，含後端深度盤點結果）

**Phase 1 已修**（見 §2.2）：sitemap 產品 URL 缺 category 段（`/apps/ollama`→`/apps/free/ollama` 等）與 2 個過期教學 slug（`ollama-setup`→`ollama`、`zeabur-deployment`→`zeabur`）——這些原本會 404、傷 SEO；ProductPage JSON-LD `url` 也補上 category 與 canonical 對齊。

**尚待處理（後端 agentic 稽核發現，依優先序）：**

- **P0 — OpenAPI 路徑與實作不符**：`/api/openapi.json` 文件宣告 `POST /api/agents/{agent}/tasks/{skillSlug}`，但實際路由是 `POST /api/agents/{name}/tasks`（skill 放 body），`[id]` 路由是給 taskId 用。Agent/MPPScan 依 spec 呼叫會 404/405。需讓 spec 與實作對齊（改 spec 或補 route handler）。屬後端行為變更，獨立 PR 處理。
- **P1 — robots 連結 llms.txt**：`index.html` 加 `<link rel="alternate" type="text/plain" href="/llms.txt">`（robots 已於 Phase 1 開放 AI 爬蟲並註解指向）。
- **P1 — `.well-known` 覆蓋**：目前 `functions/_middleware.ts` 只對 `/@{user}` 與 subdomain 做 `.well-known/agent.json` 改寫，但站內實際路由是 `/u/:username`。應補 `/u/...` 的改寫，並新增靜態 `/.well-known/ai-plugin.json`（agent manifest）。
- **P1 — 隱藏的 `ai-only` JSON-LD**：Blog/Tutorial 的 JSON-LD 放在 `display:none` 的 `ai-only` div，需 JS 執行才可見；非 JS 爬蟲讀不到。建議比照 middleware 對 bot 注入 OG 的做法，對 AI/搜尋 bot 伺服端注入 JSON-LD。
- **P1 — BOT_UA 未含 AI 爬蟲**：middleware 的 `BOT_UA` 只含社群/搜尋 bot（Googlebot、Facebook…），未含 GPTBot/ClaudeBot/PerplexityBot/Google-Extended；可選擇性納入以提供 canonical/meta。
- **P2 — 每頁 JSON-LD 覆蓋**：HomePage/AppsPage/RankingsPage/FreeAgentsPage 尚無 JSON-LD（見 §2.3）。
- **P2 — 動態 sitemap**：由 D1（agents/products/tutorials）自動產生 sitemap + `lastmod`，杜絕手動維護漂移（Phase 1 是手動修正）。
- **P2 — 刷新 `public/api/docs/index.html`**（停在 2026-03-25）與 `llms.txt` 內文速率限制數字對齊實作。
- 一致的錯誤/付費語意：確保所有付費端點回 402 + `WWW-Authenticate`/MPP 標頭（現況大致已具備）。
- （註：is-agentic 掃描訊息提到 `basemail.ai`，若那是關聯站，同樣套用以上原則。）

> 後端 agentic 端點的完整盤點由背景 explore subagent 產出，以上為其可執行結論摘要。

---

## 4. UI/UX：首頁已升級，內頁 Phase 2 藍圖

### 4.1 首頁（Phase 1 已完成）
- 新增「雲層上金色時分」Zen 天空氛圍：漂移天空漸層 + 呼吸感夕陽光暈 + 雲層 + 可讀性 vignette。
- 純 CSS、零額外網路成本、支援 `prefers-reduced-motion`、桌機/手機 RWD 實測通過。

### 4.2 Community（`/community`）Phase 2 規劃（降低「眼花撩亂」）
問題：pill 大小不一造成鋸齒感；篩選列密集；區塊間視覺層級不足。
安全改法（純樣式，不動邏輯）：
- 每個 section 包一層卡片容器（統一 padding/邊框），建立清楚分組。
- 篩選列收進可折疊的「Filters」抽屜，預設只顯示搜尋 + 檢視切換。
- pill 用固定最小寬度 + 對齊網格（`grid` 取代 `flex-wrap`）消除鋸齒。
- 手機把 `grid-cols-3` 統計卡改為可換行。

### 4.3 Rankings（`/rankings`）Phase 2 規劃（增加「乾貨感」）
問題：使用者不清楚「這頁在幹嘛」、資料偏舊、風格雜。
建議：
- 頂部加一段**一句話價值主張 + 評分方法連結**（「用真實下載/星數/跑分排出最值得裝的 AI 技能與硬體」）。
- 每個 tab 加「這是什麼 / 資料來源 / 多久更新」小標。
- **資料新鮮度**：`data/rankings-*.json` 由 `scripts/scrape-*.ts` 定時刷新（納入 §6 自動化）。
- 統一卡片/表格風格，減少一頁內過多強調色。

> Community/Rankings 皆為 1000+ 行 stateful 頁面，為符合「只能更好不能更壞」，
> 這兩頁的重設計以獨立、可視覺回歸測試的 PR 進行，不塞進 Phase 1。

---

## 5. 內容更新頻率策略（核心問題：多久更新一次最好？）

**結論：不要用單一頻率，用「分層節奏」——不同內容類型有不同最佳更新週期。**
理由：Google 2026 對「新鮮度（freshness）」的加權取決於**查詢意圖**——
新聞/工具價格類需要高頻，教學/概念類需要「夠新 + 定期回訪更新」而非狂發。
過度高頻發低質內容反而觸發 Helpful Content 的稀釋懲罰。

### 5.1 分層節奏表（建議）
| 內容類型 | 建議頻率 | SEO 理由 | 使用者理由 |
|---|---|---|---|
| **Blog 短文/新聞（AI 工具動態、模型發布）** | **每週 2 篇**（週二、週五）| 抓新鮮度與長尾查詢 | 讀者期待「本週有什麼新東西」|
| **長青深度教學（安裝/整合 how-to）** | **每月 2–4 篇新增 + 既有每季回訪更新** | HowTo/FAQ 結構化資料吃長尾 | 高完成度內容才有「乾貨感」|
| **軟硬體導購/比較** | **每月 1–2 篇 + 價格/規格每週自動刷新** | 商業意圖高、轉換好 | 價格要準才可信 |
| **Rankings 資料（skills/hardware/models）** | **每日或每週自動 scrape**（非人工上稿）| 資料鮮度直接影響信任 | 排行要即時才有用 |
| **社群/Agent 頁** | 即時（使用者/agent 自產）| UGC 自然新鮮 | — |
| **首頁/落地頁文案** | 每季檢視 | 避免頻繁改動傷穩定度 | — |

### 5.2 節奏總覽
- **每日**：資料刷新（rankings scrape、featured free models）+ 選題掃描（寫進 `content/QUEUE.md`，不自動發）。
- **每週 ×2**：從佇列取最高優先產稿（週二、週五）。當天資訊多，一次寫 2–3 篇；沒好題就只掃不寫。
- **每月**：2–4 篇長青教學 + 1–2 篇導購 + 回訪更新 1–2 篇舊文（補新資訊、更新日期）。
- **每季**：落地頁/導航資訊架構檢視。

選題規則（軟體為主、硬體為輔）與現行列隊見 `content/QUEUE.md`。教學寫法見 `SOP-NEW-APP.md`（對照 `createOllamaTutorial()`）。影片見 `VIDEO-RULES.md`（英文口白 + 繁中／英文雙語軟字幕）。

> 這個節奏可持續、對 SEO 友善、且不會用低質內容稀釋站點品質。

---

## 6. 自動化上稿：Agent 定時產稿設定

### 6.1 建議架構（沿用既有 team 流程）
沿用 `AGENTS.md` 的角色與「agent commit → CEO review → CEO push」流程，**不讓 agent 直接 push**：

```
[Cursor scheduled automation]  ── 每日 06:00 (Asia/Taipei) ─▶  選題掃描 → 寫入 content/QUEUE.md + Paperclip
                               ── 每週二/五 09:00 ─▶  Content Writer agent 從 QUEUE 取最高優先產稿
                                                        ├─ 產 en / zh-TW / zh-CN 三語（key 同步）
                                                        ├─ 產品/教學走 SOP-NEW-APP.md；影片走 VIDEO-RULES.md
                                                        ├─ 加 JSON-LD（Article/HowTo/FAQ）
                                                        ├─ npm run check-i18n && npm run build（自我驗證）
                                                        ├─ git commit（不 push）
                                                        └─ Paperclip comment 回報 CEO
                               ── CEO heartbeat ─▶  review → 通過 → git push origin main → Cloudflare 部署
```

**現況（2026-08-28）**：`content/QUEUE.md` 已有「優先策略」與「下一步寫」。掃描 SOP 在 `content/SCAN.md`。把下面兩段 prompt 貼上 Cursor → Automations。

- **資料刷新**（rankings）獨立排程：每日跑 `npm run scrape` 系列（純資料、低風險、可自動 commit）。

### 6.2 可直接貼上的 Cursor Automation（選題掃描 · 每日）
> Schedule：`0 22 * * *` UTC（台北 06:00）。完整規則以 `content/SCAN.md` 為準。若這段 prompt 跟 SCAN.md 打架，聽 SCAN.md。

```
你是 CanFly.ai 的選題掃描。不要寫完整文章，不要 push 產品頁。

每次必做：
1. 學習前面怎麼找題。讀 content/SCAN.md、content/QUEUE.md 的「優先策略」「掃描紀錄」、skills/topic-scan/SKILL.md。沿用已驗證的來源與夠格標準，不要重發明規則。
2. 去 GA 看哪個受歡迎。讀最新 reports/analytics-*.md。有 GA4（G-N200MSSJG8）或 Cloudflare Analytics 憑證就拉 28 天 /learn /apps /blog。沒憑證就用報告。熱頁只加權排序。
3. 掃新產品（軟體為主、硬體為輔）：xAI/Grok、Perplexity、OpenAI、Anthropic、Google、Product Hunt、GitHub、ClawHub、Apple / NVIDIA / Arduino。
4. 去重後重排。對 QUEUE、src/data/products.ts、TutorialPage tutorial id、src/data/blog.ts。同產品合併或改「更新舊頁」。整表依「優先策略」重排「下一步寫」，不要只把新題丟表尾。
5. 每次至少新增 1 筆待寫或更新舊頁（先前不在佇列，或舊列沒寫到這次才成立的理由）。禁止灌水。沒新品就回訪分數最高的過期舊頁。
6. 掃描紀錄加一行：日期、看了什麼、GA 看了哪份、入列幾題、重排後第 1 名。
7. 有檔案變更就 git commit。不要為了湊數寫文章。
```

### 6.3 可直接貼上的 Cursor Automation（Content Writer · 每週產稿）
> 在 Cursor → Automations 新增排程，貼上以下 prompt。Schedule：`0 9 * * 2,5`（週二/五 09:00，Asia/Taipei）。

```
你是 CanFly.ai 的 Content Writer agent。目標：產出 1 篇高品質內容（不直接 push）。

步驟：
1. 讀 content/QUEUE.md「下一步寫」第 1 名。那就是本題。不要自選，不要改拿第 2 名，除非第 1 名已經有進行中的 PR。
2. 讀 CONTENT-STRATEGY.md §5、SOP-NEW-APP.md、data/blog.ts，避免重複 slug。
3. 撰寫，遵守：
   - 三語同步：src/i18n（en / zh-TW / zh-CN）新增對應 key，數量必須一致。
   - 品牌一律用 CanFly.ai / CanFly（駝峰），domain 小寫 canfly.ai。
   - 內文交叉連結相關 /apps 產品頁與 /learn 教學。
   - 加入 JSON-LD（Article 或 HowTo/FAQ）。
   - 若新增路由，同步更新 public/sitemap.xml（含 hreflang + lastmod）。
4. 自我驗證：npm run check-i18n && npm run build 必須通過。
5. 寫完把 QUEUE 該列改成 done，並把「下一步寫」往上遞補。
6. git add + git commit（訊息：`content: <slug> (en/zh-TW/zh-CN)`）。不要 push。
7. 在 Paperclip comment 回報 CEO：「已完成，請 review」。

限制：只新增內容與必要的 sitemap/i18n，不改動既有功能與樣式。若 build 失敗，修好再交。
```

### 6.4 Grok 定時排程（替代/並行方案）
若要用 Grok 的 scheduled tasks：建立一個「每日 06:00 選題」任務，輸出候選主題 + 關鍵字 +
建議內鏈到 Paperclip / GitHub issue；再由 Cursor automation 或人工觸發 Content Writer 產稿。
Grok 適合做「即時熱點掃描 + 選題」，Cursor automation 適合做「進 repo 產稿 + 驗證 + commit」。

### 6.5 防呆與品質護欄
- **絕不自動 push**：一律走 CEO review。
- **每次產稿必跑** `check-i18n` + `build`，失敗不交件。
- **三語 key 數必須一致**（CI 已強制）。
- **重複偵測**：產稿前比對既有 slug/標題，避免內容自我競爭（cannibalization）。掃描每次去重並重排 QUEUE。
- **掃描至少 +1**：每日掃描必須新增 1 筆待寫或更新舊頁，規則見 `content/SCAN.md`。
- **E-E-A-T**：每篇標註作者/日期，導購文揭露 affiliate（站上已有 disclosure 文案）。

---

## 7. Phase 交付總覽

| Phase | 內容 | 狀態 |
|---|---|---|
| **1（本 PR）** | 品牌/SEO 一致性、JSON-LD、首頁 Zen 天空、robots/llms/sitemap（AIEO）、本報告 | ✅ 已完成並測試 |
| 2 | Community/Rankings 版面重整 + RWD、每頁 JSON-LD、動態 sitemap、Privy 延遲載入 | 規劃中（§4、§2.3）|
| 3 | 內容自動化落地（Cursor automation + 資料 scrape 排程）、教學/導購擴充 | **佇列已建立**（`content/QUEUE.md`）；Cursor Automation 仍待在帳號裡啟用（§5、§6）|

---

_本報告隨 Phase 進度更新。任何內容與樣式變更皆以「只會更好，不會更壞」為原則：
效能、UX、SEO/AIEO、安全只增不減。_
