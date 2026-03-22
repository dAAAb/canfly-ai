# CanFly.ai 影片上架規則

> 寶博指示 2026-03-09，由 LittleLobster 維護

## 🎬 核心原則

### 1. 網站預設語言 = 英文
- 所有評論影片**預設為英文口白 + 英文語音**
- 英文版影片是基礎版本，必須最先製作

### 2. 字幕規則（所有影片都適用）
- **每支影片都需要三語字幕**：EN / zh-TW / zh-CN
- 不論影片口白是英文還是中文，都要三語字幕
- 字幕檔不可跨語言影片共用（英文口白的中文翻譯 ≠ 中文口白的中文原文，對位不同）

### 3. 中文頁面顯示規則
- **繁體中文頁面**：優先播放繁體中文口白影片（如有），字幕預設切換為 zh-TW
- **簡體中文頁面**：使用繁體中文口白影片（寶博口音是繁中），字幕預設切換為 zh-CN
- 如果該產品沒有中文口白影片 → fallback 到英文口白影片，字幕自動切換對應語言

### 4. 影片格式
- **統一橫式 16:9**（1280×720）
- Avatar：JCKOV1 (`838320ce7ca646d3a6306c098c7ee89b`)
- Voice：JCKOV1 (`102b19ecd46b444c8098a33c8d8eb37f`)
- Speed：0.98 / Emotion：Friendly / Language：en（英文影片）或 zh（中文影片）

---

## 📦 生成工作量分配

### 批量生成（>3 個產品）
- **先做英文版**，之後再補中文版
- 例如：CAN-81 一次重做 7 支 → 先全部英文

### 分批上稿（≤3 個產品）
- **一次做中英兩支影片**
- 每支影片各配三語字幕
- 合計：2 支影片 × 3 字幕 = 6 組字幕檔

---

## 📂 檔案命名規範

```
public/videos/reviews/
├── {product}-review.mp4          ← 英文口白（預設/EN 頁面）
├── {product}-review.en.vtt       ← 英文口白的英文字幕
├── {product}-review.zh-TW.vtt    ← 英文口白的繁中翻譯字幕
├── {product}-review.zh-CN.vtt    ← 英文口白的簡中翻譯字幕
├── zh-TW/
│   ├── {product}-review.mp4      ← 中文口白（繁中/簡中頁面）
│   ├── {product}-review.en.vtt   ← 中文口白的英文翻譯字幕
│   ├── {product}-review.zh-TW.vtt← 中文口白的繁中字幕
│   └── {product}-review.zh-CN.vtt← 中文口白的簡中字幕
```

---

## 📊 產品影片清單

| # | 產品 | 英文影片 | 英文字幕 | 繁中字幕 | 簡中字幕 | 中文影片 | 中文三語字幕 | 格式 | 備註 |
|---|------|----------|----------|----------|----------|----------|-------------|------|------|
| 1 | Ollama | ✅ 完成 | ✅ | ✅ | ✅ | ✅ 有（舊版直式） | 待整理 | ✅ 橫式 | 英文口白 JC Ko avatar |
| 2 | Zeabur | ✅ 完成 | ✅ | ✅ | ✅ | ✅ 有（舊版直式） | 待整理 | ✅ 橫式 | 同上 |
| 3 | Umbrel | ✅ 完成 | ✅ | ✅ | ✅ | ✅ 有（舊版直式） | 待整理 | ✅ 橫式 | 同上 |
| 4 | ElevenLabs | ✅ 完成 | ✅ | ✅ | ✅ | ✅ 有（舊版直式） | 待整理 | ✅ 橫式 | 同上 |
| 5 | HeyGen | ✅ 完成 | ✅ | ✅ | ✅ | ✅ 有（舊版直式） | 待整理 | ✅ 橫式 | 同上 |
| 6 | Perplexity | ✅ 完成 | ✅ | ✅ | ✅ | ❌ | — | ✅ 橫式 | 英文口白 JC Ko avatar |
| 7 | Brave Search | ✅ 完成 | ✅ | ✅ | ✅ | ❌ | — | ✅ 橫式 | 英文口白 JC Ko avatar |

### 現況摘要
- **7 支影片全部完成重做** ✅：現有橫式版本其實是中文口白（但配了英文翻譯 VTT），Perplexity/Brave Search 甚至是直式的
- 舊版直式中文影片（vertical/）可保留，未來放到 `zh-TW/` 目錄
- VTT 字幕已有三語版本，但內容是基於中文口白翻譯的 → 英文版影片需重新生成字幕

---

## 🔄 更新日誌

| 日期 | 動作 | 備註 |
|------|------|------|
| 2026-03-09 | 建立規則文件 + 清單 | 寶博指示，7 支先做英文版 |
| 2026-03-09 | 7 支英文橫式影片完成 | JC Ko avatar + 三語 VTT，已 push + deploy |
| 2026-03-22 | 2 支教學影片完成 | AgentBook 註冊 + World ID 驗證，英文口白 + 三語 VTT，嵌入 ProfileEditPage + UserShowcasePage |

---

*維護者：LittleLobster (CMO) — 有異動請更新此文件並通知 Paperclip 團隊*

---

## ⚠️ 「假橫式」影片記錄（2026-03-09）

使用直式寶博 JCKOV1 avatar 指定 1280x720 dimension 產生的影片。
Avatar 是直式的放在橫式畫面中，左右會有空白或不自然。

**已生成但不使用：**
- `/tmp/heygen-fake-horizontal/heygen-ollama.mp4`
- `/tmp/heygen-fake-horizontal/heygen-zeabur.mp4`
- `/tmp/heygen-fake-horizontal/heygen-umbrel.mp4`
- `/tmp/heygen-fake-horizontal/heygen-elevenlabs.mp4`
- `/tmp/heygen-fake-horizontal/heygen-heygen.mp4`

**參數**：JCKOV1 avatar (`838320ce...`) + JCKOV1 voice (`102b19ec...`) + 1280x720 + speed 0.98 + Friendly
**用途**：未來如果需要直式英文影片，可以重新裁切使用

> 教訓：橫式影片要用橫式寶博 JC Ko avatar (`91e70516...`) + JC Ko voice (`84e4663b...`)
