-- Fix: Update Verbum project local_path in ArqueOps Platform's projects table
--
-- IMPORTANT: This script must be executed against the ArqueOps Platform's Supabase,
-- NOT Verbum's own Supabase (ukfwizdbtudkmgfaljtp).
--
-- The projects table is in the ArqueOps Platform database.
-- Run this via: psql <arqueops-platform-connection-string> -f scripts/fix-verbum-local-path.sql
--
-- Idempotent: safe to run multiple times.

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'git@github.com:ArqueOps/verbum.git',
  updated_at = now()
WHERE slug = 'verbum'
  AND (
    local_path IS NULL
    OR local_path != '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
    OR repo_url IS NULL
    OR repo_url != 'git@github.com:ArqueOps/verbum.git'
  );
