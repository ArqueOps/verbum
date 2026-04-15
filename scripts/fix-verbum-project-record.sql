-- Fix Verbum project record in ArqueOps Platform's projects table
-- This migration updates local_path and repo_url to correct values
--
-- IMPORTANT: This must be executed against the ArqueOps Platform's Supabase,
-- NOT the Verbum project's Supabase (ukfwizdbtudkmgfaljtp).
--
-- Usage (from ArqueOps Platform context):
--   psql "$DATABASE_URL" -f scripts/fix-verbum-project-record.sql
--
-- Or via Supabase REST API (see fix-verbum-project-record.sh)

DO $$
DECLARE
  v_project_id UUID;
  v_old_local_path TEXT;
  v_old_repo TEXT;
BEGIN
  -- Find Verbum project by slug or name
  SELECT id, local_path, repo
  INTO v_project_id, v_old_local_path, v_old_repo
  FROM projects
  WHERE slug = 'verbum'
     OR name ILIKE '%verbum%'
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'Verbum project not found in projects table. No update performed.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found Verbum project: id=%, old local_path=%, old repo=%',
    v_project_id, v_old_local_path, v_old_repo;

  -- Update with correct values
  UPDATE projects
  SET
    local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
    repo = 'ArqueOps/verbum',
    repo_url = 'git@github.com:ArqueOps/verbum.git',
    github_url = 'https://github.com/ArqueOps/verbum',
    default_branch = 'main',
    updated_at = NOW()
  WHERE id = v_project_id;

  RAISE NOTICE 'Updated Verbum project: local_path=/Users/brenoandrade/Documents/ClaudeProjects/verbum, repo=ArqueOps/verbum';
END $$;
