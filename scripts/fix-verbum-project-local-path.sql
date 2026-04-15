-- Fix Verbum project local_path in ArqueOps Platform projects table
-- MUST be executed against the ArqueOps Platform Supabase (NOT Verbum's ukfwizdbtudkmgfaljtp)
--
-- Root cause: local_path points to a temporary worktree path instead of the base repo.
-- The orchestrator needs the base repo path to correctly create worktrees under .worktrees/.
--
-- Idempotent: safe to run multiple times.

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'git@github.com:ArqueOps/verbum.git',
  github_url = 'https://github.com/ArqueOps/verbum',
  updated_at = now()
WHERE slug = 'verbum'
  AND (
    local_path IS DISTINCT FROM '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
    OR repo_url IS DISTINCT FROM 'git@github.com:ArqueOps/verbum.git'
    OR github_url IS DISTINCT FROM 'https://github.com/ArqueOps/verbum'
  );
