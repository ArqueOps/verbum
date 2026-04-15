#!/usr/bin/env bash
# Fix Verbum project local_path in ArqueOps Platform DB
#
# USAGE: Run from the ArqueOps Platform context with its Supabase credentials.
#   ARQUEOPS_SUPABASE_URL=<url> ARQUEOPS_SERVICE_ROLE_KEY=<key> bash scripts/fix-verbum-project-path.sh
#
# This script updates the projects table (which lives in the ArqueOps Platform
# Supabase, NOT in Verbum's Supabase) to set the correct local_path for the
# Verbum project.

set -euo pipefail

SUPABASE_URL="${ARQUEOPS_SUPABASE_URL:?Missing ARQUEOPS_SUPABASE_URL}"
SERVICE_KEY="${ARQUEOPS_SERVICE_ROLE_KEY:?Missing ARQUEOPS_SERVICE_ROLE_KEY}"

CORRECT_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
CORRECT_REPO="git@github.com:ArqueOps/verbum.git"

echo "Updating Verbum project local_path to: ${CORRECT_PATH}"
echo "Updating Verbum project repo_url to: ${CORRECT_REPO}"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"local_path\": \"${CORRECT_PATH}\", \"repo_url\": \"${CORRECT_REPO}\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "Success (HTTP ${HTTP_CODE})"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "ERROR (HTTP ${HTTP_CODE}): ${BODY}"
  exit 1
fi
