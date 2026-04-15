#!/usr/bin/env bash
# verify-project-record.sh — Verifies the Verbum project record in ArqueOps Platform DB
# This script confirms that local_path and github_repo are correctly configured.
#
# Usage: SUPABASE_SERVICE_ROLE_KEY=... bash scripts/verify-project-record.sh
#
# Expected output:
#   local_path: /Users/brenoandrade/Documents/ClaudeProjects/verbum
#   github_repo: ArqueOps/verbum
#   status: active

set -euo pipefail

PLATFORM_SUPABASE_URL="${SUPABASE_URL:-https://mxotfulkbqeidzulrbnj.supabase.co}"
API_KEY="${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"

response=$(curl -sf "${PLATFORM_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=local_path,github_repo,status,default_branch" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}")

echo "Verbum project record:"
echo "${response}" | python3 -m json.tool

local_path=$(echo "${response}" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['local_path'])")

if [ -d "${local_path}/.git" ]; then
  echo ""
  echo "Verification PASSED: local_path exists and is a git repository"
else
  echo ""
  echo "Verification FAILED: local_path does not exist or is not a git repository"
  exit 1
fi
