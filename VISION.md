# CanFly.ai — 產品願景

## 核心認知：雙受眾設計

CanFly.ai 的用戶**不只有人類，也有 AI agent**。

整個網站的設計、內容、SEO/AIEO 都必須同時服務：
- 🧑 **人類用戶** — 看得懂、跟得上、願意行動
- 🤖 **AI agent / OpenClaw** — fetch 得到、parse 得了、執行得動

### 實作原則

| 面向 | 人類看到 | AI agent fetch 到 |
|------|---------|-------------------|
| 教學內容 | 圖文影片、step-by-step | 結構化指令、CLI commands |
| API 指引 | 預設隱藏（不干擾閱讀） | HTML 裡有完整的 API docs |
| SEO/AIEO | meta tags、OG image | `llms.txt`、structured data |
| 安裝流程 | 視覺化引導 | 可直接執行的 shell scripts |
| 產品推薦 | 精美卡片 + CTA | JSON-LD + affiliate params |

### 技術實現
- **`llms.txt`**：站點根目錄提供 AI 可讀的網站地圖和導航
- **隱藏 API 區塊**：HTML 中用 `<details>` 或 `class="ai-only"` 包裹 API 指引，人類看不到但 fetch 看得到
- **Structured Data**：JSON-LD schema 標記每個產品和教學
- **CLI-ready snippets**：每個教學都附可複製的完整 CLI 指令

---

## 用戶旅程

### Journey 1：第一隻蝦（免費體驗）
> 「聽說了 OpenClaw，想知道怎麼裝第一隻」

- **入口**：首頁 → "Start Free" CTA
- **路徑**：Ollama 免費安裝教學
- **目標**：5 分鐘內跑起來，感受到「哇，我有 AI agent 了」
- **轉化**：想要更多功能 → 付費服務

### Journey 2：第一台設備（地端養蝦）
> 「想買一台設備，養一個地端的蝦」

- **入口**：硬體分類 → 設備推薦
- **路徑**：Mac mini / Pi / NUC 硬體導購 + 安裝教學
- **目標**：從零到有，24/7 跑自己的 OpenClaw
- **轉化**：Amazon affiliate 購買

### Journey 3：雲端養蝦
> 「不想管硬體，養在雲端」

- **入口**：首頁 → "Deploy to Cloud" 或 Zeabur 教學
- **路徑**：Zeabur one-click deploy
- **目標**：3 分鐘部署完成
- **轉化**：Zeabur affiliate（referral code: OpenClaw）

### Journey 4：養第二隻（擴展）
> 「第一隻跑得不錯，想要更多功能」

**人類驅動**：
- 回到 CanFly.ai 瀏覽更多產品
- 安裝 ElevenLabs 語音、HeyGen 影片、更多 Skills

**AI agent 驅動**：
- 用戶叫他的第一隻 OpenClaw 去 fetch CanFly.ai
- OpenClaw 讀 `llms.txt` + 產品頁的隱藏 API 指引
- 自動安裝和設定更多 Skills / 服務
- 用戶只需要說「幫我裝語音功能」，OpenClaw 就搞定

### Journey 5：育苗場（批量養蝦）
> 「我要幫公司/團隊建一群 agent」

- 進階用戶或企業
- 需要多 agent 協作、Paperclip 式管理
- CanFly.ai 作為「育苗場」— 一站式獲取所有需要的工具

---

## 內容產製標準

### 文字內容
- 雙語：zh-TW + English
- 初學者友善，不假設前置知識
- 每個步驟都有預期結果（「你應該會看到...」）

### 影片內容
- **HeyGen 虛擬人**（寶博分身）做產品安裝教學
- 固定風格：直式 9:16（手機優先）或橫式 16:9
- ZapCap 字幕：中英雙語
- 影片文稿獨立撰寫（不是把文字稿直接唸）

### 圖片內容
- 產品截圖：真實 UI 截圖 + 標註
- Hero images：與 CanFly.ai 品牌一致的風格
- 教學圖：step-by-step 標號圖

### 學習機制
- 觀摩 YouTube 教學影片（轉字幕 + VLM 讀畫面）
- 研究部落格安裝文章
- 學習如何讓教學對人類和 AI 都友善
