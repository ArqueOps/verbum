-- Migration: 20260421100000_study_sections_user_credits_tables_alter.sql
-- Description: Addresses consensus corrections for study persistence + atomic credit system:
--   1. ALTER studies: add missing columns (book_id, chapter, verse_start, verse_end,
--      version_id, generation_time_ms) + change content TEXT → JSONB
--   2. Ensure study_sections has section_type TEXT CHECK for exactly 7 types
--   3. CREATE user_credits with credits_remaining >= 0 CHECK, UNIQUE(user_id)
--   4. CREATE consume_credit_and_save_study RPC (atomic credit + study + sections)
--   5. CREATE check_user_credits RPC
-- Rollback:
--   DROP FUNCTION IF EXISTS public.check_user_credits(uuid);
--   DROP FUNCTION IF EXISTS public.consume_credit_and_save_study(uuid, text, jsonb, integer, integer, integer, integer, integer, text, jsonb);
--   DROP TABLE IF EXISTS public.user_credits CASCADE;
--   -- Reverting studies.content to TEXT and study_sections.section_type to enum
--   -- requires careful data migration — not automated.

BEGIN;

-- =============================================================================
-- 1. ALTER studies table — add missing columns + content TEXT → JSONB
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'book_id'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN book_id INTEGER REFERENCES public.books(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'chapter'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN chapter INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'verse_start'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN verse_start INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'verse_end'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN verse_end INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'version_id'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN version_id INTEGER REFERENCES public.bible_versions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'generation_time_ms'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN generation_time_ms INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'language'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN language TEXT NOT NULL DEFAULT 'pt-BR';
  END IF;
END $$;

-- 1b. Change content from TEXT to JSONB (existing TEXT values become JSON strings)
DO $$
DECLARE
  v_type TEXT;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'content';

  IF v_type IS NOT NULL AND v_type <> 'jsonb' THEN
    ALTER TABLE public.studies
      ALTER COLUMN content DROP NOT NULL,
      ALTER COLUMN content TYPE JSONB USING to_jsonb(content);
  END IF;
END $$;

-- =============================================================================
-- 2. study_sections — ensure section_type is TEXT with CHECK for 7 canonical types
-- =============================================================================

-- 2a. Create table IF NOT EXISTS (no-op if already exists from prior migration)
CREATE TABLE IF NOT EXISTS public.study_sections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id     UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (section_type IN (
    'introduction',
    'historical_context',
    'verse_analysis',
    'theological_reflection',
    'cross_references',
    'practical_application',
    'prayer'
  )),
  title        TEXT NOT NULL,
  content      JSONB NOT NULL,
  order_index  INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(study_id, order_index)
);

ALTER TABLE public.study_sections ENABLE ROW LEVEL SECURITY;

-- 2b. If the table already exists with section_type as ENUM, convert to TEXT + CHECK.
-- Map legacy enum values to the canonical 7 types and add the constraint.
DO $$
DECLARE
  v_type TEXT;
  v_constraint_exists BOOLEAN;
BEGIN
  SELECT udt_name INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'study_sections' AND column_name = 'section_type';

  IF v_type IS NOT NULL AND v_type = 'section_type' THEN
    ALTER TABLE public.study_sections
      ALTER COLUMN section_type TYPE TEXT USING section_type::TEXT;

    UPDATE public.study_sections SET section_type = CASE section_type
      WHEN 'context' THEN 'introduction'
      WHEN 'key_words' THEN 'verse_analysis'
      WHEN 'theological_analysis' THEN 'theological_reflection'
      WHEN 'reflection_questions' THEN 'prayer'
      WHEN 'panorama' THEN 'introduction'
      WHEN 'contexto' THEN 'historical_context'
      WHEN 'estrutura_contextual' THEN 'verse_analysis'
      WHEN 'sintese_exegetica' THEN 'theological_reflection'
      WHEN 'analise_hermeneutica' THEN 'cross_references'
      WHEN 'analise_escatologica' THEN 'theological_reflection'
      WHEN 'conclusao' THEN 'practical_application'
      ELSE section_type
    END
    WHERE section_type NOT IN (
      'introduction','historical_context','verse_analysis',
      'theological_reflection','cross_references','practical_application','prayer'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu
      ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_schema = 'public'
      AND ccu.table_name = 'study_sections'
      AND ccu.column_name = 'section_type'
      AND cc.check_clause LIKE '%introduction%'
  ) INTO v_constraint_exists;

  IF NOT v_constraint_exists THEN
    ALTER TABLE public.study_sections
      ADD CONSTRAINT study_sections_section_type_check CHECK (section_type IN (
        'introduction',
        'historical_context',
        'verse_analysis',
        'theological_reflection',
        'cross_references',
        'practical_application',
        'prayer'
      ));
  END IF;
END $$;

-- 2c. Ensure study_sections.content is JSONB (original migration had TEXT)
DO $$
DECLARE
  v_type TEXT;
BEGIN
  SELECT data_type INTO v_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'study_sections' AND column_name = 'content';

  IF v_type IS NOT NULL AND v_type <> 'jsonb' THEN
    ALTER TABLE public.study_sections
      ALTER COLUMN content TYPE JSONB USING to_jsonb(content);
  END IF;
END $$;

-- 2d. Ensure UNIQUE(study_id, order_index) exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'study_sections'
      AND indexdef LIKE '%study_id%order_index%' AND indexdef LIKE '%UNIQUE%'
  ) THEN
    BEGIN
      ALTER TABLE public.study_sections
        ADD CONSTRAINT study_sections_study_id_order_index_key UNIQUE (study_id, order_index);
    EXCEPTION WHEN duplicate_table THEN
      NULL;
    END;
  END IF;
END $$;

-- 2e. Ensure order_index column exists (prior migration may have display_order only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sections' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE public.study_sections ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- =============================================================================
-- 3. CREATE user_credits table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_credits (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  credits_remaining       INTEGER NOT NULL DEFAULT 0 CHECK (credits_remaining >= 0),
  credits_used            INTEGER NOT NULL DEFAULT 0,
  has_active_subscription BOOLEAN NOT NULL DEFAULT false,
  subscription_end        TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_user_credits ON public.user_credits;
CREATE TRIGGER set_updated_at_user_credits
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS: users can only read their own credit balance
DROP POLICY IF EXISTS "user_credits_select_own" ON public.user_credits;
CREATE POLICY "user_credits_select_own" ON public.user_credits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Auto-create user_credits row when a profile is created
CREATE OR REPLACE FUNCTION public.create_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, credits_remaining)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_credits ON public.profiles;
CREATE TRIGGER on_profile_created_credits
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_credits();

-- Backfill: create user_credits rows for existing profiles that don't have one
INSERT INTO public.user_credits (user_id, credits_remaining)
SELECT p.id, 0
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_credits uc WHERE uc.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- 4. RPC: consume_credit_and_save_study
-- Atomic: check subscription → check/decrement credit → insert study → insert sections
-- =============================================================================

CREATE OR REPLACE FUNCTION public.consume_credit_and_save_study(
  p_user_id       UUID,
  p_title         TEXT,
  p_content       JSONB,
  p_book_id       INTEGER DEFAULT NULL,
  p_chapter       INTEGER DEFAULT NULL,
  p_verse_start   INTEGER DEFAULT NULL,
  p_verse_end     INTEGER DEFAULT NULL,
  p_version_id    INTEGER DEFAULT NULL,
  p_language      TEXT DEFAULT 'pt-BR',
  p_sections      JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_subscription   BOOLEAN;
  v_subscription_end   TIMESTAMPTZ;
  v_credits_remaining  INTEGER;
  v_study_id           UUID;
  v_slug               TEXT;
  v_verse_ref          TEXT;
  v_section            JSONB;
  v_idx                INTEGER := 0;
  v_book_abbr          TEXT;
BEGIN
  -- (a) Check active subscription
  SELECT uc.has_active_subscription, uc.subscription_end, uc.credits_remaining
  INTO v_has_subscription, v_subscription_end, v_credits_remaining
  FROM user_credits uc
  WHERE uc.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  -- Subscription bypass: active subscription + not expired → skip credit decrement
  IF v_has_subscription AND v_subscription_end > now() THEN
    NULL;
  ELSE
    -- (b) No subscription: decrement credit
    IF v_credits_remaining <= 0 THEN
      RAISE EXCEPTION 'NO_CREDITS' USING ERRCODE = 'P0002';
    END IF;

    UPDATE user_credits
    SET credits_remaining = credits_remaining - 1,
        credits_used = credits_used + 1,
        updated_at = now()
    WHERE user_id = p_user_id
      AND credits_remaining > 0;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NO_CREDITS' USING ERRCODE = 'P0002';
    END IF;

    v_credits_remaining := v_credits_remaining - 1;
  END IF;

  -- Build verse reference string
  IF p_book_id IS NOT NULL THEN
    SELECT abbr INTO v_book_abbr FROM books WHERE id = p_book_id;
    v_verse_ref := COALESCE(v_book_abbr, '');
  ELSE
    v_verse_ref := '';
  END IF;
  IF p_chapter IS NOT NULL THEN
    v_verse_ref := v_verse_ref || ' ' || p_chapter::TEXT;
  END IF;
  IF p_verse_start IS NOT NULL THEN
    v_verse_ref := v_verse_ref || ':' || p_verse_start::TEXT;
    IF p_verse_end IS NOT NULL AND p_verse_end <> p_verse_start THEN
      v_verse_ref := v_verse_ref || '-' || p_verse_end::TEXT;
    END IF;
  END IF;
  v_verse_ref := TRIM(v_verse_ref);
  IF v_verse_ref = '' THEN v_verse_ref := 'N/A'; END IF;

  -- Generate slug
  v_slug := LOWER(REPLACE(REPLACE(p_title, ' ', '-'), '''', ''))
    || '-' || SUBSTR(gen_random_uuid()::TEXT, 1, 8);

  -- (c) Insert study
  INSERT INTO studies (
    owner_id, slug, title, verse_reference, content,
    model_used, language, book_id, chapter,
    verse_start, verse_end, version_id,
    is_published, generation_time_ms
  )
  VALUES (
    p_user_id, v_slug, p_title, v_verse_ref, p_content,
    'gpt-5.4', p_language, p_book_id, p_chapter,
    p_verse_start, p_verse_end, p_version_id,
    false, NULL
  )
  RETURNING id INTO v_study_id;

  -- (d) Insert 7 study sections from p_sections JSONB array
  FOR v_section IN SELECT * FROM jsonb_array_elements(p_sections)
  LOOP
    INSERT INTO study_sections (
      study_id, section_type, title, content, order_index
    )
    VALUES (
      v_study_id,
      v_section->>'section_type',
      v_section->>'title',
      (v_section->'content')::JSONB,
      v_idx
    );
    v_idx := v_idx + 1;
  END LOOP;

  -- Re-read credits_remaining after possible decrement
  SELECT uc.credits_remaining INTO v_credits_remaining
  FROM user_credits uc WHERE uc.user_id = p_user_id;

  -- (e) Return study record + credits_remaining
  RETURN jsonb_build_object(
    'study_id', v_study_id,
    'slug', v_slug,
    'title', p_title,
    'credits_remaining', v_credits_remaining
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credit_and_save_study(UUID, TEXT, JSONB, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_credit_and_save_study(UUID, TEXT, JSONB, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, JSONB) TO authenticated;

-- =============================================================================
-- 5. RPC: check_user_credits
-- Returns credits_remaining, has_active_subscription, subscription_end
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_user_credits(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'credits_remaining', uc.credits_remaining,
    'has_active_subscription', uc.has_active_subscription,
    'subscription_end', uc.subscription_end
  )
  INTO v_result
  FROM user_credits uc
  WHERE uc.user_id = p_user_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object(
      'credits_remaining', 0,
      'has_active_subscription', false,
      'subscription_end', NULL
    );
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.check_user_credits(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_user_credits(UUID) TO authenticated;

-- =============================================================================
-- 6. Update existing RPCs to handle JSONB content column
-- =============================================================================

-- Fix search_published_studies to cast JSONB content to TEXT for summary
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
    LEFT(COALESCE(s.content::TEXT, ''), 120) AS summary,
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

-- Update save_study_with_daily_limit to handle JSONB content
CREATE OR REPLACE FUNCTION public.save_study_with_daily_limit(
  p_user_id uuid,
  p_title text,
  p_content text,
  p_book text DEFAULT NULL,
  p_chapter integer DEFAULT NULL,
  p_verse_start integer DEFAULT NULL,
  p_verse_end integer DEFAULT NULL,
  p_sections jsonb DEFAULT '[]'::jsonb,
  p_version_id uuid DEFAULT NULL,
  p_slug text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_subscription BOOLEAN;
  v_studies_today INT;
  v_study_id UUID;
  v_section JSONB;
  v_is_public BOOLEAN;
  v_verse_ref TEXT;
  v_content_jsonb JSONB;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND current_period_end > now()
  ) INTO v_has_subscription;

  IF NOT v_has_subscription THEN
    SELECT COUNT(*) INTO v_studies_today
    FROM studies
    WHERE owner_id = p_user_id
      AND created_at::date = (now() AT TIME ZONE 'UTC')::date;

    IF v_studies_today >= 1 THEN
      RAISE EXCEPTION 'DAILY_LIMIT_REACHED' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  v_is_public := true;

  v_verse_ref := p_book;
  IF p_chapter IS NOT NULL THEN
    v_verse_ref := v_verse_ref || ' ' || p_chapter::text;
  END IF;
  IF p_verse_start IS NOT NULL THEN
    v_verse_ref := v_verse_ref || ':' || p_verse_start::text;
    IF p_verse_end IS NOT NULL AND p_verse_end <> p_verse_start THEN
      v_verse_ref := v_verse_ref || '-' || p_verse_end::text;
    END IF;
  END IF;

  -- Convert text content to JSONB for the JSONB column
  BEGIN
    v_content_jsonb := p_content::JSONB;
  EXCEPTION WHEN OTHERS THEN
    v_content_jsonb := to_jsonb(p_content);
  END;

  INSERT INTO studies (
    owner_id, title, content, verse_reference,
    is_published, slug
  )
  VALUES (
    p_user_id, p_title, v_content_jsonb, v_verse_ref,
    v_is_public, p_slug
  )
  RETURNING id INTO v_study_id;

  FOR v_section IN SELECT * FROM jsonb_array_elements(p_sections)
  LOOP
    INSERT INTO study_sections (
      study_id, section_type, title, content, order_index
    )
    VALUES (
      v_study_id,
      v_section->>'section_type',
      COALESCE(v_section->>'title', ''),
      COALESCE((v_section->'content'), '""'::jsonb),
      COALESCE((v_section->>'order_index')::INT, 0)
    );
  END LOOP;

  RETURN v_study_id;
END;
$$;

COMMIT;
