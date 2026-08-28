# CanFly.ai 選題佇列

最後掃描：2026-08-28

這份檔只排題，不寫正文。新 App 頁照 `SOP-NEW-APP.md`：products.ts + `/learn` + 三語 i18n + 寶博 review。

## 夠格標準

入「待寫」要同時符合：

1. 能寫成 CanFly app + 教學，不是新聞稿。
2. 跟 OpenClaw 有官方或可重現的安裝／連動路徑。
3. `src/data/products.ts` 還沒有同產品頁。相近就寫「更新舊頁」，不要再做一張皮。
4. 軟體優先。硬體要能當 always-on 或 edge 養蝦機，不能只是週邊玩具。

## 已有頁（不要重開）

Ollama、oMLX、OpenClaw、OpenRouter、Zeabur、ElevenLabs、HeyGen、HDMI dummy、Umbrel、Pinata、SwitchBot AI Hub、Perplexity、Even G2 Bridge、Whisper、Brave Search、BaseMail、AgentMail、AgentCard、World ID、AgentBook、UTM、Virtual Buddy、Mac Mini M4、MacBook Neo、GEEKOM A8、Beelink SER5 MAX、Raspberry Pi 5、Elgato Stream Deck、Google Gemini、Nemotron 3 Super、Fifine AM8。

## 待寫

### Grok 4.6（xAI API）

- 類別：models
- 為什麼夠格：2026-08-12 上線，官方寫明做長跑 agent。OpenAI 相容 API，OpenRouter / Vercel / Cloudflare 都有。站上有 Gemini、Nemotron，沒有 Grok。
- OpenClaw：`https://api.x.ai/v1` + `grok-4.6`，或 OpenRouter `x-ai/grok-4.6`。
- 價格：$2 / $6 per 1M tokens。500k context。
- 來源：https://x.ai/news/grok-4-6
- 不要做成 Grok Bot 開箱。那是另一個產品，見觀察。

### Claude Code / Codex 接 OpenClaw

- 類別：skills（一頁講完兩個 coding agent，不要拆兩篇重複教學）
- 為什麼夠格：OpenClaw 官方 `mcp serve` 文件直接點名 Claude Code 跟 Codex。站上沒有 Anthropic、也沒有 OpenAI 產品頁。
- OpenClaw：`openclaw mcp serve`，讓 Claude Code / Codex 讀寫 Gateway 頻道對話。
- 來源：https://docs.openclaw.ai/tools/mcp 、OpenClaw `docs/cli/mcp.md`
- 不要寫 AgentKit。OpenAI 2026-06-03 已宣布 Agent Builder / Evals 2026-11-30 下線。

### ClawHub

- 類別：skills / free
- 為什麼夠格：OpenClaw 官方 skill + plugin registry。教學裡已出現 `clawhub install`，但沒有產品頁。ElevenLabs / HeyGen affiliate 還掛著 clawhub slug。
- OpenClaw：`clawhub search` / `clawhub install` / `openclaw skills install`。
- 來源：https://clawhub.ai 、https://github.com/openclaw/clawhub
- 寫完後順便改 `/learn/agent-skills` 的 nextStepCards，見更新舊頁。

### Nemotron 3.5 Lightning

- 類別：models
- 為什麼夠格：NVIDIA 自己寫給 OpenClaw / Hermes 這種長跑 harness。30B MoE、3B active，Ollama / llama.cpp / OpenRouter 都有。跟現有 Nemotron 3 Super（120B / 12B active）不是同一張卡。
- OpenClaw：本機 Ollama 或 OpenRouter。NVIDIA 部落格點名 OpenClaw。
- 來源：https://developer.nvidia.com/blog/nvidia-nemotron-3-5-lightning-delivers-fast-accurate-specialized-task-execution-for-long-running-agents/
- Super 頁只要加家族連結，不要把 Super 改寫成 Lightning。

### Arduino UNO Q（4GB）

- 類別：hardware
- 為什麼夠格：Arduino 官方部落格講本機 agent + OpenClaw。4GB 板跑 Debian，價位跟 Pi 5 同一層，不是再買一顆開發板裝飾。
- OpenClaw：Qualcomm / Arduino 安裝指南；社群還有 QClaw App Lab 一鍵包。
- 來源：https://store.arduino.cc/products/uno-q-4gb 、https://blog.arduino.cc/2026/06/09/local-ai-agents-on-arduino-uno-q/
- 建議 SKU：UNO Q 4GB / 32GB eMMC，不要推 2GB。

### TaskMarket

- 類別：skills
- 為什麼夠格：Base 上用 USDC 結算的 agent 打工市場。有 CLI、有 OpenClaw skill。跟 BaseMail / AgentCard / AgentBook 同一條 agent 商務線。
- OpenClaw：`npm i -g @lucid-agents/taskmarket`，skill 在 workspace `skills/taskmarket`。讀操作免金鑰，出金要人點頭。
- 來源：https://taskmarket.dev/ 、https://docs.taskmarket.dev/
- 市場還小（掃描時約 19 題開著）。夠寫教學，不要寫成「爆量商機」。

## 更新舊頁

| 現有頁 | 為什麼要改 |
|--------|------------|
| `/apps/skills/perplexity` + `/learn/perplexity` | 官方已出 [Perplexity with OpenClaw](https://docs.perplexity.ai/docs/getting-started/integrations/openclaw)。Search plugin、Agent API（`openai-responses` + `https://api.perplexity.ai/v1`）、遠端 MCP 三條路都有。Sonar Chat Completions 撐到 2026-09-27。現有頁還停在「AI 搜尋引擎」。 |
| `/apps/models/google-gemini` + `/learn/google-gemini` | 一般用戶的 Gemini CLI 2026-06-18 已停。Google 改推 Antigravity CLI（`agy`）跟 Managed Agents。現有頁還在講 2M context / Gems / Veo。 |
| `/apps/hardware/mac-mini-m4` | 2026-08-25 發表 Mac mini M6 / M5 Pro，官網直接講 always-on agent。預購中，9/22 出貨。起價約 $899。M4 頁該加 M6 或另開 SKU，不要假裝 M4 還是最新 always-on 機。 |
| OpenClaw 產品卡 | 文案寫 300K+ stars。GitHub 2026-08-26 約 388K。Custodian skill library（configure-channel、add-model-provider、diagnose-gateway、cloud-image-bake）是新能力，該補一句。 |
| `/learn/nemotron-3-super` | 加 Lightning 家族連結與適用場景。Super 給重推理，Lightning 給長跑執行層。 |
| `/learn/agent-skills` | 已有 `clawhub install`。ClawHub 產品頁上線後，nextStepCards 要指過去。 |

## 觀察

還沒有穩定的 OpenClaw 安裝路徑，或跟現有頁重疊，先看著。不要寫。

| 題 | 為什麼先放著 |
|----|----------------|
| Grok Bot | 2026-08-11 早 beta。xAI 託管雲電腦，Grok only，綁 SuperGrok Heavy / Cursor Ultra / Teams。是 OpenClaw 的對手，不是技能。MCP 只吃公網 HTTP。 |
| Claude Cowork | 文件／試算表 agent，跟 Claude Code 同引擎。沒看到 OpenClaw 接法。 |
| Perplexity Computer / Personal Computer / Comet | 自家 always-on agent 跟 AI 瀏覽器。連動寫在 Perplexity 舊頁更新，不要再開三個產品頁。 |
| Google Antigravity 獨立頁 | Gemini 舊頁更新就夠講 CLI 搬家。Antigravity 是 Google 自己的 agent IDE，先看它跟 OpenClaw 會不會互踩。 |
| OpenAI AgentKit | 2026-11-30 下線。不要寫。 |
| Mac Studio M5 Ultra | $2,499–$5,499。現有硬體帶是 Mini / 迷你 PC / Pi。 |
| DGX Spark / Jetson | Lightning 跑得動。還沒對上 CanFly 現有 Amazon 帶。 |
| Product Hunt（8/27–8/28）Skydive、Enter Pro、Traccia、Speko、CTRL Micro、Clipto MCP、Vercel Eve | 沒有可重現的 OpenClaw 安裝步驟，或是企業 control plane / 框架。Speko 跟 ElevenLabs 重疊。CTRL Micro 跟 Stream Deck 重疊。 |
| Gemini 3.5 Transcribe | 跟 Whisper 頁重疊。 |
| Grok Voice Agent Builder | 跟 ElevenLabs 重疊。 |

## 掃描紀錄

| 日期 | 看了什麼 | 入列 |
|------|----------|------|
| 2026-08-28 | 首掃。QUEUE.md 原本不存在。對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI/Grok、Perplexity（含官方 OpenClaw 文件）、OpenAI、Anthropic、Google、Product Hunt 8/27–8/28、GitHub/OpenClaw、ClawHub、Apple（Mac mini M6）、NVIDIA（Nemotron 3.5 Lightning）、Arduino UNO Q。 | 待寫 6；更新舊頁 6；觀察 10。沒寫文章。 |
