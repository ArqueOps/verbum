#!/usr/bin/env bash
# fix-verbum-local-path.sh
# Updates the Verbum project local_path in the ArqueOps Platform projects table.
#
# IMPORTANT: This script must be run from the ArqueOps Platform context where
# ARQUEOPS_SUPABASE_URL and ARQUEOPS_SERVICE_ROLE_KEY are available.
# These are NOT the Verbum Supabase credentials — they are the ArqueOps Platform ones.
#
# Usage:
#   ARQUEOPS_SUPABASE_URL=https://xxx.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=eyJ... \
#   bash scripts/fix-verbum-local-path.sh
#
# Or from the ArqueOps orchestrator which has these env vars already set.

set -euo pipefail

# ArqueOps Platform Supabase credentials (NOT Verbum's)
SUPABASE_URL="${ARQUEOPS_SUPABASE_URL:?Error: ARQUEOPS_SUPABASE_URL is required (ArqueOps Platform, not Verbum)}"
SERVICE_KEY="${ARQUEOPS_SERVICE_ROLE_KEY:?Error: ARQUEOPS_SERVICE_ROLE_KEY is required (ArqueOps Platform, not Verbum)}"

CORRECT_LOCAL_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
CORRECT_REPO_URL="git@github.com:ArqueOps/verbum.git"

echo "=== Fixing Verbum project local_path ==="
echo "Target: ArqueOps Platform DB at ${SUPABASE_URL}"
echo "Setting local_path to: ${CORRECT_LOCAL_PATH}"
echo "Setting repo_url to: ${CORRECT_REPO_URL}"
echo ""

# Step 1: Read current state
echo "--- Current Verbum record ---"
CURRENT=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url,default_branch" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "${CURRENT}" | python3 -m json.tool 2>/dev/null || echo "${CURRENT}"
echo ""

# Step 2: Update
echo "--- Updating local_path and repo_url ---"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"local_path\": \"${CORRECT_LOCAL_PATH}\", \"repo_url\": \"${CORRECT_REPO_URL}\"}")

HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
BODY=$(echo "${RESPONSE}" | sed '$d')

if [[ "${HTTP_CODE}" == "200" ]]; then
  echo "SUCCESS (HTTP ${HTTP_CODE})"
  echo "${BODY}" | python3 -m json.tool 2>/dev/null || echo "${BODY}"
else
  echo "FAILED (HTTP ${HTTP_CODE})"
  echo "${BODY}"
  exit 1
fi

# Step 3: Verify
echo ""
echo "--- Verification ---"
VERIFY=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "${VERIFY}" | python3 -m json.tool 2>/dev/null || echo "${VERIFY}"

# Check the path is correct
if echo "${VERIFY}" | grep -q "${CORRECT_LOCAL_PATH}"; then
  echo ""
  echo "VERIFIED: local_path is now correct."
else
  echo ""
  echo "WARNING: Verification failed — local_path may not have been updated."
  exit 1
fi
