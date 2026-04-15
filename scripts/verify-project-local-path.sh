#!/usr/bin/env bash
# verify-project-local-path.sh
# Idempotent verification and fix for the Verbum project's local_path
# in the ArqueOps Platform Supabase (projects table).
#
# Usage: SUPABASE_SERVICE_ROLE_KEY=... ./scripts/verify-project-local-path.sh
#
# The correct local_path is the BASE REPO path (not a worktree path):
#   /Users/brenoandrade/Documents/ClaudeProjects/verbum

set -euo pipefail

PLATFORM_URL="${SUPABASE_URL:-https://mxotfulkbqeidzulrbnj.supabase.co}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
CORRECT_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"

echo "=== Verbum Project Local Path Verification ==="
echo "Platform: $PLATFORM_URL"
echo "Expected local_path: $CORRECT_PATH"
echo ""

# Step 1: Query current state
current=$(curl -s "${PLATFORM_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,status" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

current_path=$(echo "$current" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())[0].get('local_path','NULL'))" 2>/dev/null || echo "QUERY_FAILED")

echo "Current local_path: $current_path"

if [ "$current_path" = "$CORRECT_PATH" ]; then
  echo "OK: local_path is already correct. No update needed."
  exit 0
fi

echo "MISMATCH: updating local_path..."

# Step 2: Update to correct path
result=$(curl -s -X PATCH "${PLATFORM_URL}/rest/v1/projects?slug=eq.verbum" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"local_path\": \"${CORRECT_PATH}\"}")

updated_path=$(echo "$result" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())[0].get('local_path','FAILED'))" 2>/dev/null || echo "UPDATE_FAILED")

if [ "$updated_path" = "$CORRECT_PATH" ]; then
  echo "SUCCESS: local_path updated to $CORRECT_PATH"
else
  echo "ERROR: Update may have failed. Response: $result"
  exit 1
fi
