-- Atomic increment function for view_count
-- Depends on: 20260416202400_add_view_count_to_studies.sql (view_count column)
CREATE OR REPLACE FUNCTION increment_view_count(study_slug TEXT)
RETURNS INTEGER
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $$
  UPDATE studies
  SET view_count = view_count + 1,
      updated_at = now()
  WHERE slug = study_slug
    AND is_published = true
  RETURNING view_count;
$$;
