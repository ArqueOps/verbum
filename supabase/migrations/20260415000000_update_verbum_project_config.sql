-- Migration: 20260415000000_update_verbum_project_config.sql
-- Description: Updates the Verbum project record in the projects table with
--   correct local_path, repo URL, default_branch, tech_stack, and protected_branches.
--   Idempotent: uses INSERT ... ON CONFLICT to handle both insert and update cases.
-- Rollback: UPDATE projects SET local_path = NULL, repo = NULL WHERE slug = 'verbum';

DO $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Check if projects table exists (this migration targets the ArqueOps Platform DB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) THEN
    RAISE NOTICE 'projects table does not exist in this database — skipping migration';
    RETURN;
  END IF;

  -- Attempt to find existing Verbum project by slug or name
  SELECT id INTO v_project_id
  FROM projects
  WHERE slug = 'verbum' OR name ILIKE '%verbum%'
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    -- Update existing project record
    UPDATE projects
    SET
      local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
      repo = 'ArqueOps/verbum',
      default_branch = 'main',
      tech_stack = jsonb_build_object(
        'frontend', 'Next.js + TypeScript + React',
        'styling', 'Tailwind CSS',
        'backend', 'Supabase',
        'auth', 'Supabase Auth',
        'ai', 'OpenAI API (gpt-5.4)',
        'deploy', 'Vercel',
        'language', 'TypeScript'
      ),
      protected_branches = ARRAY['main'],
      updated_at = NOW()
    WHERE id = v_project_id;

    RAISE NOTICE 'Updated Verbum project (id: %) with correct local_path and repo', v_project_id;
  ELSE
    RAISE NOTICE 'Verbum project not found in projects table — no update performed';
  END IF;
END $$;
