#!/usr/bin/env bash
# fix-verbum-project-path.sh
#
# Updates the Verbum project's local_path in the ArqueOps Platform Supabase.
#
# IMPORTANT: This script must be run from the ArqueOps Platform context
# where ARQUEOPS_SUPABASE_URL and ARQUEOPS_SERVICE_ROLE_KEY are available.
#
# Usage:
#   ARQUEOPS_SUPABASE_URL="https://xxx.supabase.co" \
#   ARQUEOPS_SERVICE_ROLE_KEY="eyJ..." \
#   bash scripts/fix-verbum-project-path.sh

set -euo pipefail

SUPABASE_URL="${ARQUEOPS_SUPABASE_URL:?'Set ARQUEOPS_SUPABASE_URL (ArqueOps Platform, not Verbum)'}"
SERVICE_KEY="${ARQUEOPS_SERVICE_ROLE_KEY:?'Set ARQUEOPS_SERVICE_ROLE_KEY (ArqueOps Platform, not Verbum)'}"

CORRECT_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"

echo "=== Step 1: Read current Verbum project record ==="
CURRENT=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "Current record: ${CURRENT}"

# Check if record exists
if echo "${CURRENT}" | grep -q '"slug":"verbum"'; then
  echo ""
  echo "=== Step 2: Update local_path to base repo path ==="
  RESULT=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
    -X PATCH \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{\"local_path\": \"${CORRECT_PATH}\", \"repo_url\": \"git@github.com:ArqueOps/verbum.git\"}")

  HTTP_STATUS=$(echo "${RESULT}" | grep "HTTP_STATUS:" | sed 's/HTTP_STATUS://')
  BODY=$(echo "${RESULT}" | grep -v "HTTP_STATUS:")

  if [ "${HTTP_STATUS}" = "200" ]; then
    echo "Updated successfully: ${BODY}"
  else
    echo "ERROR: HTTP ${HTTP_STATUS} — ${BODY}"
    exit 1
  fi
else
  echo "ERROR: No project found with slug='verbum' in ArqueOps Platform DB"
  echo "Verify you're using the ArqueOps Platform Supabase credentials, not Verbum's."
  exit 1
fi

echo ""
echo "=== Step 3: Verify base repo exists ==="
if [ -d "${CORRECT_PATH}/.git" ]; then
  echo "OK: Base repo exists at ${CORRECT_PATH}"
  echo "Remote: $(git -C "${CORRECT_PATH}" remote get-url origin 2>/dev/null || echo 'N/A')"
  echo "Branch: $(git -C "${CORRECT_PATH}" branch --show-current 2>/dev/null || echo 'N/A')"
else
  echo "WARNING: No .git directory at ${CORRECT_PATH}"
  echo "The repo may need to be cloned first:"
  echo "  git clone git@github.com:ArqueOps/verbum.git ${CORRECT_PATH}"
fi

echo ""
echo "=== Done ==="
