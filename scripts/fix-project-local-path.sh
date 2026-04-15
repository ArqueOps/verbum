#!/usr/bin/env bash
# fix-project-local-path.sh
#
# Fixes the Verbum project registration in the ArqueOps Platform database.
# Updates local_path from worktree path to base repo path and sets git_url.
#
# IMPORTANT: This script must be run from a context that has access to the
# ArqueOps Platform's Supabase instance (NOT Verbum's Supabase).
#
# Required env vars:
#   ARQUEOPS_SUPABASE_URL        - ArqueOps Platform Supabase URL
#   ARQUEOPS_SERVICE_ROLE_KEY    - ArqueOps Platform service role key
#
# Usage:
#   ARQUEOPS_SUPABASE_URL=https://xxx.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=eyJ... \
#   ./scripts/fix-project-local-path.sh

set -euo pipefail

# Validate required env vars
if [[ -z "${ARQUEOPS_SUPABASE_URL:-}" ]]; then
  echo "ERROR: ARQUEOPS_SUPABASE_URL is required (ArqueOps Platform's Supabase, NOT Verbum's)"
  echo "  Verbum's Supabase (ukfwizdbtudkmgfaljtp) does NOT have the projects table."
  exit 1
fi

if [[ -z "${ARQUEOPS_SERVICE_ROLE_KEY:-}" ]]; then
  echo "ERROR: ARQUEOPS_SERVICE_ROLE_KEY is required"
  exit 1
fi

CORRECT_LOCAL_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
GIT_URL="git@github.com:ArqueOps/verbum.git"

echo "=== Verbum Project Path Fix ==="
echo "Target DB: ArqueOps Platform Supabase"
echo "New local_path: ${CORRECT_LOCAL_PATH}"
echo "New git_url: ${GIT_URL}"
echo ""

# Step 1: Verify base repo exists locally
if [[ -d "${CORRECT_LOCAL_PATH}/.git" ]]; then
  echo "[OK] Base repo exists at ${CORRECT_LOCAL_PATH}"
else
  echo "[WARN] Base repo not found at ${CORRECT_LOCAL_PATH} — path may be for another machine"
fi

# Step 2: Read current state
echo ""
echo "--- Current project record ---"
CURRENT=$(curl -s \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,name,slug,local_path,git_url,default_branch" \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}")

echo "${CURRENT}" | python3 -m json.tool 2>/dev/null || echo "${CURRENT}"

# Step 3: Apply fix
echo ""
echo "--- Applying fix ---"
RESULT=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"local_path\": \"${CORRECT_LOCAL_PATH}\", \"git_url\": \"${GIT_URL}\"}")

HTTP_STATUS=$(echo "${RESULT}" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "${RESULT}" | grep -v "HTTP_STATUS:")

if [[ "${HTTP_STATUS}" == "200" ]]; then
  echo "[OK] Project updated successfully"
  echo "${BODY}" | python3 -m json.tool 2>/dev/null || echo "${BODY}"
else
  echo "[ERROR] Update failed with HTTP ${HTTP_STATUS}"
  echo "${BODY}"
  exit 1
fi

# Step 4: Verify
echo ""
echo "--- Verification ---"
VERIFY=$(curl -s \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,git_url" \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}")

echo "${VERIFY}" | python3 -m json.tool 2>/dev/null || echo "${VERIFY}"

VERIFIED_PATH=$(echo "${VERIFY}" | python3 -c "import sys,json; print(json.loads(sys.stdin.read())[0]['local_path'])" 2>/dev/null || echo "PARSE_ERROR")

if [[ "${VERIFIED_PATH}" == "${CORRECT_LOCAL_PATH}" ]]; then
  echo ""
  echo "[SUCCESS] local_path correctly set to: ${VERIFIED_PATH}"
else
  echo ""
  echo "[FAIL] local_path is: ${VERIFIED_PATH} (expected: ${CORRECT_LOCAL_PATH})"
  exit 1
fi
