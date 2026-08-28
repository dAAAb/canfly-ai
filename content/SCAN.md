# 每日選題掃描 playbook

掃描 agent 每次開工先讀這份，再動 `content/QUEUE.md`。不寫正文，不產產品頁。

## 每次必做（缺一不可）

1. **學前面怎麼找題。** 讀本檔、`QUEUE.md` 的「優先策略」「掃描紀錄」、以及 `/cursor/stores/automation/memories/content-queue.md`（若存在）。沿用已驗證的來源與夠格標準，不要每次重發明規則。
2. **看誰受歡迎。** 讀最新 `reports/analytics-*.md`。有 GA4 Data API／Cloudflare Analytics 憑證就拉最近 28 天的 `/learn/*`、`/apps/*`、`/blog/*` 路徑（測量 ID `G-N200MSSJG8`）。沒憑證就用報告＋`src/data/products.ts`／`src/data/blog.ts` 現有熱門教學當代理指標。熱頁只拿來**加權排序**，不能當「沒熱頁就不要寫新題」的藉口。
3. **去重後重排。** 新題對過：`QUEUE.md` 待寫／觀察／已有、`src/data/products.ts`、`TutorialPage.tsx` 的 tutorial id、`src/data/blog.ts` slug。同產品、同接法、同 SKU 合併或改「更新舊頁」。整表依「優先策略」重排，不要只把新題丟在表尾。
4. **至少新增一項。** 每次掃描必須新增至少 1 筆「待寫」或「更新舊頁」，且該項先前不在佇列、或舊列沒寫到這次才成立的理由（例如新 deadline、新品號、流量暴衝）。禁止灌水：不要發明假產品、不要把觀察項改寫成空 recap。真的沒有新品時，選**分數最高、尚未入列的舊頁回訪**（規格過期、教學指令失效、熱頁缺內鏈）。

## 夠格標準（沿用，不要放寬）

同時符合才進「待寫」：

1. 能寫成 CanFly app + `/learn`，或一篇有安裝步驟的 blog。不是新聞稿。
2. 跟 OpenClaw／本地 AI／Agent 工作流有官方或可重現的接法。
3. 站上沒有同產品頁。相近就「更新舊頁」。
4. 軟體優先。硬體要能當 always-on 或 edge 養蝦機，或是現有導購頁的後繼機。

## 固定偵察來源

軟體：xAI/Grok、Perplexity、OpenAI、Anthropic、Google、Product Hunt、GitHub Trending、Hugging Face、ClawHub、Ollama／OpenRouter／Zeabur changelog。

硬體：Apple Newsroom、NVIDIA Jetson、Arduino 官方、現有導購頁後繼機（Mac mini / Studio、開發板）。

## 寫完 QUEUE 的檢查

- 「下一步寫」前 3 名有理由，且第 1 名是 Content Writer 下一次該拿的題。
- 「掃描紀錄」加一行：日期、看了哪些來源、GA 看了哪份報告、入列幾題、重排後第 1 名是誰。
- 沒有新題又找不出可回訪的舊頁，才只改「最後掃描」日期。這種情況要在紀錄寫清楚為什麼連舊頁回訪都沒有。極少見，先假設一定找得到一項。

## 不要做

- 不要寫完整文章。
- 不要把自己的掃描意見蓋掉「下一步寫」已經拍板的排序，除非有新事實（下線、上市、官方接法出現）。
- 不要為了「至少一項」把 Grok Bot 跟 Grok 4.6 拆成三篇，或把 Perplexity 家族拆成三個產品頁。
