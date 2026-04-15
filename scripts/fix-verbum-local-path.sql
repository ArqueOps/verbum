-- Migration: fix-verbum-local-path.sql
-- Description: Updates the Verbum project record in the projects table to use
--   the correct base repo path instead of a worktree path.
-- Target DB: ArqueOps Platform Supabase (NOT Verbum's own Supabase)
-- Rollback: UPDATE projects SET local_path = '<previous_value>' WHERE slug = 'verbum';
-- Idempotent: Yes (safe to run multiple times)

-- Fix local_path: set to base repo path (not a worktree sub-path)
-- Fix repo_url: ensure it contains the valid SSH git URL
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
