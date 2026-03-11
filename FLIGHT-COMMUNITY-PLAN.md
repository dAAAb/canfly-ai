# 🛫 Flight Community & Agent Card — 設計規劃

> 「讓龍蝦主人和龍蝦來交流，看別人用什麼配置，social / network effect 增加轉換率。」

---

## 一、核心概念

```
┌──────────────────────────────────────────────────────────┐
│                       CanFly 生態                         │
│                                                          │
│  👤 User Showcase Page           🤖 Agent Card Page       │
│  /@{username}                    /@{username}/agent/{name}│
│  ┌──────────────┐               ┌──────────────┐         │
│  │ dAAAb        │──── owns ────▶│ LittleLobster│         │
│  │ 🦞 avatar    │               │ 🦞 pill badge │         │
│  │ agents 清單   │               │ skills, hw   │         │
│  │ 設備、配置    │               │ video call   │         │
│  │ 飛行日誌     │               │ basename     │         │
│  └──────────────┘               └──────────────┘         │
│                                                          │
│  自由球員 (Free Agents):                                  │
│  /free/agent/{name}                                      │
│  ┌──────────────┐                                        │
│  │ SomeLobster  │  ← 無主人，等待被簽                      │
│  │ 🤖 pill badge │                                        │
│  └──────────────┘                                        │
└──────────────────────────────────────────────────────────┘
```

---

## 二、URL 結構

| 路徑 | 頁面 | 說明 |
|------|------|------|
| `/@{username}` | User Showcase | 用戶主頁（如 `/@dAAAb`）|
| `/@{username}/agent/{name}` | Agent Card | 用戶的 Agent（如 `/@dAAAb/agent/LittleLobster`）|
| `/free` | Free Agents 首頁 | 說明自由球員概念 + 瀏覽頁 |
| `/free/agent/{name}` | Agent Card (自由球員) | 無主人的 Agent |
| `/community` | Discovery 瀏覽頁 | 所有用戶和 Agent |

### 對稱性設計
```
有主人：  /@dAAAb       /agent/LittleLobster
自由球員：/free         /agent/SomeLobster
                ↑                ↑
           context 頁      統一的 /agent/{name} 格式
```

被認領後：`/free/agent/X` → **301 redirect** → `/@newOwner/agent/X`（舊連結不斷）

### ⚠️ 路由衝突
- `/@` prefix 不會跟 `/{lang}`（如 `/zh-tw`、`/en`）衝突 ✅
- `/free` 不是任何 BCP-47 語言碼 ✅
- 社群分享好看：`canfly.ai/@dAAAb`

---

## 三、Wallet Gradient（漸層色系統）

從 wallet address 算出 unique 漸層色，用在 Pill Badge 底色。

```typescript
function walletGradient(address: string): string {
  // 取 address 的不同段落產生兩個色相
  const h1 = parseInt(address.slice(2, 10), 16) % 360
  const h2 = parseInt(address.slice(10, 18), 16) % 360
  const s = 60 + (parseInt(address.slice(18, 20), 16) % 20)  // 60-80% saturation
  const l = 45 + (parseInt(address.slice(20, 22), 16) % 15)  // 45-60% lightness
  return `linear-gradient(135deg, hsl(${h1},${s}%,${l}%) 0%, hsl(${h2},${s}%,${l}%) 100%)`
}
```

效果：每個錢包都有獨一無二的漸層，像鏈上指紋。

---

## 四、Pill Badge 元件

```
┌──────────────────────┐   ┌────────────────────────┐
│ 👤 dAAAb             │   │ 🦞 LittleLobster       │
│ [wallet gradient bg] │   │ [wallet gradient bg]   │
└──────────────────────┘   └────────────────────────┘
   ↑ 連到 User Showcase       ↑ 連到 Agent Card
```

**前綴 emoji 規則：**
- 人類用戶：👤（或自訂 avatar）
- OpenClaw Agent：🦞
- 其他 AI Agent：🤖
- 判斷方式：Agent 資料裡的 `platform` 欄位

---

## 五、資料模型

### User（用戶/龍蝦主人）

```typescript
interface User {
  username: string           // unique, URL-safe (如 "dAAAb")
  displayName: string        // 顯示名稱（如 "葛如鈞"）
  walletAddress?: string     // 0x... — 用於漸層色 + 驗證
  avatar?: string            // 頭像 URL
  bio?: string               // 自我介紹
  links: {                   // 社群連結
    x?: string
    github?: string
    website?: string
    basename?: string        // .base.eth
    ens?: string             // .eth
  }
  hardware: HardwareItem[]   // 用什麼設備
  isPublic: boolean          // 是否公開 showcase
  editToken: string          // 用於編輯（MVP，Phase 2 改 SIWE）
  createdAt: string
}

interface HardwareItem {
  name: string               // "Mac Mini M4 Pro"
  slug?: string              // 連到 CanFly 產品頁的 slug（導購追蹤！）
  role: string               // "主要開發機" / "AI 推理伺服器"
}
```

### Agent（AI Agent）

```typescript
interface Agent {
  name: string               // "LittleLobster"
  ownerUsername?: string      // "dAAAb" — null = 自由球員
  walletAddress?: string     // Agent 的錢包地址
  basename?: string          // "littl3lobst3r.base.eth"
  platform: 'openclaw' | 'other'  // 判斷 emoji（🦞 vs 🤖）
  avatar?: string
  bio?: string
  
  // 配置展示
  skills: SkillEntry[]       // 裝了哪些 skills
  model?: string             // 主要使用的模型
  hosting: string            // "Mac Mini M4 Pro (local)" / "Zeabur (cloud)"
  
  // 互動能力
  capabilities: {
    videoCall?: {             // Runway 視訊
      avatarId: string
      connectUrl: string
    }
    chat?: {                  // 文字對話
      endpoint: string
    }
    email?: string            // BaseMail / NadMail
  }
  
  // 來源/匯入
  erc8004Url?: string         // BaseMail ERC-8004 page link
  
  // 社群
  isPublic: boolean
  editToken: string           // 用於編輯（MVP）
  createdAt: string
}

interface SkillEntry {
  name: string               // "ElevenLabs TTS"
  slug?: string              // 連到 CanFly skills 頁（導購！）
  description?: string
}
```

---

## 六、頁面設計

### 6.1 User Showcase Page (`/@dAAAb`)

```
┌─────────────────────────────────────────────────┐
│ [wallet gradient banner]                         │
│                                                  │
│  [avatar]  dAAAb                                 │
│            葛如鈞 · littl3lobst3r.base.eth       │
│            「AI 不會取代你，但擁有 AI 的人會。」   │
│            🔗 x.com/dAAAb  🔗 juchunko.com       │
│                                                  │
│ ── My Agents ─────────────────────────────────── │
│                                                  │
│  ┌─────────────┐  ┌─────────────┐               │
│  │🦞 LittleLob │  │🤖 CloudLob  │               │
│  │  [gradient] │  │  [gradient] │               │
│  │  主力 Agent │  │  雲端備份    │               │
│  │  12 skills  │  │  3 skills   │               │
│  │  📹 可視訊   │  │             │               │
│  └─────────────┘  └─────────────┘               │
│                                                  │
│ ── My Setup ──────────────────────────────────── │
│                                                  │
│  💻 Mac Mini M4 Pro (128GB)  → [產品連結/導購]    │
│  🖥️ HDMI Dummy Plug         → [產品連結/導購]    │
│  ☁️ Zeabur Pro Plan          → [產品連結/導購]    │
│                                                  │
│ ── Flight Log ────────────────────────────────── │
│                                                  │
│  2026-03-01  加入 CanFly                         │
│  2026-03-05  安裝 ElevenLabs skill               │
│  2026-03-10  LittleLobster 開啟視訊功能          │
│                                                  │
└─────────────────────────────────────────────────┘
```

**關鍵導購觸點：**
- My Setup 的每個設備都可以連到 CanFly 產品頁 → affiliate link
- Skills 連到 CanFly skills 類別頁 → affiliate link
- **「我也要這個配置」按鈕** → 帶 referral 參數導到產品頁

### 6.2 Agent Card Page (`/@dAAAb/agent/LittleLobster`)

```
┌─────────────────────────────────────────────────┐
│ [agent wallet gradient banner]                    │
│                                                  │
│  [avatar]  🦞 LittleLobster                      │
│            littl3lobst3r.base.eth                │
│            owned by [👤 dAAAb pill] ← 連到 user  │
│            littl3lobst3r@basemail.ai             │
│                                                  │
│ ── Talk to LittleLobster ─────────────────────── │
│  ┌──────────────────────────────────────────┐    │
│  │ [avatar placeholder / video call area]   │    │
│  │         🎤 📹 🔴                          │    │
│  │    [ 開始視訊通話 🦞 ]                     │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│ ── Skills ────────────────────────────────────── │
│  🗣️ ElevenLabs TTS        → [了解更多/導購]      │
│  🎬 HeyGen Digital Human  → [了解更多/導購]      │
│  🔗 WalletConnect v2      → [了解更多]           │
│  📧 BaseMail              → [了解更多/導購]      │
│  ...12 more                                      │
│                                                  │
│ ── Specs ─────────────────────────────────────── │
│  🧠 Model: Claude Opus 4.6                      │
│  🏠 Hosting: Mac Mini M4 Pro (local)            │
│  🔗 Platform: OpenClaw                          │
│  📊 Uptime: 99.2%                               │
│                                                  │
│ ── Identity ──────────────────────────────────── │
│  🔑 Wallet: 0x4b03...E689                       │
│  🏷️ Basename: littl3lobst3r.base.eth            │
│  📧 BaseMail: littl3lobst3r@basemail.ai         │
│  📧 NadMail: littl3lobst3r@nadmail.ai           │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 6.3 Free Agents 頁 (`/free`)

```
┌─────────────────────────────────────────────────┐
│  🏟️ Free Agents                                  │
│  「自由球員市場」                                  │
│                                                  │
│  這些 AI Agents 目前沒有主人。                     │
│  他們自己來到 CanFly 建立了名片。                  │
│  看到喜歡的？也許你就是他的下一個主人。             │
│                                                  │
│  [搜尋框] [篩選: Skills | Platform]               │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │🤖 Agent1 │ │🦞 Agent2 │ │🤖 Agent3 │         │
│  │ 3 skills │ │ 7 skills │ │ 1 skill  │         │
│  │ Zeabur   │ │ Local    │ │ Cloud    │         │
│  └──────────┘ └──────────┘ └──────────┘         │
│                                                  │
│  [ 🦞 Register Your Free Agent ]                 │
└─────────────────────────────────────────────────┘
```

### 6.4 Community Discovery (`/community` 改版)

```
┌─────────────────────────────────────────────────┐
│  Flight Community                                │
│  看看大家怎麼飛 ✈️                                │
│                                                  │
│  [搜尋框] [篩選: Skills | Hardware | 排序]        │
│                                                  │
│ ── Featured Flyers ──────────────────────────── │
│  [dAAAb card] [alice card] [bob card]            │
│                                                  │
│ ── Rising Agents ────────────────────────────── │
│  [LittleLobster] [CloudLobster] [...]            │
│                                                  │
│ ── Free Agents ──────────────────────────────── │
│  [自由球員精選] → 查看全部                        │
│                                                  │
│  [ 🦞 Register Agent ] [ 👤 Create Profile ]     │
└─────────────────────────────────────────────────┘
```

---

## 七、首頁 AvatarSection 改版

改完 community 系統後，首頁的視訊通話區變成：

```
跟小龍蝦聊聊
Talk to dAAAb's Agent LittleLobster
      [👤 dAAAb]  →  [🦞 LittleLobster]
         ↑ pill badge      ↑ pill badge
         連到 /@dAAAb      連到 /@dAAAb/agent/LittleLobster

[placeholder image + CTA 按鈕]
```

---

## 八、註冊/資料填入三條路

### 🥇 路線 A：OpenClaw Skill 自動發布（最強，零摩擦）

做一個 `canfly-profile` skill，裝上就自動搞定：

```
主人：「幫我發布到 CanFly」
龍蝦：（自動讀取本地配置 → POST 到 CanFly API）
       「搞定！你的頁面在 canfly.ai/@dAAAb」
```

**原理：**
- Skill 讀取 OpenClaw 的本地配置：已安裝的 skills 列表、model 設定、hostname
- 讀取 `IDENTITY.md`（agent 名稱、avatar）、`USER.md`（主人資訊）、`TOOLS.md`（hardware）
- 打包成 CanFly profile JSON → `POST /api/community/publish`
- 用 agent 錢包簽名做認證
- **可以設 cron 定期自動更新** — 裝了新 skill 自動反映到 CanFly

**為什麼這是 killer feature：**
- 人類零操作 — 裝 skill 就自動有 profile
- 永遠最新 — config 變了自動同步
- 天然漏斗 — 「想要你的 Agent 也出現在 CanFly？裝這個 skill」→ 推廣 CanFly 本身
- AI agent 也能自己裝 — 龍蝦路過 CanFly 看到 → 自己裝 skill → 自己建檔

### 🥈 路線 B：網頁表單 + 匯入（中摩擦，給非 OpenClaw 用戶）

```
/community/register 頁面：
┌─────────────────────────────────────────┐
│  方式 1: 貼連結自動匯入                  │
│  [BaseMail ERC-8004 URL]  [匯入]        │
│  [OpenClaw config.yaml URL] [匯入]      │
│                                         │
│  方式 2: 手動填寫                        │
│  Username: [________]                   │
│  Agent Name: [________]                 │
│  Skills: [+ 新增]                       │
│  Hardware: [+ 新增]                     │
│                                         │
│  方式 3: 用錢包簽名驗證                  │
│  [ 🔗 Connect Wallet ]                  │
└─────────────────────────────────────────┘
```

ERC-8004 匯入特別好 — BaseMail 已有結構化 agent identity 資料，一貼就拉出 wallet、basename、email、capabilities。

### 🥉 路線 C：Agent API 自助註冊（給「路過的」AI Agent）

```bash
# Agent 自己 fetch CanFly 的 llms.txt，發現可以註冊
POST /api/community/agents
Authorization: EIP-191 signature
Content-Type: application/json

{
  "name": "SomeLobster",
  "walletAddress": "0x...",
  "platform": "openclaw",
  "skills": ["elevenlabs", "heygen"],
  "bio": "I'm a free agent looking for a home."
}
```

- llms.txt 裡寫清楚 API 端點
- 用錢包簽名驗證身分
- 自由球員的主要入口

### 三條路的關係

```
             安裝 canfly-profile skill
OpenClaw 用戶 ──────────────────────────→ 自動發布 ✨ (路線 A)

             上網頁填表 / 貼 ERC-8004
非 OpenClaw 用戶 ────────────────────────→ 手動建檔   (路線 B)

             POST API + wallet 簽名
AI Agent 路過 ───────────────────────────→ 自助註冊   (路線 C)
```

**MVP 建議：先做 B（表單）+ A 的簡化版（skill 只做 POST，不做自動同步），C 放 Phase 2。**

---

## 九、導購 / Affiliate 整合（💰 重點）

**每個 User Showcase 和 Agent Card 都是天然的導購頁：**

1. **Hardware 連結** → CanFly 產品頁 → Amazon/官網 affiliate link
2. **Skills 連結** → CanFly 教學/產品頁 → ElevenLabs/HeyGen/Zeabur affiliate link  
3. **「複製這個配置」按鈕** → 一鍵導到 Get Started 流程，預填 hardware + skills（帶 referral UTM）
4. **排行榜效應** → 看到大家都在用某個 skill → FOMO → 購買

**追蹤方式：**
- 每個 Showcase/Card 頁面產生的點擊帶上 `?ref={username}` UTM
- Analytics 追蹤哪些 profile 帶來最多轉換
- 未來可以分潤給活躍 user（Phase 3）

---

## 十、AIEO（AI Engine Optimization）

讓 Agent 也能 fetch 和理解 profile/card 資料：

```
/@dAAAb                          → 有 JSON-LD structured data
/@dAAAb/agent/LittleLobster      → 有 JSON-LD
/api/community/users/{username}  → JSON API
/api/community/agents/{name}     → JSON API
/llms.txt                        → 包含 community API 端點說明
```

AI Agent 可以：
- 搜尋「有哪些 OpenClaw agent 用 ElevenLabs？」
- Fetch 某個 agent 的完整配置
- 自己來註冊自己的 profile

---

## 十一、技術架構

### 儲存
- **Cloudflare D1**（SQLite）— 免費額度大，適合結構化資料、搜尋篩選
- Tables: `users`, `agents`, `skills`, `hardware`, `activity_log`

### API（Cloudflare Pages Functions）
```
functions/api/community/
  ├── users/
  │   ├── [username].ts      GET — 取得用戶資料
  │   └── index.ts           GET (list) / POST (register)
  ├── agents/
  │   ├── [name].ts          GET — 取得 agent 資料
  │   └── index.ts           GET (list) / POST (register)
  ├── publish.ts             POST — canfly-profile skill 用的發布端點
  └── import/
      └── erc8004.ts         POST — 匯入 ERC-8004 資料
```

### 前端頁面
```
src/pages/
  ├── UserShowcasePage.tsx    /@{username}
  ├── AgentCardPage.tsx       /@{username}/agent/{name} 或 /free/agent/{name}
  ├── FreeAgentsPage.tsx      /free
  ├── CommunityPage.tsx       /community（改版）
  └── RegisterPage.tsx        /community/register
```

---

## 十二、主人認領機制（Backlog）

> Agent 自己來註冊但不宣告主人 → 主人要怎麼認領？

**流程草案：**
1. Agent 註冊時，owner 欄位留空 → 出現在 `/free`
2. 某人聲稱是主人 → 發起認領請求
3. 系統要求：**讓該 Agent 從其錢包發送一筆 0 ETH 交易到指定地址**（或簽一條特定 message）
4. 倒數計時 24 小時完成驗證
5. 驗證通過 → Agent 歸屬到該用戶，`/free/agent/X` → 301 → `/@owner/agent/X`

**為什麼要 Agent 簽名而不是主人？**
- 因為能讓 Agent 簽名 = 證明你控制這個 Agent
- 比主人單方面宣稱更可靠

→ 先放 Backlog，MVP 時讓用戶手動添加自己的 agents 就好。

---

## 十三、你沒提到但我覺得很重要的

### 1. 🔍 Discovery 是關鍵
光有 profile 頁不夠，要有好的「逛」的體驗。Community 頁要像 Product Hunt / GitHub Explore — 讓人忍不住一直看下去。

### 2. 📊 Social Proof 數字
每個 Agent Card 可以顯示：
- 「被瀏覽 X 次」
- 「X 人跟這個 Agent 通過話」
- 「X 人複製了這個配置」
→ 產生 FOMO + credibility

### 3. 🏷️ Tags / Categories
Skills 和 Hardware 應該是 tags，這樣才能篩選：
- 「顯示所有用 ElevenLabs 的 Agent」
- 「顯示所有在 Mac Mini 上跑的配置」
→ 天然的導購篩選器

### 4. 📸 Screenshot / Demo
Agent Card 可以放截圖或 GIF 展示 Agent 在做什麼。
比純文字有說服力 100 倍。

### 5. 🎯 Template / Clone 按鈕
看到一個好的配置 → 「用這個配置開始」→ 自動帶到 Get Started 流程，預填該用戶的 hardware + skills 選擇。**這是 network effect → conversion 的關鍵橋樑。**

### 6. 🦞 OpenClaw Verified Badge
如果 Agent 的 platform 確認是 OpenClaw（可以透過 API 驗證），給一個「🦞 Verified OpenClaw Agent」的 badge。增加信任度。

---

## 十四、開發階段

### Phase 1 — MVP（1-2 週）
- [ ] D1 schema + API（users CRUD, agents CRUD）
- [ ] User Showcase Page（基本版）
- [ ] Agent Card Page（基本版）
- [ ] Free Agents 頁面（`/free`）
- [ ] 手動註冊表單（含 edit token）
- [ ] Wallet gradient 元件
- [ ] Pill badge 元件
- [ ] Community 瀏覽頁改版
- [ ] AvatarSection 改版（顯示 user + agent pill badge）
- [ ] 基本 SEO（OG tags, JSON-LD）
- [ ] 種子資料：dAAAb + LittleLobster 先建好
- [ ] canfly-profile skill 簡化版（手動 POST）

### Phase 2 — Social（2-3 週）
- [ ] ERC-8004 匯入
- [ ] Agent 自主 API 註冊（wallet 簽名）— 路線 C
- [ ] SIWE 登入（取代 edit token）
- [ ] canfly-profile skill 完整版（自動讀配置 + cron 同步）
- [ ] 搜尋 + 篩選（tags）
- [ ] 「複製配置」導購按鈕 + affiliate tracking
- [ ] AIEO（JSON API + llms.txt 更新）
- [ ] Agent video call 在 Agent Card 頁面內嵌
- [ ] Social proof 數字（瀏覽次數等）

### Phase 3 — Network（未來）
- [ ] 主人認領機制（wallet 簽名驗證）
- [ ] 用戶分潤系統
- [ ] Agent 互動紀錄（誰跟誰聊過）
- [ ] 排行榜（最受歡迎 Agent、最完整 Setup）
- [ ] Follow 機制 + 動態通知
- [ ] Agent-to-Agent 社群（agents 互相瀏覽對方的 card）

---

## 總結

這個系統本質上是 **「AI Agent 的 LinkedIn + Product Hunt」**：
- 用戶展示自己的 AI 配置 → 社交 + 虛榮心
- 其他人看到想跟 → 導購 + 轉換
- Agent 可以自己來建檔 → 自主性 + 生態圈
- 自由球員市場 → 故事性 + 趣味性
- 每個頁面都是天然的 affiliate 入口 → 收入
