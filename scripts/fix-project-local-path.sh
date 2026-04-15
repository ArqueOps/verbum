#!/usr/bin/env bash
# Fix Verbum project local_path in ArqueOps Platform DB
# Usage: ARQUEOPS_SUPABASE_URL=... ARQUEOPS_SERVICE_ROLE_KEY=... ./scripts/fix-project-local-path.sh
#
# This script updates the projects table in the ArqueOps Platform Supabase
# to set the correct local_path for the Verbum project.
#
# IMPORTANT: This must be run with ArqueOps Platform credentials, NOT Verbum's.

set -euo pipefail

SUPABASE_URL="${ARQUEOPS_SUPABASE_URL:?Error: Set ARQUEOPS_SUPABASE_URL to the ArqueOps Platform Supabase URL}"
SERVICE_KEY="${ARQUEOPS_SERVICE_ROLE_KEY:?Error: Set ARQUEOPS_SERVICE_ROLE_KEY to the ArqueOps Platform service role key}"
CORRECT_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"

echo "Querying current Verbum project record..."
CURRENT=$(curl -s "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "Current record: ${CURRENT}"

echo "Updating local_path to: ${CORRECT_PATH}"
RESULT=$(curl -s -X PATCH "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"local_path\": \"${CORRECT_PATH}\", \"updated_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}")

echo "Updated record: ${RESULT}"
echo "Done. Verbum project local_path has been fixed."
