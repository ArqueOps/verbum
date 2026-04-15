#!/usr/bin/env bash
# Fix Verbum project record in ArqueOps Platform's projects table
#
# IMPORTANT: This script must be run from the ArqueOps Platform context
# with ARQUEOPS_SUPABASE_URL and ARQUEOPS_SERVICE_ROLE_KEY set.
#
# Usage:
#   ARQUEOPS_SUPABASE_URL=https://xxx.supabase.co \
#   ARQUEOPS_SERVICE_ROLE_KEY=eyJ... \
#   bash scripts/fix-verbum-project-record.sh

set -euo pipefail

SUPABASE_URL="${ARQUEOPS_SUPABASE_URL:?'Set ARQUEOPS_SUPABASE_URL (ArqueOps Platform Supabase, not Verbum)'}"
SERVICE_KEY="${ARQUEOPS_SERVICE_ROLE_KEY:?'Set ARQUEOPS_SERVICE_ROLE_KEY (ArqueOps Platform service role key)'}"

CORRECT_LOCAL_PATH="/Users/brenoandrade/Documents/ClaudeProjects/verbum"
CORRECT_REPO_URL="git@github.com:ArqueOps/verbum.git"
CORRECT_GITHUB_URL="https://github.com/ArqueOps/verbum"

echo "=== Step 1: Verify local repo exists ==="
if [ -d "$CORRECT_LOCAL_PATH/.git" ]; then
  echo "OK: Base repo exists at $CORRECT_LOCAL_PATH"
else
  echo "WARN: Base repo not found at $CORRECT_LOCAL_PATH — path may still be correct for the target machine"
fi

echo ""
echo "=== Step 2: Read current Verbum project record ==="
CURRENT=$(curl -sf \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url,github_url,default_branch" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "Current record: $CURRENT"

if echo "$CURRENT" | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if len(d)==0 else 1)" 2>/dev/null; then
  echo "ERROR: No Verbum project found in projects table. Register it first."
  exit 1
fi

PROJECT_ID=$(echo "$CURRENT" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['id'])")
echo "Project ID: $PROJECT_ID"

echo ""
echo "=== Step 3: Update project record ==="
RESPONSE=$(curl -sf -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum" \
  -X PATCH \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{
    \"local_path\": \"${CORRECT_LOCAL_PATH}\",
    \"repo_url\": \"${CORRECT_REPO_URL}\",
    \"github_url\": \"${CORRECT_GITHUB_URL}\",
    \"default_branch\": \"main\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo "OK: Updated successfully (HTTP $HTTP_CODE)"
  echo "Updated record: $BODY"
else
  echo "ERROR: Update failed (HTTP $HTTP_CODE)"
  echo "Response: $BODY"
  exit 1
fi

echo ""
echo "=== Step 4: Verify update ==="
VERIFY=$(curl -sf \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=slug,local_path,repo_url,github_url,default_branch" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "Verified record: $VERIFY"
echo ""
echo "=== Done ==="
