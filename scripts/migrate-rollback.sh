#!/usr/bin/env bash
# migrate-rollback.sh — Roll back a specific migration using its DOWN script
# Usage: ./scripts/migrate-rollback.sh <migration_number> [--dry-run]
#
# Examples:
#   ./scripts/migrate-rollback.sh 0026          # Roll back migration 0026
#   ./scripts/migrate-rollback.sh 0026 --dry-run # Preview the SQL without executing

set -euo pipefail

MIGRATIONS_DIR="$(cd "$(dirname "$0")/../migrations" && pwd)"
ROLLBACK_DIR="${MIGRATIONS_DIR}/rollback"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <migration_number> [--dry-run]"
  echo "  e.g. $0 0026"
  echo ""
  echo "Available rollback scripts:"
  ls "${ROLLBACK_DIR}"/*.sql 2>/dev/null | while read -r f; do
    basename "$f"
  done
  exit 1
fi

MIGRATION_NUM="$1"
DRY_RUN="${2:-}"

# Find the rollback script
ROLLBACK_FILE=$(find "${ROLLBACK_DIR}" -name "${MIGRATION_NUM}_*_down.sql" -type f | head -1)

if [[ -z "$ROLLBACK_FILE" ]]; then
  echo "ERROR: No rollback script found for migration ${MIGRATION_NUM}"
  echo "Expected: ${ROLLBACK_DIR}/${MIGRATION_NUM}_*_down.sql"
  exit 1
fi

echo "=== Rollback: $(basename "$ROLLBACK_FILE") ==="
echo ""

if [[ "$DRY_RUN" == "--dry-run" ]]; then
  echo "[DRY RUN] Would execute:"
  echo "---"
  cat "$ROLLBACK_FILE"
  echo "---"
  echo ""
  echo "To execute for real, run without --dry-run"
  exit 0
fi

echo "SQL to execute:"
cat "$ROLLBACK_FILE"
echo ""
echo ""

# Execute via wrangler d1
echo "Executing via wrangler d1..."
npx wrangler d1 execute canfly-community --file="$ROLLBACK_FILE"

echo ""
echo "✓ Rollback ${MIGRATION_NUM} complete"
