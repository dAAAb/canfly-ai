#!/usr/bin/env bash
#
# deliver-to-r2.sh — Upload a local file to R2 via the complete API
#
# Usage:
#   ./scripts/deliver-to-r2.sh <file> <agent-name> <task-id> [options]
#
# Options:
#   --api-url <url>       API base URL (default: https://canfly.ai)
#   --api-key <key>       Agent API key (or set CANFLY_AGENT_API_KEY env var)
#   --content-type <mime> Override MIME type (auto-detected by default)
#   --preview <url>       Preview image URL (resultPreview)
#   --note <text>         Seller note (resultNote)
#   --dry-run             Print the request without sending
#
# Examples:
#   ./scripts/deliver-to-r2.sh output.mp4 littlelobster abc-123
#   ./scripts/deliver-to-r2.sh cover.png littlelobster abc-123 --preview https://example.com/thumb.jpg
#
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────
API_URL="${CANFLY_API_URL:-https://canfly.ai}"
API_KEY="${CANFLY_AGENT_API_KEY:-}"
CONTENT_TYPE=""
PREVIEW=""
NOTE=""
DRY_RUN=false

# ── Parse positional args ─────────────────────────────────
if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <file> <agent-name> <task-id> [options]"
  exit 1
fi

FILE="$1"; shift
AGENT_NAME="$1"; shift
TASK_ID="$1"; shift

# ── Parse options ─────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-url)    API_URL="$2"; shift 2 ;;
    --api-key)    API_KEY="$2"; shift 2 ;;
    --content-type) CONTENT_TYPE="$2"; shift 2 ;;
    --preview)    PREVIEW="$2"; shift 2 ;;
    --note)       NOTE="$2"; shift 2 ;;
    --dry-run)    DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Validate ──────────────────────────────────────────────
if [[ ! -f "$FILE" ]]; then
  echo "Error: file not found: $FILE"
  exit 1
fi

if [[ -z "$API_KEY" ]]; then
  echo "Error: set CANFLY_AGENT_API_KEY or pass --api-key"
  exit 1
fi

# ── Auto-detect MIME type ─────────────────────────────────
if [[ -z "$CONTENT_TYPE" ]]; then
  CONTENT_TYPE=$(file --brief --mime-type "$FILE" 2>/dev/null || echo "application/octet-stream")
fi

FILENAME=$(basename "$FILE")
FILE_SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null)

echo "Delivering: $FILENAME ($CONTENT_TYPE, ${FILE_SIZE} bytes)"
echo "  Agent:    $AGENT_NAME"
echo "  Task:     $TASK_ID"
echo "  Endpoint: $API_URL/api/agents/$AGENT_NAME/tasks/$TASK_ID/complete"

# ── Base64 encode ─────────────────────────────────────────
B64=$(base64 < "$FILE" | tr -d '\n')

# ── Build JSON payload ────────────────────────────────────
JSON=$(cat <<ENDJSON
{
  "result_file": "$B64",
  "result_filename": "$FILENAME",
  "result_content_type": "$CONTENT_TYPE"
ENDJSON
)

# Append optional fields
if [[ -n "$PREVIEW" ]]; then
  JSON="$JSON, \"resultPreview\": \"$PREVIEW\""
fi
if [[ -n "$NOTE" ]]; then
  # Escape double quotes in note
  ESCAPED_NOTE=$(echo "$NOTE" | sed 's/"/\\"/g')
  JSON="$JSON, \"resultNote\": \"$ESCAPED_NOTE\""
fi
JSON="$JSON}"

if $DRY_RUN; then
  echo ""
  echo "[DRY RUN] Would POST to: $API_URL/api/agents/$AGENT_NAME/tasks/$TASK_ID/complete"
  echo "[DRY RUN] Payload size: $(echo -n "$JSON" | wc -c | tr -d ' ') bytes"
  exit 0
fi

# ── Send request ──────────────────────────────────────────
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_URL/api/agents/$AGENT_NAME/tasks/$TASK_ID/complete" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$JSON")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 300 ]]; then
  echo ""
  echo "Delivered! (HTTP $HTTP_CODE)"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo ""
  echo "Error: HTTP $HTTP_CODE"
  echo "$BODY"
  exit 1
fi
