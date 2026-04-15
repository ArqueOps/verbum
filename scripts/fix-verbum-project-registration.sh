#!/usr/bin/env bash
# Fix: Update Verbum project registration in ArqueOps Platform DB
#
# IMPORTANT: This script must be run with access to the ArqueOps Platform
# Supabase credentials (not Verbum's own Supabase).
#
# Usage:
#   ARQUEOPS_SUPABASE_URL=https://xxx.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=eyJ... \
#   bash scripts/fix-verbum-project-registration.sh
#
# Or run from the ArqueOps Platform context where these env vars exist.

set -euo pipefail

# ArqueOps Platform Supabase (NOT Verbum's)
SUPABASE_URL="${ARQUEOPS_SUPABASE_URL:?Error: Set ARQUEOPS_SUPABASE_URL to the ArqueOps Platform Supabase URL}"
SERVICE_KEY="${ARQUEOPS_SERVICE_ROLE_KEY:?Error: Set ARQUEOPS_SERVICE_ROLE_KEY to the ArqueOps Platform service role key}"

CORRECT_LOCAL_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
CORRECT_REPO_URL="git@github.com:ArqueOps/verbum.git"

echo "=== Fixing Verbum project registration ==="
echo "Target DB: ${SUPABASE_URL}"
echo "local_path -> ${CORRECT_LOCAL_PATH}"
echo "repo_url   -> ${CORRECT_REPO_URL}"
echo ""

# Step 1: Read current state
echo "--- Current Verbum project record ---"
CURRENT=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url,default_branch" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")
echo "${CURRENT}" | python3 -m json.tool 2>/dev/null || echo "${CURRENT}"
echo ""

# Step 2: Update local_path and repo_url
echo "--- Updating project record ---"
RESULT=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"local_path\": \"${CORRECT_LOCAL_PATH}\",
    \"repo_url\": \"${CORRECT_REPO_URL}\"
  }")

HTTP_CODE=$(echo "${RESULT}" | tail -1)
BODY=$(echo "${RESULT}" | head -n -1)

if [[ "${HTTP_CODE}" =~ ^2 ]]; then
  echo "SUCCESS (HTTP ${HTTP_CODE})"
  echo "${BODY}" | python3 -m json.tool 2>/dev/null || echo "${BODY}"
else
  echo "FAILED (HTTP ${HTTP_CODE})"
  echo "${BODY}"
  exit 1
fi

# Step 3: Verify local repo exists
echo ""
echo "--- Verifying local repo ---"
if [ -d "${CORRECT_LOCAL_PATH}/.git" ] || [ -f "${CORRECT_LOCAL_PATH}/.git" ]; then
  echo "OK: Git repo exists at ${CORRECT_LOCAL_PATH}"
else
  echo "WARNING: No git repo at ${CORRECT_LOCAL_PATH}"
  echo "Clone it with: git clone git@github.com:ArqueOps/verbum.git ${CORRECT_LOCAL_PATH}"
fi

# Step 4: Verify git remote access
echo ""
echo "--- Verifying GitHub access ---"
if command -v git &>/dev/null; then
  if git ls-remote --exit-code "${CORRECT_REPO_URL}" HEAD &>/dev/null; then
    echo "OK: GitHub repo accessible via SSH"
  else
    echo "WARNING: Cannot access ${CORRECT_REPO_URL} via SSH"
    echo "Check SSH keys and GitHub permissions"
  fi
else
  echo "SKIP: git not available"
fi

echo ""
echo "=== Done ==="
