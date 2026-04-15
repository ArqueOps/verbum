#!/usr/bin/env bash
# Fix: Update Verbum project local_path in ArqueOps Platform DB
#
# IMPORTANT: This script must be run with ArqueOps Platform credentials,
# NOT Verbum's Supabase credentials. The projects table is in the platform DB.
#
# Usage:
#   ARQUEOPS_SUPABASE_URL=https://xxx.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=xxx \
#   bash scripts/fix-project-local-path.sh

set -euo pipefail

SUPABASE_URL="${ARQUEOPS_SUPABASE_URL:?Error: Set ARQUEOPS_SUPABASE_URL (ArqueOps Platform Supabase URL)}"
SERVICE_KEY="${ARQUEOPS_SERVICE_ROLE_KEY:?Error: Set ARQUEOPS_SERVICE_ROLE_KEY (ArqueOps Platform service role key)}"

CORRECT_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
REPO_URL="git@github.com:ArqueOps/verbum.git"

echo "Updating projects.local_path for Verbum..."
echo "  Target path: ${CORRECT_PATH}"
echo "  Repo URL: ${REPO_URL}"

response=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"local_path\": \"${CORRECT_PATH}\", \"repo_url\": \"${REPO_URL}\"}")

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [[ "$http_code" == "200" ]]; then
  echo "Success! Updated projects record:"
  echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
else
  echo "Error (HTTP ${http_code}):"
  echo "$body"
  exit 1
fi
