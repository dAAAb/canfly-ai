# oMLX Integration — Project Plan

## 概述
在 CanFly.ai 免費工具頁面加入 oMLX — Apple Silicon 上最佳的本地 LLM 推理引擎。
影片來源：https://www.youtube.com/watch?v=neHz4EGt4vk
Repo：https://github.com/jundot/omlx

## oMLX 核心賣點（從影片學到的）
- **10x+ 提速**：比 LM Studio 快十倍以上（前綴緩存 + SSD 冷存儲）
- **多並發**：丐版 Mac Mini 16G 也能跑多個 OpenClaw agent
- **KV Cache 分頁**：類 vLLM 的 PagedAttention，共享前綴只存一份
- **雙層緩存**：熱存（RAM）+ 冷存（SSD），重啟不丟失
- **Menu bar 管理**：原生 macOS app，非 Electron
- **OpenAI 相容 API**：`http://localhost:8000/v1`
- **內建 benchmark**：一鍵測效能
- **與 OpenClaw 完美搭配**：解決 Agent 頻繁工具調用的 prefill 瓶頸

## 需要建立的內容

### 1. Product 資料（products.ts）
- id: `omlx`
- category: `free`
- 含 logo/icon、描述、特性列表、CTA

### 2. App 頁面內容（ProductPage 渲染）
- Hero image / logo
- 功能介紹 + OpenClaw 加速說明
- ⚠️ "Only for Mac (Apple Silicon)" 標記
- MLX 簡介
- 寶博橫式 review 影片 + 字幕
- 三語系 EN/zh-TW/zh-CN

### 3. Tutorial 教學頁面（TutorialPage 渲染）
- id: `omlx`
- 完整手把手教程：安裝 → 配置 → 下載模型 → 連接 OpenClaw
- ⚠️ "Only for Mac" 顯眼提示
- MLX 是什麼（Apple 的 ML 框架）
- 寶博橫式 review 影片 + 字幕
- 三語系

### 4. i18n 翻譯
- en.json / zh-TW.json / zh-CN.json 新增所有 oMLX 相關 key

### 5. 靜態資源
- oMLX logo（從 GitHub 下載或生成）
- Review 影片（寶博橫式）→ placeholder（需要寶博錄製）
- VTT 字幕檔（EN/zh-TW/zh-CN）

### 6. Review 影片
- 需要寶博錄製（或用 HeyGen 生成）
- 內容：oMLX 介紹 + 為什麼搭配 OpenClaw 很讚
- 字幕：Whisper 轉錄 → 修正 → ZapCap 或手工 VTT

## 工作分配

### 🦞 小龍蝦（我）負責
- [x] 影片轉錄 + 學習 oMLX
- [ ] 制定計劃（本文件）
- [ ] 建立 Paperclip tickets
- [ ] 監督進度（heartbeat）
- [ ] 最終檢查 + 測試 + commit & push

### 📎 Paperclip 團隊
- **CAN-101**: [Content] oMLX product data — products.ts entry
- **CAN-102**: [Content] oMLX tutorial data — TutorialPage entry
- **CAN-103**: [i18n] oMLX translations — EN/zh-TW/zh-CN
- **CAN-104**: [Assets] oMLX logo + placeholder images
- **CAN-105**: [Dev] Wire up oMLX routes and verify build

## 技術要點
- Product 路由：`/apps/free/omlx`
- Tutorial 路由：`/learn/omlx`
- API 相容：oMLX 提供 OpenAI 相容 API → OpenClaw config 只需改 `baseURL`
- macOS 15.0+ (Sequoia), Python 3.10+, Apple Silicon (M1/M2/M3/M4)

## OpenClaw 連動配置
```json
// openclaw.json
{
  "providers": {
    "omlx": {
      "type": "openai",
      "baseURL": "http://localhost:8000/v1",
      "apiKey": "omlx-local",
      "models": ["*"]
    }
  }
}
```

## 時程
- Day 1: 計劃 + 建票 + 開始內容撰寫
- Day 2: 內容完成 + i18n + 資源
- Day 3: 整合 + 測試 + 部署
