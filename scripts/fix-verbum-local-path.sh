#!/usr/bin/env bash
# Fix: Update Verbum project local_path in ArqueOps Platform DB
#
# IMPORTANT: This script must be executed with ArqueOps Platform credentials,
# NOT Verbum's own Supabase credentials.
#
# Required env vars (from ArqueOps Platform):
#   ARQUEOPS_SUPABASE_URL      - ArqueOps Platform Supabase URL
#   ARQUEOPS_SERVICE_ROLE_KEY   - ArqueOps Platform service role key
#
# Usage:
#   ARQUEOPS_SUPABASE_URL=https://xxx.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=eyJ... \
#   ./scripts/fix-verbum-local-path.sh

set -euo pipefail

: "${ARQUEOPS_SUPABASE_URL:?Missing ARQUEOPS_SUPABASE_URL}"
: "${ARQUEOPS_SERVICE_ROLE_KEY:?Missing ARQUEOPS_SERVICE_ROLE_KEY}"

CORRECT_LOCAL_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
CORRECT_REPO_URL="git@github.com:ArqueOps/verbum.git"

echo "Updating Verbum project record in ArqueOps Platform DB..."
echo "  local_path -> ${CORRECT_LOCAL_PATH}"
echo "  repo_url   -> ${CORRECT_REPO_URL}"

response=$(curl -s -w "\n%{http_code}" \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"local_path\": \"${CORRECT_LOCAL_PATH}\",
    \"repo_url\": \"${CORRECT_REPO_URL}\"
  }")

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

if [[ "$http_code" == "200" ]]; then
  echo "SUCCESS: Verbum project record updated."
  echo "$body" | head -5
else
  echo "FAILED: HTTP ${http_code}"
  echo "$body"
  exit 1
fi
