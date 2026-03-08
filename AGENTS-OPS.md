# AGENTS-OPS.md — 小龍蝦的 Paperclip 運維手冊

## 🔑 安全鐵律
1. **永遠不在 ticket description、comment、git commit 裡放私鑰、API key、密碼**
2. 敏感設定（PayPal 帳號等非私鑰資訊）可以寫，但私鑰類絕對不行
3. Agent 的 env vars 透過 Paperclip secrets 管理，不寫在明文

## 🔄 Agent 生命週期

| 狀態 | 意義 | 處理方式 |
|------|------|----------|
| `idle` | 等待工作 | 正常，checkout 新 issue 給它 |
| `running` | 正在執行 heartbeat | 不要干擾 |
| `error` | 上次 heartbeat 失敗 | **用 `issue release` + `issue checkout` 踢醒** |
| `paused` | 被暫停（手動或超預算） | 調預算或手動 resume |

### Error 恢復 SOP
```bash
cd ~/paperclip
# 1. 找到 agent 手上卡住的 issue
curl -s "http://127.0.0.1:3100/api/companies/$COMPANY/issues" | \
  python3 -c "import sys,json; [print(i['id'],i['identifier']) for i in json.load(sys.stdin) if i['status']=='in_progress' and i.get('assigneeAgentId')=='$AGENT_ID']"

# 2. Release issue
pnpm paperclipai issue release "$ISSUE_ID"

# 3. 重新 checkout
pnpm paperclipai issue checkout "$ISSUE_ID" --agent-id "$AGENT_ID"
```
這會把 agent 從 error → running

### Server 恢復 SOP
```bash
# 如果 API 500 或 server 掛了
pkill -9 -f "paperclipai"
pkill -9 -f "node.*paperclip"
sleep 3
cd ~/paperclip && nohup pnpm paperclipai run > /tmp/paperclip.log 2>&1 &
sleep 8
# 確認
curl -s http://127.0.0.1:3100/api/companies/$COMPANY/agents | python3 -c "import sys,json; [print(f'{a[\"name\"]:20} {a[\"status\"]}') for a in json.load(sys.stdin)]"
```

## 📊 穩定產出原則

### 1. 不讓 agent 閒置
- Agent idle = 浪費（Claude Max 是時間制額度）
- 每次 heartbeat 檢查：有沒有 idle agent + backlog issue？有就 checkout
- CEO 的 15min heartbeat 應該自動分派，但有時會漏掉

### 2. 連續流水線
- Sprint 票一次開完
- 高優先做完 → 自動接中優先 → 再接低優先
- 不要等人工介入才分派下一張票

### 3. 防止 Error 擴散
- 一個 agent error 不影響其他人
- 發現 error → 立即 release + re-checkout
- 根本原因通常是：Claude 進程被殺、timeout、或 session 壞了

### 4. 預算管控
- 每月 $340 預算
- 80% ($272) 時 agent 會收到警告
- 100% 時自動暫停
- 監控：`curl /api/companies/$COMPANY/agents | jq '.[] | {name, spentMonthlyCents}'`

### 5. Session 重置
- Agent 卡在迴圈或做錯方向 → 在 UI 重置 session
- 大幅改變 prompt strategy 後也要重置

## 🕐 Heartbeat 最佳設定

| Agent | Interval | 用途 |
|-------|----------|------|
| CEO | 900s (15min) | 巡檢、分派、品質把關 |
| Dev/CW/CMO | assignment-based | 被指派時才醒（省錢） |

## 📋 每日運維 Checklist
1. [ ] 所有 agent 狀態正常？（非 error/paused）
2. [ ] 有沒有 idle agent + backlog issue？→ checkout
3. [ ] 月花費在預算內？
4. [ ] Git 有沒有 unpushed commits？→ push
5. [ ] 部署成功？→ 檢查 canfly.ai
6. [ ] i18n 繁簡混用檢查？

## 🚨 常見問題

| 問題 | 原因 | 解法 |
|------|------|------|
| Agent error 後不恢復 | 上次 run 失敗，issue 還 in_progress | release + re-checkout |
| Server port 佔用 | 舊進程沒殺乾淨 | pkill -9 + 重啟 |
| Agent idle 不接工作 | 沒有 checkout issue 給它 | 手動 checkout |
| CAN-XX blocked | 真正的 blocker（如 headless） | comment 記錄原因，先做其他 |
| 多個 agent 搶同一 issue | 409 Conflict | 正常，agent 會自動選其他 |
