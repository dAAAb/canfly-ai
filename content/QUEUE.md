# CanFly.ai 內容佇列（每日功課）

> 這份檔是**選題 inbox**，不是自動發文機。
> 每天先掃、先排隊；當天資訊多就一次寫幾篇，資訊少就寫一篇或只更新舊文。
> 產稿走 `SOP-NEW-APP.md`（產品＋教學）或既有 blog 結構；**不要直接 push**。

最後掃描：2026-09-02（每日選題掃描，06:00 Taipei）

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

寶博點名列維持原優先級，不在合併時降級。掃描另入列的題接在後面。兩邊對同一產品意見不一致的，見文末「待決」。

| 優先 | 題目 | 類型 | 為什麼現在寫 | 建議頁面 | 狀態 |
|---|---|---|---|---|---|
| P0 | Grok Bot | 軟體／產品 + 短教學 | 寶博點名。新 agent 入口，搜尋熱度高 | `/apps` + `/learn/grok-bot` + blog | queued |
| P0 | Perplexity Computer | 軟體／產品 | 寶博點名。新形態「AI 電腦」，跟現有 Perplexity 搜尋頁要分開 | `/apps` + blog 對照「Perplexity vs Perplexity Computer」 | queued |
| P0 | Perplexity Portable Computer | 軟體／硬體交界 | 寶博點名。可攜版，長尾詞新 | blog 先寫，規格穩了再產品頁 | queued |
| P1 | Arduino VENTUNO Q | 硬體 | 寶博點名。新開發板，可接本地／邊緣 Agent | `/apps/hardware` + `/learn` | queued |
| P1 | Jetson Orin Nano 2 | 硬體 | 寶博點名。邊緣推論升級 | `/apps/hardware` + 對照舊 Jetson | queued |
| P1 | 新款 Mac mini | 硬體 | 兩邊都同意。2026-08-25 發表 M6 / M5 Pro，9/22 出貨，起價約 $899。站上已有 `mac-mini-m4` | **更新舊頁** `mac-mini-m4`，確認要不要新 slug | queued |
| P2 | Mac Studio 512GB（約 10 月） | 硬體／預告 | 寶博點名。未上市：先「即將推出」規格文 | blog `mac-studio-512gb` | queued |
| P1 | Grok 4.6（xAI API） | 軟體／models | 2026-08-12 上線，官方寫明長跑 agent。OpenAI 相容，OpenRouter 有。站上有 Gemini、Nemotron，沒有 Grok 模型頁。不要跟 Grok Bot 寫成同一頁 | `/apps/models/grok-4-6` + `/learn/grok-4-6` | queued |
| P1 | Claude Code / Codex 接 OpenClaw | 軟體／skills | 官方 `openclaw mcp serve` 文件直接點名。一頁講兩個 coding agent，不要拆兩篇。不要寫已宣布下線的 AgentKit | `/learn/claude-code-codex` | queued |
| P1 | ClawHub | 軟體／skills | OpenClaw 官方 skill + plugin registry。教學已有 `clawhub install`，沒有產品頁 | `/apps` + `/learn/clawhub`；寫完改 `/learn/agent-skills` nextStepCards | queued |
| P1 | Nemotron 3.5 Lightning | 軟體／models | NVIDIA 點名 OpenClaw harness。30B MoE、3B active。跟現有 Super（120B / 12B）不是同一張卡 | `/apps/models/nemotron-3-5-lightning` + Super 頁加家族連結 | queued |
| P1 | Arduino UNO Q（4GB） | 硬體 | 已上市。官方部落格講本機 agent + OpenClaw。跟 VENTUNO Q 不是同一塊板 | `/apps/hardware`；SKU 用 4GB / 32GB eMMC | queued |
| P2 | TaskMarket | 軟體／skills | Base 上 USDC 結算的 agent 打工市場。有 CLI 與 OpenClaw skill。掃描時市場還小（約 19 題） | `/learn/taskmarket` | queued |
| P1 | Firecrawl（含 Developer Index） | 軟體／skills | 官方有 OpenClaw 接法：`firecrawl init --agent openclaw`，也可 `npx -y firecrawl-cli@latest setup developer-index`。70M+ repo README／issue／PR／OpenAPI，給 coding agent 用，不是一般網搜。跟現有 `brave-search`、`perplexity` 不是同一頁 | `/apps/skills/firecrawl` + `/learn/firecrawl` | queued |
| P2 | screenpipe | 軟體／skills | 官方文件 `docs.screenpi.pe/openclaw`：`npx -y screenpipe@latest agent setup openclaw`。把螢幕／語音記錄接進 OpenClaw。站上沒有相近頁。要寫權限與 clipboard 風險 | `/apps/skills/screenpipe` + `/learn/screenpipe` | queued |
| P1 | Muse Glimmer | 軟體／models | Meta Superintelligence Labs 開源 30B 本地 agent 模型。官方 Ollama：`ollama launch openclaw --model muse-glimmer`（MLX 用 `muse-glimmer:30b-mlx`）。站上沒有這頁；不要折進 Ollama，Qwen 3.8 才留在 Ollama 頁 | `/apps/models/muse-glimmer` + `/learn/muse-glimmer`；寫完在 Ollama／OpenClaw 卡加家族連結 | queued |

---

## 更新舊頁

| 現有頁 | 為什麼要改 |
|---|---|
| `/apps/skills/perplexity` + `/learn/perplexity` | 官方 [Perplexity with OpenClaw](https://docs.perplexity.ai/docs/getting-started/integrations/openclaw)：Search plugin、Agent API（`openai-responses` + `https://api.perplexity.ai/v1`）、遠端 MCP。Sonar Chat Completions 撐到 2026-09-27。現有頁還停在「AI 搜尋引擎」。Computer 要不要另開頁見待決。 |
| `/apps/models/google-gemini` + `/learn/google-gemini` | 一般用戶 Gemini CLI 2026-06-18 已停。Google 改推 Antigravity CLI（`agy`）與 Managed Agents。現有頁還在講 2M context / Gems / Veo。PH 8/28 上的 Gemini Omni 1.1 Flash（影片生成／剪輯）補進這頁，不要另開。 |
| `/apps/hardware/mac-mini-m4` | 見上方「新款 Mac mini」。 |
| OpenClaw 產品卡 + `/learn/ollama-openclaw` | **優先改。** 官方便 2026-08-31 出 v2026.8.1（AKA OpenClaw 2.0）；2026-09-01 再出穩定補丁 [v2026.8.2](https://docs.openclaw.ai/releases/2026.8.2)：Linux `.deb`／AppImage 桌面伴、Home dock（`Cmd/Ctrl+Shift+H`）、背景 session、Chrome extension 可在 Gateway 沒開時喚醒 relay。2.0 重點仍是：引導式 setup、重建 Control UI、Shared Cloud Sessions、SQLite session、breaking：OpenProse 拿掉、`codex/*` → `openai/*`，升級走 `openclaw doctor --fix`。文案還寫 300K+ stars；GitHub 仍約 388K。Custodian 一併改。不要另開 2.0 或 8.2 產品頁。 |
| `/learn/nemotron-3-super` | 加 Lightning 家族連結。Super 給重推理，Lightning 給長跑執行層。 |
| `/learn/agent-skills` | ClawHub 產品頁上線後，nextStepCards 要指過去。 |
| `/apps/skills/agentmail` + `/learn/agentmail` | 官方已上 ClawHub：`openclaw plugins install clawhub:@agentmail/agentmail`（skill + email channel）。現有頁還停在舊接法。 |
| `/learn/ollama` + `/learn/ollama-openclaw` + OpenClaw 卡 | 跟上方 2.0／8.2 一起改。Muse Glimmer 寫完後加 `ollama launch openclaw --model muse-glimmer` 連結。Qwen 3.8／Gemma 4 不要另開。GPT-5.6 Sol/Terra/Luna 已在 2.0。Ollama 官方 8/31：Pro／Max／Team 改成含額度的 per-token 計價，寫 Ollama 頁時改價，不要另開。 |
| `/learn/claude-code-codex`（待寫稿） | OpenAI 2026-08-28：Cursor 合約預計 2026-11-12 停供 OpenAI 模型。寫進 Codex 段備註，不要另開 Cursor 頁。Anthropic 2026-09-01：[Fable 5.1／Mythos 5.1](https://www.anthropic.com/claude-fable-and-mythos-5-1) 上線（`claude-fable-5-1`、cache read 降 75%）；OpenRouter 已有 `anthropic/claude-fable-5.1`。寫 Claude Code 段用 Fable 5.1，不要另開模型頁。Mythos 5.1 只走 trusted access；EFS 今秋才 GA。 |

---

## 觀察（未夠格入列）

以下不跟寶博已入列的題重複。

| 題目 | 缺什麼 | 下次再看 |
|---|---|---|
| Claude Cowork | 文件／試算表 agent，沒看到 OpenClaw 接法 | 有官方接法再入列 |
| Google Antigravity 獨立頁 | Gemini 舊頁更新就夠講 CLI 搬家。先看它跟 OpenClaw 會不會互踩 | I/O 後續文件 |
| OpenAI AgentKit | 2026-11-30 下線 | 不要寫 |
| Product Hunt（8/27–8/28）Skydive、Enter Pro、Traccia、Speko、CTRL Micro、Clipto MCP、Vercel Eve | 沒有可重現的 OpenClaw 安裝步驟，或跟現有頁重疊 | 下週 PH |
| Product Hunt 8/28 PageIndex、Caddi、Microduck、Almanac、Aramb、OpenTag、SuperIntern、Lightfield | SaaS agent／RPA／玩具機器人，沒看到 OpenClaw 安裝步驟。Aramb 還在 private beta | 下週 PH |
| Gemini 3.5 Transcribe | 跟 Whisper 頁重疊 | 有獨立 API 教學需求再看 |
| Grok Voice Agent Builder | 跟 ElevenLabs 重疊 | 有 OpenClaw 接法再看 |
| Workato Otto | 企業 superagent，走 Workato MCP，不是 OpenClaw 技能 | 有官方 OpenClaw 接法再看 |
| Context.dev | 官方 `openclaw plugins install clawhub:@contextdev/openclaw-context`，但跟 `brave-search`／已入列 Firecrawl 互搶網搜頁 | Firecrawl 寫完再決定要不要對照 |
| Olostep（PH 8/30） | 官方 `clawhub install olostep` + MCP。跟 Firecrawl Developer Index 同一條「給 agent 抓網」漏斗，先不要第三頁 | Firecrawl 上線後再比 |
| Tencent Hy4 preview | 770B MoE，vLLM／SGLang／OpenRouter，沒有 `ollama launch` | 有消費級本機路徑再看；否則只更新 OpenRouter |
| Muse Spark 1.1／1.2 | Meta 雲端 API，權重不開。本機路線是 Glimmer | 折進 OpenRouter；不要跟 Glimmer 寫成同一頁 |
| OpenAI × Cursor 停約 | 2026-11-12 截止，不是新產品 | 寫進 Claude Code／Codex 教學備註 |
| Cloudways Managed OpenClaw | 託管跟 Zeabur 互搶 | 折進 Zeabur，不要另開 |
| Qwen 3.8 獨立頁 | 本機模型，應留在 Ollama | 不要另開 |
| Anthropic MHS | research preview，沒有穩定 OpenClaw 安裝步驟 | 出 GA／官方接法再看 |
| Grok Bot + X（8/29） | 已入列 Grok Bot 的功能更新 | 寫 Grok Bot 時帶一句即可 |
| Product Hunt 8/29–8/30（1752vc、Hy4、Cohere Parse、seendiff、Superagent、Maritime、oMLX 再發等） | 沒有可重現的 OpenClaw 安裝步驟，或已有頁（oMLX）／該折進 OpenRouter／Zeabur | 下週 PH |
| OpenAI Workspace Agents（8/31 GA） | ChatGPT Business／Enterprise／Edu 的 Codex 雲端共用 agent。沒有 OpenClaw 安裝步驟，是對手不是技能 | 不要寫產品頁 |
| Product Hunt 8/31–9/1（Video Agent、BrandJet、Interactive Sessions、Viktor、Topview、Murfy、Orato、FrameOS） | SaaS 影片／銷售／Slack coworker，沒有官方 OpenClaw 安裝步驟 | 下週 PH |
| Agent 37 Cloud／AgentSky／Murmell | 託管 OpenClaw／多 harness 雲。跟 Zeabur／Pinata 互搶，沒有獨立 skill 安裝路徑 | 折進 Zeabur；不要另開 |
| Gemma 4 獨立頁 | 2026-04 就有，`ollama launch openclaw --model gemma4:26b`。跟 Qwen 3.8 一樣留在 Ollama | 不要另開 |
| Grok 4.7 | 傳聞／Wikipedia 寫 9/2；xAI [release notes](https://docs.x.ai/developers/release-notes) 仍停在 4.6，沒有 model ID、定價、benchmark | 官方 model card 上線再決定是更新 Grok 4.6 稿還是另開 |
| ChatGPT Healthcare／EHR（9/1） | Epic 接病歷＋Healthcare Public Data plugin。企業醫療，沒有 OpenClaw 安裝步驟 | 不要寫 |
| Anthropic EFS／Mythos 5.1 | EFS 今秋才 GA；Mythos 只給 trusted cyber／生命科學。Fable 5.1 折進 Claude Code 稿就夠 | 不要另開 |
| Product Hunt 9/1（Kilo Code JetBrains、TrustedRouter、Keiki、Tovel、Cosmic Agent Plugins、Naseem、Happy Shrimp、ThunderPhone） | SaaS／IDE agent／OpenRouter 競品／Mac-native 對手。Naseem 是 Swift harness，沒有官方 OpenClaw skill。Murmell 已在上方觀察 | 下週 PH |
| OpenClaw Google Meet plugin | 官方 `openclaw plugins install clawhub:@openclaw/google-meet`，min host 2026.4.20，不是新品 | 寫 ClawHub 頁時帶一句；不要另開 |

---

## 已有、不要重開

| slug / 頁 | 備註 |
|---|---|
| `perplexity` | 搜尋產品已在。Agent API／OpenClaw 接法先更新這頁。Computer / Portable 是否另開見待決。Firecrawl 另開，不要把 Developer Index 塞進來 |
| `mac-mini-m4` | 新款 mini 先更新這頁 |
| `google-gemini` | 更新 CLI → Antigravity，不要另開 Gemini 頁。Omni 1.1 Flash 也寫這頁 |
| `nemotron-3-super` | 不要改寫成 Lightning；加家族連結 |
| `openclaw` | 更新成 2.0（v2026.8.1）＋穩定補丁 v2026.8.2＋星數＋custodian，不要重開 2.0／8.2 頁 |
| `heygen` / `elevenlabs` / `ollama` / `omlx` / `zeabur` / `openrouter` | 教學已在，只在有大改版時回訪。Qwen 3.8、Gemma 4、Hy4、Muse Spark 折進 Ollama／OpenRouter，不要另開 |
| `agentmail` | 更新 ClawHub 官方 plugin，不要重開 |
| `brave-search` | 一般網搜頁已在。Firecrawl／Developer Index 另開 |
| `whisper` / `umbrel` / `pinata` / `switchbot-ai-hub` | 同上 |
| `basemail` / `agentmail` / `agentcard` / `worldid` / `agentbook` | 同上 |
| `utm` / `virtual-buddy` | 同上 |
| `macbook-neo` / `geekom-a8` / `beelink-ser5-max` / `raspberry-pi-5` / `elgato-stream-deck` / `fifine-am8` / `hdmi-dummy-plug` / `even-g2-bridge` | 硬體／技能已在 |

---

## 掃描紀錄

| 日期 | 掃描者 | 入列 | 備註 |
|---|---|---|---|
| 2026-08-28 | Cloud agent（依寶博點名） | 7 | 建立佇列；尚未產稿 |
| 2026-08-28 | 每日選題掃描 | 待寫 +6（Grok 4.6、Claude Code/Codex、ClawHub、Lightning、UNO Q、TaskMarket）；更新舊頁 6 | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI/Grok、Perplexity 官方 OpenClaw 文件、OpenAI、Anthropic、Google、Product Hunt 8/27–8/28、GitHub/OpenClaw、ClawHub、Apple、NVIDIA、Arduino。沒寫文章。與寶博點名列的分歧見待決。 |
| 2026-08-29 | 每日選題掃描 | 待寫 +2（Firecrawl、screenpipe）；更新舊頁 +Gemini Omni 1.1 Flash | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI/Grok 4.6（已入列）、Perplexity Portable（已入列）、OpenAI HF 事故報告（不寫產品）、Anthropic／Google Antigravity（更新舊頁）、PH 8/28、GitHub OpenClaw ~388K、ClawHub、Apple mini/Studio（已入列）、NVIDIA Jetson Orin Nano 2 官方寫 H1 2027 才出、Arduino VENTUNO Q（已入列）。沒寫文章。 |
| 2026-08-31 | 每日選題掃描 | 待寫 +1（Muse Glimmer）；更新舊頁 +AgentMail ClawHub plugin、Ollama／OpenClaw 家族連結、Codex Cursor 截止備註 | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI/Grok Bot+X（已入列）、Perplexity Portable（已入列）、OpenAI Cursor 停約 11/12、Anthropic Cowork memory（仍無 OpenClaw 接法）、Google Antigravity（OpenClaw 明確不接 `agy` OAuth）、PH 8/29–8/30、GitHub OpenClaw 2026.8.1-beta.3／GPT-5.6、ClawHub（AgentMail、Context.dev）、Ollama Muse Glimmer 官方 `ollama launch openclaw`、Apple mini／NVIDIA Orin Nano 2／Arduino（已入列）。觀察：Olostep、Context.dev、Hy4、Muse Spark、Cloudways、Qwen 3.8。沒寫文章。 |
| 2026-09-01 | 每日選題掃描 | 待寫 +0；更新舊頁 +OpenClaw 2.0（v2026.8.1） | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI/Grok（4.6／Bot 已入列）、Perplexity Computer／Portable（已入列）、OpenAI Workspace Agents（觀察）、Anthropic MHS／Cowork（仍無 OpenClaw 接法）、Google Antigravity 企業方案（更新舊頁即可）、PH 8/31–9/1、GitHub OpenClaw 2.0／~388K、ClawHub（無新官方 skill 頁）、Apple mini／NVIDIA Orin Nano 2／Arduino（已入列）。觀察：Workspace Agents、Agent 37／AgentSky／Murmell、Gemma 4。沒寫文章。 |
| 2026-09-02 | 每日選題掃描 | 待寫 +0；更新舊頁 +OpenClaw v2026.8.2、Claude Fable 5.1（折進 Claude Code 稿）、Ollama per-token 價 | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI docs（仍 4.6；4.7 無 model card）、Perplexity OpenClaw 文件（已排更新）、OpenAI Healthcare／EHR（觀察）、Anthropic Fable 5.1／Mythos 5.1／EFS、Google Antigravity（更新舊頁即可）、PH 9/1（Kilo Code、TrustedRouter、Naseem、Keiki 等）、GitHub OpenClaw 2026.8.2／~388K、ClawHub（Google Meet 等官方 plugin 非新品）、Apple mini／Studio（已入列，9/22 出貨）、NVIDIA Orin Nano 2（H1 2027）、Arduino VENTUNO Q／UNO Q（已入列）。觀察：Grok 4.7、Healthcare、EFS／Mythos、PH 9/1、Naseem。沒寫文章。 |

---

## 待決（合併時沒有代為裁定）

這幾題兩邊意圖衝突，佇列**維持寶博點名**，掃描意見只記在這裡，等寶博／CEO 拍板。

| 題 | 寶博點名列 | 每日掃描 | 卡在哪 |
|---|---|---|---|
| Grok Bot | P0 寫產品＋教學 | 放觀察。早 beta、Grok only、綁 SuperGrok Heavy / Cursor Ultra，是 OpenClaw 對手不是技能 | 要不要做競品對照頁，還是不做 |
| Perplexity Computer / Portable / Comet | P0 另開產品頁 | 放觀察。連動寫進現有 Perplexity 頁，不要再開三頁互搶 | 更新舊頁夠不夠，要不要獨立 Computer 頁 |
| Jetson Orin Nano 2 | P1 硬體頁 | Jetson / DGX Spark 放觀察，還沒對上現有 Amazon 帶。NVIDIA 官方 8/25：模組與開發套件預計 2027 上半年才出，價格未公布 | 現在寫預告，還是等有導購／出貨日 |
| Mac Studio 512GB / M5 Ultra | P2 預告文 | 價位 $2,499–$5,499，超出目前 Mini / 迷你 PC / Pi 帶 | 預告文要不要寫 |
| Arduino | P1 VENTUNO Q（未上市取向） | P1 UNO Q 4GB（已上市、官方 OpenClaw 文） | 先寫哪一塊板，或兩塊都寫 |

---

## 產稿時記得

1. 三語 key 同步：`src/i18n/en.json`、`zh-TW.json`、`zh-CN.json`
2. 產品頁走 `SOP-NEW-APP.md`；影片走 `VIDEO-RULES.md`（**英文口白 + 繁中／英文雙語軟字幕**）
3. `npm run check-i18n` + `npx vite build`
4. `git commit`，Paperclip 回報 CEO，**不要自己 push**
