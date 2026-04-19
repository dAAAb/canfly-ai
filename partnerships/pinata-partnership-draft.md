# Pinata × CanFly Partnership Proposal — Email Draft

**Status**: Draft v1 (2026-04-19)
**Author**: LittleLobster (for 寶博)
**Recipient**: Pinata team (TBD — look up `matt@pinata.cloud` or via `hello@pinata.cloud`)

---

## Subject line options

A) Partnership: CanFly.ai + Pinata Agents — zero-friction onboarding for OpenClaw
B) CanFly wants to bring more users to Pinata Agents (and share OpenClaw Skills)
C) Quick idea: CanFly as orchestration layer on top of Pinata Agents

---

## Email body

Hey Pinata team,

I'm 葛如鈞 (Ko Ju-Chun, "BaoBo") — legislator in Taiwan focused on AI/Web3 policy, author of Taiwan's **AI Basic Act** (passed Dec 2025), PhD in CS from NTU. I also build things.

We're launching **CanFly.ai** — an orchestration layer on top of OpenClaw that lets users manage multiple agents ("lobsters 🦞") across different runtimes. Think Linear/Multica for agent farms, with Skills that can be shared between agents.

We just realized Pinata Agents is *also* hosted OpenClaw — which means we're solving adjacent, non-overlapping problems:

- **Pinata**: great at hosting individual agents with polished UX, channels, IPFS integration
- **CanFly**: multi-agent orchestration, Multica-inspired four-layer abstraction (Farm → Lobster → Nest → Skills), affiliate marketplace

**We'd like to propose a partnership:**

### 1. Pinata as a first-class "Nest" provider in CanFly

Our users pick where each lobster lives — currently Zeabur, local Mac, VPS. Adding Pinata would mean:

- **For your side**: CanFly funnels users who've never heard of Pinata into your platform. The 2hr free tier becomes a perfect zero-friction onboarding for our "first lobster" flow, which we expect to be our #1 converting funnel.
- **For our side**: Users who only need one agent can stay on Pinata forever. Users who want multi-agent orchestration naturally graduate to paid CanFly + Zeabur, or pay Pinata PICNIC.

### 2. Shared Skills ecosystem (already works — just formalize)

ClawHub is already shared infrastructure. Any skills we publish work on your platform and vice-versa. We'd love a formal cross-promotion (e.g. featured CanFly skills on your skills page, and we promote verified Pinata skills like `@pinata/api`, `@pinata/memory-salience`).

### 3. Optional: referral / affiliate mechanic

If Pinata has a referral or affiliate program, we'd route our "upgrade to Pinata PICNIC" flow through it. If not, maybe we start one together.

### Why this works

- Our user base = ~50% Taiwan Web3/AI builders, ~50% international OpenClaw curious users
- I have substantial media reach in Taiwan (~legislator account, podcast, established brand)
- We're not trying to replace Pinata — we're making it easier for users to discover and stay on it

### What I'd like from this first chat

- Confirm if your API supports third-party agent lifecycle management (create/chat/exec/delete on behalf of users who authorize CanFly)
- Discuss whether OAuth / service-account scopes exist for CanFly to integrate cleanly
- Hear about any referral/affiliate programs
- Just say hi 👋

I run CanFly out of Taiwan alongside my legislative duties — we ship weekly. Happy to demo the current build any time (Discord/Telegram/video call).

Thanks for building Pinata Agents. It's the cleanest hosted OpenClaw experience out there right now.

Best,
Ju-Chun Ko (BaoBo / 葛如鈞)
Legislator, Taiwan
https://juchunko.com | @dAAAb on X | ko@canfly.ai

---

## 送出前待辦

- [ ] 找到對的收件人（Matt、Steve 或 general hello@pinata.cloud）
- [ ] 確認寶博想用哪個 email 署名（juchunko@gmail.com / ko@canfly.ai / 立委辦公室）
- [ ] 附件：CanFly 一頁介紹 PDF（可選）
- [ ] 附件：螢幕錄影 Demo link（可選）
- [ ] 決定時機：V3 Beta 出來後再寄 vs 現在就寄建立關係

## 可能的反應劇本

| 反應 | 我們的下一步 |
|------|-------------|
| 熱情歡迎 + OAuth 路徑 | 立刻排 Sprint 21 核心整合，做 PoC demo 給他們看 |
| 客氣但保留（怕被競爭） | 改提「只做 referral + Skills 互推」軟合作 |
| 已讀不回 | 先做 unofficial integration（用 user 自己的 Pinata token），demo 出來後再聯絡 |
| 直接說 No | 保留 Zeabur + VPS + Local 三種 Nest，不碰 Pinata，改推 Ollama 免費路線 |
