# SOP: 新增 CanFly.ai App 頁面 + 教學

每次寶博要加新的工具/app 到 CanFly.ai，照這個流程做。

---

## 1️⃣ 研究階段

- [ ] 轉錄/閱讀相關影片或文章（Whisper API / summarize）
- [ ] 研究 GitHub repo / 官方文檔
- [ ] 搞清楚：是什麼、怎麼裝、怎麼跟 OpenClaw 連動
- [ ] 記錄系統需求（OS、RAM、硬體限制等）

## 2️⃣ 靜態資源

- [ ] Logo/Icon → `public/images/icons/{slug}.svg` 或 `.png`
  - 優先從 GitHub repo 下載 SVG
  - 沒有的話用 nano-banana-pro 生成
- [ ] Dashboard/截圖 → `public/images/icons/{slug}-dashboard.png`

## 3️⃣ Product 資料

**檔案**：`src/data/products.ts`

加一筆 entry：
```ts
{
  id: 'slug',
  icon: '/images/icons/slug.svg',
  name: 'Display Name',
  tagline: 'One-liner',
  category: 'free' | 'hosting' | 'skills' | 'hardware' | ...,
  price: 'Free & Open Source',
  status: 'available',
  description: '...',
  features: ['feature 1', 'feature 2', ...],
  screenshots: ['/images/icons/slug-dashboard.png'],
  reviewVideo: '/videos/reviews/slug-review.mp4',
  tutorial: '/learn/slug',
  cta: {
    primary: 'Start Free Tutorial',
    primaryLink: '/learn/slug',
    secondary: 'Download',
    secondaryLink: 'https://...',
  },
}
```

## 4️⃣ Tutorial 資料

**檔案**：`src/pages/TutorialPage.tsx`

### 4a. 建立 `create{Name}Tutorial()` 函數

參考 `createOmlxTutorial()` 或 `createOllamaTutorial()` 的結構：

```ts
function createSlugTutorial(t: any): TutorialData {
  return {
    id: 'slug',
    title: t('tutorial.slug.title'),
    subtitle: t('tutorial.slug.subtitle'),
    duration: t('tutorial.slug.duration'),
    difficulty: t('tutorial.slug.difficulty'),
    video: { ... },  // 如果有 review video
    faq: t('tutorial.slug.faq', { returnObjects: true }) || [],
    steps: [
      // 每個 step 都要有：
      // - icon（從 lucide-react import）
      // - title / titleEn / estimatedTime / content
      // - 可選：commands / modelTable / tips / troubleshooting / expectedResult
      // - 最後一步用 nextStepCards
    ],
  }
}
```

### 4b. 註冊到 `getTutorials()`

```ts
function getTutorials(t: any): Record<string, TutorialData> {
  return {
    ...
    slug: createSlugTutorial(t),  // ← 加這行
    ...
  }
}
```

## 5️⃣ i18n 翻譯（最大工作量）

**檔案**：`src/i18n/{en|zh-TW|zh-CN}.json`

### 需要的 key 結構：

```
product.products.{slug}.tagline
product.products.{slug}.description
product.products.{slug}.features[]
product.products.{slug}.cta.primary / secondary

tutorial.{slug}.title
tutorial.{slug}.subtitle
tutorial.{slug}.duration
tutorial.{slug}.difficulty
tutorial.{slug}.steps[].title / titleEn / estimatedTime / content
tutorial.{slug}.steps[].commands[]        ← 必須是 array！
tutorial.{slug}.steps[].tips[]            ← 必須是 array！
tutorial.{slug}.steps[].expectedResult    ← string
tutorial.{slug}.steps[].troubleshooting.title
tutorial.{slug}.steps[].troubleshooting.items[].q / .a
tutorial.{slug}.steps[].modelTable.models[].name / size / best / speed
tutorial.{slug}.steps[].nextStepCards[].emoji / title / desc / link / cta
tutorial.{slug}.faq[].q / .a
```

### ⚠️ 常見陷阱（踩過的坑）：

1. **Key 路徑**：product 要放在 `product.products.{slug}`，不是 `product.{slug}`
2. **commands 必須是 array**：`t()` 回傳 string 會導致 `.join()` crash
3. **expectedResult 必須存在**：漏了會顯示 raw key string
4. **三語都要有相同的 keys**：i18n validation script 會檢查 missing/extra keys
5. **zh-CN 用簡體字**：內存不是記憶體、視頻不是影片、下載不是下載
6. **content 裡不要放 markdown table**：如果有 modelTable 組件，table 會重複顯示
7. **nextStepCards 的 link 要正確**：用 `/learn/{slug}` 不是 `/tutorials/{slug}`，每個 card 都要有 `desc`
8. **content 裡的 code block 長連結會爆版**：英文版內容盡量簡潔，長 URL 放在 commands 裡

### 高效做法：用 3 個 sub-agent 並行寫 EN/zh-TW/zh-CN

```
sessions_spawn → label: "app-i18n-en" → 寫 EN JSON
sessions_spawn → label: "app-i18n-zhTW" → 寫 zh-TW JSON
sessions_spawn → label: "app-i18n-zhCN" → 寫 zh-CN JSON
```

寫完後用 Python deep_merge 合併進主 i18n 檔案。

### ⚠️ Sub-agent 合併後必做檢查：

1. **Key 路徑**：確認 product 在 `product.products.{slug}` 不是 `product.{slug}`
2. **頂層 key 汙染**：sub-agent 可能把 `faq` 放在頂層而非 `tutorial.{slug}.faq`
3. **commands / expectedResult / modelTable**：sub-agent 常常漏掉，要手動補
4. **content 裡是否有 markdown table**：有 modelTable 組件的話要刪掉 content 裡的重複 table

## 6️⃣ HeyGen 橫式寶博 Review 影片（必做！）

每個 app 都要有寶博的 review 影片 + 三語字幕。

### 6a. 撰寫 Review 稿

- **語言**：中文為主，技術名詞保留英文
- **長度**：30-90 秒（~150-400 字）
- **結構**：
  1. 開場自介（「大家好，我是葛如鈞」）
  2. 痛點描述（沒有這工具之前的問題）
  3. 工具亮點（2-3 個核心功能）
  4. 跟 OpenClaw 的連動
  5. 安裝簡易度
  6. CTA（「我在 CanFly.ai 準備了教學，歡迎試試！」）

### 6b. HeyGen 生成影片

```bash
# 橫式寶博設定
HEYGEN_API_KEY=$(cat ~/.clawdbot/clawdbot.json | python3 -c "import sys,json; print(json.load(sys.stdin)['skills']['entries']['heygen']['apiKey'])")

HEYGEN_API_KEY="$HEYGEN_API_KEY" python3 /Users/vitalik/clawd/skills/heygen/scripts/generate_video.py \
  --text "$(cat /tmp/{slug}-review-script.txt)" \
  --avatar-id "91e70516d79043658917bc043390465f" \
  --voice-id "84e4663b7e18494e9159e7db2cd0b4f0" \
  --dimension "1280x720" \
  --aspect-ratio "16:9" \
  --output /tmp/{slug}-review-heygen.mp4
```

| 參數 | 值 | 說明 |
|------|-----|------|
| Avatar | JC Ko `91e70516d79043658917bc043390465f` | 橫式寶博 |
| Voice | JC Ko `84e4663b7e18494e9159e7db2cd0b4f0` | 橫式寶博語音 |
| Dimension | 1280x720 | 16:9 橫式 |

### 6c. Re-encode 影片（重要！）

```bash
ffmpeg -i /tmp/{slug}-review-heygen.mp4 \
  -c:v libx264 -profile:v baseline -level 3.1 -movflags +faststart \
  -c:a aac -b:a 128k \
  /tmp/{slug}-review-final.mp4 -y
```

**為什麼要 re-encode？**
- HeyGen 原始檔在部分瀏覽器/LINE 可能無法播放
- `baseline -level 3.1` = 最大相容性
- `+faststart` = 串流播放友善

### 6d. Whisper 轉錄 → zh-TW VTT

```bash
# 先抽音軌
ffmpeg -i /tmp/{slug}-review-final.mp4 -vn -acodec aac -b:a 128k /tmp/{slug}-audio.m4a -y

# Whisper API 取 VTT
curl -s https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F file="@/tmp/{slug}-audio.m4a" \
  -F model="whisper-1" \
  -F language="zh" \
  -F response_format="vtt" \
  -F prompt="葛如鈞 OpenClaw 小龍蝦 {工具名稱} {關鍵技術詞}" \
  -o /tmp/{slug}-review-zh-TW.vtt
```

**⚠️ Whisper 常見錯字修正：**
- `葛如君` → `葛如鈞`（每次都要查）
- `Olama` → `Ollama`
- 技術名詞要確認拼寫

### 6e. 翻譯 EN + zh-CN VTT

- **保持完全相同的時間戳**（只翻譯文字，不動時間）
- EN：自然英文翻譯（不是逐字翻）
- zh-CN：繁體 → 簡體（記憶體→内存、快取→缓存、並發→并发 等）

### 6f. 複製到專案

```bash
cp /tmp/{slug}-review-final.mp4  public/videos/reviews/{slug}-review.mp4
cp /tmp/{slug}-review-zh-TW.vtt  public/videos/reviews/{slug}-review-zh-TW.vtt
cp /tmp/{slug}-review-en.vtt     public/videos/reviews/{slug}-review-en.vtt
cp /tmp/{slug}-review-zh-CN.vtt  public/videos/reviews/{slug}-review-zh-CN.vtt
```

## 7️⃣ Build + 驗證

```bash
npm run build  # 必須通過 i18n validation
```

### 檢查清單：
- [ ] Build 成功（無 i18n validation error）
- [ ] `/apps/{category}/{slug}` 載入正常
- [ ] `/learn/{slug}` 載入正常（無 crash）
- [ ] zh-TW 版翻譯正確顯示
- [ ] zh-CN 版翻譯正確顯示
- [ ] 英文版翻譯正確顯示
- [ ] commands 可複製
- [ ] modelTable 顯示（如有）
- [ ] FAQ 可展開
- [ ] **Review video 播放正常**
- [ ] **字幕切換正常（EN / zh-TW / zh-CN）**
- [ ] **手機版不爆版**（code block、長連結）
- [ ] **nextStepCards 連結可點且正確**

## 8️⃣ Commit + Push

```bash
git add -A
git commit -m "feat: add {name} app page + tutorial + review video (EN/zh-TW/zh-CN)"
git push
```

等 GitHub Actions 部署成功（~1 分鐘），用瀏覽器驗證線上版。

---

## 📋 快速參考

| 檔案 | 用途 |
|------|------|
| `src/data/products.ts` | Product card 資料 |
| `src/pages/TutorialPage.tsx` | Tutorial 步驟函數 + 註冊 |
| `src/i18n/en.json` | 英文翻譯 |
| `src/i18n/zh-TW.json` | 繁中翻譯 |
| `src/i18n/zh-CN.json` | 簡中翻譯 |
| `public/images/icons/` | Logo/截圖 |
| `public/videos/reviews/` | Review 影片 + VTT 字幕 |

| 路由 | 頁面 |
|------|------|
| `/apps/{category}/{slug}` | Product 頁面 |
| `/learn/{slug}` | Tutorial 教學 |
| `/{lang}/apps/{category}/{slug}` | 語系版本 |
| `/{lang}/learn/{slug}` | 語系版本 |

## 🎬 HeyGen 橫式寶博快速參考

| 項目 | 值 |
|------|-----|
| Avatar ID | `91e70516d79043658917bc043390465f` (JC Ko) |
| Voice ID | `84e4663b7e18494e9159e7db2cd0b4f0` (JC Ko) |
| Dimension | 1280x720 (16:9) |
| Script | generate_video.py 路徑 |
| Re-encode | `-c:v libx264 -profile:v baseline -level 3.1 -movflags +faststart` |
| Whisper | `model=whisper-1`, `language=zh`, `response_format=vtt` |
| VTT 三語 | zh-TW (Whisper) + EN (翻譯) + zh-CN (繁→簡) |
