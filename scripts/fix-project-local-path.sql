-- fix-project-local-path.sql
-- Idempotent SQL to ensure Verbum's local_path is the base repo path.
-- Execute against ArqueOps Platform Supabase (mxotfulkbqeidzulrbnj), NOT Verbum's.
--
-- The correct local_path is the BASE REPO, not a worktree:
--   /Users/brenoandrade/Documents/ClaudeProjects/verbum

UPDATE projects
SET
  local_path = '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  updated_at = now()
WHERE slug = 'verbum'
  AND (local_path IS NULL OR local_path != '/Users/brenoandrade/Documents/ClaudeProjects/verbum');
