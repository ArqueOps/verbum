#!/usr/bin/env bash
# Fix: Register/Update Verbum project in ArqueOps Platform's projects table
#
# USAGE: Run this script from the ArqueOps Platform project context where
#        ARQUEOPS_SUPABASE_URL and ARQUEOPS_SERVICE_ROLE_KEY are available.
#
# The projects table lives in ArqueOps Platform's Supabase, NOT Verbum's.
# This script CANNOT be run from the Verbum project context.

set -euo pipefail

# ArqueOps Platform Supabase credentials (must be set externally)
SUPABASE_URL="${ARQUEOPS_SUPABASE_URL:?Error: ARQUEOPS_SUPABASE_URL not set. This must run from ArqueOps Platform context.}"
SERVICE_ROLE_KEY="${ARQUEOPS_SERVICE_ROLE_KEY:?Error: ARQUEOPS_SERVICE_ROLE_KEY not set. This must run from ArqueOps Platform context.}"

echo "=== Registering Verbum project in ArqueOps Platform projects table ==="

# Step 1: Check if record already exists
echo "Step 1: Checking if Verbum record exists..."
EXISTING=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,slug,local_path,repo_url" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

echo "Current record: ${EXISTING}"

# Step 2: Upsert the record
echo "Step 2: Upserting Verbum project record..."
RESULT=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/projects" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{
    "name": "Verbum",
    "slug": "verbum",
    "repo_url": "git@github.com:ArqueOps/verbum.git",
    "local_path": "/Users/brenoandrade/Documents/ClaudeProjects/verbum",
    "default_branch": "main",
    "tech_stack": "ai OpenAI API (gpt-5.4), auth Supabase Auth, deploy Vercel, backend Supabase, styling Tailwind CSS, frontend Next.js + TypeScript + React, language TypeScript",
    "supabase_url": "https://ukfwizdbtudkmgfaljtp.supabase.co",
    "supabase_project_ref": "ukfwizdbtudkmgfaljtp",
    "vercel_url": "https://verbum.vercel.app",
    "vercel_project_id": "prj_DlACVVUqrCBCOjYS8YGz9qZSmUFI",
    "status": "active"
  }')

HTTP_CODE=$(echo "${RESULT}" | tail -1)
BODY=$(echo "${RESULT}" | head -n -1)

if [[ "${HTTP_CODE}" -ge 200 && "${HTTP_CODE}" -lt 300 ]]; then
  echo "SUCCESS (HTTP ${HTTP_CODE}): ${BODY}"
else
  echo "FAILED (HTTP ${HTTP_CODE}): ${BODY}"
  exit 1
fi

# Step 3: Verify
echo "Step 3: Verifying record..."
VERIFY=$(curl -s \
  "${SUPABASE_URL}/rest/v1/projects?slug=eq.verbum&select=id,name,slug,repo_url,local_path,default_branch,status" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

echo "Verified record: ${VERIFY}"
echo "=== Done ==="
