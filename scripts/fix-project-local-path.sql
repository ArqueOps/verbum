-- Fix: Update Verbum project local_path in ArqueOps Platform DB
-- This script must be executed against the ArqueOps Platform Supabase (NOT Verbum's Supabase).
-- The projects table lives in the ArqueOps Platform database.
--
-- Root cause: projects.local_path points to a worktree path instead of the base repo.
-- Correct base repo path: /Users/brenoandrade/Documents/ClaudeProjects/verbum
-- Wrong worktree path: /Users/brenoandrade/Documents/ClaudeProjects/verbum/.worktrees/feature-task-*

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'git@github.com:ArqueOps/verbum.git',
  updated_at = now()
WHERE slug = 'verbum'
  AND (
    local_path IS NULL
    OR local_path != '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
  );
