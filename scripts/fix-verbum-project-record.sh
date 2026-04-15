#!/usr/bin/env bash
# Fix Verbum project record via Supabase REST API
#
# IMPORTANT: Must be executed from ArqueOps Platform context where
# ARQUEOPS_SUPABASE_URL and ARQUEOPS_SERVICE_ROLE_KEY are available.
#
# Usage:
#   ARQUEOPS_SUPABASE_URL="https://XXXX.supabase.co" \
#   ARQUEOPS_SERVICE_ROLE_KEY="eyJ..." \
#   bash scripts/fix-verbum-project-record.sh
#
# Or with DATABASE_URL (psql):
#   DATABASE_URL="postgresql://..." psql "$DATABASE_URL" -f scripts/fix-verbum-project-record.sql

set -euo pipefail

# Validate required env vars
if [[ -z "${ARQUEOPS_SUPABASE_URL:-}" ]] || [[ -z "${ARQUEOPS_SERVICE_ROLE_KEY:-}" ]]; then
  echo "ERROR: ARQUEOPS_SUPABASE_URL and ARQUEOPS_SERVICE_ROLE_KEY must be set."
  echo "These are the ArqueOps Platform Supabase credentials, NOT the Verbum project's."
  exit 1
fi

API_URL="${ARQUEOPS_SUPABASE_URL}/rest/v1"
AUTH_HEADER="Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}"
API_KEY_HEADER="apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}"

echo "=== Step 1: Read current Verbum project record ==="
CURRENT=$(curl -s "${API_URL}/projects?slug=eq.verbum&select=id,slug,name,local_path,repo,repo_url,default_branch" \
  -H "$AUTH_HEADER" \
  -H "$API_KEY_HEADER" \
  -H "Content-Type: application/json")

echo "Current record: ${CURRENT}"

if [[ "$CURRENT" == "[]" ]]; then
  echo "ERROR: Verbum project not found by slug='verbum'. Trying name search..."
  CURRENT=$(curl -s "${API_URL}/projects?name=ilike.*verbum*&select=id,slug,name,local_path,repo,repo_url,default_branch" \
    -H "$AUTH_HEADER" \
    -H "$API_KEY_HEADER" \
    -H "Content-Type: application/json")
  echo "Name search result: ${CURRENT}"
  if [[ "$CURRENT" == "[]" ]]; then
    echo "ERROR: Verbum project not found in projects table."
    exit 1
  fi
fi

echo ""
echo "=== Step 2: Update Verbum project record ==="
RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/projects?slug=eq.verbum" \
  -X PATCH \
  -H "$AUTH_HEADER" \
  -H "$API_KEY_HEADER" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "local_path": "/Users/brenoandrade/Documents/ClaudeProjects/verbum",
    "repo": "ArqueOps/verbum",
    "repo_url": "git@github.com:ArqueOps/verbum.git",
    "github_url": "https://github.com/ArqueOps/verbum",
    "default_branch": "main"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [[ "$HTTP_CODE" -ge 200 ]] && [[ "$HTTP_CODE" -lt 300 ]]; then
  echo "SUCCESS (HTTP ${HTTP_CODE}): Verbum project updated."
  echo "Updated record: ${BODY}"
else
  echo "FAILED (HTTP ${HTTP_CODE}): ${BODY}"
  exit 1
fi

echo ""
echo "=== Step 3: Verify update ==="
VERIFY=$(curl -s "${API_URL}/projects?slug=eq.verbum&select=id,slug,local_path,repo,repo_url,default_branch" \
  -H "$AUTH_HEADER" \
  -H "$API_KEY_HEADER" \
  -H "Content-Type: application/json")

echo "Verified record: ${VERIFY}"
echo ""
echo "Done. Verbum project record fixed."
