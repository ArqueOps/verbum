-- Migration: fix-verbum-project-path.sql
-- Description: Updates the Verbum project's local_path in the projects table
--              from a worktree sub-path to the correct base repo path.
-- Target DB: ArqueOps Platform Supabase (NOT Verbum's own Supabase)
-- Rollback: UPDATE projects SET local_path = '<previous_worktree_path>' WHERE slug = 'verbum';
-- Idempotent: Yes — safe to run multiple times

-- The base repo path (where .git/ and .worktrees/ live):
--   /Users/brenoandrade/Documents/ClaudeProjects/verbum
--
-- The WRONG path currently stored (a worktree sub-path):
--   /Users/brenoandrade/Documents/ClaudeProjects/verbum/.worktrees/feature-task-...
--
-- The orchestrator creates worktrees UNDER <local_path>/.worktrees/,
-- so local_path MUST point to the base repo, not a worktree.

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
