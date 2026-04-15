-- Fix: Update Verbum project record in ArqueOps Platform's projects table
-- This script MUST be executed against the ArqueOps Platform Supabase instance
-- (NOT Verbum's own Supabase at ukfwizdbtudkmgfaljtp)
--
-- Root cause: The Verbum project record has an invalid local_path pointing to
-- a worktree path instead of the base repository path. This has caused 43+
-- recurring task failures because agents cannot find the directory.
--
-- Verified facts:
--   - GitHub repo: https://github.com/ArqueOps/verbum (exists, default branch: main)
--   - Base repo path: /Users/brenoandrade/Documents/ClaudeProjects/verbum (exists, valid .git)
--   - Invalid path in DB: /Users/brenoandrade/Documents/ClaudeProjects/verbum/.worktrees/feature-task-616e6d89-fix-corrigir-registro-do-projeto-verbum-na-tabela-

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'https://github.com/ArqueOps/verbum',
  default_branch = 'main',
  protected_branches = ARRAY['main'],
  updated_at = now()
WHERE slug = 'verbum';
