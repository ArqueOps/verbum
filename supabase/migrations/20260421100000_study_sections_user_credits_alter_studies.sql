-- Migration: 20260421100000_study_sections_user_credits_alter_studies.sql
-- Description: ALTER studies (add book_id, chapter, verse_start, verse_end, version_id,
--   generation_time_ms, language default, content TEXT→JSONB). Ensure study_sections
--   matches spec (TEXT section_type with CHECK, JSONB content, order_index, UNIQUE).
--   Recreate user_credits (previously dropped in 20260420011000). Create RPCs
--   consume_credit_and_save_study and check_user_credits.
-- Rollback:
--   DROP FUNCTION IF EXISTS public.check_user_credits(uuid);
--   DROP FUNCTION IF EXISTS public.consume_credit_and_save_study(uuid,text,text,text,jsonb,text,integer,integer,integer,integer,integer,integer,text,jsonb);
--   DROP TABLE IF EXISTS public.user_credits CASCADE;
--   -- Reverting studies ALTER and study_sections changes requires manual intervention.

BEGIN;

-- ============================================================================
-- 1. ALTER studies table
-- ============================================================================

-- Add book_id (INT FK books) — distinct from existing 'book' TEXT column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'book_id'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN book_id INTEGER REFERENCES public.books(id);
  END IF;
END $$;

-- Add chapter (INT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'chapter'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN chapter INTEGER;
  END IF;
END $$;

-- Add verse_start (INT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'verse_start'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN verse_start INTEGER;
  END IF;
END $$;

-- Add verse_end (INT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'verse_end'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN verse_end INTEGER;
  END IF;
END $$;

-- Add version_id (INT FK bible_versions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'version_id'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN version_id INTEGER REFERENCES public.bible_versions(id);
  END IF;
END $$;

-- Add generation_time_ms (INT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'generation_time_ms'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN generation_time_ms INTEGER;
  END IF;
END $$;

-- Ensure language column exists with correct default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'language'
  ) THEN
    ALTER TABLE public.studies ADD COLUMN language TEXT NOT NULL DEFAULT 'pt-BR';
  ELSE
    ALTER TABLE public.studies ALTER COLUMN language SET DEFAULT 'pt-BR';
  END IF;
END $$;

-- Change content from TEXT to JSONB (idempotent: only if currently TEXT)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studies'
      AND column_name = 'content' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.studies ALTER COLUMN content TYPE JSONB USING content::jsonb;
  END IF;
END $$;

-- Add FK constraint names for traceability (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'studies_book_id_fkey' AND table_name = 'studies'
  ) THEN
    -- FK was already added inline with ADD COLUMN above; this is a safety check
    NULL;
  END IF;
END $$;

-- Index for book_id lookups
CREATE INDEX IF NOT EXISTS idx_studies_book_id ON public.studies(book_id);
CREATE INDEX IF NOT EXISTS idx_studies_version_id ON public.studies(version_id);

-- ============================================================================
-- 2. study_sections table — ensure correct schema
-- ============================================================================

-- Convert section_type from ENUM to TEXT if it uses the enum type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sections'
      AND column_name = 'section_type' AND udt_name = 'section_type'
  ) THEN
    ALTER TABLE public.study_sections ALTER COLUMN section_type TYPE TEXT;
  END IF;
END $$;

-- If study_sections doesn't exist at all, create it fresh
CREATE TABLE IF NOT EXISTS public.study_sections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id     UUID NOT NULL REFERENCES public.studies(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  title        TEXT NOT NULL,
  content      JSONB NOT NULL,
  order_index  INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure content is JSONB (may be TEXT from earlier migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sections'
      AND column_name = 'content' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.study_sections ALTER COLUMN content TYPE JSONB USING content::jsonb;
  END IF;
END $$;

-- Ensure order_index column exists (earlier migration used display_order)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'study_sections' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE public.study_sections ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add CHECK constraint for the 7 canonical section types
-- Using NOT VALID so existing rows with legacy types are not rejected
ALTER TABLE public.study_sections DROP CONSTRAINT IF EXISTS chk_study_section_type;
ALTER TABLE public.study_sections ADD CONSTRAINT chk_study_section_type
  CHECK (section_type IN (
    'introduction',
    'historical_context',
    'verse_analysis',
    'theological_reflection',
    'cross_references',
    'practical_application',
    'prayer'
  )) NOT VALID;

-- UNIQUE(study_id, order_index) — idempotent via IF NOT EXISTS
CREATE UNIQUE INDEX IF NOT EXISTS uq_study_sections_study_order
  ON public.study_sections (study_id, order_index);

ALTER TABLE public.study_sections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. user_credits table (recreate — was dropped in 20260420011000)
-- ============================================================================

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

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER trg_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: users can only read their own credits
DROP POLICY IF EXISTS "user_credits_select_own" ON public.user_credits;
CREATE POLICY "user_credits_select_own" ON public.user_credits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Auto-create user_credits row on profile creation
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
  FOR EACH ROW EXECUTE FUNCTION public.create_user_credits();

-- Backfill: create user_credits rows for existing profiles
INSERT INTO public.user_credits (user_id, credits_remaining)
SELECT p.id, 0
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_credits uc WHERE uc.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 4. RPC: consume_credit_and_save_study
-- Atomic: check subscription → decrement credit → insert study → insert sections
-- ============================================================================

CREATE OR REPLACE FUNCTION public.consume_credit_and_save_study(
  p_user_id UUID,
  p_title TEXT,
  p_slug TEXT,
  p_verse_reference TEXT,
  p_content JSONB,
  p_model_used TEXT,
  p_book_id INTEGER DEFAULT NULL,
  p_chapter INTEGER DEFAULT NULL,
  p_verse_start INTEGER DEFAULT NULL,
  p_verse_end INTEGER DEFAULT NULL,
  p_version_id INTEGER DEFAULT NULL,
  p_generation_time_ms INTEGER DEFAULT NULL,
  p_language TEXT DEFAULT 'pt-BR',
  p_sections JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_sub BOOLEAN;
  v_sub_end TIMESTAMPTZ;
  v_study_id UUID;
  v_section JSONB;
  v_idx INTEGER := 0;
  v_credits_remaining INTEGER;
BEGIN
  -- (a) Lock row and check subscription status
  SELECT has_active_subscription, subscription_end, credits_remaining
  INTO v_has_sub, v_sub_end, v_credits_remaining
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_CREDITS' USING ERRCODE = 'P0001';
  END IF;

  -- (b) If active subscription, skip credit decrement
  IF COALESCE(v_has_sub, false) AND v_sub_end > now() THEN
    -- Subscriber: no credit decrement needed
    NULL;
  ELSE
    -- Non-subscriber: decrement credit
    IF v_credits_remaining <= 0 THEN
      RAISE EXCEPTION 'NO_CREDITS' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.user_credits
    SET credits_remaining = credits_remaining - 1,
        credits_used = credits_used + 1,
        updated_at = now()
    WHERE user_id = p_user_id
      AND credits_remaining > 0;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NO_CREDITS' USING ERRCODE = 'P0001';
    END IF;

    v_credits_remaining := v_credits_remaining - 1;
  END IF;

  -- (c) Insert study
  INSERT INTO public.studies (
    owner_id, slug, title, verse_reference, content, model_used,
    book_id, chapter, verse_start, verse_end, version_id,
    generation_time_ms, language
  )
  VALUES (
    p_user_id, p_slug, p_title, p_verse_reference, p_content, p_model_used,
    p_book_id, p_chapter, p_verse_start, p_verse_end, p_version_id,
    p_generation_time_ms, p_language
  )
  RETURNING id INTO v_study_id;

  -- (d) Insert sections from JSONB array
  FOR v_section IN SELECT * FROM jsonb_array_elements(p_sections)
  LOOP
    INSERT INTO public.study_sections (study_id, section_type, title, content, order_index)
    VALUES (
      v_study_id,
      v_section->>'section_type',
      v_section->>'title',
      COALESCE(v_section->'content', '""'::jsonb),
      v_idx
    );
    v_idx := v_idx + 1;
  END LOOP;

  -- (e) Return study record + credits_remaining
  RETURN jsonb_build_object(
    'study_id', v_study_id,
    'slug', p_slug,
    'title', p_title,
    'credits_remaining', v_credits_remaining
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credit_and_save_study(UUID,TEXT,TEXT,TEXT,JSONB,TEXT,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_credit_and_save_study(UUID,TEXT,TEXT,TEXT,JSONB,TEXT,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,TEXT,JSONB) TO authenticated;

-- ============================================================================
-- 5. RPC: check_user_credits
-- Returns credits_remaining, has_active_subscription, subscription_end
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_user_credits(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits INTEGER;
  v_has_sub BOOLEAN;
  v_sub_end TIMESTAMPTZ;
BEGIN
  SELECT credits_remaining, has_active_subscription, subscription_end
  INTO v_credits, v_has_sub, v_sub_end
  FROM public.user_credits
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'credits_remaining', 0,
      'has_active_subscription', false,
      'subscription_end', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'credits_remaining', v_credits,
    'has_active_subscription', COALESCE(v_has_sub, false),
    'subscription_end', v_sub_end
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_user_credits(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_user_credits(UUID) TO authenticated;

COMMIT;

-- ============================================================================
-- DIVERGENCE NOTES (consensus correction #4)
-- ============================================================================
-- 1. database.ts types show `book_id: number | null` but the existing
--    save_study_with_daily_limit RPC uses `book` (TEXT). This migration adds
--    `book_id` (INT FK books) as a separate column. The old `book` column
--    is left intact for backward compatibility with existing RPC.
--
-- 2. study_sections.section_type was an ENUM (section_type) with 14 values.
--    This migration converts it to TEXT and adds a CHECK constraint (NOT VALID)
--    for the 7 canonical types. Existing rows with legacy types are preserved.
--
-- 3. database.ts has merge conflicts in the subscriptions and Functions
--    sections that need separate resolution.
--
-- 4. The existing save_study_with_daily_limit and check_user_daily_limit RPCs
--    remain available. The new consume_credit_and_save_study and
--    check_user_credits RPCs operate on the user_credits table independently.
