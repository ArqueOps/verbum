-- Fix Verbum project local_path in ArqueOps Platform's projects table
--
-- CONTEXT: The projects table lives in the ArqueOps Platform Supabase (not Verbum's).
-- This script must be executed against the ArqueOps Platform database.
--
-- PROBLEM: projects.local_path for Verbum points to a worktree sub-path or
-- non-existent directory, causing every task execution to fail when creating worktrees.
--
-- FIX: Set local_path to the base repo directory so the orchestrator can create
-- worktrees under .worktrees/ correctly.
--
-- IDEMPOTENT: Safe to run multiple times.

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'git@github.com:ArqueOps/verbum.git',
  github_url = 'https://github.com/ArqueOps/verbum',
  updated_at = now()
WHERE slug = 'verbum'
  AND (
    local_path IS DISTINCT FROM '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
    OR repo_url IS DISTINCT FROM 'git@github.com:ArqueOps/verbum.git'
    OR github_url IS DISTINCT FROM 'https://github.com/ArqueOps/verbum'
  );
