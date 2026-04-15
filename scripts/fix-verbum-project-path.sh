#!/usr/bin/env bash
# Fix Verbum project path in ArqueOps Platform projects table
#
# MUST be executed from the ArqueOps Platform context where ARQUEOPS_SUPABASE_URL
# and ARQUEOPS_SUPABASE_SERVICE_ROLE_KEY are available (NOT Verbum's own Supabase).
#
# Usage:
#   ARQUEOPS_SUPABASE_URL=https://xxx.supabase.co \
#   ARQUEOPS_SUPABASE_SERVICE_ROLE_KEY=xxx \
#   ./scripts/fix-verbum-project-path.sh

set -euo pipefail

SUPABASE_URL="${ARQUEOPS_SUPABASE_URL:?Error: ARQUEOPS_SUPABASE_URL is required (ArqueOps Platform Supabase, NOT Verbum)}"
SERVICE_KEY="${ARQUEOPS_SUPABASE_SERVICE_ROLE_KEY:?Error: ARQUEOPS_SUPABASE_SERVICE_ROLE_KEY is required}"

CORRECT_LOCAL_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"

echo "=== Verbum Project Path Fix ==="
echo "Target: ArqueOps Platform Supabase at ${SUPABASE_URL}"
echo "Correct local_path: ${CORRECT_LOCAL_PATH}"
echo ""

# Step 1: Read current state
echo "[1/3] Reading current Verbum project record..."
CURRENT=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_path,repo_url,github_url" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "Current record: ${CURRENT}"
echo ""

# Step 2: Update
echo "[2/3] Updating local_path and repo_path..."
RESULT=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"local_path\": \"${CORRECT_LOCAL_PATH}\",
    \"repo_path\": \"${CORRECT_LOCAL_PATH}\",
    \"repo_url\": \"git@github.com:ArqueOps/verbum.git\",
    \"github_url\": \"https://github.com/ArqueOps/verbum\"
  }")

HTTP_CODE=$(echo "${RESULT}" | tail -1)
BODY=$(echo "${RESULT}" | head -n -1)

if [ "${HTTP_CODE}" -ge 200 ] && [ "${HTTP_CODE}" -lt 300 ]; then
  echo "SUCCESS (HTTP ${HTTP_CODE})"
  echo "Updated record: ${BODY}"
else
  echo "FAILED (HTTP ${HTTP_CODE})"
  echo "Response: ${BODY}"
  exit 1
fi

echo ""

# Step 3: Verify
echo "[3/3] Verifying update..."
VERIFY=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=slug,local_path,repo_path" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "Verified record: ${VERIFY}"

if echo "${VERIFY}" | grep -q "${CORRECT_LOCAL_PATH}"; then
  echo ""
  echo "=== FIX APPLIED SUCCESSFULLY ==="
  echo "Verbum local_path is now: ${CORRECT_LOCAL_PATH}"
  echo "Worktrees will be created at: ${CORRECT_LOCAL_PATH}/.worktrees/"
else
  echo ""
  echo "=== VERIFICATION FAILED ==="
  echo "local_path does not match expected value"
  exit 1
fi
