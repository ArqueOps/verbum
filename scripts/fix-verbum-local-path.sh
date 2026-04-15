#!/usr/bin/env bash
# Fix: Update Verbum project local_path via Supabase REST API
# MUST be executed from a context with ArqueOps Platform Supabase credentials.
#
# Required env vars (from ArqueOps Platform, NOT Verbum):
#   SUPABASE_URL          — ArqueOps Platform Supabase URL
#   SUPABASE_SERVICE_KEY  — ArqueOps Platform service_role_key
#
# Usage:
#   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx ./fix-verbum-local-path.sh

set -euo pipefail

CORRECT_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_KEY:-}" ]]; then
  echo "ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (ArqueOps Platform credentials)"
  exit 1
fi

echo "Step 1: Reading current Verbum project record..."
CURRENT=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

echo "Current record: ${CURRENT}"

echo ""
echo "Step 2: Updating local_path to ${CORRECT_PATH}..."
RESULT=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"local_path\": \"${CORRECT_PATH}\"}")

HTTP_CODE=$(echo "${RESULT}" | tail -1)
BODY=$(echo "${RESULT}" | head -n -1)

if [[ "${HTTP_CODE}" == "200" ]]; then
  echo "SUCCESS: local_path updated to ${CORRECT_PATH}"
  echo "Response: ${BODY}"
else
  echo "FAILED: HTTP ${HTTP_CODE}"
  echo "Response: ${BODY}"
  exit 1
fi

echo ""
echo "Step 3: Verifying update..."
VERIFY=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

echo "Verified record: ${VERIFY}"
echo "Done."
