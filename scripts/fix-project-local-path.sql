-- Migration: fix-project-local-path.sql
-- Description: Updates Verbum project local_path to the correct location on the current orchestrator machine.
-- Target DB: ArqueOps Platform Supabase (NOT Verbum's own Supabase)
-- Rollback: UPDATE projects SET local_path = '<previous_value>' WHERE slug = 'verbum';
-- Idempotent: Yes — safe to run multiple times.

-- The Verbum project record has an incorrect local_path, causing 42+ task failures.
-- The correct base repo path on Mac-mini-de-Breno is:
--   /Users/brenoandrade/Documents/ClaudeProjects/verbum
--
-- This is the BASE repo path (not a worktree path).
-- The orchestrator creates worktrees under .worktrees/ relative to this path.

UPDATE projects
SET local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
    updated_at = now()
WHERE slug = 'verbum'
  AND (local_path IS NULL OR local_path != '/Users/brenoandrade/Documents/ClaudeProjects/verbum');
