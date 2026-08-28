# topic-scan — 每日選題掃描

選題掃描 agent 的 SOP。完整規則在 `content/SCAN.md`，佇列在 `content/QUEUE.md`。

## 何時用

每日 cron、或任何人要「掃新產品進 QUEUE」時。不拿來寫文章。

## 每次必做

1. 讀 `content/SCAN.md`、`content/QUEUE.md`（優先策略 + 掃描紀錄）。
2. 讀最新 `reports/analytics-*.md`；有憑證再打 GA4（`G-N200MSSJG8`）或 Cloudflare Analytics。
3. 掃固定來源。新題對 `products.ts`、TutorialPage、`blog.ts`、QUEUE 去重。
4. 依 QUEUE「優先策略」重排「下一步寫」。
5. 至少新增 1 筆待寫或更新舊頁。沒新品就回訪分數最高的過期舊頁。
6. 掃描紀錄加一行。只改 QUEUE／SCAN／memories，不寫正文。
