# CanFly.ai — Now You Can Fly ✈️

> AI Agent 時代的知識導購 + 社群平台
> 「有了 AI，你也能飛。」

---

## 📌 專案概覽

| 項目 | 內容 |
|------|------|
| **網域** | canfly.ai（Cloudflare 託管） |
| **Repo** | https://github.com/dAAAb/canfly-ai |
| **定位** | AI-native 聯盟行銷 + 白手套服務 + 用戶社群 |
| **核心價值** | 幫人「從零到起飛」— 發現、試用、購買、展示 AI Agent 工具 |
| **部署** | Cloudflare Pages（自動 deploy on push to main） |
| **CF API Key** | 見寶博提供的密鑰（不寫在這裡，存在安全位置） |

---

## 🎯 五層商業架構

### Layer 1：硬體導購（策展型目錄）
已知支援 OpenClaw 的硬體：
- **[Umbrel](https://umbrel.com/)** — 家用 self-hosted server（Home Cloud）
- **[Hup](https://www.withhup.com/)** — AI Hub 硬體
- **[SwitchBot AI Hub](https://www.switch-bot.com/products/switchbot-ai-hub)** — 智慧家居 + AI 整合

每個產品頁包含：價格 / 難度 / 適合誰 / OpenClaw 相容度 / 寶博 avatar 30 秒 review 影片

### Layer 2：免費入門路徑（轉換漏斗頂端）
- **Ollama + OpenClaw** = 零成本起步，連 API key 都不用
- 這是最強的引流武器 — 先讓人嚐到甜頭，再往下轉

### Layer 3：知識加價 + 服務收費（商業核心）
- **不賣商品，賣服務** — 稅務乾淨、風險低、毛利高
- 設定服務費 / 白手套安裝費 / 知識顧問費
- Stripe 收款（考慮 Stripe Atlas 開美國 LLC，~$500 一次性）
- 複雜需求才走代購 bundle

### Layer 4：分類導流 + Affiliate 佣金（被動收入）
每個類別的 AI 工具都導到 affiliate link

### Layer 5：HeyGen 影片 Review + 內容飛輪
- 寶博 avatar 自動量產開箱 / 教學影片
- 推 HeyGen 的影片本身就是 HeyGen 最好的 demo
- SEO + YouTube + 社群三路導流

---

## 💰 Affiliate 版圖

### ✅ 有 Affiliate Program

| 服務 | 佣金 | 模式 | Affiliate Link | 平台 |
|------|------|------|---------------|------|
| **ElevenLabs** | **22% recurring × 12 個月** 🔥 | 正式 affiliate | `https://try.elevenlabs.io/clawhub` | PartnerStack |
| **HeyGen** | **20% recurring × 12 個月** | 正式 affiliate | `https://www.heygen.com/?sid=rewardful&via=clawhub` | Rewardful |
| **Zeabur** | 5 級階梯佣金 | 正式 referral | 推薦碼「OpenClaw」結帳 10% 折扣 | 平台直營 |
| **Perplexity** | $15/人（安裝+提問） | referral | 待申請 | — |

> ⚠️ 注意：目前 affiliate link 用的是 `clawhub` / `openclaw` slug。
> canfly.ai 上線後可能要申請新的 canfly slug，或統一用 openclaw。

### ❌ 沒有 Affiliate（改收服務費）

| 服務 | 替代策略 |
|------|---------|
| OpenAI | 教學導流 → 賣設定服務費 |
| Anthropic (Claude) | 同上 |
| Google Gemini | 同上 |
| Ollama | 免費開源，漏斗頂端王牌 |
| Cloudflare | 企業級 PowerUP Partner，門檻高 |
| Umbrel | 走 Amazon Associates（如果 Amazon 有賣） |

---

## 📊 收入預測（保守 → 樂觀）

| 指標 | 保守估計 | 樂觀估計 |
|------|---------|---------|
| **年度總收入** | $42,186 (≈NT$1.27M) | $73,800 (≈NT$2.21M) |
| **M12 月收入** | $6,792 (≈NT$204K) | $11,900 (≈NT$357K) |
| **年度 Recurring** | $7,942 | $13,900 |
| **年度一次性** | $34,244 | $59,900 |
| **總轉換用戶** | ~1,756 人 | ~3,070 人 |
| **啟動成本** | ~$500 (Stripe Atlas) | — |
| **ROI** | 84x | 148x |

### 收入結構

- **ElevenLabs 22% recurring** — 最肥，優先推
- **HeyGen 20% recurring** — 自己就是 demo
- **Perplexity $15/人** — 門檻最低，量大
- **設定服務 $50/人** — 毛利最高
- **Zeabur + 硬體** — 長尾補充

### 爆發時間點
- M1-4：建設期（內容、SEO、影片）
- **M5-6：月收破 $2,500**，感覺開始動了
- **M9：月收破 $5,000**，值得認真投入
- **第二年：Recurring 滾雪球**，光被動收入 $3-5K/月

---

## 🗺️ 網站架構（規劃）

```
canfly.ai/                  → 首頁：品牌故事 + 免費入門 CTA
canfly.ai/start             → 🆓 免費起步（Ollama + OpenClaw 教學）
canfly.ai/voice             → 🎙️ AI 語音（ElevenLabs）← 22% 佣金
canfly.ai/video             → 🎬 AI 影片（HeyGen）← 20% 佣金
canfly.ai/search            → 🔍 AI 搜尋（Perplexity）← $15/人
canfly.ai/deploy            → 🚀 部署（Zeabur）← 階梯佣金
canfly.ai/models            → 🧠 AI 模型（OpenAI/Claude/Gemini）← 服務費
canfly.ai/hardware          → 🖥️ 硬體（Umbrel/Hup/SwitchBot）← 服務費
canfly.ai/community         → 👥 社群入口

{username}.canfly.ai        → 用戶個人頁（Phase 2）
├── 🦞 我的 Agent 身分（Moltbook 連動）
├── ⭐ 我用的產品 + 評價
├── 📊 我的 Agent 能力值
└── 🤝 社群互動（follow / 推薦）
```

---

## 🛠️ 技術棧

### 目前（預告頁面）
- React 19 + Vite 7 + Tailwind CSS 4 + TypeScript
- Cloudflare Pages 部署

### 正式版（規劃）
- **前端**：保持 React + Vite + Tailwind（或考慮 Astro SSG 提升 SEO）
- **內容管理**：Markdown / CMS（產品資料）
- **金流**：Stripe Checkout（收服務費）
- **影片**：HeyGen API 自動產 review 影片
- **用戶頁**：Cloudflare Workers + wildcard subdomain
- **AI**：OpenClaw 驅動的代購/客服 agent

---

## 📋 Phase 規劃

### Phase 1：MVP Landing + 3-5 產品頁（優先）
- [ ] 設計正式首頁（品牌、CTA）
- [ ] 免費入門教學頁（Ollama + OpenClaw）
- [ ] 3-5 個核心產品深度 review 頁面
- [ ] 每個產品配寶博 avatar 30 秒 HeyGen 影片
- [ ] Affiliate links 全部埋好
- [ ] 基本 SEO（og:image, sitemap, meta）

### Phase 2：服務 + 金流
- [ ] Stripe Atlas 開公司（如確定要）
- [ ] Stripe Checkout 服務費收款頁面
- [ ] 白手套服務流程設計
- [ ] 申請 Perplexity affiliate

### Phase 3：社群 + 用戶個人頁
- [ ] {username}.canfly.ai wildcard subdomain
- [ ] 用戶註冊 + 個人頁模板
- [ ] Moltbook 連動
- [ ] 社群互動功能（follow / 推薦 / 評價）

---

## 🔑 重要憑證

| 項目 | 位置 |
|------|------|
| Cloudflare API Key | `~/.config/canfly/cf-api-key`（需建立） |
| ElevenLabs Affiliate | `https://try.elevenlabs.io/clawhub` |
| HeyGen Affiliate | `https://www.heygen.com/?sid=rewardful&via=clawhub` |
| Zeabur Referral Code | `OpenClaw` |

---

## 🧠 核心理念

1. **賣服務不賣商品** — 知識的毛利 >> 硬體差價
2. **免費 → 付費漏斗要順** — Ollama 免費體驗 → 想要更強 → 推工具/硬體 → 服務
3. **推廣即展示** — 用 HeyGen 做的影片推 HeyGen，本身就是最好的 demo
4. **社群是護城河** — 用戶個人頁 = AI agent 名片 + 人類 showcase = 病毒傳播
5. **Recurring 是長期金礦** — ElevenLabs 22% + HeyGen 20%，用戶越累積越肥

---

## 📝 決策紀錄

| 日期 | 決策 | 原因 |
|------|------|------|
| 2026-03-07 | 選 canfly.ai 而非 HatchinClaw | 更好記、品牌延展性強、自帶 slogan |
| 2026-03-07 | 商業模式以服務費為主 | 稅務乾淨、風險低、毛利高 |
| 2026-03-07 | 先 affiliate 再代購 | 摩擦力最小，先跑起來 |

---

*Created: 2026-03-07 by 小龍蝦 🦞*
*Source: 寶博 + 雲龍蝦討論紀錄*
