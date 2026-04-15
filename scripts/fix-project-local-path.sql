-- Migration: fix-project-local-path.sql
-- Description: Updates Verbum project's local_path and git_url in the ArqueOps Platform DB
-- Rollback: UPDATE projects SET local_path = '<previous_value>' WHERE slug = 'verbum';
-- Target DB: ArqueOps Platform Supabase (NOT Verbum's Supabase)
--
-- The Verbum project is registered with a worktree path as local_path, which is
-- ephemeral. The correct path is the base repo directory. This also ensures
-- git_url is set for automatic clone capability.

-- Fix local_path: worktree path -> base repo path
UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  git_url = 'git@github.com:ArqueOps/verbum.git',
  updated_at = now()
WHERE slug = 'verbum'
  AND (
    local_path LIKE '%/.worktrees/%'
    OR local_path IS NULL
    OR git_url IS NULL
    OR git_url = ''
  );

-- Verification query (run after to confirm)
-- SELECT id, name, slug, local_path, git_url, default_branch
-- FROM projects
-- WHERE slug = 'verbum';
