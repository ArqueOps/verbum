#!/usr/bin/env bash
# Fix: Update Verbum project record in ArqueOps Platform's projects table
#
# USAGE: Run from ArqueOps Platform context with ARQUEOPS_SUPABASE_URL and
#        ARQUEOPS_SERVICE_ROLE_KEY environment variables set.
#
# Example:
#   ARQUEOPS_SUPABASE_URL=https://<ref>.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=<key> \
#   bash scripts/fix-project-record.sh

set -euo pipefail

: "${ARQUEOPS_SUPABASE_URL:?Set ARQUEOPS_SUPABASE_URL to the ArqueOps Platform Supabase URL}"
: "${ARQUEOPS_SERVICE_ROLE_KEY:?Set ARQUEOPS_SERVICE_ROLE_KEY to the ArqueOps Platform service role key}"

echo "==> Querying current Verbum project record..."
CURRENT=$(curl -s "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url,default_branch,protected_branches" \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}")

echo "Current record: ${CURRENT}"

echo ""
echo "==> Updating Verbum project record..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "local_path": "/Users/brenoandrade/Documents/ClaudeProjects/verbum",
    "repo_url": "https://github.com/ArqueOps/verbum",
    "default_branch": "main",
    "protected_branches": ["main"]
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "SUCCESS (HTTP ${HTTP_CODE}): ${BODY}"
else
  echo "FAILED (HTTP ${HTTP_CODE}): ${BODY}"
  exit 1
fi
