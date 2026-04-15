#!/usr/bin/env bash
# Fix Verbum project local_path via ArqueOps Platform Supabase REST API
#
# USAGE:
#   ARQUEOPS_SUPABASE_URL=https://xxx.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=xxx \
#   bash scripts/fix-verbum-project-local-path.sh
#
# NOTE: These credentials are for the ArqueOps Platform Supabase,
#       NOT for Verbum's own Supabase instance.

set -euo pipefail

# --- Configuration ---
CORRECT_LOCAL_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
CORRECT_REPO_URL="git@github.com:ArqueOps/verbum.git"
CORRECT_GITHUB_URL="https://github.com/ArqueOps/verbum"
PROJECT_SLUG="verbum"

# --- Validate required env vars ---
if [[ -z "${ARQUEOPS_SUPABASE_URL:-}" ]]; then
  echo "ERROR: ARQUEOPS_SUPABASE_URL not set (ArqueOps Platform Supabase URL)"
  exit 1
fi

if [[ -z "${ARQUEOPS_SERVICE_ROLE_KEY:-}" ]]; then
  echo "ERROR: ARQUEOPS_SERVICE_ROLE_KEY not set (ArqueOps Platform service_role key)"
  exit 1
fi

# --- Step 1: Verify local repo exists ---
echo "=== Step 1: Verify local repo ==="
if [[ -d "${CORRECT_LOCAL_PATH}/.git" ]]; then
  echo "OK: Base repo exists at ${CORRECT_LOCAL_PATH}"
else
  echo "ERROR: Base repo not found at ${CORRECT_LOCAL_PATH}"
  exit 1
fi

# --- Step 2: Verify GitHub remote ---
echo "=== Step 2: Verify GitHub remote ==="
REMOTE_URL=$(git -C "${CORRECT_LOCAL_PATH}" remote get-url origin 2>/dev/null || echo "")
if [[ "${REMOTE_URL}" == "${CORRECT_REPO_URL}" ]]; then
  echo "OK: Remote origin matches ${CORRECT_REPO_URL}"
else
  echo "WARN: Remote origin is '${REMOTE_URL}', expected '${CORRECT_REPO_URL}'"
fi

# --- Step 3: Read current project record ---
echo "=== Step 3: Read current project record ==="
CURRENT=$(curl -s \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.${PROJECT_SLUG}&select=id,slug,local_path,repo_url,github_url" \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}")

echo "Current record: ${CURRENT}"

# --- Step 4: Update project record ---
echo "=== Step 4: Update project record ==="
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.${PROJECT_SLUG}" \
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

HTTP_CODE=$(echo "${RESPONSE}" | tail -1)
BODY=$(echo "${RESPONSE}" | head -n -1)

if [[ "${HTTP_CODE}" == "200" ]]; then
  echo "OK: Project record updated successfully"
  echo "Updated record: ${BODY}"
else
  echo "ERROR: Update failed with HTTP ${HTTP_CODE}"
  echo "Response: ${BODY}"
  exit 1
fi

# --- Step 5: Verify update ---
echo "=== Step 5: Verify update ==="
VERIFY=$(curl -s \
  "${ARQUEOPS_SUPABASE_URL}/rest/v1/projects?slug=eq.${PROJECT_SLUG}&select=local_path,repo_url,github_url" \
  -H "apikey: ${ARQUEOPS_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${ARQUEOPS_SERVICE_ROLE_KEY}")

echo "Verified record: ${VERIFY}"
echo ""
echo "=== DONE: Verbum project record fixed ==="
