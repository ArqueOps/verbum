-- Fix: Update Verbum project registration with correct paths
-- This script MUST be executed against the ArqueOps Platform Supabase database
-- (NOT the Verbum project's own Supabase instance)
--
-- Root cause: Verbum's local_path in the projects table points to a worktree
-- path that doesn't exist, causing all task executions to fail when trying
-- to create worktrees. The correct path is the base repo directory.
--
-- IDEMPOTENT: Safe to run multiple times.

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'git@github.com:ArqueOps/verbum.git',
  updated_at = NOW()
WHERE slug = 'verbum'
  AND (
    local_path != '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
    OR repo_url != 'git@github.com:ArqueOps/verbum.git'
    OR local_path IS NULL
    OR repo_url IS NULL
  );
