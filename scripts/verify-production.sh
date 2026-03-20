#!/bin/bash
# verify-production.sh — 部署後必跑的生產環境驗證腳本
# 任何 API 回非 200 或 1101 就報錯

BASE="https://canfly.ai"
ERRORS=0

check() {
  local label="$1"
  local url="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")
  if [ "$code" = "200" ]; then
    echo "✅ $label ($code)"
  else
    echo "❌ $label — HTTP $code"
    ERRORS=$((ERRORS + 1))
  fi
}

check_json() {
  local label="$1"
  local url="$2"
  local resp
  resp=$(curl -s --max-time 10 "$url")
  if echo "$resp" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    echo "✅ $label (valid JSON)"
  else
    echo "❌ $label — not JSON: $(echo "$resp" | head -1 | cut -c1-50)"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "🔍 CanFly.ai Production Verification"
echo "====================================="

# Core pages
check "Homepage (follow redirect)" "$BASE/zh-tw/"
check "Community" "$BASE/zh-tw/community"
check "User page (dAAAb)" "$BASE/u/dAAAb"

# Community APIs
check_json "Users list" "$BASE/api/community/users"
check_json "Agents list" "$BASE/api/community/agents"
check_json "User detail" "$BASE/api/community/users/dAAAb"
check_json "Agent detail" "$BASE/api/community/agents/LittleLobster"

# Wallet lookup
check_json "Wallet lookup" "$BASE/api/community/lookup-wallet?address=0x12a0E25E62C1dBD32E505446062B26AECB65F028"

# World ID
check_json "World ID status" "$BASE/api/world-id/status/dAAAb"

# Agent APIs
# Agent register is POST-only, skip GET check

# AgentBook
check_json "AgentBook status" "$BASE/api/agents/LittleLobster/agentbook-status"

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "🎉 All checks passed!"
else
  echo "🚨 $ERRORS check(s) FAILED — DO NOT SHIP"
  exit 1
fi
