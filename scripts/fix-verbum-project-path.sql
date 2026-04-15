-- Fix Verbum project local_path and repo_path in ArqueOps Platform projects table
-- This script MUST be executed against the ArqueOps Platform Supabase instance
-- (NOT the Verbum project Supabase at ukfwizdbtudkmgfaljtp)
--
-- Root cause: projects table has wrong local_path (points to worktree instead of base repo)
-- This has caused 39+ task failures because the orchestrator cannot create worktrees
-- from a worktree path.
--
-- Correct values:
--   local_path: /Users/brenoandrade/Documents/ClaudeProjects/verbum
--   repo_path:  /Users/brenoandrade/Documents/ClaudeProjects/verbum
--   repo_url:   git@github.com:ArqueOps/verbum.git
--   github_url: https://github.com/ArqueOps/verbum

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'git@github.com:ArqueOps/verbum.git',
  github_url = 'https://github.com/ArqueOps/verbum',
  updated_at = NOW()
WHERE slug = 'verbum'
  AND (
    local_path IS DISTINCT FROM '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
    OR repo_path IS DISTINCT FROM '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
  );
