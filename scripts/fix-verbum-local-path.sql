-- Migration: fix-verbum-local-path.sql
-- Description: Updates projects.local_path for the Verbum project to the correct
--              base repository path on this machine. This migration targets the
--              ArqueOps Platform Supabase (not Verbum's own Supabase).
-- Rollback: UPDATE projects SET local_path = NULL WHERE slug = 'verbum';
-- Idempotent: Yes — safe to run multiple times, only updates if row exists.

-- Up: Set local_path to the base repo directory (NOT a worktree sub-path)
UPDATE projects
SET local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
    updated_at = now()
WHERE slug = 'verbum'
  AND (local_path IS DISTINCT FROM '/Users/brenoandrade/Documents/ClaudeProjects/verbum');
