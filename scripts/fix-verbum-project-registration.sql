-- Fix: Register/Update Verbum project in ArqueOps Platform's projects table
-- IMPORTANT: This SQL must be executed against the ArqueOps Platform's Supabase,
-- NOT Verbum's Supabase (ukfwizdbtudkmgfaljtp).
--
-- The projects table lives in ArqueOps Platform's database.
-- Verbum's Supabase does NOT have a projects table.

-- Idempotent upsert: INSERT if not exists, UPDATE if exists
INSERT INTO projects (
  name,
  slug,
  repo_url,
  local_path,
  default_branch,
  tech_stack,
  supabase_url,
  supabase_project_ref,
  vercel_url,
  vercel_project_id,
  status
) VALUES (
  'Verbum',
  'verbum',
  'git@github.com:ArqueOps/verbum.git',
  '/Users/brenoandrade/Documents/ClaudeProjects/verbum',
  'main',
  'ai OpenAI API (gpt-5.4), auth Supabase Auth, deploy Vercel, backend Supabase, styling Tailwind CSS, frontend Next.js + TypeScript + React, language TypeScript',
  'https://ukfwizdbtudkmgfaljtp.supabase.co',
  'ukfwizdbtudkmgfaljtp',
  'https://verbum.vercel.app',
  'prj_DlACVVUqrCBCOjYS8YGz9qZSmUFI',
  'active'
)
ON CONFLICT (slug) DO UPDATE SET
  repo_url = EXCLUDED.repo_url,
  local_path = EXCLUDED.local_path,
  default_branch = EXCLUDED.default_branch,
  tech_stack = EXCLUDED.tech_stack,
  supabase_url = EXCLUDED.supabase_url,
  supabase_project_ref = EXCLUDED.supabase_project_ref,
  vercel_url = EXCLUDED.vercel_url,
  vercel_project_id = EXCLUDED.vercel_project_id,
  updated_at = now();

-- Verify the record
SELECT id, name, slug, repo_url, local_path, default_branch, status
FROM projects
WHERE slug = 'verbum';
