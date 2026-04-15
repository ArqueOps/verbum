-- Migration: 00001_update_verbum_project_config.sql
-- Description: Updates the Verbum project record in the projects table with the correct
--   local_path, repo URL, default_branch, tech_stack, and protected_branches.
--   This is idempotent — safe to run multiple times.
-- Rollback: UPDATE projects SET local_path = NULL, repo = NULL WHERE slug = 'verbum';

DO $$
DECLARE
  v_projects_exists BOOLEAN;
  v_project_id UUID;
BEGIN
  -- Guard: check if projects table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) INTO v_projects_exists;

  IF NOT v_projects_exists THEN
    RAISE NOTICE 'projects table does not exist — skipping migration';
    RETURN;
  END IF;

  -- Find the Verbum project by slug
  EXECUTE 'SELECT id FROM public.projects WHERE slug = $1' INTO v_project_id USING 'verbum';

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'Verbum project not found in projects table — skipping migration';
    RETURN;
  END IF;

  -- Update project configuration
  EXECUTE '
    UPDATE public.projects
    SET
      local_path = $1,
      repo = $2,
      default_branch = $3,
      tech_stack = $4::jsonb,
      protected_branches = $5::text[],
      updated_at = NOW()
    WHERE id = $6
  '
  USING
    '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
    'ArqueOps/verbum',
    'main',
    '{
      "frontend": "Next.js + TypeScript + React",
      "styling": "Tailwind CSS",
      "backend": "Supabase",
      "auth": "Supabase Auth",
      "ai": "OpenAI API (gpt-5.4)",
      "deploy": "Vercel",
      "language": "TypeScript"
    }'::text,
    ARRAY['main'],
    v_project_id;

  RAISE NOTICE 'Verbum project config updated: local_path=/Users/brenoandrade/Documents/ClaudeProjects/verbum, repo=ArqueOps/verbum';
END $$;
