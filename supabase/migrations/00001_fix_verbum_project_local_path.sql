-- Migration: Fix Verbum project local_path in projects table
-- Target DB: ArqueOps Platform Supabase (NOT Verbum's own Supabase)
-- Purpose: Update local_path from worktree path to base repo path
-- Idempotent: Safe to run multiple times
--
-- Root cause: The projects.local_path for Verbum was set to a worktree path
-- (containing .worktrees/) instead of the base repo path. This prevents the
-- orchestrator from creating new worktrees because it tries to use the
-- worktree path as the base directory.

DO $$
BEGIN
  -- Guard: only run if projects table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) THEN
    UPDATE public.projects
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

    RAISE NOTICE 'Verbum project local_path updated to base repo path';
  ELSE
    RAISE NOTICE 'projects table not found — this migration must run on ArqueOps Platform DB';
  END IF;
END $$;
