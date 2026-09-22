# CanFly.ai 內容佇列（每日功課）

> 這份檔是**選題 inbox**，不是自動發文機。
> 每天先掃、先排隊；當天資訊多就一次寫幾篇，資訊少就寫一篇或只更新舊文。
> 產稿走 `SOP-NEW-APP.md`（產品＋教學）或既有 blog 結構；**不要直接 push**。

最後掃描：2026-09-21（每日選題掃描，06:00 Taipei）

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
| P0 | Perplexity Computer | 軟體／產品 | 寶博點名。新形態「AI 電腦」，跟現有 Perplexity 搜尋頁要分開。2026-09-01 官方 [Hybrid Compute](https://www.perplexity.ai/hub/blog/pii-trace-detecting-personal-data-before-it-leaves-the-device)：Mac 上雲端＋本機分流，Gemma 4 E4B／Qwen3.6 35B、需 Apple silicon＋24GB。2026-09-17 官方 [effort mode](https://www.perplexity.ai/hub/blog/computer-adds-effort-mode-for-model-selection)：web 上 Light／Standard／High／Ultra 滑桿選模型與推理量（Android／iOS 即將）。寫 Computer 時帶 Hybrid＋effort，不要另開 Hybrid／effort 頁 | `/apps` + blog 對照「Perplexity vs Perplexity Computer」 | queued |
| P0 | Perplexity Portable Computer | 軟體／硬體交界 | 寶博點名。可攜版，長尾詞新。2026-09-14 官方 [Portable Computer for Windows](https://www.perplexity.ai/hub/blog/portable-computer-for-windows-is-here)：既有 Windows app、Pro／Max；本機推論要 GeForce RTX／RTX PRO、≥24GB VRAM。不要另開 Windows 頁 | blog 先寫，規格穩了再產品頁 | queued |
| P1 | Arduino VENTUNO Q | 硬體 | 寶博點名。新開發板，可接本地／邊緣 Agent。2026-09-11 官方 [AMR 應用文](https://blog.arduino.cc/2026/09/11/building-smarter-amrs-with-the-arduino-ventuno-q-board/) 只是使用故事；[官方店](https://store.arduino.cc/products/ventuno-q) 仍 pre-order／約 4 週／€298.99 | `/apps/hardware` + `/learn` | queued |
| P1 | Jetson Orin Nano 2 | 硬體 | 寶博點名。邊緣推論升級 | `/apps/hardware` + 對照舊 Jetson | queued |
| P1 | 新款 Mac mini | 硬體 | 兩邊都同意。2026-08-25 發表 M6 / M5 Pro，9/22 出貨，起價約 $899。站上已有 `mac-mini-m4` | **更新舊頁** `mac-mini-m4`，確認要不要新 slug | queued |
| P2 | Mac Studio 512GB（約 10 月） | 硬體／預告 | 寶博點名。未上市：先「即將推出」規格文 | blog `mac-studio-512gb` | queued |
| P1 | Grok 4.6（xAI API） | 軟體／models | 2026-08-12 上線，官方寫明長跑 agent。OpenAI 相容，OpenRouter 有。站上有 Gemini、Nemotron，沒有 Grok 模型頁。不要跟 Grok Bot 寫成同一頁 | `/apps/models/grok-4-6` + `/learn/grok-4-6` | queued |
| P1 | Claude Code / Codex 接 OpenClaw | 軟體／skills | 官方 `openclaw mcp serve` 文件直接點名。一頁講兩個 coding agent，不要拆兩篇。不要寫已宣布下線的 AgentKit | `/learn/claude-code-codex` | queued |
| P1 | ClawHub | 軟體／skills | OpenClaw 官方 skill + plugin registry。教學已有 `clawhub install`，沒有產品頁。寫時帶一句 NVIDIA Skill Cards（`openclaw skills verify --card`），不要另開 Skill Cards 頁。官方 plugin 一句即可、不要另開：Tavily（`openclaw plugins install @openclaw/tavily-plugin`）、Voyage embeddings、Anthropic Vertex、Amazon Bedrock Mantle | `/apps` + `/learn/clawhub`；寫完改 `/learn/agent-skills` nextStepCards | queued |
| P1 | Nemotron 3.5 Lightning | 軟體／models | NVIDIA 點名 OpenClaw harness。30B MoE、3B active。跟現有 Super（120B / 12B）不是同一張卡 | `/apps/models/nemotron-3-5-lightning` + Super 頁加家族連結 | queued |
| P1 | Arduino UNO Q（4GB） | 硬體 | 已上市。官方部落格講本機 agent + OpenClaw。跟 VENTUNO Q 不是同一塊板 | `/apps/hardware`；SKU 用 4GB / 32GB eMMC | queued |
| P2 | TaskMarket | 軟體／skills | Base 上 USDC 結算的 agent 打工市場。有 CLI 與 OpenClaw skill。掃描時市場還小（約 19 題） | `/learn/taskmarket` | queued |
| P1 | Firecrawl（含 Developer Index） | 軟體／skills | 官方有 OpenClaw 接法：`firecrawl init --agent openclaw`，也可 `npx -y firecrawl-cli@latest setup developer-index`。ClawHub 另有官方 plugin：`openclaw plugins install clawhub:@openclaw/firecrawl-plugin`。70M+ repo README／issue／PR／OpenAPI，給 coding agent 用，不是一般網搜。跟現有 `brave-search`、`perplexity` 不是同一頁 | `/apps/skills/firecrawl` + `/learn/firecrawl` | queued |
| P2 | screenpipe | 軟體／skills | 官方文件 `docs.screenpi.pe/openclaw`：`npx -y screenpipe@latest agent setup openclaw`。把螢幕／語音記錄接進 OpenClaw。站上沒有相近頁。要寫權限與 clipboard 風險 | `/apps/skills/screenpipe` + `/learn/screenpipe` | queued |
| P1 | Muse Glimmer | 軟體／models | Meta Superintelligence Labs 開源 30B 本地 agent 模型。官方 Ollama：`ollama launch openclaw --model muse-glimmer`（MLX 用 `muse-glimmer:30b-mlx`）。站上沒有這頁；不要折進 Ollama，Qwen 3.8 才留在 Ollama 頁 | `/apps/models/muse-glimmer` + `/learn/muse-glimmer`；寫完在 Ollama／OpenClaw 卡加家族連結 | queued |
| P1 | GPT-6 Astra | 軟體／models | 2026-09-03 官方上線。OpenAI [model guidance](https://developers.openai.com/api/docs/guides/latest-model)：`gpt-6-astra`，tool calling 走 Responses API。OpenClaw 官方 [OpenAI provider](https://docs.openclaw.ai/providers/openai)：`openclaw models set openai/gpt-6-astra`（1,050K context，$10/$50；存取還在 Trusted Access／陸續開 Plus／API）。OpenRouter 已有 `openai/gpt-6-astra` 與 `openai/gpt-6-astra-pro`（不要另開 Pro 頁）。產品頁已上；現有文案還寫「OpenRouter 還沒有」，見更新舊頁 | `/apps/models/gpt-6-astra` + `/learn/gpt-6-astra` | shipped 2026-09-04（影片待補；OpenRouter 行要改） |
| P1 | Harden AIF | 軟體／skills | PH 9/9。官方 [AIF docs](https://docs.harden.run/)：`curl -fsSL https://aif.harden.run/install.sh \| sh`，再 `aif configure --agent openclaw --validate`。本機 tool-call 防火牆（bridge／block-and-steer）。文件寫支援 OpenClaw 2026.7.1-2；寫稿時核對對 v2026.9.5 是否仍過。站上沒有相近頁；不要跟 AgentWard 寫成同一頁 | `/apps/skills/harden-aif` + `/learn/harden-aif` | shipped 2026-09-22（影片待補；官方基線仍是 2026.7.1-2，頁上要求對 v2026.9.5 再跑 validate） |
| P1 | Supermemory | 軟體／skills | GitHub 9/18 熱。官方 [OpenClaw 文件](https://supermemory.ai/docs/integrations/openclaw)：`openclaw plugins install @supermemory/openclaw-supermemory`，再 `openclaw supermemory setup`／`gateway restart`。跨頻道長期記憶＋profile；本機可 `npx supermemory local`。站上沒有相近頁。不要跟 OzBrain（觀察、hosted MCP）或 OpenClaw 內建 session memory 寫成同一頁；不要跟 screenpipe 寫成同一頁 | `/apps/skills/supermemory` + `/learn/supermemory` | queued |

---

## 更新舊頁

| 現有頁 | 為什麼要改 |
|---|---|
| `/apps/skills/perplexity` + `/learn/perplexity` | 官方 [Perplexity with OpenClaw](https://docs.perplexity.ai/docs/getting-started/integrations/openclaw)：Search plugin、Agent API（`openai-responses` + `https://api.perplexity.ai/v1`）、遠端 MCP。Sonar Chat Completions 撐到 2026-09-27。現有頁還停在「AI 搜尋引擎」。2026-09-01 Hybrid Compute（Mac 本機＋雲端分流）寫進 Computer 待寫稿，搜尋頁帶一句即可。Computer 要不要另開頁見待決。 |
| `/apps/models/google-gemini` + `/learn/google-gemini` | 一般用戶 Gemini CLI 2026-06-18 已停。Google 改推 Antigravity CLI（`agy`）與 Managed Agents。現有頁還在講 2M context / Gems / Veo。PH 8/28 上的 Gemini Omni 1.1 Flash（影片生成／剪輯）補進這頁，不要另開。2026-09-02 官方 [Gemini 3.8 Flash](https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/)：agentic／coding workhorse，$0.75/$3.75 到 2026-12-31，OpenRouter 已有 `google/gemini-3.8-flash`。寫進這頁，不要另開。Flash Cyber 走 Fairwind trusted access，見觀察。2026-09-01 [Agentic Video](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-agentic-video-in-gemini/) 帶一句即可，不要另開。2026-09-15 官方 [Gemini 3.8 Live／Live Extended Thinking](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/)（9/17 更新）：`gemini-3.8-live`、`gemini-3.8-live-extended-thinking`。寫進這頁＋OpenClaw voice-call 一句 `realtime.providers.google.model: gemini-3.8-live`；預設仍是 `gemini-3.1-flash-live-preview`。不要另開 Live 頁。Gemini Windows／Spark 仍觀察。 |
| `/apps/hardware/mac-mini-m4` | 見上方「新款 Mac mini」。macOS 27 Golden Gate 2026-09-14 上市，寫 mini 更新時帶一句即可。 |
| OpenClaw 產品卡 + `/learn/ollama-openclaw` | **優先改。** 官方便 2026-08-31 出 v2026.8.1（AKA OpenClaw 2.0）；2026-09-01 再出穩定補丁 [v2026.8.2](https://docs.openclaw.ai/releases/2026.8.2)；2026-09-03 出 [v2026.9.1](https://docs.openclaw.ai/releases/2026.9.1)；2026-09-05 出 [v2026.9.2](https://docs.openclaw.ai/releases/2026.9.2)（Astra＋Muse Spark 1.3、更穩的升級／復原）；2026-09-08 14:15 UTC 出 [v2026.9.3](https://docs.openclaw.ai/releases/2026.9.3)（隔離 rehearsal 更新、live browser、可撤銷聊天連結、會議逐字稿搜尋、repo-backed cloud、Workshop skills、Mac tabs、Node 24.16+／26）；2026-09-11 03:46 UTC 出 [v2026.9.4](https://docs.openclaw.ai/releases/2026.9.4)（失敗更新可回滾、Plugins workspace 統一 ClawHub／bundled、prepared cloud sessions、終端機提問、從舊對話學 skill、GPT Image 2.5 Flare／Sunburst）；2026-09-19 01:55 UTC 出 [v2026.9.5](https://docs.openclaw.ai/releases/2026.9.5)（Atomic Updates、plugins 不必重啟 Gateway、可分享／封存對話、GPT Live 進會議／通話、browser collaboration、guided specialist teams CoS/researcher/writer/reviewer、新 OpenAI／ChatGPT／Codex 預設 Astra）。仍無 9.6。2.0 重點仍是：引導式 setup、重建 Control UI、Shared Cloud Sessions、SQLite session、breaking：OpenProse 拿掉、`codex/*` → `openai/*`，升級走 `openclaw doctor --fix`。寫時加一句 `openclaw models set openai/gpt-6-astra`。OpenAI 9/10 [GPT-Live 1](https://developers.openai.com/api/docs/changelog) GA：Talk 設 `talk.realtime.model: gpt-live-1-codex`（不要寫 `gpt-live-1`／`gpt-live-1-mini`），不要另開語音頁。Gemini 3.8 Live 一句：`realtime.providers.google.model: gemini-3.8-live`（預設仍 `gemini-3.1-flash-live-preview`）。文案還寫 300K+／388K stars；GitHub 現約 390K（390,156）。Custodian 一併改。不要另開 2.0／8.2／9.1／9.2／9.3／9.4／9.5／GPT-Live／Gemini Live 產品頁。 |
| `/learn/nemotron-3-super` | 加 Lightning 家族連結。Super 給重推理，Lightning 給長跑執行層。 |
| `/learn/agent-skills` | ClawHub 產品頁上線後，nextStepCards 要指過去。 |
| `/apps/skills/agentmail` + `/learn/agentmail` | 官方已上 ClawHub：`openclaw plugins install clawhub:@agentmail/agentmail`（skill + email channel）。現有頁還停在舊接法。 |
| `/apps/skills/brave-search` + `/learn/brave-search` | OpenClaw 官方 [Tavily](https://docs.openclaw.ai/tools/tavily)：`openclaw plugins install @openclaw/tavily-plugin`，也可 `openclaw configure --section web` 選 Tavily。是另一個 `web_search` provider＋`tavily_extract`，跟 Brave 互搶網搜。寫進這頁或 ClawHub 稿一句即可，不要另開 Tavily 頁。 |
| `/learn/ollama` + `/learn/ollama-openclaw` + OpenClaw 卡 | 跟上方 2.0／8.2／9.1 一起改。Muse Glimmer 寫完後加 `ollama launch openclaw --model muse-glimmer` 連結。Qwen 3.8／Gemma 4 不要另開。GPT-5.6 Sol/Terra/Luna 仍是預設；Astra 另開模型頁後加連結。Ollama 官方 8/31：Pro／Max／Team 改成含額度的 per-token 計價，寫 Ollama 頁時改價，不要另開。 |
| `/learn/claude-code-codex`（待寫稿） | OpenAI 2026-08-28：Cursor 合約預計 2026-11-12 停供 OpenAI 模型。寫進 Codex 段備註，不要另開 Cursor 頁。Anthropic 2026-09-01：[Fable 5.1／Mythos 5.1](https://www.anthropic.com/claude-fable-and-mythos-5-1) 上線（`claude-fable-5-1`、cache read 降 75%）；OpenRouter 已有 `anthropic/claude-fable-5.1`。寫 Claude Code 段用 Fable 5.1，不要另開模型頁。Mythos 5.1 只走 trusted access；EFS 今秋才 GA。OpenAI 2026-09-03：[GPT-6 Astra](https://developers.openai.com/api/docs/guides/latest-model) 上線（`gpt-6-astra`）；OpenClaw 用 `openclaw models set openai/gpt-6-astra`。Codex 段帶一句並連到 Astra 模型頁，不要把 Astra 折進這篇當主文。OpenAI 2026-09-10：[Agents API](https://developers.openai.com/api/docs/guides/agents-api/overview) public beta（託管 Codex harness，`gpt-6-astra`）；是對手不是技能，Codex 段帶一句即可，不要另開頁。Harden AIF 寫完後可在這頁加一句本機 tool-call 防火牆連結。 |
| `/apps/models/gpt-6-astra` + `/learn/gpt-6-astra` | 現有文案寫「OpenRouter 還沒有」。OpenRouter 已上 `openai/gpt-6-astra` 與 `openai/gpt-6-astra-pro`。改這兩頁，不要另開 Pro 頁。 |

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
| Grok 4.7 | Musk 9/2 說約 10 天（約 9/12）；後來說還要再幾天。2026-09-21 仍無 card：xAI [release notes](https://docs.x.ai/developers/release-notes) 9 月只記 Imagine quality 11/2 下線＋Voice Transcribe 2.0；[model list](https://docs.x.ai/developers/models) 最新仍 `grok-4.6`；`/developers/models/grok-4.7` 404，沒有 ID、定價、benchmark | 官方 model card 上線再決定是更新 Grok 4.6 稿還是另開 |
| ChatGPT Healthcare／EHR（9/1） | Epic 接病歷＋Healthcare Public Data plugin。企業醫療，沒有 OpenClaw 安裝步驟 | 不要寫 |
| Anthropic EFS／Mythos 5.1 | EFS 今秋才 GA；Mythos 只給 trusted cyber／生命科學。Fable 5.1 折進 Claude Code 稿就夠 | 不要另開 |
| Product Hunt 9/1（Kilo Code JetBrains、TrustedRouter、Keiki、Tovel、Cosmic Agent Plugins、Naseem、Happy Shrimp、ThunderPhone） | SaaS／IDE agent／OpenRouter 競品／Mac-native 對手。Naseem 是 Swift harness，沒有官方 OpenClaw skill。Murmell 已在上方觀察 | 下週 PH |
| OpenClaw Google Meet plugin | 官方 `openclaw plugins install clawhub:@openclaw/google-meet`，min host 2026.4.20，不是新品 | 寫 ClawHub 頁時帶一句；不要另開 |
| OpenAI Astra 獨立頁（舊觀察） | 2026-09-03 已 GA 到 Trusted Access，有 `gpt-6-astra` 與 OpenClaw 官方切換指令，已改入列 | 見待寫 GPT-6 Astra |
| Perplexity PII-TRACE／PII-Tracer | 官方 [研究文](https://www.perplexity.ai/hub/blog/pii-trace-detecting-personal-data-before-it-leaves-the-device) 仍寫研究。權重已在 HF [`perplexity-ai/pplx-pii-masking`](https://huggingface.co/perplexity-ai/pplx-pii-masking)（`transformers` + `trust_remote_code`）。沒有 OpenClaw 安裝步驟；Hybrid Compute 折進 Computer 待寫 | 有 `clawhub install`／`ollama launch` 再決定要不要本機技能頁 |
| Gemini 3.8 Flash Cyber | Fairwind trusted access，跟 Mythos 同一類 | 不要另開；一般 3.8 Flash 折進 Gemini 舊頁 |
| Product Hunt 9/2（Monid、Dial、Browzer、Articos、CleanShot 5、GhostReply、Onset MCP、Porte、Doop、Userlens） | SaaS／MCP／Mac 工具。Monid 是通用 `SKILL.md` 工具市集，跟 OpenRouter／Firecrawl 互搶。Dial 的 CLI 有 `dial onboard --agent openclaw`，但跟官方 `@openclaw/voice-call` 重疊，沒有獨立 OpenClaw 文件頁。OpenClaw 2.0／Fable 5.1 已在佇列 | 下週 PH；Dial 有獨立 OpenClaw 文件再比 |
| Muse Code／DeepSeek Harness | Ollama 已有 `ollama launch muse`／`ollama launch dsh`，是對手 harness，不是 OpenClaw 技能 | 折進 Ollama／Muse Glimmer 頁帶一句；不要另開 |
| Product Hunt 9/3（Agent Builder by Airtop、Nex、Omi、MagiCrew、Atlas、Tabbit、Higgsfield、Tidy、Thaw、Blume.codes、Grove、Fillo） | SaaS／影片／Mac 工具／GTM coworker。Blume 只監 Claude Code／Codex／Cursor，沒有 OpenClaw skill。Grove 是對手 terminal | 下週 PH |
| Omi（PH 9/3 #3） | 官方 [MCP setup](https://docs.omi.me/doc/developer/mcp/setup) 從 macOS app 連 OpenClaw（複製 MCP key），不是 `openclaw plugins install`。官方 plugin 還是 GitHub issue。跟已入列 screenpipe 互搶螢幕／語音記憶 | screenpipe 上線後再比；不要第三頁 |
| Product Hunt 9/4（Snitch、Chalked for Mac、Remote OpenClaw） | Slack 組織圖／Mac 回覆草稿／MCP 目錄。沒有官方 OpenClaw 安裝步驟；Remote OpenClaw 跟已入列 ClawHub 互搶 | 下週 PH |
| Lyria 3.5（Gemini 音樂，9/4） | Gemini app／API 音樂生成，沒有 OpenClaw 接法 | 不要另開；不必為此改 Gemini 舊頁 |
| Product Hunt 9/5–9/8（dif.sh、AI Toolbox 3.0、PR Lens、Nina、Widgo、US Global Mail MCP、Obol、Switch、MiniCPM5-2B、Catenary、Kopai、Kody） | SaaS／MCP／對手 harness／本機 2B 模型。沒有可重現的 `openclaw plugins install`／`ollama launch openclaw`。US Global Mail 是通用 MCP；Switch 是 Slack／Teams 通道，跟 OpenClaw 既有頻道互搶；MiniCPM5 折進 Ollama | 下週 PH |
| ChatGPT Images 2.5（9/8） | ChatGPT／API 繪圖（Flare／Sunburst）。OpenClaw [v2026.9.4](https://docs.openclaw.ai/releases/2026.9.4) 已能選 Flare／Sunburst，但仍不是獨立技能 | 不要寫產品頁；折進 OpenClaw 9.4 更新一句 |
| NVIDIA PAIR | Ollama／LM Studio proxy，不是 OpenClaw skill | 觀察；不要另開頁 |
| Muse Spark 1.3 | Meta 雲端 API，權重不開。OpenClaw v2026.9.2 已支援；本機路線仍是 Glimmer | 折進 OpenRouter／OpenClaw 9.2 更新；不要跟 Glimmer 寫成同一頁 |
| Product Hunt 9/9（Muse、Type.com、AlphaGenome Atlas） | Muse／Type 是對手個人／團隊 agent，沒有官方 OpenClaw 安裝步驟。AlphaGenome 是基因組研究資料集（Antigravity 入口），跟 Agent 工作流無關 | 下週 PH |
| AgentWard | 有 `agentward setup --gateway openclaw`，但是 2026-03 起的舊專案，跟已上線 Harden AIF 互搶本機 tool-call 防火牆 | Harden 已上；不要第三頁 |
| OpenAI Agents API（9/10 public beta） | 官方 [Agents API](https://developers.openai.com/api/docs/guides/agents-api/overview)：託管 Codex harness，`POST /v1/agents/sessions`，hosted／自架 sandbox。沒有 OpenClaw 安裝步驟，是對手不是技能 | 不要寫產品頁；折進 Claude Code／Codex 稿一句 |
| ChatGPT for Financial Services（9/10） | ChatGPT Work 金融資料＋Astra。企業方案，沒有 OpenClaw 安裝步驟 | 不要寫 |
| Product Hunt 9/10（Mastra Factory、Noodle Seed、49agents IDE、GoModel、Frigade Assist、UI-Atlas、Diiverge 等） | SaaS／對手 harness／OpenRouter 替代。Mastra Factory 是 TypeScript SDLC 工廠，沒有官方 OpenClaw skill。GoModel 折進 OpenRouter | 下週 PH |
| Perplexity Q2D-Web（9/9） | 檢索 benchmark／HF leaderboard，不是產品、沒有 OpenClaw 指令 | 不要寫 |
| Gemini app for Windows／Gemini Spark（9/10） | 官方 [Windows 桌面 app](https://blog.google/innovation-and-ai/products/gemini-app/gemini-app-now-on-windows/)（Alt+Space）。Spark 是 Gemini 內建 24/7 個人 agent，沒有 OpenClaw 安裝步驟，是對手不是技能 | 不要另開；不必為此改 Gemini 舊頁 |
| OpenAI Data agent（9/10） | ChatGPT Work 企業資料 agent。跟 Workspace Agents／Financial Services 同一類，沒有 OpenClaw 安裝步驟 | 不要寫 |
| Product Hunt 9/11（Loqua、Raycast 2.0、Wisry、Cline Desktop、easyspecs、Devin Voice、ChatHop、chat-recall、Cadenya、Accordio、Jackalope 等） | SaaS／Mac 啟動器／對手 harness／語音 agent。Cline Desktop 是開源權重的對手工作區，沒有官方 OpenClaw skill。Jackalope 是 Codex／Claude Code／Grok／OpenCode 共用工作區，對手不是技能 | 下週 PH |
| OpenAI GPT-Live 1（9/10 GA） | 官方 `/v1/live` 全雙工語音，$0.05/min。OpenClaw Talk 已能設 `talk.realtime.model: gpt-live-1-codex`（ChatGPT OAuth；Platform `/v1/live` 仍 waitlist）。跟 ElevenLabs／官方 `@openclaw/voice-call` 重疊，不是獨立技能 | 不要另開頁；折進 OpenClaw 更新一句 |
| Product Hunt 9/12（Cortex API→MCP、QApilot MCP、Work Life Panda、worktrunk、Lightfield、Captain Kill Switch、YuE 等） | SaaS／通用 MCP／Mac 工具／音樂模型。PH Cortex 是 OpenAPI→docs/SDK/MCP，沒有官方 OpenClaw skill（跟社群 cortex-memory 不是同一個）。QApilot 只列 Claude Code／Cursor／Codex，early access。worktrunk 是通用 git worktree CLI，OpenClaw 已有內建 `worktrees`。Claude-Red／pentagi 是攻擊面／滲透測試，不要寫 | 下週 PH |
| Product Hunt 9/13（Resurf、Perplexity Hybrid Compute、Cognition SWE-2、ScreenCursor、Clipwise、Visiby、SHIUI、Epilude Notetaker、GhostWriter） | 沒有可重現的 OpenClaw 安裝步驟。Resurf 是本機資料庫＋通用 MCP／CLI，沒有官方 plugin。Hybrid Compute 已折進 Computer 待寫。SWE-2 只在 Devin Desktop／CLI，是對手不是技能。Clipwise 只出 Claude Code skill。ScreenCursor／Visiby／SHIUI／Epilude／GhostWriter 是錄影／SEO／UI kit／聽寫／Windows 回覆草稿 | 下週 PH |
| Product Hunt 9/14（Naoma、Nimble Web Search Agents、Elva、Slashy、Oats、OzBrain、Aside、LLMagnet） | SaaS 銷售／網搜／API／郵件。Nimble 官方 skill 只列 Claude Code／Cursor／Vercel eve＋通用 MCP，沒有 `openclaw plugins install`，跟已入列 Firecrawl 互搶網搜。OzBrain 見下方獨立列 | 下週 PH |
| Product Hunt 9/15（tiun.、Voiskey、Kilo Code iOS、siift、Agents API、jurniti、Axari、Buddy AI MCP） | SaaS／對手 coding app／通用 MCP。Agents API 已觀察。jurniti 是 Firecracker 託管 OpenClaw，折進 Zeabur，不要另開 hosting 頁 | 下週 PH |
| Product Hunt 9/16（Weave Router 2.0、Appwrite 2.0、Gemini 3.8 Live、Toki、Twigg、Convo） | 對手 router／BaaS／會議 SaaS。Gemini Live 折進 Gemini 舊頁。沒有官方 OpenClaw skill | 下週 PH |
| Product Hunt 9/17（CREEM 2.0、Bitrise Remote Dev、NovaSynth、Higgsfield API、MCPJam、Die With Me） | 金流／雲端 Mac／MCP 測試台。MCPJam 是 MCP playground，不是 OpenClaw skill | 下週 PH |
| Product Hunt 9/18（Ami AI、AINA、MosMos、ProductBridge、Sider Omni Sidebar、Ari、Keysake、Makersclaw 2.0、ContextsBase、arbiter-mcp） | SaaS／Mac sidebar／職涯教練／agent backlog。Makersclaw 是 K8s 託管「AI employee」（PicoClaw／Moltis），對手不是技能，折進 Zeabur。沒有 `openclaw plugins install` | 下週 PH |
| OzBrain（PH 9/14） | 官方 [OpenClaw 頁](https://ozbrain.com/for/openclaw)：`openclaw mcp add ozbrain --url https://ozbrain.com/api/mcp --transport streamable-http` 再 `openclaw mcp login ozbrain`。托管共用記憶，不是 plugin。跟剛入列 Supermemory 互搶長期記憶；先寫 Supermemory | Supermemory 上線後再比；不要第三頁 |
| Grok Voice Transcribe 2.0 | xAI [release notes](https://docs.x.ai/developers/release-notes) 9 月新 STT slug。跟 Whisper 頁重疊，沒有 OpenClaw 技能 | 不要另開 |
| Tencent BrowserSkill | GitHub 熱。官方 README 點名 OpenClaw：`curl …/install.sh \| sh` 再 `bsk install-skill`。跟 OpenClaw 9.3 live browser／官方 chrome extension 互搶 | 寫 OpenClaw 9.3／9.4 更新帶一句；不要另開 |
| TencentCloud Octop | 自架多用戶 assistant，對手 harness | 不要寫 |
| Claude One／Docs／Slides（9/16 媒體） | 只有新聞轉述，Anthropic newsroom 無產品文，沒有 OpenClaw 接法 | 折進 Cowork 觀察 |
| OpenRouter Ternary Bonsai 2 27B（9/18） | PrismML 三值壓縮 Qwen3.8-27B，約 8.5GB。沒有 `ollama launch openclaw` | 折進 OpenRouter；不要另開 |
| Union Alpha／Pareto 26.9（9/16–17） | OpenRouter stealth `stealth/union-alpha` 已揭成 Unbiased `unbiased/pareto`（262K、$2.50/$7.50）。沒有 `ollama launch openclaw` | 折進 OpenRouter；10/10 正式發再看 |
| Tavily 官方 plugin | 官方 `openclaw plugins install @openclaw/tavily-plugin`＋[Tavily OpenClaw 文件](https://docs.tavily.com/documentation/integrations/openclaw)。跟 `brave-search`／已入列 Firecrawl 互搶網搜 | 寫進 Brave／ClawHub 稿一句；不要另開 |
| Cloudflare security-audit-skill | GitHub 熱。官方是 `npx skills add`／Claude Code skill，不是 `openclaw plugins install` | 不要另開；有 ClawHub plugin 再看 |
| Product Hunt 9/19（Bolt Forge、Ruby UTCP） | Bolt Forge 是 Bolt.new 內建開源模型 agent，對手不是技能。Ruby UTCP 是 Ruby MCP 替代協定，沒有 OpenClaw 安裝步驟 | 下週 PH |
| Product Hunt 9/20（Mycel、Answers by Context.dev、Minicart、Harbor、Termphin、Launchie） | SaaS 接案作業／電商／筆記／SSH／Launchpad。Context.dev Answers 是既有 Context.dev 的 JSON 研究 API，已在上方觀察。Viktor 已觀察 | 下週 PH |
| GitHub trending 9/20–21（ECC、agent-native、CUA） | 對手 harness／computer-use 框架，沒有官方 OpenClaw skill | 不要另開 |

---

## 已有、不要重開

| slug / 頁 | 備註 |
|---|---|
| `perplexity` | 搜尋產品已在。Agent API／OpenClaw 接法先更新這頁。Computer / Portable 是否另開見待決。Firecrawl 另開，不要把 Developer Index 塞進來 |
| `mac-mini-m4` | 新款 mini 先更新這頁 |
| `google-gemini` | 更新 CLI → Antigravity，不要另開 Gemini 頁。Omni 1.1 Flash、3.8 Flash、3.8 Live 也寫這頁 |
| `nemotron-3-super` | 不要改寫成 Lightning；加家族連結 |
| `openclaw` | 更新成 2.0（v2026.8.1）＋穩定補丁 v2026.8.2＋v2026.9.1＋v2026.9.2＋v2026.9.3＋v2026.9.4＋v2026.9.5＋星數（約 390K／390,156）＋custodian，不要重開 2.0／8.2／9.1／9.2／9.3／9.4／9.5 頁。Astra 另開模型頁。GPT-Live 1 折進 Talk 一句，不要另開語音頁。Gemini 3.8 Live 折進 voice-call 一句 |
| `gpt-6-astra` | 2026-09-04 產品＋教學已上。影片待補。補 OpenRouter `openai/gpt-6-astra`／`openai/gpt-6-astra-pro`。不要跟 Codex／GPT-5.6／Grok Bot 寫成同一頁，不要另開 Pro 頁 |
| `harden-aif` | 2026-09-22 產品＋教學已上。影片待補。官方 pin：`aif configure --agent openclaw --validate`。基線仍寫 2026.7.1-2（2026-08-26），頁上要求對 v2026.9.5 再 validate。不要跟 AgentWard 寫成同一頁 |
| `heygen` / `elevenlabs` / `ollama` / `omlx` / `zeabur` / `openrouter` | 教學已在，只在有大改版時回訪。Qwen 3.8、Gemma 4、Hy4、Muse Spark 折進 Ollama／OpenRouter，不要另開 |
| `agentmail` | 更新 ClawHub 官方 plugin，不要重開 |
| `brave-search` | 一般網搜頁已在。Firecrawl／Developer Index 另開。Tavily 官方 plugin 寫進這頁一句，不要另開 |
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
| 2026-09-03 | 每日選題掃描 | 待寫 +0；更新舊頁 +Gemini 3.8 Flash | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI docs（仍 4.6；Musk 說 4.7 約 9/12）、Perplexity PII-Tracer（未釋出）、OpenAI Astra（未上市）、Anthropic（Fable／EFS 已記）、Google 3.8 Flash（折進 Gemini 舊頁）、PH 9/2（Monid、Dial、Browzer 等）、GitHub OpenClaw 仍 2026.8.2／~388K、ClawHub（無新官方 skill 頁）、Ollama（無新 `ollama launch openclaw` 模型）、Apple mini／Studio（9/22）、NVIDIA Orin Nano 2（H1 2027）、Arduino VENTUNO Q／UNO Q（已入列）。觀察：Astra、PII-Tracer、Flash Cyber、PH 9/2、Dial／Monid、Muse Code／DSH。沒寫文章。 |
| 2026-09-04 | 每日選題掃描 | 待寫 +1（GPT-6 Astra）；更新舊頁 +OpenClaw v2026.9.1、Astra 接法、Perplexity Hybrid Compute | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI docs（仍 4.6，無 4.7 model card）、Perplexity Hybrid Compute／HF `pplx-pii-masking`（無 OpenClaw 指令）、OpenAI GPT-6 Astra（`gpt-6-astra`＋`openclaw models set openai/gpt-6-astra`）、Anthropic（Fable 已記）、Google（3.8 Flash 已折進舊頁）、PH 9/3（Omi、Airtop、Blume、Grove 等）、GitHub OpenClaw [v2026.9.1](https://github.com/openclaw/openclaw/releases/tag/v2026.9.1) 2026-09-03 18:31 UTC／~388K、ClawHub（無新官方 skill 頁）、Ollama（無新 `ollama launch openclaw` 模型）、Apple mini／Studio（9/22）、NVIDIA Orin Nano 2（H1 2027）、Arduino VENTUNO Q／UNO Q（已入列）。觀察：PH 9/3、Omi／screenpipe 重疊、PII-Tracer 權重已上 HF。沒寫文章。 |
| 2026-09-05 | 每日選題掃描 | 待寫 +0 | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI docs／model card（仍 `grok-4.6`，無 4.7 ID）、Perplexity blog（9/4 Fast Embeddings 是基礎設施文，無產品／OpenClaw 指令）、OpenAI（Astra 已入列／已上產品頁；OpenRouter 仍無 `gpt-6-astra`）、Anthropic（Fable／EFS 已記）、Google Lyria 3.5（音樂，無 OpenClaw）、PH 9/4（Snitch、Chalked、Remote OpenClaw）、GitHub OpenClaw 仍 [v2026.9.1](https://github.com/openclaw/openclaw/releases/tag/v2026.9.1)／~388K、ClawHub（無新官方 skill 頁）、Ollama blog（最新仍 8/31 計價）、Apple mini／Studio（9/22）、NVIDIA Orin Nano 2（H1 2027）、Arduino VENTUNO Q／UNO Q（已入列）。觀察：PH 9/4、Lyria 3.5。沒寫文章。 |
| 2026-09-10 | 每日選題掃描 | 待寫 +1（Harden AIF）；更新舊頁 +OpenClaw v2026.9.2／v2026.9.3、Astra OpenRouter | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI docs／model list（仍 `grok-4.6`，9 月只記 Imagine quality 11/2 下線，無 4.7 card）、Perplexity（Sonar 仍 9/27；Hybrid 已折進 Computer）、OpenAI Images 2.5（無 OpenClaw）、Anthropic（Fable／FLT 研究文，無新品）、Google 9/9 行政雜務文＋Agentic Video（折進 Gemini 舊頁）、PH 9/5–9/9、GitHub／docs OpenClaw 最新 [v2026.9.3](https://docs.openclaw.ai/releases/2026.9.3)／~388K、ClawHub（NVIDIA Skill Cards 折進 ClawHub 稿）、Ollama（無新 `ollama launch openclaw`）、Apple mini／Studio（9/22）、NVIDIA Orin Nano 2（H1 2027）、Arduino VENTUNO Q 官方店仍 pre-order／約 4 週。佇列自 9/5 起未寫進檔的 9.2／9.3／OpenRouter 一併補上。沒寫文章。 |
| 2026-09-11 | 每日選題掃描 | 待寫 +0；更新舊頁 +Agents API（折進 Codex 稿）、Firecrawl 官方 ClawHub plugin、macOS 27 9/14 | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI docs／model list（仍 `grok-4.6`，`grok-4.7` 404，無 card）、Perplexity Q2D-Web（benchmark，不寫）、OpenAI [Agents API](https://developers.openai.com/api/docs/guides/agents-api/overview)＋ChatGPT Financial Services（觀察）、Anthropic 9/10 威脅情報文（無新品）、Google（3.8 Flash／Agentic Video 已折進舊頁）、PH 9/10（Mastra Factory 等）、GitHub／docs OpenClaw 仍 [v2026.9.3](https://docs.openclaw.ai/releases/2026.9.3)／~388K、ClawHub（`@openclaw/firecrawl-plugin` 折進 Firecrawl 稿；tokenjuice 等官方 plugin 非新品）、Ollama（最新仍 8/31 計價）、Apple mini／Studio（9/22；Golden Gate 9/14）、NVIDIA Orin Nano 2（H1 2027）、Arduino VENTUNO Q 官方店仍 pre-order／約 4 週 €298.99。沒寫文章。 |
| 2026-09-12 | 每日選題掃描 | 待寫 +0；更新舊頁 +OpenClaw [v2026.9.4](https://docs.openclaw.ai/releases/2026.9.4) | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI docs／model list（仍 `grok-4.6`，`grok-4.7` 導回 models 列表、無 card）、Perplexity blog（Q2D-Web／Hybrid 已記，無新品）、OpenAI（Agents API／Financial Services／Data agent 已觀察）、Anthropic newsroom（仍 Fable 5.1，無新品）、Google [Gemini Windows](https://blog.google/innovation-and-ai/products/gemini-app/gemini-app-now-on-windows/)＋Spark（觀察）、PH 9/11（Cline Desktop、Raycast 2.0、Loqua 等；9/12 尚無上榜）、GitHub／docs OpenClaw [v2026.9.4](https://github.com/openclaw/openclaw/releases/tag/v2026.9.4) 2026-09-11 03:46 UTC／~389K、ClawHub（無新官方 skill 頁；9.4 Plugins workspace 折進 OpenClaw 更新）、Ollama（無新 `ollama launch openclaw`）、Apple mini／Studio（9/22；Golden Gate 9/14）、NVIDIA Orin Nano 2（H1 2027）、Arduino VENTUNO Q 官方店仍 pre-order／約 4 週 €298.99。沒寫文章。 |
| 2026-09-13 | 每日選題掃描 | 待寫 +0；更新舊頁 +GPT-Live 1（折進 OpenClaw Talk） | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI docs／model list（仍 `grok-4.6`，`grok-4.7` 404、無 card）、Perplexity blog（Q2D-Web／Hybrid／Sonar 9/27 已記，無新品）、OpenAI changelog（GPT-Live 1 9/10 GA，Talk 用 `gpt-live-1-codex`）、Anthropic newsroom（仍 Fable 5.1／9/10 威脅情報，無新品）、Google（Windows／Spark 已觀察）、PH 9/12（Cortex API→MCP、QApilot、worktrunk 等，無 OpenClaw 安裝）、GitHub／docs OpenClaw 仍 [v2026.9.4](https://docs.openclaw.ai/releases/2026.9.4)／~389K、ClawHub（無新官方 skill 頁；Opik／tokenjuice／Google Meet 非新品）、Ollama（無新 `ollama launch openclaw`）、Apple mini／Studio（9/22；Golden Gate 9/14）、NVIDIA Orin Nano 2（H1 2027）、Arduino VENTUNO Q 官方店仍 pre-order／約 4 週 €298.99（9/11 AMR 文不是出貨更新）。沒寫文章。 |
| 2026-09-14 | 每日選題掃描 | 待寫 +0 | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI docs／model list（仍 `grok-4.6`，`grok-4.7` 導回 models、無 card）、Perplexity blog（Q2D-Web／Hybrid／Sonar 9/27 已記，無新品）、OpenAI changelog（9/10 之後只有 API key 過期設定，無新品）、Anthropic newsroom（仍 Fable 5.1／9/10 威脅情報，無新品）、Google（Windows／Spark 已觀察，無 9/12–14 新品）、PH 9/13（Resurf、SWE-2、ScreenCursor、Clipwise 等，無 OpenClaw 安裝）、GitHub／docs OpenClaw 仍 [v2026.9.4](https://docs.openclaw.ai/releases/2026.9.4)／~390K、ClawHub（Google Chat／Nextcloud Talk 是既有官方 channel，寫 ClawHub 頁帶一句；不要另開）、Ollama（無新 `ollama launch openclaw`）、Apple mini／Studio（9/22；Golden Gate 9/14 美西窗）、NVIDIA Orin Nano 2（H1 2027）、Arduino VENTUNO Q 官方店仍 pre-order／約 4 週 €298.99。沒寫文章。 |
| 2026-09-19 | 每日選題掃描 | 待寫 +1（Supermemory）；更新舊頁 +Gemini 3.8 Live、Portable Windows、Computer effort mode、OpenClaw 星數 ~390K | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI docs／model list（仍 `grok-4.6`，`grok-4.7` 404、無 card；9 月多 Grok Voice Transcribe 2.0）、Perplexity（9/14 Portable Windows RTX≥24GB；9/17 Computer effort mode）、OpenAI changelog（9/15 之後只有 API key governance）、Anthropic newsroom（9/17 是實驗室指標文，無新品）、Google [3.8 Live](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/)、PH 9/14–9/18、GitHub trending（BrowserSkill／Octop／Supermemory）、OpenClaw 仍 [v2026.9.4](https://docs.openclaw.ai/releases/2026.9.4)／390,052、ClawHub（無新官方 skill 頁）、Ollama（最新仍 8/31 計價）、Apple mini／Studio（9/22）、NVIDIA Orin Nano 2（H1 2027；首頁是 CUDA-Q）、Arduino VENTUNO Q 官方店仍 pre-order／約 4 週 €298.99。檔從 9/14 補到今天。沒寫文章。 |
| 2026-09-21 | 每日選題掃描 | 待寫 +0；更新舊頁 +OpenClaw [v2026.9.5](https://docs.openclaw.ai/releases/2026.9.5)、星數 390,156、Tavily 折進 Brave／ClawHub | 對過 `SOP-NEW-APP.md`、`src/data/products.ts`。來源：xAI docs／model list（仍 `grok-4.6`，`grok-4.7` 404、無 card）、Perplexity blog（effort／Portable／Hybrid 已記，無 9/18 後新品）、OpenAI changelog（9/15 之後只有 API key governance）、Anthropic newsroom（仍 9/17 實驗室指標，無新品）、Google（3.8 Live 已折進舊頁；9/19–20 是安全測試新聞不是產品）、PH 9/19–9/20、GitHub trending（ECC／agent-native／CUA／security-audit-skill）、OpenClaw [v2026.9.5](https://docs.openclaw.ai/releases/2026.9.5) 2026-09-19 01:55 UTC／390,156、ClawHub（官方 Tavily／Voyage／Vertex／Bedrock Mantle 是 provider，不是新品頁）、Ollama（最新仍 8/31 計價）、Apple mini／Studio（9/22）、NVIDIA Orin Nano 2（H1 2027）、Arduino VENTUNO Q 官方店仍 pre-order／約 4 週 €298.99。檔從 9/19 補到今天（9/20 掃描未寫進 QUEUE）。沒寫文章。 |

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
