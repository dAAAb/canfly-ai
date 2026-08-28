# CanFly.ai 內容佇列（每日功課）

> 這份檔是**選題 inbox**，不是自動發文機。
> 每天先掃、先排隊；當天資訊多就一次寫幾篇，資訊少就寫一篇或只更新舊文。
> 產稿走 `SOP-NEW-APP.md`（產品＋教學）或既有 blog 結構；**不要直接 push**。

最後掃描：2026-08-28（寶博點名批次入列）

---

## 每日節奏

| 何時（Asia/Taipei） | 做什麼 | 產出 |
|---|---|---|
| 每天 06:00 | 掃新產品／新發布（軟體為主、硬體為輔） | 把夠格的題加進「待寫」；不夠格的丟「觀察」 |
| 週二、週五 09:00 | Content Writer 從佇列取最高優先產稿 | 1 篇完成（三語 + 內鏈 + 必要時影片） |
| 爆發日（同一天多個發布） | 一次寫 2–3 篇，**不要灌水** | 先軟體、後硬體；硬體未上市可先「即將推出」短文 |
| CEO heartbeat | review → `git push origin main` | 上線 |

品質護欄見 `CONTENT-STRATEGY.md` §5：新鮮度有助 SEO，低質連發會被 Helpful Content 稀釋。

---

## 怎麼判斷「該不該寫」

**優先寫（軟體）：**
1. 能接上 OpenClaw / 本地 AI / Agent 工作流
2. 有官方文件或可重現的安裝步驟
3. 站上還沒有同名產品頁或教學（對 `src/data/products.ts` + `src/pages/TutorialPage.tsx`）
4. 搜尋意圖清楚（「怎麼裝」「跟 X 差在哪」「能不能本地跑」）

**次優先（硬體）：**
- 明顯讓本地 Agent／推論更快、更便宜、或更好部署（NPU、統一記憶體、開發板）
- 未上市：先 blog「即將推出」+ 規格表，上市再補產品頁／導購連結
- 已有相近 SKU 就**更新舊文**，不要另開一篇互搶排名（例如既有 `mac-mini-m4`）

**先不要寫：**
- 只有傳聞、沒有規格或文件
- 純消費電子、跟 AI Agent 無關
- 已經在「已有內容」裡且沒有實質更新

---

## 固定偵察來源（軟體 > 硬體）

**軟體**
- xAI / Grok、Perplexity、OpenAI、Anthropic、Google 官方 blog
- Product Hunt、GitHub Trending、Hugging Face、ClawHub
- Ollama / OpenRouter / Zeabur changelog

**硬體**
- Apple Newsroom、MacRumors（上市日）
- NVIDIA Jetson、Arduino 官方
- 既有導購頁的後繼機（Mac mini / Studio、開發板）

每次掃描在本檔「掃描紀錄」加一行：日期、看了什麼、入列幾題。

---

## 待寫

| 優先 | 題目 | 類型 | 為什麼現在寫 | 建議頁面 | 狀態 |
|---|---|---|---|---|---|
| P0 | Grok Bot | 軟體／產品 + 短教學 | 新 agent 入口，搜尋熱度高 | `/apps` + `/learn/grok-bot` + blog | queued |
| P0 | Perplexity Computer | 軟體／產品 | 新形態「AI 電腦」，跟現有 Perplexity 搜尋頁要分開，避免互搶 | `/apps` + blog 對照「Perplexity vs Perplexity Computer」 | queued |
| P0 | Perplexity Portable Computer | 軟體／硬體交界 | 可攜版，長尾詞新 | blog 先寫，規格穩了再產品頁 | queued |
| P1 | Arduino VENTUNO Q | 硬體 | 新開發板，可接本地／邊緣 Agent | `/apps/hardware` + `/learn` | queued |
| P1 | Jetson Orin Nano 2 | 硬體 | 邊緣推論升級，對本地模型有轉換 | `/apps/hardware` + 對照舊 Jetson | queued |
| P1 | 新款 Mac mini | 硬體 | 站上已有 `mac-mini-m4`——**先更新舊頁**，確認是新晶片再決定是否新 slug | 更新 `mac-mini-m4` 或新 slug | queued |
| P2 | Mac Studio 512GB（約 10 月） | 硬體／預告 | 未上市：先「即將推出」規格文，上市再補買連結 | blog `mac-studio-512gb` | queued |

---

## 觀察（未夠格入列）

| 題目 | 缺什麼 | 下次再看 |
|---|---|---|
| （空） | — | — |

---

## 已有、不要重開

| slug / 頁 | 備註 |
|---|---|
| `perplexity` | 搜尋產品已在；Computer / Portable 是新題 |
| `mac-mini-m4` | 新款 mini 先更新這頁 |
| `heygen` / `elevenlabs` / `ollama` / `zeabur` | 教學已在，只在有大改版時回訪 |

---

## 掃描紀錄

| 日期 | 掃描者 | 入列 | 備註 |
|---|---|---|---|
| 2026-08-28 | Cloud agent（依寶博點名） | 7 | 建立佇列；尚未產稿 |

---

## 產稿時記得

1. 三語 key 同步：`src/i18n/en.json`、`zh-TW.json`、`zh-CN.json`
2. 產品頁走 `SOP-NEW-APP.md`；影片走 `VIDEO-RULES.md`（**英文口白 + 繁中／英文雙語軟字幕**）
3. `npm run check-i18n` + `npx vite build`
4. `git commit`，Paperclip 回報 CEO，**不要自己 push**
