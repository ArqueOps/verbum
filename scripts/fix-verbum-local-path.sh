#!/usr/bin/env bash
# fix-verbum-local-path.sh
# Updates the Verbum project record in the ArqueOps Platform Supabase
# via REST API to set the correct local_path (base repo, not worktree).
#
# Requirements:
#   - ARQUEOPS_SUPABASE_URL: ArqueOps Platform Supabase URL (not Verbum's)
#   - ARQUEOPS_SERVICE_ROLE_KEY: ArqueOps Platform service role key
#
# Usage:
#   ARQUEOPS_SUPABASE_URL=https://xxx.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=eyJ... \
#   ./scripts/fix-verbum-local-path.sh

set -euo pipefail

CORRECT_LOCAL_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
PROJECT_SLUG="verbum"

# Validate required env vars
if [[ -z "${ARQUEOPS_SUPABASE_URL:-}" ]]; then
  echo "ERROR: ARQUEOPS_SUPABASE_URL is required (ArqueOps Platform Supabase, not Verbum's)"
  exit 1
fi

if [[ -z "${ARQUEOPS_SERVICE_ROLE_KEY:-}" ]]; then
  echo "ERROR: ARQUEOPS_SERVICE_ROLE_KEY is required"
  exit 1
fi

echo "Updating Verbum project local_path..."
echo "  Target: ${ARQUEOPS_SUPABASE_URL}"
echo "  Slug:   ${PROJECT_SLUG}"
echo "  Path:   ${CORRECT_LOCAL_PATH}"

# Update via PostgREST PATCH
HTTP_CODE=$(curl -s -o /tmp/verbum-fix-response.json -w "%{http_code}" \
  -X PATCH \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.${PROJECT_SLUG}" \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"local_path\": \"${CORRECT_LOCAL_PATH}\",
    \"repo_url\": \"git@github.com:ArqueOps/verbum.git\",
    \"default_branch\": \"main\"
  }")

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "SUCCESS: local_path updated to ${CORRECT_LOCAL_PATH}"
  cat /tmp/verbum-fix-response.json | head -c 500
  echo ""
else
  echo "FAILED: HTTP ${HTTP_CODE}"
  cat /tmp/verbum-fix-response.json
  exit 1
fi

# Verify the update
echo ""
echo "Verifying update..."
VERIFY_CODE=$(curl -s -o /tmp/verbum-verify-response.json -w "%{http_code}" \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.${PROJECT_SLUG}&select=slug,local_path,repo_url,default_branch" \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}")

if [[ "$VERIFY_CODE" == "200" ]]; then
  echo "Verification response:"
  cat /tmp/verbum-verify-response.json
  echo ""

  if grep -q "${CORRECT_LOCAL_PATH}" /tmp/verbum-verify-response.json; then
    echo "VERIFIED: local_path is correct"
  else
    echo "WARNING: local_path may not have updated correctly"
    exit 1
  fi
else
  echo "Verification failed: HTTP ${VERIFY_CODE}"
  exit 1
fi

# Verify directory exists
echo ""
echo "Verifying directory exists..."
if [[ -d "${CORRECT_LOCAL_PATH}" ]]; then
  echo "VERIFIED: Directory exists at ${CORRECT_LOCAL_PATH}"
  if [[ -d "${CORRECT_LOCAL_PATH}/.git" ]]; then
    echo "VERIFIED: Git repository is initialized"
  else
    echo "WARNING: .git directory not found"
  fi
  if [[ -d "${CORRECT_LOCAL_PATH}/.worktrees" ]]; then
    echo "VERIFIED: .worktrees directory exists"
  fi
else
  echo "ERROR: Directory does not exist at ${CORRECT_LOCAL_PATH}"
  exit 1
fi

echo ""
echo "All checks passed. Verbum project is ready for task execution."
