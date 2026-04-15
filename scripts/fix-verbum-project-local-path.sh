#!/usr/bin/env bash
# Fix Verbum project local_path in ArqueOps Platform database
# MUST be run from a context with access to the ArqueOps Platform Supabase
#
# Usage: ARQUEOPS_SUPABASE_URL=... ARQUEOPS_SERVICE_ROLE_KEY=... ./scripts/fix-verbum-project-local-path.sh

set -euo pipefail

CORRECT_LOCAL_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
CORRECT_REPO_URL="git@github.com:ArqueOps/verbum.git"
CORRECT_GITHUB_URL="https://github.com/ArqueOps/verbum"

# --- Preflight checks ---

if [[ -z "${ARQUEOPS_SUPABASE_URL:-}" || -z "${ARQUEOPS_SERVICE_ROLE_KEY:-}" ]]; then
  echo "ERROR: Set ARQUEOPS_SUPABASE_URL and ARQUEOPS_SERVICE_ROLE_KEY env vars"
  echo "These point to the ArqueOps Platform Supabase, NOT Verbum's own Supabase"
  exit 1
fi

# 1. Read current state
echo "==> Reading current Verbum project record..."
CURRENT=$(curl -s \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url,github_url" \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}")

echo "Current: ${CURRENT}"

# 2. Verify base repo exists locally
if [[ ! -d "${CORRECT_LOCAL_PATH}/.git" ]]; then
  echo "ERROR: Base repo not found at ${CORRECT_LOCAL_PATH}"
  exit 1
fi
echo "==> Base repo verified at ${CORRECT_LOCAL_PATH}"

# 3. Update
echo "==> Updating projects.local_path, repo_url, github_url..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"local_path\": \"${CORRECT_LOCAL_PATH}\",
    \"repo_url\": \"${CORRECT_REPO_URL}\",
    \"github_url\": \"${CORRECT_GITHUB_URL}\"
  }")

if [[ "${RESULT}" == "200" ]]; then
  echo "==> SUCCESS: Verbum project record updated"
else
  echo "ERROR: Update failed with HTTP ${RESULT}"
  exit 1
fi

# 4. Verify
echo "==> Verifying update..."
VERIFY=$(curl -s \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=local_path,repo_url,github_url" \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}")

echo "Updated: ${VERIFY}"
echo "==> Done."
