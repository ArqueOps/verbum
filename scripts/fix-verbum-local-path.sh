#!/usr/bin/env bash
# fix-verbum-local-path.sh
# Executes the local_path fix for the Verbum project via Supabase REST API.
# Targets the ArqueOps Platform Supabase (where the projects table lives).
#
# Usage:
#   ARQUEOPS_SUPABASE_URL=https://<ref>.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=<key> \
#   ./scripts/fix-verbum-local-path.sh
#
# Or run the SQL directly against the ArqueOps Platform DB:
#   psql $ARQUEOPS_DB_URL -f scripts/fix-verbum-local-path.sql

set -euo pipefail

SUPABASE_URL="${ARQUEOPS_SUPABASE_URL:?Set ARQUEOPS_SUPABASE_URL to the ArqueOps Platform Supabase URL}"
SERVICE_KEY="${ARQUEOPS_SERVICE_ROLE_KEY:?Set ARQUEOPS_SERVICE_ROLE_KEY to the ArqueOps Platform service_role key}"
CORRECT_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"

echo "=== Verbum local_path fix ==="
echo "Target: ArqueOps Platform Supabase"
echo "Correct path: ${CORRECT_PATH}"

# Step 1: Read current value
echo ""
echo "Step 1: Reading current Verbum project record..."
CURRENT=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "Current record: ${CURRENT}"

# Step 2: Update local_path
echo ""
echo "Step 2: Updating local_path..."
RESULT=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"local_path\": \"${CORRECT_PATH}\"}")

HTTP_CODE=$(echo "${RESULT}" | tail -1)
BODY=$(echo "${RESULT}" | sed '$d')

if [ "${HTTP_CODE}" = "200" ]; then
  echo "Success (HTTP ${HTTP_CODE}): ${BODY}"
else
  echo "Failed (HTTP ${HTTP_CODE}): ${BODY}"
  exit 1
fi

# Step 3: Verify
echo ""
echo "Step 3: Verifying update..."
VERIFY=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=slug,local_path" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "Verified: ${VERIFY}"
echo ""
echo "=== Done ==="
