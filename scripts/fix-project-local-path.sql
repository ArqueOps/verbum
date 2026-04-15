-- Migration: fix-project-local-path.sql
-- Description: Updates Verbum project's local_path in ArqueOps Platform's projects table
-- Target DB: ArqueOps Platform Supabase (NOT Verbum's own Supabase)
-- Rollback: Re-run with the old local_path value
--
-- Context: The orchestrator dispatches agents to Verbum using projects.local_path.
-- The correct base repo path is /Users/brenoandrade/Documents/ClaudeProjects/verbum
-- (NOT the worktree path). The orchestrator creates worktrees under .worktrees/ from this base.

-- Fix local_path to point to the base repo (not a worktree)
UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'git@github.com:ArqueOps/verbum.git',
  default_branch = 'main',
  updated_at = now()
WHERE slug = 'verbum'
  AND (
    local_path IS NULL
    OR local_path != '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
  );
