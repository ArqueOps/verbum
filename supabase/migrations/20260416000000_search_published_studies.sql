-- Migration: 20260416000000_search_published_studies.sql
-- Description: Add full-text search on studies (tsvector + GIN) and create
--              RPC function search_published_studies with optional filters
--              for testament and book_id.
-- Rollback:    DROP FUNCTION IF EXISTS search_published_studies;
--              DROP INDEX IF EXISTS idx_studies_fts;
--              ALTER TABLE studies DROP COLUMN IF EXISTS fts;

-- 1. Generated tsvector column for full-text search (Portuguese)
--    Uses title + content for comprehensive text matching.
ALTER TABLE public.studies
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED;

-- 2. GIN index for fast full-text lookups
CREATE INDEX IF NOT EXISTS idx_studies_fts
  ON public.studies USING gin (fts);

-- 3. RPC function: search_published_studies
--    Joins studies.book (full name) with bible_books.name to resolve testament.
--    Accepts testament as 'old'/'new' and maps to DB values 'OT'/'NT'.
--    Constructs verse_reference from book + chapter + verse_start + verse_end.
--    Gracefully handles studies whose book does not match any bible_books entry.
DROP FUNCTION IF EXISTS public.search_published_studies(text, text, uuid);

CREATE OR REPLACE FUNCTION public.search_published_studies(
  query     text         DEFAULT NULL,
  testament text         DEFAULT NULL,
  book_id   uuid         DEFAULT NULL
)
RETURNS TABLE (
  id                uuid,
  title             text,
  verse_reference   text,
  book_name         text,
  book_abbreviation text,
  book_testament    text,
  created_at        timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _testament_db text;
BEGIN
  -- Map 'old'/'new' to DB values 'OT'/'NT'; pass through if already 'OT'/'NT'
  IF testament = 'old' THEN
    _testament_db := 'OT';
  ELSIF testament = 'new' THEN
    _testament_db := 'NT';
  ELSE
    _testament_db := testament;  -- NULL or direct 'OT'/'NT'
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.title,
    -- Construct verse_reference: "Book Chapter:VerseStart-VerseEnd"
    s.book
      || CASE WHEN s.chapter IS NOT NULL THEN ' ' || s.chapter::text ELSE '' END
      || CASE WHEN s.verse_start IS NOT NULL THEN ':' || s.verse_start::text ELSE '' END
      || CASE WHEN s.verse_end IS NOT NULL AND s.verse_end <> s.verse_start
              THEN '-' || s.verse_end::text ELSE '' END
      AS verse_reference,
    bb.name           AS book_name,
    bb.abbreviation   AS book_abbreviation,
    bb.testament      AS book_testament,
    s.created_at
  FROM studies s
  LEFT JOIN bible_books bb
    ON bb.name = s.book
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

-- Grant execute to authenticated and anon (public studies only)
GRANT EXECUTE ON FUNCTION public.search_published_studies(text, text, uuid)
  TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
