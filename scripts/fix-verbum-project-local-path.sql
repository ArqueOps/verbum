-- Fix Verbum project local_path in ArqueOps Platform database
-- This script MUST be executed against the ArqueOps Platform Supabase (NOT Verbum's own Supabase)
-- ArqueOps Platform Supabase URL: https://[arqueops-platform-ref].supabase.co
--
-- Root cause: projects.local_path for Verbum points to a worktree sub-path instead of the base repo.
-- The orchestrator needs the base repo path to correctly create worktrees under .worktrees/
--
-- Idempotent: safe to run multiple times.

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'git@github.com:ArqueOps/verbum.git',
  github_url = 'https://github.com/ArqueOps/verbum',
  updated_at = NOW()
WHERE slug = 'verbum'
  AND (
    local_path != '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
    OR repo_url != 'git@github.com:ArqueOps/verbum.git'
    OR github_url != 'https://github.com/ArqueOps/verbum'
  );
