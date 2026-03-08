# AGENTS.md — CanFly.ai 團隊指引

## 🔧 Paperclip API（本機）

所有 agent 都可以用 curl 直接操作 Paperclip API：

```bash
API="http://127.0.0.1:3100/api"
COMPANY="84078dce-87b6-419f-b769-e2ea7b764667"
PROJECT="cbf019b5-3fc3-4391-b826-b6e434cd0d00"
GOAL="cc30fd90-98db-492f-86bf-c564004b98f4"
```

### 建立 Issue
```bash
curl -s -X POST "$API/companies/$COMPANY/issues" \
  -H "Content-Type: application/json" \
  -d '{"title":"[Bug] 問題描述","priority":"high","projectId":"'$PROJECT'","goalId":"'$GOAL'","assigneeAgentId":"AGENT_ID","description":"詳細說明"}'
```

### Agent IDs
| Agent | ID | 職責 |
|-------|-----|------|
| CEO | `fa63af48-ab45-4ef0-bdf4-a54667efdab6` | 監督、分派、品質 |
| Dev | `c2e3505b-fb5a-4548-aa1e-7d15557cc343` | 程式碼、技術 |
| Content Writer | `1616d905-593f-4bbb-a7cf-1c5cf05a3951` | 文案、教學 |
| LittleLobster (CMO) | `b04ebe41-3618-41cb-a61f-7f985e5c9b83` | 影片、截圖、素材 |

### 新增 Comment
```bash
curl -s -X POST "$API/issues/ISSUE_ID/comments" \
  -H "Content-Type: application/json" \
  -d '{"body":"訊息內容","authorAgentId":"YOUR_AGENT_ID"}'
```

### 查看所有 Issues
```bash
curl -s "$API/companies/$COMPANY/issues" | python3 -c "import sys,json; [print(f\"{i['identifier']} {i['status']} {i['title']}\") for i in json.load(sys.stdin)]"
```

## 🔄 Sprint 工作流

見 `WORKFLOW.md`。

## 🌐 i18n 翻譯規則

**每次修改或新增頁面內容時，必須同時更新三個語言檔：**
- `src/i18n/en.json` — 英文
- `src/i18n/zh-TW.json` — 繁體中文
- `src/i18n/zh-CN.json` — 簡體中文

**Content Writer 負責翻譯品質，Dev 負責確保 key 同步。**

## 🔍 自主巡檢（CEO 職責）

CEO 每次 heartbeat 除了監督進度，還要：
1. **巡檢網站**：用 curl 抓幾個頁面，看有沒有壞掉的連結、缺翻譯、404
2. **檢查 git diff**：看最近的 commit 有沒有問題
3. **自建 Bug ticket**：發現問題就自己建 issue，不用等人指派
4. **推動改善**：主動發現可以優化的地方，建 issue 提案
