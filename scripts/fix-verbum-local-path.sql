-- Fix: Update Verbum project local_path in ArqueOps Platform DB
-- Problem: local_path points to a worktree sub-path instead of the base repo
-- This script is IDEMPOTENT — safe to run multiple times
--
-- Must be executed against the ArqueOps Platform Supabase, NOT Verbum's Supabase
-- ArqueOps Platform ref: the instance containing the `projects` table

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'git@github.com:ArqueOps/verbum.git',
  updated_at = now()
WHERE slug = 'verbum'
  AND (
    local_path IS DISTINCT FROM '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
    OR repo_url IS DISTINCT FROM 'git@github.com:ArqueOps/verbum.git'
  );
