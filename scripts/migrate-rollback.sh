#!/usr/bin/env bash
# Usage: ./scripts/migrate-rollback.sh <migration-number> [--remote]
#
# Rolls back a single migration by running the corresponding DOWN script.
# By default runs against the local D1 database.
# Pass --remote to run against the remote (production) database.
#
# Examples:
#   ./scripts/migrate-rollback.sh 0014
#   ./scripts/migrate-rollback.sh 0014 --remote

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ROLLBACK_DIR="$PROJECT_DIR/migrations/rollback"
DB_NAME="canfly-community"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <migration-number> [--remote]"
  echo "  migration-number: e.g. 0014, 0001"
  echo "  --remote: run against remote D1 (production)"
  exit 1
fi

MIGRATION_NUM="$1"
REMOTE_FLAG=""

if [ "${2:-}" = "--remote" ]; then
  REMOTE_FLAG="--remote"
  echo "⚠️  WARNING: Running against REMOTE (production) database!"
  echo "Press Ctrl+C within 5 seconds to abort..."
  sleep 5
fi

# Find the rollback file
ROLLBACK_FILE=$(find "$ROLLBACK_DIR" -name "${MIGRATION_NUM}_*_down.sql" 2>/dev/null | head -1)

if [ -z "$ROLLBACK_FILE" ]; then
  echo "Error: No rollback file found for migration $MIGRATION_NUM"
  echo "Expected: $ROLLBACK_DIR/${MIGRATION_NUM}_*_down.sql"
  exit 1
fi

echo "Rolling back migration $MIGRATION_NUM..."
echo "File: $ROLLBACK_FILE"
echo ""

# Execute the rollback
cd "$PROJECT_DIR"
npx wrangler d1 execute "$DB_NAME" --file="$ROLLBACK_FILE" $REMOTE_FLAG

echo ""
echo "✅ Rollback $MIGRATION_NUM complete."
