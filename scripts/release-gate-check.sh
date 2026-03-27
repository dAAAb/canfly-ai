#!/usr/bin/env bash
# Release Gate Check — automated pre-release validation for CanFly v3
# Exit 0 = all pass, Exit 1 = failures listed
#
# Checks:
#   1. Vite build succeeds
#   2. i18n key sync (en/zh-TW/zh-CN match)
#   3. All v3 feature flags default to OFF in seed data
#   4. All migrations have corresponding rollback scripts
#   5. No hardcoded v3 feature references outside flag guards

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FAILURES=0

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILURES=$((FAILURES + 1)); }

echo "═══════════════════════════════════════"
echo "  CanFly Release Gate Check"
echo "═══════════════════════════════════════"
echo ""

# ── Check 1: Vite build ──────────────────────────────────────────────
echo "▶ Check 1: Vite build"
cd "$PROJECT_DIR"
if npx vite build --logLevel error > /dev/null 2>&1; then
  pass "Build succeeded"
else
  fail "Build failed — run 'npx vite build' for details"
fi
echo ""

# ── Check 2: i18n key sync ───────────────────────────────────────────
echo "▶ Check 2: i18n key sync"
if node "$SCRIPT_DIR/check-i18n.js" > /dev/null 2>&1; then
  pass "i18n keys match across en/zh-TW/zh-CN"
else
  fail "i18n key mismatch — run 'node scripts/check-i18n.js' for details"
fi
echo ""

# ── Check 3: v3 feature flags default OFF ────────────────────────────
echo "▶ Check 3: Feature flags default to OFF"
FLAGS_FILE="$PROJECT_DIR/src/config/featureFlags.ts"
FLAG_SEED="$PROJECT_DIR/migrations/0015_feature_flags.sql"
CHECK3_OK=true

# Check TypeScript defaults
if grep -q 'false' "$FLAGS_FILE" 2>/dev/null; then
  # Verify no flag defaults to true
  if grep -E '^\s*\[V3_FLAGS\.' "$FLAGS_FILE" | grep -q 'true'; then
    fail "featureFlags.ts has flag(s) defaulting to true"
    CHECK3_OK=false
  fi
else
  fail "featureFlags.ts not found or has no default values"
  CHECK3_OK=false
fi

# Check seed data — all enabled values should be 0
if [ -f "$FLAG_SEED" ]; then
  if grep -E "INSERT INTO feature_flags" "$FLAG_SEED" | grep -qE ',\s*1\s*\)'; then
    fail "Seed data in 0015_feature_flags.sql has flag(s) enabled (1)"
    CHECK3_OK=false
  fi
else
  fail "0015_feature_flags.sql not found"
  CHECK3_OK=false
fi

if $CHECK3_OK; then
  pass "All v3 feature flags default to OFF"
fi
echo ""

# ── Check 4: Migration rollback coverage ─────────────────────────────
echo "▶ Check 4: Migration rollback coverage"
MIGRATIONS_DIR="$PROJECT_DIR/migrations"
ROLLBACK_DIR="$MIGRATIONS_DIR/rollback"
MISSING_ROLLBACKS=()

for mig in "$MIGRATIONS_DIR"/0*.sql; do
  basename=$(basename "$mig" .sql)
  num=$(echo "$basename" | grep -oE '^[0-9]+')
  # Look for any rollback file matching this migration number
  if ! ls "$ROLLBACK_DIR"/${num}_*_down.sql > /dev/null 2>&1; then
    MISSING_ROLLBACKS+=("$basename")
  fi
done

if [ ${#MISSING_ROLLBACKS[@]} -eq 0 ]; then
  pass "All migrations have rollback scripts"
else
  for m in "${MISSING_ROLLBACKS[@]}"; do
    fail "Missing rollback for: $m"
  done
fi
echo ""

# ── Check 5: No hardcoded v3 references outside flag guards ─────────
echo "▶ Check 5: No hardcoded v3 feature references outside flag guards"
# Look for direct v3 feature string usage in src/ (excluding featureFlags.ts and test files)
# These patterns suggest code is not using the flag system
HARDCODED=$(grep -rn \
  --include='*.ts' --include='*.tsx' \
  -E "(v3_routing|v3_paperclip_bridge|v3_escrow|v3_marketplace|v3_tg_pm)" \
  "$PROJECT_DIR/src/" 2>/dev/null \
  | grep -v 'featureFlags\.ts' \
  | grep -v '\.test\.' \
  | grep -v 'useFeatureFlag' \
  | grep -v 'V3_FLAGS\.' \
  | grep -v 'import.*featureFlags' \
  || true)

if [ -z "$HARDCODED" ]; then
  pass "No hardcoded v3 feature references found"
else
  fail "Hardcoded v3 feature references (should use useFeatureFlag or V3_FLAGS):"
  echo "$HARDCODED" | while IFS= read -r line; do
    echo "    $line"
  done
fi
echo ""

# ── Summary ──────────────────────────────────────────────────────────
echo "═══════════════════════════════════════"
if [ $FAILURES -eq 0 ]; then
  echo "  ✅ All release gate checks passed!"
  echo "═══════════════════════════════════════"
  exit 0
else
  echo "  ❌ $FAILURES check(s) failed"
  echo "═══════════════════════════════════════"
  exit 1
fi
