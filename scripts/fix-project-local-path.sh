#!/usr/bin/env bash
# fix-project-local-path.sh
# Fixes Verbum's local_path in the ArqueOps Platform projects table.
#
# MUST be executed with ArqueOps Platform Supabase credentials (not Verbum's).
# Usage: SUPABASE_URL=<platform-url> SUPABASE_SERVICE_ROLE_KEY=<key> ./scripts/fix-project-local-path.sh

set -euo pipefail

# ArqueOps Platform Supabase (NOT Verbum's ukfwizdbtudkmgfaljtp)
PLATFORM_URL="${SUPABASE_URL:?Set SUPABASE_URL to ArqueOps Platform Supabase URL}"
PLATFORM_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY to ArqueOps Platform service role key}"

CORRECT_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"

echo "==> Checking current Verbum record in projects table..."
CURRENT=$(curl -s \
  "${PLATFORM_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url,default_branch" \
  -H "apikey: ${PLATFORM_KEY}" \
  -H "Authorization: Bearer ${PLATFORM_KEY}")

echo "Current record: ${CURRENT}"

echo ""
echo "==> Updating local_path to ${CORRECT_PATH}..."
RESULT=$(curl -s -w "\n%{http_code}" \
  "${PLATFORM_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${PLATFORM_KEY}" \
  -H "Authorization: Bearer ${PLATFORM_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"local_path\": \"${CORRECT_PATH}\",
    \"repo_url\": \"git@github.com:ArqueOps/verbum.git\",
    \"default_branch\": \"main\"
  }")

HTTP_CODE=$(echo "${RESULT}" | tail -1)
BODY=$(echo "${RESULT}" | head -n -1)

if [ "${HTTP_CODE}" -ge 200 ] && [ "${HTTP_CODE}" -lt 300 ]; then
  echo "SUCCESS (HTTP ${HTTP_CODE}): ${BODY}"
else
  echo "FAILED (HTTP ${HTTP_CODE}): ${BODY}"
  exit 1
fi

echo ""
echo "==> Verifying update..."
VERIFY=$(curl -s \
  "${PLATFORM_URL}/rest/v1/projects?slug=eq.verbum&select=slug,local_path,default_branch" \
  -H "apikey: ${PLATFORM_KEY}" \
  -H "Authorization: Bearer ${PLATFORM_KEY}")

echo "Verified: ${VERIFY}"
echo "==> Done."
