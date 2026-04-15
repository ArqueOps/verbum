-- Fix: Update Verbum project local_path in ArqueOps Platform projects table
-- This migration MUST be run against the ArqueOps Platform Supabase instance,
-- NOT against Verbum's own Supabase (ukfwizdbtudkmgfaljtp).
--
-- Problem: local_path points to a worktree path instead of the base repo path.
-- Current (wrong): .../verbum/.worktrees/feature-task-911863c1-...
-- Correct:         /Users/brenoandrade/Documents/ClaudeProjects/verbum
--
-- The base repo at the correct path has been verified to exist with a valid
-- .git directory and active worktrees.

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
      updated_at = NOW()
    WHERE slug = 'verbum'
      OR name ILIKE '%verbum%'
      OR repo ILIKE '%verbum%';

    RAISE NOTICE 'Updated Verbum project local_path to base repo path';
  ELSE
    RAISE NOTICE 'projects table not found — this must be run on ArqueOps Platform Supabase';
  END IF;
END $$;
