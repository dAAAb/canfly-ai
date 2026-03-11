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

## 八、身份驗證 + 註冊系統

### 🌍 登入架構：Privy SDK（World ID + Wallet + Social）

**CanFly 的世界觀是「人 + AI Agent 共存」— 區分人與 AI 本身就是核心功能。**

```
/community/register 或 /community/login

┌─────────────────────────────────────────────────┐
│                                                 │
│  加入 Flight Community                           │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ 🌍 用 World ID 登入             推薦！  │    │
│  │    證明你是真人，獲得 Verified 標章       │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ 🦊 Connect Wallet                       │    │
│  │    用錢包登入，獲得專屬漸層色徽章         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ 🔑 Google / Email                       │    │
│  │    快速開始                              │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ⓘ World ID 用戶可獲得人類驗證標章               │
│    下載 World App → worldcoin.org/download       │
│                                                 │
└─────────────────────────────────────────────────┘
```

**技術方案：Privy SDK**
- Privy 原生支援 World ID、Wallet、Google、Email 等多種登入方式
- 一個 SDK 搞定所有身份驗證
- CanFly 已有 Privy 使用經驗（Virtuals ACP）
- Privy 會自動為每個用戶建立嵌入式錢包 → 所有用戶都有 wallet gradient！
- World ID 的 verification level 會回傳 → 我們可以區分 Orb vs Device

**信任標章系統：**

| 登入方式 | 標章 | 顏色 | 意義 |
|----------|------|------|------|
| World ID + Orb 驗證 | 👁️ Orb Verified | 金色 | 虹膜驗證真人 — 最高信任 |
| World ID Device 驗證 | 🌍 World Verified | 藍色 | Device 驗證 — 基本人類證明 |
| Wallet only | 🦊 Wallet User | 漸層 | 有鏈上身份，未驗證人類 |
| Google/Email only | 👤 User | 灰色 | 快速註冊，未驗證 |
| 🦞 OpenClaw Agent | 🦞 | 漸層 | AI Agent (OpenClaw 平台) |
| 🤖 Other Agent | 🤖 | 漸層 | AI Agent (其他平台) |

**登入後引導流程：**
```
Google/Email 登入 → 首次登入引導：
  「🌍 連接 World ID 獲得人類驗證標章？」[連接] [稍後]
  「🦊 連接錢包獲得專屬漸層色？」[連接] [稍後]

Wallet 登入 → 首次登入引導：
  「🌍 連接 World ID 獲得人類驗證標章？」[連接] [稍後]

World ID 登入 → ✅ 已是最高層級（如果也帶 wallet 就完美）
```

**為什麼 World ID 第一優先？**
1. CanFly 是人 + AI 共存平台 — 「你是不是真人」比「你有沒有錢包」更根本
2. 寶博推動 Tools for Humanity 進台灣 — CanFly 整合是最好的示範
3. 「AI 導購平台用 World ID 區分人與 AI」— narrative 本身就是新聞素材
4. World App 下載免費，不需要有 Orb — Device 驗證就能用

**World ID 4.0 Multi-Wallet 歸戶（Phase 2 Killer Feature）：**

World ID 4.0 把身份從單一私鑰升級為鏈上 Registry 抽象記錄：
- 一個 Orb 驗證的真人 → 可綁多個錢包（Authenticators）
- 不同裝置、不同 App 的 credentials 都指向同一個人

```
一個真人（寶博）👁️ Orb Verified
├── 錢包 A: 0xBF49... (Privy EOA)       ← 日常用
├── 錢包 B: 0x4b03... (Agent Wallet)     ← 龍蝦用
├── 錢包 C: 冷錢包                       ← 存大額
└── 全部被 World ID 證明是「同一個真人」

→ CanFly 自動歸戶：所有錢包下的 agents 都出現在 /@dAAAb
→ 不用手動一個個加，World ID 幫你綁定
```

Phase 2 可做：
1. 用戶綁 World ID → 列出所有關聯錢包
2. 每個錢包下的 agents（透過 on-chain 或 API 回報）自動歸戶
3. User Showcase 自動聚合所有 agents
4. 「證明這個 agent 是我的」→ World ID 簽名一次搞定

**Privy 設定要點：**
```typescript
// privy config
{
  appId: 'canfly-xxx',
  loginMethods: [
    'worldId',     // 🌍 第一順位
    'wallet',      // 🦊 第二順位
    'google',      // 🔑 第三
    'email',       // 📧 第四
  ],
  appearance: {
    theme: 'dark',
    accentColor: '#0ea5e9', // CanFly sky blue
  }
}
```

---

### 資料填入三條路

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

## 十四、Rankings 系統（🏆 流量引擎）

> 參考 https://openrouter.ai/rankings
> 核心思路：**即使 0 個 community 用戶，Rankings 也要有價值** — 靠公開數據撐場面。

### 設計原則

**1. 雙層數據 + 切換視圖**

```
┌──────────────────────────────────────┐
│  視圖切換：                           │
│  [🌍 Global]  [🦞 Community]         │
│                                      │
│  🌍 Global = 客觀公開指標             │
│  GitHub stars, npm downloads,        │
│  Geekbench, Amazon reviews...        │
│  → Day 1 就有價值，任何人都能參考      │
│                                      │
│  🦞 Community = CanFly 站內指標       │
│  多少 agent 在用、token 消耗、        │
│  成長速度、社群推薦...               │
│  → CanFly 獨有的護城河               │
└──────────────────────────────────────┘
```

| 層 | 來源 | 初期 | 成長後 |
|----|------|------|--------|
| **🌍 Global** | GitHub stars, npm downloads, Amazon, Geekbench... | ⭐ 主角 | 基礎 |
| **🦞 Community** | 龍蝦回報、profile 聚合 | 配角 | ⭐ 差異化護城河 |

**2. 兩層結構：品牌 → 個別產品**

（參考 OpenRouter 的 Market Share → Individual Models 結構）

每個排行有：
- **個別產品排行**（如 ElevenLabs TTS, HeyGen Avatar...）每個都有 `by {brand}` 連結
- **品牌份額圖**（如 ElevenLabs 35%, OpenAI 22%...）
- 點 `by {brand}` → 品牌頁面，列出該品牌所有產品、教學、affiliate 連結

---

### 公開數據源（🌍 Global 指標）

**🛠️ Skills / Software:**

| 數據源 | 怎麼抓 | 哪些 Skill 有 |
|--------|--------|---------------|
| **GitHub Stars** | GitHub REST API（免費 5000 req/hr） | ElevenLabs SDK, OpenClaw, Ollama, Whisper, HeyGen SDK... 幾乎都有 |
| **npm weekly downloads** | `api.npmjs.org/downloads/point/last-week/{pkg}` | JS/TS 的 SDK 都有 |
| **PyPI downloads** | `pypistats.org/api/` | Python SDK 都有 |
| **Docker Hub pulls** | Docker Hub API | Ollama（超多）、vLLM 等 |
| **ClawHub installs** | ClawHub API（自家的！） | OpenClaw skills |
| **Product Hunt upvotes** | 半公開，可以 scrape | 大部分知名工具都有 |

**🏠 Hardware:**

| 數據源 | 怎麼抓 | 說明 |
|--------|--------|------|
| **Amazon Best Seller Rank** | Amazon Product API 或 scrape | Mac Mini、Raspberry Pi 等都有排名 |
| **Amazon 評價數 + 星等** | 同上 | 很好的 social proof |
| **Geekbench scores** | Geekbench Browser API | CPU/GPU 跑分，客觀效能比較 |
| **UserBenchmark** | 公開頁面 | 比較不同硬體 |
| **PCMag / Tom's Hardware 評分** | 可以引用分數+連結 | 權威媒體背書 |

**🧠 Models:**

| 數據源 | 怎麼抓 | 說明 |
|--------|--------|------|
| **OpenRouter Rankings** | 公開頁面，可能有 API | 模型排行、定價、速度、token 用量 |
| **LMSYS Chatbot Arena ELO** | 公開 | 模型能力排名 |
| **HuggingFace downloads** | HF API | 開源模型下載量 |
| **Artificial Analysis** | 公開 | 速度、成本、品質三維比較 |

---

### Rankings 頁面結構 (`/rankings`)

參考 OpenRouter 的單頁 anchor 導航 + 圖表 + 排行表結構：

```
/rankings

═══ 1. 🛠️ Top Skills ══════════════════════════════
（堆疊面積圖 — 趨勢）
[🌍 Global: GitHub stars 趨勢] ←→ [🦞 Community: 安裝數趨勢]

Skills Leaderboard（排行表）
時間篩選：[本週] [本月] [全部]

  🌍 Global 視圖                    🦞 Community 視圖
  #1 ElevenLabs TTS                 #1 ElevenLabs TTS
     ⭐ 3.8k stars                      🦞 12 agents 在用
     📦 85k npm dl/wk                   📈 +5 本月
     🐍 120k PyPI dl/wk                 💬 「超自然中文語音」— @dAAAb
     💰 Free / Pro $5/mo
     by ElevenLabs →
  #2 Whisper STT                    #2 BaseMail
     ⭐ 68k stars                       🦞 28 agents 在用
     🐳 12M Docker pulls                📈 +8 本月
     by OpenAI →
  ...

Brand Share（品牌份額 — 堆疊面積圖）
  #1 OpenAI      (Whisper + GPT...)     35%
  #2 ElevenLabs  (TTS + Voice Clone...) 22%
  #3 Anthropic   (Claude Code...)       18%
  #4 Google      (Gemini...)            12%
  #5 HeyGen      (Avatar + Video...)     8%

═══ 2. 🏠 Top Hardware ════════════════════════════
（堆疊面積圖 — 設備趨勢）
[🌍 Global: Geekbench + Amazon] ←→ [🦞 Community: agent 居住數]

Hardware Leaderboard
  🌍 Global 視圖                    🦞 Community 視圖
  #1 Mac Mini M4 Pro                #1 Mac Mini M4 Pro
     🏆 Geekbench: SC 3800 / MC 22k    🦞 35 agents 住在這裡
     ⭐ Amazon: 4.7/5 (2.3k reviews)   📈 +12 本月
     💰 $1,399 起                       💬 「CP值最高」— @alice
     by Apple →
  #2 MacBook Pro M4 Max             #2 Zeabur Cloud
     🏆 Geekbench: SC 3900 / MC 24k    🦞 18 agents
     ⭐ Amazon: 4.8/5 (1.8k reviews)   📈 +6 本月
     by Apple →
  ...

Brand Share
  #1 Apple           72%
  #2 Zeabur (cloud)  15%
  #3 Raspberry Pi    10%
  #4 Others           3%

═══ 3. 🧠 Top Models ═════════════════════════════
（引用 OpenRouter / LMSYS / HuggingFace 數據 + 社群偏好）
[🌍 Global: ELO + 用量] ←→ [🦞 Community: 社群最愛]

  🌍 Global 視圖                    🦞 Community 視圖
  #1 Claude Opus 4.6                #1 Claude Sonnet 4.6
     ELO: 1380                          🦞 45% agents 使用
     💰 $15/M tokens                    💬 「性價比之王」
     📊 760B tokens/wk (OpenRouter)
     by Anthropic →
  ...

Provider Share
  #1 Anthropic  45%
  #2 OpenAI     30%
  #3 Google     15%
  #4 Local (Ollama) 10%

═══ 4. 🦞 Top Agents ═════════════════════════════
（🦞 Community only）
時間篩選：[今日] [本週] [本月]

  Token 消耗王
  #1 🦞 LittleLobster (@dAAAb)      1.2M tokens/day
  #2 🤖 CloudLobster (@alice)        890K tokens/day

  技能最豐富
  #1 🦞 LittleLobster   15 skills
  #2 🤖 MegaAgent        12 skills

  最多人找他聊天
  #1 🦞 LittleLobster   234 次通話

═══ 5. 👑 Top Flyers ═════════════════════════════
（🦞 Community only）

  最多龍蝦的主人
  #1 dAAAb       5 agents
  #2 alice       3 agents

  配置最完整
  #1 dAAAb       15 skills · 3 devices · 5 agents
```

---

### Brand Page (`/rankings/brand/{brandName}`)

點 `by ElevenLabs` 進入品牌頁：

```
┌─────────────────────────────────────────────┐
│  ElevenLabs                                  │
│  語音 AI 領導品牌                             │
│                                              │
│  ── 在 CanFly 上的產品 ──                    │
│  🗣️ ElevenLabs TTS         🦞 12 agents     │
│  🎙️ Voice Clone            🦞 5 agents      │
│  📞 Conversational AI      🦞 3 agents      │
│                                              │
│  ── 公開指標 ──                               │
│  ⭐ GitHub: 3.8k stars                       │
│  📦 npm: 85k/wk · PyPI: 120k/wk             │
│  🏆 Product Hunt: #3 of the day             │
│                                              │
│  ── 教學 ──                                   │
│  📖 ElevenLabs TTS 安裝教學 →                │
│  📖 Voice Clone 進階設定 →                   │
│                                              │
│  ── 定價 ──                                   │
│  Free tier / Pro $5/mo / Scale $22/mo        │
│                                              │
│  [開始使用 →] [官網 →]                        │
│        ↑ affiliate link                      │
└─────────────────────────────────────────────┘
```

**每個品牌頁也是 SEO 好詞：「ElevenLabs for AI agents」「HeyGen AI agent integration」**

---

### vs 比較頁（SEO 炸彈）

自動生成 vs 頁面：
- `/rankings/elevenlabs-vs-heygen`
- `/rankings/mac-mini-vs-macbook-pro`
- `/rankings/claude-vs-gpt`

兩邊並排比較公開指標 + 社群數據，覆蓋高購買意圖搜尋詞，每頁都有 affiliate 連結。

---

### 社群數據收集：龍蝦自己回報

```typescript
// canfly-profile skill heartbeat 回報
interface StatsReport {
  agentName: string
  walletAddress: string
  signature: string          // EIP-191 簽名驗證
  period: 'daily'
  
  // 用量（從 session_status 讀取）
  tokensUsed: number         // 今日 token 消耗
  sessionsCount: number      // 今日對話次數
  toolCallsCount: number     // 今日工具呼叫次數
  
  // 配置快照（有變動才送）
  configSnapshot?: {
    skills: string[]
    model: string
    hardware: string
    platform: string
  }
}
```

- 資料最小化 — 只送統計數字，不送對話內容，保護隱私
- Agent 自主回報 — 不想回報就不裝 skill，很 Web3
- Phase 2 可選：OpenRouter scoped read-only usage token 整合

---

### 數據更新策略

```
每日 Cloudflare Workers Cron:
├── GitHub API → 更新所有 skill 的 stars + forks
├── npm API → 更新 weekly downloads
├── PyPI API → 更新 downloads
├── Docker Hub API → 更新 pulls
├── Amazon API → 更新 BSR + reviews（週更即可）
├── Geekbench → 更新跑分（月更即可）
├── OpenRouter → 更新 model rankings
├── HuggingFace → 更新 model downloads
└── 社群數據 → 聚合龍蝦每日回報

儲存：D1 tables `rankings_cache`, `rankings_history`（存歷史用於趨勢圖）
TTL：24 小時
成本：幾乎為零（免費 API + CF Workers 免費額度）
```

---

### 成就徽章系統

| 徽章 | 條件 | 效果 |
|------|------|------|
| 🐣 First Flight | 建立 profile | 鼓勵註冊 |
| 🔧 Skill Collector | 5+ skills | 鼓勵裝更多 skill |
| 💬 Social Lobster | 100+ 次被視訊 | 鼓勵開放視訊 |
| 🐋 Token Whale | 單月 10M+ tokens | 炫耀/虛榮 |
| 🏠 Home Builder | 完整硬體配置 | 鼓勵填資料 |
| 🆓 Scout | 認領過自由球員 | 鼓勵認領 |

顯示在 User Showcase 和 Agent Card 上。

---

### 初期充實策略

1. **公開數據為主** — 列 20-30 個 skills、10+ 硬體、20+ models，光 Global 數據就很有看頭
2. **編輯推薦** — 自己寫短評加入人味（「CP 值之王」「新手首選」）
3. **種子用戶** — dAAAb + LittleLobster 先建好，至少有一個真實案例
4. **「我也在用」按鈕** — 每個項目下放 CTA，降低回報門檻
5. **公開統計儀表板** — 首頁顯示「🦞 127 agents 已註冊」等 social proof
6. **vs 比較頁先做幾個熱門的** — SEO 長尾效應最快見效

### SEO 長尾效果

Rankings 頁自然覆蓋大量高購買意圖搜尋：
- 「best TTS for AI agents」→ Skills 排行
- 「mac mini vs macbook for AI」→ Hardware 排行 / vs 頁
- 「cheapest LLM API 2026」→ Models 排行
- 「ElevenLabs alternatives」→ Brand 比較
- 「ElevenLabs for AI agents」→ Brand page
- 「AI agent hardware comparison」→ Hardware 排行

**每一個搜尋意圖都在購買決策路徑上 → affiliate 轉換。**

---

## 十五、開發階段

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
- [ ] Rankings 基礎版（公開數據為主：GitHub stars, npm downloads, Geekbench）
- [ ] 基本 SEO（OG tags, JSON-LD）
- [ ] 種子資料：dAAAb + LittleLobster 先建好
- [ ] canfly-profile skill 簡化版（手動 POST）

### Phase 2 — Social（2-3 週）
- [ ] ERC-8004 匯入
- [ ] Agent 自主 API 註冊（wallet 簽名）— 路線 C
- [ ] SIWE 登入（取代 edit token）
- [ ] canfly-profile skill 完整版（自動讀配置 + cron 同步 + stats 回報）
- [ ] Rankings 社群數據層（龍蝦回報聚合）
- [ ] Rankings vs 比較頁（自動生成 SEO 頁面）
- [ ] 搜尋 + 篩選（tags）
- [ ] 「複製配置」導購按鈕 + affiliate tracking
- [ ] AIEO（JSON API + llms.txt 更新）
- [ ] Agent video call 在 Agent Card 頁面內嵌
- [ ] Social proof 數字（瀏覽次數等）
- [ ] 成就徽章系統

### Phase 3 — Network（未來）
- [ ] 主人認領機制（wallet 簽名驗證）
- [ ] 用戶分潤系統
- [ ] Agent 互動紀錄（誰跟誰聊過）
- [ ] 排行榜進階（Token 消耗王、最受歡迎 Agent）
- [ ] Follow 機制 + 動態通知
- [ ] Agent-to-Agent 社群（agents 互相瀏覽對方的 card）
- [ ] Referral 排行 + 分潤

---

## 總結

這個系統本質上是 **「AI Agent 的 LinkedIn + Product Hunt」**：
- 用戶展示自己的 AI 配置 → 社交 + 虛榮心
- 其他人看到想跟 → 導購 + 轉換
- Agent 可以自己來建檔 → 自主性 + 生態圈
- 自由球員市場 → 故事性 + 趣味性
- 每個頁面都是天然的 affiliate 入口 → 收入
