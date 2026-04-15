#!/usr/bin/env bash
# Fix Verbum project local_path in ArqueOps Platform projects table via REST API
#
# MUST be executed from the ArqueOps Platform context with Platform Supabase credentials.
# Required env vars:
#   ARQUEOPS_SUPABASE_URL     — ArqueOps Platform Supabase URL (NOT Verbum's)
#   ARQUEOPS_SERVICE_ROLE_KEY — ArqueOps Platform service_role_key
#
# Usage:
#   ARQUEOPS_SUPABASE_URL=https://xxx.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=eyJ... \
#   bash scripts/fix-verbum-project-local-path.sh

set -euo pipefail

CORRECT_LOCAL_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
CORRECT_REPO_URL="git@github.com:ArqueOps/verbum.git"
CORRECT_GITHUB_URL="https://github.com/ArqueOps/verbum"

if [[ -z "${ARQUEOPS_SUPABASE_URL:-}" || -z "${ARQUEOPS_SERVICE_ROLE_KEY:-}" ]]; then
  echo "ERROR: ARQUEOPS_SUPABASE_URL and ARQUEOPS_SERVICE_ROLE_KEY must be set."
  echo "These are the ArqueOps PLATFORM credentials, not Verbum's."
  exit 1
fi

echo "=== Step 1: Read current Verbum project record ==="
CURRENT=$(curl -s \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url,github_url")

echo "Current record: ${CURRENT}"

if echo "${CURRENT}" | grep -q '"local_path":"'"${CORRECT_LOCAL_PATH}"'"'; then
  echo "local_path is already correct. No update needed."
  exit 0
fi

echo ""
echo "=== Step 2: Update local_path, repo_url, github_url ==="
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PATCH \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"local_path\": \"${CORRECT_LOCAL_PATH}\",
    \"repo_url\": \"${CORRECT_REPO_URL}\",
    \"github_url\": \"${CORRECT_GITHUB_URL}\"
  }" \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum")

HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
BODY=$(echo "${RESPONSE}" | sed '$d')

if [[ "${HTTP_CODE}" =~ ^2 ]]; then
  echo "SUCCESS (HTTP ${HTTP_CODE}): ${BODY}"
else
  echo "FAILED (HTTP ${HTTP_CODE}): ${BODY}"
  exit 1
fi

echo ""
echo "=== Step 3: Verify update ==="
VERIFY=$(curl -s \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url,github_url")

echo "Updated record: ${VERIFY}"

if echo "${VERIFY}" | grep -q '"local_path":"'"${CORRECT_LOCAL_PATH}"'"'; then
  echo "VERIFIED: local_path is now correct."
else
  echo "ERROR: Verification failed — local_path was not updated."
  exit 1
fi
