-- Fix Verbum project record in ArqueOps Platform's projects table
-- Must be executed against the ArqueOps Platform Supabase, NOT Verbum's Supabase
--
-- Verified facts:
--   GitHub repo: ArqueOps/verbum (exists, default_branch=main)
--   SSH URL: git@github.com:ArqueOps/verbum.git
--   HTTPS URL: https://github.com/ArqueOps/verbum.git
--   Base repo path: /Users/brenoandrade/Documents/ClaudeProjects/verbum
--
-- Root cause: projects.local_path points to a worktree sub-path instead of base repo,
-- causing ALL worktree creation to fail (17+ consecutive failures)

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  repo_url = 'git@github.com:ArqueOps/verbum.git',
  github_url = 'https://github.com/ArqueOps/verbum',
  default_branch = 'main',
  updated_at = NOW()
WHERE slug = 'verbum'
  AND (
    local_path IS NULL
    OR local_path != '/Users/brenoandrade/Documents/ClaudeProjects/verbum'
    OR repo_url IS NULL
    OR repo_url != 'git@github.com:ArqueOps/verbum.git'
  );
