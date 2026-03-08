# WORKFLOW.md — CanFly.ai 團隊工作規則

> 每一輪 Sprint 都要產出清楚的下一步，不能完成了就沒事了。

---

## 🔄 Sprint 循環流程

```
完成 Tickets → 小龍蝦彙報 + 草擬下一輪 Tickets
        ↓
   CEO 給回饋（調整優先級、補充需求、挑戰假設）
        ↓
   小龍蝦整理 → 提交寶博確認
        ↓
   寶博確認 ✅ → 小龍蝦建立 Tickets 交付 CEO 分派
        ↓
   CEO 分派 → Agents 執行
        ↓
   完成 → 循環重複
```

### 角色職責

| 角色 | 誰 | 職責 |
|------|-----|------|
| **董事長 / Board** | 寶博 | 最終確認、方向決策、品質把關 |
| **特助 / Chief of Staff** | 小龍蝦 🦞 | 彙報進度、草擬 tickets、協調上下、品質檢查 |
| **CEO** | 雲龍蝦 (Paperclip) | 策略回饋、任務分解、分派工作、監督 agents |
| **Dev** | Dev agent | 寫 code、修 bug、技術實現 |
| **Content Writer** | Content Writer agent | 教學文章、影片文稿、SEO 內容 |

### 流程細節

#### 1️⃣ Ticket 完成彙報
每一輪 tickets 完成後，小龍蝦必須：
- ✅ 列出完成的 tickets 和成果
- ✅ 標記遇到的問題/lessons learned
- ✅ **草擬下一輪 ticket 清單**（標題 + 優先級 + 建議指派人）
- ✅ 提交給 CEO 討論

#### 2️⃣ CEO 回饋
CEO 收到草案後：
- 調整優先級
- 補充遺漏的需求
- 挑戰假設（這真的要做嗎？順序對嗎？）
- 回覆修改後的 ticket 清單

#### 3️⃣ 寶博確認
小龍蝦將 CEO 回饋整理成最終清單，提交寶博：
- 一目了然的表格格式
- 標明每個 ticket 的理由
- 寶博可以：✅ 全部通過 / ✏️ 修改 / ❌ 砍掉

#### 4️⃣ 建票分派
寶博確認後，小龍蝦：
- 在 Paperclip 建立所有 tickets
- 設定 priority、assignee、description
- 通知 CEO 開始分派

---

## 📋 Ticket 規範

### 標題格式
`[類別] 具體任務描述`

類別：`[Feature]` `[Content]` `[Bug]` `[Infra]` `[Design]` `[Video]` `[SEO]`

### Priority 標準
| Priority | 定義 | 範例 |
|----------|------|------|
| **critical** | 阻擋上線或影響收入 | 金流壞了、首頁 crash |
| **high** | 核心功能或內容 | 教學頁面、affiliate 連結 |
| **medium** | 改善體驗或擴展 | 新產品頁、SEO 優化 |
| **low** | Nice to have | 動畫效果、微調 |

### Description 必須包含
1. **背景**：為什麼做這個
2. **驗收標準**：怎樣算完成（具體、可檢查）
3. **技術提示**（如適用）：相關檔案、API、注意事項

---

## 🔍 自治巡檢機制（CEO 每 15 分鐘 heartbeat）

CEO 不只是等人派工，每次 heartbeat 必須主動巡檢：

### 巡檢清單
1. **網站健康**：curl 主要頁面，檢查 404、壞連結
2. **翻譯完整性**：比對 en/zh-TW/zh-CN key 數量
3. **Git 品質**：review 最近 commits
4. **Agent 狀態**：有沒有 idle/error 的 agent
5. **用戶體驗**：模擬用戶走一遍主要流程

### 發現問題 → 自建 Issue
CEO 可以直接用 Paperclip API 建 issue（見 AGENTS.md），不需要等寶博或小龍蝦。

### Bug vs Feature
- **Bug**（壞了的東西）→ CEO 自己建票，高優先級，直接分派
- **Feature improvement**（可以更好的）→ CEO 記錄到下一輪 Sprint 草案
- **翻譯缺漏**→ 建 Bug ticket，指派 Content Writer

---

## 🚫 禁止事項

- ❌ 完成 tickets 後只報告「全部做完了 ✅」而不提下一步
- ❌ 沒經過 CEO 回饋就直接提交寶博
- ❌ 沒經過寶博確認就開始建票
- ❌ Ticket description 寫得模糊（「優化首頁」→ 具體哪裡？）
- ❌ **小龍蝦直接做事不建 ticket** — 即使是自己能做的事，也要建 ticket → checkout → 做 → 回報。這樣團隊才有紀錄，其他人才能給意見或幫忙

---

*Created: 2026-03-08 by 小龍蝦 🦞*
*Source: 寶博指示*
