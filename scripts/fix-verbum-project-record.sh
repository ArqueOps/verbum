#!/usr/bin/env bash
# Fix: Update Verbum project record in ArqueOps Platform projects table
#
# IMPORTANT: This script must be run with ArqueOps PLATFORM credentials,
# NOT Verbum's own Supabase credentials.
#
# Usage:
#   ARQUEOPS_SUPABASE_URL=https://<platform-ref>.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=<platform-service-role-key> \
#   ./scripts/fix-verbum-project-record.sh
#
# Or from the ArqueOps Platform context where credentials are available:
#   ARQUEOPS_SUPABASE_URL="${SUPABASE_URL}" \
#   ARQUEOPS_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}" \
#   ./scripts/fix-verbum-project-record.sh

set -euo pipefail

SUPABASE_URL="${ARQUEOPS_SUPABASE_URL:?Error: ARQUEOPS_SUPABASE_URL not set. This must point to the ArqueOps Platform Supabase instance.}"
SERVICE_KEY="${ARQUEOPS_SERVICE_ROLE_KEY:?Error: ARQUEOPS_SERVICE_ROLE_KEY not set. This must be the ArqueOps Platform service role key.}"

CORRECT_LOCAL_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
CORRECT_REPO_URL="git@github.com:ArqueOps/verbum.git"
CORRECT_GITHUB_URL="https://github.com/ArqueOps/verbum"

echo "=== Step 1: Read current Verbum project record ==="
CURRENT=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url,github_url" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "Current record: ${CURRENT}"

# Extract id from response
PROJECT_ID=$(echo "${CURRENT}" | python3 -c "import sys,json; data=json.load(sys.stdin); print(data[0]['id'] if data else '')" 2>/dev/null || true)

if [ -z "${PROJECT_ID}" ]; then
  echo "ERROR: No project found with slug='verbum' in ArqueOps Platform database."
  echo "Verify you are using the correct Supabase credentials (ArqueOps Platform, not Verbum)."
  exit 1
fi

echo "Found project id: ${PROJECT_ID}"

echo ""
echo "=== Step 2: Update project record ==="
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/projects?id=eq.${PROJECT_ID}" \
  -X PATCH \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"local_path\": \"${CORRECT_LOCAL_PATH}\",
    \"repo_url\": \"${CORRECT_REPO_URL}\",
    \"github_url\": \"${CORRECT_GITHUB_URL}\"
  }")

HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
BODY=$(echo "${RESPONSE}" | head -n -1)

if [ "${HTTP_CODE}" -ge 200 ] && [ "${HTTP_CODE}" -lt 300 ]; then
  echo "SUCCESS (HTTP ${HTTP_CODE}): Project record updated."
  echo "Updated record: ${BODY}"
else
  echo "FAILED (HTTP ${HTTP_CODE}): ${BODY}"
  exit 1
fi

echo ""
echo "=== Step 3: Verify update ==="
VERIFY=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url,github_url" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "Verified record: ${VERIFY}"
echo ""
echo "=== Fix complete ==="
