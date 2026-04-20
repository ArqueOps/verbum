-- Realignment — Fase 1.1
-- 1. Fix RPC search_published_studies: slug correto (s.slug, não LEFT(id,8)),
--    is_published (não is_public), owner_id (não user_id).
-- 2. Allow anon SELECT em bible_books e bible_versions.

BEGIN;

-- ============================================================================
-- RPC: search_published_studies (rewrite)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_published_studies(
  query text DEFAULT NULL,
  testament text DEFAULT NULL,
  book_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  verse_reference text,
  published_at timestamptz,
  book_name text,
  book_abbreviation text,
  book_testament text,
  summary text,
  author_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _testament_db text;
BEGIN
  IF testament = 'old' THEN
    _testament_db := 'OT';
  ELSIF testament = 'new' THEN
    _testament_db := 'NT';
  ELSE
    _testament_db := testament;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.slug,
    s.verse_reference,
    COALESCE(s.published_at, s.created_at) AS published_at,
    bb.name AS book_name,
    bb.abbreviation AS book_abbreviation,
    bb.testament AS book_testament,
    LEFT(COALESCE(s.content, ''), 120) AS summary,
    p.display_name AS author_name
  FROM studies s
  LEFT JOIN bible_books bb ON bb.name = s.book
  LEFT JOIN profiles p ON p.id = s.owner_id
  WHERE s.is_published = true
    AND (
      search_published_studies.query IS NULL
      OR search_published_studies.query = ''
      OR s.fts @@ plainto_tsquery('portuguese', search_published_studies.query)
    )
    AND (
      _testament_db IS NULL
      OR bb.testament = _testament_db
    )
    AND (
      search_published_studies.book_id IS NULL
      OR bb.id = search_published_studies.book_id
    )
  ORDER BY COALESCE(s.published_at, s.created_at) DESC;
END;
$$;

-- ============================================================================
-- RLS: bible_books and bible_versions must be readable by anon (catalog data)
-- ============================================================================
DROP POLICY IF EXISTS "bible_books_public_read" ON public.bible_books;
CREATE POLICY "bible_books_public_read"
  ON public.bible_books
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "bible_versions_public_read" ON public.bible_versions;
CREATE POLICY "bible_versions_public_read"
  ON public.bible_versions
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMIT;
