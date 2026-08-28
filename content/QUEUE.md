# CanFly.ai 內容佇列（每日功課）

> 選題 inbox，不是自動發文機。掃描規則見 `content/SCAN.md`。
> 產稿走 `SOP-NEW-APP.md` 或既有 blog 結構。

最後掃描：2026-08-28（優先策略拍板 + 依 GA 重排）

---

## 優先策略

漏斗先、能裝再寫、熱頁延伸、硬體押後繼機。

| 權重 | 條件 | 為什麼這樣排 |
|---|---|---|
| 必須 | 有可重現的 OpenClaw／本地 AI 接法 | 沒接法的題只會變成新聞稿 |
| 高 | 延伸現有熱頁（GA：`/learn/ollama*`、`/apps`） | 2026-03 報告裡，Ollama 教學是首頁以外最穩的內容頁 |
| 高 | 軟體、已上市、指令今天就跑得動 | 週二／五要交得出一篇 |
| 中 | 現有頁過期或有硬 deadline | 比開新頁便宜，也比較不會互搶排名 |
| 中 | 跟站上已有模型／技能頁同一形狀 | Gemini、Nemotron 證明這種頁寫得完 |
| 低 | 未上市硬體、競品、高價工作站 | 可以預告，不要插隊擋漏斗 |

寶博點名列不再自動 P0。點名當成提名；排序依上表。理由見「已拍板」。

---

## 下一步寫（Content Writer 照這個拿）

1. **ClawHub**（新頁 + `/learn/clawhub`）
2. **更新 `/learn/ollama-openclaw` + OpenClaw 產品卡**（GA 熱頁，星數與 custodian skills 過期）
3. **更新 Perplexity 舊頁**（Agent API；Sonar 2026-09-27 下線）
4. **Claude Code / Codex 接 OpenClaw**
5. **Grok 4.6**（模型頁，不要寫成 Grok Bot）
6. **更新 Mac mini M4 → M6**
7. **Nemotron 3.5 Lightning** + Super 頁家族連結
8. **Arduino UNO Q 4GB**
9. **TaskMarket**
10. **Grok Bot 競品對照 blog**（有 Grok 4.6 之後再寫，不做商店頁）
11. **Perplexity Computer 一篇對照**（舊頁更新之後，只寫一篇，不要 Portable / Comet 各開一頁）

---

## 每日節奏

| 何時（Asia/Taipei） | 做什麼 | 產出 |
|---|---|---|
| 每天 06:00 | 依 `content/SCAN.md` 掃 | 去重、重排、至少新增 1 項 |
| 週二、週五 09:00 | 從「下一步寫」第 1 名產稿 | 1 篇（三語 + 內鏈） |
| 爆發日 | 一次寫 2–3 篇，不要灌水 | 仍照上面排序往下拿 |
| CEO heartbeat | review → `git push origin main` | 上線 |

品質護欄見 `CONTENT-STRATEGY.md` §5。

---

## 待寫

| 序 | 優先 | 題目 | 類型 | 為什麼現在是這個位子 | 建議頁面 | 狀態 |
|---|---|---|---|---|---|---|
| 1 | P0 | ClawHub | 軟體／skills | 官方 registry。教學已有 `clawhub install` 卻沒產品頁。直接接上 GA 最熱的 OpenClaw 安裝漏斗 | `/apps` + `/learn/clawhub`；寫完改 `/learn/agent-skills` | queued |
| 2 | P0 | 更新 ollama-openclaw + OpenClaw 卡 | 更新舊頁 | GA 熱頁。產品卡還寫 300K+ stars，實際約 388K。Custodian skills 沒寫 | `/learn/ollama-openclaw`、OpenClaw 產品卡 | queued |
| 3 | P0 | 更新 Perplexity | 更新舊頁 | 官方 OpenClaw 文件已出。Sonar 9/27 下線。現有頁停在搜尋引擎 | `/apps/skills/perplexity` + `/learn/perplexity` | queued |
| 4 | P1 | Claude Code / Codex 接 OpenClaw | 軟體／skills | 官方 `mcp serve` 點名。桌面開發者是現有受眾。一頁講完，不要拆 | `/learn/claude-code-codex` | queued |
| 5 | P1 | Grok 4.6（xAI API） | 軟體／models | 長跑 agent 模型，OpenRouter 有。跟 Gemini／Nemotron 同形狀。不要跟 Grok Bot 混 | `/apps/models/grok-4-6` + `/learn/grok-4-6` | queued |
| 6 | P1 | 更新 Mac mini M4 → M6 | 更新舊頁 | 2026-08-25 發表，9/22 出貨。後繼機，不開新 slug，除非規格差到互搶 | 更新 `mac-mini-m4` | queued |
| 7 | P1 | Nemotron 3.5 Lightning | 軟體／models | NVIDIA 點名 OpenClaw。30B / 3B active，跟 Super 不是同一張卡 | 新頁 + Super 頁加連結 | queued |
| 8 | P1 | Arduino UNO Q（4GB） | 硬體 | 已上市，官方部落格講本機 OpenClaw。先寫能買的板 | `/apps/hardware`；SKU 4GB / 32GB | queued |
| 9 | P2 | TaskMarket | 軟體／skills | 跟 BaseMail／AgentCard 同一條線。市場還小，不要插隊 | `/learn/taskmarket` | queued |
| 10 | P2 | Grok Bot 對照 | blog | 搜尋熱，但是 OpenClaw 對手。有模型頁之後寫一篇「何時用 Bot、何時用 OpenClaw」 | blog，不做 `/apps` 商店頁 | queued |
| 11 | P2 | Perplexity Computer 對照 | blog | 舊頁更新後寫一篇差在哪。Portable／Comet 不另開頁 | blog，連回 `/learn/perplexity` | queued |

---

## 更新舊頁（細節）

| 現有頁 | 為什麼要改 | 排進「下一步寫」 |
|---|---|---|
| `/learn/ollama-openclaw` + OpenClaw 產品卡 | 熱頁過期；星數、custodian skills | #2 |
| `/apps/skills/perplexity` + `/learn/perplexity` | Agent API、MCP、Sonar 9/27 | #3 |
| `/apps/hardware/mac-mini-m4` | M6 / M5 Pro，9/22 | #6 |
| `/learn/nemotron-3-super` | Lightning 家族連結 | 跟 #7 一起做 |
| `/learn/agent-skills` | ClawHub 上線後改 nextStepCards | 跟 #1 一起做 |
| `/apps/models/google-gemini` + `/learn/google-gemini` | Gemini CLI 已停，改 Antigravity。沒有 deadline 壓過上面幾項 | 下次掃描若沒新品，這是預設回訪項 |

---

## 觀察（不夠格，或刻意押後）

| 題目 | 為什麼不進下一步 | 下次再看 |
|---|---|---|
| Perplexity Portable / Comet | 跟 Computer 互搶。先一篇對照就好 | Computer 對照上線後 |
| Arduino VENTUNO Q | 未上市。先寫 UNO Q | 官方開賣 |
| Jetson Orin Nano 2 | 沒對上現有 Amazon 帶 | 有導購連結 |
| Mac Studio 512GB / M5 Ultra | $2,499 起，超出目前硬體帶 | 上市且有明確 always-on 故事 |
| Claude Cowork | 沒看到 OpenClaw 接法 | 有官方接法 |
| Google Antigravity 獨立頁 | Gemini 舊頁更新就夠 | 跟 OpenClaw 出現互補接法 |
| OpenAI AgentKit | 2026-11-30 下線 | 不要寫 |
| Product Hunt（8/27–8/28）Skydive、Enter Pro、Traccia、Speko、CTRL Micro、Clipto MCP、Vercel Eve | 沒有可重現接法，或跟現有頁重疊 | 下週 PH |
| Gemini 3.5 Transcribe | 跟 Whisper 重疊 | 有獨立 API 教學需求 |
| Grok Voice Agent Builder | 跟 ElevenLabs 重疊 | 有 OpenClaw 接法 |

---

## 已有、不要重開

| slug / 頁 | 備註 |
|---|---|
| `perplexity` | 先更新這頁。Computer 只走一篇 blog |
| `mac-mini-m4` | 新款 mini 更新這頁 |
| `google-gemini` | 更新 CLI → Antigravity |
| `nemotron-3-super` | 不要改寫成 Lightning |
| `openclaw` / `ollama` / `omlx` | 熱頁更新，不要重開 |
| `heygen` / `elevenlabs` / `zeabur` / `openrouter` | 大改版才回訪 |
| `whisper` / `brave-search` / `umbrel` / `pinata` / `switchbot-ai-hub` | 同上 |
| `basemail` / `agentmail` / `agentcard` / `worldid` / `agentbook` | 同上 |
| `utm` / `virtual-buddy` | 同上 |
| `macbook-neo` / `geekom-a8` / `beelink-ser5-max` / `raspberry-pi-5` / `elgato-stream-deck` / `fifine-am8` / `hdmi-dummy-plug` / `even-g2-bridge` | 硬體／技能已在 |

---

## 已拍板（原「待決」）

| 題 | 決定 |
|---|---|
| Grok Bot | 不做商店頁。排第 10，等 Grok 4.6 寫完再做對照 blog |
| Perplexity Computer / Portable / Comet | 先更新舊 Perplexity。之後只寫一篇 Computer 對照。Portable／Comet 留觀察 |
| Jetson Orin Nano 2 | 觀察，等導購連結 |
| Mac Studio 512GB | 觀察，等上市 |
| Arduino | 先 UNO Q 4GB。VENTUNO Q 等開賣 |

---

## 掃描紀錄

| 日期 | 掃描者 | 入列 | 備註 |
|---|---|---|---|
| 2026-08-28 | Cloud agent（依寶博點名） | 7 | 建立佇列；尚未產稿 |
| 2026-08-28 | 每日選題掃描 | 待寫 +6；更新舊頁 6 | 來源：xAI、Perplexity 官方 OpenClaw 文件、OpenAI、Anthropic、Google、PH、GitHub、ClawHub、Apple、NVIDIA、Arduino。沒寫文章 |
| 2026-08-28 | 優先策略拍板 | +1 更新舊頁（ollama-openclaw 熱頁回訪） | 讀 `reports/analytics-2026-03-25.md`（無 GA API 憑證）。Ollama 教學是內容磁鐵，據此重排。下一步第 1 名：ClawHub。寫入 `content/SCAN.md` |

---

## 產稿時記得

1. 拿「下一步寫」第 1 名，不要自選。
2. 三語 key 同步：`src/i18n/en.json`、`zh-TW.json`、`zh-CN.json`
3. 產品頁走 `SOP-NEW-APP.md`；影片走 `VIDEO-RULES.md`（英文口白 + 繁中／英文雙語軟字幕）
4. `npm run check-i18n` + `npx vite build`
5. `git commit`，Paperclip 回報 CEO，不要自己 push
