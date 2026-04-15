-- Fix Verbum project record in ArqueOps Platform's projects table
-- This script must be executed against the ArqueOps Platform Supabase instance
-- (NOT Verbum's own Supabase at ukfwizdbtudkmgfaljtp)
--
-- Idempotent: safe to run multiple times

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'git@github.com:ArqueOps/verbum.git',
  default_branch = 'main',
  updated_at = now()
WHERE slug = 'verbum';
