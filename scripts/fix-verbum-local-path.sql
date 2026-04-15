-- Fix: Update Verbum project local_path and repo_url in ArqueOps Platform DB
-- Target: ArqueOps Platform Supabase (NOT Verbum's own Supabase)
-- Idempotent: safe to run multiple times
--
-- Root cause: projects.local_path points to a worktree path instead of the base repo.
-- The orchestrator uses local_path to create worktrees under .worktrees/,
-- so it MUST point to the base repo directory.
--
-- Correct base repo: /Users/brenoandrade/Documents/ClaudeProjects/verbum
-- Correct repo_url: git@github.com:ArqueOps/verbum.git

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
