-- Migration: Add summary, author_name, slug, and published_at to search_published_studies RPC
-- Already applied to production Supabase on 2026-04-16

DROP FUNCTION IF EXISTS public.search_published_studies(text, text, uuid);

CREATE OR REPLACE FUNCTION public.search_published_studies(
  query text DEFAULT NULL::text,
  testament text DEFAULT NULL::text,
  book_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    LEFT(s.id::text, 8) AS slug,
    coalesce(s.book, '')
      || CASE WHEN s.chapter IS NOT NULL THEN ' ' || s.chapter::text ELSE '' END
      || CASE WHEN s.verse_start IS NOT NULL THEN ':' || s.verse_start::text ELSE '' END
      || CASE WHEN s.verse_end IS NOT NULL AND s.verse_end <> s.verse_start
              THEN '-' || s.verse_end::text ELSE '' END
      AS verse_reference,
    s.created_at AS published_at,
    bb.name           AS book_name,
    bb.abbreviation   AS book_abbreviation,
    bb.testament      AS book_testament,
    LEFT(s.content, 120) AS summary,
    p.display_name    AS author_name
  FROM studies s
  LEFT JOIN bible_books bb ON bb.name = s.book
  LEFT JOIN profiles p ON p.id = s.user_id
  WHERE s.is_public = true
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
  ORDER BY s.created_at DESC;
END;
$$;
