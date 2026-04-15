#!/usr/bin/env bash
# Fix: Update Verbum project local_path in ArqueOps Platform's projects table
#
# IMPORTANT: This script calls the ArqueOps Platform's Supabase REST API.
# You must set ARQUEOPS_SUPABASE_URL and ARQUEOPS_SERVICE_ROLE_KEY to the
# ArqueOps Platform credentials (NOT Verbum's own Supabase).
#
# Usage:
#   ARQUEOPS_SUPABASE_URL=https://<ref>.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=<key> \
#   bash scripts/fix-verbum-local-path.sh

set -euo pipefail

: "${ARQUEOPS_SUPABASE_URL:?Set ARQUEOPS_SUPABASE_URL to the ArqueOps Platform Supabase URL}"
: "${ARQUEOPS_SERVICE_ROLE_KEY:?Set ARQUEOPS_SERVICE_ROLE_KEY to the ArqueOps Platform service role key}"

CORRECT_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
CORRECT_REPO="git@github.com:ArqueOps/verbum.git"

echo "Updating Verbum project local_path to: ${CORRECT_PATH}"
echo "Updating Verbum project repo_url to: ${CORRECT_REPO}"

response=$(curl -s -w "\n%{http_code}" \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"local_path\": \"${CORRECT_PATH}\", \"repo_url\": \"${CORRECT_REPO}\", \"updated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}")

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
  echo "SUCCESS (HTTP ${http_code}): Verbum project record updated."
  echo "$body" | head -5
else
  echo "FAILED (HTTP ${http_code}): Could not update project record."
  echo "$body"
  exit 1
fi
