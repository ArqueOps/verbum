-- Fix: Update Verbum project local_path in ArqueOps Platform projects table
--
-- ROOT CAUSE: The projects.local_path for Verbum points to a worktree path
-- instead of the base repository path. The orchestrator uses local_path to
-- create worktrees under {local_path}/.worktrees/, so it MUST be the base repo.
--
-- TARGET DATABASE: ArqueOps Platform Supabase (NOT Verbum's own Supabase)
-- The projects table lives in the ArqueOps Platform database.
--
-- This migration is IDEMPOTENT — safe to run multiple times.

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  updated_at = now()
WHERE slug = 'verbum'
  AND (
    local_path IS NULL
    OR local_path != '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
  );
