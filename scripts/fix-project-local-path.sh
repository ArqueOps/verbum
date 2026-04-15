#!/usr/bin/env bash
# Fix: Update Verbum project local_path in ArqueOps Platform projects table
#
# USAGE:
#   ARQUEOPS_SUPABASE_URL=https://xxx.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=eyJ... \
#   ./scripts/fix-project-local-path.sh
#
# NOTE: This targets the ArqueOps Platform Supabase, NOT Verbum's Supabase.
# The projects table lives in the platform database.

set -euo pipefail

# Require ArqueOps Platform credentials (NOT Verbum's)
if [[ -z "${ARQUEOPS_SUPABASE_URL:-}" ]] || [[ -z "${ARQUEOPS_SERVICE_ROLE_KEY:-}" ]]; then
  echo "ERROR: This script requires ArqueOps Platform Supabase credentials."
  echo ""
  echo "Set these environment variables:"
  echo "  ARQUEOPS_SUPABASE_URL       — ArqueOps Platform Supabase URL"
  echo "  ARQUEOPS_SERVICE_ROLE_KEY   — ArqueOps Platform service role key"
  echo ""
  echo "These are NOT the Verbum project credentials."
  exit 1
fi

SQL=$(cat scripts/fix-project-local-path.sql)

echo "Updating projects.local_path for Verbum..."
echo "Target: ArqueOps Platform Supabase"
echo "New path: /Users/brenoandrade/Documents/ClaudeProjects/verbum"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL" | jq -Rs .)}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" -ge 200 ]] && [[ "$HTTP_CODE" -lt 300 ]]; then
  echo "SUCCESS: local_path updated."
  echo "Response: $BODY"
else
  echo "FAILED (HTTP $HTTP_CODE): $BODY"
  echo ""
  echo "If exec_sql is not available, run the SQL directly:"
  echo "  psql \$ARQUEOPS_DB_URL -f scripts/fix-project-local-path.sql"
  exit 1
fi
