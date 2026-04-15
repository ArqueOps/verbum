-- Migration: Update Verbum project configuration in projects table
-- This migration is idempotent: safe to run multiple times.
-- Target database: ArqueOps Platform (where the projects table lives)
--
-- Context: The Verbum project needs its local_path and git config
-- registered in the projects table so the orchestrator can create
-- worktrees and manage execution correctly.

DO $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Check if Verbum project already exists
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = 'Verbum'
  LIMIT 1;

  IF v_project_id IS NOT NULL THEN
    -- Update existing project row with correct path and config
    UPDATE projects
    SET
      local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
      repo = 'ArqueOps/verbum',
      default_branch = 'main',
      tech_stack = '{"frontend": "Next.js + TypeScript + React", "styling": "Tailwind CSS", "backend": "Supabase", "auth": "Supabase Auth", "deploy": "Vercel", "ai": "OpenAI API (gpt-5.4)", "language": "TypeScript"}'::JSONB,
      updated_at = now()
    WHERE id = v_project_id;

    RAISE NOTICE 'Updated Verbum project (id: %) with correct local_path and config', v_project_id;
  ELSE
    -- Insert new project row with all required fields
    INSERT INTO projects (
      name,
      repo,
      default_branch,
      local_path,
      tech_stack,
      protected_branches,
      created_at,
      updated_at
    ) VALUES (
      'Verbum',
      'ArqueOps/verbum',
      'main',
      '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
      '{"frontend": "Next.js + TypeScript + React", "styling": "Tailwind CSS", "backend": "Supabase", "auth": "Supabase Auth", "deploy": "Vercel", "ai": "OpenAI API (gpt-5.4)", "language": "TypeScript"}'::JSONB,
      ARRAY['main'],
      now(),
      now()
    );

    RAISE NOTICE 'Inserted new Verbum project row with local_path and config';
  END IF;
END $$;
