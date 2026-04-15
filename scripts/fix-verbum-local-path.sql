-- Fix: Update Verbum project local_path to correct base repo path
-- The local_path was incorrectly pointing to a worktree sub-path instead of the base repo.
-- This script is idempotent — safe to run multiple times.
--
-- Correct path: /Users/brenoandrade/Documents/ClaudeProjects/verbum
-- Wrong path pattern: /Users/brenoandrade/Documents/ClaudeProjects/verbum/.worktrees/feature-task-*
--
-- MUST be executed against the ArqueOps Platform Supabase instance (not Verbum's own Supabase).

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  updated_at = NOW()
WHERE
  slug = 'verbum'
  AND (
    local_path IS NULL
    OR local_path != '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
  );
