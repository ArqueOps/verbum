-- Fix Verbum project local_path and repo_url in ArqueOps Platform DB
-- This script MUST be run against the ArqueOps Platform Supabase (not Verbum's)
-- The projects table lives in the ArqueOps Platform database.
--
-- Problem: local_path points to a worktree path that may not exist,
-- causing all task executions to fail with "directory does not exist".
--
-- Fix: Set local_path to the base repo path so the orchestrator can
-- create worktrees under .worktrees/ correctly.

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
