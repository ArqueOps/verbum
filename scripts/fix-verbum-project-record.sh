#!/usr/bin/env bash
# Fix Verbum project record in ArqueOps Platform's Supabase
#
# IMPORTANT: This script must be run with ArqueOps Platform credentials,
# NOT Verbum's own Supabase credentials.
#
# Required env vars (from ArqueOps Platform):
#   ARQUEOPS_SUPABASE_URL        - e.g., https://xxx.supabase.co
#   ARQUEOPS_SUPABASE_SERVICE_KEY - service_role_key for ArqueOps Platform
#
# Usage:
#   export ARQUEOPS_SUPABASE_URL="https://xxx.supabase.co"
#   export ARQUEOPS_SUPABASE_SERVICE_KEY="eyJ..."
#   bash scripts/fix-verbum-project-record.sh

set -euo pipefail

if [[ -z "${ARQUEOPS_SUPABASE_URL:-}" || -z "${ARQUEOPS_SUPABASE_SERVICE_KEY:-}" ]]; then
  echo "ERROR: ARQUEOPS_SUPABASE_URL and ARQUEOPS_SUPABASE_SERVICE_KEY must be set"
  echo "These are the ArqueOps Platform credentials, not Verbum's."
  exit 1
fi

echo "Updating Verbum project record in ArqueOps Platform..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${ARQUEOPS_SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "local_path": "/Users/brenoandrade/Documents/ClaudeProjects/verbum",
    "repo_url": "git@github.com:ArqueOps/verbum.git",
    "default_branch": "main"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "SUCCESS: Verbum project record updated"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "FAILED: HTTP $HTTP_CODE"
  echo "$BODY"
  exit 1
fi
