-- Fix: Update Verbum project record in ArqueOps Platform projects table
-- Target database: ArqueOps Platform Supabase (NOT Verbum's own Supabase)
--
-- Problem: local_path points to a worktree sub-path that doesn't exist:
--   .../verbum/.worktrees/feature-task-2da29ec2-fix-update-verbum-project-record-in-projects-table
--
-- Fix: Set local_path to the base repo path where the orchestrator can create worktrees.
-- Also ensure repo_url and github_url are correct.
--
-- This script is IDEMPOTENT — safe to run multiple times.

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'git@github.com:ArqueOps/verbum.git',
  github_url = 'https://github.com/ArqueOps/verbum',
  updated_at = NOW()
WHERE slug = 'verbum'
  AND (
    local_path IS DISTINCT FROM '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
    OR repo_url IS DISTINCT FROM 'git@github.com:ArqueOps/verbum.git'
    OR github_url IS DISTINCT FROM 'https://github.com/ArqueOps/verbum'
  );
