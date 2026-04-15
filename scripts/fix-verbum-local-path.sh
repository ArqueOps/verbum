#!/usr/bin/env bash
# Fix: Update Verbum project local_path via ArqueOps Platform Supabase REST API
# Usage: SUPABASE_URL=<platform_url> SUPABASE_SERVICE_ROLE_KEY=<key> ./fix-verbum-local-path.sh
#
# IMPORTANT: Use ArqueOps Platform credentials, NOT Verbum's Supabase credentials
# The `projects` table lives in the platform DB

set -euo pipefail

: "${SUPABASE_URL:?Set SUPABASE_URL to the ArqueOps Platform Supabase URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY to the platform service role key}"

CORRECT_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
CORRECT_REPO="git@github.com:ArqueOps/verbum.git"

echo "=== Verbum local_path fix ==="
echo "Target path: ${CORRECT_PATH}"

# 1. Verify local repo exists
if [ ! -d "${CORRECT_PATH}/.git" ]; then
  echo "ERROR: No git repo at ${CORRECT_PATH}"
  exit 1
fi
echo "OK: Git repo exists at ${CORRECT_PATH}"

# 2. Read current value
echo "Reading current projects record..."
CURRENT=$(curl -s "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

echo "Current: ${CURRENT}"

# 3. Update
echo "Updating local_path and repo_url..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PATCH "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"local_path\": \"${CORRECT_PATH}\", \"repo_url\": \"${CORRECT_REPO}\"}")

HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
BODY=$(echo "${RESPONSE}" | sed '$d')

if [ "${HTTP_CODE}" -ge 200 ] && [ "${HTTP_CODE}" -lt 300 ]; then
  echo "OK: Updated successfully (HTTP ${HTTP_CODE})"
  echo "Response: ${BODY}"
else
  echo "ERROR: Update failed (HTTP ${HTTP_CODE})"
  echo "Response: ${BODY}"
  exit 1
fi

# 4. Verify
echo "Verifying..."
VERIFY=$(curl -s "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=local_path,repo_url" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

echo "Verified: ${VERIFY}"
echo "=== Done ==="
