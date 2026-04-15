#!/usr/bin/env bash
# Fix: Update Verbum project local_path via ArqueOps Platform Supabase REST API
#
# USAGE (from ArqueOps Platform context):
#   ARQUEOPS_SUPABASE_URL=https://xxx.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=ey... \
#   bash scripts/fix-project-local-path.sh
#
# This script updates the projects.local_path for Verbum from the incorrect
# worktree path to the correct base repo path.

set -euo pipefail

SUPABASE_URL="${ARQUEOPS_SUPABASE_URL:?Set ARQUEOPS_SUPABASE_URL (ArqueOps Platform, not Verbum)}"
SERVICE_KEY="${ARQUEOPS_SERVICE_ROLE_KEY:?Set ARQUEOPS_SERVICE_ROLE_KEY}"
CORRECT_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"

echo "Updating Verbum project local_path to: ${CORRECT_PATH}"

# Update via REST API — match by slug or name
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PATCH \
  "${SUPABASE_URL}/rest/v1/projects?or=(slug.eq.verbum,name.ilike.*verbum*)" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"local_path\": \"${CORRECT_PATH}\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "Success (HTTP ${HTTP_CODE})"
  echo "Response: ${BODY}"
else
  echo "Failed (HTTP ${HTTP_CODE})"
  echo "Response: ${BODY}"
  exit 1
fi
